import { useEffect, useRef } from 'react'
import { movePairs } from '../chess/game'
import {
  CLASS_GLYPH,
  CLASS_NAME,
  type Classification,
} from '../review/classify'

type MoveListProps = {
  moves: string[]
  ply: number
  // Without it the moves are shown but not clickable.
  onSelect?: (ply: number) => void
  // A rating for each move, shown next to it (game review only).
  marks?: (Classification | undefined)[]
}

// The moves played so far. Clicking a move jumps to the position after it.
export function MoveList({ moves, ply, onSelect, marks }: MoveListProps) {
  const list = useRef<HTMLOListElement>(null)

  // Keeps the current move in view as a long game scrolls the list.
  useEffect(() => {
    const ol = list.current
    const current = ol?.querySelector<HTMLElement>('.current')
    if (!ol || !current) return
    const top = current.offsetTop - ol.offsetTop
    if (
      top < ol.scrollTop ||
      top + current.offsetHeight > ol.scrollTop + ol.clientHeight
    )
      ol.scrollTop = top - ol.clientHeight / 2
  }, [ply, moves])

  const move = (san: string | undefined, index: number) => {
    const mark = marks?.[index]
    return (
      san && (
        <button
          type="button"
          className={index + 1 === ply ? 'move current' : 'move'}
          aria-current={index + 1 === ply}
          disabled={!onSelect}
          onClick={() => onSelect?.(index + 1)}
        >
          {mark && <ClassBadge mark={mark} />}
          {san}
        </button>
      )
    )
  }

  return (
    <ol className="moves" ref={list}>
      {movePairs(moves).map(([n, white, black]) => (
        <li key={n}>
          <span className="num">{n}.</span>
          {move(white, 2 * n - 2)}
          {move(black, 2 * n - 1)}
        </li>
      ))}
    </ol>
  )
}

// A move's rating as a small colored badge, as in Chess.com's game review.
export function ClassBadge({ mark }: { mark: Classification }) {
  return (
    <span className={`class-badge ${mark}`} title={CLASS_NAME[mark]}>
      <span aria-hidden>{CLASS_GLYPH[mark]}</span>
      <span className="sr-only">{CLASS_NAME[mark]}: </span>
    </span>
  )
}
