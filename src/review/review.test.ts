import { describe, expect, it } from 'vitest'
import { buildTree } from '../openings/tree'
import type { PositionReview } from './analyse'
import { reviewMoves } from './review'

const tree = buildTree([
  { eco: 'C20', name: "King's Pawn Game", moves: ['e4', 'e5'] },
])

const at = (cp: number, best?: string): PositionReview => ({
  eval: { cp },
  best,
})

describe('reviewMoves', () => {
  it('rates book moves, best moves and mistakes, naming the best move', () => {
    const moves = ['e4', 'e5', 'Nf3', 'Qh4']
    const positions = [
      at(30, 'e2e4'),
      at(30, 'e7e5'),
      at(30, 'g1f3'),
      at(25, 'b8c6'),
      at(400),
    ]
    const review = reviewMoves(moves, positions, tree)
    expect(review.map((r) => r?.classification)).toEqual([
      'book',
      'book',
      'best',
      'blunder',
    ])
    expect(review[3]?.best).toBe('Nc6')
    expect(review[2]?.best).toBeUndefined()
  })

  it('leaves moves unrated until both positions are reviewed', () => {
    const review = reviewMoves(['d4', 'd5'], [at(20, 'g1f3'), at(20)], tree)
    expect(review[0]?.classification).toBe('excellent')
    expect(review[1]).toBeUndefined()
  })
})
