# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Hide and Go Seek is a BigBlueButton (BBB) HTML5 client plugin: a logic-puzzle race shown in the whiteboard area, where meeting participants are hidden in a coloured grid. See README.md for the game rules, privacy notes and accessibility status.

## Commands

```bash
npm ci
npm test                                  # Jest (jsdom), all tests
npx jest src/game/rules.test.ts           # one file
npx jest src/game/rules.test.ts -t 'out'  # tests whose name matches
npm run lint                              # ESLint (airbnb + TS rules; max line length 100)
npx tsc --noEmit -p .                     # type check
npm run build-bundle                      # dist/HideAndGoSeek.js + dist/manifest.json
npm start                                 # webpack dev server on :4701, manifest at /manifest.json
npm run puzzles                           # regenerate src/game/puzzle-bank.ts (slow: ~10 min, mostly 14x14/15x15)
```

## Target and releases

- Built against `bigbluebutton-html-plugin-sdk` **1.0.0-beta.3**, which is what BBB 4.0.0 requires (`html5PluginSdkVersion`). The SDK README's version table (0.1.x for 4.0) is out of date; BBB's own `bigbluebutton.properties` is the source of truth. `manifest.json` accepts `^1.0.0-beta.3` (BBB checks it with npm-style semver).
- **Bump `version` in package.json for every release.** The webpack copy step writes it into `dist/manifest.json`, and BBB appends `?version=<version>` to the plugin script URL, which is the only cache-busting (the plugin files are served without `Cache-Control`).
- Releases are GitHub pre-releases with `dist/HideAndGoSeek.js` and `dist/manifest.json` attached.

## Architecture

**Two layers.** `src/game/` is pure, framework-free logic with exhaustive unit tests. `src/components/` is React UI, and `src/components/plugin-manager/component.tsx` is the only place that talks to the BBB SDK.

**Plugin manager (BBB wiring).** It registers the Apps Gallery entry (presenter or moderator only), subscribes to users over GraphQL (`useCustomSubscription` on `user`, for names and avatars), and uses two data channels declared in `manifest.json`:
- `game` (`LATEST_ITEM`; only presenter or moderator can push): one entry per game. Its server-assigned `entryId` is the game's key.
- `results` (`ALL_ITEMS`; anyone can push): each player's outcomes (correct, wrong, finished, out). Only the browser of the user who created the game (`hostUserId` in the payload) posts public chat lines, via `serverCommands.chat.sendPublicChatMessage`.

**Board content lives in separate React roots.** BBB mounts `GenericContentMainArea` content by calling `contentFunction(element)`, so the Board and SetupCard don't receive new props when plugin-manager state changes:
- Live values reach them through refs (`live`) and a tiny observable (`src/game/store.ts`, read with `useSyncExternalStore`).
- Re-registering content remounts the board, so per-game progress is kept in a `progress` map and restored via `savedState`.
- Every main-area item must use the same id (`mainAreaId(pluginUuid)`). BBB falls back to the whiteboard when one main-area item is swapped for another with a new id in a single step.

**Puzzles.** Generating a puzzle with exactly one solution live is too slow and unpredictable for large grids. Instead, `puzzle-bank.ts` holds 20 pre-generated puzzles per size (8–15), and `pickPuzzle` applies one of 8 rotations or mirror images and renumbers regions so that region `r` belongs to the person in row `r`. `solver.ts` (fewest-options-first backtracking) is also used to reject incoming puzzles that don't have exactly one solution.

**Untrusted input.** Everything read from data channels is validated:
- `session.ts` `readGamePayload`: puzzle structure and a unique solution. An avatar URL is only used if it equals the URL BBB itself reports for that user, and colours must be plain hex.
- `results.ts` `acceptedResults`: a result counts only if it moves that player forward, and nothing counts after a player finished or is out. The winner is the earliest accepted finish by server `createdAt`; finishes wait 1.5 s before being announced, in case an earlier one arrives late.

**Colours and dark mode.**
- `styles.ts` holds all colour tokens; `styles.test.ts` checks contrast (WCAG formula) and region-colour separation (CIEDE2000, `contrast.ts`).
- `region-colors.ts` assigns palette colours per board so touching regions differ most. It is deterministic, using rounded distances, so every player sees the same colours.
- BBB's dark theme (DarkReader) recolours inline colours on HTML elements but skips `svg`/`rect`/`path`. The grid lines, block colours and X are therefore drawn as SVG layers; the HTML grid and cells are transparent. Each cell isolates its own stacking context, so its colour layer (`z-index: -1`) stays under the focus outline.

**Sounds** are synthesised with the Web Audio API (`sounds.ts`); no audio files.

## Tests

- Test names follow Given/When/Then.
- The BBB SDK is mocked in `plugin-manager/component.test.tsx` (`fakeApi`, with separate fakes for the `game` and `results` channels). Use `mountMainArea()` to render what the plugin registered.
- `jest.setup.js` polyfills `PointerEvent` (jsdom has none) for the touch tests.
- The puzzle-bank and region-colour tests run the solver and colour assignment over every bank puzzle, including rotated ones, so they are the slowest.

## Deliberate product decisions

These were made knowingly, so don't undo them; they're recorded in the README:
- One uniform white grid with no separate block borders, which means the board does not meet WCAG 1.4.1 or AODA.
- A solid white X with no border.
- A player is out on the 3rd wrong guess.
- The first player to finish wins, and others keep playing.
- The hidden-user-list lock is ignored, so everyone can appear in the grid.
