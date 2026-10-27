import { useEffect, useRef } from 'react'
import { movePairs } from '../chess/game'

type MoveListProps = {
  moves: string[]
  ply: number
  // Without it the moves are shown but not clickable.
  onSelect?: (ply: number) => void
}

// The moves played so far. Clicking a move jumps to the position after it.
export function MoveList({ moves, ply, onSelect }: MoveListProps) {
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

  const move = (san: string | undefined, index: number) =>
    san && (
      <button
        type="button"
        className={index + 1 === ply ? 'move current' : 'move'}
        aria-current={index + 1 === ply}
        disabled={!onSelect}
        onClick={() => onSelect?.(index + 1)}
      >
        {san}
      </button>
    )

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
