import * as React from 'react';
import { useState } from 'react';
import { MAX_SIZE, MIN_SIZE } from '../../game/types';
import * as styles from '../styles';

interface SetupCardProps {
  onStart: (size: number) => void;
  onCancel: () => void;
  // False until the meeting's user list has loaded.
  ready: boolean;
}

const SIZES = Array.from({ length: MAX_SIZE - MIN_SIZE + 1 }, (_, i) => MIN_SIZE + i);

// Shown only to the presenter/moderator who opened the game from the Apps Gallery.
function SetupCard({ onStart, onCancel, ready }: SetupCardProps): React.ReactElement {
  const [size, setSize] = useState(MIN_SIZE);
  return (
    <div style={styles.area}>
      <div role="dialog" aria-label="Find the People" style={styles.card}>
        <h2 style={styles.heading}>Find the People</h2>
        <p>
          Everyone gets their own copy of the same puzzle in place of the whiteboard.
          The people hidden in it are from this meeting.
        </p>
        <label htmlFor="ftp-size" style={styles.label}>
          Grid size
          <select
            id="ftp-size"
            value={size}
            onChange={(event) => setSize(Number(event.target.value))}
            style={styles.select}
          >
            {SIZES.map((option) => (
              <option key={option} value={option}>{`${option} x ${option}`}</option>
            ))}
          </select>
        </label>
        <div style={styles.actions}>
          <button type="button" onClick={onCancel} style={styles.secondaryButton}>Cancel</button>
          <button
            type="button"
            disabled={!ready}
            onClick={() => onStart(size)}
            style={styles.primaryButton}
          >
            {ready ? 'Start game' : 'Loading participants…'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SetupCard;
