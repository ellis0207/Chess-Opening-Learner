import { Chess, SQUARES } from 'chess.js'
import type { Color, Key } from 'chessground/types'

// Legal destinations per origin square, in the shape chessground expects.
export function legalDests(chess: Chess): Map<Key, Key[]> {
  const dests = new Map<Key, Key[]>()
  for (const square of SQUARES) {
    const moves = chess.moves({ square, verbose: true })
    if (moves.length)
      dests.set(
        square,
        moves.map((m) => m.to),
      )
  }
  return dests
}

export function turnColor(chess: Chess): Color {
  return chess.turn() === 'w' ? 'white' : 'black'
}

// Plays a move from a board drag, auto-promoting to a queen.
// Returns the SAN of the move, or null if it was illegal.
export function playMove(chess: Chess, from: Key, to: Key): string | null {
  try {
    return chess.move({ from, to, promotion: 'q' }).san
  } catch {
    return null
  }
}

// Groups SAN moves into numbered pairs: [[1, 'e4', 'e5'], [2, 'Nf3', undefined]].
export function movePairs(
  history: string[],
): [number, string, string | undefined][] {
  const pairs: [number, string, string | undefined][] = []
  for (let i = 0; i < history.length; i += 2) {
    pairs.push([i / 2 + 1, history[i], history[i + 1]])
  }
  return pairs
}

// Rebuilds a game from its SAN move list. Opening lines are short, so
// replaying is cheap and keeps the move list as the single source of truth.
export function replay(history: string[]): Chess {
  const chess = new Chess()
  for (const san of history) chess.move(san)
  return chess
}
