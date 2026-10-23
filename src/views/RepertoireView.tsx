import type { Color } from 'chessground/types'
import { useRef, useState } from 'react'
import { db } from '../progress/db'
import { useLive } from '../progress/useLive'
import { clearRepertoire, exportPgn, importPgn } from '../repertoire/store'

const loadRepertoire = () => db.repertoire.toArray()
const SIDES: Color[] = ['white', 'black']
const title = (side: Color) => (side === 'white' ? 'White' : 'Black')

type RepertoireViewProps = {
  onPractice: (side: Color) => void
  onExplore: () => void
}

// Your two repertoires: what's in them, practice, and PGN import/export.
export function RepertoireView({ onPractice, onExplore }: RepertoireViewProps) {
  const moves = useLive(loadRepertoire)
  const [importSide, setImportSide] = useState<Color>('white')
  const [pgn, setPgn] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState<Color | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  if (!moves) return <p className="note">Loading repertoire…</p>

  const download = (side: Color) => {
    const url = URL.createObjectURL(
      new Blob([exportPgn(side, moves)], { type: 'application/x-chess-pgn' }),
    )
    const a = document.createElement('a')
    a.href = url
    a.download = `${side}-repertoire.pgn`
    a.click()
    URL.revokeObjectURL(url)
  }

  const runImport = async (text: string) => {
    try {
      const { moves: count, skipped } = await importPgn(importSide, text)
      setMessage(
        `Imported ${count} moves into your ${importSide} repertoire.` +
          (skipped
            ? ` Skipped ${skipped} alternative ${skipped === 1 ? 'move' : 'moves'} for your side: a repertoire keeps one move per position, the main line.`
            : ''),
      )
      setPgn('')
    } catch (e) {
      setMessage((e as Error).message)
    }
  }

  return (
    <section className="progress">
      <div className="tiles wide">
        {SIDES.map((side) => {
          const count = moves.filter((m) => m.side === side).length
          return (
            <div key={side} className="tile repertoire-tile">
              <div className="value">{count}</div>
              <div className="label">moves as {title(side)}</div>
              <div className="controls">
                <button
                  type="button"
                  className="primary"
                  disabled={!count}
                  onClick={() => onPractice(side)}
                >
                  Practice
                </button>
                <button
                  type="button"
                  disabled={!count}
                  onClick={() => download(side)}
                >
                  Export PGN
                </button>
                <button
                  type="button"
                  disabled={!count}
                  className={confirmClear === side ? 'danger' : undefined}
                  onClick={async () => {
                    if (confirmClear !== side) return setConfirmClear(side)
                    await clearRepertoire(side)
                    setConfirmClear(null)
                  }}
                  onBlur={() => setConfirmClear(null)}
                >
                  {confirmClear === side ? 'Click again to clear' : 'Clear'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <p className="note">
        Build a repertoire in the{' '}
        <button type="button" className="link" onClick={onExplore}>
          explorer
        </button>
        : play a line and add it to your White or Black repertoire. Or import
        one below.
      </p>

      <h2>Import PGN</h2>
      <p className="note">
        Paste PGN or choose a .pgn file. Variations are imported too; comments
        become notes on the moves.
      </p>
      <div className="settings">
        <label>
          Into my{' '}
          <select
            value={importSide}
            onChange={(e) => setImportSide(e.target.value as Color)}
          >
            <option value="white">White</option>
            <option value="black">Black</option>
          </select>{' '}
          repertoire
        </label>
      </div>
      <textarea
        className="pgn"
        rows={6}
        placeholder="1. e4 e5 (1... c5 2. Nf3) 2. Nf3 Nc6 3. Bc4 *"
        value={pgn}
        onChange={(e) => setPgn(e.target.value)}
        aria-label="PGN to import"
      />
      <div className="controls">
        <button
          type="button"
          className="primary"
          disabled={!pgn.trim()}
          onClick={() => runImport(pgn)}
        >
          Import
        </button>
        <button type="button" onClick={() => fileInput.current?.click()}>
          Choose file…
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".pgn,application/x-chess-pgn,text/plain"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (file) await runImport(await file.text())
            e.target.value = ''
          }}
        />
      </div>
      {message && (
        <p className="note" role="status">
          {message}
        </p>
      )}
    </section>
  )
}
