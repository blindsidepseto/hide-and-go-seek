import { randomInt, shuffle } from './rng';
import { findSolutions } from './solver';
import {
  MAX_SIZE, MIN_SIZE, Puzzle, Rng,
} from './types';

const SIDES = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// One person per row and column, never touching the person in the row above.
function placePeople(size: number, rng: Rng): number[] {
  const placement: number[] = [];
  const used = new Array(size).fill(false);
  const place = (row: number): boolean => {
    if (row === size) return true;
    const columns = shuffle([...Array(size).keys()], rng);
    return columns.some((col) => {
      if (used[col] || (row > 0 && Math.abs(placement[row - 1] - col) <= 1)) return false;
      used[col] = true;
      placement.push(col);
      if (place(row + 1)) return true;
      placement.pop();
      used[col] = false;
      return false;
    });
  };
  place(0);
  return placement;
}

// Each region starts as its person's square and grows one square at a time. A square is only
// kept if the puzzle still has exactly one answer. Adding squares can only add answers, so a
// square refused once stays refused, and the finished puzzle is unique by construction.
function tryGenerate(size: number, rng: Rng): Puzzle | null {
  const solution = placePeople(size, rng);
  const regions = Array.from({ length: size }, () => Array(size).fill(-1));
  solution.forEach((col, row) => { regions[row][col] = row; });
  const refused = new Set<string>();
  let unassigned = size * size - size;

  while (unassigned > 0) {
    const options: [number, number, number][] = [];
    regions.forEach((cells, r) => cells.forEach((region, c) => {
      if (region !== -1) return;
      SIDES.forEach(([dr, dc]) => {
        const neighbour = regions[r + dr]?.[c + dc];
        if (neighbour !== undefined && neighbour >= 0 && !refused.has(`${r},${c},${neighbour}`)) {
          options.push([r, c, neighbour]);
        }
      });
    }));
    if (options.length === 0) return null;
    const [r, c, region] = options[randomInt(rng, options.length)];
    regions[r][c] = region;
    if (findSolutions(regions, 2).length > 1) {
      regions[r][c] = -1;
      refused.add(`${r},${c},${region}`);
    } else {
      unassigned -= 1;
    }
  }
  return { size, regions, solution };
}

// Builds a puzzle with exactly one solution, so it can always be solved by elimination.
// Slow and unpredictable for large grids, so it is run ahead of time to fill the puzzle bank.
export function generatePuzzle(size: number, rng: Rng): Puzzle {
  if (!Number.isInteger(size) || size < MIN_SIZE || size > MAX_SIZE) {
    throw new Error(`Grid size must be ${MIN_SIZE}-${MAX_SIZE}, got ${size}`);
  }
  for (;;) {
    const puzzle = tryGenerate(size, rng);
    if (puzzle) return puzzle;
  }
}
