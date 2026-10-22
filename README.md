# Find the People — BigBlueButton plugin

A single-player logic puzzle shown in the whiteboard area. People from the meeting are hidden in a coloured grid (8×8 to 15×15):

- each row, column and colour holds exactly one person
- people never touch, not even diagonally
- click a square to mark an X, double-click to guess
- 3 mistakes are allowed; the 4th ends the game

The presenter or a moderator starts a game from the **Apps Gallery** ("Find the People") and picks the grid size. Every participant then gets their own private copy of the same puzzle, with a "How to play" card first. **End game for everyone** puts the whiteboard back.

## Compatibility

Built for **BigBlueButton 4.0.0**, which requires plugin SDK `1.0.0-beta.3` (`html5PluginSdkVersion` in `bigbluebutton.properties`). The 4.0 release candidates used SDK 0.1.x and are not supported.

## Privacy

- Starting a game writes the chosen participants' names and avatar links to the plugin's `game` data channel. BBB keeps that entry on its server, and sends it to anyone who joins later, until **End game for everyone** clears it or a new game replaces it.
- People are picked from the user list of whoever starts the game, even if the moderator has hidden the user list. Bots and people who have already left are never used. While the list is hidden, BBB may give students (including a student presenter) a shorter list, so a student-started game may hold fewer real people. Students may also see classmates as initials instead of avatars, because an avatar is only shown when it appears in their own list. (Not yet checked on a live BBB 4.0 server.)
- An avatar is only shown if it matches the link BBB itself reports for that user, so a game cannot make participants' browsers load images from other servers.
- The plugin sends nothing outside BBB.

## Development

```bash
npm install
npm test            # unit and component tests
npm run lint
npm start           # dev server on port 4701, manifest at /manifest.json
npm run build-bundle   # dist/FindThePeople.js + dist/manifest.json
```

Enable in a meeting with the `/create` parameter:

```
pluginManifests=[{"url":"https://<your-host>/plugins/find-the-people/manifest.json"}]
```

## Puzzle bank

Puzzles are generated ahead of time, because building a single-answer 15×15 puzzle live can take minutes. `src/game/puzzle-bank.ts` holds 20 per size, and each game applies a random rotation or mirror image. To regenerate (takes a while):

```bash
npm run puzzles
```
