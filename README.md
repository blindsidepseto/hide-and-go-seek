# Hide and Go Seek — BigBlueButton plugin

A logic puzzle race shown in the whiteboard area. People from the meeting are hidden in a coloured grid (8×8 to 15×15), and everyone races to find them all:

- each row, column and colour holds exactly one person
- people never touch, not even diagonally
- click a square to mark an X, double-click to guess
- keyboard: arrow keys move, Space marks an X, G guesses; touch: tap marks an X, press and hold guesses
- the 3rd wrong guess ends that player's game

## How a game runs

1. The presenter or a moderator opens **Hide and Go Seek** from the **Apps Gallery** and picks the grid size.
2. Every participant gets their own board with the **same puzzle**, starting with a "How to play" card. The instructions are also posted to public chat.
3. Every correct guess, wrong guess, finish and player knocked out is announced in public chat. Announcements never say who was found or where.
4. The **first player to find everyone wins**. Every board shows the winner; others can keep playing.
5. Once there is a winner, or everyone who played is out, the host can press **New game**. **End game for everyone** puts the whiteboard back at any time, and the Apps Gallery entry starts a game again later.

## Sounds

Each event has its own short sound, generated in the browser (no sound files): marking an X, removing an X, a correct guess, a wrong guess, being out, and a winner fanfare (only on the winner's board). Each player can mute sounds with the speaker button; the choice is remembered in that browser.

## Accessibility

- Colours meet **WCAG 2.1 AA**: text at least 4.5:1, and region borders, marks and the focus ring at least 3:1 against every region colour. An automated test (`src/components/styles.test.ts`) checks every pair.
- Regions are separated by thick borders, and a wrong guess (circled X) differs from an X mark by shape, so colour is never the only cue.
- Full keyboard play with a visible focus ring; each square announces its state to screen readers.

## Compatibility

Built for **BigBlueButton 4.0.0 and 4.1** (plugin SDK `1.0.0-beta.3`, `html5PluginSdkVersion` in `bigbluebutton.properties`). The manifest accepts any SDK in the range `^1.0.0-beta.3`: later 1.0.0 pre-releases, 1.0.0 and later 1.x. BBB refuses it on other major lines, including the 0.1.x SDK used by the 4.0 release candidates and by the stale `v4.1.x-release` branch.

## Privacy

- Starting a game writes the chosen participants' names and avatar links to the plugin's `game` data channel. BBB keeps that entry on its server, and sends it to anyone who joins later, until **End game for everyone** clears it or a new game replaces it.
- People are picked from the user list of whoever starts the game, even if the moderator has hidden the user list. Bots and people who have already left are never used. While the list is hidden, BBB may give students (including a student presenter) a shorter list, so a student-started game may hold fewer real people. Students may also see classmates as initials instead of avatars, because an avatar is only shown when it appears in their own list. (Not yet checked on a live BBB 4.0 server.)
- An avatar is only shown if it matches the link BBB itself reports for that user, so a game cannot make participants' browsers load images from other servers.
- Each player's outcomes (correct, wrong, finished, out) are written to the plugin's `results` data channel. The game creator's browser posts them to **public chat**, under the creator's name, with the player's name. Public chat is kept for the meeting and is included in recordings. The results channel is cleared when a new game starts or the game is ended.
- The plugin sends nothing outside BBB.

## Known limits

- Chat volume: every guess by every player is a chat line, roughly 300 lines for 30 students in one game. Each player can cause at most grid size + 3 lines per game: a result only counts if it moves that player forward.
- If the game creator leaves mid-game, chat announcements stop for that game. Another moderator can start a new game.
- Any participant can write to the results channel, so a technically skilled student could fake a finish by sending a believable sequence of results. The chat shows the real sender's name. A player who is out, or has already finished, can't come back by reloading the page. A player who reloads mid-game starts a fresh board; their results count again once they pass their earlier progress.

## Development

```bash
npm install
npm test            # unit and component tests
npm run lint
npm start           # dev server on port 4701, manifest at /manifest.json
npm run build-bundle   # dist/HideAndGoSeek.js + dist/manifest.json
```

Enable in a meeting with the `/create` parameter:

```
pluginManifests=[{"url":"https://<your-host>/plugins/hideAndGoSeek/manifest.json"}]
```

## Puzzle bank

Puzzles are generated ahead of time, because building a single-answer 15×15 puzzle live can take minutes. `src/game/puzzle-bank.ts` holds 20 per size, and each game applies a random rotation or mirror image. To regenerate (takes a while):

```bash
npm run puzzles
```
