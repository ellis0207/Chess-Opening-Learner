import { describe, expect, it } from 'vitest'
import { replay } from '../chess/game'
import { buildTree, epd, type Edge } from '../openings/tree'
import {
  answer,
  bookSource,
  bookMoves,
  isOver,
  isYourTurn,
  pickWeighted,
  reply,
  repertoireSource,
  startDrill,
  yourMoves,
} from './drill'

const line = (name: string, moves: string) => ({
  eco: 'X00',
  name,
  moves: moves.split(' '),
})

// 1.e4 e5 2.Nf3 Nc6 3.Bb5 / 3.Bc4, and 1.e4 c5 2.Nf3.
const tree = buildTree([
  line('Ruy Lopez', 'e4 e5 Nf3 Nc6 Bb5'),
  line('Italian Game', 'e4 e5 Nf3 Nc6 Bc4'),
  line('Sicilian Defense', 'e4 c5 Nf3'),
])
const book = bookSource(tree)

describe('a drill as White', () => {
  const drill = startDrill([], 'white', 10)

  it('starts with your move', () => {
    expect(isYourTurn(drill)).toBe(true)
    expect(bookMoves(book, drill).map((e) => e.san)).toEqual(['e4'])
  })

  it('accepts a book move', () => {
    const next = answer(book, drill, 'e4')
    expect(next.moves).toEqual(['e4'])
    expect(next.correct).toBe(1)
    expect(next.feedback).toEqual({ kind: 'correct', san: 'e4' })
    expect(isYourTurn(next)).toBe(false)
  })

  it('rejects a non-book move without playing it', () => {
    const next = answer(book, drill, 'd4')
    expect(next.moves).toEqual([])
    expect(next.mistakes).toBe(1)
    expect(next.feedback).toEqual({ kind: 'wrong', san: 'd4', book: ['e4'] })
    expect(next.missed).toBe(true)
    expect(answer(book, next, 'e4').missed).toBe(false)
  })

  it('accepts any book move where the tree branches', () => {
    const atMove3 = { ...drill, moves: ['e4', 'e5', 'Nf3', 'Nc6'] }
    expect(answer(book, atMove3, 'Bc4').correct).toBe(1)
    expect(answer(book, atMove3, 'Bb5').correct).toBe(1)
  })

  it('ends when the line runs out of theory', () => {
    const end = { ...drill, moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'] }
    expect(isOver(book, end)).toBe(true)
  })

  it('ends after `depth` of your moves', () => {
    const short = startDrill([], 'white', 2)
    expect(isOver(book, { ...short, moves: ['e4', 'e5'] })).toBe(false)
    expect(isOver(book, { ...short, moves: ['e4', 'e5', 'Nf3'] })).toBe(true)
  })
})

describe('a drill as Black', () => {
  it('lets the opponent move first and counts only your moves', () => {
    const drill = reply(book, startDrill([], 'black', 10), () => 0)
    expect(drill.moves).toEqual(['e4'])
    expect(isYourTurn(drill)).toBe(true)
    expect(yourMoves(drill)).toBe(0)
    expect(yourMoves({ ...drill, moves: ['e4', 'e5', 'Nf3'] })).toBe(1)
  })

  it('can start from a position reached in the explorer', () => {
    const drill = startDrill(['e4', 'e5', 'Nf3'], 'black', 10)
    expect(isYourTurn(drill)).toBe(true)
    expect(bookMoves(book, drill).map((e) => e.san)).toEqual(['Nc6'])
  })
})

describe('pickWeighted', () => {
  const edge = (san: string, lines: number) => ({ san, lines }) as Edge
  const edges = [edge('e5', 3), edge('c5', 1)]

  it('picks in proportion to the number of lines', () => {
    expect(pickWeighted(edges, 0)?.san).toBe('e5')
    expect(pickWeighted(edges, 0.74)?.san).toBe('e5')
    expect(pickWeighted(edges, 0.75)?.san).toBe('c5')
    expect(pickWeighted(edges, 0.999)?.san).toBe('c5')
  })

  it('returns nothing when there are no moves', () => {
    expect(pickWeighted([], 0.5)).toBeUndefined()
  })
})

describe('a drill against your repertoire', () => {
  const at = (...moves: string[]) => epd(replay(moves))
  const move = (moves: string[], san: string, note?: string) => ({
    id: san,
    side: 'white' as const,
    epd: at(...moves),
    san,
    line: moves,
    note,
  })
  // You play the Italian, and have prepared for 1...e5 only.
  const source = repertoireSource(
    tree,
    new Map([
      [at(), [move([], 'e4')]],
      [at('e4'), [move(['e4'], 'e5')]],
      [at('e4', 'e5'), [move(['e4', 'e5'], 'Nf3')]],
      [at('e4', 'e5', 'Nf3'), [move(['e4', 'e5', 'Nf3'], 'Nc6')]],
      [
        at('e4', 'e5', 'Nf3', 'Nc6'),
        [move(['e4', 'e5', 'Nf3', 'Nc6'], 'Bc4', 'Aim at f7')],
      ],
    ]),
  )
  const drill = startDrill(['e4', 'e5', 'Nf3', 'Nc6'], 'white', 10)

  it('only accepts your move, and shows its note', () => {
    expect(answer(source, drill, 'Bb5').feedback?.kind).toBe('wrong')
    expect(answer(source, drill, 'Bc4').feedback).toEqual({
      kind: 'correct',
      san: 'Bc4',
      note: 'Aim at f7',
    })
  })

  it('plays only the replies you prepared for', () => {
    const start = startDrill(['e4'], 'white', 10)
    expect(reply(source, start, () => 0.99).moves).toEqual(['e5'])
  })

  it('ends where your repertoire ends', () => {
    expect(isOver(source, { ...drill, moves: ['Bc4'] })).toBe(true)
  })
})
