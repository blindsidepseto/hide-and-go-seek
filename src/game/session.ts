import { MeetingUser, selectPeople } from './people';
import { decodePuzzle, encodePuzzle, pickPuzzle } from './puzzles';
import { findSolutions } from './solver';
import {
  MAX_SIZE, MIN_SIZE, Person, Puzzle, Rng,
} from './types';

// What the host pushes to the `game` data channel. Every participant builds the same board from it.
export interface GamePayload {
  gameId: string;
  puzzle: string;
  people: Person[];
}

export interface Game {
  gameId: string;
  puzzle: Puzzle;
  people: Person[];
}

// [REVIEW REQUIRED] Access control: UI-side check only. The manifest's data-channel
// permissions (moderator, presenter) are what the server enforces.
export function canHostGame(user?: { presenter: boolean; role: string }): boolean {
  return !!user && (user.presenter || user.role === 'MODERATOR');
}

export function createGamePayload(users: MeetingUser[], size: number, rng: Rng): GamePayload {
  const gameId = `${rng().toString(36).slice(2, 10)}${rng().toString(36).slice(2, 10)}`;
  return {
    gameId,
    puzzle: encodePuzzle(pickPuzzle(size, rng)),
    people: selectPeople(users, size, rng),
  };
}

const isText = (value: unknown): value is string => typeof value === 'string';

// [REVIEW REQUIRED] Data egress: a presenter (possibly a student) can push any payload. An
// avatar link is only shown if it is the link BBB itself reports for that user, so a payload
// cannot make participants' browsers contact an arbitrary server.
const trustedAvatar = (id: string, value: unknown, knownAvatars: Map<string, string>) => (
  isText(value) && value !== '' && knownAvatars.get(id) === value ? value : ''
);

// Colours end up in CSS, so only plain hex colours are allowed (no url(...) or other values).
const safeColor = (value: unknown) => (isText(value) && /^#[0-9a-f]{3,8}$/i.test(value) ? value : '');

// Checks data that arrived over the data channel before it reaches the board.
// `knownAvatars` maps user ids to the avatar links this client's BBB user list reports.
export function readGamePayload(
  raw: unknown,
  knownAvatars: Map<string, string> = new Map(),
): Game | null {
  const payload = raw as Partial<GamePayload> | undefined;
  if (!payload || !isText(payload.gameId) || !isText(payload.puzzle)
    || !Array.isArray(payload.people)) {
    return null;
  }
  let puzzle: Puzzle;
  try {
    puzzle = decodePuzzle(payload.puzzle);
  } catch {
    return null;
  }
  const { size, regions, solution } = puzzle;
  const validNumber = (value: number) => Number.isInteger(value) && value >= 0 && value < size;
  if (size < MIN_SIZE || size > MAX_SIZE
    || regions.some((row) => row.length !== size || !row.every(validNumber))
    || solution.length !== size || !solution.every(validNumber)
    || new Set(solution).size !== size
    || solution.some((col, row) => regions[row][col] !== row)
    || solution.some((col, row) => row > 0 && Math.abs(col - solution[row - 1]) <= 1)
    || payload.people.length !== size) {
    return null;
  }
  // Only fair puzzles: exactly one answer, and it is the one the payload says.
  const answers = findSolutions(regions, 2);
  if (answers.length !== 1 || answers[0].some((col, row) => col !== solution[row])) return null;
  const people = payload.people.map((person, index) => {
    const id = isText(person?.id) ? person.id : `person-${index}`;
    return {
      id,
      name: isText(person?.name) ? person.name : 'Someone',
      avatar: trustedAvatar(id, person?.avatar, knownAvatars),
      color: safeColor(person?.color),
      generic: person?.generic === true,
    };
  });
  return { gameId: payload.gameId, puzzle, people };
}
