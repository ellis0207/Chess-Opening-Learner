import Dexie, { type EntityTable } from 'dexie'
import type { Color } from 'chessground/types'
import { replay } from '../chess/game'
import { epd } from '../openings/tree'
import { schedule, type Schedule } from './srs'

// One position where it is your move, as White or Black, with its review
// schedule. `line` is the first move order that reached it, used to show it.
export type Card = Schedule & {
  id: string
  side: Color
  epd: string
  line: string[]
  lastReviewed: number
}

// A move in one of your repertoires. Where it is your move (`side` to move)
// a position has at most one, your chosen reply; where it is the opponent's
// move there is one per reply you have prepared for. `line` is the move order
// it was added with.
export type RepertoireMove = {
  id: string
  side: Color
  epd: string
  san: string
  line: string[]
  note?: string
}

// Reviews per day, for streaks and accuracy.
export type Activity = {
  date: string // YYYY-MM-DD in local time
  reviews: number
  correct: number
}

class ProgressDB extends Dexie {
  cards!: EntityTable<Card, 'id'>
  activity!: EntityTable<Activity, 'date'>
  repertoire!: EntityTable<RepertoireMove, 'id'>

  constructor() {
    super('chess-opening-learner')
    this.version(1).stores({
      cards: 'id, due, side',
      activity: 'date',
    })
    this.version(2).stores({
      repertoire: 'id, side, [side+epd]',
    })
  }
}

export const db = new ProgressDB()

export function cardId(side: Color, position: string): string {
  return `${side}|${position}`
}

export function localDate(time: number): string {
  const d = new Date(time)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Records one answer at the position reached by `line`, where it is `side`'s
// move. `passed` means a book move on the first try.
export async function recordReview(
  side: Color,
  line: string[],
  passed: boolean,
  now = Date.now(),
): Promise<void> {
  const position = epd(replay(line))
  const id = cardId(side, position)
  const date = localDate(now)
  await db.transaction('rw', db.cards, db.activity, async () => {
    const prev = await db.cards.get(id)
    await db.cards.put({
      ...schedule(prev, passed, now),
      id,
      side,
      epd: position,
      line: prev?.line ?? line,
      lastReviewed: now,
    })
    const day = await db.activity.get(date)
    await db.activity.put({
      date,
      reviews: (day?.reviews ?? 0) + 1,
      correct: (day?.correct ?? 0) + (passed ? 1 : 0),
    })
  })
}

export type Backup = {
  app: 'chess-opening-learner'
  version: 2
  exportedAt: string
  cards: Card[]
  activity: Activity[]
  repertoire: RepertoireMove[] // added in version 2
}

export async function exportProgress(): Promise<Backup> {
  return {
    app: 'chess-opening-learner',
    version: 2,
    exportedAt: new Date().toISOString(),
    cards: await db.cards.toArray(),
    activity: await db.activity.toArray(),
    repertoire: await db.repertoire.toArray(),
  }
}

// Replaces all progress and repertoires with a backup made by exportProgress.
export async function importProgress(data: unknown): Promise<void> {
  const backup = data as Partial<Backup>
  if (
    backup?.app !== 'chess-opening-learner' ||
    !Array.isArray(backup.cards) ||
    !Array.isArray(backup.activity)
  ) {
    throw new Error('This file is not a Chess Opening Learner backup.')
  }
  await db.transaction('rw', db.cards, db.activity, db.repertoire, async () => {
    await db.cards.clear()
    await db.activity.clear()
    await db.repertoire.clear()
    await db.cards.bulkPut(backup.cards!)
    await db.activity.bulkPut(backup.activity!)
    await db.repertoire.bulkPut(backup.repertoire ?? [])
  })
}

export async function resetProgress(): Promise<void> {
  await db.transaction('rw', db.cards, db.activity, async () => {
    await db.cards.clear()
    await db.activity.clear()
  })
}
