import { Chess } from 'chess.js'

// A move in a PGN game tree. `children[0]` is the main line, the rest are
// variations. Comments are kept with the move they follow.
export type PgnNode = {
  san: string
  comment?: string
  children: PgnNode[]
}

const RESULT = /^(1-0|0-1|1\/2-1\/2|\*)$/
const MOVE_NUMBER = /^\d+\.(\.\.)?$/

function tokenize(text: string): string[] {
  const tokens: string[] = []
  const re =
    /\[[^\]]*\]|\{[^}]*\}|;[^\n]*|\(|\)|\$\d+|\d+\.(?:\.\.)?|[^\s(){};[\]]+/g
  for (const [token] of text.matchAll(re)) {
    if (token.startsWith('[') || token.startsWith(';')) continue // headers
    // "1.e4" arrives as one token; split off the move number.
    const joined = /^(\d+\.(?:\.\.)?)([^.\s]\S*)$/.exec(token)
    if (joined) tokens.push(joined[1], joined[2])
    else tokens.push(token)
  }
  return tokens
}

// Parses PGN movetext, with any number of games, variations and comments, into
// one tree of moves from the starting position. Moves are checked with
// chess.js and normalised to its SAN (so "0-0" becomes "O-O", "Ng1f3" "Nf3").
export function parsePgn(text: string): PgnNode[] {
  const roots: PgnNode[] = []
  const tokens = tokenize(text)
  let i = 0

  // Parses moves until ")" or the end of a game, starting at `fen` and adding
  // them below `siblings` (the list the first move goes into).
  const sequence = (fen: string, siblings: PgnNode[]): void => {
    const chess = new Chess(fen)
    let list = siblings // where the next move goes
    let lastList = siblings // where `last` is, and so its variations
    let last: PgnNode | null = null
    let before = fen // position before `last`, where its variations start
    while (i < tokens.length) {
      const token = tokens[i]
      if (token === ')') return
      i++
      if (token === '(') {
        if (!last) throw new Error('A variation must follow a move.')
        sequence(before, lastList)
        if (tokens[i] !== ')') throw new Error('Unclosed "(" in PGN.')
        i++
      } else if (token.startsWith('{')) {
        const comment = token.slice(1, -1).trim()
        if (last && comment) {
          last.comment = last.comment ? `${last.comment} ${comment}` : comment
        }
      } else if (RESULT.test(token)) {
        if (siblings === roots) return // end of this game
      } else if (MOVE_NUMBER.test(token) || token.startsWith('$')) {
        continue
      } else {
        const raw = token.replace(/[!?]+$/, '').replace(/0/g, 'O')
        before = chess.fen()
        let san: string
        try {
          san = chess.move(raw).san
        } catch {
          throw new Error(`Illegal move "${token}" in PGN.`)
        }
        let node = list.find((n) => n.san === san)
        if (!node) list.push((node = { san, children: [] }))
        last = node
        lastList = list
        list = node.children
      }
    }
  }

  const start = new Chess().fen()
  while (i < tokens.length) {
    const before = i
    sequence(start, roots)
    if (tokens[i] === ')') throw new Error('Unmatched ")" in PGN.')
    if (i === before) i++
  }
  return roots
}

// Writes a move tree as PGN movetext: the first child of each node is the
// main line and the others become (variations).
export function writePgn(roots: PgnNode[]): string {
  const out: string[] = []

  const moveText = (san: string, ply: number, forceNumber: boolean) => {
    const n = Math.floor(ply / 2) + 1
    if (ply % 2 === 0) return `${n}. ${san}`
    return forceNumber ? `${n}... ${san}` : san
  }

  const comment = (node: PgnNode) =>
    node.comment ? ` {${node.comment.replace(/[{}]/g, '')}}` : ''

  const line = (nodes: PgnNode[], ply: number, forceNumber: boolean) => {
    let current = nodes
    let force = forceNumber
    while (current.length) {
      const [main, ...variations] = current
      out.push(moveText(main.san, ply, force) + comment(main))
      for (const v of variations) {
        out.push('(')
        out.push(moveText(v.san, ply, true) + comment(v))
        line(v.children, ply + 1, false)
        out.push(')')
      }
      // After a variation, Black's move needs its number again.
      force = variations.length > 0
      current = main.children
      ply++
    }
  }

  line(roots, 0, false)
  return (out.join(' ').replace(/\( /g, '(').replace(/ \)/g, ')') + ' *').trim()
}
