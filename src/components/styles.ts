import { CSSProperties } from 'react';

// Pastel region colours, distinct enough for 15 regions. Region borders back them up
// for players who cannot tell colours apart.
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
  background: '#f5f6f8',
  fontFamily: 'inherit',
  color: '#1f2937',
  boxSizing: 'border-box',
  padding: 12,
  overflow: 'hidden',
};

export const card: CSSProperties = {
  background: '#ffffff',
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

export const primaryButton: CSSProperties = { ...button, background: '#0f70d7', color: '#ffffff' };

export const secondaryButton: CSSProperties = { ...button, background: '#e5e7eb', color: '#1f2937' };

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
  ...button, borderRadius: '50%', width: 30, height: 30, padding: 0, background: '#e5e7eb', fontWeight: 700,
};

export const grid = (size: number): CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${size}, 1fr)`,
  gridTemplateRows: `repeat(${size}, 1fr)`,
  aspectRatio: '1 / 1',
  height: 'calc(100% - 48px)',
  maxWidth: '100%',
  border: '3px solid #1f2937',
  background: '#1f2937',
  userSelect: 'none',
});

const regionEdge = '3px solid #1f2937';
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
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 0,
  minHeight: 0,
  overflow: 'hidden',
});

export const mark: CSSProperties = {
  fontSize: 'min(3vh, 22px)', fontWeight: 700, color: '#374151', lineHeight: 1,
};

export const wrongMark: CSSProperties = { ...mark, color: '#dc2626', fontSize: 'min(4vh, 28px)' };

export const avatar = (color: string): CSSProperties => ({
  width: '82%',
  height: '82%',
  borderRadius: '50%',
  background: color,
  color: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 700,
  fontSize: 'min(2.2vh, 16px)',
  objectFit: 'cover',
  boxShadow: '0 0 0 2px #ffffff',
});

export const missedAvatar: CSSProperties = { opacity: 0.55 };
