import { useState } from 'react'
import { parseMove, replay } from '../chess/game'

type MoveInputProps = {
  line: string[] // the moves on the board
  disabled?: boolean
  onMove: (san: string) => void
}

// Type a move instead of dragging a piece: for keyboard and screen reader
// users, and for anyone who finds it quicker.
export function MoveInput({ line, disabled, onMove }: MoveInputProps) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  return (
    <form
      className="move-input"
      onSubmit={(e) => {
        e.preventDefault()
        const san = parseMove(replay(line), text)
        if (!san) {
          setError(`"${text.trim()}" isn't a legal move here.`)
          return
        }
        setText('')
        setError(null)
        onMove(san)
      }}
    >
      <label>
        Type a move{' '}
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setError(null)
          }}
          placeholder="e.g. Nf3"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'move-input-error' : undefined}
        />
      </label>{' '}
      <button type="submit" disabled={disabled || !text.trim()}>
        Play
      </button>
      {error && (
        <p id="move-input-error" className="wrong" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
