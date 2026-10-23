// Spaced repetition with the SM-2 algorithm (as used by SuperMemo and Anki),
// simplified to pass/fail: a position you answer correctly on the first try
// comes back after a growing interval; a miss brings it back tomorrow.

export type Schedule = {
  interval: number // days until the next review
  ease: number // interval multiplier, adjusted by how reviews go
  reps: number // consecutive successful reviews
  lapses: number // total misses
  due: number // timestamp (ms) of the next review
}

export const DAY = 24 * 60 * 60 * 1000
const MIN_EASE = 1.3
const START_EASE = 2.5

export function schedule(
  prev: Schedule | undefined,
  passed: boolean,
  now: number,
): Schedule {
  const s = prev ?? {
    interval: 0,
    ease: START_EASE,
    reps: 0,
    lapses: 0,
    due: now,
  }
  if (!passed) {
    return {
      interval: 1,
      ease: Math.max(MIN_EASE, s.ease - 0.2),
      reps: 0,
      lapses: s.lapses + 1,
      due: now + DAY,
    }
  }
  const reps = s.reps + 1
  const interval =
    reps === 1 ? 1 : reps === 2 ? 3 : Math.round(s.interval * s.ease)
  return {
    interval,
    ease: s.ease + 0.1,
    reps,
    lapses: s.lapses,
    due: now + interval * DAY,
  }
}

// A position counts as mastered once its review interval reaches three weeks.
export const MASTERED_DAYS = 21

export function isMastered(s: Schedule): boolean {
  return s.interval >= MASTERED_DAYS
}
