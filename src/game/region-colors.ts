import { deltaE2000 } from './contrast';

// For each region, the set of regions it shares an edge with.
export function regionNeighbours(regions: number[][]): Set<number>[] {
  const count = Math.max(...regions.flat()) + 1;
  const neighbours = Array.from({ length: count }, () => new Set<number>());
  regions.forEach((row, r) => row.forEach((region, c) => {
    [[r + 1, c], [r, c + 1]].forEach(([nr, nc]) => {
      const other = regions[nr]?.[nc];
      if (other !== undefined && other !== region) {
        neighbours[region].add(other);
        neighbours[other].add(region);
      }
    });
  }));
  return neighbours;
}

// A change to try: swap colours with region b, or take an unused palette colour.
type Move = { b?: number; color?: number };

// Colour differences between palette entries, worked out once per palette. Rounded to 0.01 so
// every browser makes the same choices: the maths functions behind CIEDE2000 may differ in the
// last bits between JavaScript engines, which could otherwise break near-ties differently.
const distanceCache = new Map<string, number[][]>();
function paletteDistances(palette: string[]): number[][] {
  const key = palette.join(',');
  if (!distanceCache.has(key)) {
    distanceCache.set(key, palette.map((a) => palette.map((b) => (
      Math.round(deltaE2000(a, b) * 100) / 100))));
  }
  return distanceCache.get(key);
}

// Gives each region its own palette colour, so that regions which touch get colours that look
// as different as possible. Deterministic: every player's board gets the same colours.
// Regions with the most neighbours are coloured first; each takes the unused colour whose
// closest already-coloured neighbour is furthest away (CIEDE2000). Then regions swap colours,
// or take an unused one, while that improves the closest touching pair.
export function assignRegionColors(regions: number[][], palette: string[]): string[] {
  const neighbours = regionNeighbours(regions);
  const count = neighbours.length;
  if (count > palette.length) {
    throw new Error(`Palette has ${palette.length} colours for ${count} regions`);
  }
  const distance = paletteDistances(palette);
  const edges = neighbours.flatMap((set, region) => [...set]
    .filter((other) => other > region)
    .map((other) => [region, other]));

  // pick[region] is a palette index.
  const pick: number[] = new Array(count).fill(-1);
  const order = [...Array(count).keys()]
    .sort((a, b) => neighbours[b].size - neighbours[a].size || a - b);
  order.forEach((region) => {
    const used = new Set(pick);
    const coloured = [...neighbours[region]].filter((n) => pick[n] >= 0);
    let best = -1;
    let bestScore = -1;
    palette.forEach((_, color) => {
      if (used.has(color)) return;
      const score = coloured.length === 0
        ? Infinity
        : Math.min(...coloured.map((n) => distance[color][pick[n]]));
      if (score > bestScore) {
        best = color;
        bestScore = score;
      }
    });
    pick[region] = best;
  });

  // Score: the closest touching pair, then fewer pairs at that distance.
  const score = () => {
    let worst = Infinity;
    let atWorst = 0;
    edges.forEach(([a, b]) => {
      const d = distance[pick[a]][pick[b]];
      if (d < worst) {
        worst = d;
        atWorst = 1;
      } else if (d === worst) {
        atWorst += 1;
      }
    });
    return { worst, atWorst };
  };
  const better = (x: { worst: number; atWorst: number }, y: { worst: number; atWorst: number }) => (
    x.worst > y.worst || (x.worst === y.worst && x.atWorst < y.atWorst));

  let current = score();
  for (let improved = true; improved;) {
    improved = false;
    const unused = palette.map((_, i) => i).filter((i) => !pick.includes(i));
    for (let a = 0; a < count && !improved; a += 1) {
      // Swap with another region's colour, or take an unused colour.
      const moves: Move[] = [
        ...[...Array(count).keys()].filter((b) => b > a).map((b) => ({ b })),
        ...unused.map((color) => ({ color })),
      ];
      for (let i = 0; i < moves.length && !improved; i += 1) {
        const { b, color } = moves[i];
        const before = pick[a];
        if (b !== undefined) [pick[a], pick[b]] = [pick[b], pick[a]];
        else pick[a] = color;
        const next = score();
        if (better(next, current)) {
          current = next;
          improved = true;
        } else if (b !== undefined) {
          [pick[a], pick[b]] = [pick[b], pick[a]];
        } else {
          pick[a] = before;
        }
      }
    }
  }
  return pick.map((color) => palette[color]);
}
