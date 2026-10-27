import { describe, expect, it } from 'vitest'
import { replay } from '../chess/game'
import { epd } from '../openings/tree'
import type { Backup, Card, RepertoireMove } from '../progress/db'
import { mergeProgress, type CloudProgress } from './merge'

const empty: Backup = {
  app: 'chess-opening-learner',
  version: 3,
  exportedAt: '',
  cards: [],
  activity: [],
  repertoire: [],
  lessons: [],
}
const cloudEmpty: CloudProgress = { ...empty, resetAt: 0 }

const card = (id: string, lastReviewed: number): Card => ({
  id,
  side: 'white',
  epd: id,
  line: [],
  lastReviewed,
  due: lastReviewed,
  interval: 0,
  ease: 2.5,
  reps: 0,
  lapses: 0,
})

const move = (line: string[], san: string): RepertoireMove => {
  const position = epd(replay(line))
  return {
    id: `white|${position}|${san}`,
    side: 'white',
    epd: position,
    san,
    line,
  }
}

describe('mergeProgress', () => {
  it('keeps the latest review of each card', () => {
    const merged = mergeProgress(
      { ...empty, cards: [card('a', 5), card('b', 1)] },
      { ...cloudEmpty, cards: [card('a', 3), card('b', 2), card('c', 1)] },
    )
    const seen = Object.fromEntries(
      merged.cards.map((c) => [c.id, c.lastReviewed]),
    )
    expect(seen).toEqual({ a: 5, b: 2, c: 1 })
  })

  it('drops what this device learned before the last reset', () => {
    const reset = Date.UTC(2026, 0, 10, 12)
    const merged = mergeProgress(
      {
        ...empty,
        cards: [card('old', reset - 1), card('new', reset + 1)],
        lessons: [{ id: 'l', lesson: 'x', completedAt: reset - 1 }],
        activity: [{ date: '2000-01-01', reviews: 3, correct: 3 }],
      },
      { ...cloudEmpty, resetAt: reset },
    )
    expect(merged.cards.map((c) => c.id)).toEqual(['new'])
    expect(merged.lessons).toEqual([])
    expect(merged.activity).toEqual([])
    expect(merged.resetAt).toBe(reset)
  })

  it('keeps the busier entry for a day', () => {
    const merged = mergeProgress(
      { ...empty, activity: [{ date: '2026-01-01', reviews: 4, correct: 1 }] },
      {
        ...cloudEmpty,
        activity: [{ date: '2026-01-01', reviews: 2, correct: 2 }],
      },
    )
    expect(merged.activity).toEqual([
      { date: '2026-01-01', reviews: 4, correct: 1 },
    ])
  })

  it("combines repertoires, preferring this device's move", () => {
    const merged = mergeProgress(
      { ...empty, repertoire: [move([], 'e4')] },
      {
        ...cloudEmpty,
        repertoire: [move([], 'd4'), move(['e4'], 'c5'), move(['e4'], 'e5')],
      },
    )
    expect(merged.repertoire.map((m) => m.san).sort()).toEqual([
      'c5',
      'e4',
      'e5',
    ])
  })
})
