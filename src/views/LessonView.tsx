import type { Config } from 'chessground/config'
import type { Key } from 'chessground/types'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Board } from '../components/Board'
import { MoveInput } from '../components/MoveInput'
import { MoveList } from '../components/MoveList'
import {
  hintSquares,
  lastMoveText,
  legalDests,
  playMove,
  replay,
  turnColor,
} from '../chess/game'
import { analyse, warmUp } from '../engine/stockfish'
import { describeMove, explainWrong, toUci } from '../lessons/explain'
import {
  branchPly,
  isUnlocked,
  isYourMove,
  mainLineMove,
  moveLabel,
  nextVariation,
  shortName,
  variationKey,
  type Lesson,
} from '../lessons/lesson'
import { loadLesson, nextLesson } from '../lessons/load'
import { variationNote } from '../lessons/notes'
import { epd, type OpeningTree } from '../openings/tree'
import { completeVariation, db } from '../progress/db'
import { useLive } from '../progress/useLive'

// How long the opponent "thinks" before replying, so its move is visible.
const REPLY_DELAY_MS = 600

type Tone = 'info' | 'correct' | 'wrong' | 'variation'

type Coach = {
  tone: Tone
  title: string
  body: string[]
  pending?: boolean // the engine is still working out why
}

type Run = {
  ply: number // moves on the board
  mistakes: number
  hints: number
  hinted: boolean // a hint is showing for the current move
  attempt: number // bumped on every wrong move, to reset the board
}

const freshRun: Run = {
  ply: 0,
  mistakes: 0,
  hints: 0,
  hinted: false,
  attempt: 0,
}

const colorName = (c: 'white' | 'black') => (c === 'white' ? 'White' : 'Black')

type LessonViewProps = {
  id: string
  tree: OpeningTree
  onExit: () => void // back to the menu
  onMenu: () => void
  onOpenLesson: (id: string) => void
}

export function LessonView(props: LessonViewProps) {
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    warmUp()
    loadLesson(props.id).then(setLesson, (e: Error) => setError(e.message))
  }, [props.id])

  if (error)
    return (
      <section className="empty">
        <h2>Couldn’t load this lesson</h2>
        <p>{error}</p>
        <button type="button" onClick={props.onExit}>
          Back to menu
        </button>
      </section>
    )
  if (!lesson) return <p className="note">Loading lesson…</p>
  return <LessonPlayer {...props} lesson={lesson} />
}

function LessonPlayer({
  lesson,
  tree,
  onExit,
  onMenu,
  onOpenLesson,
}: LessonViewProps & { lesson: Lesson }) {
  const loadDone = useMemo(
    () => () => db.lessons.where('lesson').equals(lesson.id).primaryKeys(),
    [lesson.id],
  )
  const doneKeys = useLive(loadDone)
  const done = useMemo(() => new Set<string>(doneKeys ?? []), [doneKeys])

  const [index, setIndex] = useState(0)
  const [run, setRun] = useState<Run>(freshRun)
  const runRef = useRef(run)
  useEffect(() => {
    runRef.current = run
  }, [run])
  const [coach, setCoach] = useState<Coach>(() => intro(lesson, 0))
  const [finished, setFinished] = useState<'clean' | 'again' | null>(null)
  const [showList, setShowList] = useState(false)

  // Start on the first variation you haven't learned, once progress loads.
  const started = useRef(false)
  useEffect(() => {
    if (started.current || !doneKeys) return
    started.current = true
    const i = nextVariation(lesson, done)
    setIndex(i)
    setCoach(intro(lesson, i))
  }, [doneKeys, done, lesson])

  const variation = lesson.variations[index]
  const moves = variation.moves
  const line = moves.slice(0, run.ply)
  const game = useMemo(() => replay(moves.slice(0, run.ply)), [moves, run.ply])
  const yourTurn = isYourMove(lesson, run.ply) && run.ply < moves.length
  const opponent = colorName(lesson.side === 'white' ? 'black' : 'white')

  const start = useCallback(
    (i: number) => {
      setIndex(i)
      setRun(freshRun)
      setFinished(null)
      setShowList(false)
      setCoach(intro(lesson, i))
    },
    [lesson],
  )

  const finish = useCallback(
    (r: Run) => {
      const clean = r.mistakes === 0 && r.hints === 0
      setFinished(clean ? 'clean' : 'again')
      if (clean)
        completeVariation(
          variationKey(lesson, index),
          lesson.id,
          lesson.side,
          moves,
        )
    },
    [lesson, index, moves],
  )

  // The opponent plays its move of the variation after a short pause.
  useEffect(() => {
    if (finished || yourTurn || run.ply >= moves.length) return
    const timer = setTimeout(() => {
      const ply = run.ply
      setCoach((prev) => opponentCoach(lesson, index, ply, prev))
      const next = { ...run, ply: ply + 1, hinted: false }
      setRun(next)
      if (next.ply >= moves.length) finish(next)
    }, REPLY_DELAY_MS)
    return () => clearTimeout(timer)
  }, [finished, yourTurn, run, moves, lesson, index, finish])

  const submit = useCallback(
    (san: string) => {
      if (!yourTurn || finished) return
      const expected = moves[run.ply]
      const before = replay(moves.slice(0, run.ply))
      if (san === expected) {
        const note = describeMove(before, san)
        setCoach({
          tone: 'correct',
          title: `${moveLabel(moves, run.ply)} is correct!`,
          body: note ? [note] : [],
        })
        const next = { ...run, ply: run.ply + 1, hinted: false }
        setRun(next)
        if (next.ply >= moves.length) finish(next)
        return
      }

      const attempt = run.attempt + 1
      setRun({ ...run, mistakes: run.mistakes + 1, attempt })
      const after = replay(moves.slice(0, run.ply))
      after.move(san)
      const bookName = tree.get(epd(after))?.opening?.name
      const args = {
        fen: before.fen(),
        history: moves.slice(0, run.ply),
        wrong: san,
        best: expected,
        bookName,
      }
      setCoach({ tone: 'wrong', ...explainWrong(args), pending: true })
      const wrongUci = toUci(before.fen(), san)!
      const bestUci = toUci(before.fen(), expected)!
      analyse(before.fen(), { depth: 13, searchmoves: [wrongUci, bestUci] })
        .then((lines) => explainWrong({ ...args, lines }))
        .catch(() => explainWrong(args))
        .then((explanation) => {
          // Only if you haven't moved on since.
          const now = runRef.current
          if (now.attempt === attempt && now.ply === args.history.length)
            setCoach({ tone: 'wrong', ...explanation })
        })
    },
    [yourTurn, finished, moves, run, finish, tree],
  )

  const hint = () => {
    if (!yourTurn || run.hinted) return
    setRun({ ...run, hinted: true, hints: run.hints + 1 })
    const piece = game.get(
      game.moves({ verbose: true }).find((m) => m.san === moves[run.ply])!.from,
    )
    setCoach({
      tone: 'info',
      title: 'Hint',
      body: [
        `Move the highlighted ${piece ? PIECE[piece.type] : 'piece'}. Where should it go?`,
        'Using a hint means you’ll play this variation again before moving on.',
      ],
    })
  }

  const config = useMemo<Config>(() => {
    const last = game.history({ verbose: true }).at(-1)
    const onMove = (from: Key, to: Key) => {
      const san = playMove(replay(moves.slice(0, run.ply)), from, to)
      if (san) submit(san)
    }
    return {
      fen: game.fen(),
      orientation: lesson.side,
      turnColor: turnColor(game),
      check: game.inCheck(),
      lastMove: last ? [last.from, last.to] : undefined,
      movable: {
        free: false,
        color: yourTurn && !finished ? lesson.side : undefined,
        dests: legalDests(game),
        events: { after: onMove },
      },
      highlight: {
        custom: run.hinted ? hintSquares(game, [moves[run.ply]]) : new Map(),
      },
    }
    // `run` is a new object after every wrong move, so the board is reset to
    // the lesson position.
  }, [game, lesson.side, moves, run, submit, yourTurn, finished])

  const learned = lesson.variations.filter((_, i) =>
    done.has(variationKey(lesson, i)),
  ).length
  const nextIndex = index + 1 < lesson.variations.length ? index + 1 : null
  const following = nextLesson(lesson.id)

  return (
    <div className="layout">
      <Board config={config} />
      <aside className="panel lesson-panel">
        <p className="note">
          <button type="button" className="link" onClick={onExit}>
            Menu
          </button>{' '}
          › {lesson.name}
        </p>
        <h2 className="opening">
          <span className="eco">{variation.eco}</span>{' '}
          {shortName(variation.name)}
        </h2>
        <p className="note">
          Variation {index + 1} of {lesson.variations.length} · {learned}{' '}
          learned · you play {colorName(lesson.side)}
        </p>

        <CoachBubble coach={coach} />

        {!finished && (
          <p className="turn note" aria-live="polite">
            {yourTurn
              ? `Your move: find the best move for ${colorName(lesson.side)}.`
              : `${opponent} is thinking…`}
          </p>
        )}

        <MoveInput
          key={`${index} ${run.attempt}`}
          line={line}
          disabled={!yourTurn || Boolean(finished)}
          onMove={submit}
        />
        <p className="sr-only" aria-live="polite">
          {lastMoveText(line)}
        </p>
        <MoveList moves={line} ply={line.length} />

        <div className="controls">
          <button
            type="button"
            onClick={hint}
            disabled={!yourTurn || run.hinted || Boolean(finished)}
          >
            Hint
          </button>
          <button type="button" onClick={() => start(index)}>
            Restart
          </button>
          <button
            type="button"
            aria-expanded={showList}
            onClick={() => setShowList((s) => !s)}
          >
            Variations
          </button>
        </div>

        {showList && (
          <ol className="variation-list">
            {lesson.variations.map((v, i) => {
              const learnedIt = done.has(variationKey(lesson, i))
              const open = isUnlocked(lesson, i, done)
              return (
                <li key={i}>
                  <button
                    type="button"
                    disabled={!open}
                    aria-current={i === index}
                    onClick={() => start(i)}
                  >
                    <span aria-hidden>
                      {learnedIt ? '✓' : open ? '○' : '🔒'}
                    </span>{' '}
                    {i + 1}. {shortName(v.name)}
                  </button>
                </li>
              )
            })}
          </ol>
        )}
      </aside>

      {finished && (
        <div className="modal-backdrop">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="done-title"
          >
            {finished === 'clean' ? (
              <>
                <p className="modal-badge correct" aria-hidden>
                  ✓
                </p>
                <h2 id="done-title">Variation learned!</h2>
                <p className="modal-opening">{lesson.name}</p>
                <p className="modal-variation">{variation.name}</p>
                <p className="note">
                  You played the whole line without mistakes or hints. Its
                  positions are now in your Review schedule.
                </p>
                <div className="controls">
                  {nextIndex !== null ? (
                    <button
                      type="button"
                      className="primary"
                      autoFocus
                      onClick={() => start(nextIndex)}
                    >
                      Next variation
                    </button>
                  ) : following ? (
                    <button
                      type="button"
                      className="primary"
                      autoFocus
                      onClick={() => onOpenLesson(following.id)}
                    >
                      Next lesson: {following.name}
                    </button>
                  ) : null}
                  <button type="button" onClick={() => start(index)}>
                    Replay
                  </button>
                  <button type="button" onClick={onMenu}>
                    Exit to menu
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="modal-badge again" aria-hidden>
                  ↻
                </p>
                <h2 id="done-title">Almost there</h2>
                <p className="modal-opening">{lesson.name}</p>
                <p className="modal-variation">{variation.name}</p>
                <p className="note">
                  You reached the end with {plural(run.mistakes, 'mistake')} and{' '}
                  {plural(run.hints, 'hint')}. Play it again without any to
                  unlock the next variation.
                </p>
                <div className="controls">
                  <button
                    type="button"
                    className="primary"
                    autoFocus
                    onClick={() => start(index)}
                  >
                    Try again
                  </button>
                  {nextIndex !== null &&
                    isUnlocked(lesson, nextIndex, done) && (
                      <button type="button" onClick={() => start(nextIndex)}>
                        Next variation
                      </button>
                    )}
                  <button type="button" onClick={onMenu}>
                    Exit to menu
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const PIECE: Record<string, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

function CoachBubble({ coach }: { coach: Coach }) {
  const icon = { info: 'i', correct: '✓', wrong: '✕', variation: '⑂' }[
    coach.tone
  ]
  return (
    <div className={`coach ${coach.tone}`} role="status" aria-live="polite">
      <span className="coach-icon" aria-hidden>
        {icon}
      </span>
      <div className="coach-text">
        <p className="coach-title">{coach.title}</p>
        {coach.body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        {coach.pending && <p className="note">Checking with the engine…</p>}
      </div>
    </div>
  )
}

function opponentName(lesson: Lesson): string {
  return colorName(lesson.side === 'white' ? 'black' : 'white')
}

function intro(lesson: Lesson, index: number): Coach {
  const v = lesson.variations[index]
  const you = colorName(lesson.side)
  const first =
    lesson.side === 'white'
      ? 'You have the first move.'
      : 'White moves first, then it’s your turn.'
  if (index === 0)
    return {
      tone: 'info',
      title: lesson.name,
      body: [
        lesson.description,
        `You play ${you}. I’ll play the opponent’s moves; find the best reply each time, without arrows. ${first}`,
      ],
    }
  const ply = branchPly(lesson, index)
  return {
    tone: 'info',
    title: `Variation ${index + 1}: ${shortName(v.name)}`,
    body: [
      `This line follows ones you have played until move ${Math.floor(ply / 2) + 1}, where ${opponentName(lesson)} branches off. ${first}`,
    ],
  }
}

// What to say about the opponent's move at `ply`: a new variation if it
// leaves the main line, otherwise a short note under your last move's
// message.
function opponentCoach(
  lesson: Lesson,
  index: number,
  ply: number,
  prev: Coach,
): Coach {
  const moves = lesson.variations[index].moves
  const san = moves[ply]
  const label = moveLabel(moves, ply)
  const who = colorName(lesson.side === 'white' ? 'black' : 'white')
  const main = mainLineMove(lesson, index, ply)

  if (san !== main) {
    // The variation that first went this way.
    const j = lesson.variations.findIndex(
      (v) =>
        v.moves.length > ply &&
        moves.slice(0, ply + 1).every((m, k) => v.moves[k] === m),
    )
    const v = lesson.variations[j]
    const mainLabel = moveLabel([...moves.slice(0, ply), main], ply)
    const note = variationNote(v.name)
    return {
      tone: 'variation',
      title:
        j === index
          ? `New variation: ${shortName(v.name)}`
          : `${who} plays ${label}`,
      body: [
        `${who} played ${label} instead of the main line ${mainLabel}. ${
          j === index
            ? `This enters a new variation, the ${v.name}.`
            : `This is the ${v.name}, which branches off here.`
        }`,
        ...(note ? [note] : []),
        'How should you respond?',
      ],
    }
  }

  const reply = `${who} replies ${label}.`
  if (ply + 1 === lesson.root.length && ply >= 0) {
    return {
      tone: 'info',
      title: `${who} plays ${label}`,
      body: [`This is the ${lesson.name}.`],
    }
  }
  if (prev.tone === 'correct' && !prev.body.includes(reply))
    return { ...prev, body: [...prev.body, reply] }
  return { tone: 'info', title: `${who} plays ${label}`, body: [] }
}
