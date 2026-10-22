import { deltaE2000 } from './contrast';

// Gives each region its own palette colour, so that regions which touch get colours that look
// as different as possible. Deterministic: every player's board gets the same colours.
// Regions with the most neighbours are coloured first; each takes the unused colour whose
// closest already-coloured neighbour is furthest away (CIEDE2000). Then pairs of regions swap
// colours while that raises the closest touching pair.
export function assignRegionColors(regions: number[][], palette: string[]): string[] {
  const count = regions.length;
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

  const colors: string[] = new Array(count).fill(null);
  const order = [...Array(count).keys()]
    .sort((a, b) => neighbours[b].size - neighbours[a].size || a - b);
  order.forEach((region) => {
    const used = new Set(colors.filter(Boolean));
    const coloured = [...neighbours[region]].map((n) => colors[n]).filter(Boolean);
    let best: string = null;
    let bestScore = -1;
    palette.filter((color) => !used.has(color)).forEach((color) => {
      const score = coloured.length === 0
        ? Infinity
        : Math.min(...coloured.map((other) => deltaE2000(color, other)));
      if (score > bestScore) {
        best = color;
        bestScore = score;
      }
    });
    colors[region] = best;
  });

  // Then swap colours between two regions while that raises the closest touching pair.
  const worstPair = () => Math.min(Infinity, ...neighbours.flatMap((set, region) => [...set]
    .filter((other) => other > region)
    .map((other) => deltaE2000(colors[region], colors[other]))));
  let worst = worstPair();
  for (let improved = true; improved;) {
    improved = false;
    for (let a = 0; a < count && !improved; a += 1) {
      for (let b = a + 1; b < count && !improved; b += 1) {
        [colors[a], colors[b]] = [colors[b], colors[a]];
        const next = worstPair();
        if (next > worst + 1e-9) {
          worst = next;
          improved = true;
        } else {
          [colors[a], colors[b]] = [colors[b], colors[a]];
        }
      }
    }
  }
  return colors;
}
