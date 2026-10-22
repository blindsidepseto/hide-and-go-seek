import * as React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import PluginManager from './component';
import { decodePuzzle, PUZZLE_BANK } from '../../game/puzzles';

// A stand-in for the BBB client: records what the plugin registers.
const fakeApi = {
  currentUser: { presenter: false, role: 'VIEWER' },
  channelEntries: [] as object[],
  users: [] as object[],
  setAppsGalleryItems: jest.fn(),
  setGenericContentItems: jest.fn(),
  pushEntry: jest.fn(),
  deleteEntry: jest.fn(),
  openPresentation: jest.fn(),
};

jest.mock('bigbluebutton-html-plugin-sdk', () => ({
  BbbPluginSdk: {
    initialize: jest.fn(),
    getPluginApi: () => ({
      useCurrentUser: () => ({ loading: false, data: fakeApi.currentUser }),
      useCustomSubscription: () => ({ loading: false, data: { user: fakeApi.users } }),
      useDataChannel: () => ({
        data: { loading: false, data: fakeApi.channelEntries },
        pushEntry: fakeApi.pushEntry,
        deleteEntry: fakeApi.deleteEntry,
        replaceEntry: jest.fn(),
      }),
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
  DataChannelTypes: { LATEST_ITEM: 'latest' },
  RESET_DATA_CHANNEL: 'RESET_DATA_CHANNEL',
}));

const lastCall = (mock: jest.Mock) => mock.mock.calls[mock.mock.calls.length - 1][0];

const validGame = {
  entryId: 'e1',
  payloadJson: {
    gameId: 'g1',
    puzzle: PUZZLE_BANK[8][0],
    people: Array.from({ length: 8 }, (_, i) => ({
      id: `p${i}`, name: `P${i}`, avatar: '', color: '', generic: true,
    })),
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  fakeApi.currentUser = { presenter: false, role: 'VIEWER' };
  fakeApi.channelEntries = [];
  fakeApi.users = [];
});

describe('PluginManager', () => {
  it('Given a viewer, then no Apps Gallery entry is added', () => {
    render(<PluginManager pluginUuid="uuid" />);
    expect(lastCall(fakeApi.setAppsGalleryItems)).toEqual([]);
  });

  it('Given the presenter, then a "Hide and Go Seek" Apps Gallery entry is added', () => {
    fakeApi.currentUser = { presenter: true, role: 'VIEWER' };
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

    fakeApi.currentUser = { presenter: true, role: 'VIEWER' };
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
    fakeApi.currentUser = { presenter: true, role: 'MODERATOR' };
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
});
