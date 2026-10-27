import type { Config } from 'chessground/config'
import type { Color, Key } from 'chessground/types'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Board } from '../components/Board'
import { MoveInput } from '../components/MoveInput'
import { MoveList } from '../components/MoveList'
import {
  captures,
  lastMoveText,
  moveSquares,
  legalDests,
  playMove,
  replay,
  turnColor,
} from '../chess/game'
import {
  DEFAULT_ELO,
  ELO_STEP,
  MAX_ELO,
  MIN_ELO,
  clampElo,
  gameResult,
  quickMove,
  type Result,
} from '../bot/bot'
import { botMove } from '../bot/move'
import { analyse, engineLoaded, whenReady } from '../engine/stockfish'
import { START, epd, openingFor, type OpeningTree } from '../openings/tree'

// The bot takes at least this long per move, so its moves are easy to follow.
const MIN_THINK_MS = 500

const ELO_KEY = 'bot-elo'

function savedElo(): number {
  try {
    const n = Number(localStorage.getItem(ELO_KEY))
    return n ? clampElo(n) : DEFAULT_ELO
  } catch {
    return DEFAULT_ELO
  }
}

function saveElo(elo: number) {
  try {
    localStorage.setItem(ELO_KEY, String(elo))
  } catch {
    // Not saved, which only means it's asked again next time.
  }
}

function levelName(elo: number): string {
  if (elo < 800) return 'Beginner'
  if (elo < 1400) return 'Casual player'
  if (elo < 1800) return 'Club player'
  if (elo < 2200) return 'Strong club player'
  if (elo < 2500) return 'Master'
  return 'Grandmaster'
}

const colorName = (c: Color) => (c === 'white' ? 'White' : 'Black')

type Ending = Result & { resigned?: boolean }

type PlayViewProps = {
  tree: OpeningTree
  start: string[] // the moves to the position the game starts from
  initialSide: Color
  backLabel: string
  onBack: () => void
}

// A full game against a bot of chosen strength, from any position of a line.
export function PlayView({
  tree,
  start,
  initialSide,
  backLabel,
  onBack,
}: PlayViewProps) {
  const [elo, setElo] = useState(savedElo)
  const [side, setSide] = useState<Color>(initialSide)
  const [playing, setPlaying] = useState(false)
  const [moves, setMoves] = useState<string[]>(start)
  const [resigned, setResigned] = useState(false)
  const [showResult, setShowResult] = useState(true)
  // Why the bot couldn't move, in the position it failed in.
  const [failure, setFailure] = useState<{ fen: string; message: string }>()
  const [retry, setRetry] = useState(0)
  // The move being looked at when stepping back through the game, or null
  // for the current position.
  const [view, setView] = useState<number | null>(null)
  // The piece the hint highlights, in the position it was asked for.
  const [hint, setHint] = useState<{ fen: string; square: Key }>()

  // The engine is about 7 MB, so the first game waits for it to download.
  const [engine, setEngine] = useState<'loading' | 'ready' | 'failed'>(() =>
    engineLoaded() ? 'ready' : 'loading',
  )
  useEffect(() => {
    whenReady().then(
      () => setEngine('ready'),
      () => setEngine('failed'),
    )
  }, [])

  const game = useMemo(() => replay(moves), [moves])
  const ending: Ending | null = useMemo(
    () =>
      resigned
        ? { outcome: 'loss', reason: 'by resignation', resigned: true }
        : gameResult(game, side),
    [resigned, game, side],
  )
  const over = playing && ending !== null
  const yourTurn = playing && !over && turnColor(game) === side
  const error = failure?.fen === game.fen() ? failure.message : null
  const thinking = playing && !over && !yourTurn && !error

  // The position on the board: the game's, or an earlier one.
  const shown = view ?? moves.length
  const live = shown === moves.length
  const board = useMemo(() => replay(moves.slice(0, shown)), [moves, shown])

  // The EPD of every position of the game, starting position first.
  const positions = useMemo(() => {
    const chess = replay([])
    return [START, ...moves.map((san) => (chess.move(san), epd(chess)))]
  }, [moves])
  const opening = openingFor(tree, positions.slice(0, shown + 1))
  const taken = useMemo(() => captures(board), [board])

  // Every change to the game goes back to its current position.
  const update = useCallback((next: (m: string[]) => string[]) => {
    setMoves(next)
    setView(null)
  }, [])

  // The bot moves when it's its turn.
  useEffect(() => {
    if (!playing || over || yourTurn) return
    // Dropped if the game changes while the bot searches (take back, resign).
    let cancelled = false
    const fen = game.fen()
    Promise.all([
      botMove(fen, elo),
      new Promise((r) => setTimeout(r, MIN_THINK_MS)),
    ]).then(
      ([san]) => {
        if (!cancelled) update((m) => [...m, san])
      },
      (e: Error) => {
        if (!cancelled)
          setFailure({ fen, message: e.message || 'the engine stopped' })
      },
    )
    return () => {
      cancelled = true
    }
  }, [playing, over, yourTurn, game, elo, retry, update])

  const submit = useCallback(
    (san: string) => {
      if (yourTurn && live) update((m) => [...m, san])
    },
    [yourTurn, live, update],
  )

  const goTo = useCallback(
    (ply: number) => setView(ply >= moves.length ? null : Math.max(0, ply)),
    [moves.length],
  )

  // The arrow keys step through the moves, as in the explorer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      const to: Record<string, number> = {
        ArrowLeft: shown - 1,
        ArrowRight: shown + 1,
        Home: 0,
        End: moves.length,
      }
      if (e.key in to) {
        e.preventDefault()
        goTo(to[e.key])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shown, moves.length, goTo])

  // Highlights the piece the engine would move, never where it goes.
  const showHint = () => {
    const fen = game.fen()
    const fallback = () => {
      const from = moveSquares(game, quickMove(replay(moves)))?.from
      if (from) setHint({ fen, square: from })
    }
    if (!engineLoaded()) return fallback()
    analyse(fen, { depth: 12 }).then((lines) => {
      const uci = lines[0]?.pv[0]
      if (uci) setHint({ fen, square: uci.slice(0, 2) as Key })
      else fallback()
    }, fallback)
  }
  const hinted =
    hint?.fen === game.fen() && live && yourTurn ? hint.square : null

  const begin = () => {
    saveElo(elo)
    update(() => start)
    setResigned(false)
    setShowResult(true)
    setFailure(undefined)
    setPlaying(true)
  }

  const setup = () => {
    setPlaying(false)
    update(() => start)
    setResigned(false)
    setFailure(undefined)
  }

  // Back to your previous move, but not into the starting line.
  const takeBack = () => {
    let n = moves.length - 1
    while (n > start.length && n % 2 !== (side === 'white' ? 0 : 1)) n--
    if (n >= start.length) update(() => moves.slice(0, n))
  }
  const canTakeBack =
    playing && !over && !thinking && moves.length > start.length

  const config = useMemo<Config>(() => {
    const last = board.history({ verbose: true }).at(-1)
    const onMove = (from: Key, to: Key) => {
      const san = playMove(replay(moves), from, to)
      if (san) submit(san)
    }
    return {
      fen: board.fen(),
      orientation: side,
      turnColor: turnColor(board),
      check: board.inCheck(),
      lastMove: last ? [last.from, last.to] : undefined,
      movable: {
        free: false,
        color: yourTurn && live ? side : undefined,
        dests: legalDests(board),
        events: { after: onMove },
      },
      highlight: {
        custom: new Map(hinted ? [[hinted, 'hint']] : []),
      },
    }
  }, [board, moves, side, yourTurn, live, submit, hinted])

  const openingName = opening ? (
    <>
      <span className="eco">{opening.eco}</span> {opening.name}
    </>
  ) : (
    'Starting position'
  )
  const bot = `Bot (${elo})`
  const botSide: Color = side === 'white' ? 'black' : 'white'
  const playerBar = (who: Color, name: string, rating?: number) => {
    const took = who === 'white' ? taken.white : taken.black
    const lead = (who === 'white' ? 1 : -1) * taken.lead
    return (
      <div className="player-bar">
        <span className={`player-avatar ${who}`} aria-hidden>
          {name === 'You' ? '♙' : '♞'}
        </span>
        <span className="player-name">
          {name}
          {rating !== undefined && (
            <span className="player-rating"> ({rating})</span>
          )}
        </span>
        <span className="captured" aria-label={`${name} captured`}>
          {took.map((t, i) => (
            <span key={i}>{GLYPH[who === 'white' ? 'b' : 'w'][t]}</span>
          ))}
          {lead > 0 && <span className="lead">+{lead}</span>}
        </span>
        {name !== 'You' && thinking && live && (
          <span className="note thinking">thinking…</span>
        )}
      </div>
    )
  }

  return (
    <div className="layout play-layout">
      <div className="board-column">
        {playerBar(botSide, 'Bot', elo)}
        <Board config={config} />
        {playerBar(side, 'You')}
      </div>
      <aside className="panel game-panel">
        <p className="note">
          <button type="button" className="link" onClick={onBack}>
            {backLabel}
          </button>{' '}
          › Play vs bot
        </p>
        <h2 className="opening">{openingName}</h2>

        {!playing ? (
          <div className="bot-setup">
            <p className="note">
              Play a full game from this position. The bot is Stockfish, held
              back to the strength you choose.
            </p>
            <label className="elo-pick">
              <span>
                Bot strength: <strong>{elo} Elo</strong> · {levelName(elo)}
              </span>
              <input
                type="range"
                min={MIN_ELO}
                max={MAX_ELO}
                step={ELO_STEP}
                value={elo}
                onChange={(e) => setElo(Number(e.target.value))}
              />
            </label>
            <div className="controls">
              <button
                type="button"
                aria-label="100 Elo weaker"
                disabled={elo <= MIN_ELO}
                onClick={() => setElo(clampElo(elo - ELO_STEP))}
              >
                −100
              </button>
              <button
                type="button"
                aria-label="100 Elo stronger"
                disabled={elo >= MAX_ELO}
                onClick={() => setElo(clampElo(elo + ELO_STEP))}
              >
                +100
              </button>
            </div>
            <div className="settings">
              <label>
                Play as{' '}
                <select
                  value={side}
                  onChange={(e) => setSide(e.target.value as Color)}
                >
                  <option value="white">White</option>
                  <option value="black">Black</option>
                </select>
              </label>
            </div>
            {engine === 'failed' && (
              <p className="wrong">
                Stockfish couldn’t load, so the bot will play simple moves
                instead of playing at this strength.
              </p>
            )}
            <button
              type="button"
              className="primary"
              onClick={begin}
              disabled={engine === 'loading'}
            >
              {engine === 'loading' ? 'Loading the bot…' : 'Start game'}
            </button>
            {engine === 'loading' && (
              <p className="note">
                Stockfish is about 7 MB and downloads once.{' '}
                <button type="button" className="link" onClick={begin}>
                  Start now
                </button>{' '}
                and the bot plays simple moves until it’s ready.
              </p>
            )}
          </div>
        ) : (
          <div className="feedback" role="status" aria-live="polite">
            {over ? (
              <p className="result">
                <strong>{resultTitle(ending!)}</strong> {ending!.reason}.
              </p>
            ) : error ? (
              <p className="wrong">
                The bot couldn’t move: {error}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setFailure(undefined)
                    setRetry((r) => r + 1)
                  }}
                >
                  Try again
                </button>
              </p>
            ) : !live ? (
              <p className="note">
                Looking at move {Math.ceil(shown / 2) || 'start'}.{' '}
                <button
                  type="button"
                  className="link"
                  onClick={() => goTo(moves.length)}
                >
                  Back to the game
                </button>
              </p>
            ) : yourTurn ? (
              <p>
                {hinted
                  ? 'Hint: move the highlighted piece.'
                  : `Your move${game.inCheck() ? ': you are in check.' : '.'}`}
              </p>
            ) : (
              <p className="note">
                {thinking ? `${bot} is thinking…` : `${bot} to move.`}
              </p>
            )}
          </div>
        )}

        <p className="sr-only" aria-live="polite">
          {lastMoveText(moves)}
        </p>
        <MoveList moves={moves} ply={shown} onSelect={goTo} />

        <div className="controls nav-controls">
          <button
            type="button"
            onClick={() => goTo(0)}
            disabled={shown === 0}
            aria-label="First move"
          >
            ⏮
          </button>
          <button
            type="button"
            onClick={() => goTo(shown - 1)}
            disabled={shown === 0}
            aria-label="Previous move"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={() => goTo(shown + 1)}
            disabled={live}
            aria-label="Next move"
          >
            ▶
          </button>
          <button
            type="button"
            onClick={() => goTo(moves.length)}
            disabled={live}
            aria-label="Last move"
          >
            ⏭
          </button>
        </div>

        {playing &&
          (over ? (
            <div className="controls game-actions">
              <button type="button" className="primary" onClick={begin}>
                Rematch
              </button>
              <button type="button" onClick={setup}>
                Change bot
              </button>
            </div>
          ) : (
            <>
              <div className="game-actions">
                <button type="button" onClick={() => setResigned(true)}>
                  <span aria-hidden>⚑</span> Resign
                </button>
                <button
                  type="button"
                  onClick={takeBack}
                  disabled={!canTakeBack}
                >
                  <span aria-hidden>↶</span> Take back
                </button>
                <button
                  type="button"
                  onClick={showHint}
                  disabled={!yourTurn || !live || Boolean(hinted)}
                >
                  <span aria-hidden>💡</span> Hint
                </button>
              </div>
              <MoveInput
                line={moves}
                disabled={!yourTurn || !live}
                onMove={submit}
              />
              <button type="button" className="link" onClick={setup}>
                New game
              </button>
            </>
          ))}
      </aside>

      {over && showResult && (
        <div className="modal-backdrop">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="result-title"
          >
            <p className={`modal-badge ${ending!.outcome}`} aria-hidden>
              {ending!.outcome === 'win'
                ? '✓'
                : ending!.outcome === 'draw'
                  ? '½'
                  : '✕'}
            </p>
            <h2 id="result-title">{resultTitle(ending!)}</h2>
            <p className="modal-opening">
              {ending!.reason[0].toUpperCase() + ending!.reason.slice(1)}
            </p>
            <p className="modal-variation">
              You ({colorName(side)}) vs {bot} · {resultScore(ending!, side)}
            </p>
            <div className="controls">
              <button
                type="button"
                className="primary"
                autoFocus
                onClick={begin}
              >
                Rematch
              </button>
              <button type="button" onClick={setup}>
                Change bot
              </button>
              <button type="button" onClick={() => setShowResult(false)}>
                View board
              </button>
              <button type="button" onClick={onBack}>
                {backLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Captured pieces, by the color of the piece.
const GLYPH: Record<'w' | 'b', Record<string, string>> = {
  w: { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕' },
  b: { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛' },
}

function resultTitle({ outcome }: Ending): string {
  return outcome === 'win'
    ? 'You won!'
    : outcome === 'draw'
      ? 'Draw'
      : 'You lost'
}

// "1-0" style score of the game.
function resultScore({ outcome }: Ending, side: Color): string {
  if (outcome === 'draw') return '½-½'
  const whiteWon = (outcome === 'win') === (side === 'white')
  return whiteWon ? '1-0' : '0-1'
}
