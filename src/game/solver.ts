// Finds placements of one person per row, column and region, with no two people touching.
// Returns up to `limit` solutions; each solution lists the column used in each row.
//
// A region of -1 marks a square not yet given to any region; no one can be placed there.
//
// Search order: always branch on the row, column or region with the fewest open squares,
// and rule squares out as soon as a person is placed. This keeps 15x15 grids fast.
export function findSolutions(regions: number[][], limit: number): number[][] {
  const size = regions.length;
  const open = new Uint8Array(size * size).fill(1);
  const filledRows = new Array(size).fill(false);
  const filledCols = new Array(size).fill(false);
  const filledRegions = new Array(size).fill(false);
  const placement: number[] = new Array(size).fill(-1);
  const solutions: number[][] = [];

  // Squares belonging to each row, column and region ("units").
  const units: { kind: 'row' | 'col' | 'region'; index: number; cells: number[] }[] = [];
  for (let i = 0; i < size; i += 1) {
    units.push({ kind: 'row', index: i, cells: [] });
    units.push({ kind: 'col', index: i, cells: [] });
    units.push({ kind: 'region', index: i, cells: [] });
  }
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      const cell = r * size + c;
      if (regions[r][c] < 0) {
        open[cell] = 0;
      } else {
        units[r * 3].cells.push(cell);
        units[c * 3 + 1].cells.push(cell);
        units[regions[r][c] * 3 + 2].cells.push(cell);
      }
    }
  }
  const isFilled = (unit: typeof units[0]) => {
    if (unit.kind === 'row') return filledRows[unit.index];
    if (unit.kind === 'col') return filledCols[unit.index];
    return filledRegions[unit.index];
  };

  const search = (placed: number) => {
    if (solutions.length >= limit) return;
    if (placed === size) {
      solutions.push([...placement]);
      return;
    }
    let best: number[] | null = null;
    for (let u = 0; u < units.length; u += 1) {
      if (!isFilled(units[u])) {
        const candidates = units[u].cells.filter((cell) => open[cell]);
        if (candidates.length === 0) return;
        if (!best || candidates.length < best.length) best = candidates;
      }
    }
    best.forEach((cell) => {
      if (solutions.length >= limit) return;
      const row = Math.floor(cell / size);
      const col = cell % size;
      const region = regions[row][col];
      const closed: number[] = [];
      const close = (r: number, c: number) => {
        const target = r * size + c;
        if (open[target]) {
          open[target] = 0;
          closed.push(target);
        }
      };
      for (let i = 0; i < size; i += 1) {
        close(row, i);
        close(i, col);
      }
      units[region * 3 + 2].cells.forEach((target) => {
        close(Math.floor(target / size), target % size);
      });
      for (let dr = -1; dr <= 1; dr += 1) {
        for (let dc = -1; dc <= 1; dc += 1) {
          const r = row + dr;
          const c = col + dc;
          if (r >= 0 && c >= 0 && r < size && c < size) close(r, c);
        }
      }
      filledRows[row] = true;
      filledCols[col] = true;
      filledRegions[region] = true;
      placement[row] = col;
      search(placed + 1);
      placement[row] = -1;
      filledRows[row] = false;
      filledCols[col] = false;
      filledRegions[region] = false;
      closed.forEach((target) => { open[target] = 1; });
    });
  };

  search(0);
  return solutions;
}

export function countSolutions(regions: number[][], limit: number): number {
  return findSolutions(regions, limit).length;
}
