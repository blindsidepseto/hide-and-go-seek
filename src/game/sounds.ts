import { GameState } from './types';

// Game sounds are synthesised in the browser with the Web Audio API:
// no sound files, nothing fetched.

export type SoundName = 'mark' | 'unmark' | 'correct' | 'wrong' | 'winner' | 'out';

export interface Note {
  frequency: number;
  start: number; // seconds after the sound begins
  duration: number; // seconds
  wave: OscillatorType;
}

// Each event has its own pitch, pattern and tone colour, so they can be told apart by ear.
export const SOUNDS: Record<SoundName, Note[]> = {
  // a. mark an X: short high tick
  mark: [{
    frequency: 1200, start: 0, duration: 0.05, wave: 'triangle',
  }],
  // d. remove an X: short lower tick
  unmark: [{
    frequency: 600, start: 0, duration: 0.05, wave: 'triangle',
  }],
  // b. correct guess: rising two-note chime
  correct: [
    {
      frequency: 660, start: 0, duration: 0.12, wave: 'sine',
    },
    {
      frequency: 990, start: 0.1, duration: 0.2, wave: 'sine',
    },
  ],
  // c. wrong guess: low buzz
  wrong: [{
    frequency: 140, start: 0, duration: 0.3, wave: 'sawtooth',
  }],
  // e. winner: four-note fanfare
  winner: [
    {
      frequency: 523, start: 0, duration: 0.12, wave: 'square',
    },
    {
      frequency: 659, start: 0.12, duration: 0.12, wave: 'square',
    },
    {
      frequency: 784, start: 0.24, duration: 0.12, wave: 'square',
    },
    {
      frequency: 1047, start: 0.36, duration: 0.4, wave: 'square',
    },
  ],
  // f. out after too many wrong guesses: falling three-note tone
  out: [
    {
      frequency: 440, start: 0, duration: 0.2, wave: 'triangle',
    },
    {
      frequency: 349, start: 0.2, duration: 0.2, wave: 'triangle',
    },
    {
      frequency: 262, start: 0.4, duration: 0.45, wave: 'triangle',
    },
  ],
};

const VOLUME = 0.15;

// Which sound a change in the player's own board makes. The winner sound is not chosen here:
// it plays only once the server's results confirm this player finished first.
export function soundForChange(prev: GameState, next: GameState): SoundName | null {
  if (prev === next) return null;
  if (next.status === 'lost' && prev.status !== 'lost') return 'out';
  if (next.found > prev.found) return 'correct';
  if (next.mistakes > prev.mistakes) return 'wrong';
  for (let r = 0; r < next.marks.length; r += 1) {
    for (let c = 0; c < next.marks[r].length; c += 1) {
      if (prev.marks[r][c] !== next.marks[r][c]) {
        if (next.marks[r][c] === 'x') return 'mark';
        if (prev.marks[r][c] === 'x') return 'unmark';
      }
    }
  }
  return null;
}

export type PlaySound = (name: SoundName) => void;

// The audio context is created on first use (after a click), as browsers require.
export function createSoundPlayer(
  getContext: () => AudioContext = () => new AudioContext(),
): PlaySound {
  let context: AudioContext | null = null;
  return (name) => {
    try {
      context = context ?? getContext();
      if (context.state === 'suspended') context.resume();
      const now = context.currentTime;
      SOUNDS[name].forEach((note) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = note.wave;
        oscillator.frequency.setValueAtTime(note.frequency, now + note.start);
        gain.gain.setValueAtTime(VOLUME, now + note.start);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.duration);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(now + note.start);
        oscillator.stop(now + note.start + note.duration);
      });
    } catch {
      // No audio support or audio blocked: the game works without sound.
    }
  };
}

const MUTE_KEY = 'hideAndGoSeek.muted';

// Per-browser preference only. Storage may be unavailable (private mode, blocked),
// so default to sound on.
export function loadMuted(): boolean {
  try {
    return window.localStorage.getItem(MUTE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function saveMuted(muted: boolean): void {
  try {
    window.localStorage.setItem(MUTE_KEY, String(muted));
  } catch {
    // Not saved; mute still applies for this page.
  }
}
