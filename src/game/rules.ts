import {
  CellMark, GameState, MAX_MISTAKES, Puzzle,
} from './types';

export function createGame(puzzle: Puzzle): GameState {
  return {
    solution: puzzle.solution,
    marks: Array.from({ length: puzzle.size }, () => Array(puzzle.size).fill('empty')),
    mistakes: 0,
    found: 0,
    status: 'playing',
  };
}

function withMark(state: GameState, row: number, col: number, mark: CellMark): CellMark[][] {
  const marks = state.marks.map((cells) => [...cells]);
  marks[row][col] = mark;
  return marks;
}

// Single click: the player rules a square out (or undoes that).
export function toggleMark(state: GameState, row: number, col: number): GameState {
  const current = state.marks[row][col];
  if (state.status !== 'playing' || (current !== 'empty' && current !== 'x')) return state;
  return { ...state, marks: withMark(state, row, col, current === 'x' ? 'empty' : 'x') };
}

// Double click: the player claims a person is on this square.
export function guess(state: GameState, row: number, col: number): GameState {
  const current = state.marks[row][col];
  if (state.status !== 'playing' || current === 'found' || current === 'wrong') return state;
  if (state.solution[row] === col) {
    const found = state.found + 1;
    return {
      ...state,
      marks: withMark(state, row, col, 'found'),
      found,
      status: found === state.solution.length ? 'won' : 'playing',
    };
  }
  const mistakes = state.mistakes + 1;
  return {
    ...state,
    marks: withMark(state, row, col, 'wrong'),
    mistakes,
    status: mistakes >= MAX_MISTAKES ? 'lost' : 'playing',
  };
}
