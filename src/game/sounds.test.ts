import {
  createSoundPlayer, loadMuted, saveMuted, SOUNDS, SoundName, soundForChange,
} from './sounds';
import { createGame, guess, toggleMark } from './rules';
import { Puzzle } from './types';

const puzzle: Puzzle = {
  size: 8,
  regions: Array.from({ length: 8 }, (_, r) => Array(8).fill(r)),
  solution: [0, 2, 4, 6, 1, 3, 5, 7],
};

describe('sound definitions', () => {
  it('Given the six game events, then each has its own different sound, all under 1 second', () => {
    const names: SoundName[] = ['mark', 'unmark', 'correct', 'wrong', 'winner', 'out'];
    expect(Object.keys(SOUNDS).sort()).toEqual([...names].sort());
    expect(new Set(names.map((name) => JSON.stringify(SOUNDS[name]))).size).toBe(6);
    names.forEach((name) => {
      const end = Math.max(...SOUNDS[name].map((note) => note.start + note.duration));
      expect(end).toBeLessThan(1);
    });
  });
});

describe('soundForChange', () => {
  const start = createGame(puzzle);

  it('Given an X is added, then the mark sound; given it is removed, then the unmark sound', () => {
    const marked = toggleMark(start, 0, 1);
    expect(soundForChange(start, marked)).toBe('mark');
    expect(soundForChange(marked, toggleMark(marked, 0, 1))).toBe('unmark');
  });

  it('Given a correct guess, then the correct sound', () => {
    expect(soundForChange(start, guess(start, 0, 0))).toBe('correct');
  });

  it('Given a wrong guess, then the wrong sound; given the 3rd wrong guess, then the out sound', () => {
    const one = guess(start, 0, 1);
    expect(soundForChange(start, one)).toBe('wrong');
    const two = guess(one, 0, 2);
    expect(soundForChange(two, guess(two, 0, 3))).toBe('out');
  });

  it('Given the last person is found, then the correct sound (the winner sound waits for the server to confirm who was first)', () => {
    let game = start;
    puzzle.solution.slice(0, 7).forEach((col, row) => { game = guess(game, row, col); });
    expect(soundForChange(game, guess(game, 7, 7))).toBe('correct');
  });

  it('Given no change, then no sound', () => {
    expect(soundForChange(start, start)).toBeNull();
  });
});

describe('createSoundPlayer', () => {
  function fakeAudio() {
    const oscillators: { frequency: number; type: string }[] = [];
    const context = {
      currentTime: 0,
      destination: {},
      state: 'running',
      resume: jest.fn(),
      createOscillator: () => {
        const osc = {
          type: '',
          frequency: {
            setValueAtTime: (v: number) => { oscillators.push({ frequency: v, type: osc.type }); },
          },
          connect: jest.fn(),
          start: jest.fn(),
          stop: jest.fn(),
        };
        return osc;
      },
      createGain: () => ({
        gain: { setValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn() },
        connect: jest.fn(),
      }),
    };
    return { context, oscillators };
  }

  it('Given a sound is played, then one tone per note is scheduled', () => {
    const { context, oscillators } = fakeAudio();
    const play = createSoundPlayer(() => context as unknown as AudioContext);
    play('winner');
    const expected = SOUNDS.winner.map((note) => note.frequency);
    expect(oscillators.map((o) => o.frequency)).toEqual(expected);
  });

  it('Given the browser has no audio support, then playing is silently skipped', () => {
    const play = createSoundPlayer(() => { throw new Error('no audio'); });
    expect(() => play('mark')).not.toThrow();
  });
});

describe('mute setting', () => {
  it('Given mute is saved, then it is loaded back; given storage is blocked, then sound is on', () => {
    saveMuted(true);
    expect(loadMuted()).toBe(true);
    saveMuted(false);
    expect(loadMuted()).toBe(false);
    const getItem = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(loadMuted()).toBe(false);
    getItem.mockRestore();
  });
});
