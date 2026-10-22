import { GameState, MAX_MISTAKES } from './types';

// What each player's browser reports to the shared `results` data channel. Only outcomes are
// shared; X marks stay private.
export type ResultKind = 'correct' | 'wrong' | 'finished' | 'out';

export interface ResultPayload {
  gameKey: string;
  kind: ResultKind;
  found: number;
  mistakes: number;
}

// A results channel entry. `createdBy` and `createdAt` are set by the BBB server, so they
// cannot be faked by the sender.
export interface ResultEntry {
  entryId: string;
  createdBy: string;
  createdAt: string;
  payload: ResultPayload;
}

const KINDS: ResultKind[] = ['correct', 'wrong', 'finished', 'out'];
const isCount = (value: unknown) => Number.isInteger(value) && (value as number) >= 0;

export function readResult(raw: unknown): ResultPayload | null {
  const value = raw as Partial<ResultPayload> | undefined;
  if (!value || typeof value.gameKey !== 'string' || !KINDS.includes(value.kind)
    || !isCount(value.found) || !isCount(value.mistakes)) {
    return null;
  }
  return {
    gameKey: value.gameKey, kind: value.kind, found: value.found, mistakes: value.mistakes,
  };
}

// The outcome a change in a player's own board reports, if any.
export function outcomeForChange(prev: GameState, next: GameState): ResultKind | null {
  if (prev === next) return null;
  if (next.status === 'won' && prev.status !== 'won') return 'finished';
  if (next.status === 'lost' && prev.status !== 'lost') return 'out';
  if (next.found > prev.found) return 'correct';
  if (next.mistakes > prev.mistakes) return 'wrong';
  return null;
}

// What every board shows about the shared race, published by the plugin manager.
export interface Standing {
  winnerName: string | null;
  iAmWinner: boolean;
  // The host may start a new game: someone has won, or everyone who played is out.
  canStartNew: boolean;
}

export const NO_STANDING: Standing = { winnerName: null, iAmWinner: false, canStartNew: false };

// Server order: earliest first, entry id as a tie-break.
export const byTime = (a: ResultEntry, b: ResultEntry) => (
  Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.entryId.localeCompare(b.entryId)
);

// [REVIEW REQUIRED] Integrity: anyone can write to the results channel. Only results that are
// a legal next step for that player count: found or wrong guesses go up by exactly one, a
// finish needs everyone found, being out needs MAX_MISTAKES wrong guesses, and nothing counts
// after a player has finished or is out. So a reload cannot restart a player, a finished player
// cannot win twice, and one player can cause at most size + MAX_MISTAKES chat lines per game.
export function acceptedResults(
  entries: ResultEntry[],
  gameKey: string,
  size: number,
): ResultEntry[] {
  const players = new Map<string, { found: number; mistakes: number; done: boolean }>();
  return entries
    .filter((entry) => entry.payload.gameKey === gameKey)
    .sort(byTime)
    .filter((entry) => {
      const state = players.get(entry.createdBy) ?? { found: 0, mistakes: 0, done: false };
      const { kind, found, mistakes } = entry.payload;
      const nextFound = found === state.found + 1 && mistakes === state.mistakes;
      const nextMistake = mistakes === state.mistakes + 1 && found === state.found;
      const legal = !state.done && (
        (kind === 'correct' && nextFound && found < size)
        || (kind === 'finished' && nextFound && found === size)
        || (kind === 'wrong' && nextMistake && mistakes < MAX_MISTAKES)
        || (kind === 'out' && nextMistake && mistakes === MAX_MISTAKES));
      if (legal) {
        players.set(entry.createdBy, {
          found, mistakes, done: kind === 'finished' || kind === 'out',
        });
      }
      return legal;
    });
}

function finishers(entries: ResultEntry[], gameKey: string): string[] {
  const order: string[] = [];
  entries
    .filter((e) => e.payload.gameKey === gameKey && e.payload.kind === 'finished')
    .sort(byTime)
    .forEach((e) => { if (!order.includes(e.createdBy)) order.push(e.createdBy); });
  return order;
}

// The first player to find everyone, by the server's clock. Null until someone finishes.
export function findWinner(entries: ResultEntry[], gameKey: string): string | null {
  return finishers(entries, gameKey)[0] ?? null;
}

// 1 for the winner, 2 for second, ...; 0 if the player has not finished.
export function finishRank(entries: ResultEntry[], gameKey: string, userId: string): number {
  return finishers(entries, gameKey).indexOf(userId) + 1;
}

// True when at least one player has guessed, and every player who has guessed is out.
// Players who never guessed are not counted: they may not be playing at all.
export function everyoneOut(entries: ResultEntry[], gameKey: string): boolean {
  const players = new Map<string, boolean>();
  entries.filter((e) => e.payload.gameKey === gameKey).forEach((e) => {
    players.set(e.createdBy, players.get(e.createdBy) || e.payload.kind === 'out');
    if (e.payload.kind === 'finished') players.set(e.createdBy, false);
  });
  return players.size > 0 && [...players.values()].every(Boolean);
}

// Chat renders Markdown; names are escaped so a display name cannot become a link or formatting.
export function escapeMarkdown(text: string): string {
  return text.replace(/([\\`*_{}[\]()#+\-.!|>~<])/g, '\\$1');
}

function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
}

// One public chat line per outcome. It never says which person was found or where.
export function chatLineFor(
  kind: ResultKind,
  playerName: string,
  { found, mistakes, size }: { found: number; mistakes: number; size: number },
  rank: number,
): string {
  const name = escapeMarkdown(playerName);
  switch (kind) {
    case 'correct': return `✅ ${name} found a hidden person (${found}/${size})`;
    case 'wrong': return `❌ ${name} guessed wrong (${mistakes} of ${MAX_MISTAKES})`;
    case 'out': return `🚫 ${name} is out after ${MAX_MISTAKES} wrong guesses`;
    default: return rank === 1
      ? `🏆 ${name} found everyone first and wins!`
      : `🎉 ${name} found everyone (${ordinal(rank)})`;
  }
}

// Posted to public chat when a game starts.
export function instructionsChat(size: number): string {
  return [
    `🔎 **Hide and Go Seek** has started: ${size} x ${size} grid.`,
    `People from this meeting are hidden in the grid. Everyone has the same puzzle; the first to find all ${size} people wins.`,
    '• Each row, column and colour has exactly one person, and people never touch, not even corner to corner.',
    '• Click a square to mark an X where no one can be. Double-click a square when you think someone is there.',
    '• Keyboard: arrow keys to move, Space to mark, G to guess. On a touch screen: tap to mark, press and hold to guess.',
    `• You are out after ${MAX_MISTAKES} wrong guesses.`,
  ].join('\n');
}
