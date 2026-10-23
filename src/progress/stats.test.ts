import { describe, expect, it } from 'vitest'
import type { Card } from './db'
import { localDate } from './db'
import { DAY } from './srs'
import { streak, summarize } from './stats'

const now = new Date(2026, 4, 10, 12).getTime()
const day = (offset: number, reviews = 1, correct = reviews) => ({
  date: localDate(now - offset * DAY),
  reviews,
  correct,
})

const card = (id: string, fields: Partial<Card>): Card => ({
  id,
  side: 'white',
  epd: id,
  line: [],
  lastReviewed: now,
  interval: 1,
  ease: 2.5,
  reps: 1,
  lapses: 0,
  due: now + DAY,
  ...fields,
})

describe('streak', () => {
  it('counts consecutive days ending today', () => {
    expect(streak([day(0), day(1), day(2), day(4)], now)).toBe(3)
  })

  it('stays alive until the end of today', () => {
    expect(streak([day(1), day(2)], now)).toBe(2)
  })

  it('is zero after a missed day', () => {
    expect(streak([day(2), day(3)], now)).toBe(0)
    expect(streak([], now)).toBe(0)
  })
})

describe('summarize', () => {
  it('counts learned, mastered and due positions', () => {
    const s = summarize(
      [
        card('a', { reps: 0, due: now - 1 }),
        card('b', { reps: 3, interval: 30 }),
        card('c', { due: now }),
      ],
      [day(0, 4, 3)],
      now,
    )
    expect(s).toMatchObject({
      learned: 2,
      mastered: 1,
      due: 2,
      reviews: 4,
      accuracy: 75,
      streak: 1,
    })
  })

  it('lists the most-missed positions first', () => {
    const s = summarize(
      [card('a', { lapses: 1 }), card('b', { lapses: 3 }), card('c', {})],
      [],
      now,
    )
    expect(s.weakest.map((c) => c.id)).toEqual(['b', 'a'])
    expect(s.accuracy).toBeNull()
  })
})
