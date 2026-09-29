# Quiddler ScoreSheet

A phone-first score sheet for the Quiddler card game. Type the words you played and it does the arithmetic, including the round bonuses. Scores survive a refresh, a backgrounded tab, and a dead signal at the table.

## Why it was rewritten

The previous version was a Streamlit app. Streamlit keeps session state in server memory tied to a websocket, so a refresh started a new session and lost the game. On a phone, switching to another app dropped the socket and did the same. That is the architecture, not a bug that could be patched, so the app was rebuilt local-first.

The rewrite also corrected the card values. Five of the 31 were wrong in the old reference, including E, which had its card count (12) sitting in the points column instead of its value (2). Every score calculated from that table was wrong. The values now live in one place, `src/lib/cards.ts`, and the reference screen derives its display from them rather than restating them.

The old app also said the game ran 10 rounds. It is 8. Round 1 deals 3 cards and each round deals one more, so the last round deals 10.

## Features

- **Word scoring.** Type a word and it becomes card chips with a running total. Double-letter cards are ambiguous, so "THIN" can be TH+IN for 16 or T+H+I+N for 17. Only you know which cards you held, so tap a chip to split it.
- **Automatic bonuses.** 10 points for most words and 10 for the longest word, computed across the whole table. Ties award nobody. Two-player games use one bonus.
- **Local-first persistence.** Every change is written to IndexedDB immediately, then synced. Scoring keeps working with no signal.
- **Game history.** Finished games are kept with final standings, the winner, and the full round grid.
- **Guest players.** Anyone at the table can play without an account.
- **Installs to the home screen.** It is a PWA.

## Stack

Next.js 16 (App Router), React 19, Tailwind CSS v4, TypeScript. Self-hosted Supabase for auth, storage, and cross-device sync.

Tailwind v4 is CSS-first. Theme tokens live in the `@theme` block in `src/app/globals.css`. There is no `tailwind.config.js`, by design.

## Running it

```sh
npm install
npm run dev
```

It runs with no backend configured. Auth and cross-device sync are unavailable in that mode and the app says so, but a full game can be scored start to finish and it persists locally. That is also how the test suite runs.

To connect a backend, copy `.env.example` to `.env.local` and fill it in.

## Tests

```sh
npm test         # unit tests
npm run test:e2e # end to end, WebKit on an iPhone viewport
```

The unit tests cover the scoring engine, including an assertion that the deck sums to 118 cards so a typo in the card table fails the build rather than silently mis-scoring a game.

The end to end tests run in WebKit because iOS Safari is where the original data loss was felt. They cover the refresh and backgrounded-tab cases directly.

## Layout

```
src/lib/cards.ts       Card values and deck composition. Single source of truth.
src/lib/score.ts       Scoring engine. Tokenizing, rounds, bonuses, standings.
src/lib/rules.ts       Reference content, derived from cards.ts.
src/lib/local/         IndexedDB and the outbox.
src/lib/sync/          Sync engine, realtime, and the useGame hook.
src/lib/db/            Supabase clients and row mappers.
src/components/        UI, split into game, entry, and setup.
src/app/               Routes.
supabase/migrations/   Schema and row level security.
e2e/                   Playwright tests.
```

## Deployment

The app is containerised and runs on a k3s cluster behind a Cloudflare Tunnel, against a self-hosted Supabase in the same cluster. It reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` at runtime, so one image works in any environment.

The anon key is public by design. It is only safe because row level security is correct, which is why `supabase/migrations/0002_quiddler_rls.sql` is written the way it is.

## Credits

Copyright © 2026 TechTales w/ Luwah. MIT licensed.

Quiddler is a trademark of Cannei, LLC. This is an unofficial score keeping tool and is not affiliated with or endorsed by the publisher.
