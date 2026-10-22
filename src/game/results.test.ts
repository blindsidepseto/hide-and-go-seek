import {
  chatLineFor, escapeMarkdown, everyoneOut, finishRank, findWinner, instructionsChat,
  outcomeForChange, readResult, ResultEntry,
} from './results';
import { createGame, guess } from './rules';
import { Puzzle } from './types';

const entry = (
  entryId: string,
  createdBy: string,
  createdAt: string,
  kind: string,
  gameKey = 'g1',
): ResultEntry => ({
  entryId,
  createdBy,
  createdAt,
  payload: {
    gameKey, kind, found: 0, mistakes: 0,
  },
} as ResultEntry);

describe('readResult', () => {
  it('Given a well-formed result, then it is accepted', () => {
    expect(readResult({
      gameKey: 'g1', kind: 'wrong', found: 1, mistakes: 2,
    })).toEqual({
      gameKey: 'g1', kind: 'wrong', found: 1, mistakes: 2,
    });
  });

  it('Given an unknown kind, missing fields or junk, then it is rejected', () => {
    expect(readResult({
      gameKey: 'g1', kind: 'hacked', found: 1, mistakes: 0,
    })).toBeNull();
    expect(readResult({ gameKey: 'g1', kind: 'wrong' })).toBeNull();
    expect(readResult(undefined)).toBeNull();
    expect(readResult({
      gameKey: 'g1', kind: 'wrong', found: -1, mistakes: 0,
    })).toBeNull();
  });
});

describe('findWinner and finishRank', () => {
  const entries = [
    entry('3', 'sam', '2026-10-22T10:00:05Z', 'finished'),
    entry('1', 'alex', '2026-10-22T10:00:03Z', 'finished'),
    entry('2', 'kai', '2026-10-22T10:00:01Z', 'correct'),
    entry('0', 'old', '2026-10-22T09:00:00Z', 'finished', 'previous-game'),
  ];

  it('Given Sam finished after Alex, then Alex is the winner, whatever order the entries arrive in', () => {
    expect(findWinner(entries, 'g1')).toBe('alex');
  });

  it('Given finishers, then each has their finishing place', () => {
    expect(finishRank(entries, 'g1', 'alex')).toBe(1);
    expect(finishRank(entries, 'g1', 'sam')).toBe(2);
    expect(finishRank(entries, 'g1', 'kai')).toBe(0);
  });

  it('Given only results from another game, then there is no winner', () => {
    expect(findWinner(entries, 'g2')).toBeNull();
  });
});

describe('everyoneOut', () => {
  it('Given every player who has guessed is out and nobody finished, then everyone is out', () => {
    expect(everyoneOut([
      entry('1', 'alex', '2026-10-22T10:00:01Z', 'wrong'),
      entry('2', 'alex', '2026-10-22T10:00:02Z', 'out'),
      entry('3', 'sam', '2026-10-22T10:00:03Z', 'out'),
    ], 'g1')).toBe(true);
  });

  it('Given one player is still playing, or nobody has guessed, then not everyone is out', () => {
    expect(everyoneOut([
      entry('1', 'alex', '2026-10-22T10:00:01Z', 'out'),
      entry('2', 'sam', '2026-10-22T10:00:02Z', 'wrong'),
    ], 'g1')).toBe(false);
    expect(everyoneOut([], 'g1')).toBe(false);
  });
});

describe('outcomeForChange', () => {
  const puzzle: Puzzle = {
    size: 8,
    regions: Array.from({ length: 8 }, (_, r) => Array(8).fill(r)),
    solution: [0, 2, 4, 6, 1, 3, 5, 7],
  };
  const start = createGame(puzzle);

  it('Given a correct guess, a wrong guess, the last person found or the 3rd wrong guess, then the matching outcome', () => {
    expect(outcomeForChange(start, guess(start, 0, 0))).toBe('correct');
    expect(outcomeForChange(start, guess(start, 0, 1))).toBe('wrong');
    const two = guess(guess(start, 0, 1), 0, 2);
    expect(outcomeForChange(two, guess(two, 0, 3))).toBe('out');
    let game = start;
    puzzle.solution.slice(0, 7).forEach((col, row) => { game = guess(game, row, col); });
    expect(outcomeForChange(game, guess(game, 7, 7))).toBe('finished');
  });

  it('Given only an X was marked, or nothing changed, then there is no outcome to report', () => {
    const marked = { ...start, marks: start.marks.map((row) => [...row]) };
    marked.marks[0][1] = 'x';
    expect(outcomeForChange(start, marked)).toBeNull();
    expect(outcomeForChange(start, start)).toBeNull();
  });
});

describe('chat lines', () => {
  it('Given each outcome, then the chat line names the player but never where anyone is hidden', () => {
    expect(chatLineFor('correct', 'Alex', { found: 3, mistakes: 0, size: 8 }, 0))
      .toBe('✅ Alex found a hidden person (3/8)');
    expect(chatLineFor('wrong', 'Alex', { found: 3, mistakes: 2, size: 8 }, 0))
      .toBe('❌ Alex guessed wrong (2 of 3)');
    expect(chatLineFor('out', 'Sam', { found: 1, mistakes: 3, size: 8 }, 0))
      .toBe('🚫 Sam is out after 3 wrong guesses');
    expect(chatLineFor('finished', 'Alex', { found: 8, mistakes: 0, size: 8 }, 1))
      .toBe('🏆 Alex found everyone first and wins!');
    expect(chatLineFor('finished', 'Sam', { found: 8, mistakes: 1, size: 8 }, 2))
      .toBe('🎉 Sam found everyone (2nd)');
    expect(chatLineFor('finished', 'Kai', { found: 8, mistakes: 1, size: 8 }, 3))
      .toBe('🎉 Kai found everyone (3rd)');
  });

  it('Given a name containing chat formatting, then it is shown as plain text, not a link', () => {
    const escaped = escapeMarkdown('[click](http://x.example) *bold*');
    ['\\[', '\\]', '\\(', '\\)', '\\*'].forEach((sequence) => expect(escaped).toContain(sequence));
    expect(escaped).not.toMatch(/(^|[^\\])[[\]()*]/);
    expect(chatLineFor('correct', '[click](http://x.example)', { found: 1, mistakes: 0, size: 8 }, 0))
      .toContain('\\[click\\]\\(');
  });

  it('Given a new game, then the chat instructions explain the goal, the rules and the controls', () => {
    const text = instructionsChat(10);
    expect(text).toContain('Hide and Go Seek');
    expect(text).toContain('10 x 10');
    expect(text).toMatch(/row, column and colour/);
    expect(text).toMatch(/touch/);
    expect(text).toMatch(/double-click/i);
    expect(text).toMatch(/3 wrong guesses/);
    expect(text).toMatch(/first/i);
  });
});
