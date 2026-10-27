import { Chess } from 'chess.js'
import { START, epd, type OpeningTree } from '../openings/tree'
import type { PositionReview } from './analyse'
import { chancesLost, classify, type Classification } from './classify'

export type MoveReview = {
  classification: Classification
  lost: number // expected points the move gave away
  best?: string // the engine's move instead, as SAN, if it wasn't played
}

// Rates each move of a game once the positions before and after it have
// been reviewed (undefined until then). Moves along a named opening line
// count as book moves until the game leaves the book.
export function reviewMoves(
  moves: string[],
  positions: (PositionReview | undefined)[],
  tree: OpeningTree,
): (MoveReview | undefined)[] {
  const chess = new Chess()
  let inBook = true
  let position = START
  return moves.map((san, ply) => {
    const before = positions[ply]
    const after = positions[ply + 1]
    const white = chess.turn() === 'w'
    const move = chess.move(san)
    const uci = move.from + move.to + (move.promotion ?? '')
    inBook &&= tree.get(position)?.edges.has(move.san) ?? false
    position = epd(chess)
    if (!before || !after) return undefined
    const best = before.best === undefined || before.best === uci
    return {
      classification: classify({
        before: before.eval,
        after: after.eval,
        white,
        best,
        book: inBook,
      }),
      lost: chancesLost(before.eval, after.eval, white),
      best: best ? undefined : sanOf(move.before, before.best!),
    }
  })
}

// A UCI move in SAN, or the UCI itself if it isn't legal there.
function sanOf(fen: string, uci: string): string {
  try {
    return new Chess(fen).move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci[4],
    }).san
  } catch {
    return uci
  }
}
