import type { Config } from 'chessground/config'
import type { Color, Key } from 'chessground/types'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Board } from '../components/Board'
import { MoveInput } from '../components/MoveInput'
import { MoveList } from '../components/MoveList'
import {
  lastMoveText,
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
  type Result,
} from '../bot/bot'
import { botMove } from '../bot/move'
import { engineLoaded, whenReady } from '../engine/stockfish'
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

  const opening = useMemo(() => {
    const chess = replay([])
    return openingFor(tree, [
      START,
      ...start.map((san) => (chess.move(san), epd(chess))),
    ])
  }, [tree, start])

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
        if (!cancelled) setMoves((m) => [...m, san])
      },
      (e: Error) => {
        if (!cancelled)
          setFailure({ fen, message: e.message || 'the engine stopped' })
      },
    )
    return () => {
      cancelled = true
    }
  }, [playing, over, yourTurn, game, elo, retry])

  const submit = useCallback(
    (san: string) => {
      if (yourTurn) setMoves((m) => [...m, san])
    },
    [yourTurn],
  )

  const begin = () => {
    saveElo(elo)
    setMoves(start)
    setResigned(false)
    setShowResult(true)
    setFailure(undefined)
    setPlaying(true)
  }

  const setup = () => {
    setPlaying(false)
    setMoves(start)
    setResigned(false)
    setFailure(undefined)
  }

  // Back to your previous move, but not into the starting line.
  const takeBack = () => {
    let n = moves.length - 1
    while (n > start.length && n % 2 !== (side === 'white' ? 0 : 1)) n--
    if (n >= start.length) setMoves(moves.slice(0, n))
  }
  const canTakeBack =
    playing && !over && !thinking && moves.length > start.length

  const config = useMemo<Config>(() => {
    const last = game.history({ verbose: true }).at(-1)
    const onMove = (from: Key, to: Key) => {
      const san = playMove(replay(moves), from, to)
      if (san) submit(san)
    }
    return {
      fen: game.fen(),
      orientation: side,
      turnColor: turnColor(game),
      check: game.inCheck(),
      lastMove: last ? [last.from, last.to] : undefined,
      movable: {
        free: false,
        color: yourTurn ? side : undefined,
        dests: legalDests(game),
        events: { after: onMove },
      },
    }
  }, [game, moves, side, yourTurn, submit])

  const from = opening ? (
    <>
      <span className="eco">{opening.eco}</span> {opening.name}
    </>
  ) : (
    'Starting position'
  )
  const bot = `Bot (${elo})`

  return (
    <div className="layout">
      <Board config={config} />
      <aside className="panel">
        <p className="note">
          <button type="button" className="link" onClick={onBack}>
            {backLabel}
          </button>{' '}
          › Play vs bot
        </p>
        <h2 className="opening">{from}</h2>

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
          <>
            <p className="note">
              You play {colorName(side)} vs {bot}
            </p>
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
              ) : yourTurn ? (
                <p>Your move{game.inCheck() ? ': you are in check.' : '.'}</p>
              ) : (
                <p className="note">
                  {thinking ? `${bot} is thinking…` : `${bot} to move.`}
                </p>
              )}
            </div>
            <MoveInput line={moves} disabled={!yourTurn} onMove={submit} />
          </>
        )}

        <p className="sr-only" aria-live="polite">
          {lastMoveText(moves)}
        </p>
        <MoveList moves={moves} ply={moves.length} />

        {playing && (
          <div className="controls">
            {over ? (
              <>
                <button type="button" className="primary" onClick={begin}>
                  Rematch
                </button>
                <button type="button" onClick={setup}>
                  Change bot
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={takeBack}
                  disabled={!canTakeBack}
                >
                  Take back
                </button>
                <button type="button" onClick={() => setResigned(true)}>
                  Resign
                </button>
                <button type="button" onClick={setup}>
                  New game
                </button>
              </>
            )}
          </div>
        )}
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
