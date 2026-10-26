// Grows every lesson in src/lessons/catalog.ts into its variations and writes
// them to src/lessons/data/. The opponent plays every book reply (from the
// Lichess openings dataset in src/openings/tree.json), Stockfish picks your
// move, preferring book moves, and each line is carried on past the end of
// theory to a middlegame position.
//
// Needs a native Stockfish binary (STOCKFISH, default /usr/games/stockfish).
// Usage: npm run build-lessons [lesson ids...]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { availableParallelism } from 'node:os'
import { Chess } from 'chess.js'
import { CATALOG, type LessonSpec } from '../src/lessons/catalog.ts'
import type { LessonData, LessonSummary } from '../src/lessons/types.ts'
import {
  START,
  continuations,
  deserializeTree,
  epd,
  openingFor,
  type SerializedTree,
} from '../src/openings/tree.ts'
import { EnginePool } from './engine.ts'

// Lines end on your move once they are out of book and at least this long,
// or at MAX_PLY even if theory goes on.
const MIN_PLY = 20
const MAX_PLY = 30
const DEPTH = 16
// A book move counts as your best move if it is within this many centipawns
// of Stockfish's choice; a `prefer` move within PREFER_MARGIN.
const BOOK_MARGIN = 40
const PREFER_MARGIN = 60
// Among book moves this close to the best one, the most popular is played.
const TIE_MARGIN = 25

const OUT = new URL('../src/lessons/data/', import.meta.url)

const tree = deserializeTree(
  JSON.parse(
    readFileSync(new URL('../src/openings/tree.json', import.meta.url), 'utf8'),
  ) as SerializedTree,
)
const engine = new EnginePool(
  process.env.STOCKFISH ?? '/usr/games/stockfish',
  availableParallelism(),
)

function replay(moves: string[]): Chess {
  const chess = new Chess()
  for (const san of moves) chess.move(san)
  return chess
}

function uci(chess: Chess, san: string): string {
  const m = chess.moves({ verbose: true }).find((m) => m.san === san)!
  return m.from + m.to + (m.promotion ?? '')
}

function sanOf(chess: Chess, uciMove: string): string {
  return chess.move({
    from: uciMove.slice(0, 2),
    to: uciMove.slice(2, 4),
    promotion: uciMove[4],
  }).san
}

async function chooseYourMove(chess: Chess, spec: LessonSpec): Promise<string> {
  const fen = chess.fen()
  const [best] = await engine.analyse(fen, { depth: DEPTH })
  const bestSan = sanOf(new Chess(fen), best.pv[0])

  const legal = new Set(chess.moves())
  for (const san of spec.prefer ?? []) {
    if (!legal.has(san)) continue
    if (san === bestSan) return san
    const [line] = await engine.analyse(fen, {
      depth: DEPTH,
      searchmoves: [uci(chess, san)],
    })
    if (line.score >= best.score - PREFER_MARGIN) return san
  }

  const book = continuations(tree, epd(chess))
  if (!book.length) return bestSan
  const lines = await engine.analyse(fen, {
    depth: DEPTH,
    multipv: Math.min(book.length, 8),
    searchmoves: book.map((e) => uci(chess, e.san)),
  })
  const scores = new Map(
    lines.map((l) => [sanOf(new Chess(fen), l.pv[0]), l.score]),
  )
  const top = Math.max(...scores.values())
  if (top < best.score - BOOK_MARGIN) return bestSan
  // Most popular among the near-best book moves. `book` is sorted by
  // popularity already.
  return book.find((e) => (scores.get(e.san) ?? -Infinity) >= top - TIE_MARGIN)!
    .san
}

// The opponent's good moves by Stockfish: the best, plus up to two more
// within `margin` centipawns of it.
async function opponentMoves(chess: Chess, margin: number): Promise<string[]> {
  const fen = chess.fen()
  const lines = await engine.analyse(fen, { depth: DEPTH, multipv: 3 })
  const best = lines[0].score
  return lines
    .filter((l, i) => i === 0 || l.score >= best - margin)
    .map((l) => sanOf(new Chess(fen), l.pv[0]))
}

// How far Stockfish adds opponent moves where the book offers fewer than
// two. Lessons with few book lines are grown again with wider settings until
// they have MIN_VARIATIONS.
// `branches` caps how many times one line may fork on engine moves.
const WIDTHS = [
  { ply: 0, margin: 0, branches: 0 },
  { ply: 14, margin: 40, branches: 1 },
  { ply: 18, margin: 60, branches: 2 },
  { ply: 18, margin: 80, branches: 3 },
]
const MIN_VARIATIONS = 20

async function grow(
  spec: LessonSpec,
  width: (typeof WIDTHS)[number],
): Promise<string[][]> {
  const root = spec.moves.split(' ')
  const you = spec.side[0]
  const excluded = new Set(spec.exclude ?? [])

  const visit = async (moves: string[], forks = 0): Promise<string[][]> => {
    const chess = replay(moves)
    const ply = moves.length
    if (chess.isGameOver()) return [moves]
    if (ply < root.length) return visit([...moves, root[ply]], forks)

    if (chess.turn() === you) {
      return visit([...moves, await chooseYourMove(chess, spec)], forks)
    }
    const book = continuations(tree, epd(chess))
      .map((e) => e.san)
      .filter((san) => !excluded.has([...moves, san].join(' ')))
    if (ply >= MAX_PLY || (!book.length && ply >= MIN_PLY)) return [moves]
    let replies = book
    let fork = 0
    const canFork = ply < width.ply && forks < width.branches
    if (!book.length || (book.length < 2 && canFork)) {
      const engineMoves = await opponentMoves(chess, canFork ? width.margin : 0)
      replies = [...new Set([...book, ...engineMoves])]
      if (replies.length > Math.max(1, book.length)) fork = 1
    }
    const results = await Promise.all(
      replies.map((san) => visit([...moves, san], forks + fork)),
    )
    return results.flat()
  }
  return visit([])
}

// Different move orders often transpose into a position an earlier variation
// already reached. From there the rest of the tree would repeat, so only the
// main continuation is kept: one variation teaches the move order, and the
// lines beyond it are taught once.
function pruneTranspositions(lines: string[][]): string[][] {
  type Node = { children: Map<string, Node>; leaf: boolean }
  const root: Node = { children: new Map(), leaf: false }
  for (const moves of lines) {
    let node = root
    for (const san of moves) {
      let next = node.children.get(san)
      if (!next)
        node.children.set(san, (next = { children: new Map(), leaf: false }))
      node = next
    }
    node.leaf = true
  }

  const seen = new Set<string>()
  const kept: string[][] = []
  const walk = (
    node: Node,
    moves: string[],
    chess: Chess,
    transposed: boolean,
  ) => {
    if (node.leaf || !node.children.size) {
      kept.push(moves)
      return
    }
    // Map order is insertion order, which is the teaching order.
    const children = [...node.children]
    for (const [san, child] of transposed ? children.slice(0, 1) : children) {
      chess.move(san)
      const key = epd(chess)
      const repeat = seen.has(key)
      seen.add(key)
      walk(child, [...moves, san], chess, transposed || repeat)
      chess.undo()
    }
  }
  walk(root, [], new Chess(), false)
  return kept
}

function moveLabel(moves: string[], ply: number): string {
  const n = Math.floor(ply / 2) + 1
  return ply % 2 ? `${n}...${moves[ply]}` : `${n}.${moves[ply]}`
}

function nameVariations(lines: string[][]): [string, string][] {
  const named = lines.map((moves) => {
    const chess = new Chess()
    const positions = [
      START,
      ...moves.map((san) => (chess.move(san), epd(chess))),
    ]
    const o = openingFor(tree, positions)
    return [o?.name ?? 'Unnamed line', o?.eco ?? ''] as [string, string]
  })
  // Lines that share a name get the move where they leave the closest
  // earlier line of that name.
  const byName = new Map<string, number[]>()
  return named.map(([name, eco], i) => {
    const earlier = byName.get(name) ?? []
    byName.set(name, [...earlier, i])
    if (!earlier.length) return [name, eco]
    const b = lines[i]
    let ply = 0
    for (const j of earlier) {
      let p = 0
      while (p < b.length && lines[j][p] === b[p]) p++
      ply = Math.max(ply, p)
    }
    return [`${name} (${moveLabel(b, Math.min(ply, b.length - 1))})`, eco]
  })
}

const only = process.argv.slice(2)
const specs = only.length ? CATALOG.filter((s) => only.includes(s.id)) : CATALOG
mkdirSync(OUT, { recursive: true })

for (const spec of specs) {
  const started = Date.now()
  let lines: string[][] = []
  for (const width of WIDTHS) {
    lines = pruneTranspositions(await grow(spec, width))
    if (lines.length >= MIN_VARIATIONS) break
  }
  const names = nameVariations(lines)
  const data: LessonData = {
    id: spec.id,
    name: spec.name,
    side: spec.side,
    group: spec.group,
    description: spec.description,
    moves: spec.moves,
    variations: lines.map((moves, i) => ({
      name: names[i][0],
      eco: names[i][1],
      moves: moves.join(' '),
    })),
  }
  writeFileSync(
    new URL(`${spec.id}.json`, OUT),
    JSON.stringify(data, null, 0).replace(/\},\{/g, '},\n{') + '\n',
  )
  engine.save()
  console.log(
    `${spec.id}: ${lines.length} variations in ${((Date.now() - started) / 1000).toFixed(0)}s`,
  )
}

// The index lists every lesson in catalog order, built from whatever lesson
// files exist.
const index: LessonSummary[] = []
for (const spec of CATALOG) {
  try {
    const data = JSON.parse(
      readFileSync(new URL(`${spec.id}.json`, OUT), 'utf8'),
    ) as LessonData
    index.push({
      id: data.id,
      name: data.name,
      side: data.side,
      group: data.group,
      description: data.description,
      moves: data.moves,
      variations: data.variations.length,
    })
  } catch {
    // Not built yet.
  }
}
writeFileSync(new URL('index.json', OUT), JSON.stringify(index, null, 1) + '\n')
engine.close()
