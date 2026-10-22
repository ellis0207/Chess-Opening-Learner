# Chess Opening Learner

A web app for practicing chess opening theory interactively, for players of every level.

The app currently has an opening explorer: play moves or pick a book move to see the opening's name, the named variations that continue from the position, and step back and forth through the line. Coming next are a practice mode that drills your repertoire and spaced-repetition progress tracking with optional accounts.

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
