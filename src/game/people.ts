import { shuffle } from './rng';
import { Person, Rng } from './types';

// The subset of a BBB user record the game uses.
export interface MeetingUser {
  userId: string;
  name: string;
  avatar: string;
  color: string;
}

// A user record as returned by the plugin's GraphQL `user` subscription.
export interface MeetingUserRecord extends MeetingUser {
  bot: boolean;
  currentlyInMeeting: boolean;
}

// [REVIEW REQUIRED] Access control: names and avatars chosen here are sent to every
// participant, even when the moderator has hidden the user list (product decision 2026-10-21).
export function eligibleUsers(users: MeetingUserRecord[]): MeetingUser[] {
  return users
    .filter((user) => user.currentlyInMeeting && !user.bot)
    .map(({
      userId, name, avatar, color,
    }) => ({
      userId, name, avatar, color,
    }));
}

// Made-up names for filling grids larger than the meeting. Gender-neutral on purpose.
const MADE_UP_NAMES = [
  'Avery', 'Blake', 'Casey', 'Dakota', 'Emerson', 'Finley', 'Harper', 'Jordan',
  'Kai', 'Logan', 'Morgan', 'Parker', 'Quinn', 'Riley', 'Rowan', 'Sage',
  'Skyler', 'Taylor', 'Jamie', 'Reese',
];

const GENERIC_COLOR = '#7a869a';

// Picks `size` people: real meeting users first (at random), then made-up people.
export function selectPeople(users: MeetingUser[], size: number, rng: Rng): Person[] {
  const real: Person[] = shuffle(users, rng).slice(0, size).map((user) => ({
    id: user.userId,
    name: user.name,
    avatar: user.avatar || '',
    color: user.color || GENERIC_COLOR,
    generic: false,
  }));

  const takenNames = new Set(real.map((person) => person.name));
  const freeNames = shuffle(MADE_UP_NAMES.filter((name) => !takenNames.has(name)), rng);
  const generic: Person[] = freeNames.slice(0, size - real.length).map((name, index) => ({
    id: `generic-${index}`,
    name,
    avatar: '',
    color: GENERIC_COLOR,
    generic: true,
  }));

  return shuffle([...real, ...generic], rng);
}
