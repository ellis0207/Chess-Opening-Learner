import { deserializeTree, type OpeningTree } from './tree'
import treeUrl from './tree.json?url'

// Fetched as a plain JSON asset rather than bundled as a JS module: it is
// about 1 MB (175 KB gzipped) and JSON.parse is much faster than parsing JS.
export async function loadTree(): Promise<OpeningTree> {
  const res = await fetch(treeUrl)
  if (!res.ok) throw new Error(`Failed to load openings: HTTP ${res.status}`)
  return deserializeTree(await res.json())
}
