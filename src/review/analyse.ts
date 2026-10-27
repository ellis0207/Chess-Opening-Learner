import type { Chess } from 'chess.js'
import { evaluate, stopSearch, whenReady } from '../engine/stockfish'
import { MATE, type EngineLine } from '../engine/types'
import { replay } from '../chess/game'
import type { Eval } from './classify'

// How hard each position is searched: a 60-move game takes about half a
// minute at most.
const DEPTH = 16
const MOVETIME_MS = 700

// What the engine makes of one position of the game.
export type PositionReview = {
  eval: Eval
  best?: string // the engine's move, as UCI (none once the game is over)
}

// The evaluation of a finished game's last position.
function finalEval(chess: Chess): Eval {
  if (!chess.isCheckmate()) return { cp: 0, mate: 0 }
  return { cp: chess.turn() === 'w' ? -MATE : MATE, mate: 0 }
}

// An engine line's score, which is for the side to move, from White's side.
export function whiteEval(line: EngineLine, whiteToMove: boolean): Eval {
  const sign = whiteToMove ? 1 : -1
  return {
    cp: sign * line.score,
    mate: line.mate === undefined ? undefined : sign * line.mate,
  }
}

// Reviews every position of a game, starting position first, reporting
// each as it's done. Returns a function that stops the review.
export function reviewGame(
  moves: string[],
  onPosition: (ply: number, review: PositionReview) => void,
  onError: (error: Error) => void,
): () => void {
  let stopped = false
  let finished = false
  ;(async () => {
    await whenReady()
    for (let ply = 0; ply <= moves.length && !stopped; ply++) {
      const chess = replay(moves.slice(0, ply))
      if (chess.isGameOver()) {
        onPosition(ply, { eval: finalEval(chess) })
        continue
      }
      const line = await evaluate(chess.fen(), {
        depth: DEPTH,
        movetime: MOVETIME_MS,
      })
      if (stopped) return
      if (!line) throw new Error('the engine found no move')
      onPosition(ply, {
        eval: whiteEval(line, chess.turn() === 'w'),
        best: line.pv[0],
      })
    }
    finished = true
  })().catch((e: Error) => {
    if (!stopped) onError(e)
  })
  return () => {
    // Frees the engine for the next game's bot.
    if (!stopped && !finished) stopSearch()
    stopped = true
  }
}
