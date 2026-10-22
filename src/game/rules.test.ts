import { createGame, guess, toggleMark } from './rules';
import { Puzzle } from './types';

// 8x8 puzzle where person r sits at solution[r]; regions are not needed by the rules.
const puzzle: Puzzle = {
  size: 8,
  regions: Array.from({ length: 8 }, (_, r) => Array(8).fill(r)),
  solution: [0, 2, 4, 6, 1, 3, 5, 7],
};

describe('game rules', () => {
  it('Given a new game, then no squares are marked and it is playing', () => {
    const game = createGame(puzzle);
    expect(game.marks.flat().every((m) => m === 'empty')).toBe(true);
    expect(game).toMatchObject({ mistakes: 0, found: 0, status: 'playing' });
  });

  it('Given an empty square, when the player single-clicks it twice, then the X is added then removed', () => {
    const once = toggleMark(createGame(puzzle), 0, 1);
    expect(once.marks[0][1]).toBe('x');
    expect(toggleMark(once, 0, 1).marks[0][1]).toBe('empty');
  });

  it('Given a hidden person, when the player guesses that square, then the person is found', () => {
    const game = guess(createGame(puzzle), 0, 0);
    expect(game.marks[0][0]).toBe('found');
    expect(game.found).toBe(1);
    expect(game.mistakes).toBe(0);
  });

  it('Given a square marked X that hides a person, when the player guesses it, then the person is found', () => {
    const game = guess(toggleMark(createGame(puzzle), 0, 0), 0, 0);
    expect(game.marks[0][0]).toBe('found');
  });

  it('Given an empty square, when the player guesses it, then a red X shows and a mistake is counted', () => {
    const game = guess(createGame(puzzle), 0, 1);
    expect(game.marks[0][1]).toBe('wrong');
    expect(game.mistakes).toBe(1);
    expect(game.status).toBe('playing');
  });

  it('Given an already revealed square, when the player clicks or guesses it again, then nothing changes', () => {
    const found = guess(createGame(puzzle), 0, 0);
    expect(guess(found, 0, 0)).toBe(found);
    expect(toggleMark(found, 0, 0)).toBe(found);
    const wrong = guess(createGame(puzzle), 0, 1);
    expect(guess(wrong, 0, 1)).toBe(wrong);
    expect(toggleMark(wrong, 0, 1)).toBe(wrong);
  });

  it('Given 2 wrong guesses, then the game is still playing; when a 3rd is made, then the player is out', () => {
    let game = createGame(puzzle);
    [1, 2].forEach((c) => { game = guess(game, 0, c); });
    expect(game.mistakes).toBe(2);
    expect(game.status).toBe('playing');
    game = guess(game, 0, 3);
    expect(game.mistakes).toBe(3);
    expect(game.status).toBe('lost');
  });

  it('Given all but one person found, when the last is found, then the game is won', () => {
    let game = createGame(puzzle);
    puzzle.solution.forEach((c, r) => { game = guess(game, r, c); });
    expect(game.found).toBe(8);
    expect(game.status).toBe('won');
  });

  it('Given a finished game, when the player clicks or guesses, then nothing changes', () => {
    let game = createGame(puzzle);
    [1, 2, 3].forEach((c) => { game = guess(game, 0, c); });
    expect(game.status).toBe('lost');
    expect(guess(game, 0, 0)).toBe(game);
    expect(toggleMark(game, 1, 1)).toBe(game);
  });
});
