import type { DrawShape } from 'chessground/draw'
import type { Color, Key } from 'chessground/types'
import type { Config } from 'chessground/config'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Board } from './components/Board'
import { Explorer } from './components/Explorer'
import { MoveList } from './components/MoveList'
import {
  advance,
  legalDests,
  moveSquares,
  playMove,
  replay,
  seek,
  turnColor,
  type Line,
} from './chess/game'
import {
  START,
  continuations,
  epd,
  openingFor,
  type OpeningTree,
} from './openings/tree'
import { loadTree } from './openings/load'
import './App.css'

const MAX_ARROWS = 3

function App() {
  // Stepping back keeps the later moves of the line, so you can step forward
  // through them again.
  const [{ moves, ply }, setLine] = useState<Line>({ moves: [], ply: 0 })
  const [orientation, setOrientation] = useState<Color>('white')
  const [tree, setTree] = useState<OpeningTree | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)

  useEffect(() => {
    loadTree().then(setTree)
  }, [])

  const line = useMemo(() => moves.slice(0, ply), [moves, ply])
  const game = useMemo(() => replay(line), [line])
  // The EPD of every position along the line, starting position first.
  const positions = useMemo(() => {
    const chess = replay([])
    return [START, ...line.map((san) => (chess.move(san), epd(chess)))]
  }, [line])
  const position = positions[positions.length - 1]

  const opening = tree ? openingFor(tree, positions) : undefined
  const inBook = !tree || tree.has(position)
  const edges = useMemo(
    () => (tree ? continuations(tree, position) : []),
    [tree, position],
  )

  const play = useCallback((san: string) => {
    setLine((l) => advance(l, san))
    setHovered(null)
  }, [])

  const goTo = (target: number) => setLine((l) => seek(l, target))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      const target: Record<string, (l: Line) => number> = {
        ArrowLeft: (l) => l.ply - 1,
        ArrowRight: (l) => l.ply + 1,
        Home: () => 0,
        End: (l) => l.moves.length,
      }
      const to = target[e.key]
      if (to) {
        e.preventDefault()
        setLine((l) => seek(l, to(l)))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const config = useMemo<Config>(() => {
    const last = game.history({ verbose: true }).at(-1)
    const onMove = (from: Key, to: Key) => {
      const san = playMove(replay(line), from, to)
      if (san) play(san)
    }
    // Arrows for the main book moves, or just the hovered one.
    const shown = hovered
      ? edges.filter((e) => e.san === hovered)
      : edges.slice(0, MAX_ARROWS)
    const arrows: DrawShape[] = shown.flatMap((edge) => {
      const squares = moveSquares(game, edge.san)
      return squares
        ? [{ orig: squares.from, dest: squares.to, brush: 'green' }]
        : []
    })
    return {
      fen: game.fen(),
      orientation,
      turnColor: turnColor(game),
      check: game.inCheck(),
      lastMove: last ? [last.from, last.to] : undefined,
      movable: {
        free: false,
        color: 'both',
        dests: legalDests(game),
        events: { after: onMove },
      },
      drawable: { autoShapes: arrows },
    }
  }, [game, line, edges, hovered, orientation, play])

  return (
    <main className="app">
      <header>
        <h1>Chess Opening Learner</h1>
      </header>
      <div className="layout">
        <Board config={config} />
        <aside className="panel">
          {tree ? (
            <Explorer
              opening={opening}
              inBook={inBook}
              edges={edges}
              onPlay={play}
              onHover={setHovered}
            />
          ) : (
            <p className="note">Loading openings…</p>
          )}
          <MoveList moves={moves} ply={ply} onSelect={goTo} />
          <div className="controls">
            <button
              type="button"
              onClick={() => goTo(0)}
              disabled={ply === 0}
              aria-label="First move"
            >
              ⏮
            </button>
            <button
              type="button"
              onClick={() => goTo(ply - 1)}
              disabled={ply === 0}
              aria-label="Previous move"
            >
              ◀
            </button>
            <button
              type="button"
              onClick={() => goTo(ply + 1)}
              disabled={ply === moves.length}
              aria-label="Next move"
            >
              ▶
            </button>
            <button
              type="button"
              onClick={() => goTo(moves.length)}
              disabled={ply === moves.length}
              aria-label="Last move"
            >
              ⏭
            </button>
            <button
              type="button"
              onClick={() =>
                setOrientation((o) => (o === 'white' ? 'black' : 'white'))
              }
            >
              Flip board
            </button>
          </div>
        </aside>
      </div>
    </main>
  )
}

export default App
