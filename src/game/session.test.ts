import { canHostGame, createGamePayload, readGamePayload } from './session';
import { createRng } from './rng';
import { puzzleProblems } from './test-helpers';

describe('canHostGame', () => {
  it('Given the presenter, then they can start the game', () => {
    expect(canHostGame({ presenter: true, role: 'VIEWER' })).toBe(true);
  });
  it('Given a moderator, then they can start the game', () => {
    expect(canHostGame({ presenter: false, role: 'MODERATOR' })).toBe(true);
  });
  it('Given a viewer who is not presenter, or no user yet, then they cannot', () => {
    expect(canHostGame({ presenter: false, role: 'VIEWER' })).toBe(false);
    expect(canHostGame(undefined)).toBe(false);
  });
});

describe('game payload', () => {
  const users = [{
    userId: 'u1', name: 'Alex', avatar: '', color: '',
  }];

  it('Given 1 user and size 10, when a game is created and read back, then everyone gets the same valid puzzle with 10 people', () => {
    const payload = createGamePayload(users, 10, createRng(5), 'mod1');
    const game = readGamePayload(JSON.parse(JSON.stringify(payload)));
    expect(game.puzzle.size).toBe(10);
    expect(puzzleProblems(game.puzzle)).toEqual([]);
    expect(game.people).toHaveLength(10);
    expect(game.gameId).toBe(payload.gameId);
    expect(game.hostUserId).toBe('mod1');
  });

  it('Given two games, then they have different ids', () => {
    expect(createGamePayload(users, 8, createRng(1), 'mod1').gameId)
      .not.toBe(createGamePayload(users, 8, createRng(2), 'mod1').gameId);
  });

  it('Given an avatar link that matches what BBB reports for that user, then it is shown', () => {
    const payload = createGamePayload(
      [{
        userId: 'u1', name: 'Alex', avatar: 'https://bbb.example/a.png', color: '',
      }],
      8,
      createRng(5),
      'mod1',
    );
    const known = new Map([['u1', 'https://bbb.example/a.png']]);
    const game = readGamePayload(payload, known);
    expect(game.people.find((p) => p.id === 'u1').avatar).toBe('https://bbb.example/a.png');
  });

  it('Given an avatar link BBB does not report for that user, then it is dropped so no outside server is contacted', () => {
    const payload = createGamePayload(users, 8, createRng(5), 'mod1');
    payload.people[0].avatar = 'https://attacker.example/pixel.png';
    const game = readGamePayload(payload, new Map());
    expect(game.people[0].avatar).toBe('');
  });

  it('Given a colour that is not a plain hex colour, then it is dropped so it cannot load anything', () => {
    const payload = createGamePayload(users, 8, createRng(5), 'mod1');
    payload.people[0].color = 'url(https://attacker.example/p.png)';
    payload.people[1].color = '#1a2b3c';
    const game = readGamePayload(payload);
    expect(game.people[0].color).toBe('');
    expect(game.people[1].color).toBe('#1a2b3c');
  });

  it('Given a hand-made puzzle with more than one answer, then it is rejected as unfair', () => {
    // Every row its own region: valid placement, but many answers.
    const rows = Array.from({ length: 8 }, (_, r) => String(r).repeat(8)).join('/');
    const payload = { ...createGamePayload(users, 8, createRng(5), 'mod1'), puzzle: `${rows}:02461357` };
    expect(readGamePayload(payload)).toBeNull();
  });

  it('Given a payload whose people are not in their own regions, then it is rejected', () => {
    const payload = createGamePayload(users, 8, createRng(5), 'mod1');
    const [rows, solution] = payload.puzzle.split(':');
    const swapped = solution[1] + solution[0] + solution.slice(2);
    expect(readGamePayload({ ...payload, puzzle: `${rows}:${swapped}` })).toBeNull();
  });

  it('Given a payload without the creator, then it is rejected', () => {
    const { hostUserId, ...rest } = createGamePayload(users, 8, createRng(5), 'mod1');
    expect(hostUserId).toBe('mod1');
    expect(readGamePayload(rest)).toBeNull();
  });

  it('Given a malformed payload, then it is rejected rather than crashing the board', () => {
    expect(readGamePayload(undefined)).toBeNull();
    expect(readGamePayload({ gameId: 'x', puzzle: 'garbage', people: [] })).toBeNull();
  });
});
