# Chess Opening Learner

A web app for practicing chess opening theory interactively, for players of every level.

This is Phase 0 of the roadmap: a React + TypeScript app with a playable board. Coming next are an opening explorer, a practice mode that drills your repertoire, and spaced-repetition progress tracking with optional accounts.

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

## License

GPL-3.0-or-later. See [LICENSE](LICENSE).
