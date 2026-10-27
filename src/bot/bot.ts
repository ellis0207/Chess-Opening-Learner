import type { Chess } from 'chess.js'
import type { Color } from 'chessground/types'
import type { EngineLine } from '../engine/types.ts'

// Bot strengths, in steps of 100.
export const MIN_ELO = 300
export const MAX_ELO = 3100
export const ELO_STEP = 100
export const DEFAULT_ELO = 1200

// From here up, Stockfish limits its own strength (its UCI_Elo starts at
// 1320). Below it, the bot picks among Stockfish's top moves itself.
export const NATIVE_ELO = 1400

export const ELO_LEVELS = Array.from(
  { length: (MAX_ELO - MIN_ELO) / ELO_STEP + 1 },
  (_, i) => MIN_ELO + i * ELO_STEP,
)

export function clampElo(elo: number): number {
  const stepped = Math.round(elo / ELO_STEP) * ELO_STEP
  return Math.max(MIN_ELO, Math.min(MAX_ELO, stepped))
}

// How a bot below NATIVE_ELO plays, from 300 (weakest) to 1300. Like a
// person at that level it mostly plays a reasonable move, now and then a
// mistake, and occasionally a blunder; how bad a blunder can get, and how
// deep it looks for tactics, grow with the level.
export type WeakStyle = {
  depth: number // search depth of the candidate moves
  multipv: number // how many candidate moves it considers
  tolerance: number // centipawns a "reasonable" move may lose
  mistake: number // chance of a mistake...
  mistakeMax: number // ...losing up to this many centipawns
  blunder: number // chance of a blunder...
  blunderMax: number // ...losing up to this many centipawns
}

export function weakStyle(elo: number): WeakStyle {
  const t = Math.max(
    0,
    Math.min(1, (elo - MIN_ELO) / (NATIVE_ELO - ELO_STEP - MIN_ELO)),
  )
  return {
    depth: 3 + Math.round(4 * t),
    multipv: 20,
    tolerance: Math.round(100 - 40 * t),
    mistake: 0.35 - 0.12 * t,
    mistakeMax: 300,
    blunder: 0.07 + 0.13 * (1 - t) ** 2,
    blunderMax: Math.round(1000 - 500 * t),
  }
}

// Scores beyond this count the same, so missing a mate is one big blunder.
const SCORE_CAP = 2000

// Picks a weak bot's move from the engine's candidates (or any legal move if
// there are none). `random` returns a number in [0, 1).
export function pickWeakMove(
  lines: EngineLine[],
  legal: string[],
  style: WeakStyle,
  random: () => number = Math.random,
): string {
  const moves = lines.filter((l) => l.pv.length)
  if (!moves.length) return legal[Math.floor(random() * legal.length)]
  const capped = moves.map((l) =>
    Math.max(-SCORE_CAP, Math.min(SCORE_CAP, l.score)),
  )
  const best = Math.max(...capped)
  const loss = capped.map((s) => best - s)

  // Mistakes and blunders only when such a move is on offer; otherwise the
  // bot plays a reasonable move after all.
  const tiers = [
    [0, style.tolerance],
    [style.tolerance, style.mistakeMax],
    [style.mistakeMax, style.blunderMax],
  ]
  const r = random()
  let tier = r < style.blunder ? 2 : r < style.blunder + style.mistake ? 1 : 0
  for (; tier > 0; tier--) {
    const [lo, hi] = tiers[tier]
    const pool = moves.filter((_, i) => loss[i] > lo && loss[i] <= hi)
    if (pool.length) return pool[Math.floor(random() * pool.length)].pv[0]
  }
  // A reasonable move, better ones more likely.
  const weights = loss.map((l) =>
    l <= style.tolerance ? Math.exp(-l / (style.tolerance / 2 + 1)) : 0,
  )
  let w = random() * weights.reduce((a, b) => a + b, 0)
  for (let i = 0; i < moves.length; i++) {
    w -= weights[i]
    if (w < 0) return moves[i].pv[0]
  }
  return moves[loss.indexOf(0)].pv[0]
}

export type Result = {
  outcome: 'win' | 'loss' | 'draw'
  reason: string
}

// The result of a finished game for the player of `you`, or null while it
// goes on.
export function gameResult(chess: Chess, you: Color): Result | null {
  if (chess.isCheckmate()) {
    const loser = chess.turn() === 'w' ? 'white' : 'black'
    return { outcome: loser === you ? 'loss' : 'win', reason: 'by checkmate' }
  }
  const draw = (reason: string): Result => ({ outcome: 'draw', reason })
  if (chess.isStalemate()) return draw('by stalemate')
  if (chess.isInsufficientMaterial()) return draw('by insufficient material')
  if (chess.isThreefoldRepetition()) return draw('by threefold repetition')
  if (chess.isDrawByFiftyMoves()) return draw('by the fifty-move rule')
  return null
}

const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }

// A quick move without the engine, for when it can't answer in time: mates,
// wins material, and avoids leaving the moved piece hanging. Returns SAN.
export function quickMove(chess: Chess, random: () => number = Math.random) {
  let best = { san: '', score: -Infinity }
  for (const m of chess.moves({ verbose: true })) {
    chess.move(m)
    let score = random() * 0.3
    if (chess.isCheckmate()) score += 1000
    else if (chess.isDraw()) score -= 2
    else {
      score += VALUE[m.captured ?? 'k'] + VALUE[m.promotion ?? 'k']
      if (chess.inCheck()) score += 0.2
      const them = chess.turn()
      const attackers = chess.attackers(m.to, them)
      if (attackers.length) {
        const piece = VALUE[m.promotion ?? m.piece]
        const cheapest = Math.min(
          ...attackers.map((sq) => VALUE[chess.get(sq)!.type] || 100),
        )
        const defended = chess.attackers(m.to, them === 'w' ? 'b' : 'w').length
        score -= defended ? Math.max(0, piece - cheapest) : piece
      }
    }
    chess.undo()
    if (score > best.score) best = { san: m.san, score }
  }
  return best.san
}

// The UCI moves of every legal move in the position.
export function legalUci(chess: Chess): string[] {
  return chess
    .moves({ verbose: true })
    .map((m) => m.from + m.to + (m.promotion ?? ''))
}
