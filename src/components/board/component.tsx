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

// On touch screens, pressing and holding a square this long is a guess.
export const LONG_PRESS_MS = 500;

const MOVES: Record<string, [number, number]> = {
  ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1],
};

const MARK_LABELS: Record<string, string> = {
  empty: '', x: ', marked X', wrong: ', wrong guess',
};

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
          <li>{`You are out after ${MAX_MISTAKES} wrong guesses.`}</li>
        </ul>
        <p>
          Keyboard: arrow keys to move, Space to mark an X, G to guess.
          {' '}
          Touch screen: tap to mark an X, press and hold to guess.
        </p>
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
  const [focused, setFocused] = useState<[number, number]>([0, 0]);
  const clickTimer = useRef<ReturnType<typeof setTimeout>>();
  // The square whose X is waiting out the double-click window.
  const pendingMark = useRef<[number, number] | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout>>();
  // Set after a long press, so a click the browser may send on release is not also an X.
  const ignoreNextClick = useRef(false);
  const lastPointerType = useRef('');
  const cellRefs = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => () => {
    clearTimeout(clickTimer.current);
    clearTimeout(pressTimer.current);
  }, []);

  useEffect(() => { onProgress?.(game); }, [game]);

  // The grid is not playable while the how-to-play card covers it.
  const blocked = showHelp;
  const isPending = (row: number, col: number) => pendingMark.current?.[0] === row
    && pendingMark.current?.[1] === col;

  // Applies a waiting X now (a move on another square should not cancel it).
  const flushPendingMark = () => {
    clearTimeout(clickTimer.current);
    const pending = pendingMark.current;
    pendingMark.current = null;
    if (pending) setGame((state) => toggleMark(state, pending[0], pending[1]));
  };

  const onClick = (row: number, col: number) => {
    if (blocked) return;
    if (ignoreNextClick.current) {
      ignoreNextClick.current = false;
      return;
    }
    if (!isPending(row, col)) flushPendingMark();
    clearTimeout(clickTimer.current);
    pendingMark.current = [row, col];
    clickTimer.current = setTimeout(flushPendingMark, CLICK_DELAY_MS);
  };

  const onDoubleClick = (row: number, col: number) => {
    if (blocked) return;
    if (isPending(row, col)) {
      // The clicks were the start of this double-click, not an X.
      clearTimeout(clickTimer.current);
      pendingMark.current = null;
    } else {
      flushPendingMark();
    }
    setGame((state) => guess(state, row, col));
  };

  const onPointerDown = (event: React.PointerEvent, row: number, col: number) => {
    ignoreNextClick.current = false;
    lastPointerType.current = event.pointerType;
    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
    clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => {
      ignoreNextClick.current = true;
      onDoubleClick(row, col);
    }, LONG_PRESS_MS);
  };

  const cancelPress = () => clearTimeout(pressTimer.current);

  const onKeyDown = (event: React.KeyboardEvent, row: number, col: number) => {
    if (blocked) return;
    if ((event.key === 'g' || event.key === 'G') && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      onDoubleClick(row, col);
      return;
    }
    const move = MOVES[event.key];
    if (!move) return;
    event.preventDefault();
    const next: [number, number] = [
      Math.min(Math.max(row + move[0], 0), puzzle.size - 1),
      Math.min(Math.max(col + move[1], 0), puzzle.size - 1),
    ];
    setFocused(next);
    cellRefs.current.get(`${next[0]}-${next[1]}`)?.focus();
  };

  const { size, regions, solution } = puzzle;
  const finished = game.status !== 'playing';

  return (
    <div style={styles.area}>
      <div style={styles.header}>
        <span>{`Found ${game.found} / ${size}`}</span>
        <span>{`Wrong guesses: ${game.mistakes} of ${MAX_MISTAKES}`}</span>
        <button type="button" aria-label="How to play" onClick={() => setShowHelp(true)} style={styles.helpButton}>?</button>
        {isHost && (
          <button type="button" onClick={onEndGame} style={styles.secondaryButton}>End game for everyone</button>
        )}
      </div>
      <div
        style={styles.grid(size)}
        aria-hidden={blocked}
        onContextMenu={(event) => {
          // Only the touch long-press menu gets in the way; mouse right-click is left alone.
          if (lastPointerType.current === 'touch' || lastPointerType.current === 'pen') {
            event.preventDefault();
          }
        }}
      >
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
              ref={(element) => { cellRefs.current.set(`${row}-${col}`, element); }}
              tabIndex={!blocked && focused[0] === row && focused[1] === col ? 0 : -1}
              aria-label={`Row ${row + 1}, column ${col + 1}${
                mark === 'found' ? `, ${people[region].name} found` : MARK_LABELS[mark]}`}
              style={styles.cell(styles.REGION_COLORS[region % styles.REGION_COLORS.length], edges)}
              onClick={() => onClick(row, col)}
              onDoubleClick={() => onDoubleClick(row, col)}
              onKeyDown={(event) => onKeyDown(event, row, col)}
              onFocus={() => setFocused([row, col])}
              onPointerDown={(event) => onPointerDown(event, row, col)}
              onPointerUp={cancelPress}
              onPointerLeave={cancelPress}
              onPointerCancel={cancelPress}
            >
              {showPerson && <Avatar person={people[region]} missed={mark !== 'found'} />}
              {!showPerson && mark === 'x' && (
                <svg data-testid="x-mark" viewBox="0 0 10 10" aria-hidden="true" style={styles.xMark}>
                  <path d="M1.5 1.5 L8.5 8.5 M8.5 1.5 L1.5 8.5" />
                </svg>
              )}
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
