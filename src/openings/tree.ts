import { Chess } from 'chess.js'

export type Opening = {
  eco: string
  name: string
  moves: string[]
}

// A move out of a position. `line` is the shortest named opening that goes
// through this move, and `lines` counts how many named openings do.
export type Edge = {
  san: string
  to: string
  line: Opening
  lines: number
}

export type TreeNode = {
  opening?: Opening
  edges: Map<string, Edge>
}

// Positions are keyed by EPD (FEN without the move counters), so lines that
// transpose into the same position share a node.
export type OpeningTree = Map<string, TreeNode>

export function epd(chess: Chess): string {
  return chess.fen().split(' ').slice(0, 4).join(' ')
}

export const START = epd(new Chess())

export function buildTree(openings: Opening[]): OpeningTree {
  const tree: OpeningTree = new Map()
  const node = (key: string) => {
    let n = tree.get(key)
    if (!n) tree.set(key, (n = { edges: new Map() }))
    return n
  }

  for (const opening of openings) {
    const chess = new Chess()
    let from = node(START)
    for (const san of opening.moves) {
      const move = chess.move(san)
      const to = epd(chess)
      const edge = from.edges.get(move.san)
      if (!edge) {
        from.edges.set(move.san, { san: move.san, to, line: opening, lines: 1 })
      } else {
        edge.lines++
        if (opening.moves.length < edge.line.moves.length) edge.line = opening
      }
      from = node(to)
    }
    // Several lines can name one position; keep the shortest.
    if (!from.opening || opening.moves.length < from.opening.moves.length) {
      from.opening = opening
    }
  }
  return tree
}

// The opening for a game: the name of the latest named position along it,
// found by walking back from the current position.
export function openingFor(
  tree: OpeningTree,
  positions: string[],
): Opening | undefined {
  for (let i = positions.length - 1; i >= 0; i--) {
    const opening = tree.get(positions[i])?.opening
    if (opening) return opening
  }
}

// Book moves from a position, most-branching first.
export function continuations(tree: OpeningTree, position: string): Edge[] {
  const edges = [...(tree.get(position)?.edges.values() ?? [])]
  return edges.sort((a, b) => b.lines - a.lines || a.san.localeCompare(b.san))
}

// Building the tree replays every line with chess.js, which takes seconds,
// so scripts/import-openings.ts builds it ahead of time and the app ships it
// in this flat form, with positions and openings referenced by index.
export type SerializedTree = {
  openings: [eco: string, name: string, moves: string][]
  positions: [
    epd: string,
    opening: number,
    edges: [san: string, to: number, line: number, lines: number][],
  ][]
}

export function serializeTree(tree: OpeningTree): SerializedTree {
  const openingIds = new Map<Opening, number>()
  const openings: SerializedTree['openings'] = []
  const openingId = (o: Opening) => {
    let id = openingIds.get(o)
    if (id === undefined) {
      openingIds.set(o, (id = openings.length))
      openings.push([o.eco, o.name, o.moves.join(' ')])
    }
    return id
  }
  const positionIds = new Map([...tree.keys()].map((key, i) => [key, i]))

  const positions = [...tree].map(([key, node]) => [
    key,
    node.opening ? openingId(node.opening) : -1,
    [...node.edges.values()].map(
      (e) =>
        [e.san, positionIds.get(e.to)!, openingId(e.line), e.lines] as const,
    ),
  ])
  return { openings, positions } as SerializedTree
}

export function deserializeTree(data: SerializedTree): OpeningTree {
  const openings = data.openings.map(([eco, name, moves]) => ({
    eco,
    name,
    moves: moves.split(' '),
  }))
  const tree: OpeningTree = new Map()
  for (const [key, opening, edges] of data.positions) {
    tree.set(key, {
      opening: opening >= 0 ? openings[opening] : undefined,
      edges: new Map(
        edges.map(([san, to, line, lines]) => [
          san,
          { san, to: data.positions[to][0], line: openings[line], lines },
        ]),
      ),
    })
  }
  return tree
}

// How to label a book move while `current` is the opening on the board:
// the part of the line's name that goes beyond the current one, so
// "Sicilian Defense: Najdorf Variation, English Attack" reads as
// "English Attack" while you are already in the Najdorf.
export function variationLabel(line: Opening, current?: Opening): string {
  if (!current) return line.name
  // The dataset lists some openings under several move orders.
  if (line.name === current.name) return 'Continues this line'
  for (const separator of [': ', ', ']) {
    const prefix = current.name + separator
    if (line.name.startsWith(prefix)) return line.name.slice(prefix.length)
  }
  return line.name
}
