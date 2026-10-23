import type { Activity, Card } from './db'
import { localDate } from './db'
import { DAY, isMastered } from './srs'

export type Summary = {
  learned: number // positions answered correctly at least once in a row
  mastered: number
  due: number
  reviews: number
  accuracy: number | null // percent of all reviews passed
  streak: number // consecutive days with reviews, ending today or yesterday
  weakest: Card[] // most-missed positions first
}

export function summarize(
  cards: Card[],
  activity: Activity[],
  now: number,
): Summary {
  const reviews = activity.reduce((n, a) => n + a.reviews, 0)
  const correct = activity.reduce((n, a) => n + a.correct, 0)
  return {
    learned: cards.filter((c) => c.reps > 0).length,
    mastered: cards.filter(isMastered).length,
    due: cards.filter((c) => c.due <= now).length,
    reviews,
    accuracy: reviews ? Math.round((100 * correct) / reviews) : null,
    streak: streak(activity, now),
    weakest: cards
      .filter((c) => c.lapses > 0)
      .sort((a, b) => b.lapses - a.lapses || a.reps - b.reps)
      .slice(0, 5),
  }
}

export function streak(activity: Activity[], now: number): number {
  const days = new Set(activity.filter((a) => a.reviews > 0).map((a) => a.date))
  // A streak is still alive if you haven't practiced yet today.
  let day = days.has(localDate(now)) ? now : now - DAY
  let count = 0
  while (days.has(localDate(day))) {
    count++
    day -= DAY
  }
  return count
}
