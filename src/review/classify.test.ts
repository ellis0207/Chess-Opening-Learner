import { describe, expect, it } from 'vitest'
import { MATE } from '../engine/types'
import {
  accuracy,
  chancesLost,
  classify,
  evalText,
  whiteChances,
} from './classify'

const cp = (n: number) => ({ cp: n })
const rate = (before: number, after: number, white = true, best = false) =>
  classify({ before: cp(before), after: cp(after), white, best, book: false })

describe('whiteChances', () => {
  it('is even at 0 and sure for a mate', () => {
    expect(whiteChances(cp(0))).toBe(0.5)
    expect(whiteChances({ cp: MATE - 3, mate: 3 })).toBe(1)
    expect(whiteChances({ cp: -MATE, mate: 0 })).toBe(0)
    expect(whiteChances({ cp: 0, mate: 0 })).toBe(0.5)
  })

  it('grows with the score', () => {
    expect(whiteChances(cp(100))).toBeGreaterThan(0.55)
    expect(whiteChances(cp(-100))).toBeLessThan(0.45)
  })
})

describe('classify', () => {
  it('rates the engine’s move as best and book moves as book', () => {
    expect(rate(30, -200, true, true)).toBe('best')
    expect(
      classify({
        before: cp(30),
        after: cp(30),
        white: true,
        best: false,
        book: true,
      }),
    ).toBe('book')
  })

  it('rates other moves by the chances they lose', () => {
    expect(rate(30, 25)).toBe('excellent')
    expect(rate(30, -20)).toBe('good')
    expect(rate(30, -60)).toBe('inaccuracy')
    expect(rate(30, -150)).toBe('mistake')
    expect(rate(30, -400)).toBe('blunder')
  })

  it('rates Black’s moves from Black’s side', () => {
    expect(rate(-30, 400, false)).toBe('blunder')
    expect(rate(-30, -100, false)).toBe('excellent')
  })

  it('forgives losing pawns in a won position', () => {
    expect(rate(900, 700)).toBe('good')
    expect(rate(0, -200)).toBe('mistake')
  })

  it('counts missing a mate as a blunder only when it throws the win away', () => {
    const mate = { cp: MATE - 2, mate: 2 }
    expect(
      classify({
        before: mate,
        after: cp(-50),
        white: true,
        best: false,
        book: false,
      }),
    ).toBe('blunder')
  })
})

describe('accuracy', () => {
  it('is 100 for perfect moves and lower for losses', () => {
    expect(accuracy([0, 0])).toBeCloseTo(100, 0)
    expect(accuracy([0.3])!).toBeLessThan(30)
    expect(accuracy([])).toBeNull()
    expect(chancesLost(cp(0), cp(100), true)).toBe(0)
  })
})

describe('evalText', () => {
  it('shows pawns, mates and results', () => {
    expect(evalText(cp(134))).toBe('+1.3')
    expect(evalText(cp(-40))).toBe('−0.4')
    expect(evalText(cp(3))).toBe('0.0')
    expect(evalText({ cp: MATE - 3, mate: 3 })).toBe('M3')
    expect(evalText({ cp: -(MATE - 2), mate: -2 })).toBe('−M2')
    expect(evalText({ cp: MATE, mate: 0 })).toBe('1-0')
  })
})
