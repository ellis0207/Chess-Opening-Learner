import type { Color, Key } from 'chessground/types'
import type { Config } from 'chessground/config'
import { useMemo, useState } from 'react'
import { Board } from './components/Board'
import {
  legalDests,
  movePairs,
  playMove,
  replay,
  turnColor,
} from './chess/game'
import './App.css'

function App() {
  // The SAN move list is the state; the chess.js game is derived from it.
  const [history, setHistory] = useState<string[]>([])
  const [orientation, setOrientation] = useState<Color>('white')
  const game = useMemo(() => replay(history), [history])

  const config = useMemo<Config>(() => {
    const last = game.history({ verbose: true }).at(-1)
    const onMove = (from: Key, to: Key) => {
      const san = playMove(replay(history), from, to)
      if (san) setHistory([...history, san])
    }
    return {
      fen: game.fen(),
      orientation,
      turnColor: turnColor(game),
      check: game.inCheck(),
      lastMove: last ? [last.from, last.to] : undefined,
      movable: {
        free: false,
        color: 'both',
        dests: legalDests(game),
        events: { after: onMove },
      },
    }
  }, [game, history, orientation])

  const undo = () => setHistory((h) => h.slice(0, -1))
  const reset = () => setHistory([])
  const flip = () => setOrientation((o) => (o === 'white' ? 'black' : 'white'))

  const toMove = game.turn() === 'w' ? 'White' : 'Black'
  const status = game.isCheckmate()
    ? `Checkmate. ${toMove === 'White' ? 'Black' : 'White'} wins.`
    : game.isDraw()
      ? 'Draw.'
      : `${toMove} to move`

  return (
    <main className="app">
      <header>
        <h1>Chess Opening Learner</h1>
      </header>
      <div className="layout">
        <Board config={config} />
        <aside className="panel">
          <p className="status">{status}</p>
          <ol className="moves">
            {movePairs(history).map(([n, white, black]) => (
              <li key={n}>
                <span className="num">{n}.</span>
                <span>{white}</span>
                <span>{black ?? ''}</span>
              </li>
            ))}
          </ol>
          <div className="controls">
            <button type="button" onClick={undo} disabled={!history.length}>
              Undo
            </button>
            <button type="button" onClick={reset} disabled={!history.length}>
              Reset
            </button>
            <button type="button" onClick={flip}>
              Flip board
            </button>
          </div>
        </aside>
      </div>
    </main>
  )
}

export default App
