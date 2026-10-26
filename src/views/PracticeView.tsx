import type { Config } from 'chessground/config'
import type { Color, Key } from 'chessground/types'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Board } from '../components/Board'
import { MoveInput } from '../components/MoveInput'
import { MoveList } from '../components/MoveList'
import {
  lastMoveText,
  legalDests,
  hintSquares,
  playMove,
  replay,
  turnColor,
} from '../chess/game'
import { START, epd, openingFor, type OpeningTree } from '../openings/tree'
import {
  answer,
  bookMoves,
  drillLine,
  isOver,
  isYourTurn,
  reply,
  startDrill,
  yourMoves,
  type Drill,
  bookSource,
  repertoireSource,
} from '../practice/drill'
import { db, recordReview } from '../progress/db'
import { useLive } from '../progress/useLive'
import { indexRepertoire } from '../repertoire/store'

// How long the opponent "thinks" before replying, so its move is visible.
const REPLY_DELAY_MS = 500

const DEPTHS = [
  { value: 3, label: '3 moves' },
  { value: 5, label: '5 moves' },
  { value: 8, label: '8 moves' },
  { value: Infinity, label: 'Until theory ends' },
]

export type Source = 'book' | 'repertoire'

const loadRepertoire = () => db.repertoire.toArray()

type PracticeViewProps = {
  tree: OpeningTree
  start: string[]
  initialSide: Color
  initialSource: Source
  onExit: () => void
}

// Drill from a starting line: the app plays the opponent's moves and you find
// yours, from the opening book or from your own repertoire.
export function PracticeView({
  tree,
  start,
  initialSide,
  initialSource,
  onExit,
}: PracticeViewProps) {
  const [side, setSide] = useState<Color>(initialSide)
  const [depth, setDepth] = useState(5)
  const [sourceKind, setSourceKind] = useState<Source>(initialSource)
  const [drill, setDrill] = useState<Drill>(() =>
    startDrill(start, initialSide, 5),
  )
  const [showHints, setShowHints] = useState(false)
  const repertoire = useLive(loadRepertoire)

  const source = useMemo(
    () =>
      sourceKind === 'repertoire'
        ? repertoireSource(tree, indexRepertoire(side, repertoire ?? []))
        : bookSource(tree),
    [tree, sourceKind, side, repertoire],
  )
  const fromRepertoire = sourceKind === 'repertoire'

  const restart = (s = side, d = depth) => setDrill(startDrill(start, s, d))

  const over = isOver(source, drill)
  const yourTurn = isYourTurn(drill)

  // The opponent replies after a short pause.
  useEffect(() => {
    if (over || yourTurn) return
    const timer = setTimeout(
      () => setDrill((d) => reply(source, d)),
      REPLY_DELAY_MS,
    )
    return () => clearTimeout(timer)
  }, [source, drill, over, yourTurn])

  const line = drillLine(drill)
  const game = useMemo(() => replay(drillLine(drill)), [drill])
  const opening = useMemo(() => {
    const chess = replay([])
    const positions = [
      START,
      ...drillLine(drill).map((san) => (chess.move(san), epd(chess))),
    ]
    return openingFor(tree, positions)
  }, [tree, drill])

  const book = useMemo(() => bookMoves(source, drill), [source, drill])
  const wrong = drill.feedback?.kind === 'wrong'
  const hinting = yourTurn && !over && (showHints || wrong)

  const submit = useCallback(
    (san: string) => {
      const next = answer(source, drill, san)
      // Each position is scheduled for review once you find its move:
      // passed if you found it on the first try.
      if (next.correct > drill.correct) {
        recordReview(drill.side, drillLine(drill), !drill.missed)
      }
      setDrill(next)
    },
    [source, drill],
  )

  // A new `drill` object after every answer, wrong ones included, so the
  // board is reset to the drill's position after a rejected move.
  const config = useMemo<Config>(() => {
    const last = game.history({ verbose: true }).at(-1)
    const onMove = (from: Key, to: Key) => {
      const san = playMove(replay(drillLine(drill)), from, to)
      if (san) submit(san)
    }
    const hints = hinting
      ? hintSquares(
          game,
          book.map((e) => e.san),
        )
      : new Map()
    return {
      fen: game.fen(),
      orientation: drill.side,
      turnColor: turnColor(game),
      check: game.inCheck(),
      lastMove: last ? [last.from, last.to] : undefined,
      movable: {
        free: false,
        color: yourTurn && !over ? drill.side : undefined,
        dests: legalDests(game),
        events: { after: onMove },
      },
      highlight: { custom: hints },
    }
  }, [submit, drill, game, book, hinting, yourTurn, over])

  const played = yourMoves(drill)
  const goal = Number.isFinite(drill.depth) ? ` of ${drill.depth}` : ''
  const total = drill.correct + drill.mistakes
  const mistakes = `${drill.mistakes} ${drill.mistakes === 1 ? 'mistake' : 'mistakes'}`
  const accuracy = total ? Math.round((100 * drill.correct) / total) : 100

  return (
    <div className="layout">
      <Board config={config} />
      <aside className="panel">
        <h2 className="opening">
          {opening ? (
            <>
              <span className="eco">{opening.eco}</span> {opening.name}
            </>
          ) : (
            'Starting position'
          )}
        </h2>

        <div className="settings">
          <label>
            Play as{' '}
            <select
              value={side}
              onChange={(e) => {
                const s = e.target.value as Color
                setSide(s)
                restart(s, depth)
              }}
            >
              <option value="white">White</option>
              <option value="black">Black</option>
            </select>
          </label>
          <label>
            Length{' '}
            <select
              value={depth}
              onChange={(e) => {
                const d = Number(e.target.value)
                setDepth(d)
                restart(side, d)
              }}
            >
              {DEPTHS.map((d) => (
                <option key={d.label} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Moves from{' '}
            <select
              value={sourceKind}
              onChange={(e) => {
                setSourceKind(e.target.value as Source)
                restart()
              }}
            >
              <option value="book">Opening book</option>
              <option value="repertoire">My repertoire</option>
            </select>
          </label>
        </div>

        <div className="feedback" role="status">
          {over && fromRepertoire && drill.correct + drill.mistakes === 0 ? (
            <p className="note">
              Your {side} repertoire has no moves from this position yet. Add
              lines in the explorer or import a PGN on the Repertoire tab.
            </p>
          ) : over ? (
            <>
              <p className="result">
                <strong>Line complete.</strong> {drill.correct} correct,{' '}
                {mistakes} ({accuracy}% accuracy).
              </p>
              {drill.feedback?.kind === 'correct' && drill.feedback.note && (
                <p className="move-note">
                  {drill.feedback.san}: {drill.feedback.note}
                </p>
              )}
            </>
          ) : !yourTurn ? (
            <p className="note">Opponent is thinking…</p>
          ) : drill.feedback?.kind === 'wrong' ? (
            <p className="wrong">
              <strong>{drill.feedback.san}</strong>{' '}
              {fromRepertoire
                ? "isn't your repertoire move. Try again: the highlighted piece plays it."
                : "isn't book here. Try again: the highlighted pieces play the book moves."}
            </p>
          ) : drill.feedback?.kind === 'correct' ? (
            <>
              <p className="right">
                <strong>{drill.feedback.san}</strong>{' '}
                {fromRepertoire ? 'is your move.' : 'is book.'} Your move.
              </p>
              {drill.feedback.note && (
                <p className="move-note">{drill.feedback.note}</p>
              )}
            </>
          ) : (
            <p>
              Find {fromRepertoire ? 'your repertoire move' : 'the book move'}{' '}
              for {drill.side === 'white' ? 'White' : 'Black'}.
            </p>
          )}
          <p className="note">
            Move {played}
            {goal} · {drill.correct} correct · {mistakes}
          </p>
        </div>

        <MoveInput line={line} disabled={over || !yourTurn} onMove={submit} />
        <p className="sr-only" aria-live="polite">
          {lastMoveText(line)}
        </p>

        <MoveList moves={line} ply={line.length} />

        <div className="controls">
          <button
            type="button"
            className={over ? 'primary' : undefined}
            onClick={() => restart()}
          >
            {over ? 'Practice another line' : 'Restart'}
          </button>
          <button
            type="button"
            aria-pressed={showHints}
            onClick={() => setShowHints((h) => !h)}
          >
            {showHints ? 'Hide hints' : 'Show hints'}
          </button>
          <button type="button" onClick={onExit}>
            Back to explorer
          </button>
        </div>
      </aside>
    </div>
  )
}
