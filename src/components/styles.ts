import { CSSProperties } from 'react';
import { readableTextColor } from '../game/contrast';

// All colours are checked against WCAG 2.1 AA in styles.test.ts:
// text >= 4.5:1 (1.4.3); marks, borders and focus ring >= 3:1 against every region (1.4.11).
export const COLORS = {
  text: '#1f2937',
  pageBackground: '#f5f6f8',
  cardBackground: '#ffffff',
  primary: '#0f70d7',
  primaryText: '#ffffff',
  secondary: '#e5e7eb',
  regionBorder: '#1f2937',
  xMark: '#374151',
  wrongMark: '#7f1d1d',
  focusRing: '#000000',
  focusRingInner: '#ffffff',
  genericAvatar: '#7a869a',
};

// Pastel region colours. Regions are also separated by thick borders, so colour is never the
// only cue (WCAG 1.4.1); AA does not require region colours to contrast with each other.
export const REGION_COLORS = [
  '#f4a7a7', '#a7c7f4', '#b5e3a1', '#f7d59c', '#d3b4ef',
  '#9fe0db', '#f5b8de', '#d9d9d9', '#e8e39a', '#c2a58f',
  '#8fd1a8', '#a3a8f0', '#f0c0a0', '#b0d8f0', '#e0a8c0',
];

export const area: CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  background: COLORS.pageBackground,
  fontFamily: 'inherit',
  color: COLORS.text,
  boxSizing: 'border-box',
  padding: 12,
  overflow: 'hidden',
};

export const card: CSSProperties = {
  background: COLORS.cardBackground,
  borderRadius: 12,
  boxShadow: '0 6px 24px rgba(0,0,0,0.18)',
  padding: '20px 24px',
  maxWidth: 420,
  width: '90%',
  lineHeight: 1.45,
};

export const overlay: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(15, 23, 42, 0.45)',
  zIndex: 2,
};

export const heading: CSSProperties = { margin: '0 0 8px', fontSize: 20 };

export const label: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12, margin: '12px 0', fontWeight: 600,
};

export const select: CSSProperties = { padding: '4px 8px', fontSize: 15 };

export const actions: CSSProperties = {
  display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16,
};

const button: CSSProperties = {
  border: 'none', borderRadius: 6, padding: '8px 14px', fontSize: 14, cursor: 'pointer',
};

export const primaryButton: CSSProperties = {
  ...button, background: COLORS.primary, color: COLORS.primaryText,
};

export const secondaryButton: CSSProperties = {
  ...button, background: COLORS.secondary, color: COLORS.text,
};

export const header: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  marginBottom: 8,
  fontWeight: 600,
  flexWrap: 'wrap',
  justifyContent: 'center',
};

export const helpButton: CSSProperties = {
  ...button, borderRadius: '50%', width: 30, height: 30, padding: 0, background: COLORS.secondary, fontWeight: 700,
};

export const grid = (size: number): CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${size}, 1fr)`,
  gridTemplateRows: `repeat(${size}, 1fr)`,
  aspectRatio: '1 / 1',
  height: 'calc(100% - 48px)',
  maxWidth: '100%',
  border: `3px solid ${COLORS.regionBorder}`,
  background: COLORS.regionBorder,
  userSelect: 'none',
});

const regionEdge = `3px solid ${COLORS.regionBorder}`;
const innerEdge = '1px solid rgba(31, 41, 55, 0.25)';

export const cell = (
  color: string,
  edges: { top: boolean; right: boolean; bottom: boolean; left: boolean },
): CSSProperties => ({
  position: 'relative',
  background: color,
  borderTop: edges.top ? regionEdge : innerEdge,
  borderRight: edges.right ? regionEdge : innerEdge,
  borderBottom: edges.bottom ? regionEdge : innerEdge,
  borderLeft: edges.left ? regionEdge : innerEdge,
  padding: 0,
  margin: 0,
  cursor: 'pointer',
  // No double-tap zoom or long-press callout: taps and long presses are game moves.
  touchAction: 'manipulation',
  WebkitTouchCallout: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 0,
  minHeight: 0,
  overflow: 'hidden',
});

// Scales with the square; a little smaller than an avatar (82%).
export const xMark: CSSProperties = {
  width: '72%',
  height: '72%',
  stroke: COLORS.xMark,
  strokeWidth: 1.4,
  strokeLinecap: 'round',
  fill: 'none',
};

// A circled X, so a wrong guess differs from an X mark by shape, not only colour.
export const wrongMark: CSSProperties = {
  width: '72%',
  height: '72%',
  stroke: COLORS.wrongMark,
  strokeWidth: 1.2,
  strokeLinecap: 'round',
  fill: 'none',
};

// Keyboard focus: black outer ring and white inner ring, visible on any region and its border.
export const FOCUS_CSS = `.hgs-cell:focus-visible {
  outline: 3px solid ${COLORS.focusRing};
  outline-offset: -3px;
  box-shadow: inset 0 0 0 6px ${COLORS.focusRingInner};
}`;

export const avatar = (color: string): CSSProperties => ({
  width: '82%',
  height: '82%',
  borderRadius: '50%',
  background: color,
  color: readableTextColor(color),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 700,
  fontSize: 'min(2.2vh, 16px)',
  objectFit: 'cover',
  boxShadow: '0 0 0 2px #ffffff',
});

// People the player did not find: a dashed outline rather than fading, so initials keep 4.5:1.
export const missedAvatar: CSSProperties = {
  outline: `2px dashed ${COLORS.text}`,
  outlineOffset: 1,
};
