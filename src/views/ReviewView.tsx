import type { DrawShape } from 'chessground/draw'
import type { Config } from 'chessground/config'
import type { Key } from 'chessground/types'
import { useEffect, useMemo, useState } from 'react'
import { Board } from '../components/Board'
import {
  legalDests,
  moveSquares,
  playMove,
  replay,
  turnColor,
} from '../chess/game'
import {
  START,
  continuations,
  epd,
  openingFor,
  type OpeningTree,
} from '../openings/tree'
import { db, recordReview, type Card } from '../progress/db'
import { useLive } from '../progress/useLive'

const loadRepertoire = () => db.repertoire.toArray()

// How long a correct answer stays on the board before the next position.
const NEXT_DELAY_MS = 900

type ReviewViewProps = {
  tree: OpeningTree
  onExplore: () => void
}

// Goes through the positions due for review, one at a time: find the book
// move, and the position is rescheduled.
export function ReviewView({ tree, onExplore }: ReviewViewProps) {
  // The queue is fixed when the session starts, so reviewing a card doesn't
  // make it jump around or vanish mid-session.
  const [queue, setQueue] = useState<Card[] | null>(null)
  const [index, setIndex] = useState(0)
  const [missed, setMissed] = useState(false)
  const [answered, setAnswered] = useState<string | null>(null)
  const [results, setResults] = useState({ passed: 0, failed: 0 })

  useEffect(() => {
    db.cards.where('due').belowOrEqual(Date.now()).sortBy('due').then(setQueue)
  }, [])

  const card = queue?.[index]
  const game = useMemo(() => replay(card?.line ?? []), [card])
  const repertoire = useLive(loadRepertoire)
  // Where you have a repertoire move, that is the answer; elsewhere any book
  // move counts.
  const book = useMemo(() => {
    if (!card) return []
    const yours = (repertoire ?? []).filter(
      (m) => m.side === card.side && m.epd === card.epd,
    )
    return yours.length ? yours : continuations(tree, card.epd)
  }, [tree, card, repertoire])
  const opening = useMemo(() => {
    if (!card) return undefined
    const chess = replay([])
    return openingFor(tree, [
      START,
      ...card.line.map((san) => (chess.move(san), epd(chess))),
    ])
  }, [tree, card])

  // After a correct answer, move on to the next position.
  useEffect(() => {
    if (!answered) return
    const timer = setTimeout(() => {
      setIndex((i) => i + 1)
      setMissed(false)
      setAnswered(null)
    }, NEXT_DELAY_MS)
    return () => clearTimeout(timer)
  }, [answered])

  const config = useMemo<Config>(() => {
    if (!card) return { fen: game.fen(), movable: { color: undefined } }
    const onMove = (from: Key, to: Key) => {
      const san = playMove(replay(card.line), from, to)
      if (!san) return
      if (book.some((e) => e.san === san)) {
        if (!missed) setResults((r) => ({ ...r, passed: r.passed + 1 }))
        recordReview(card.side, card.line, !missed)
        setAnswered(san)
      } else {
        if (!missed) setResults((r) => ({ ...r, failed: r.failed + 1 }))
        setMissed(true)
      }
    }
    const arrows: DrawShape[] = missed
      ? book.flatMap((edge) => {
          const squares = moveSquares(game, edge.san)
          return squares
            ? [{ orig: squares.from, dest: squares.to, brush: 'green' }]
            : []
        })
      : []
    const last = game.history({ verbose: true }).at(-1)
    return {
      fen: game.fen(),
      orientation: card.side,
      turnColor: turnColor(game),
      check: game.inCheck(),
      lastMove: last ? [last.from, last.to] : undefined,
      movable: {
        free: false,
        color: answered ? undefined : card.side,
        dests: legalDests(game),
        events: { after: onMove },
      },
      drawable: { autoShapes: arrows },
    }
    // `missed` is in the deps so a wrong move is taken back.
  }, [card, game, book, missed, answered])

  if (!queue) return <p className="note">Loading reviews…</p>

  if (!card) {
    const done = results.passed + results.failed
    return (
      <section className="empty">
        <h2>{done ? 'Review complete' : 'Nothing to review'}</h2>
        <p>
          {done
            ? `You reviewed ${done} ${done === 1 ? 'position' : 'positions'}: ${results.passed} right first time, ${results.failed} missed. Missed positions come back tomorrow.`
            : 'Positions you practice come back here when they are due. Practice a line in the explorer to get started.'}
        </p>
        <button type="button" className="primary" onClick={onExplore}>
          Go to the explorer
        </button>
      </section>
    )
  }

  return (
    <div className="layout">
      <Board config={config} />
      <aside className="panel">
        <p className="note">
          Position {index + 1} of {queue.length}
        </p>
        <h2 className="opening">
          {opening ? (
            <>
              <span className="eco">{opening.eco}</span> {opening.name}
            </>
          ) : (
            'Starting position'
          )}
        </h2>
        <div className="feedback" role="status">
          {answered ? (
            <p className="right">
              <strong>{answered}</strong> is right.
            </p>
          ) : missed ? (
            <p className="wrong">
              Not quite. The arrows show the right moves; play one to continue.
            </p>
          ) : (
            <p>
              Find the book move for {card.side === 'white' ? 'White' : 'Black'}
              .
            </p>
          )}
        </div>
        <div className="controls">
          {!book.length && (
            // The opening data changed and this position left the book.
            <button
              type="button"
              onClick={() => {
                setIndex((i) => i + 1)
                setMissed(false)
              }}
            >
              Skip
            </button>
          )}
          <button type="button" onClick={() => setIndex(queue.length)}>
            End session
          </button>
        </div>
      </aside>
    </div>
  )
}
