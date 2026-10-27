import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import {
  ELO_LEVELS,
  clampElo,
  gameResult,
  legalUci,
  pickWeakMove,
  quickMove,
  weakStyle,
} from './bot'

const play = (line: string) => {
  const c = new Chess()
  for (const m of line.split(' ')) c.move(m)
  return c
}

// A repeatable stand-in for Math.random.
function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 2 ** 32
    return seed / 2 ** 32
  }
}

describe('Elo levels', () => {
  it('go from 300 to 3100 in steps of 100', () => {
    expect(ELO_LEVELS[0]).toBe(300)
    expect(ELO_LEVELS.at(-1)).toBe(3100)
    expect(ELO_LEVELS).toHaveLength(29)
    expect(ELO_LEVELS).toContain(2000)
  })

  it('round and clamp other values', () => {
    expect(clampElo(1249)).toBe(1200)
    expect(clampElo(50)).toBe(300)
    expect(clampElo(5000)).toBe(3100)
  })
})

describe('weakStyle', () => {
  it('blunders less and searches deeper as Elo rises', () => {
    const weak = weakStyle(300)
    const strong = weakStyle(1300)
    expect(weak.blunder).toBeGreaterThan(strong.blunder)
    expect(weak.temperature).toBeGreaterThan(strong.temperature)
    expect(weak.depth).toBeLessThan(strong.depth)
  })
})

describe('pickWeakMove', () => {
  const lines = [
    { score: 300, pv: ['d1h5'] },
    { score: 0, pv: ['g1f3'] },
    { score: -900, pv: ['f2f3'] },
  ]
  const legal = ['d1h5', 'g1f3', 'f2f3', 'a2a3']

  const tally = (elo: number) => {
    const random = seeded(7)
    const counts = new Map<string, number>()
    for (let i = 0; i < 2000; i++) {
      const m = pickWeakMove(lines, legal, weakStyle(elo), random)
      counts.set(m, (counts.get(m) ?? 0) + 1)
    }
    return counts
  }

  it('mostly plays the best move at 1300', () => {
    const counts = tally(1300)
    expect(counts.get('d1h5')!).toBeGreaterThan(1800)
  })

  it('often plays worse moves at 300', () => {
    const counts = tally(300)
    expect(counts.get('d1h5')!).toBeLessThan(1600)
    expect(counts.get('g1f3')!).toBeGreaterThan(100)
    expect(counts.get('a2a3')!).toBeGreaterThan(50)
  })

  it('falls back to a legal move without engine lines', () => {
    expect(legal).toContain(pickWeakMove([], legal, weakStyle(800)))
  })
})

describe('gameResult', () => {
  it('is null while the game goes on', () => {
    expect(gameResult(play('e4 e5'), 'white')).toBeNull()
  })

  it('reports a checkmate for each side', () => {
    const mated = play('f3 e5 g4 Qh4#')
    expect(gameResult(mated, 'white')).toEqual({
      outcome: 'loss',
      reason: 'by checkmate',
    })
    expect(gameResult(mated, 'black')?.outcome).toBe('win')
  })

  it('reports a stalemate as a draw', () => {
    const c = new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1')
    expect(gameResult(c, 'white')).toEqual({
      outcome: 'draw',
      reason: 'by stalemate',
    })
  })

  it('reports a threefold repetition', () => {
    const c = play('Nf3 Nf6 Ng1 Ng8 Nf3 Nf6 Ng1 Ng8')
    expect(gameResult(c, 'white')?.reason).toBe('by threefold repetition')
  })
})

describe('legalUci', () => {
  it('lists promotions with their piece', () => {
    const c = new Chess('8/P6k/8/8/8/8/8/K7 w - - 0 1')
    expect(legalUci(c)).toContain('a7a8q')
    expect(legalUci(c)).toContain('a7a8n')
  })
})

describe('quickMove', () => {
  it('plays a mate in one', () => {
    const c = play('e4 e5 Bc4 Nc6 Qh5 Nf6')
    expect(quickMove(c)).toBe('Qxf7#')
  })

  it('takes a free piece', () => {
    const c = new Chess('4k3/pp6/8/4b3/8/5N2/PP6/4K3 w - - 0 1')
    expect(quickMove(c)).toBe('Nxe5')
  })

  it("doesn't hang its queen", () => {
    const c = play('e4 e5 Qh5 Nc6')
    for (let i = 0; i < 20; i++) {
      const san = quickMove(c)
      expect(['Qxh7', 'Qh6', 'Qg5', 'Qxe5+']).not.toContain(san)
    }
  })
})
