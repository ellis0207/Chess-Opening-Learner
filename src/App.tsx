import type { Color } from 'chessground/types'
import { useEffect, useState } from 'react'
import type { Line } from './chess/game'
import { loadTree } from './openings/load'
import type { OpeningTree } from './openings/tree'
import { db } from './progress/db'
import { useLive } from './progress/useLive'
import { ExploreView } from './views/ExploreView'
import { PracticeView } from './views/PracticeView'
import { ProgressView } from './views/ProgressView'
import { ReviewView } from './views/ReviewView'
import './App.css'

type Mode =
  | { kind: 'explore' }
  | { kind: 'practice'; start: string[]; side: Color }
  | { kind: 'review' }
  | { kind: 'progress' }

const countDue = () => db.cards.where('due').belowOrEqual(Date.now()).count()

function App() {
  const [tree, setTree] = useState<OpeningTree | null>(null)
  const [mode, setMode] = useState<Mode>({ kind: 'explore' })
  // Stepping back keeps the later moves of the line, so you can step forward
  // through them again.
  const [line, setLine] = useState<Line>({ moves: [], ply: 0 })
  const [orientation, setOrientation] = useState<Color>('white')
  const due = useLive(countDue) ?? 0

  useEffect(() => {
    loadTree().then(setTree)
  }, [])

  const practice = (start: string[], side: Color) =>
    setMode({ kind: 'practice', start, side })

  const tabs = [
    { kind: 'explore', label: 'Explore' },
    { kind: 'review', label: due ? `Review (${due})` : 'Review' },
    { kind: 'progress', label: 'Progress' },
  ] as const
  const active = mode.kind === 'practice' ? 'explore' : mode.kind

  return (
    <main className="app">
      <header>
        <h1>Chess Opening Learner</h1>
        <nav className="tabs">
          {tabs.map((t) => (
            <button
              key={t.kind}
              type="button"
              aria-current={active === t.kind ? 'page' : undefined}
              onClick={() => setMode({ kind: t.kind })}
            >
              {t.label}
            </button>
          ))}
        </nav>
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
          onPractice={practice}
        />
      ) : mode.kind === 'practice' ? (
        <PracticeView
          // A new drill each time practice starts from somewhere else.
          key={`${mode.side} ${mode.start.join(' ')}`}
          tree={tree}
          start={mode.start}
          initialSide={mode.side}
          onExit={() => setMode({ kind: 'explore' })}
        />
      ) : mode.kind === 'review' ? (
        <ReviewView
          tree={tree}
          onExplore={() => setMode({ kind: 'explore' })}
        />
      ) : (
        <ProgressView
          tree={tree}
          onPractice={practice}
          onReview={() => setMode({ kind: 'review' })}
        />
      )}
    </main>
  )
}

export default App
