import { contrastRatio, deltaE2000 } from '../game/contrast';
import {
  avatar, COLORS, REGION_COLORS, wrongMark, xMark,
} from './styles';

// WCAG 2.1 AA: 1.4.3 text >= 4.5:1, 1.4.11 graphical objects and UI component boundaries >= 3:1.
const TEXT_MIN = 4.5;
const NON_TEXT_MIN = 3;

describe('board colours meet WCAG 2.1 AA', () => {
  const marksOnSquares: [string, string][] = [
    ['region border', COLORS.regionBorder],
    ['X mark', COLORS.xMark],
    ['wrong-guess mark', COLORS.wrongMark],
    ['focus ring', COLORS.focusRing],
  ];

  marksOnSquares.forEach(([label, color]) => {
    it(`Given every region colour, then the ${label} has at least 3:1 contrast against it`, () => {
      const failing = REGION_COLORS.filter((region) => contrastRatio(color, region) < NON_TEXT_MIN);
      expect(failing).toEqual([]);
    });
  });

  it('Given the focus ring, then its inner light ring separates it from the dark region border', () => {
    const ratio = contrastRatio(COLORS.focusRingInner, COLORS.regionBorder);
    expect(ratio).toBeGreaterThanOrEqual(NON_TEXT_MIN);
  });

  const textPairs: [string, string, string][] = [
    ['header text on page background', COLORS.text, COLORS.pageBackground],
    ['card text on card', COLORS.text, COLORS.cardBackground],
    ['primary button text', COLORS.primaryText, COLORS.primary],
    ['secondary button text', COLORS.text, COLORS.secondary],
  ];

  textPairs.forEach(([label, fg, bg]) => {
    it(`Given ${label}, then it has at least 4.5:1 contrast`, () => {
      expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(TEXT_MIN);
    });
  });
});

describe('region colours are easy to tell apart', () => {
  it('Given any two region colours, then they differ by at least 18 (CIEDE2000)', () => {
    const close: string[] = [];
    REGION_COLORS.forEach((a, i) => REGION_COLORS.slice(i + 1).forEach((b) => {
      if (deltaE2000(a, b) < 18) close.push(`${a} ${b}`);
    }));
    expect(close).toEqual([]);
  });
});

describe('marks and avatars stand out on every region', () => {
  it('Given the X and wrong-guess marks, then their strokes are bold enough to read on small squares', () => {
    // viewBox is 10 units wide; 1.8 is 18% of the mark (was 1.4 and 1.2).
    expect(Number(xMark.strokeWidth)).toBeGreaterThanOrEqual(1.8);
    expect(Number(wrongMark.strokeWidth)).toBeGreaterThanOrEqual(1.8);
  });

  it('Given an avatar, then it has a dark outline with at least 3:1 contrast against every region colour', () => {
    const style = avatar('#7a869a');
    expect(String(style.boxShadow)).toContain(COLORS.avatarOutline);
    const failing = REGION_COLORS
      .filter((region) => contrastRatio(COLORS.avatarOutline, region) < 3);
    expect(failing).toEqual([]);
  });
});
