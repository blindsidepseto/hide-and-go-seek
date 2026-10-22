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
