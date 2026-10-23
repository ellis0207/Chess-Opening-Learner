import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { replay } from '../chess/game'
import { epd } from '../openings/tree'
import { db } from '../progress/db'
import { parsePgn } from './pgn'
import {
  addLine,
  clearRepertoire,
  exportPgn,
  importPgn,
  indexRepertoire,
  removeMove,
  setNote,
} from './store'

const at = (...moves: string[]) => epd(replay(moves))
const sans = async (side: 'white' | 'black', ...moves: string[]) =>
  (
    await db.repertoire
      .where('[side+epd]')
      .equals([side, at(...moves)])
      .toArray()
  )
    .map((m) => m.san)
    .sort()

beforeEach(async () => {
  await clearRepertoire('white')
  await clearRepertoire('black')
})

describe('addLine', () => {
  it('stores every move along the line', async () => {
    await addLine('black', ['e4', 'c5', 'Nf3', 'd6'])
    expect(await db.repertoire.count()).toBe(4)
    expect(await sans('black', 'e4')).toEqual(['c5'])
  })

  it('keeps several opponent moves but one of yours per position', async () => {
    await addLine('black', ['e4', 'c5'])
    await addLine('black', ['d4', 'Nf6'])
    await addLine('black', ['e4', 'e5'])
    expect(await sans('black')).toEqual(['d4', 'e4'])
    expect(await sans('black', 'e4')).toEqual(['e5'])
  })
})

describe('removeMove', () => {
  it('removes the move and the moves after it', async () => {
    await addLine('white', ['e4', 'e5', 'Nf3', 'Nc6'])
    await addLine('white', ['e4', 'c5', 'Nf3'])
    const [e5] = (await db.repertoire.toArray()).filter((m) => m.san === 'e5')
    await removeMove(e5)
    expect(await sans('white', 'e4')).toEqual(['c5'])
    expect(await db.repertoire.count()).toBe(3)
  })
})

describe('importPgn', () => {
  it('imports variations and keeps your main-line move', async () => {
    const result = await importPgn(
      'white',
      '1. e4 {Main} e5 (1... c5 2. Nf3) (1... e6 2. d4) 2. Nf3 (2. Bc4) *',
    )
    expect(result).toEqual({ moves: 7, skipped: 1 })
    expect(await sans('white', 'e4')).toEqual(['c5', 'e5', 'e6'])
    expect(await sans('white', 'e4', 'e5')).toEqual(['Nf3'])
    const [e4] = (await db.repertoire.toArray()).filter((m) => m.san === 'e4')
    expect(e4.note).toBe('Main')
  })
})

describe('exportPgn', () => {
  it('writes the repertoire with notes, and re-imports to the same tree', async () => {
    await addLine('black', ['e4', 'c5', 'Nf3', 'd6'])
    await addLine('black', ['d4', 'Nf6'])
    const [c5] = (await db.repertoire.toArray()).filter((m) => m.san === 'c5')
    await setNote(c5.id, 'Sicilian')
    const pgn = exportPgn('black', await db.repertoire.toArray())
    expect(pgn).toBe(
      '[Event "Black repertoire"]\n\n1. d4 (1. e4 c5 {Sicilian} 2. Nf3 d6) 1... Nf6 *\n',
    )
    expect(parsePgn(pgn)[1].children[0].comment).toBe('Sicilian')
  })
})

describe('indexRepertoire', () => {
  it('groups one side’s moves by position', async () => {
    await addLine('white', ['e4', 'e5'])
    await addLine('black', ['d4'])
    const index = indexRepertoire('white', await db.repertoire.toArray())
    expect([...index.keys()]).toEqual(expect.arrayContaining([at(), at('e4')]))
    expect(index.size).toBe(2)
  })
})
