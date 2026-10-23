import { describe, expect, it } from 'vitest'
import { parsePgn, writePgn, type PgnNode } from './pgn'

// Main lines as SAN lists, for compact assertions.
const lines = (nodes: PgnNode[], prefix: string[] = []): string[][] =>
  nodes.flatMap((n) =>
    n.children.length
      ? lines(n.children, [...prefix, n.san])
      : [[...prefix, n.san]],
  )

describe('parsePgn', () => {
  it('reads a game with headers, numbers, NAGs and a result', () => {
    const tree = parsePgn(
      '[Event "?"]\n[White "Me"]\n\n1. e4 e5 2. Nf3!? $1 Nc6 3. Bb5 1-0',
    )
    expect(lines(tree)).toEqual([['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']])
  })

  it('reads variations, including nested ones', () => {
    const tree = parsePgn('1. e4 e5 (1... c5 2. Nf3 (2. c3) d6) 2. Nf3 *')
    expect(lines(tree)).toEqual([
      ['e4', 'e5', 'Nf3'],
      ['e4', 'c5', 'Nf3', 'd6'],
      ['e4', 'c5', 'c3'],
    ])
  })

  it('keeps comments on the move before them', () => {
    const [e4] = parsePgn('1.e4 {Best by test} e5 *')
    expect(e4.comment).toBe('Best by test')
    expect(e4.children[0].comment).toBeUndefined()
  })

  it('merges several games into one tree', () => {
    const tree = parsePgn('1. d4 d5 2. c4 *\n\n1. d4 Nf6 2. c4 *')
    expect(lines(tree)).toEqual([
      ['d4', 'd5', 'c4'],
      ['d4', 'Nf6', 'c4'],
    ])
  })

  it('normalises castling with zeros and long algebraic moves', () => {
    const tree = parsePgn('1. e4 e5 2. Ng1f3 Nc6 3. Bc4 Bc5 4. 0-0 *')
    expect(lines(tree)).toEqual([
      ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O'],
    ])
  })

  it('rejects illegal moves and broken variations', () => {
    expect(() => parsePgn('1. e4 e4')).toThrow(/Illegal move "e4"/)
    expect(() => parsePgn('1. e4 (1. d4')).toThrow(/Unclosed/)
    expect(() => parsePgn('1. e4 ) e5')).toThrow(/Unmatched/)
  })
})

describe('writePgn', () => {
  it('writes main lines, variations and comments', () => {
    const pgn = '1. e4 {King pawn} e5 (1... c5 2. Nf3 (2. c3) 2... d6) 2. Nf3 *'
    expect(writePgn(parsePgn(pgn))).toBe(pgn)
  })

  it('round-trips through parsePgn', () => {
    const pgn = '1. d4 Nf6 2. c4 e6 (2... g6 3. Nc3 Bg7) 3. Nc3 Bb4 *'
    expect(parsePgn(writePgn(parsePgn(pgn)))).toEqual(parsePgn(pgn))
  })

  it('writes an empty tree', () => {
    expect(writePgn([])).toBe('*')
  })
})
