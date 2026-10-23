import type { Color } from 'chessground/types'
import { useEffect, useState } from 'react'
import type { Line } from './chess/game'
import { loadTree } from './openings/load'
import type { OpeningTree } from './openings/tree'
import { ExploreView } from './views/ExploreView'
import { PracticeView } from './views/PracticeView'
import './App.css'

type Mode =
  { kind: 'explore' } | { kind: 'practice'; start: string[]; side: Color }

function App() {
  const [tree, setTree] = useState<OpeningTree | null>(null)
  const [mode, setMode] = useState<Mode>({ kind: 'explore' })
  // Stepping back keeps the later moves of the line, so you can step forward
  // through them again.
  const [line, setLine] = useState<Line>({ moves: [], ply: 0 })
  const [orientation, setOrientation] = useState<Color>('white')

  useEffect(() => {
    loadTree().then(setTree)
  }, [])

  return (
    <main className="app">
      <header>
        <h1>Chess Opening Learner</h1>
      </header>
      {!tree ? (
        <p className="note">Loading openings…</p>
      ) : mode.kind === 'explore' ? (
        <ExploreView
          tree={tree}
          state={line}
          setState={setLine}
          orientation={orientation}
          setOrientation={setOrientation}
          onPractice={(start, side) =>
            setMode({ kind: 'practice', start, side })
          }
        />
      ) : (
        <PracticeView
          tree={tree}
          start={mode.start}
          initialSide={mode.side}
          onExit={() => setMode({ kind: 'explore' })}
        />
      )}
    </main>
  )
}

export default App
