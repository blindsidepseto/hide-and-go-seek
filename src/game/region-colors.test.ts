import { assignRegionColors, regionNeighbours } from './region-colors';
import { deltaE2000 } from './contrast';
import { decodePuzzle, pickPuzzle, PUZZLE_BANK } from './puzzles';
import { createRng } from './rng';
import { REGION_COLORS } from '../components/styles';
import { MAX_SIZE, MIN_SIZE, Puzzle } from './types';

const sizes = Array.from({ length: MAX_SIZE - MIN_SIZE + 1 }, (_, i) => MIN_SIZE + i);

// Boards as players get them: pickPuzzle rotates or mirrors a bank puzzle and renumbers regions.
// 40 seeds per size cover every bank puzzle in several of its 8 orientations.
const liveBoards: Puzzle[] = sizes.flatMap((size) => (
  Array.from({ length: 40 }, (_, seed) => pickPuzzle(size, createRng(seed * 101 + size)))
));

const worstTouchingPair = (regions: number[][], colors: string[]) => Math.min(
  ...regionNeighbours(regions).flatMap((set, region) => [...set]
    .map((other) => deltaE2000(colors[region], colors[other]))),
);

describe('regionNeighbours', () => {
  it('Given a grid, then regions that share an edge (not just a corner) are neighbours', () => {
    // 0 and 3 meet only at a corner, as do 1 and 2.
    const neighbours = regionNeighbours([
      [0, 1],
      [2, 3],
    ]);
    expect(neighbours.map((set) => [...set].sort())).toEqual([[1, 2], [0, 3], [0, 3], [1, 2]]);
  });
});

describe('assignRegionColors', () => {
  it('Given the palette, then it has a colour for every region of the largest grid', () => {
    expect(REGION_COLORS.length).toBeGreaterThanOrEqual(MAX_SIZE);
  });

  it('Given more regions than palette colours, then it fails loudly instead of leaving a region uncoloured', () => {
    const regions = [[0, 1, 2]];
    expect(() => assignRegionColors(regions, ['#ffffff', '#000000'])).toThrow();
  });

  it('Given any live board, then every region gets its own colour from the palette', () => {
    liveBoards.forEach(({ size, regions }) => {
      const colors = assignRegionColors(regions, REGION_COLORS);
      expect(colors).toHaveLength(size);
      expect(colors.every((color) => REGION_COLORS.includes(color))).toBe(true);
      expect(new Set(colors).size).toBe(size);
    });
  });

  it('Given the same board, then every player gets the same colours', () => {
    const { regions } = decodePuzzle(PUZZLE_BANK[12][3]);
    const first = assignRegionColors(regions, REGION_COLORS);
    expect(assignRegionColors(regions, REGION_COLORS)).toEqual(first);
  });

  // Measured: worst touching pair 21.5-25.8 by grid size (old palette: 6.1-10.4).
  it('Given touching regions on any live board, then their colours differ by at least 21 (CIEDE2000)', () => {
    const worst = Math.min(...liveBoards.map(({ regions }) => (
      worstTouchingPair(regions, assignRegionColors(regions, REGION_COLORS)))));
    expect(worst).toBeGreaterThanOrEqual(21);
  });

  it('Given a 15x15 board, then colouring it takes well under a frame budget', () => {
    const boards = PUZZLE_BANK[15].map(decodePuzzle);
    assignRegionColors(boards[0].regions, REGION_COLORS);
    const start = Date.now();
    boards.forEach(({ regions }) => assignRegionColors(regions, REGION_COLORS));
    expect((Date.now() - start) / boards.length).toBeLessThan(15);
  });
});
