import { eligibleUsers, selectPeople, MeetingUser } from './people';
import { createRng } from './rng';

const users: MeetingUser[] = [
  {
    userId: 'u1', name: 'Alex', avatar: 'https://bbb.example/avatar/u1.png', color: '#123456',
  },
  {
    userId: 'u2', name: 'Sam', avatar: '', color: '#654321',
  },
  {
    userId: 'u3', name: 'Robin', avatar: '', color: '',
  },
];

describe('selectPeople', () => {
  it('Given 3 users and an 8x8 grid, then all 3 users plus 5 generic people with distinct names are used', () => {
    const people = selectPeople(users, 8, createRng(1));
    expect(people).toHaveLength(8);
    expect(people.filter((p) => !p.generic).map((p) => p.id).sort()).toEqual(['u1', 'u2', 'u3']);
    const generic = people.filter((p) => p.generic);
    expect(generic).toHaveLength(5);
    expect(new Set(people.map((p) => p.name)).size).toBe(8);
    generic.forEach((p) => expect(p.avatar).toBe(''));
  });

  it('Given more users than the grid size, then exactly size real users are picked, none generic', () => {
    const many: MeetingUser[] = Array.from({ length: 20 }, (_, i) => ({
      userId: `u${i}`, name: `User ${i}`, avatar: '', color: '',
    }));
    const people = selectPeople(many, 8, createRng(2));
    expect(people).toHaveLength(8);
    expect(people.every((p) => !p.generic)).toBe(true);
    expect(new Set(people.map((p) => p.id)).size).toBe(8);
  });

  it('Given a user whose name matches a made-up name, then no generic person reuses that name', () => {
    const people = selectPeople([{
      userId: 'x', name: 'Avery', avatar: '', color: '',
    }], 15, createRng(3));
    expect(people.filter((p) => p.name === 'Avery')).toHaveLength(1);
  });

  it('Given a user with an avatar, then the avatar URL is kept', () => {
    const people = selectPeople(users, 8, createRng(4));
    expect(people.find((p) => p.id === 'u1').avatar).toBe('https://bbb.example/avatar/u1.png');
  });
});

describe('eligibleUsers', () => {
  const meeting = [
    {
      userId: 'm1', name: 'Teacher', avatar: '', color: '', bot: false, currentlyInMeeting: true,
    },
    {
      userId: 'v1', name: 'Student', avatar: '', color: '', bot: false, currentlyInMeeting: true,
    },
    {
      userId: 'v2', name: 'Left early', avatar: '', color: '', bot: false, currentlyInMeeting: false,
    },
    {
      userId: 'b1', name: 'Recorder', avatar: '', color: '', bot: true, currentlyInMeeting: true,
    },
  ];

  it('Given moderators, viewers, a bot and someone who left, then present non-bot users are eligible', () => {
    expect(eligibleUsers(meeting).map((u) => u.userId)).toEqual(['m1', 'v1']);
  });
});
