import type { Color } from 'chessground/types'
import { useRef, useState } from 'react'
import { formatLine, replay } from '../chess/game'
import { START, epd, openingFor, type OpeningTree } from '../openings/tree'
import {
  db,
  exportProgress,
  importProgress,
  resetProgress,
  type Card,
} from '../progress/db'
import { summarize } from '../progress/stats'
import { useLive } from '../progress/useLive'

const loadAll = async () => ({
  cards: await db.cards.toArray(),
  activity: await db.activity.toArray(),
  now: Date.now(),
})

type ProgressViewProps = {
  tree: OpeningTree
  onPractice: (moves: string[], side: Color) => void
  onReview: () => void
}

export function ProgressView({
  tree,
  onPractice,
  onReview,
}: ProgressViewProps) {
  const data = useLive(loadAll)
  const [message, setMessage] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  if (!data) return <p className="note">Loading progress…</p>
  const summary = summarize(data.cards, data.activity, data.now)

  const name = (card: Card) => {
    const chess = replay([])
    const o = openingFor(tree, [
      START,
      ...card.line.map((san) => (chess.move(san), epd(chess))),
    ])
    return o ? o.name : 'Starting position'
  }

  const download = async () => {
    const backup = await exportProgress()
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(backup)], { type: 'application/json' }),
    )
    const a = document.createElement('a')
    a.href = url
    a.download = `chess-opening-progress-${backup.exportedAt.slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const upload = async (file: File) => {
    try {
      await importProgress(JSON.parse(await file.text()))
      setMessage('Progress restored from backup.')
    } catch (e) {
      setMessage(
        e instanceof SyntaxError
          ? 'That file is not valid JSON.'
          : String((e as Error).message),
      )
    }
  }

  const tiles = [
    { label: 'Due now', value: summary.due },
    { label: 'Positions learned', value: summary.learned },
    {
      label: 'Mastered',
      value: summary.mastered,
      hint: 'Review interval of 3 weeks or more',
    },
    { label: 'Day streak', value: summary.streak },
    {
      label: 'Accuracy',
      value: summary.accuracy === null ? '–' : `${summary.accuracy}%`,
    },
    { label: 'Total reviews', value: summary.reviews },
  ]

  return (
    <section className="progress">
      <div className="tiles">
        {tiles.map((t) => (
          <div key={t.label} className="tile" title={t.hint}>
            <div className="value">{t.value}</div>
            <div className="label">{t.label}</div>
          </div>
        ))}
      </div>

      {summary.due > 0 && (
        <button type="button" className="primary" onClick={onReview}>
          Review {summary.due} due{' '}
          {summary.due === 1 ? 'position' : 'positions'}
        </button>
      )}

      <h2>Weakest positions</h2>
      {summary.weakest.length ? (
        <ul className="weakest">
          {summary.weakest.map((card) => (
            <li key={card.id}>
              <div>
                <div>{name(card)}</div>
                <div className="note">
                  As {card.side === 'white' ? 'White' : 'Black'} after{' '}
                  {card.line.length ? formatLine(card.line) : 'the start'} ·
                  missed {card.lapses}×
                </div>
              </div>
              <button
                type="button"
                onClick={() => onPractice(card.line, card.side)}
              >
                Practice
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="note">No missed positions yet.</p>
      )}

      <h2>Your data</h2>
      <p className="note">
        Progress and repertoires are saved in this browser. Download a backup to
        keep them safe or move them to another device.
      </p>
      <div className="controls">
        <button type="button" onClick={download}>
          Download backup
        </button>
        <button type="button" onClick={() => fileInput.current?.click()}>
          Restore backup
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) upload(file)
            e.target.value = ''
          }}
        />
        <button
          type="button"
          className={confirmReset ? 'danger' : undefined}
          onClick={async () => {
            if (!confirmReset) return setConfirmReset(true)
            await resetProgress()
            setConfirmReset(false)
            setMessage('Progress reset.')
          }}
          onBlur={() => setConfirmReset(false)}
        >
          {confirmReset
            ? 'Click again to erase all progress'
            : 'Reset progress'}
        </button>
      </div>
      {message && (
        <p className="note" role="status">
          {message}
        </p>
      )}
    </section>
  )
}
