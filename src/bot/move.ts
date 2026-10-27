import { Chess } from 'chess.js'
import {
  candidates,
  engineLoaded,
  limitedMove,
  stopSearch,
} from '../engine/stockfish'
import { NATIVE_ELO, legalUci, pickWeakMove, quickMove, weakStyle } from './bot'

// The bot answers within about 1.5 seconds: the engine searches for
// SEARCH_MS, is told to stop at STOP_MS, and if it still hasn't answered by
// GIVE_UP_MS the bot plays a quick move without it.
const SEARCH_MS = 700
const STOP_MS = 1000
const GIVE_UP_MS = 1300

async function engineMove(fen: string, elo: number): Promise<string> {
  if (elo >= NATIVE_ELO) return limitedMove(fen, { elo, movetime: SEARCH_MS })
  const style = weakStyle(elo)
  const lines = await candidates(fen, { ...style, movetime: SEARCH_MS })
  return pickWeakMove(lines, legalUci(new Chess(fen)), style)
}

// The bot's move in the position, as SAN.
export async function botMove(fen: string, elo: number): Promise<string> {
  const chess = new Chess(fen)
  let uci: string | null = null
  if (engineLoaded()) {
    const stop = setTimeout(stopSearch, STOP_MS)
    uci = await Promise.race([
      engineMove(fen, elo).catch(() => null),
      new Promise<null>((r) => setTimeout(() => r(null), GIVE_UP_MS)),
    ])
    clearTimeout(stop)
  }
  if (!uci) return quickMove(chess)
  return chess.move({
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci[4],
  }).san
}
