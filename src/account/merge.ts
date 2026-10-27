import { Chess } from 'chess.js'
import { localDate, type Backup } from '../progress/db'

// Progress as it is kept in your account: a backup, plus when you last reset
// your progress, so that a device that still has the old progress does not
// bring it back.
export type CloudProgress = Backup & { resetAt: number }

function byId<T>(items: T[], key: (item: T) => string): Map<string, T> {
  return new Map(items.map((item) => [key(item), item]))
}

// Combines the progress on this device with the progress in your account.
// Cards keep their latest review, lessons their first completion, and each
// day the entry with more reviews. Repertoires are combined too, keeping this
// device's move where both have a different move of yours in a position.
// Anything this device learned before the account's last reset is dropped.
export function mergeProgress(
  local: Backup,
  cloud: CloudProgress,
): CloudProgress {
  const resetAt = cloud.resetAt ?? 0
  const resetDate = resetAt ? localDate(resetAt) : ''

  const cards = byId(cloud.cards, (c) => c.id)
  for (const card of local.cards) {
    if (card.lastReviewed < resetAt) continue
    const other = cards.get(card.id)
    if (!other || other.lastReviewed < card.lastReviewed)
      cards.set(card.id, card)
  }

  const lessons = byId(cloud.lessons ?? [], (l) => l.id)
  for (const lesson of local.lessons) {
    if (lesson.completedAt < resetAt) continue
    const other = lessons.get(lesson.id)
    if (!other || lesson.completedAt < other.completedAt)
      lessons.set(lesson.id, lesson)
  }

  const activity = byId(cloud.activity, (a) => a.date)
  for (const day of local.activity) {
    if (day.date < resetDate) continue
    const other = activity.get(day.date)
    if (!other || other.reviews < day.reviews) activity.set(day.date, day)
  }

  const repertoire = byId(local.repertoire, (m) => m.id)
  const yours = new Set(
    local.repertoire
      .filter((m) => new Chess(m.epd + ' 0 1').turn() === m.side[0])
      .map((m) => `${m.side}|${m.epd}`),
  )
  for (const move of cloud.repertoire ?? []) {
    const mine = new Chess(move.epd + ' 0 1').turn() === move.side[0]
    if (mine && yours.has(`${move.side}|${move.epd}`)) continue
    if (!repertoire.has(move.id)) repertoire.set(move.id, move)
  }

  return {
    app: 'chess-opening-learner',
    version: 3,
    exportedAt: new Date().toISOString(),
    cards: [...cards.values()],
    activity: [...activity.values()],
    repertoire: [...repertoire.values()],
    lessons: [...lessons.values()],
    resetAt,
  }
}
