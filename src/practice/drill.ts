import type { Color } from 'chessground/types'
import { replay } from '../chess/game'
import { continuations, epd, type OpeningTree } from '../openings/tree'
import type { RepertoireIndex } from '../repertoire/store'

// The moves that count in a position: from the opening book, or from your
// repertoire. `lines` weights how often the app plays a move for the opponent.
export type Choice = { san: string; lines: number; note?: string }
export type MoveSource = (position: string) => Choice[]

export function bookSource(tree: OpeningTree): MoveSource {
  return (position) => continuations(tree, position)
}

// Your repertoire moves, weighted like the book where the book has them.
export function repertoireSource(
  tree: OpeningTree,
  repertoire: RepertoireIndex,
): MoveSource {
  return (position) =>
    (repertoire.get(position) ?? []).map((m) => ({
      san: m.san,
      lines: tree.get(position)?.edges.get(m.san)?.lines ?? 1,
      note: m.note,
    }))
}

// A practice run. The app plays the opponent's moves and you have to answer
// each with one of yours, until the line runs out or you have played `depth`
// moves.
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
  | { kind: 'correct'; san: string; note?: string }
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

export function bookMoves(source: MoveSource, drill: Drill): Choice[] {
  return source(epd(replay(drillLine(drill))))
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

export function isOver(source: MoveSource, drill: Drill): boolean {
  return (
    yourMoves(drill) >= drill.depth || bookMoves(source, drill).length === 0
  )
}

// Checks your move against the source. A wrong move is not played: you get
// another try, and the feedback lists the moves that count.
export function answer(source: MoveSource, drill: Drill, san: string): Drill {
  const choices = bookMoves(source, drill)
  const choice = choices.find((c) => c.san === san)
  if (choice) {
    return {
      ...drill,
      moves: [...drill.moves, san],
      correct: drill.correct + 1,
      missed: false,
      feedback: { kind: 'correct', san, note: choice.note },
    }
  }
  return {
    ...drill,
    mistakes: drill.mistakes + 1,
    missed: true,
    feedback: { kind: 'wrong', san, book: choices.map((c) => c.san) },
  }
}

// Plays the opponent's reply, picking among the source's moves in proportion
// to how many named lines use each, so main lines come up more often.
export function reply(
  source: MoveSource,
  drill: Drill,
  random: () => number = Math.random,
): Drill {
  const edge = pickWeighted(bookMoves(source, drill), random())
  return edge ? { ...drill, moves: [...drill.moves, edge.san] } : drill
}

export function pickWeighted(edges: Choice[], r: number): Choice | undefined {
  const total = edges.reduce((sum, e) => sum + e.lines, 0)
  let target = r * total
  for (const edge of edges) {
    target -= edge.lines
    if (target < 0) return edge
  }
  return edges.at(-1)
}
