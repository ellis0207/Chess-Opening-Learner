// Measures how well each bot level plays: it plays games against itself
// with the in-browser Stockfish build (run in Node), and a deeper search
// rates every move. Prints, per level, the average centipawn loss and the
// mistakes (100-299 cp) and blunders (300+ cp) per 40 moves.
//
//   npm run bot-strength [levels...] [-- --games N]
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { Chess } from 'chess.js'
import {
  NATIVE_ELO,
  legalUci,
  pickWeakMove,
  weakStyle,
} from '../src/bot/bot.ts'
import type { EngineLine } from '../src/engine/types.ts'

const SEARCH_MS = 700 // as in src/bot/move.ts
const REFERENCE_DEPTH = 11
const MAX_PLIES = 80
const CAP = 1000 // centipawns; bigger losses count as this

class Engine {
  private proc: ChildProcessWithoutNullStreams
  private buffer = ''
  private listener: ((line: string) => void) | null = null

  constructor() {
    this.proc = spawn(process.execPath, [
      'node_modules/stockfish/bin/stockfish-18-lite-single.js',
    ])
    this.proc.stdout.setEncoding('utf8')
    this.proc.stdout.on('data', (chunk: string) => {
      this.buffer += chunk
      let i
      while ((i = this.buffer.indexOf('\n')) >= 0) {
        const line = this.buffer.slice(0, i).trim()
        this.buffer = this.buffer.slice(i + 1)
        this.listener?.(line)
      }
    })
    this.send('uci')
  }

  send(cmd: string) {
    this.proc.stdin.write(cmd + '\n')
  }

  search(commands: string[]): Promise<{ lines: EngineLine[]; best: string }> {
    return new Promise((resolve) => {
      const lines = new Map<number, EngineLine>()
      this.listener = (line) => {
        if (line.startsWith('info') && line.includes(' pv ')) {
          const k = Number(/ multipv (\d+)/.exec(line)?.[1] ?? 1)
          const cp = / score cp (-?\d+)/.exec(line)
          const mate = / score mate (-?\d+)/.exec(line)
          const m = mate ? Number(mate[1]) : 0
          lines.set(k, {
            score: cp ? Number(cp[1]) : Math.sign(m) * (100000 - Math.abs(m)),
            pv: line.split(' pv ')[1].split(' '),
          })
        } else if (line.startsWith('bestmove')) {
          this.listener = null
          resolve({
            lines: [...lines.entries()]
              .sort((a, b) => a[0] - b[0])
              .map((e) => e[1]),
            best: line.split(' ')[1],
          })
        }
      }
      this.send('ucinewgame')
      for (const c of commands) this.send(c)
    })
  }

  quit() {
    this.proc.kill()
  }
}

async function botMove(engine: Engine, fen: string, elo: number) {
  if (elo >= NATIVE_ELO) {
    const { best } = await engine.search([
      'setoption name UCI_LimitStrength value true',
      `setoption name UCI_Elo value ${elo}`,
      'setoption name MultiPV value 1',
      `position fen ${fen}`,
      `go movetime ${SEARCH_MS}`,
    ])
    return best
  }
  const style = weakStyle(elo)
  const { lines } = await engine.search([
    'setoption name UCI_LimitStrength value false',
    `setoption name MultiPV value ${style.multipv}`,
    `position fen ${fen}`,
    `go depth ${style.depth} movetime ${SEARCH_MS}`,
  ])
  return pickWeakMove(lines, legalUci(new Chess(fen)), style)
}

// The reference score of a position for the side to move.
async function evaluate(engine: Engine, chess: Chess): Promise<number> {
  if (chess.isCheckmate()) return -CAP
  if (chess.isDraw()) return 0
  const { lines } = await engine.search([
    'setoption name MultiPV value 1',
    `position fen ${chess.fen()}`,
    `go depth ${REFERENCE_DEPTH}`,
  ])
  return Math.max(-CAP, Math.min(CAP, lines[0]?.score ?? 0))
}

async function measure(elo: number, games: number) {
  const bot = new Engine()
  const ref = new Engine()
  const losses: number[] = []
  let worst = { loss: 0, line: '' }
  for (let g = 0; g < games; g++) {
    const chess = new Chess()
    let before = await evaluate(ref, chess)
    while (!chess.isGameOver() && chess.history().length < MAX_PLIES) {
      const uci = await botMove(bot, chess.fen(), elo)
      chess.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci[4],
      })
      const after = await evaluate(ref, chess)
      // Only count moves played from a position that's still a game.
      const loss = Math.max(0, before + after)
      if (Math.abs(before) < CAP) losses.push(Math.min(loss, CAP))
      if (loss > worst.loss && Math.abs(before) < CAP)
        worst = { loss, line: chess.history().join(' ') }
      before = after
    }
  }
  bot.quit()
  ref.quit()
  const n = losses.length
  const per40 = (k: number) => ((40 * k) / n).toFixed(1)
  return {
    elo,
    moves: n,
    acpl: Math.round(losses.reduce((a, b) => a + b, 0) / n),
    mistakes: per40(losses.filter((l) => l >= 100 && l < 300).length),
    blunders: per40(losses.filter((l) => l >= 300).length),
    worst: `${worst.loss} cp after ${worst.line.split(' ').length} plies`,
  }
}

const args = process.argv.slice(2)
const gi = args.indexOf('--games')
const games = gi >= 0 ? Number(args[gi + 1]) : 2
const levels = args
  .filter((a, i) => /^\d+$/.test(a) && args[i - 1] !== '--games')
  .map(Number)
const results = await Promise.all(
  (levels.length ? levels : [300, 600, 900, 1200, 1400, 2000]).map((elo) =>
    measure(elo, games),
  ),
)
console.table(results)
