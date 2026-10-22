import * as React from 'react';
import {
  act, fireEvent, render, screen,
} from '@testing-library/react';
import Board, { CLICK_DELAY_MS, LONG_PRESS_MS } from './component';
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

describe('Board keyboard and touch play', () => {
  it('Given the grid, then only one square is in the Tab order', () => {
    startPlaying();
    const tabbable = screen.getAllByTestId(/^cell-/).filter((el) => el.getAttribute('tabindex') === '0');
    expect(tabbable).toEqual([cell(0, 0)]);
  });

  it('Given a focused square, when an arrow key is pressed, then focus moves to the next square and stops at the edge', () => {
    startPlaying();
    act(() => { cell(0, 0).focus(); });
    fireEvent.keyDown(cell(0, 0), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(cell(0, 1));
    fireEvent.keyDown(cell(0, 1), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(cell(1, 1));
    fireEvent.keyDown(cell(1, 1), { key: 'ArrowUp' });
    fireEvent.keyDown(cell(0, 1), { key: 'ArrowUp' });
    expect(document.activeElement).toBe(cell(0, 1));
    expect(cell(0, 1).getAttribute('tabindex')).toBe('0');
  });

  it('Given a focused square, when G is pressed, then it is a guess', () => {
    startPlaying();
    fireEvent.keyDown(cell(0, 0), { key: 'g' });
    expect(cell(0, 0).getAttribute('data-mark')).toBe('found');
    fireEvent.keyDown(cell(0, 1), { key: 'G' });
    expect(cell(0, 1).getAttribute('data-mark')).toBe('wrong');
  });

  it('Given a marked square, then a screen reader hears its state', () => {
    startPlaying();
    fireEvent.click(cell(0, 1));
    act(() => { jest.advanceTimersByTime(CLICK_DELAY_MS); });
    expect(cell(0, 1).getAttribute('aria-label')).toBe('Row 1, column 2, marked X');
    fireEvent.keyDown(cell(0, 0), { key: 'g' });
    expect(cell(0, 0).getAttribute('aria-label')).toBe('Row 1, column 1, Person 0 found');
    fireEvent.keyDown(cell(0, 2), { key: 'g' });
    expect(cell(0, 2).getAttribute('aria-label')).toBe('Row 1, column 3, wrong guess');
  });

  it('Given a touch screen, when a square is pressed and held, then it is a guess and the tap that follows is ignored', () => {
    startPlaying();
    fireEvent.pointerDown(cell(0, 1), { pointerType: 'touch' });
    act(() => { jest.advanceTimersByTime(LONG_PRESS_MS); });
    expect(cell(0, 1).getAttribute('data-mark')).toBe('wrong');
    fireEvent.pointerUp(cell(0, 1), { pointerType: 'touch' });
    fireEvent.click(cell(0, 1));
    act(() => { jest.advanceTimersByTime(CLICK_DELAY_MS); });
    expect(cell(0, 1).getAttribute('data-mark')).toBe('wrong');
  });

  it('Given a touch screen, when a square is tapped quickly, then it is marked with an X', () => {
    startPlaying();
    fireEvent.pointerDown(cell(0, 1), { pointerType: 'touch' });
    act(() => { jest.advanceTimersByTime(100); });
    fireEvent.pointerUp(cell(0, 1), { pointerType: 'touch' });
    fireEvent.click(cell(0, 1));
    act(() => { jest.advanceTimersByTime(LONG_PRESS_MS + CLICK_DELAY_MS); });
    expect(cell(0, 1).getAttribute('data-mark')).toBe('x');
  });

  it('Given a long press with no click afterwards, when another square is tapped, then that tap still marks an X', () => {
    startPlaying();
    fireEvent.pointerDown(cell(0, 1), { pointerType: 'touch' });
    act(() => { jest.advanceTimersByTime(LONG_PRESS_MS); });
    fireEvent.pointerUp(cell(0, 1), { pointerType: 'touch' });
    fireEvent.pointerDown(cell(0, 3), { pointerType: 'touch' });
    fireEvent.pointerUp(cell(0, 3), { pointerType: 'touch' });
    fireEvent.click(cell(0, 3));
    act(() => { jest.advanceTimersByTime(CLICK_DELAY_MS); });
    expect(cell(0, 3).getAttribute('data-mark')).toBe('x');
  });

  it('Given two squares marked within the double-click window, then both get an X', () => {
    startPlaying();
    fireEvent.click(cell(0, 1));
    fireEvent.click(cell(0, 3));
    act(() => { jest.advanceTimersByTime(CLICK_DELAY_MS); });
    expect(cell(0, 1).getAttribute('data-mark')).toBe('x');
    expect(cell(0, 3).getAttribute('data-mark')).toBe('x');
  });

  it('Given a square marked, when G is pressed on another square straight away, then the X is kept', () => {
    startPlaying();
    fireEvent.click(cell(0, 1));
    fireEvent.keyDown(cell(0, 0), { key: 'g' });
    act(() => { jest.advanceTimersByTime(CLICK_DELAY_MS); });
    expect(cell(0, 1).getAttribute('data-mark')).toBe('x');
    expect(cell(0, 0).getAttribute('data-mark')).toBe('found');
  });

  it('Given Ctrl+G or Cmd+G (browser find next), then no guess is made', () => {
    startPlaying();
    fireEvent.keyDown(cell(0, 1), { key: 'g', ctrlKey: true });
    fireEvent.keyDown(cell(0, 1), { key: 'g', metaKey: true });
    expect(cell(0, 1).getAttribute('data-mark')).toBe('empty');
  });

  it('Given the how-to-play card is open, then the grid cannot be played or tabbed to', () => {
    render(<Board puzzle={puzzle} people={people} isHost={false} onEndGame={jest.fn()} />);
    fireEvent.keyDown(cell(0, 1), { key: 'g' });
    fireEvent.click(cell(0, 2));
    act(() => { jest.advanceTimersByTime(CLICK_DELAY_MS); });
    expect(cell(0, 1).getAttribute('data-mark')).toBe('empty');
    expect(cell(0, 2).getAttribute('data-mark')).toBe('empty');
    expect(cell(0, 0).getAttribute('tabindex')).toBe('-1');
  });

  it('Given a mouse right-click, then the browser menu is not blocked; given a touch long press, then it is', () => {
    startPlaying();
    expect(fireEvent.contextMenu(cell(0, 1))).toBe(true);
    fireEvent.pointerDown(cell(0, 1), { pointerType: 'touch' });
    expect(fireEvent.contextMenu(cell(0, 1))).toBe(false);
  });

  it('Given the how-to-play card, then it explains keyboard and touch controls', () => {
    render(<Board puzzle={puzzle} people={people} isHost={false} onEndGame={jest.fn()} />);
    expect(screen.getByText(/arrow keys/i)).toBeTruthy();
    expect(screen.getByText(/press and hold/i)).toBeTruthy();
  });
});

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

  it('Given a square marked X, then the X is large but slightly smaller than an avatar', () => {
    startPlaying();
    fireEvent.click(cell(0, 1));
    act(() => { jest.advanceTimersByTime(CLICK_DELAY_MS); });
    const xMark = cell(0, 1).querySelector('[data-testid="x-mark"]') as HTMLElement;
    doubleClick(cell(0, 0));
    const avatar = screen.getByTitle('Person 0');
    expect(parseFloat(xMark.style.width)).toBeLessThan(parseFloat(avatar.style.width));
    const avatarWidth = parseFloat(avatar.style.width);
    expect(parseFloat(xMark.style.width)).toBeGreaterThanOrEqual(avatarWidth - 15);
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
