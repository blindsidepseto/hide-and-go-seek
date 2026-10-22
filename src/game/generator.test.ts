import { generatePuzzle } from './generator';
import { createRng } from './rng';
import { puzzleProblems } from './test-helpers';

// Large sizes are slow to generate, so they are checked through the pre-built bank instead.
describe('generatePuzzle', () => {
  [8, 9, 10].forEach((size) => {
    [1, 2, 3].forEach((seed) => {
      it(`Given a ${size}x${size} grid (seed ${seed}), then every rule holds and there is exactly one solution`, () => {
        expect(puzzleProblems(generatePuzzle(size, createRng(seed * 7919 + size)))).toEqual([]);
      });
    });
  });

  it('Given a size outside 8-15, then it throws', () => {
    expect(() => generatePuzzle(7, createRng(1))).toThrow();
    expect(() => generatePuzzle(16, createRng(1))).toThrow();
  });
});
