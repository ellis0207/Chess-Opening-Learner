import type { Color } from 'chessground/types'
import { replay } from '../chess/game'
import {
  continuations,
  epd,
  type Edge,
  type OpeningTree,
} from '../openings/tree'

// A practice run through the opening tree. The app plays the opponent's book
// moves and you have to answer each with a book move of your own, until the
// line runs out of theory or you have played `depth` moves.
export type Drill = {
  start: string[] // moves already on the board when the drill began
  moves: string[] // moves played during the drill
  side: Color
  depth: number
  correct: number
  mistakes: number
  missed: boolean // a wrong move was played in the current position
  feedback: Feedback | null
}

export type Feedback =
  | { kind: 'correct'; san: string }
  | { kind: 'wrong'; san: string; book: string[] }

export function startDrill(start: string[], side: Color, depth: number): Drill {
  return {
    start,
    moves: [],
    side,
    depth,
    correct: 0,
    mistakes: 0,
    missed: false,
    feedback: null,
  }
}

export function drillLine(drill: Drill): string[] {
  return [...drill.start, ...drill.moves]
}

export function bookMoves(tree: OpeningTree, drill: Drill): Edge[] {
  return continuations(tree, epd(replay(drillLine(drill))))
}

export function isYourTurn(drill: Drill): boolean {
  const toMove = replay(drillLine(drill)).turn() === 'w' ? 'white' : 'black'
  return toMove === drill.side
}

// How many of your own moves you have played in this drill.
export function yourMoves(drill: Drill): number {
  // drill.moves alternates sides, starting with whoever was to move at start.
  const firstIsYours = isYourTurn({ ...drill, moves: [] })
  const n = drill.moves.length
  return firstIsYours ? Math.ceil(n / 2) : Math.floor(n / 2)
}

export function isOver(tree: OpeningTree, drill: Drill): boolean {
  return yourMoves(drill) >= drill.depth || bookMoves(tree, drill).length === 0
}

// Checks your move against the book. A wrong move is not played: you get
// another try, and the feedback lists the book moves.
export function answer(tree: OpeningTree, drill: Drill, san: string): Drill {
  const book = bookMoves(tree, drill).map((e) => e.san)
  if (book.includes(san)) {
    return {
      ...drill,
      moves: [...drill.moves, san],
      correct: drill.correct + 1,
      missed: false,
      feedback: { kind: 'correct', san },
    }
  }
  return {
    ...drill,
    mistakes: drill.mistakes + 1,
    missed: true,
    feedback: { kind: 'wrong', san, book },
  }
}

// Plays the opponent's reply, picking among book moves in proportion to how
// many named lines use each, so main lines come up more often than sidelines.
export function reply(
  tree: OpeningTree,
  drill: Drill,
  random: () => number = Math.random,
): Drill {
  const edge = pickWeighted(bookMoves(tree, drill), random())
  return edge ? { ...drill, moves: [...drill.moves, edge.san] } : drill
}

export function pickWeighted(edges: Edge[], r: number): Edge | undefined {
  const total = edges.reduce((sum, e) => sum + e.lines, 0)
  let target = r * total
  for (const edge of edges) {
    target -= edge.lines
    if (target < 0) return edge
  }
  return edges.at(-1)
}
