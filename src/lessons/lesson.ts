import type { Color } from 'chessground/types'
import type { LessonData } from './types'

export type Lesson = {
  id: string
  name: string
  side: Color
  group: string
  description: string
  root: string[]
  variations: { name: string; eco: string; moves: string[] }[]
}

export function parseLesson(data: LessonData): Lesson {
  return {
    id: data.id,
    name: data.name,
    side: data.side,
    group: data.group,
    description: data.description,
    root: data.moves.split(' '),
    variations: data.variations.map((v) => ({
      ...v,
      moves: v.moves.split(' '),
    })),
  }
}

export function variationKey(lesson: Lesson, index: number): string {
  return `${lesson.id}|${lesson.variations[index].moves.join(' ')}`
}

// The move the main line plays after `ply` moves of variation `index`: the
// move of the first variation that reaches the same point. Variations are in
// teaching order, so that is the line this one branches off.
export function mainLineMove(
  lesson: Lesson,
  index: number,
  ply: number,
): string {
  const moves = lesson.variations[index].moves
  for (let i = 0; i <= index; i++) {
    const other = lesson.variations[i].moves
    if (
      other.length > ply &&
      moves.slice(0, ply).every((m, j) => other[j] === m)
    )
      return other[ply]
  }
  return moves[ply]
}

export function isYourMove(lesson: Lesson, ply: number): boolean {
  return (ply % 2 === 0) === (lesson.side === 'white')
}

// "4.Nc3", "4...e6": a move with its number.
export function moveLabel(moves: string[], ply: number): string {
  const n = Math.floor(ply / 2) + 1
  return ply % 2 ? `${n}...${moves[ply]}` : `${n}.${moves[ply]}`
}

// Where variation `index` first leaves every earlier variation: the ply of
// the opponent's move that makes it new, or -1 for the main line.
export function branchPly(lesson: Lesson, index: number): number {
  const moves = lesson.variations[index].moves
  let best = -1
  for (let i = 0; i < index; i++) {
    const other = lesson.variations[i].moves
    let ply = 0
    while (ply < moves.length && other[ply] === moves[ply]) ply++
    best = Math.max(best, ply)
  }
  return best
}

// A variation is open once you have finished the one before it, or if you
// have finished it already.
export function isUnlocked(
  lesson: Lesson,
  index: number,
  done: Set<string>,
): boolean {
  return (
    index === 0 ||
    done.has(variationKey(lesson, index)) ||
    done.has(variationKey(lesson, index - 1))
  )
}

// The first variation you haven't finished.
export function nextVariation(lesson: Lesson, done: Set<string>): number {
  const i = lesson.variations.findIndex(
    (_, i) => !done.has(variationKey(lesson, i)),
  )
  return i < 0 ? 0 : i
}

// The short name of a variation inside its lesson: "Slav Defense: Czech
// Variation" is shown as is, but the family is dropped when it is the
// lesson's own name.
export function shortName(name: string): string {
  const i = name.indexOf(': ')
  return i < 0 ? name : name.slice(i + 2)
}
