import { assignRegionColors } from './region-colors';
import { deltaE2000 } from './contrast';
import { decodePuzzle, PUZZLE_BANK } from './puzzles';
import { REGION_COLORS } from '../components/styles';
import { MAX_SIZE, MIN_SIZE } from './types';

function neighbourPairs(regions: number[][]): [number, number][] {
  const pairs = new Set<string>();
  regions.forEach((row, r) => row.forEach((region, c) => {
    [[r + 1, c], [r, c + 1]].forEach(([nr, nc]) => {
      const other = regions[nr]?.[nc];
      if (other !== undefined && other !== region) pairs.add([region, other].sort((x, y) => x - y).join(','));
    });
  }));
  return [...pairs].map((p) => p.split(',').map(Number) as [number, number]);
}

describe('assignRegionColors', () => {
  const sizes = Array.from({ length: MAX_SIZE - MIN_SIZE + 1 }, (_, i) => MIN_SIZE + i);

  it('Given any puzzle, then every region gets its own colour', () => {
    sizes.forEach((size) => PUZZLE_BANK[size].map(decodePuzzle).forEach((puzzle) => {
      const colors = assignRegionColors(puzzle.regions, REGION_COLORS);
      expect(colors).toHaveLength(size);
      expect(new Set(colors).size).toBe(size);
    }));
  });

  it('Given the same puzzle, then every player gets the same colours', () => {
    const { regions } = decodePuzzle(PUZZLE_BANK[12][3]);
    const first = assignRegionColors(regions, REGION_COLORS);
    expect(assignRegionColors(regions, REGION_COLORS)).toEqual(first);
  });

  // Measured on the bank: worst touching pair 21.5-25.8 by grid size (old palette: 6.1-10.4).
  it('Given touching regions, then their colours are well apart: at least 21 (CIEDE2000) on every bank puzzle', () => {
    let worst = Infinity;
    sizes.forEach((size) => PUZZLE_BANK[size].map(decodePuzzle).forEach(({ regions }) => {
      const colors = assignRegionColors(regions, REGION_COLORS);
      neighbourPairs(regions).forEach(([a, b]) => {
        worst = Math.min(worst, deltaE2000(colors[a], colors[b]));
      });
    }));
    expect(worst).toBeGreaterThanOrEqual(21);
  });
});
