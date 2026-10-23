import * as React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import PluginManager, { mainAreaId } from './component';
import { decodePuzzle, PUZZLE_BANK } from '../../game/puzzles';

// A stand-in for the BBB client: records what the plugin registers.
const fakeApi = {
  currentUser: { userId: 'v1', presenter: false, role: 'VIEWER' },
  channelEntries: [] as object[],
  resultEntries: [] as object[],
  users: [] as object[],
  setAppsGalleryItems: jest.fn(),
  setGenericContentItems: jest.fn(),
  pushEntry: jest.fn(),
  deleteEntry: jest.fn(),
  pushResult: jest.fn() as jest.Mock | undefined,
  deleteResult: jest.fn(),
  sendChat: jest.fn(),
  openPresentation: jest.fn(),
};

jest.mock('bigbluebutton-html-plugin-sdk', () => ({
  BbbPluginSdk: {
    initialize: jest.fn(),
    getPluginApi: () => ({
      useCurrentUser: () => ({ loading: false, data: fakeApi.currentUser }),
      useCustomSubscription: () => ({ loading: false, data: { user: fakeApi.users } }),
      useDataChannel: (name: string) => (name === 'results' ? {
        data: { loading: false, data: fakeApi.resultEntries },
        pushEntry: fakeApi.pushResult,
        deleteEntry: fakeApi.deleteResult,
        replaceEntry: jest.fn(),
      } : {
        data: { loading: false, data: fakeApi.channelEntries },
        pushEntry: fakeApi.pushEntry,
        deleteEntry: fakeApi.deleteEntry,
        replaceEntry: jest.fn(),
      }),
      serverCommands: { chat: { sendPublicChatMessage: fakeApi.sendChat } },
      setAppsGalleryItems: fakeApi.setAppsGalleryItems,
      setGenericContentItems: fakeApi.setGenericContentItems,
      uiCommands: { presentationArea: { open: fakeApi.openPresentation, close: jest.fn() } },
    }),
  },
  AppsGalleryEntry: class {
    name: string;

    onClick: () => void;

    constructor(props: { name: string; onClick: () => void }) { Object.assign(this, props); }
  },
  GenericContentMainArea: class {
    constructor(props: object) { Object.assign(this, props); }
  },
  DataChannelTypes: { LATEST_ITEM: 'latest', ALL_ITEMS: 'all' },
  RESET_DATA_CHANNEL: 'RESET_DATA_CHANNEL',
}));

const lastCall = (mock: jest.Mock) => mock.mock.calls[mock.mock.calls.length - 1][0];

// Renders whatever the plugin last put in the whiteboard area.
function mountMainArea(): HTMLElement {
  const element = document.createElement('div');
  act(() => { lastCall(fakeApi.setGenericContentItems)[0].contentFunction(element); });
  return element;
}

const button = (root: HTMLElement, text: string) => [...root.querySelectorAll('button')]
  .find((b) => b.textContent === text);

type ResultArgs = [string, string, number, string, number?, number?];
const result = (...[entryId, createdBy, second, kind, found = 0, mistakes = 0]: ResultArgs) => ({
  entryId,
  createdBy,
  createdAt: `2026-10-22T10:00:${String(second).padStart(2, '0')}Z`,
  payloadJson: {
    gameKey: 'e1', kind, found, mistakes,
  },
});

const meetingUsers = [
  {
    userId: 'mod1', name: 'Teacher', avatar: '', color: '', bot: false, currentlyInMeeting: true,
  },
  {
    userId: 'alex', name: 'Alex', avatar: '', color: '', bot: false, currentlyInMeeting: true,
  },
  {
    userId: 'sam', name: 'Sam', avatar: '', color: '', bot: false, currentlyInMeeting: true,
  },
];

const validGame = {
  entryId: 'e1',
  payloadJson: {
    gameId: 'g1',
    hostUserId: 'mod1',
    puzzle: PUZZLE_BANK[8][0],
    people: Array.from({ length: 8 }, (_, i) => ({
      id: `p${i}`, name: `P${i}`, avatar: '', color: '', generic: true,
    })),
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  fakeApi.currentUser = { userId: 'v1', presenter: false, role: 'VIEWER' };
  fakeApi.channelEntries = [];
  fakeApi.resultEntries = [];
  fakeApi.users = [];
  fakeApi.pushResult = jest.fn();
});

afterEach(() => jest.useRealTimers());

// Every result a player makes on the way to finishing: 7 correct guesses, then the finish.
const finishRun = (by: string, firstSecond: number) => [
  ...Array.from({ length: 7 }, (_, i) => result(`${by}-c${i}`, by, firstSecond + i, 'correct', i + 1, 0)),
  result(`${by}-f`, by, firstSecond + 7, 'finished', 8, 0),
];

describe('PluginManager', () => {
  it('Given a viewer, then no Apps Gallery entry is added', () => {
    render(<PluginManager pluginUuid="uuid" />);
    expect(lastCall(fakeApi.setAppsGalleryItems)).toEqual([]);
  });

  it('Given the presenter, then a "Hide and Go Seek" Apps Gallery entry is added', () => {
    fakeApi.currentUser = { userId: 'v1', presenter: true, role: 'VIEWER' };
    render(<PluginManager pluginUuid="uuid" />);
    expect(lastCall(fakeApi.setAppsGalleryItems).map((item: { name: string }) => item.name))
      .toEqual(['Hide and Go Seek']);
  });

  it('Given no game, then the whiteboard area is left alone', () => {
    render(<PluginManager pluginUuid="uuid" />);
    expect(lastCall(fakeApi.setGenericContentItems)).toEqual([]);
  });

  it('Given a game in the data channel, then every participant gets the board in the whiteboard area, opened', () => {
    fakeApi.channelEntries = [validGame];
    render(<PluginManager pluginUuid="uuid" />);
    expect(lastCall(fakeApi.setGenericContentItems)).toHaveLength(1);
    expect(fakeApi.openPresentation).toHaveBeenCalled();
  });

  it('Given a malformed game in the data channel, then the whiteboard area is left alone', () => {
    fakeApi.channelEntries = [{ entryId: 'bad', payloadJson: { gameId: 'x' } }];
    render(<PluginManager pluginUuid="uuid" />);
    expect(lastCall(fakeApi.setGenericContentItems)).toEqual([]);
  });

  it('Given a game in progress, when the user becomes presenter, then their board keeps its progress', () => {
    jest.useFakeTimers();
    fakeApi.channelEntries = [validGame];
    const { rerender } = render(<PluginManager pluginUuid="uuid" />);
    // A square in row 0 that is not the answer.
    const wrongCol = decodePuzzle(PUZZLE_BANK[8][0]).solution[0] === 1 ? 2 : 1;
    const target = `[data-testid="cell-0-${wrongCol}"]`;
    const first = document.createElement('div');
    act(() => { lastCall(fakeApi.setGenericContentItems)[0].contentFunction(first); });
    fireEvent.click([...first.querySelectorAll('button')].find((b) => b.textContent === "Let's play"));
    fireEvent.click(first.querySelector(target));
    fireEvent.click(first.querySelector(target));
    fireEvent.doubleClick(first.querySelector(target));
    expect(first.querySelector(target).getAttribute('data-mark')).toBe('wrong');

    fakeApi.currentUser = { userId: 'v1', presenter: true, role: 'VIEWER' };
    rerender(<PluginManager pluginUuid="uuid" />);
    const second = document.createElement('div');
    act(() => { lastCall(fakeApi.setGenericContentItems)[0].contentFunction(second); });
    expect(second.querySelector(target).getAttribute('data-mark')).toBe('wrong');
    jest.useRealTimers();
  });

  it('Given a new channel entry that reuses the old game id, then a fresh board is registered', () => {
    fakeApi.channelEntries = [validGame];
    const { rerender } = render(<PluginManager pluginUuid="uuid" />);
    const calls = fakeApi.setGenericContentItems.mock.calls.length;
    fakeApi.channelEntries = [{ ...validGame, entryId: 'e2' }];
    rerender(<PluginManager pluginUuid="uuid" />);
    expect(fakeApi.setGenericContentItems.mock.calls.length).toBeGreaterThan(calls);
  });

  it('Given a game, when someone not in the grid joins the meeting, then the board is not re-registered', () => {
    fakeApi.channelEntries = [validGame];
    const { rerender } = render(<PluginManager pluginUuid="uuid" />);
    const calls = fakeApi.setGenericContentItems.mock.calls.length;
    fakeApi.users = [{
      userId: 'newcomer', name: 'N', avatar: 'https://bbb.example/n.png', color: '', bot: false, currentlyInMeeting: true,
    }];
    rerender(<PluginManager pluginUuid="uuid" />);
    expect(fakeApi.setGenericContentItems.mock.calls.length).toBe(calls);
  });

  it('Given an earlier game, when the host starts a new one, then the earlier entry is deleted from the server', () => {
    fakeApi.currentUser = { userId: 'mod1', presenter: true, role: 'MODERATOR' };
    fakeApi.channelEntries = [validGame];
    render(<PluginManager pluginUuid="uuid" />);
    act(() => { lastCall(fakeApi.setAppsGalleryItems)[0].onClick(); });
    const element = document.createElement('div');
    act(() => { lastCall(fakeApi.setGenericContentItems)[0].contentFunction(element); });
    act(() => { fireEvent.click(element.querySelector('button:last-child')); });
    expect(fakeApi.pushEntry).toHaveBeenCalled();
    expect(fakeApi.deleteEntry).toHaveBeenCalledWith(['e1']);
  });

  it('Given an unchanged game, when the plugin re-renders, then the board is not re-registered (progress is kept)', () => {
    fakeApi.channelEntries = [validGame];
    const { rerender } = render(<PluginManager pluginUuid="uuid" />);
    const calls = fakeApi.setGenericContentItems.mock.calls.length;
    rerender(<PluginManager pluginUuid="uuid" />);
    expect(fakeApi.setGenericContentItems.mock.calls.length).toBe(calls);
  });

  it('Given a player guesses, then the outcome is pushed to the results channel for this game', () => {
    jest.useFakeTimers();
    fakeApi.channelEntries = [validGame];
    render(<PluginManager pluginUuid="uuid" />);
    const board = mountMainArea();
    fireEvent.click(button(board, "Let's play"));
    const { solution } = decodePuzzle(PUZZLE_BANK[8][0]);
    fireEvent.keyDown(board.querySelector(`[data-testid="cell-0-${solution[0]}"]`), { key: 'g' });
    expect(fakeApi.pushResult).toHaveBeenCalledWith({
      gameKey: 'e1', kind: 'correct', found: 1, mistakes: 0,
    });
    jest.useRealTimers();
  });

  it('Given the game creator, when a new result arrives, then one chat line is posted with the name of the sender', () => {
    fakeApi.currentUser = { userId: 'mod1', presenter: true, role: 'MODERATOR' };
    fakeApi.users = meetingUsers;
    fakeApi.channelEntries = [validGame];
    fakeApi.resultEntries = [result('r1', 'sam', 1, 'wrong', 0, 1)];
    const { rerender } = render(<PluginManager pluginUuid="uuid" />);
    // Results already there when the creator's browser loads are not reposted.
    expect(fakeApi.sendChat).not.toHaveBeenCalled();
    fakeApi.resultEntries = [...fakeApi.resultEntries, result('r2', 'alex', 2, 'correct', 1, 0)];
    rerender(<PluginManager pluginUuid="uuid" />);
    rerender(<PluginManager pluginUuid="uuid" />);
    expect(fakeApi.sendChat).toHaveBeenCalledTimes(1);
    expect(fakeApi.sendChat).toHaveBeenCalledWith({ textMessageInMarkdownFormat: '✅ Alex found a hidden person (1/8)' });
  });

  it('Given someone who did not create the game, when a result arrives, then they post nothing to chat', () => {
    fakeApi.currentUser = { userId: 'other-mod', presenter: false, role: 'MODERATOR' };
    fakeApi.users = meetingUsers;
    fakeApi.channelEntries = [validGame];
    const { rerender } = render(<PluginManager pluginUuid="uuid" />);
    fakeApi.resultEntries = [result('r1', 'alex', 1, 'correct', 1, 0)];
    rerender(<PluginManager pluginUuid="uuid" />);
    expect(fakeApi.sendChat).not.toHaveBeenCalled();
  });

  it('Given two finishers, then the first is announced as winner and the second by place', () => {
    fakeApi.currentUser = { userId: 'mod1', presenter: true, role: 'MODERATOR' };
    fakeApi.users = meetingUsers;
    fakeApi.channelEntries = [validGame];
    jest.useFakeTimers();
    const { rerender } = render(<PluginManager pluginUuid="uuid" />);
    fakeApi.resultEntries = [...finishRun('alex', 0), ...finishRun('sam', 10)];
    rerender(<PluginManager pluginUuid="uuid" />);
    act(() => { jest.advanceTimersByTime(2000); });
    const lines = fakeApi.sendChat.mock.calls.map((call) => call[0].textMessageInMarkdownFormat);
    expect(lines.filter((line: string) => line.includes('everyone'))).toEqual([
      '🏆 Alex found everyone first and wins!',
      '🎉 Sam found everyone (2nd)',
    ]);
    jest.useRealTimers();
  });

  it('Given the host starts a game, then the results are cleared and the instructions are posted to chat once', () => {
    fakeApi.currentUser = { userId: 'mod1', presenter: true, role: 'MODERATOR' };
    fakeApi.users = meetingUsers;
    render(<PluginManager pluginUuid="uuid" />);
    act(() => { lastCall(fakeApi.setAppsGalleryItems)[0].onClick(); });
    const setup = mountMainArea();
    act(() => { fireEvent.click(button(setup, 'Start game')); });
    expect(fakeApi.deleteResult).toHaveBeenCalledWith(['RESET_DATA_CHANNEL']);
    expect(lastCall(fakeApi.pushEntry)).toMatchObject({ hostUserId: 'mod1' });
    expect(fakeApi.sendChat).toHaveBeenCalledTimes(1);
    expect(lastCall(fakeApi.sendChat).textMessageInMarkdownFormat).toContain('Hide and Go Seek');
  });

  it('Given a winner, then every board shows them, and the host can start a new game from the board', () => {
    fakeApi.currentUser = { userId: 'mod1', presenter: true, role: 'MODERATOR' };
    fakeApi.users = meetingUsers;
    fakeApi.channelEntries = [validGame];
    fakeApi.resultEntries = finishRun('alex', 0);
    render(<PluginManager pluginUuid="uuid" />);
    const board = mountMainArea();
    expect(board.textContent).toContain('Winner: Alex');
    act(() => { fireEvent.click(button(board, 'New game')); });
    const setup = mountMainArea();
    expect(button(setup, 'Start game')).toBeTruthy();
  });

  it('Given the host ends the game, then both channels are cleared and the Apps Gallery can start a game again', () => {
    fakeApi.currentUser = { userId: 'mod1', presenter: true, role: 'MODERATOR' };
    fakeApi.users = meetingUsers;
    fakeApi.channelEntries = [validGame];
    const { rerender } = render(<PluginManager pluginUuid="uuid" />);
    const board = mountMainArea();
    act(() => { fireEvent.click(button(board, 'End game for everyone')); });
    expect(fakeApi.deleteEntry).toHaveBeenCalledWith(['RESET_DATA_CHANNEL']);
    expect(fakeApi.deleteResult).toHaveBeenCalledWith(['RESET_DATA_CHANNEL']);
    fakeApi.channelEntries = [];
    rerender(<PluginManager pluginUuid="uuid" />);
    expect(lastCall(fakeApi.setGenericContentItems)).toEqual([]);
    expect(lastCall(fakeApi.setAppsGalleryItems).map((item: { name: string }) => item.name)).toEqual(['Hide and Go Seek']);
  });

  it('Given two near-simultaneous finishes arriving in the wrong order, then only the earlier one is announced as winner', () => {
    jest.useFakeTimers();
    fakeApi.currentUser = { userId: 'mod1', presenter: true, role: 'MODERATOR' };
    fakeApi.users = meetingUsers;
    fakeApi.channelEntries = [validGame];
    const { rerender } = render(<PluginManager pluginUuid="uuid" />);
    const alex = finishRun('alex', 0);
    const sam = finishRun('sam', 1);
    // Sam's finish (later server time) arrives first; Alex's arrives half a second later.
    fakeApi.resultEntries = [...alex.slice(0, 7), ...sam];
    rerender(<PluginManager pluginUuid="uuid" />);
    act(() => { jest.advanceTimersByTime(500); });
    fakeApi.resultEntries = [...alex, ...sam];
    rerender(<PluginManager pluginUuid="uuid" />);
    act(() => { jest.advanceTimersByTime(2000); });
    const wins = fakeApi.sendChat.mock.calls
      .map((call) => call[0].textMessageInMarkdownFormat)
      .filter((line: string) => line.includes('wins'));
    expect(wins).toEqual(['🏆 Alex found everyone first and wins!']);
    jest.useRealTimers();
  });

  it('Given the results channel is not ready yet, when a player guesses, then the board keeps working and the result is sent once ready', () => {
    jest.useFakeTimers();
    fakeApi.pushResult = undefined;
    fakeApi.channelEntries = [validGame];
    const { rerender } = render(<PluginManager pluginUuid="uuid" />);
    const board = mountMainArea();
    fireEvent.click(button(board, "Let's play"));
    const { solution } = decodePuzzle(PUZZLE_BANK[8][0]);
    expect(() => fireEvent.keyDown(board.querySelector(`[data-testid="cell-0-${solution[0]}"]`), { key: 'g' })).not.toThrow();
    expect(board.querySelector(`[data-testid="cell-0-${solution[0]}"]`).getAttribute('data-mark')).toBe('found');
    fakeApi.pushResult = jest.fn();
    rerender(<PluginManager pluginUuid="uuid" />);
    expect(fakeApi.pushResult).toHaveBeenCalledWith({
      gameKey: 'e1', kind: 'correct', found: 1, mistakes: 0,
    });
    jest.useRealTimers();
  });

  const resultFor = (gameKey: string, entryId: string) => ({
    ...result(entryId, 'alex', 1, 'correct', 1, 0),
    payloadJson: {
      gameKey, kind: 'correct', found: 1, mistakes: 0,
    },
  });

  it('Given results left over from a game this browser showed before, then the creator deletes them from the server', () => {
    fakeApi.currentUser = { userId: 'mod1', presenter: true, role: 'MODERATOR' };
    fakeApi.users = meetingUsers;
    fakeApi.channelEntries = [{ ...validGame, entryId: 'e0' }];
    const { rerender } = render(<PluginManager pluginUuid="uuid" />);
    fakeApi.channelEntries = [validGame];
    fakeApi.resultEntries = [resultFor('e0', 'old1')];
    rerender(<PluginManager pluginUuid="uuid" />);
    expect(fakeApi.deleteResult).toHaveBeenCalledWith(['old1']);
  });

  it('Given results for a game this browser has not seen yet (someone else just started it), then they are not deleted', () => {
    fakeApi.currentUser = { userId: 'mod1', presenter: true, role: 'MODERATOR' };
    fakeApi.users = meetingUsers;
    fakeApi.channelEntries = [validGame];
    fakeApi.resultEntries = [resultFor('e9', 'newer1')];
    render(<PluginManager pluginUuid="uuid" />);
    expect(fakeApi.deleteResult).not.toHaveBeenCalledWith(['newer1']);
  });

  it('Given a winner, when someone else finishes later, then the winner stays shown while that finish is checked', () => {
    jest.useFakeTimers();
    fakeApi.currentUser = { userId: 'mod1', presenter: true, role: 'MODERATOR' };
    fakeApi.users = meetingUsers;
    fakeApi.channelEntries = [validGame];
    fakeApi.resultEntries = finishRun('alex', 0);
    const { rerender } = render(<PluginManager pluginUuid="uuid" />);
    const board = mountMainArea();
    expect(board.textContent).toContain('Winner: Alex');
    fakeApi.resultEntries = [...finishRun('alex', 0), ...finishRun('sam', 20)];
    rerender(<PluginManager pluginUuid="uuid" />);
    expect(board.textContent).toContain('Winner: Alex');
    expect(button(board, 'New game')).toBeTruthy();
  });

  it('Given the setup card and the board, then both use the same whiteboard-area id, so BBB swaps the view in place', () => {
    // BBB 4.0 falls back to the whiteboard when one main-area item is replaced by another with a
    // new id in one step (seen on dev-bbb: New game showed the whiteboard, not the setup card).
    fakeApi.currentUser = { userId: 'mod1', presenter: true, role: 'MODERATOR' };
    fakeApi.users = meetingUsers;
    fakeApi.channelEntries = [validGame];
    fakeApi.resultEntries = finishRun('alex', 0);
    render(<PluginManager pluginUuid="uuid" />);
    expect(lastCall(fakeApi.setGenericContentItems)[0].id).toBe(mainAreaId('uuid'));
    const board = mountMainArea();
    act(() => { fireEvent.click(button(board, 'New game')); });
    expect(lastCall(fakeApi.setGenericContentItems)[0].id).toBe(mainAreaId('uuid'));
    expect(button(mountMainArea(), 'Start game')).toBeTruthy();
  });

  it('Given two copies of the plugin, then their whiteboard-area ids differ, so they cannot hide each other', () => {
    expect(mainAreaId('uuid-a')).not.toBe(mainAreaId('uuid-b'));
  });

  it('Given the host opens the game from the Apps Gallery, then the whiteboard area is opened to show it', () => {
    fakeApi.currentUser = { userId: 'mod1', presenter: true, role: 'MODERATOR' };
    fakeApi.users = meetingUsers;
    render(<PluginManager pluginUuid="uuid" />);
    fakeApi.openPresentation.mockClear();
    act(() => { lastCall(fakeApi.setAppsGalleryItems)[0].onClick(); });
    expect(fakeApi.openPresentation).toHaveBeenCalled();
  });
});
