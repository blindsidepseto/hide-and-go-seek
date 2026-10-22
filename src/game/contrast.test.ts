import {
  contrastRatio, deltaE2000, deltaE2000Lab, readableTextColor,
} from './contrast';
import { createRng } from './rng';

describe('contrastRatio (WCAG 2.1)', () => {
  it('Given black and white, then the ratio is 21:1; given the same colour, then it is 1:1', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5);
  });

  it('Given a known pair, then it matches the published WCAG value', () => {
    // #767676 on white is the classic 4.54:1 AA threshold example.
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
  });

  it('Given 3-digit hex, then it is read the same as 6-digit hex', () => {
    expect(contrastRatio('#fff', '#000')).toBeCloseTo(21, 5);
  });
});

describe('readableTextColor', () => {
  it('Given any background colour, then the chosen text colour reaches at least 4.5:1', () => {
    const rng = createRng(7);
    for (let i = 0; i < 500; i += 1) {
      const hex = `#${Math.floor(rng() * 0xffffff).toString(16).padStart(6, '0')}`;
      expect(contrastRatio(readableTextColor(hex), hex)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('Given an unreadable value, then it falls back to dark text', () => {
    expect(readableTextColor('not-a-colour')).toBe('#000000');
  });
});

describe('deltaE2000 (CIEDE2000 colour difference)', () => {
  it('Given the published reference pair, then the difference matches (Sharma, Wu & Dalal 2005)', () => {
    expect(deltaE2000Lab([50, 2.6772, -79.7751], [50, 0, -82.7485])).toBeCloseTo(2.0425, 4);
    expect(deltaE2000Lab([50, 2.5, 0], [73, 25, -18])).toBeCloseTo(27.1492, 4);
  });

  it('Given the same colour twice, then there is no difference; given black and white, then it is large', () => {
    expect(deltaE2000('#a59687', '#a59687')).toBeCloseTo(0, 6);
    expect(deltaE2000('#000000', '#ffffff')).toBeGreaterThan(99);
  });
});
