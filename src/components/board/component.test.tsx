import * as React from 'react';
import {
  act, fireEvent, render, screen,
} from '@testing-library/react';
import Board, { CLICK_DELAY_MS } from './component';
import { Person, Puzzle } from '../../game/types';

// Person r sits in row r at column solution[r].
const puzzle: Puzzle = {
  size: 8,
  regions: Array.from({ length: 8 }, (_, r) => Array(8).fill(r)),
  solution: [0, 2, 4, 6, 1, 3, 5, 7],
};
const people: Person[] = Array.from({ length: 8 }, (_, i) => ({
  id: `p${i}`, name: `Person ${i}`, avatar: '', color: '#888888', generic: true,
}));

const cell = (row: number, col: number) => screen.getByTestId(`cell-${row}-${col}`);

function startPlaying() {
  render(<Board puzzle={puzzle} people={people} isHost={false} onEndGame={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: "Let's play" }));
}

function doubleClick(element: HTMLElement) {
  fireEvent.click(element);
  fireEvent.click(element);
  fireEvent.doubleClick(element);
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('Board', () => {
  it('Given a hidden person whose name starts with an emoji, when revealed, then the initial is the whole emoji', () => {
    const emojiPeople = people.map((p, i) => (i === 0 ? { ...p, name: '🦊 Sam' } : p));
    render(<Board puzzle={puzzle} people={emojiPeople} isHost={false} onEndGame={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: "Let's play" }));
    doubleClick(cell(0, 0));
    expect(screen.getByTitle('🦊 Sam').textContent).toBe('🦊S');
  });

  it('Given a new game, then the how-to-play card shows over the grid; when dismissed, then "?" brings it back', () => {
    render(<Board puzzle={puzzle} people={people} isHost={false} onEndGame={jest.fn()} />);
    expect(screen.getByRole('dialog', { name: 'How to play' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: "Let's play" }));
    expect(screen.queryByRole('dialog', { name: 'How to play' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'How to play' }));
    expect(screen.getByRole('dialog', { name: 'How to play' })).toBeTruthy();
  });

  it('Given a new game, then no people are shown and the header shows 0 found and 3 mistakes left', () => {
    startPlaying();
    expect(screen.queryByText('Person 0')).toBeNull();
    expect(screen.getByText('Found 0 / 8')).toBeTruthy();
    expect(screen.getByText('Mistakes left: 3')).toBeTruthy();
  });

  it('Given a square, when single-clicked, then an X appears after the double-click window', () => {
    startPlaying();
    fireEvent.click(cell(0, 1));
    expect(cell(0, 1).getAttribute('data-mark')).toBe('empty');
    act(() => { jest.advanceTimersByTime(CLICK_DELAY_MS); });
    expect(cell(0, 1).getAttribute('data-mark')).toBe('x');
  });

  it('Given a hidden person, when double-clicked, then their avatar and name show and no X is left behind', () => {
    startPlaying();
    doubleClick(cell(0, 0));
    act(() => { jest.advanceTimersByTime(CLICK_DELAY_MS); });
    expect(cell(0, 0).getAttribute('data-mark')).toBe('found');
    expect(screen.getByTitle('Person 0')).toBeTruthy();
    expect(screen.getByText('Found 1 / 8')).toBeTruthy();
  });

  it('Given an empty square, when double-clicked, then a red X shows and a mistake is used', () => {
    startPlaying();
    doubleClick(cell(0, 1));
    expect(cell(0, 1).getAttribute('data-mark')).toBe('wrong');
    expect(screen.getByText('Mistakes left: 2')).toBeTruthy();
  });

  it('Given 3 mistakes, when a 4th wrong guess is made, then the game is over and everyone is revealed', () => {
    startPlaying();
    [1, 2, 3, 4].forEach((col) => doubleClick(cell(0, col)));
    expect(screen.getByRole('dialog', { name: 'Game over' })).toBeTruthy();
    people.forEach((person) => expect(screen.getByTitle(person.name)).toBeTruthy());
  });

  it('Given all people but one found, when the last is found, then the player has won', () => {
    startPlaying();
    puzzle.solution.forEach((col, row) => doubleClick(cell(row, col)));
    expect(screen.getByRole('dialog', { name: 'You found everyone!' })).toBeTruthy();
  });

  it('Given a host, then an End game button is shown and calls onEndGame; given a player, then it is not shown', () => {
    const onEndGame = jest.fn();
    const { unmount } = render(
      <Board puzzle={puzzle} people={people} isHost onEndGame={onEndGame} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'End game for everyone' }));
    expect(onEndGame).toHaveBeenCalled();
    unmount();
    startPlaying();
    expect(screen.queryByRole('button', { name: 'End game for everyone' })).toBeNull();
  });
});
