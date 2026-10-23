import { liveQuery } from 'dexie'
import { useEffect, useState } from 'react'

// Subscribes to a Dexie query and re-renders whenever its result changes.
// `query` should be a stable function (defined at module level or memoized).
export function useLive<T>(query: () => Promise<T>): T | undefined {
  const [value, setValue] = useState<T>()
  useEffect(() => {
    const subscription = liveQuery(query).subscribe({
      next: setValue,
      error: (e) => console.error(e),
    })
    return () => subscription.unsubscribe()
  }, [query])
  return value
}
