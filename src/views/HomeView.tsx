import { useMemo, useState } from 'react'
import { MiniBoard } from '../components/MiniBoard'
import { GROUPS } from '../lessons/catalog'
import { LESSONS } from '../lessons/load'
import { db } from '../progress/db'
import { useLive } from '../progress/useLive'

export type Destination =
  'explore' | 'practice' | 'repertoire' | 'review' | 'progress'

type Side = 'all' | 'white' | 'black'

const loadDone = () => db.lessons.toArray()

type HomeViewProps = {
  due: number
  onLesson: (id: string) => void
  onOpen: (kind: Destination) => void
}

// The menu: every opening lesson as a card, with search and filters, and
// the rest of the app in the top bar.
export function HomeView({ due, onLesson, onOpen }: HomeViewProps) {
  const done = useLive(loadDone)
  const [query, setQuery] = useState('')
  const [side, setSide] = useState<Side>('all')
  const [group, setGroup] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)

  const learned = useMemo(() => {
    const counts = new Map<string, number>()
    for (const d of done ?? [])
      counts.set(d.lesson, (counts.get(d.lesson) ?? 0) + 1)
    return counts
  }, [done])
  const totalLines = LESSONS.reduce((n, l) => n + l.variations, 0)
  const totalLearned = done?.length ?? 0

  const q = query.trim().toLowerCase()
  const shown = LESSONS.filter(
    (l) =>
      (side === 'all' || l.side === side) &&
      (group === 'all' || l.group === group) &&
      (!q ||
        l.name.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q)),
  )

  const links: { kind: Destination; label: string }[] = [
    { kind: 'review', label: due ? `Review (${due})` : 'Review' },
    { kind: 'explore', label: 'Explore' },
    { kind: 'practice', label: 'Practice' },
    { kind: 'repertoire', label: 'Repertoire' },
    { kind: 'progress', label: 'Progress' },
  ]

  return (
    <section className="menu">
      <div className="menu-bar">
        <div className="menu-tools">
          <button
            type="button"
            className="pill"
            aria-expanded={showFilters}
            onClick={() => setShowFilters((s) => !s)}
          >
            <span aria-hidden>☰</span> Filters
          </button>
          <input
            type="search"
            className="pill search"
            placeholder="Search openings…"
            aria-label="Search openings"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="menu-tools">
          <span className="pill counter">
            <span aria-hidden>♞</span> {totalLearned}/{totalLines} lines learned
          </span>
          {links.map((l) => (
            <button
              key={l.kind}
              type="button"
              className="pill"
              onClick={() => onOpen(l.kind)}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {showFilters && (
        <div className="filters">
          <div role="group" aria-label="Side">
            {(['all', 'white', 'black'] as const).map((s) => (
              <button
                key={s}
                type="button"
                className="chip"
                aria-pressed={side === s}
                onClick={() => setSide(s)}
              >
                {s === 'all'
                  ? 'Both sides'
                  : `As ${s === 'white' ? 'White' : 'Black'}`}
              </button>
            ))}
          </div>
          <div role="group" aria-label="Opening type">
            {['all', ...GROUPS].map((g) => (
              <button
                key={g}
                type="button"
                className="chip"
                aria-pressed={group === g}
                onClick={() => setGroup(g)}
              >
                {g === 'all' ? 'All openings' : g}
              </button>
            ))}
          </div>
        </div>
      )}

      <ul className="course-grid">
        {shown.map((l) => {
          const n = learned.get(l.id) ?? 0
          return (
            <li key={l.id}>
              <button
                type="button"
                className="course"
                onClick={() => onLesson(l.id)}
              >
                <MiniBoard moves={l.moves.split(' ')} orientation={l.side} />
                <span className="course-body">
                  <span className="course-title">{l.name}</span>
                  <span className="course-desc">{l.description}</span>
                  <span className="course-side">
                    <span className={`side-dot ${l.side}`} aria-hidden /> You
                    play {l.side === 'white' ? 'White' : 'Black'}
                  </span>
                  <span className="course-count">
                    {n
                      ? `${n} of ${l.variations} learned`
                      : `${l.variations} lines total`}
                  </span>
                  <span className="meter" aria-hidden>
                    <span style={{ width: `${(100 * n) / l.variations}%` }} />
                  </span>
                  <span className="course-start">
                    {n ? 'Continue' : 'Start learning'} →
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {!shown.length && (
        <p className="note">No opening matches these filters.</p>
      )}
    </section>
  )
}
