export type EngineLine = {
  // Centipawns for the side to move. A mate in n is ±(MATE - n).
  score: number
  mate?: number // moves to mate, negative if the side to move gets mated
  pv: string[] // UCI moves
}

export const MATE = 100000
