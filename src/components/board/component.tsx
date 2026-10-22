import * as React from 'react';
import {
  useEffect, useRef, useState,
} from 'react';
import { createGame, guess, toggleMark } from '../../game/rules';
import {
  GameState, MAX_MISTAKES, Person, Puzzle,
} from '../../game/types';
import * as styles from '../styles';

// A double-click starts with a click, so a single click waits this long before marking an X.
export const CLICK_DELAY_MS = 250;

interface BoardProps {
  puzzle: Puzzle;
  people: Person[];
  isHost: boolean;
  onEndGame: () => void;
  // Progress from an earlier mount of this same game, and a callback to save it.
  savedState?: GameState;
  onProgress?: (state: GameState) => void;
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2)
    .map((part) => Array.from(part)[0].toUpperCase())
    .join('');
}

function Avatar({ person, missed }: { person: Person; missed: boolean }) {
  const style = { ...styles.avatar(person.color || '#7a869a'), ...(missed ? styles.missedAvatar : {}) };
  if (person.avatar) {
    return (
      <img
        src={person.avatar}
        alt={person.name}
        title={person.name}
        style={style}
        draggable={false}
      />
    );
  }
  return <span title={person.name} style={style}>{initials(person.name)}</span>;
}

function HowToPlay({ onClose }: { onClose: () => void }) {
  return (
    <div style={styles.overlay}>
      <div role="dialog" aria-label="How to play" style={styles.card}>
        <h2 style={styles.heading}>How to play</h2>
        <p>People from this meeting are hidden in the grid. Find them all.</p>
        <ul>
          <li>Each row, each column and each colour has exactly one person.</li>
          <li>People never touch each other, not even corner to corner.</li>
          <li>
            <strong>Click</strong>
            {' '}
            a square to mark it with an X when you know no one is there.
          </li>
          <li>
            <strong>Double-click</strong>
            {' '}
            a square when you think someone is there.
          </li>
          <li>{`You can make ${MAX_MISTAKES} mistakes. The next one ends the game.`}</li>
        </ul>
        <div style={styles.actions}>
          <button type="button" onClick={onClose} style={styles.primaryButton}>Let&apos;s play</button>
        </div>
      </div>
    </div>
  );
}

function EndScreen({
  won, found, total, onClose,
}: {
  won: boolean; found: number; total: number; onClose: () => void;
}) {
  const title = won ? 'You found everyone!' : 'Game over';
  return (
    <div style={styles.overlay}>
      <div role="dialog" aria-label={title} style={styles.card}>
        <h2 style={styles.heading}>{title}</h2>
        <p>
          {won
            ? `You found all ${total} people.`
            : `You found ${found} of ${total} people. Everyone is now shown on the board.`}
        </p>
        <div style={styles.actions}>
          <button type="button" onClick={onClose} style={styles.primaryButton}>See the board</button>
        </div>
      </div>
    </div>
  );
}

function Board({
  puzzle, people, isHost, onEndGame, savedState, onProgress,
}: BoardProps): React.ReactElement {
  const [game, setGame] = useState<GameState>(() => savedState ?? createGame(puzzle));
  const [showHelp, setShowHelp] = useState(!savedState);
  const [showEnd, setShowEnd] = useState(true);
  const clickTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(clickTimer.current), []);

  useEffect(() => { onProgress?.(game); }, [game]);

  const onClick = (row: number, col: number) => {
    clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(
      () => setGame((state) => toggleMark(state, row, col)),
      CLICK_DELAY_MS,
    );
  };

  const onDoubleClick = (row: number, col: number) => {
    clearTimeout(clickTimer.current);
    setGame((state) => guess(state, row, col));
  };

  const { size, regions, solution } = puzzle;
  const finished = game.status !== 'playing';

  return (
    <div style={styles.area}>
      <div style={styles.header}>
        <span>{`Found ${game.found} / ${size}`}</span>
        <span>{`Mistakes left: ${Math.max(MAX_MISTAKES - game.mistakes, 0)}`}</span>
        <button type="button" aria-label="How to play" onClick={() => setShowHelp(true)} style={styles.helpButton}>?</button>
        {isHost && (
          <button type="button" onClick={onEndGame} style={styles.secondaryButton}>End game for everyone</button>
        )}
      </div>
      <div style={styles.grid(size)}>
        {regions.map((cells, row) => cells.map((region, col) => {
          const mark = game.marks[row][col];
          const hasPerson = solution[row] === col;
          const showPerson = mark === 'found' || (finished && hasPerson);
          const edges = {
            top: row === 0 || regions[row - 1][col] !== region,
            right: col === size - 1 || regions[row][col + 1] !== region,
            bottom: row === size - 1 || regions[row + 1][col] !== region,
            left: col === 0 || regions[row][col - 1] !== region,
          };
          return (
            <button
              // eslint-disable-next-line react/no-array-index-key
              key={`${row}-${col}`}
              type="button"
              data-testid={`cell-${row}-${col}`}
              data-mark={mark}
              aria-label={`Row ${row + 1}, column ${col + 1}`}
              style={styles.cell(styles.REGION_COLORS[region % styles.REGION_COLORS.length], edges)}
              onClick={() => onClick(row, col)}
              onDoubleClick={() => onDoubleClick(row, col)}
            >
              {showPerson && <Avatar person={people[region]} missed={mark !== 'found'} />}
              {!showPerson && mark === 'x' && <span style={styles.mark}>×</span>}
              {!showPerson && mark === 'wrong' && <span style={styles.wrongMark}>✕</span>}
            </button>
          );
        }))}
      </div>
      {showHelp && <HowToPlay onClose={() => setShowHelp(false)} />}
      {finished && showEnd && !showHelp && (
        <EndScreen
          won={game.status === 'won'}
          found={game.found}
          total={size}
          onClose={() => setShowEnd(false)}
        />
      )}
    </div>
  );
}

Board.defaultProps = {
  savedState: undefined,
  onProgress: undefined,
};

export default Board;
