// Game review in the style of Chess.com: every move is rated by how much of
// the mover's winning chances it threw away, measured with Stockfish's
// evaluation of the position before and after it.
import { MATE } from '../engine/types'

// An evaluation from White's point of view: centipawns, or a mate in `mate`
// moves (positive if White mates). A finished game has mate 0 and a score of
// ±MATE for a checkmate, 0 for a draw.
export type Eval = { cp: number; mate?: number }

export type Classification =
  'book' | 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder'

export const CLASSES: Classification[] = [
  'book',
  'best',
  'excellent',
  'good',
  'inaccuracy',
  'mistake',
  'blunder',
]

export const CLASS_NAME: Record<Classification, string> = {
  book: 'Book',
  best: 'Best',
  excellent: 'Excellent',
  good: 'Good',
  inaccuracy: 'Inaccuracy',
  mistake: 'Mistake',
  blunder: 'Blunder',
}

export const CLASS_GLYPH: Record<Classification, string> = {
  book: '≡',
  best: '★',
  excellent: '!',
  good: '✓',
  inaccuracy: '?!',
  mistake: '?',
  blunder: '??',
}

// Expected points (0 to 1) from White's point of view, with the curve
// Lichess fitted to its games. A mate counts as a sure win.
export function whiteChances({ cp }: Eval): number {
  if (Math.abs(cp) >= MATE - 1000) return cp > 0 ? 1 : cp < 0 ? 0 : 0.5
  return 1 / (1 + Math.exp(-0.00368208 * cp))
}

// Expected points lost by the move, for the side that played it.
export function chancesLost(before: Eval, after: Eval, white: boolean): number {
  const lost = whiteChances(before) - whiteChances(after)
  return Math.max(0, white ? lost : -lost)
}

// Chess.com's limits on expected points lost for each rating.
const LIMITS: [number, Classification][] = [
  [0.02, 'excellent'],
  [0.05, 'good'],
  [0.1, 'inaccuracy'],
  [0.2, 'mistake'],
]

export function classify({
  before,
  after,
  white,
  best,
  book,
}: {
  before: Eval
  after: Eval
  white: boolean // whether White played the move
  best: boolean // whether it was the engine's choice
  book: boolean // whether it's a known opening move
}): Classification {
  if (book) return 'book'
  if (best) return 'best'
  const lost = chancesLost(before, after, white)
  for (const [limit, rating] of LIMITS) if (lost <= limit) return rating
  return 'blunder'
}

// How accurately a move was played, from 0 to 100, with Lichess's formula.
export function moveAccuracy(lost: number): number {
  const accuracy = 103.1668 * Math.exp(-4.354 * lost) - 3.1669
  return Math.max(0, Math.min(100, accuracy))
}

// A player's accuracy over the game: the average of their moves' accuracy.
export function accuracy(losses: number[]): number | null {
  if (!losses.length) return null
  return losses.reduce((sum, l) => sum + moveAccuracy(l), 0) / losses.length
}

// "+1.3", "−0.4", "M3" (White mates), "−M2" (Black mates), "1-0".
export function evalText({ cp, mate }: Eval): string {
  if (mate === 0) return cp > 0 ? '1-0' : cp < 0 ? '0-1' : '½-½'
  if (mate !== undefined) return `${mate < 0 ? '−' : ''}M${Math.abs(mate)}`
  const pawns = (Math.abs(cp) / 100).toFixed(1)
  return pawns === '0.0' ? '0.0' : `${cp < 0 ? '−' : '+'}${pawns}`
}
