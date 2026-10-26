import index from './data/index.json'
import { parseLesson, type Lesson } from './lesson'
import type { LessonData, LessonSummary } from './types'

export const LESSONS = index as LessonSummary[]

// Each lesson's variations are a separate JSON file, fetched when the lesson
// opens (and precached for offline use like the rest of the app).
const files = import.meta.glob<string>('./data/*.json', {
  query: '?url',
  import: 'default',
})

const cache = new Map<string, Promise<Lesson>>()

export function loadLesson(id: string): Promise<Lesson> {
  let lesson = cache.get(id)
  if (!lesson) {
    const file = files[`./data/${id}.json`]
    lesson = file
      ? file()
          .then((url) => fetch(url))
          .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            return res.json() as Promise<LessonData>
          })
          .then(parseLesson)
      : Promise.reject(new Error(`No lesson ${id}`))
    lesson.catch(() => cache.delete(id))
    cache.set(id, lesson)
  }
  return lesson
}

export function nextLesson(id: string): LessonSummary | undefined {
  const i = LESSONS.findIndex((l) => l.id === id)
  return i >= 0 ? LESSONS[i + 1] : undefined
}
