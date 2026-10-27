// Copies the in-browser Stockfish build into public/engine/, with the
// JavaScript and WebAssembly side by side under their own names. The worker
// finds its .wasm next to its script, so this works whether or not the
// service worker serves the script (which drops the URL's #fragment).
import { copyFileSync, mkdirSync } from 'node:fs'

const from = 'node_modules/stockfish/bin/stockfish-18-lite-single'
const to = 'public/engine/stockfish'

mkdirSync('public/engine', { recursive: true })
for (const ext of ['.js', '.wasm']) copyFileSync(from + ext, to + ext)
