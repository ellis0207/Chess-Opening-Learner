# Chess Opening Learner

A web app for practicing chess opening theory interactively, for players of every level.

**Try it:** https://ellis0207.github.io/Chess-Opening-Learner/ (deployed from `main` by GitHub Actions). It can be installed as an app and works offline once loaded.

The app opens on a menu with six parts:

- **Lessons:** guided lessons for the popular openings, each covering every variation of the opening (from 20 to over 100 per lesson). You play your side from memory while the app plays the opponent's moves; there are no arrows. A wrong move gets a Chess.com-style explanation of why it doesn't work (from Stockfish, running in the browser) and you try again. The hint button highlights the piece to move without showing where it goes. When the opponent leaves the main line, the app tells you which variation you've entered. A variation counts as learned only once you play it without mistakes or hints, and that unlocks the next one; learned lines go into your Review schedule. All lessons are open from the start.
- **Explore:** play moves or pick a book move to see the opening's name and the named variations that continue from the position, and step back and forth through the line.
- **Practice:** from any position in the explorer, the app plays the opponent's book moves (main lines more often than sidelines) and you find yours, as White or Black, for a few moves or until theory runs out. Wrong moves are taken back and the pieces that play the book moves are highlighted.

- **Repertoire:** build your own White and Black repertoires by adding lines from the explorer (one move of yours per position, any number of opponent replies), with a note on each move. Import PGN files with variations (comments become notes) and export them back. Practice can drill your repertoire instead of the whole book, and reviews use your repertoire move where you have one.
- **Review:** every position you answer in practice is scheduled with spaced repetition (SM-2). Positions you get right first time come back after growing intervals (1 day, 3 days, then longer); misses come back the next day. The Review tab shows how many are due.
- **Progress:** positions learned and mastered, due reviews, day streak, accuracy, and your most-missed positions. Progress is stored in the browser (IndexedDB); download a backup to keep it safe or move it to another device.

Moves can be played by dragging or clicking pieces, or by typing them (`Nf3`, `0-0`, `g1f3`), and the last move is announced to screen readers.

## Stack

- [React](https://react.dev) + TypeScript, built with [Vite](https://vite.dev)
- [chess.js](https://github.com/jhlywa/chess.js) for move rules
- [chessground](https://github.com/lichess-org/chessground) for the board
- [Stockfish](https://stockfishchess.org) for move explanations (in the browser) and for building the lessons
- [Dexie](https://dexie.org) (IndexedDB) for progress and repertoires
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app) for the installable, offline app
- [Vitest](https://vitest.dev) for tests, [oxlint](https://oxc.rs) and [Prettier](https://prettier.io) for linting and formatting

## Development

Requires Node 22.

```sh
npm install
npm run dev          # start the dev server
npm test             # run unit tests
npm run lint         # lint
npm run format       # format with Prettier
npm run build        # type-check and build for production
```

## Opening data

Opening names come from the [Lichess chess-openings](https://github.com/lichess-org/chess-openings) dataset (CC0). `npm run import-openings` downloads it, builds the opening tree, and writes `src/openings/tree.json`, which is committed so the app and its tests work offline. Rerun it to pick up dataset updates.

## Lesson data

`src/lessons/catalog.ts` lists the lessons: the side you play and the moves that define each opening. `npm run build-lessons [ids...]` grows each one into its variations and writes `src/lessons/data/`: the opponent plays every book reply from the openings dataset, Stockfish picks your best move (preferring book moves) and adds the opponent's best tries where the book thins out, and every line is carried on to a middlegame position. It needs a native Stockfish binary (`apt install stockfish`, or set `STOCKFISH=/path/to/stockfish`) and takes a couple of hours for all lessons; results are cached in `node_modules/.cache`. The generated files are committed.

The in-browser engine is the single-threaded lite build of [Stockfish.js](https://github.com/nmrugg/stockfish.js) (GPL-3.0), loaded the first time a lesson opens.

## License

GPL-3.0-or-later. See [LICENSE](LICENSE).
