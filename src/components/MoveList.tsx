import { movePairs } from '../chess/game'

type MoveListProps = {
  moves: string[]
  ply: number
  onSelect: (ply: number) => void
}

// The moves played so far. Clicking a move jumps to the position after it.
export function MoveList({ moves, ply, onSelect }: MoveListProps) {
  const move = (san: string | undefined, index: number) =>
    san && (
      <button
        type="button"
        className={index + 1 === ply ? 'move current' : 'move'}
        aria-current={index + 1 === ply}
        onClick={() => onSelect(index + 1)}
      >
        {san}
      </button>
    )

  return (
    <ol className="moves">
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
