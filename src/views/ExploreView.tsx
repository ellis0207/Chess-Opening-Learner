import type { DrawShape } from 'chessground/draw'
import type { Color, Key } from 'chessground/types'
import type { Config } from 'chessground/config'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import { Board } from '../components/Board'
import { Explorer } from '../components/Explorer'
import { RepertoirePanel } from '../components/RepertoirePanel'
import { db } from '../progress/db'
import { useLive } from '../progress/useLive'
import { addLine, removeMove, setNote } from '../repertoire/store'
import { MoveInput } from '../components/MoveInput'
import { MoveList } from '../components/MoveList'
import {
  advance,
  lastMoveText,
  legalDests,
  moveSquares,
  playMove,
  replay,
  seek,
  turnColor,
  type Line,
} from '../chess/game'
import {
  START,
  continuations,
  epd,
  openingFor,
  type OpeningTree,
} from '../openings/tree'

const MAX_ARROWS = 3

const loadRepertoire = () => db.repertoire.toArray()

type ExploreViewProps = {
  tree: OpeningTree
  // Kept by the parent so the line survives a trip to practice mode.
  state: Line
  setState: Dispatch<SetStateAction<Line>>
  orientation: Color
  setOrientation: Dispatch<SetStateAction<Color>>
  onPractice: (moves: string[], side: Color) => void
}

// Browse the opening tree: play moves or pick book moves, and step through
// the line.
export function ExploreView({
  tree,
  state: { moves, ply },
  setState: setLine,
  orientation,
  setOrientation,
  onPractice,
}: ExploreViewProps) {
  const [hovered, setHovered] = useState<string | null>(null)

  const line = useMemo(() => moves.slice(0, ply), [moves, ply])
  const game = useMemo(() => replay(line), [line])
  // The EPD of every position along the line, starting position first.
  const positions = useMemo(() => {
    const chess = replay([])
    return [START, ...line.map((san) => (chess.move(san), epd(chess)))]
  }, [line])
  const position = positions[positions.length - 1]

  const opening = openingFor(tree, positions)
  const inBook = tree.has(position)
  const edges = useMemo(() => continuations(tree, position), [tree, position])

  // Your repertoire for the side the board is turned to.
  const repertoire = useLive(loadRepertoire)
  const mine = useMemo(
    () =>
      (repertoire ?? []).filter(
        (m) => m.side === orientation && m.epd === position,
      ),
    [repertoire, orientation, position],
  )
  const current = useMemo(
    () =>
      ply > 0
        ? (repertoire ?? []).find(
            (m) =>
              m.side === orientation &&
              m.epd === positions[ply - 1] &&
              m.san === line[ply - 1],
          )
        : undefined,
    [repertoire, orientation, positions, line, ply],
  )
  const mineSans = new Set(mine.map((m) => m.san))
  const extra = mine
    .map((m) => m.san)
    .filter((san) => !edges.some((e) => e.san === san))

  const play = useCallback(
    (san: string) => {
      setLine((l) => advance(l, san))
      setHovered(null)
    },
    [setLine],
  )

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
  }, [setLine])

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
    <div className="layout">
      <Board config={config} />
      <aside className="panel">
        <Explorer
          opening={opening}
          inBook={inBook}
          edges={edges}
          mine={mineSans}
          extra={extra}
          onPlay={play}
          onHover={setHovered}
        />
        <MoveInput line={line} onMove={play} />
        <p className="sr-only" aria-live="polite">
          {lastMoveText(line)}
          {opening ? `. ${opening.name}` : ''}
        </p>
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
        <button
          type="button"
          className="primary"
          onClick={() => onPractice(line, orientation)}
          disabled={!edges.length && !mine.length}
        >
          Practice from here
        </button>
        <RepertoirePanel
          key={current?.id ?? 'none'}
          side={orientation}
          canAdd={ply > 0}
          current={current}
          onAdd={() => addLine(orientation, line)}
          onRemove={removeMove}
          onNote={(move, note) => setNote(move.id, note)}
        />
      </aside>
    </div>
  )
}
