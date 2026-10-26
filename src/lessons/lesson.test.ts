import { describe, expect, it } from 'vitest'
import {
  branchPly,
  isUnlocked,
  isYourMove,
  mainLineMove,
  moveLabel,
  nextVariation,
  parseLesson,
  variationKey,
} from './lesson'
import { variationNote } from './notes'
import { LESSONS } from './load'

const lesson = parseLesson({
  id: 'qg',
  name: 'Queen’s Gambit',
  side: 'white',
  group: 'g',
  description: '',
  moves: 'd4 d5 c4',
  variations: [
    { name: 'QGD', eco: 'D30', moves: 'd4 d5 c4 e6 Nc3 Nf6' },
    { name: 'QGD 2', eco: 'D30', moves: 'd4 d5 c4 e6 Nc3 Be7' },
    { name: 'Slav', eco: 'D10', moves: 'd4 d5 c4 c6 Nf3 Nf6' },
  ],
})

describe('lessons', () => {
  it('finds the main line move at each point', () => {
    expect(mainLineMove(lesson, 2, 3)).toBe('e6')
    expect(mainLineMove(lesson, 1, 5)).toBe('Nf6')
    expect(mainLineMove(lesson, 2, 4)).toBe('Nf3')
  })

  it('knows where a variation branches off', () => {
    expect(branchPly(lesson, 0)).toBe(-1)
    expect(branchPly(lesson, 1)).toBe(5)
    expect(branchPly(lesson, 2)).toBe(3)
  })

  it('unlocks variations in order', () => {
    const done = new Set([variationKey(lesson, 0)])
    expect(isUnlocked(lesson, 1, done)).toBe(true)
    expect(isUnlocked(lesson, 2, done)).toBe(false)
    expect(nextVariation(lesson, done)).toBe(1)
  })

  it('labels moves and turns', () => {
    expect(moveLabel(['d4', 'd5', 'c4', 'e6'], 3)).toBe('2...e6')
    expect(moveLabel(['d4', 'd5', 'c4'], 2)).toBe('2.c4')
    expect(isYourMove(lesson, 2)).toBe(true)
    expect(isYourMove(lesson, 3)).toBe(false)
  })

  it('has descriptions for the families', () => {
    expect(
      variationNote('Slav Defense: Czech Variation, Wiesbaden Variation'),
    ).toMatch(/a4/)
    expect(variationNote('Unknown Opening')).toBeUndefined()
  })

  it('lists lessons with variations', () => {
    expect(LESSONS.length).toBeGreaterThan(0)
    for (const l of LESSONS) expect(l.variations).toBeGreaterThan(0)
  })
})
