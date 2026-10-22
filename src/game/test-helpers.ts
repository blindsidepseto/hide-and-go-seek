import { countSolutions } from './solver';
import { Puzzle } from './types';

function isContiguous(cells: [number, number][]): boolean {
  const key = (r: number, c: number) => `${r},${c}`;
  const remaining = new Set(cells.map(([r, c]) => key(r, c)));
  const stack = [cells[0]];
  remaining.delete(key(...cells[0]));
  while (stack.length) {
    const [r, c] = stack.pop();
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => {
      const k = key(r + dr, c + dc);
      if (remaining.has(k)) {
        remaining.delete(k);
        stack.push([r + dr, c + dc]);
      }
    });
  }
  return remaining.size === 0;
}

// Checks every placement rule. Returns a list of broken rules; empty means valid.
export function puzzleProblems(puzzle: Puzzle): string[] {
  const { size, regions, solution } = puzzle;
  const problems: string[] = [];
  if (regions.length !== size || regions.some((row) => row.length !== size)) problems.push('grid is not size x size');
  if (solution.length !== size || new Set(solution).size !== size) problems.push('not one person per row and column');
  for (let r = 1; r < size; r += 1) {
    if (Math.abs(solution[r] - solution[r - 1]) <= 1) problems.push(`people touch in rows ${r - 1}-${r}`);
  }
  for (let region = 0; region < size; region += 1) {
    const cells: [number, number][] = [];
    regions.forEach((row, r) => row.forEach((value, c) => {
      if (value === region) cells.push([r, c]);
    }));
    if (cells.length === 0) problems.push(`region ${region} is empty`);
    else if (!isContiguous(cells)) problems.push(`region ${region} is not contiguous`);
    if (regions[region]?.[solution[region]] !== region) problems.push(`person ${region} is not in region ${region}`);
  }
  if (regions.flat().some((value) => value < 0 || value >= size)) problems.push('square without a valid region');
  if (problems.length === 0 && countSolutions(regions, 2) !== 1) problems.push('not exactly one solution');
  return problems;
}
