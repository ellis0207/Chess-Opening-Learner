import type { Color } from 'chessground/types'
import { evalText, whiteChances, type Eval } from '../review/classify'

type EvalBarProps = {
  value?: Eval // undefined while the position is being analysed
  orientation: Color // the side at the bottom of the board
}

// A bar beside the board, white from the bottom (or top) as far as White's
// chances go, with the evaluation written on the leading side.
export function EvalBar({ value, orientation }: EvalBarProps) {
  const white = value ? whiteChances(value) : 0.5
  const whiteLeads = !value || value.cp >= 0
  // White's share of the bar, kept in view at both ends.
  const share = Math.max(3, Math.min(97, white * 100))
  const flipped = orientation === 'black'
  return (
    <div
      className={`eval-bar${flipped ? ' flipped' : ''}`}
      role="meter"
      aria-label="Evaluation"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(white * 100)}
      aria-valuetext={value ? evalText(value) : 'analysing'}
    >
      <div className="eval-white" style={{ height: `${share}%` }} />
      {value && (
        <span
          className={`eval-text ${whiteLeads ? 'on-white' : 'on-black'}`}
          aria-hidden
        >
          {evalText(value).replace(/^[+−]/, '')}
        </span>
      )}
    </div>
  )
}
