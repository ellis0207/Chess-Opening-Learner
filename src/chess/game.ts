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

// From and to squares of a SAN move in the given position, without playing it.
export function moveSquares(
  chess: Chess,
  san: string,
): { from: Key; to: Key } | null {
  const move = chess.moves({ verbose: true }).find((m) => m.san === san)
  return move ? { from: move.from, to: move.to } : null
}

// Highlights the squares of the pieces that play the given moves, as a hint
// that doesn't give away where they go. The app never draws arrows.
export function hintSquares(chess: Chess, sans: string[]): Map<Key, string> {
  const squares = new Map<Key, string>()
  for (const san of sans) {
    const m = moveSquares(chess, san)
    if (m) squares.set(m.from, 'hint')
  }
  return squares
}

// A line being explored: the moves, and how many of them are on the board.
export type Line = { moves: string[]; ply: number }

// Plays `san` at the current ply. Replaying the next move of the line just
// steps forward; any other move replaces the rest of the line.
export function advance({ moves, ply }: Line, san: string): Line {
  return {
    moves: moves[ply] === san ? moves : [...moves.slice(0, ply), san],
    ply: ply + 1,
  }
}

export function seek({ moves }: Line, ply: number): Line {
  return { moves, ply: Math.max(0, Math.min(moves.length, ply)) }
}

// "1.e4 e5 2.Nf3" style text for a move list.
export function formatLine(moves: string[]): string {
  return movePairs(moves)
    .map(([n, white, black]) => `${n}.${white}${black ? ` ${black}` : ''}`)
    .join(' ')
}

// Reads a typed move, in SAN ("Nf3", "nf3", "O-O", "0-0") or coordinates
// ("g1f3", "e7e8q"). Returns the move's SAN if it is legal, else null.
export function parseMove(chess: Chess, text: string): string | null {
  const input = text
    .trim()
    .replace(/0/g, 'O')
    .replace(/[+#!?]+$/, '')
  if (!input) return null
  const coords = /^([a-h][1-8])-?([a-h][1-8])([qrbn])?$/i.exec(input)
  const moves = chess.moves({ verbose: true })
  const candidates = coords
    ? moves.filter(
        (m) =>
          m.from === coords[1].toLowerCase() &&
          m.to === coords[2].toLowerCase() &&
          // Promotions default to a queen.
          (!m.promotion || m.promotion === (coords[3]?.toLowerCase() ?? 'q')),
      )
    : moves.filter((m) => {
        const san = m.san.replace(/[+#]$/, '')
        // Case doesn't matter, except that b is a pawn and B a bishop.
        return (
          san === input ||
          (input[0] !== 'b' && san.toLowerCase() === input.toLowerCase())
        )
      })
  return candidates.length === 1 ? candidates[0].san : null
}

// Spoken description of the last move, e.g. "Black played Nc6", for screen
// readers.
export function lastMoveText(moves: string[]): string {
  if (!moves.length) return 'Starting position'
  const side = moves.length % 2 ? 'White' : 'Black'
  return `${side} played ${moves[moves.length - 1]}`
}
