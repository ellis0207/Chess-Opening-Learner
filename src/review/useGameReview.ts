import { useEffect, useState } from 'react'
import { reviewGame, type PositionReview } from './analyse'

export type GameReview = {
  positions: (PositionReview | undefined)[] // starting position first
  done: number // how many positions are reviewed
  error?: string
}

// Reviews a game with the engine while `active`, position by position.
export function useGameReview(moves: string[], active: boolean): GameReview {
  const [state, setState] = useState<GameReview & { moves: string[] }>()

  useEffect(() => {
    if (!active) return
    const positions: (PositionReview | undefined)[] = []
    let done = 0
    return reviewGame(
      moves,
      (ply, review) => {
        positions[ply] = review
        done++
        setState({ moves, positions: [...positions], done })
      },
      (e) =>
        setState({
          moves,
          positions: [...positions],
          done,
          error: e.message || 'the engine stopped',
        }),
    )
  }, [moves, active])

  return state?.moves === moves && active ? state : { positions: [], done: 0 }
}
