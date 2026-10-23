import { contrastRatio, deltaE2000 } from '../game/contrast';
import {
  avatarFrame, cell, COLORS, REGION_COLORS, WRONG_MARK, wrongMark, X_MARK,
} from './styles';

// WCAG 2.1 AA: 1.4.3 text >= 4.5:1, 1.4.11 graphical objects and UI component boundaries >= 3:1.
const TEXT_MIN = 4.5;
const NON_TEXT_MIN = 3;

describe('board colours meet WCAG 2.1 AA', () => {
  const marksOnSquares: [string, string][] = [
    ['region border', COLORS.regionBorder],
    ['X mark dark edge', COLORS.xMarkEdge],
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
  // Marks are drawn in a 10 x 10 box; strokes have round ends that reach stroke/2 past a line.
  it('Given the X mark, then it is a bold white X with a wider dark edge whose ends stay inside its box', () => {
    expect(COLORS.xMark).toBe('#ffffff');
    expect(X_MARK.stroke).toBeGreaterThanOrEqual(1.6);
    expect(X_MARK.edgeStroke - X_MARK.stroke).toBeGreaterThanOrEqual(0.8);
    expect(X_MARK.inset - X_MARK.edgeStroke / 2).toBeGreaterThanOrEqual(0);
    // The white shows clearly against its own dark edge.
    expect(contrastRatio(COLORS.xMark, COLORS.xMarkEdge)).toBeGreaterThanOrEqual(3);
  });

  it('Given the grid, then the thin lines between squares are white and the block borders stay dark', () => {
    const style = cell('#e1e1c3', {
      top: true, right: false, bottom: false, left: false,
    });
    expect(String(style.borderTop)).toContain(COLORS.regionBorder);
    expect(String(style.borderRight)).toContain(COLORS.gridLine);
    expect(COLORS.gridLine).toBe('#ffffff');
  });

  it('Given the wrong-guess mark, then it is bold, the circle fits its box, and the X inside clearly does not touch the circle', () => {
    const stroke = Number(wrongMark.strokeWidth);
    const half = stroke / 2;
    expect(stroke).toBeGreaterThanOrEqual(1.6);
    expect(WRONG_MARK.radius + half).toBeLessThanOrEqual(5);
    const armEnd = WRONG_MARK.arm * Math.SQRT2 + half;
    const circleInside = WRONG_MARK.radius - half;
    expect(circleInside - armEnd).toBeGreaterThanOrEqual(0.3);
  });

  it('Given an avatar frame, then its outline is drawn inside the frame (never clipped by the square) and is dark against every region colour', () => {
    [false, true].forEach((missed) => {
      const style = avatarFrame(missed);
      expect(style.boxSizing).toBe('border-box');
      expect(style.boxShadow).toBeUndefined();
      expect(String(style.border)).toContain(COLORS.avatarOutline);
    });
    const failing = REGION_COLORS
      .filter((region) => contrastRatio(COLORS.avatarOutline, region) < 3);
    expect(failing).toEqual([]);
    expect(contrastRatio(COLORS.avatarRing, COLORS.avatarOutline)).toBeGreaterThanOrEqual(3);
  });

  it('Given a missed person, then the outline is dashed; given a found person, then it is solid (shape, not colour)', () => {
    expect(String(avatarFrame(true).border)).toContain('dashed');
    expect(String(avatarFrame(false).border)).toContain('solid');
  });
});
