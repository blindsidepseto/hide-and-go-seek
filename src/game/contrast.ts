// WCAG 2.1 relative luminance and contrast ratio (https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio).

function channels(hex: string): number[] | null {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex);
  if (!match) return null;
  const digits = match[1].length === 3 ? [...match[1]].map((d) => d + d).join('') : match[1];
  return [0, 2, 4].map((i) => parseInt(digits.slice(i, i + 2), 16) / 255);
}

function luminance(hex: string): number {
  const linear = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = channels(hex).map(linear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

// Black or white, whichever is more readable on `background`. One of them always reaches 4.5:1.
export function readableTextColor(background: string): string {
  if (!channels(background)) return '#000000';
  return contrastRatio('#000000', background) >= contrastRatio('#ffffff', background)
    ? '#000000' : '#ffffff';
}

// CIE L*a*b* (D65) for an sRGB hex colour.
export function toLab(hex: string): [number, number, number] {
  const parsed = channels(hex);
  if (!parsed) throw new Error(`Not a hex colour: ${hex}`);
  const [r, g, b] = parsed
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
  const x = f((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047);
  const y = f(0.2126 * r + 0.7152 * g + 0.0722 * b);
  const z = f((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

const RAD = Math.PI / 180;

function hueAngle(b: number, a: number): number {
  if (a === 0 && b === 0) return 0;
  const h = Math.atan2(b, a) / RAD;
  return h < 0 ? h + 360 : h;
}

// CIEDE2000 colour difference: how different two colours look. About 2 is just noticeable;
// 20 and above is clearly different. Formula from Sharma, Wu & Dalal (2005).
export function deltaE2000Lab(
  [l1, a1, b1]: number[],
  [l2, a2, b2]: number[],
): number {
  const cBar = (Math.hypot(a1, b1) + Math.hypot(a2, b2)) / 2;
  const g = 0.5 * (1 - Math.sqrt(cBar ** 7 / (cBar ** 7 + 25 ** 7)));
  const a1p = (1 + g) * a1;
  const a2p = (1 + g) * a2;
  const c1p = Math.hypot(a1p, b1);
  const c2p = Math.hypot(a2p, b2);
  const h1p = hueAngle(b1, a1p);
  const h2p = hueAngle(b2, a2p);
  let dhp = 0;
  if (c1p * c2p !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }
  const dLp = l2 - l1;
  const dCp = c2p - c1p;
  const dHp = 2 * Math.sqrt(c1p * c2p) * Math.sin((dhp / 2) * RAD);
  const lBarP = (l1 + l2) / 2;
  const cBarP = (c1p + c2p) / 2;
  let hBarP = h1p + h2p;
  if (c1p * c2p !== 0) {
    if (Math.abs(h1p - h2p) > 180) hBarP += hBarP < 360 ? 360 : -360;
    hBarP /= 2;
  }
  const t = 1 - 0.17 * Math.cos((hBarP - 30) * RAD) + 0.24 * Math.cos(2 * hBarP * RAD)
    + 0.32 * Math.cos((3 * hBarP + 6) * RAD) - 0.2 * Math.cos((4 * hBarP - 63) * RAD);
  const dTheta = 30 * Math.exp(-(((hBarP - 275) / 25) ** 2));
  const rC = 2 * Math.sqrt(cBarP ** 7 / (cBarP ** 7 + 25 ** 7));
  const sL = 1 + (0.015 * (lBarP - 50) ** 2) / Math.sqrt(20 + (lBarP - 50) ** 2);
  const sC = 1 + 0.045 * cBarP;
  const sH = 1 + 0.015 * cBarP * t;
  const rT = -Math.sin(2 * dTheta * RAD) * rC;
  return Math.sqrt((dLp / sL) ** 2 + (dCp / sC) ** 2 + (dHp / sH) ** 2
    + rT * (dCp / sC) * (dHp / sH));
}

export function deltaE2000(a: string, b: string): number {
  return deltaE2000Lab(toLab(a), toLab(b));
}
