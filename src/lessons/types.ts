export type Variation = {
  name: string
  eco: string
  moves: string // SAN, space separated, from the starting position
}

export type LessonData = {
  id: string
  name: string
  side: 'white' | 'black'
  group: string
  description: string
  moves: string // the moves that define the opening
  // In teaching order: the main line first, then each line that branches off
  // an earlier one.
  variations: Variation[]
}

export type LessonSummary = Omit<LessonData, 'variations'> & {
  variations: number
}
