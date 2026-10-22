import { Chessground } from 'chessground'
import type { Api } from 'chessground/api'
import type { Config } from 'chessground/config'
import { useEffect, useRef } from 'react'
import 'chessground/assets/chessground.base.css'
import 'chessground/assets/chessground.brown.css'
import 'chessground/assets/chessground.cburnett.css'

type BoardProps = {
  config: Config
}

// Thin React wrapper around chessground. The board is created once (this
// effect runs first) and every config is pushed to it with api.set().
export function Board({ config }: BoardProps) {
  const el = useRef<HTMLDivElement>(null)
  const api = useRef<Api | null>(null)

  useEffect(() => {
    if (!el.current) return
    api.current = Chessground(el.current)
    return () => {
      api.current?.destroy()
      api.current = null
    }
  }, [])

  useEffect(() => {
    api.current?.set(config)
  }, [config])

  return <div ref={el} className="board" />
}
