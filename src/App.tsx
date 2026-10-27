import type { Color } from 'chessground/types'
import { useEffect, useState } from 'react'
import type { Line } from './chess/game'
import { loadTree } from './openings/load'
import type { OpeningTree } from './openings/tree'
import { db } from './progress/db'
import { useLive } from './progress/useLive'
import { ExploreView } from './views/ExploreView'
import { HomeView } from './views/HomeView'
import { LessonView } from './views/LessonView'
import { PlayView } from './views/PlayView'
import { PracticeView, type Source } from './views/PracticeView'
import { RepertoireView } from './views/RepertoireView'
import { ProgressView } from './views/ProgressView'
import { ReviewView } from './views/ReviewView'
import './App.css'

type Mode =
  | { kind: 'home' }
  | { kind: 'lesson'; id: string }
  | { kind: 'explore' }
  | { kind: 'practice'; start: string[]; side: Color; source: Source }
  | { kind: 'repertoire' }
  | { kind: 'review' }
  | { kind: 'progress' }
  // A game vs the bot, and where to go back to afterwards.
  | { kind: 'play'; start: string[]; side: Color; back: Mode }

const countDue = () => db.cards.where('due').belowOrEqual(Date.now()).count()

function App() {
  const [tree, setTree] = useState<OpeningTree | null>(null)
  const [mode, setMode] = useState<Mode>({ kind: 'home' })
  // Stepping back keeps the later moves of the line, so you can step forward
  // through them again.
  const [line, setLine] = useState<Line>({ moves: [], ply: 0 })
  const [orientation, setOrientation] = useState<Color>('white')
  const due = useLive(countDue) ?? 0

  useEffect(() => {
    loadTree().then(setTree)
  }, [])

  const practice = (start: string[], side: Color, source: Source = 'book') =>
    setMode({ kind: 'practice', start, side, source })

  const home = () => setMode({ kind: 'home' })

  const playFrom = (start: string[], side: Color) =>
    setMode({ kind: 'play', start, side, back: mode })

  return (
    <main className="app">
      <header>
        <h1>
          <button type="button" className="title-link" onClick={home}>
            Chess Opening Learner
          </button>
        </h1>
        {mode.kind !== 'home' && (
          <button type="button" onClick={home}>
            ← Menu
          </button>
        )}
      </header>
      {mode.kind === 'home' ? (
        <HomeView
          due={due}
          onLesson={(id) => setMode({ kind: 'lesson', id })}
          onOpen={(kind) =>
            kind === 'practice'
              ? practice([], 'white')
              : kind === 'play'
                ? playFrom([], 'white')
                : setMode({ kind } as Mode)
          }
        />
      ) : !tree ? (
        <p className="note">Loading openings…</p>
      ) : mode.kind === 'lesson' ? (
        <LessonView
          key={mode.id}
          id={mode.id}
          tree={tree}
          onExit={home}
          onMenu={home}
          onOpenLesson={(id) => setMode({ kind: 'lesson', id })}
          onPlay={playFrom}
        />
      ) : mode.kind === 'explore' ? (
        <ExploreView
          tree={tree}
          state={line}
          setState={setLine}
          orientation={orientation}
          setOrientation={setOrientation}
          onPractice={practice}
          onPlay={playFrom}
        />
      ) : mode.kind === 'play' ? (
        <PlayView
          key={`${mode.side} ${mode.start.join(' ')}`}
          tree={tree}
          start={mode.start}
          initialSide={mode.side}
          backLabel={backLabel(mode.back)}
          onBack={() => setMode(mode.back)}
        />
      ) : mode.kind === 'practice' ? (
        <PracticeView
          // A new drill each time practice starts from somewhere else.
          key={`${mode.side} ${mode.source} ${mode.start.join(' ')}`}
          tree={tree}
          start={mode.start}
          initialSide={mode.side}
          initialSource={mode.source}
          onExit={() => setMode({ kind: 'explore' })}
          onPlay={playFrom}
        />
      ) : mode.kind === 'repertoire' ? (
        <RepertoireView
          onPractice={(side) => practice([], side, 'repertoire')}
          onExplore={() => setMode({ kind: 'explore' })}
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

function backLabel(mode: Mode): string {
  return {
    home: 'Menu',
    lesson: 'Back to lesson',
    explore: 'Back to explorer',
    practice: 'Back to practice',
    play: 'Back',
    repertoire: 'Back to repertoire',
    review: 'Back to review',
    progress: 'Back to progress',
  }[mode.kind]
}

export default App
