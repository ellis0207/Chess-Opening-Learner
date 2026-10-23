import type { Color } from 'chessground/types'
import { useState } from 'react'
import type { RepertoireMove } from '../progress/db'

type RepertoirePanelProps = {
  side: Color
  canAdd: boolean
  // The last move on the board, if it is in this repertoire.
  current?: RepertoireMove
  onAdd: () => void
  onRemove: (move: RepertoireMove) => void
  onNote: (move: RepertoireMove, note: string) => void
}

// Adds the explorer's line to a repertoire, and edits the move on the board.
// Give it a `key` of the current move's id so the note resets between moves.
export function RepertoirePanel({
  side,
  canAdd,
  current,
  onAdd,
  onRemove,
  onNote,
}: RepertoirePanelProps) {
  const [note, setNote] = useState(current?.note ?? '')
  const name = side === 'white' ? 'White' : 'Black'

  return (
    <section className="repertoire-panel">
      <h3>My {name} repertoire</h3>
      {current ? (
        <>
          <p>
            <span className="mine">★</span> <strong>{current.san}</strong> is in
            your {name} repertoire.
          </p>
          <textarea
            className="pgn"
            rows={2}
            placeholder={`Note on ${current.san}: the idea, a plan, a trap to remember…`}
            aria-label={`Note on ${current.san}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() =>
              note !== (current.note ?? '') && onNote(current, note)
            }
          />
          <button type="button" onClick={() => onRemove(current)}>
            Remove {current.san} and the moves after it
          </button>
        </>
      ) : (
        <button type="button" onClick={onAdd} disabled={!canAdd}>
          Add this line to my {name} repertoire
        </button>
      )}
    </section>
  )
}
