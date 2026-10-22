import { PUZZLE_BANK_DATA } from './puzzle-bank';
import { randomInt } from './rng';
import {
  MAX_SIZE, MIN_SIZE, Puzzle, Rng,
} from './types';

// Pre-built puzzles, made by `npm run puzzles`. Building large ones live is too slow.
export const PUZZLE_BANK: Record<number, string[]> = PUZZLE_BANK_DATA;

// Format: region digits per row (base 36), rows joined by '/', then ':' and the solution columns.
export function encodePuzzle(puzzle: Puzzle): string {
  const rows = puzzle.regions.map((row) => row.map((region) => region.toString(36)).join(''));
  const solution = puzzle.solution.map((col) => col.toString(36)).join('');
  return `${rows.join('/')}:${solution}`;
}

export function decodePuzzle(encoded: string): Puzzle {
  const [rows, solution] = encoded.split(':');
  const regions = rows.split('/').map((row) => [...row].map((digit) => parseInt(digit, 36)));
  const columns = [...solution].map((digit) => parseInt(digit, 36));
  return { size: regions.length, regions, solution: columns };
}

// The 8 rotations and mirror images of a square. Each keeps every puzzle rule intact.
const SYMMETRIES: ((r: number, c: number, last: number) => [number, number])[] = [
  (r, c) => [r, c],
  (r, c, last) => [c, last - r],
  (r, c, last) => [last - r, last - c],
  (r, c, last) => [last - c, r],
  (r, c, last) => [r, last - c],
  (r, c, last) => [last - r, c],
  (r, c) => [c, r],
  (r, c, last) => [last - c, last - r],
];

function transform(puzzle: Puzzle, symmetry: number): Puzzle {
  const { size } = puzzle;
  const move = (r: number, c: number) => SYMMETRIES[symmetry](r, c, size - 1);
  const regions = Array.from({ length: size }, () => Array(size).fill(0));
  const solution = Array(size).fill(0);
  // Region r must belong to the person in row r, so regions are renumbered after moving.
  const renumber = Array(size).fill(0);
  puzzle.solution.forEach((col, row) => {
    const [newRow, newCol] = move(row, col);
    solution[newRow] = newCol;
    renumber[puzzle.regions[row][col]] = newRow;
  });
  puzzle.regions.forEach((cells, r) => cells.forEach((region, c) => {
    const [newRow, newCol] = move(r, c);
    regions[newRow][newCol] = renumber[region];
  }));
  return { size, regions, solution };
}

export function pickPuzzle(size: number, rng: Rng): Puzzle {
  if (!Number.isInteger(size) || size < MIN_SIZE || size > MAX_SIZE) {
    throw new Error(`Grid size must be ${MIN_SIZE}-${MAX_SIZE}, got ${size}`);
  }
  const bank = PUZZLE_BANK[size];
  const puzzle = decodePuzzle(bank[randomInt(rng, bank.length)]);
  return transform(puzzle, randomInt(rng, SYMMETRIES.length));
}
