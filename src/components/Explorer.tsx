import { variationLabel, type Edge, type Opening } from '../openings/tree'

type ExplorerProps = {
  opening?: Opening
  inBook: boolean
  edges: Edge[]
  // Moves from here in your repertoire, and those of them the book lacks.
  mine: Set<string>
  extra: string[]
  onPlay: (san: string) => void
  onHover: (san: string | null) => void
}

// The current opening name and the book moves available from here.
export function Explorer({
  opening,
  inBook,
  edges,
  mine,
  extra,
  onPlay,
  onHover,
}: ExplorerProps) {
  return (
    <section className="explorer">
      <h2 className="opening">
        {opening ? (
          <>
            <span className="eco">{opening.eco}</span> {opening.name}
          </>
        ) : (
          'Starting position'
        )}
      </h2>
      {!inBook && !extra.length && (
        <p className="note">
          Out of book. Step back to return to known theory.
        </p>
      )}
      {inBook && !edges.length && !extra.length && (
        <p className="note">End of the line: no named continuations here.</p>
      )}
      {edges.length > 0 && (
        <ul className="continuations" onMouseLeave={() => onHover(null)}>
          {edges.map((edge) => (
            <li key={edge.san}>
              <button
                type="button"
                onClick={() => onPlay(edge.san)}
                onMouseEnter={() => onHover(edge.san)}
                onFocus={() => onHover(edge.san)}
                onBlur={() => onHover(null)}
              >
                <span className="san">
                  {edge.san}
                  {mine.has(edge.san) && (
                    <span className="mine" title="In your repertoire">
                      {' '}
                      ★
                    </span>
                  )}
                </span>
                <span className="line" title={edge.line.name}>
                  {variationLabel(edge.line, opening)}
                </span>
                <span className="count" title="Named lines through this move">
                  {edge.lines}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {extra.length > 0 && (
        <p className="note">
          Also in your repertoire:{' '}
          {extra.map((san) => (
            <button
              key={san}
              type="button"
              className="link san"
              onClick={() => onPlay(san)}
            >
              {san} ★
            </button>
          ))}
        </p>
      )}
    </section>
  )
}
