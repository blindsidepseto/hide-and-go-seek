import {
  decodePuzzle, encodePuzzle, pickPuzzle, PUZZLE_BANK,
} from './puzzles';
import { createRng } from './rng';
import { puzzleProblems } from './test-helpers';
import { MAX_SIZE, MIN_SIZE } from './types';

const SIZES = Array.from({ length: MAX_SIZE - MIN_SIZE + 1 }, (_, i) => MIN_SIZE + i);

describe('puzzle bank', () => {
  SIZES.forEach((size) => {
    it(`Given the bank for ${size}x${size}, then it holds at least 20 puzzles, all valid with one solution`, () => {
      const puzzles = PUZZLE_BANK[size].map(decodePuzzle);
      expect(puzzles.length).toBeGreaterThanOrEqual(20);
      puzzles.forEach((puzzle) => {
        expect(puzzle.size).toBe(size);
        expect(puzzleProblems(puzzle)).toEqual([]);
      });
    });
  });

  it('Given a puzzle, when it is encoded and decoded, then it is unchanged', () => {
    const puzzle = decodePuzzle(PUZZLE_BANK[15][0]);
    expect(decodePuzzle(encodePuzzle(puzzle))).toEqual(puzzle);
  });
});

describe('pickPuzzle', () => {
  SIZES.forEach((size) => {
    it(`Given size ${size}, when a puzzle is picked with random rotation/mirroring, then it is still valid with one solution`, () => {
      [1, 2, 3, 4, 5, 6, 7, 8].forEach((seed) => {
        const puzzle = pickPuzzle(size, createRng(seed));
        expect(puzzle.size).toBe(size);
        expect(puzzleProblems(puzzle)).toEqual([]);
      });
    });
  });

  it('Given many picks, then players do not keep seeing the same board', () => {
    const boards = new Set(
      [...Array(30).keys()].map((seed) => JSON.stringify(pickPuzzle(8, createRng(seed)).regions)),
    );
    expect(boards.size).toBeGreaterThan(20);
  });

  it('Given a size outside 8-15, then it throws', () => {
    expect(() => pickPuzzle(7, createRng(1))).toThrow();
    expect(() => pickPuzzle(16, createRng(1))).toThrow();
  });
});
