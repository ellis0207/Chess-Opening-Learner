import type { Color } from 'chessground/types'
import { Chess } from 'chess.js'
import { epd } from '../openings/tree'
import { db, type RepertoireMove } from '../progress/db'
import { parsePgn, writePgn, type PgnNode } from './pgn'

export function moveId(side: Color, position: string, san: string): string {
  return `${side}|${position}|${san}`
}

function sideToMove(chess: Chess): Color {
  return chess.turn() === 'w' ? 'white' : 'black'
}

// The repertoire moves for one line: each move along it, from the position
// before it. Your moves replace any other move you had in that position.
function movesForLine(side: Color, line: string[]): RepertoireMove[] {
  const chess = new Chess()
  return line.map((san, i) => {
    const position = epd(chess)
    chess.move(san)
    return {
      id: moveId(side, position, san),
      side,
      epd: position,
      san,
      line: line.slice(0, i),
    }
  })
}

async function putMoves(side: Color, moves: RepertoireMove[]): Promise<void> {
  await db.transaction('rw', db.repertoire, async () => {
    for (const move of moves) {
      const existing = await db.repertoire
        .where('[side+epd]')
        .equals([side, move.epd])
        .toArray()
      if (existing.some((m) => m.id === move.id)) continue
      const yours = new Chess(move.epd + ' 0 1').turn() === side[0]
      if (yours) await db.repertoire.bulkDelete(existing.map((m) => m.id))
      await db.repertoire.put(move)
    }
  })
}

// Adds a line to your repertoire as `side`.
export async function addLine(side: Color, line: string[]): Promise<void> {
  await putMoves(side, movesForLine(side, line))
}

// Removes a move and every move that was added after it along its line.
export async function removeMove(move: RepertoireMove): Promise<void> {
  const prefix = [...move.line, move.san]
  await db.transaction('rw', db.repertoire, async () => {
    const all = await db.repertoire.where('side').equals(move.side).toArray()
    const below = all.filter((m) =>
      prefix.every((san, i) => [...m.line, m.san][i] === san),
    )
    await db.repertoire.bulkDelete(below.map((m) => m.id))
  })
}

export async function setNote(id: string, note: string): Promise<void> {
  await db.repertoire.update(id, { note: note.trim() || undefined })
}

export async function clearRepertoire(side: Color): Promise<void> {
  await db.repertoire.where('side').equals(side).delete()
}

export type ImportResult = { moves: number; skipped: number }

// Imports every line of a PGN, variations included. Where the PGN has more
// than one move for your side in a position, the first (main line) is kept.
export async function importPgn(
  side: Color,
  text: string,
): Promise<ImportResult> {
  const moves: RepertoireMove[] = []
  let skipped = 0
  const walk = (nodes: PgnNode[], chess: Chess, line: string[]) => {
    const position = epd(chess)
    const yours = sideToMove(chess) === side
    nodes.forEach((node, i) => {
      if (yours && i > 0) {
        skipped++
        return
      }
      moves.push({
        id: moveId(side, position, node.san),
        side,
        epd: position,
        san: node.san,
        line,
        note: node.comment,
      })
      const next = new Chess(chess.fen())
      next.move(node.san)
      walk(node.children, next, [...line, node.san])
    })
  }
  walk(parsePgn(text), new Chess(), [])
  await putMoves(side, moves)
  return { moves: moves.length, skipped }
}

// Your repertoire as `side`, as PGN with variations and notes as comments.
export function exportPgn(side: Color, moves: RepertoireMove[]): string {
  const byPosition = new Map<string, RepertoireMove[]>()
  for (const m of moves.filter((m) => m.side === side)) {
    byPosition.set(m.epd, [...(byPosition.get(m.epd) ?? []), m])
  }
  // Each position is written out once, so transpositions don't repeat.
  const seen = new Set<string>()
  const build = (chess: Chess): PgnNode[] => {
    const position = epd(chess)
    if (seen.has(position)) return []
    seen.add(position)
    return (byPosition.get(position) ?? []).map((m) => {
      const next = new Chess(chess.fen())
      next.move(m.san)
      return { san: m.san, comment: m.note, children: build(next) }
    })
  }
  const header = `[Event "${side === 'white' ? 'White' : 'Black'} repertoire"]\n\n`
  return header + writePgn(build(new Chess())) + '\n'
}

// Your repertoire moves by position, for practice and reviews.
export type RepertoireIndex = Map<string, RepertoireMove[]>

export function indexRepertoire(
  side: Color,
  moves: RepertoireMove[],
): RepertoireIndex {
  const index: RepertoireIndex = new Map()
  for (const m of moves) {
    if (m.side === side) index.set(m.epd, [...(index.get(m.epd) ?? []), m])
  }
  return index
}
