import type { DrawShape } from 'chessground/draw'
import type { Config } from 'chessground/config'
import type { Color, Key } from 'chessground/types'
import { useEffect, useMemo, useState } from 'react'
import { Board } from '../components/Board'
import { MoveList } from '../components/MoveList'
import {
  legalDests,
  moveSquares,
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
} from '../practice/drill'

// How long the opponent "thinks" before replying, so its move is visible.
const REPLY_DELAY_MS = 500

const DEPTHS = [
  { value: 3, label: '3 moves' },
  { value: 5, label: '5 moves' },
  { value: 8, label: '8 moves' },
  { value: Infinity, label: 'Until theory ends' },
]

type PracticeViewProps = {
  tree: OpeningTree
  start: string[]
  initialSide: Color
  onExit: () => void
}

// Drill the opening tree from a starting line: the app plays the opponent's
// book moves and you find yours.
export function PracticeView({
  tree,
  start,
  initialSide,
  onExit,
}: PracticeViewProps) {
  const [side, setSide] = useState<Color>(initialSide)
  const [depth, setDepth] = useState(5)
  const [drill, setDrill] = useState<Drill>(() =>
    startDrill(start, initialSide, 5),
  )
  const [showHints, setShowHints] = useState(false)

  const restart = (s = side, d = depth) => setDrill(startDrill(start, s, d))

  const over = isOver(tree, drill)
  const yourTurn = isYourTurn(drill)

  // The opponent replies after a short pause.
  useEffect(() => {
    if (over || yourTurn) return
    const timer = setTimeout(
      () => setDrill((d) => reply(tree, d)),
      REPLY_DELAY_MS,
    )
    return () => clearTimeout(timer)
  }, [tree, drill, over, yourTurn])

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

  const book = useMemo(() => bookMoves(tree, drill), [tree, drill])
  const wrong = drill.feedback?.kind === 'wrong'
  const hinting = yourTurn && !over && (showHints || wrong)

  // A new `drill` object after every answer, wrong ones included, so the
  // board is reset to the drill's position after a rejected move.
  const config = useMemo<Config>(() => {
    const last = game.history({ verbose: true }).at(-1)
    const onMove = (from: Key, to: Key) => {
      const san = playMove(replay(drillLine(drill)), from, to)
      if (san) setDrill((d) => answer(tree, d, san))
    }
    const arrows: DrawShape[] = hinting
      ? book.flatMap((edge) => {
          const squares = moveSquares(game, edge.san)
          return squares
            ? [{ orig: squares.from, dest: squares.to, brush: 'green' }]
            : []
        })
      : []
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
      drawable: { autoShapes: arrows },
    }
  }, [tree, drill, game, book, hinting, yourTurn, over])

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
        </div>

        <div className="feedback" role="status">
          {over ? (
            <p className="result">
              <strong>Line complete.</strong> {drill.correct} correct,{' '}
              {mistakes} ({accuracy}% accuracy).
            </p>
          ) : !yourTurn ? (
            <p className="note">Opponent is thinking…</p>
          ) : drill.feedback?.kind === 'wrong' ? (
            <p className="wrong">
              <strong>{drill.feedback.san}</strong> isn't book here. Try again:
              the arrows show the book moves.
            </p>
          ) : drill.feedback?.kind === 'correct' ? (
            <p className="right">
              <strong>{drill.feedback.san}</strong> is book. Your move.
            </p>
          ) : (
            <p>
              Find the book move for{' '}
              {drill.side === 'white' ? 'White' : 'Black'}.
            </p>
          )}
          <p className="note">
            Move {played}
            {goal} · {drill.correct} correct · {mistakes}
          </p>
        </div>

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
