export type Destination =
  'lessons' | 'explore' | 'practice' | 'repertoire' | 'review' | 'progress'

type HomeViewProps = {
  due: number
  lessons: number
  onOpen: (kind: Destination) => void
}

// The menu: where every part of the app starts.
export function HomeView({ due, lessons, onOpen }: HomeViewProps) {
  const items: {
    kind: Destination
    icon: string
    title: string
    text: string
    badge?: string
  }[] = [
    {
      kind: 'lessons',
      icon: '♞',
      title: 'Lessons',
      text: `${lessons} openings, every variation. Learn the lines move by move until you can play them from memory.`,
    },
    {
      kind: 'review',
      icon: '↻',
      title: 'Review',
      text: 'Positions you have learned come back on a spaced-repetition schedule.',
      badge: due ? `${due} due` : undefined,
    },
    {
      kind: 'explore',
      icon: '⌕',
      title: 'Explore',
      text: 'Browse the opening book and see every named line.',
    },
    {
      kind: 'practice',
      icon: '♟',
      title: 'Practice',
      text: 'Drill book moves against random replies from any position.',
    },
    {
      kind: 'repertoire',
      icon: '☰',
      title: 'Repertoire',
      text: 'Build your own lines, import or export PGN.',
    },
    {
      kind: 'progress',
      icon: '▤',
      title: 'Progress',
      text: 'Streaks, accuracy, weakest positions and backups.',
    },
  ]

  return (
    <nav className="home" aria-label="Menu">
      {items.map((item) => (
        <button
          key={item.kind}
          type="button"
          className={
            item.kind === 'lessons' ? 'home-card featured' : 'home-card'
          }
          onClick={() => onOpen(item.kind)}
        >
          <span className="home-icon" aria-hidden>
            {item.icon}
          </span>
          <span className="home-title">
            {item.title}
            {item.badge && <span className="badge">{item.badge}</span>}
          </span>
          <span className="home-text">{item.text}</span>
        </button>
      ))}
    </nav>
  )
}
