import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import {
  advance,
  formatLine,
  lastMoveText,
  legalDests,
  movePairs,
  parseMove,
  moveSquares,
  playMove,
  replay,
  seek,
  turnColor,
} from './game'

describe('legalDests', () => {
  it('lists the 20 opening moves from the start position', () => {
    const dests = legalDests(new Chess())
    const total = [...dests.values()].reduce((n, to) => n + to.length, 0)
    expect(total).toBe(20)
    expect(dests.get('e2')).toEqual(['e3', 'e4'])
    expect(dests.get('g1')?.sort()).toEqual(['f3', 'h3'])
  })
})

describe('playMove', () => {
  it('plays a legal move and returns its SAN', () => {
    const chess = new Chess()
    expect(playMove(chess, 'e2', 'e4')).toBe('e4')
    expect(turnColor(chess)).toBe('black')
  })

  it('rejects an illegal move without changing the position', () => {
    const chess = new Chess()
    expect(playMove(chess, 'e2', 'e5')).toBeNull()
    expect(chess.history()).toEqual([])
  })

  it('promotes to a queen', () => {
    const chess = new Chess('8/P7/8/8/8/8/8/k6K w - - 0 1')
    expect(playMove(chess, 'a7', 'a8')).toBe('a8=Q+')
  })
})

describe('movePairs', () => {
  it('numbers moves in white/black pairs', () => {
    expect(movePairs(['e4', 'e5', 'Nf3'])).toEqual([
      [1, 'e4', 'e5'],
      [2, 'Nf3', undefined],
    ])
  })
})

describe('replay', () => {
  it('rebuilds the position from a move list', () => {
    const chess = replay(['e4', 'c5', 'Nf3'])
    expect(chess.history()).toEqual(['e4', 'c5', 'Nf3'])
    expect(chess.fen()).toBe(
      'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
    )
  })
})

describe('moveSquares', () => {
  it('finds the squares of a SAN move without playing it', () => {
    const chess = replay(['e4', 'e5'])
    expect(moveSquares(chess, 'Nf3')).toEqual({ from: 'g1', to: 'f3' })
    expect(chess.history()).toEqual(['e4', 'e5'])
  })

  it('returns null for a move that is not legal', () => {
    expect(moveSquares(replay([]), 'Nf6')).toBeNull()
  })
})

describe('advance', () => {
  it('appends a move at the end of the line', () => {
    expect(advance({ moves: ['e4'], ply: 1 }, 'e5')).toEqual({
      moves: ['e4', 'e5'],
      ply: 2,
    })
  })

  it('steps forward when the move matches the line', () => {
    const line = { moves: ['e4', 'e5', 'Nf3'], ply: 1 }
    expect(advance(line, 'e5')).toEqual({ moves: line.moves, ply: 2 })
  })

  it('replaces the rest of the line with a different move', () => {
    expect(advance({ moves: ['e4', 'e5', 'Nf3'], ply: 1 }, 'c5')).toEqual({
      moves: ['e4', 'c5'],
      ply: 2,
    })
  })
})

describe('seek', () => {
  it('clamps to the ends of the line', () => {
    const moves = ['e4', 'e5']
    expect(seek({ moves, ply: 1 }, -1).ply).toBe(0)
    expect(seek({ moves, ply: 1 }, 5).ply).toBe(2)
    expect(seek({ moves, ply: 1 }, 2).ply).toBe(2)
  })
})

describe('formatLine', () => {
  it('numbers the moves', () => {
    expect(formatLine(['e4', 'e5', 'Nf3'])).toBe('1.e4 e5 2.Nf3')
    expect(formatLine([])).toBe('')
  })
})

describe('parseMove', () => {
  const start = () => replay([])

  it('reads SAN, ignoring case and check marks', () => {
    expect(parseMove(start(), 'Nf3')).toBe('Nf3')
    expect(parseMove(start(), 'nf3')).toBe('Nf3')
    expect(parseMove(start(), ' e4 ')).toBe('e4')
    expect(parseMove(replay(['e4', 'f5', 'Qh5']), 'g6')).toBe('g6')
    expect(parseMove(replay(['f3', 'e5', 'g4']), 'Qh4#')).toBe('Qh4#')
  })

  it('reads coordinates', () => {
    expect(parseMove(start(), 'g1f3')).toBe('Nf3')
    expect(parseMove(start(), 'e2-e4')).toBe('e4')
    const promo = replay([])
    promo.load('8/P7/8/8/8/8/8/k6K w - - 0 1')
    expect(parseMove(promo, 'a7a8')).toBe('a8=Q+')
    expect(parseMove(promo, 'a7a8n')).toBe('a8=N')
  })

  it('reads castling with zeros', () => {
    const chess = replay(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'])
    expect(parseMove(chess, '0-0')).toBe('O-O')
  })

  it('keeps b for pawns apart from B for bishops', () => {
    const chess = replay(['e4', 'e5'])
    expect(parseMove(chess, 'b3')).toBe('b3')
    expect(parseMove(replay(['e4', 'e5', 'b3', 'd6']), 'Bb2')).toBe('Bb2')
  })

  it('rejects illegal or unclear input', () => {
    expect(parseMove(start(), 'e5')).toBeNull()
    expect(parseMove(start(), 'Nd2')).toBeNull()
    expect(parseMove(start(), '')).toBeNull()
    expect(parseMove(start(), 'hello')).toBeNull()
  })
})

describe('lastMoveText', () => {
  it('says who played the last move', () => {
    expect(lastMoveText([])).toBe('Starting position')
    expect(lastMoveText(['e4'])).toBe('White played e4')
    expect(lastMoveText(['e4', 'c5'])).toBe('Black played c5')
  })
})
