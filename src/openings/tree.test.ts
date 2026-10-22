import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import {
  START,
  buildTree,
  continuations,
  deserializeTree,
  epd,
  openingFor,
  serializeTree,
  variationLabel,
  type Opening,
  type SerializedTree,
} from './tree'
import data from './tree.json'

const opening = (eco: string, name: string, moves: string) => ({
  eco,
  name,
  moves: moves.split(' '),
})

const sicilian = opening('B20', 'Sicilian Defense', 'e4 c5')
const najdorf = opening(
  'B90',
  'Sicilian Defense: Najdorf Variation',
  'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6',
)
const kingsPawn = opening('B00', "King's Pawn Game", 'e4')
const queensPawn = opening('A40', "Queen's Pawn Game", 'd4')

// Positions reached after each move of a SAN line, starting position first.
function positions(moves: string) {
  const chess = new Chess()
  return [START, ...moves.split(' ').map((m) => (chess.move(m), epd(chess)))]
}

describe('buildTree', () => {
  const tree = buildTree([najdorf, sicilian, kingsPawn, queensPawn])

  it('names the final position of each line', () => {
    const [, e4, c5] = positions('e4 c5')
    expect(tree.get(e4)?.opening).toBe(kingsPawn)
    expect(tree.get(c5)?.opening).toBe(sicilian)
  })

  it('counts lines through each move and keeps the shortest', () => {
    const e4 = tree.get(START)?.edges.get('e4')
    expect(e4?.lines).toBe(3)
    expect(e4?.line).toBe(kingsPawn)
  })

  it('merges transpositions into one position', () => {
    const tree = buildTree([
      opening('D06', 'A', 'd4 d5 c4'),
      opening('A13', 'B', 'c4 d5 d4'),
    ])
    const a = positions('d4 d5 c4').at(-1)!
    expect(a).toBe(positions('c4 d5 d4').at(-1))
    expect(tree.get(a)?.opening?.name).toBe('A')
  })
})

describe('openingFor', () => {
  const tree = buildTree([najdorf, sicilian, kingsPawn])

  it('uses the latest named position', () => {
    expect(openingFor(tree, positions('e4 c5'))).toBe(sicilian)
  })

  it('keeps the last name once the game leaves book', () => {
    expect(openingFor(tree, positions('e4 c5 a3'))).toBe(sicilian)
  })

  it('is undefined at the start', () => {
    expect(openingFor(tree, [START])).toBeUndefined()
  })
})

describe('continuations', () => {
  it('sorts book moves by how many lines use them', () => {
    const tree = buildTree([najdorf, sicilian, kingsPawn, queensPawn])
    expect(continuations(tree, START).map((e) => e.san)).toEqual(['e4', 'd4'])
  })

  it('is empty out of book', () => {
    expect(continuations(buildTree([]), START)).toEqual([])
  })
})

describe('serializeTree', () => {
  it('round-trips through deserializeTree', () => {
    const tree = buildTree([najdorf, sicilian, kingsPawn, queensPawn])
    const copy = deserializeTree(
      JSON.parse(JSON.stringify(serializeTree(tree))),
    )
    expect(copy).toEqual(tree)
  })
})

describe('tree.json', () => {
  it('holds the full dataset', () => {
    const tree = deserializeTree(data as SerializedTree)
    const najdorfEnd = positions(najdorf.moves.join(' ')).at(-1)!
    const named: Opening | undefined = tree.get(najdorfEnd)?.opening
    expect(named?.name).toBe('Sicilian Defense: Najdorf Variation')
    expect(continuations(tree, START).length).toBe(20)
  })
})

describe('variationLabel', () => {
  const sub = (name: string) => ({ eco: 'B90', name, moves: [] })

  it('drops the name of the opening already on the board', () => {
    expect(
      variationLabel(sub('Sicilian Defense: Najdorf Variation'), sicilian),
    ).toBe('Najdorf Variation')
    expect(
      variationLabel(
        sub('Sicilian Defense: Najdorf Variation, English Attack'),
        sub('Sicilian Defense: Najdorf Variation'),
      ),
    ).toBe('English Attack')
  })

  it('says when a move continues the same named opening', () => {
    expect(variationLabel(sicilian, sicilian)).toBe('Continues this line')
  })

  it('keeps the full name for other openings or no context', () => {
    expect(variationLabel(sicilian, kingsPawn)).toBe('Sicilian Defense')
    expect(variationLabel(sicilian)).toBe('Sicilian Defense')
  })
})
