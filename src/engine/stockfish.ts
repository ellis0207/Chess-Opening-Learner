// Stockfish in a web worker: the lite single-threaded WebAssembly build, which
// runs without the cross-origin isolation headers GitHub Pages can't send.
// It is about 7 MB, so it loads the first time it's needed. The files are
// copied to public/engine/ by scripts/copy-engine.ts.
import { MATE, type EngineLine } from './types'

export type { EngineLine }

// The output of one search: its lines, best first, and the move it chose.
type Search = { lines: EngineLine[]; bestmove: string }

type Job = {
  commands: string[] // options, position and go, sent in order
  resolve: (search: Search) => void
  reject: (error: Error) => void
}

let worker: Worker | null = null
let ready: Promise<void> | null = null
const queue: Job[] = []
let running: Job | null = null
let loaded = false

const LOAD_TIMEOUT_MS = 60_000

// Stops the engine after an error, failing its searches, so the next
// search starts it afresh.
function fail(error: Error) {
  worker?.terminate()
  worker = null
  ready = null
  loaded = false
  const jobs = [...(running ? [running] : []), ...queue.splice(0)]
  running = null
  for (const job of jobs) job.reject(error)
}

function start(): Promise<void> {
  if (ready) return ready
  ready = new Promise((resolve, reject) => {
    // The worker finds stockfish.wasm next to its own script.
    worker = new Worker(`${import.meta.env.BASE_URL}engine/stockfish.js`)
    const broke = (error: Error) => {
      clearTimeout(watchdog)
      reject(error)
      fail(error)
    }
    // A failed download doesn't always reach onerror, so give up on a load
    // that takes far longer than the download should.
    const watchdog = setTimeout(
      () => broke(new Error('the engine took too long to load')),
      LOAD_TIMEOUT_MS,
    )
    worker.onerror = (e) => {
      e.preventDefault()
      broke(new Error(e.message || 'the engine failed to load'))
    }
    let lines = new Map<number, EngineLine>()
    worker.onmessage = ({ data }: MessageEvent<string>) => {
      if (typeof data !== 'string') return
      if (data === 'uciok') {
        worker!.postMessage('isready')
      } else if (data === 'readyok') {
        clearTimeout(watchdog)
        loaded = true
        resolve()
      } else if (data.startsWith('info') && data.includes(' pv ')) {
        const k = Number(/ multipv (\d+)/.exec(data)?.[1] ?? 1)
        const cp = / score cp (-?\d+)/.exec(data)
        const mate = / score mate (-?\d+)/.exec(data)
        const m = mate ? Number(mate[1]) : undefined
        lines.set(k, {
          score: cp ? Number(cp[1]) : Math.sign(m!) * (MATE - Math.abs(m!)),
          mate: m,
          pv: data.split(' pv ')[1].trim().split(' '),
        })
      } else if (data.startsWith('bestmove')) {
        const job = running!
        running = null
        job.resolve({
          lines: [...lines.entries()]
            .sort((a, b) => a[0] - b[0])
            .map((e) => e[1]),
          bestmove: data.split(' ')[1],
        })
        lines = new Map()
        next()
      }
    }
    worker.postMessage('uci')
  })
  return ready
}

function next() {
  if (running || !worker) return
  const job = queue.shift()
  if (!job) return
  running = job
  worker.postMessage('ucinewgame')
  for (const command of job.commands) worker.postMessage(command)
}

async function search(commands: string[]): Promise<Search> {
  await start()
  return new Promise((resolve, reject) => {
    queue.push({ commands, resolve, reject })
    next()
  })
}

// Starts loading the engine, so it's ready by the time it's needed.
export function warmUp(): void {
  start().catch(() => {})
}

// Resolves once the engine has loaded, or rejects if it can't.
export function whenReady(): Promise<void> {
  return start()
}

// Whether the engine has loaded and can search right away.
export function engineLoaded(): boolean {
  return loaded
}

// Asks the running search to finish now with its best move so far.
export function stopSearch(): void {
  if (running) worker?.postMessage('stop')
}

// Analyses a position, each of `searchmoves` as its own line (or just the
// best line if none are given).
export async function analyse(
  fen: string,
  { depth = 14, searchmoves = [] as string[] } = {},
): Promise<EngineLine[]> {
  const { lines } = await search([
    'setoption name UCI_LimitStrength value false',
    `setoption name MultiPV value ${Math.max(1, searchmoves.length)}`,
    `position fen ${fen}`,
    `go depth ${depth}${searchmoves.length ? ` searchmoves ${searchmoves.join(' ')}` : ''}`,
  ])
  return lines
}

// The best `multipv` lines at a fixed depth (or as deep as it gets in
// `movetime` ms), for the weak bots to choose from.
export async function candidates(
  fen: string,
  {
    depth,
    multipv,
    movetime,
  }: { depth: number; multipv: number; movetime: number },
): Promise<EngineLine[]> {
  const { lines } = await search([
    'setoption name UCI_LimitStrength value false',
    `setoption name MultiPV value ${multipv}`,
    `position fen ${fen}`,
    `go depth ${depth} movetime ${movetime}`,
  ])
  return lines
}

// A move from Stockfish's own strength limit, playing at about `elo`
// (Stockfish 18 accepts 1320 to 3190). Returns a UCI move.
export async function limitedMove(
  fen: string,
  { elo, movetime }: { elo: number; movetime: number },
): Promise<string> {
  const { bestmove } = await search([
    'setoption name UCI_LimitStrength value true',
    `setoption name UCI_Elo value ${elo}`,
    'setoption name MultiPV value 1',
    `position fen ${fen}`,
    `go movetime ${movetime}`,
  ])
  return bestmove
}
