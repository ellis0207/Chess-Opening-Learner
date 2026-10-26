import type { Color } from 'chessground/types'
import { useMemo } from 'react'
import { replay } from '../chess/game'

const NAMES = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
} as const

type MiniBoardProps = {
  moves: string[]
  orientation: Color
}

// A small picture of the position after `moves`, for lesson cards. Not a
// playable board: it reuses chessground's piece images and nothing else.
export function MiniBoard({ moves, orientation }: MiniBoardProps) {
  const rows = useMemo(() => {
    const board = replay(moves).board()
    return orientation === 'white'
      ? board
      : board.map((row) => [...row].reverse()).reverse()
  }, [moves, orientation])

  return (
    <div className="cg-wrap mini-board" aria-hidden>
      {rows.map((row, r) =>
        row.map((sq, f) => (
          <div key={`${r}${f}`} className={(r + f) % 2 ? 'dark' : 'light'}>
            {sq && (
              <piece
                className={`${NAMES[sq.type]} ${sq.color === 'w' ? 'white' : 'black'}`}
              />
            )}
          </div>
        )),
      )}
    </div>
  )
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      piece: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >
    }
  }
}
