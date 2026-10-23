# Chess Opening Learner

A web app for practicing chess opening theory interactively, for players of every level.

The app has five parts:

- **Explore:** play moves or pick a book move to see the opening's name and the named variations that continue from the position, and step back and forth through the line.
- **Practice:** from any position in the explorer, the app plays the opponent's book moves (main lines more often than sidelines) and you find yours, as White or Black, for a few moves or until theory runs out. Wrong moves are taken back and the book moves are shown as arrows.

- **Repertoire:** build your own White and Black repertoires by adding lines from the explorer (one move of yours per position, any number of opponent replies), with a note on each move. Import PGN files with variations (comments become notes) and export them back. Practice can drill your repertoire instead of the whole book, and reviews use your repertoire move where you have one.
- **Review:** every position you answer in practice is scheduled with spaced repetition (SM-2). Positions you get right first time come back after growing intervals (1 day, 3 days, then longer); misses come back the next day. The Review tab shows how many are due.
- **Progress:** positions learned and mastered, due reviews, day streak, accuracy, and your most-missed positions. Progress is stored in the browser (IndexedDB); download a backup to keep it safe or move it to another device.

## Stack

- [React](https://react.dev) + TypeScript, built with [Vite](https://vite.dev)
- [chess.js](https://github.com/jhlywa/chess.js) for move rules
- [chessground](https://github.com/lichess-org/chessground) for the board
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

## License

GPL-3.0-or-later. See [LICENSE](LICENSE).
