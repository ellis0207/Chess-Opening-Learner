import { Chess } from 'chess.js'
import { candidates, limitedMove } from '../engine/stockfish'
import { NATIVE_ELO, legalUci, pickWeakMove, weakStyle } from './bot'

// How long a Stockfish-limited bot searches each move.
const MOVETIME_MS = 800

// The bot's move in the position, as SAN.
export async function botMove(fen: string, elo: number): Promise<string> {
  const chess = new Chess(fen)
  let uci: string
  if (elo >= NATIVE_ELO) {
    uci = await limitedMove(fen, { elo, movetime: MOVETIME_MS })
  } else {
    const style = weakStyle(elo)
    const lines = await candidates(fen, style)
    uci = pickWeakMove(lines, legalUci(chess), style)
  }
  return chess.move({
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci[4],
  }).san
}
