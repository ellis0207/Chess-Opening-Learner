import { describe, expect, it } from 'vitest'
import { buildTree, type Edge } from '../openings/tree'
import {
  answer,
  bookMoves,
  isOver,
  isYourTurn,
  pickWeighted,
  reply,
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

describe('a drill as White', () => {
  const drill = startDrill([], 'white', 10)

  it('starts with your move', () => {
    expect(isYourTurn(drill)).toBe(true)
    expect(bookMoves(tree, drill).map((e) => e.san)).toEqual(['e4'])
  })

  it('accepts a book move', () => {
    const next = answer(tree, drill, 'e4')
    expect(next.moves).toEqual(['e4'])
    expect(next.correct).toBe(1)
    expect(next.feedback).toEqual({ kind: 'correct', san: 'e4' })
    expect(isYourTurn(next)).toBe(false)
  })

  it('rejects a non-book move without playing it', () => {
    const next = answer(tree, drill, 'd4')
    expect(next.moves).toEqual([])
    expect(next.mistakes).toBe(1)
    expect(next.feedback).toEqual({ kind: 'wrong', san: 'd4', book: ['e4'] })
    expect(next.missed).toBe(true)
    expect(answer(tree, next, 'e4').missed).toBe(false)
  })

  it('accepts any book move where the tree branches', () => {
    const atMove3 = { ...drill, moves: ['e4', 'e5', 'Nf3', 'Nc6'] }
    expect(answer(tree, atMove3, 'Bc4').correct).toBe(1)
    expect(answer(tree, atMove3, 'Bb5').correct).toBe(1)
  })

  it('ends when the line runs out of theory', () => {
    const end = { ...drill, moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'] }
    expect(isOver(tree, end)).toBe(true)
  })

  it('ends after `depth` of your moves', () => {
    const short = startDrill([], 'white', 2)
    expect(isOver(tree, { ...short, moves: ['e4', 'e5'] })).toBe(false)
    expect(isOver(tree, { ...short, moves: ['e4', 'e5', 'Nf3'] })).toBe(true)
  })
})

describe('a drill as Black', () => {
  it('lets the opponent move first and counts only your moves', () => {
    const drill = reply(tree, startDrill([], 'black', 10), () => 0)
    expect(drill.moves).toEqual(['e4'])
    expect(isYourTurn(drill)).toBe(true)
    expect(yourMoves(drill)).toBe(0)
    expect(yourMoves({ ...drill, moves: ['e4', 'e5', 'Nf3'] })).toBe(1)
  })

  it('can start from a position reached in the explorer', () => {
    const drill = startDrill(['e4', 'e5', 'Nf3'], 'black', 10)
    expect(isYourTurn(drill)).toBe(true)
    expect(bookMoves(tree, drill).map((e) => e.san)).toEqual(['Nc6'])
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
