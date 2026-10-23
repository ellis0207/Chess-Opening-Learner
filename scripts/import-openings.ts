// Downloads the Lichess chess-openings dataset (CC0), builds the opening tree,
// and writes it to src/openings/tree.json for the app to load.
//
// Usage: npm run import-openings
import { writeFile } from 'node:fs/promises'
import { buildTree, serializeTree, type Opening } from '../src/openings/tree.ts'

const BASE =
  'https://raw.githubusercontent.com/lichess-org/chess-openings/master'
const OUT = new URL('../src/openings/tree.json', import.meta.url)

const openings: Opening[] = []
for (const volume of ['a', 'b', 'c', 'd', 'e']) {
  const res = await fetch(`${BASE}/${volume}.tsv`)
  if (!res.ok) throw new Error(`${volume}.tsv: HTTP ${res.status}`)
  const [, ...lines] = (await res.text()).trim().split('\n')
  for (const line of lines) {
    const [eco, name, pgn] = line.split('\t')
    const moves = pgn.split(' ').filter((token) => !/^\d+\.$/.test(token))
    openings.push({ eco, name, moves })
  }
}

const tree = buildTree(openings)
const { openings: rows, positions } = serializeTree(tree)
// One row per line keeps diffs readable when the dataset changes.
const json = [
  '{"openings":[',
  rows.map((r) => JSON.stringify(r)).join(',\n'),
  '],\n"positions":[',
  positions.map((p) => JSON.stringify(p)).join(',\n'),
  ']}\n',
].join('\n')
await writeFile(OUT, json)
console.log(
  `Wrote ${rows.length} openings, ${tree.size} positions to tree.json`,
)
