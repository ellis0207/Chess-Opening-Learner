import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  cardId,
  db,
  exportProgress,
  importProgress,
  recordReview,
  resetProgress,
} from './db'
import { replay } from '../chess/game'
import { epd } from '../openings/tree'
import { DAY } from './srs'

const now = Date.UTC(2026, 0, 1, 12)
const afterE4 = epd(replay(['e4']))

beforeEach(resetProgress)

describe('recordReview', () => {
  it('creates a card for the position and logs the day', async () => {
    await recordReview('black', ['e4'], true, now)
    const c = await db.cards.get(cardId('black', afterE4))
    expect(c).toMatchObject({ side: 'black', line: ['e4'], reps: 1 })
    expect(c?.due).toBe(now + DAY)
    expect(await db.activity.toArray()).toHaveLength(1)
  })

  it('updates the schedule and keeps the first line', async () => {
    const d4c4 = epd(replay(['d4', 'Nf6', 'c4']))
    await recordReview('black', ['d4', 'Nf6', 'c4'], true, now)
    await recordReview('black', ['c4', 'Nf6', 'd4'], false, now)
    const c = await db.cards.get(cardId('black', d4c4))
    expect(c).toMatchObject({ reps: 0, lapses: 1, line: ['d4', 'Nf6', 'c4'] })
    const [day] = await db.activity.toArray()
    expect(day).toMatchObject({ reviews: 2, correct: 1 })
  })
})

describe('backups', () => {
  it('round-trip through export and import', async () => {
    await recordReview('white', [], true, now)
    const backup = JSON.parse(JSON.stringify(await exportProgress()))
    await resetProgress()
    expect(await db.cards.count()).toBe(0)
    await importProgress(backup)
    expect(await db.cards.count()).toBe(1)
    expect(await db.activity.count()).toBe(1)
  })

  it('rejects other files', async () => {
    await expect(importProgress({ hello: 1 })).rejects.toThrow(/not a/)
  })
})

describe('completeVariation', () => {
  it('marks the variation and schedules your moves with their answers', async () => {
    const { completeVariation } = await import('./db')
    await completeVariation(
      'qg|d4 d5 c4',
      'qg',
      'white',
      ['d4', 'd5', 'c4'],
      now,
    )
    expect(await db.lessons.count()).toBe(1)
    const card = await db.cards.get(cardId('white', epd(replay(['d4', 'd5']))))
    expect(card?.moves).toEqual(['c4'])
    expect(await db.cards.count()).toBe(2)
  })
})
