export const MIN_SIZE = 8;
export const MAX_SIZE = 15;
export const MAX_MISTAKES = 3;

// A hidden person. `avatar` is an image URL, or '' when the person has none.
export interface Person {
  id: string;
  name: string;
  avatar: string;
  color: string;
  generic: boolean;
}

export interface Puzzle {
  size: number;
  // regions[row][col] is the colour region of that square. Region r belongs to people[r].
  regions: number[][];
  // solution[row] is the column holding the person of that row's region.
  solution: number[];
}

export type CellMark = 'empty' | 'x' | 'found' | 'wrong';

export type GameStatus = 'playing' | 'won' | 'lost';

export interface GameState {
  solution: number[];
  marks: CellMark[][];
  mistakes: number;
  found: number;
  status: GameStatus;
}

export type Rng = () => number;
