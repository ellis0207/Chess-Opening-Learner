// A small pool of native Stockfish processes for build scripts, with results
// cached on disk so re-running a build only analyses new positions.
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

export type Line = {
  // Centipawns for the side to move; mate scores count as ±(100000 - plies).
  score: number
  pv: string[] // UCI moves
}

const CACHE = new URL(
  '../node_modules/.cache/lessons-engine.json',
  import.meta.url,
)

class Engine {
  private proc: ChildProcessWithoutNullStreams
  private buffer = ''
  private listener: ((line: string) => void) | null = null

  constructor(path: string) {
    this.proc = spawn(path)
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
    this.send('setoption name Hash value 64')
    this.send('setoption name Threads value 1')
  }

  send(cmd: string) {
    this.proc.stdin.write(cmd + '\n')
  }

  analyse(
    fen: string,
    depth: number,
    multipv: number,
    searchmoves: string[],
  ): Promise<Line[]> {
    return new Promise((resolve) => {
      const lines = new Map<number, Line>()
      this.listener = (line) => {
        if (line.startsWith('info') && line.includes(' pv ')) {
          const k = Number(/ multipv (\d+)/.exec(line)?.[1] ?? 1)
          const cp = / score cp (-?\d+)/.exec(line)
          const mate = / score mate (-?\d+)/.exec(line)
          const score = cp
            ? Number(cp[1])
            : Math.sign(Number(mate![1])) *
              (100000 - Math.abs(Number(mate![1])))
          const pv = line.split(' pv ')[1].split(' ')
          lines.set(k, { score, pv })
        } else if (line.startsWith('bestmove')) {
          this.listener = null
          resolve(
            [...lines.entries()].sort((a, b) => a[0] - b[0]).map((e) => e[1]),
          )
        }
      }
      this.send('ucinewgame')
      this.send(`setoption name MultiPV value ${multipv}`)
      this.send(`position fen ${fen}`)
      this.send(
        `go depth ${depth}${searchmoves.length ? ` searchmoves ${searchmoves.join(' ')}` : ''}`,
      )
    })
  }

  quit() {
    this.send('quit')
  }
}

export class EnginePool {
  private idle: Engine[] = []
  private waiting: ((e: Engine) => void)[] = []
  private all: Engine[] = []
  private cache: Record<string, Line[]> = {}
  private dirty = 0

  constructor(path: string, size: number) {
    for (let i = 0; i < size; i++) {
      const e = new Engine(path)
      this.all.push(e)
      this.idle.push(e)
    }
    if (existsSync(CACHE)) this.cache = JSON.parse(readFileSync(CACHE, 'utf8'))
  }

  async analyse(
    fen: string,
    { depth = 18, multipv = 1, searchmoves = [] as string[] } = {},
  ): Promise<Line[]> {
    const key = `${fen}|${depth}|${multipv}|${[...searchmoves].sort().join(',')}`
    if (this.cache[key]) return this.cache[key]
    const engine =
      this.idle.pop() ??
      (await new Promise<Engine>((r) => this.waiting.push(r)))
    try {
      const result = await engine.analyse(fen, depth, multipv, searchmoves)
      this.cache[key] = result
      if (++this.dirty % 200 === 0) this.save()
      return result
    } finally {
      const next = this.waiting.shift()
      if (next) next(engine)
      else this.idle.push(engine)
    }
  }

  save() {
    mkdirSync(dirname(CACHE.pathname), { recursive: true })
    writeFileSync(CACHE, JSON.stringify(this.cache))
  }

  close() {
    this.save()
    for (const e of this.all) e.quit()
  }
}
