import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { describeMove, explainWrong, toUci } from './explain'

const position = (line: string) => {
  const history = line.split(' ')
  const c = new Chess()
  for (const m of history) c.move(m)
  return { history, fen: c.fen(), chess: c }
}

describe('explainWrong', () => {
  it('spots a mate the move allows', () => {
    const { history, fen } = position('e4 e5 Bc4 Nc6 Qh5')
    const e = explainWrong({
      fen,
      history,
      wrong: 'Nf6',
      best: 'g6',
      lines: [
        { score: -99999, mate: -1, pv: ['g8f6', 'h5f7'] },
        { score: 30, pv: ['g7g6', 'h5f3'] },
      ],
    })
    expect(e.verdict).toBe('blunder')
    expect(e.body.join(' ')).toMatch(/checkmate: 3\.\.\.Nf6 4\.Qxf7#/)
    expect(e.body.at(-1)).toBe('Try again.')
  })

  it('names a piece left hanging', () => {
    const { history, fen } = position('e4 e5 Nf3 Nc6 Bc4 Nf6')
    const e = explainWrong({
      fen,
      history,
      wrong: 'Nxe5',
      best: 'Ng5',
      lines: [
        { score: 40, pv: ['f3g5', 'd7d5'] },
        { score: -250, pv: ['f3e5', 'c6e5', 'c4f7', 'e8f7'] },
      ],
    })
    expect(e.title).toMatch(/blunder/)
    expect(e.body[0]).toMatch(/knight on e5.*\.\.\.Nxe5/)
  })

  it('calls a near-equal alternative good', () => {
    const { history, fen } = position('d4 d5')
    const e = explainWrong({
      fen,
      history,
      wrong: 'Nc3',
      best: 'c4',
      bookName: "Queen's Pawn Game: Chigorin Variation",
      lines: [
        { score: 30, pv: [toUci(fen, 'c4')!] },
        { score: 15, pv: [toUci(fen, 'Nc3')!] },
      ],
    })
    expect(e.verdict).toBe('good')
    expect(e.body[0]).toMatch(/Chigorin/)
  })

  it('falls back to opening principles without the engine', () => {
    const { history, fen } = position('e4 e5 f4 exf4')
    const e = explainWrong({ fen, history, wrong: 'Qh5', best: 'Nf3' })
    expect(e.body[0]).toMatch(/queen out this early/)
  })
})

describe('describeMove', () => {
  it('describes castling, recaptures and development', () => {
    expect(
      describeMove(position('e4 e5 Nf3 Nc6 Bc4 Bc5').chess, 'O-O'),
    ).toMatch(/Castling/)
    expect(
      describeMove(position('d4 d5 c4 e6 Nc3 Nf6 cxd5').chess, 'exd5'),
    ).toMatch(/Recaptures/)
    expect(describeMove(position('e4 e5').chess, 'Nf3')).toMatch(
      /attacks the pawn|knight/,
    )
  })
})
