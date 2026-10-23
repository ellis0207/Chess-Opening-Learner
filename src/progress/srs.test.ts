import { describe, expect, it } from 'vitest'
import { DAY, isMastered, schedule } from './srs'

const now = Date.UTC(2026, 0, 1)

describe('schedule', () => {
  it('grows the interval with each pass: 1, 3, then times ease', () => {
    const first = schedule(undefined, true, now)
    expect(first).toMatchObject({ interval: 1, reps: 1, due: now + DAY })
    const second = schedule(first, true, now)
    expect(second.interval).toBe(3)
    const third = schedule(second, true, now)
    expect(third.interval).toBe(Math.round(3 * second.ease))
    expect(third.due).toBe(now + third.interval * DAY)
  })

  it('resets to tomorrow and lowers ease on a miss', () => {
    const learned = schedule(schedule(undefined, true, now), true, now)
    const missed = schedule(learned, false, now)
    expect(missed).toMatchObject({ interval: 1, reps: 0, lapses: 1 })
    expect(missed.ease).toBeCloseTo(learned.ease - 0.2)
    expect(missed.due).toBe(now + DAY)
  })

  it('never lets ease drop below 1.3', () => {
    let s = schedule(undefined, false, now)
    for (let i = 0; i < 20; i++) s = schedule(s, false, now)
    expect(s.ease).toBe(1.3)
  })

  it('counts three weeks or more as mastered', () => {
    let s = schedule(undefined, true, now)
    while (!isMastered(s)) s = schedule(s, true, now)
    expect(s.interval).toBeGreaterThanOrEqual(21)
    expect(s.reps).toBeGreaterThan(2)
  })
})
