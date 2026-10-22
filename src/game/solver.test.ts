import { countSolutions } from './solver';

describe('countSolutions', () => {
  it('Given a grid where every row is its own region, then there is no valid solution count limit issue and it counts all placements', () => {
    // 4x4 with region = row: the only non-touching placements are (1,3,0,2) and (2,0,3,1)
    const regions = [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [2, 2, 2, 2],
      [3, 3, 3, 3],
    ];
    expect(countSolutions(regions, 10)).toBe(2);
  });

  it('Given a limit, then counting stops at the limit', () => {
    const regions = [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [2, 2, 2, 2],
      [3, 3, 3, 3],
    ];
    expect(countSolutions(regions, 1)).toBe(1);
  });

  it('Given regions that force one placement, then there is exactly one solution', () => {
    // Region 0 is only (0,1); this pins row 0 and leaves (1,3,0,2) as the only fit.
    const regions = [
      [1, 0, 1, 1],
      [1, 1, 1, 1],
      [2, 2, 2, 2],
      [3, 3, 3, 3],
    ];
    expect(countSolutions(regions, 10)).toBe(1);
  });
});
