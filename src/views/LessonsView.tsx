import { useMemo, useState } from 'react'
import { formatLine } from '../chess/game'
import { GROUPS } from '../lessons/catalog'
import { LESSONS } from '../lessons/load'
import { db } from '../progress/db'
import { useLive } from '../progress/useLive'

const loadDone = () => db.lessons.toArray()

type LessonsViewProps = {
  onOpen: (id: string) => void
}

// Every opening lesson, grouped, with how many of its variations you have
// learned. All lessons are open from the start.
export function LessonsView({ onOpen }: LessonsViewProps) {
  const done = useLive(loadDone)
  const [query, setQuery] = useState('')

  const learned = useMemo(() => {
    const counts = new Map<string, number>()
    for (const d of done ?? [])
      counts.set(d.lesson, (counts.get(d.lesson) ?? 0) + 1)
    return counts
  }, [done])

  const q = query.trim().toLowerCase()
  const shown = LESSONS.filter(
    (l) =>
      !q ||
      l.name.toLowerCase().includes(q) ||
      l.description.toLowerCase().includes(q),
  )

  return (
    <section className="lessons">
      <div className="lessons-head">
        <h2>Lessons</h2>
        <input
          type="search"
          placeholder="Find an opening"
          aria-label="Find an opening"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {GROUPS.map((group) => {
        const lessons = shown.filter((l) => l.group === group)
        if (!lessons.length) return null
        return (
          <div key={group}>
            <h3>{group}</h3>
            <ul className="lesson-cards">
              {lessons.map((l) => {
                const n = learned.get(l.id) ?? 0
                return (
                  <li key={l.id}>
                    <button
                      type="button"
                      className="lesson-card"
                      onClick={() => onOpen(l.id)}
                    >
                      <span className="lesson-title">
                        <span className={`side-dot ${l.side}`} aria-hidden />
                        {l.name}
                      </span>
                      <span className="lesson-moves">
                        {formatLine(l.moves.split(' '))}
                      </span>
                      <span className="lesson-desc">{l.description}</span>
                      <span className="meter" aria-hidden>
                        <span
                          style={{ width: `${(100 * n) / l.variations}%` }}
                        />
                      </span>
                      <span className="lesson-count">
                        {n} of {l.variations} variations learned · you play{' '}
                        {l.side === 'white' ? 'White' : 'Black'}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
      {!shown.length && <p className="note">No opening matches “{query}”.</p>}
    </section>
  )
}
