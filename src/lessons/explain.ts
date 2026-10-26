// Coach messages in the style of Chess.com lessons: why a move is right, why
// a wrong one doesn't work, and what the opponent's move means.
import { Chess, type Move, type PieceSymbol, type Square } from 'chess.js'
import { MATE, type EngineLine } from '../engine/types'

export type Verdict = 'correct' | 'good' | 'inaccuracy' | 'mistake' | 'blunder'

export type Explanation = {
  verdict: Verdict
  title: string
  body: string[]
}

const VALUE: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
}

const NAME: Record<PieceSymbol, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
}

const sideName = (c: 'w' | 'b') => (c === 'w' ? 'White' : 'Black')

// "Nf3" or "...Nf6", depending on who plays it.
function said(san: string, color: 'w' | 'b'): string {
  return color === 'w' ? san : `...${san}`
}

function material(chess: Chess, color: 'w' | 'b'): number {
  let total = 0
  for (const row of chess.board())
    for (const sq of row)
      if (sq) total += (sq.color === color ? 1 : -1) * VALUE[sq.type]
  return total
}

function verboseMove(chess: Chess, san: string): Move | undefined {
  return chess.moves({ verbose: true }).find((m) => m.san === san)
}

function uciOf(m: Move): string {
  return m.from + m.to + (m.promotion ?? '')
}

export function toUci(fen: string, san: string): string | undefined {
  const m = verboseMove(new Chess(fen), san)
  return m && uciOf(m)
}

// Plays up to `plies` moves of an engine line, returning their SAN (cut
// short if the line contains a move that isn't legal).
function playLine(chess: Chess, pv: string[], plies: number): string[] {
  const sans: string[] = []
  for (const u of pv.slice(0, plies)) {
    try {
      sans.push(
        chess.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] })
          .san,
      )
    } catch {
      break
    }
  }
  return sans
}

// "1...Qh4+ 2.g3 Qxe4": SAN moves with numbers, starting at `ply`.
export function lineText(sans: string[], ply: number): string {
  return sans
    .map((san, i) => {
      const p = ply + i
      const n = Math.floor(p / 2) + 1
      if (p % 2 === 0) return `${n}.${san}`
      return i === 0 ? `${n}...${san}` : san
    })
    .join(' ')
}

function amount(pawns: number): string {
  if (pawns >= 8) return 'the queen'
  if (pawns >= 5) return 'a rook'
  if (pawns >= 3) return 'a piece'
  if (pawns >= 2) return 'two pawns'
  return 'a pawn'
}

function scoreText(score: number): string {
  if (Math.abs(score) >= MATE - 1000) return 'a forced mate'
  const pawns = Math.abs(score) / 100
  return `about ${pawns.toFixed(1)} ${pawns === 1 ? 'pawn' : 'pawns'}`
}

const isStart = (piece: PieceSymbol, square: Square, color: 'w' | 'b') => {
  const rank = color === 'w' ? '1' : '8'
  const starts: Partial<Record<PieceSymbol, string[]>> = {
    n: ['b', 'g'],
    b: ['c', 'f'],
    q: ['d'],
    r: ['a', 'h'],
  }
  return starts[piece]?.some((f) => square === `${f}${rank}`) ?? false
}

function undevelopedMinors(chess: Chess, color: 'w' | 'b'): number {
  const rank = color === 'w' ? '1' : '8'
  let n = 0
  for (const f of ['b', 'c', 'f', 'g']) {
    const p = chess.get(`${f}${rank}` as Square)
    if (p && p.color === color && (p.type === 'n' || p.type === 'b')) n++
  }
  return n
}

// Opening principles a move breaks, for when the engine's line alone doesn't
// say much.
function principles(
  before: Chess,
  wrong: Move,
  best: Move,
  ply: number,
): string | undefined {
  const you = wrong.color
  const them = sideName(you === 'w' ? 'b' : 'w')
  const last = before.history({ verbose: true }).at(-1)

  if (best.captured && last?.captured && best.to === last.to && !wrong.captured)
    return `${them} just captured on ${last.to}. You need to take back first, or you simply stay ${amount(VALUE[last.captured])} down.`
  if (best.captured && !wrong.captured)
    return `There is ${best.captured === 'p' ? 'a pawn' : `a ${NAME[best.captured]}`} to take on ${best.to}. Don’t miss the chance to capture.`
  if (
    wrong.piece === 'k' &&
    !wrong.flags.includes('k') &&
    !wrong.flags.includes('q')
  )
    return 'Moving your king gives up the right to castle and leaves it stuck in the center.'
  if (wrong.piece === 'q' && ply < 16 && !wrong.captured)
    return `Bringing the queen out this early lets ${them} develop with gain of time by attacking it.`
  if (wrong.piece === 'n' && (wrong.to[0] === 'a' || wrong.to[0] === 'h'))
    return 'A knight on the rim is dim: on the edge it controls far fewer squares than in the center.'
  if (
    wrong.piece === 'n' &&
    (wrong.to === 'c3' || wrong.to === 'c6') &&
    best.piece === 'p' &&
    best.from[0] === 'c'
  )
    return `This blocks your c-pawn. You want to play ${best.san} first, then develop the knight.`
  if (
    wrong.piece === 'p' &&
    ['d3', 'e3', 'd6', 'e6'].includes(wrong.to) &&
    best.piece === 'b' &&
    ['c1', 'c8', 'f1', 'f8'].includes(best.from)
  )
    return `This shuts in your bishop on ${best.from} before it has come out. Develop it first.`
  if (
    ply < 20 &&
    wrong.piece !== 'p' &&
    wrong.piece !== 'k' &&
    !isStart(wrong.piece, wrong.from, you) &&
    undevelopedMinors(before, you) >= 2 &&
    !wrong.captured
  )
    return 'This moves the same piece again while others are still at home. In the opening, bring out a new piece each move.'
  if (
    wrong.piece === 'p' &&
    ['f', 'g', 'h'].includes(wrong.from[0]) &&
    before.get(you === 'w' ? 'g1' : 'g8')?.type === 'k'
  )
    return 'This loosens the pawns in front of your castled king, which gives your opponent targets to attack.'
  if (
    wrong.piece === 'p' &&
    ['a', 'b', 'g', 'h'].includes(wrong.from[0]) &&
    ply < 16 &&
    best.piece !== 'p'
  )
    return 'A pawn move on the wing does little for development or the center here.'
  if (best.san.startsWith('O-O'))
    return 'Your king is still in the center. Castling now gets it to safety and brings a rook into play.'
  if (best.piece !== 'p' && isStart(best.piece, best.from, you) && ply < 20)
    return `It’s time to develop: ${best.san} brings another piece into the game.`
}

// What a correct move does, in a sentence.
export function describeMove(before: Chess, san: string): string | undefined {
  const m = verboseMove(before, san)
  if (!m) return
  const after = new Chess(before.fen())
  after.move(san)
  const last = before.history({ verbose: true }).at(-1)
  const them = m.color === 'w' ? 'b' : 'w'

  if (after.isCheckmate()) return 'Checkmate!'
  if (m.flags.includes('k') || m.flags.includes('q'))
    return 'Castling tucks the king away and connects the rooks.'
  if (m.captured && last?.captured && last.to === m.to)
    return `Recaptures on ${m.to}, restoring the material balance.`
  if (m.captured) {
    const defended = after.isAttacked(m.to, them)
    return defended
      ? `Takes on ${m.to}, trading the ${NAME[m.piece]} for the ${NAME[m.captured]}.`
      : `Wins the ${NAME[m.captured]} on ${m.to}.`
  }
  if (after.inCheck()) return `A check that gains time for your plan.`
  if (m.piece === 'b' && ['g2', 'b2', 'g7', 'b7'].includes(m.to))
    return 'Fianchettoes the bishop onto the long diagonal.'
  // Attacks a piece. `after` has the opponent to move, so look from a copy
  // with our turn.
  const fen = after.fen().split(' ')
  fen[1] = m.color
  fen[3] = '-'
  let attacked: Move | undefined
  try {
    const ours = new Chess(fen.join(' '))
    attacked = ours
      .moves({ verbose: true, square: m.to })
      .filter((x) => x.captured && x.captured !== 'p')
      .sort((a, b) => VALUE[b.captured!] - VALUE[a.captured!])[0]
  } catch {
    // Not a legal position with our turn (we'd be giving check).
  }
  if (attacked && attacked.captured && attacked.captured !== 'k')
    return `${m.piece === 'p' ? 'Gains time' : 'Develops with a threat'}: the ${NAME[m.piece]} attacks the ${NAME[attacked.captured]} on ${attacked.to}.`
  if (m.piece === 'p' && ['c', 'd', 'e', 'f'].includes(m.from[0])) {
    if (m.flags.includes('b') && ['d', 'e'].includes(m.from[0]))
      return 'Grabs space in the center.'
    return 'Fights for the central squares.'
  }
  if ((m.piece === 'n' || m.piece === 'b') && isStart(m.piece, m.from, m.color))
    return `Develops the ${NAME[m.piece]} to an active square.`
  if (m.piece === 'r' && ['c', 'd', 'e'].includes(m.to[0]))
    return 'Brings the rook to a central file.'
}

// Why `wrong` isn't the move, from the engine's lines for both moves in the
// position before them. With no engine lines, from opening principles only.
export function explainWrong({
  fen,
  history,
  wrong,
  best,
  lines,
  bookName,
}: {
  fen: string
  history: string[] // moves played so far, for move numbers and context
  wrong: string
  best: string
  lines?: EngineLine[]
  bookName?: string // the opening the wrong move is known as, if any
}): Explanation {
  const before = new Chess()
  for (const san of history) before.move(san)
  if (before.fen() !== fen) before.load(fen)
  const ply = history.length
  const wrongMove = verboseMove(before, wrong)!
  const bestMove = verboseMove(before, best)!
  const you = wrongMove.color
  const them = sideName(you === 'w' ? 'b' : 'w')
  const principle = principles(before, wrongMove, bestMove, ply)
  const tryAgain = 'Try again.'

  const wrongLine = lines?.find((l) => l.pv[0] === uciOf(wrongMove))
  const bestLine = lines?.find((l) => l.pv[0] === uciOf(bestMove))
  if (!wrongLine || !bestLine) {
    return {
      verdict: 'mistake',
      title: `${said(wrong, you)} isn’t the move here`,
      body: [
        ...(bookName
          ? [
              `That move is known as the ${bookName}, but it isn’t the line you are learning.`,
            ]
          : []),
        principle ?? 'There is a stronger move in this position.',
        tryAgain,
      ],
    }
  }

  const loss = bestLine.score - wrongLine.score
  const verdict: Verdict =
    wrongLine.mate !== undefined && wrongLine.mate < 0
      ? 'blunder'
      : loss >= 200
        ? 'blunder'
        : loss >= 90
          ? 'mistake'
          : loss >= 35
            ? 'inaccuracy'
            : 'good'
  const title = {
    good: `${said(wrong, you)} is a good move, but not the one we’re looking for`,
    inaccuracy: `${said(wrong, you)} is an inaccuracy`,
    mistake: `${said(wrong, you)} is a mistake`,
    blunder: `${said(wrong, you)} is a blunder`,
    correct: '',
  }[verdict]

  const body: string[] = []
  const replay = new Chess(before.fen())
  const refutation = playLine(replay, wrongLine.pv, 5)
  const reply = refutation[1]

  if (wrongLine.mate !== undefined && wrongLine.mate < 0) {
    const full = playLine(new Chess(before.fen()), wrongLine.pv, 8)
    body.push(
      `It allows checkmate: ${lineText(full, ply)}. Always check what your opponent threatens after your move.`,
    )
  } else if (verdict === 'good') {
    body.push(
      bookName
        ? `${said(wrong, you)} is a real option here: it’s the ${bookName}. But this lesson teaches the main line, so look for a different move.`
        : `The engine likes it almost as much, but it isn’t the main line you are learning. Look for a different move.`,
    )
  } else {
    // Material: compare the engine's line after your move with the line after
    // the right one, a few moves deep.
    // Material: compare where the engine's lines after your move and after
    // the right one settle down.
    const lost =
      verdict === 'inaccuracy'
        ? 0
        : settledMaterial(before, bestLine.pv, you) -
          settledMaterial(before, wrongLine.pv, you)
    const hanging = lost >= 1 && describeHanging(before, wrongMove, wrongLine)
    if (hanging) {
      body.push(hanging)
    } else if (lost >= 1) {
      body.push(
        `After ${lineText(refutation, ply)}, ${them} wins ${amount(lost)}.`,
      )
    } else if (principle) {
      body.push(principle)
      if (reply)
        body.push(
          `${them} answers ${said(reply, you === 'w' ? 'b' : 'w')} and ${loss >= 90 ? 'takes over' : 'is more comfortable'}.`,
        )
    } else if (reply) {
      const after = -wrongLine.score
      body.push(
        `${them} answers ${said(reply, you === 'w' ? 'b' : 'w')}${
          after > 30
            ? `, and ${them} is better by ${scoreText(after)}.`
            : `. Compared with the best move, you give up ${scoreText(loss)} of advantage.`
        }`,
      )
    }
    if (bookName)
      body.push(`(It’s known as the ${bookName}, but it isn’t the best here.)`)
  }
  body.push(tryAgain)
  return { verdict, title, body }
}

// Your material balance along an engine line, at the last point within the
// first few moves where no capture is pending, so trades in progress don't
// count as wins or losses.
function settledMaterial(before: Chess, pv: string[], you: 'w' | 'b'): number {
  const c = new Chess(before.fen())
  let settled = material(c, you)
  const line = pv.slice(0, 10)
  for (let i = 0; i < line.length; i++) {
    const u = line[i]
    try {
      c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] })
    } catch {
      break
    }
    // Settled if the line stops here or goes on with a quiet move.
    const next = line[i + 1]
    if (!next || !c.get(next.slice(2, 4) as Square)) settled = material(c, you)
  }
  return settled
}

// A piece left where it can be taken: the one you moved, or one the moved
// piece used to defend.
function describeHanging(
  before: Chess,
  wrong: Move,
  line: EngineLine,
): string | undefined {
  const after = new Chess(before.fen())
  after.move(wrong.san)
  const u = line.pv[1]
  if (!u) return
  const target = u.slice(2, 4) as Square
  const victim = after.get(target)
  if (!victim || victim.color !== wrong.color) return
  const them = sideName(wrong.color === 'w' ? 'b' : 'w')
  let replySan = ''
  try {
    replySan = new Chess(after.fen()).move({
      from: u.slice(0, 2),
      to: target,
      promotion: u[4],
    }).san
  } catch {
    return
  }
  const reply = said(replySan, wrong.color === 'w' ? 'b' : 'w')
  if (target === wrong.to)
    return `This puts your ${NAME[victim.type]} on ${target}, where ${them} can take it with ${reply}.`
  const wasDefended = before.isAttacked(target, wrong.color)
  const isDefended = after.isAttacked(target, wrong.color)
  if (wasDefended && !isDefended)
    return `Your ${NAME[wrong.piece]} was defending the ${NAME[victim.type]} on ${target}. Now ${them} can take it with ${reply}.`
  return `This leaves your ${NAME[victim.type]} on ${target} hanging: ${them} takes it with ${reply}.`
}
