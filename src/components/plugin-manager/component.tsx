import * as React from 'react';
import {
  useEffect, useMemo, useRef, useState,
} from 'react';
import * as ReactDOM from 'react-dom/client';
import {
  AppsGalleryEntry,
  BbbPluginSdk,
  DataChannelTypes,
  GenericContentMainArea,
  PluginApi,
  RESET_DATA_CHANNEL,
} from 'bigbluebutton-html-plugin-sdk';
import Board from '../board/component';
import { GameState } from '../../game/types';
import SetupCard from '../setup-card/component';
import { eligibleUsers, MeetingUserRecord } from '../../game/people';
import {
  acceptedResults, byTime, chatLineFor, everyoneOut, findWinner, finishRank, instructionsChat,
  NO_STANDING, readResult, ResultEntry, ResultKind, ResultPayload,
} from '../../game/results';
import { createStore } from '../../game/store';
import {
  canHostGame, createGamePayload, GamePayload, readGamePayload,
} from '../../game/session';

interface PluginManagerProps {
  pluginUuid: string;
}

// How long a finish waits before it can be announced, in case an earlier one is still arriving.
const SETTLE_MS = 1500;

// [DILIGENCE: GDPR] Reads participant names and avatar links so they can appear in the game.
const USERS_SUBSCRIPTION = `
  subscription HideAndGoSeekUsers {
    user {
      userId
      name
      avatar
      color
      bot
      currentlyInMeeting
    }
  }
`;

function mount(element: HTMLElement, content: React.ReactElement): ReactDOM.Root {
  const root = ReactDOM.createRoot(element);
  root.render(content);
  return root;
}

function PluginManager({ pluginUuid }: PluginManagerProps): React.ReactElement {
  BbbPluginSdk.initialize(pluginUuid);
  const pluginApi: PluginApi = BbbPluginSdk.getPluginApi(pluginUuid);

  const currentUser = pluginApi.useCurrentUser()?.data;
  const isHost = canHostGame(currentUser);
  const users = pluginApi.useCustomSubscription<{ user: MeetingUserRecord[] }>(USERS_SUBSCRIPTION);
  const { data: channel, pushEntry, deleteEntry } = pluginApi.useDataChannel<GamePayload>(
    'game',
    DataChannelTypes.LATEST_ITEM,
  );
  // [DILIGENCE: GDPR] Every player's outcomes (right, wrong, finished, out), kept on the BBB
  // server until the next game or End game clears them.
  // [REVIEW REQUIRED] Data storage: every participant writes to this channel (pushPermission
  // 'all'); entries are validated (acceptedResults) before they count or reach chat.
  const {
    data: resultsChannel, pushEntry: pushResult, deleteEntry: deleteResults,
  } = pluginApi.useDataChannel<ResultPayload>('results', DataChannelTypes.ALL_ITEMS);
  const [setupOpen, setSetupOpen] = useState(false);

  const usersReady = !!users && !users.loading && !!users.data;

  // Each data-channel entry is one game; its server-assigned entryId is the game's key.
  const latest = channel?.data?.[0];
  const gameKey = latest?.entryId;
  const knownAvatars = new Map((users?.data?.user ?? []).map((user) => [user.userId, user.avatar]));
  // Only avatars of people in this game matter; other joins and leaves must not rebuild it.
  const payloadPeople: { id?: unknown }[] = Array.isArray(latest?.payloadJson?.people)
    ? latest.payloadJson.people : [];
  const avatarKey = JSON.stringify(
    payloadPeople.map((person) => knownAvatars.get(String(person?.id))),
  );
  const game = useMemo(
    () => readGamePayload(latest?.payloadJson, knownAvatars),
    [gameKey, avatarKey],
  );

  const userNames = new Map((users?.data?.user ?? []).map((user) => [user.userId, user.name]));
  const nameOf = (userId: string) => userNames.get(userId) ?? 'Someone';
  const allResults: ResultEntry[] = (resultsChannel?.data ?? [])
    .map((entry) => ({
      entryId: entry.entryId,
      createdBy: entry.createdBy,
      createdAt: entry.createdAt,
      payload: readResult(entry.payloadJson),
    }))
    .filter((entry) => entry.payload);
  const accepted = game ? acceptedResults(allResults, gameKey, game.puzzle.size) : [];

  // A finish is only counted once it has been here SETTLE_MS, so a slightly earlier finish
  // that reaches this browser a moment later still wins. Results already present when the
  // game first loads here (e.g. after a reload) count straight away.
  const firstSeen = useRef<{ gameKey: string; at: Map<string, number> }>({
    gameKey: null, at: new Map(),
  });
  if (firstSeen.current.gameKey !== gameKey && !resultsChannel?.loading) {
    firstSeen.current = { gameKey, at: new Map(accepted.map((entry) => [entry.entryId, 0])) };
  }
  const now = Date.now();
  accepted.forEach((entry) => {
    if (!firstSeen.current.at.has(entry.entryId)) firstSeen.current.at.set(entry.entryId, now);
  });
  const finishWait = Math.max(0, ...accepted
    .filter((entry) => entry.payload.kind === 'finished')
    .map((entry) => firstSeen.current.at.get(entry.entryId) + SETTLE_MS - now));
  const [, setSettleTick] = useState(0);
  useEffect(() => {
    if (finishWait <= 0) return undefined;
    const timer = setTimeout(() => setSettleTick((tick) => tick + 1), finishWait);
    return () => clearTimeout(timer);
  });
  const results = finishWait > 0
    ? accepted.filter((entry) => entry.payload.kind !== 'finished')
    : accepted;
  const resultsKey = results.map((entry) => entry.entryId).join(',');
  const winnerId = gameKey ? findWinner(results, gameKey) : null;

  // Live race standing for the board, which lives in its own React root.
  const standing = useRef(createStore(NO_STANDING)).current;
  useEffect(() => {
    standing.set({
      winnerName: winnerId ? nameOf(winnerId) : null,
      iAmWinner: !!winnerId && winnerId === currentUser?.userId,
      canStartNew: !!winnerId || (!!gameKey && everyoneOut(results, gameKey)),
    });
  });

  // Only the game creator's browser posts to public chat, so each line appears once.
  // Results already present when it loads (e.g. after a reload) are not reposted.
  const isChatPoster = !!game && !!currentUser && game.hostUserId === currentUser.userId;
  const posted = useRef<{ gameKey: string; ids: Set<string> } | null>(null);
  useEffect(() => {
    if (!isChatPoster || resultsChannel?.loading) return;
    if (posted.current?.gameKey !== gameKey) {
      posted.current = { gameKey, ids: new Set(results.map((entry) => entry.entryId)) };
      return;
    }
    [...results]
      .sort(byTime)
      .filter((entry) => !posted.current.ids.has(entry.entryId))
      .forEach((entry) => {
        posted.current.ids.add(entry.entryId);
        pluginApi.serverCommands.chat.sendPublicChatMessage({
          textMessageInMarkdownFormat: chatLineFor(
            entry.payload.kind,
            nameOf(entry.createdBy),
            { ...entry.payload, size: game.puzzle.size },
            finishRank(results, gameKey, entry.createdBy),
          ),
        });
      });
  }, [isChatPoster, gameKey, resultsKey, resultsChannel?.loading]);

  // Data minimisation: results from an earlier game (e.g. pushed by a board that had not yet
  // switched to the new game) are deleted from the server by the creator's browser.
  const staleIds = isChatPoster
    ? allResults.filter((entry) => entry.payload.gameKey !== gameKey).map((entry) => entry.entryId)
    : [];
  const deleted = useRef(new Set<string>());
  useEffect(() => {
    const fresh = staleIds.filter((id) => !deleted.current.has(id));
    if (fresh.length === 0 || typeof deleteResults !== 'function') return;
    fresh.forEach((id) => deleted.current.add(id));
    deleteResults(fresh);
  }, [staleIds.join(',')]);

  // Each board saves its progress here, so re-registering the board (role change, setup card
  // opened and cancelled, avatars arriving) never resets a player's game.
  const progress = useRef(new Map<string, GameState>());

  // The setup card and board are mounted in their own React roots, so they read the latest
  // values through refs rather than re-registering (which would reset a player's progress).
  const live = useRef({
    users: [] as MeetingUserRecord[],
    pushEntry,
    deleteEntry,
    pushResult,
    deleteResults,
    gameKey,
    userId: currentUser?.userId,
  });
  live.current = {
    users: users?.data?.user ?? [],
    pushEntry,
    deleteEntry,
    pushResult,
    deleteResults,
    gameKey,
    userId: currentUser?.userId,
  };

  // The SDK supplies the push function asynchronously; results made before it arrives are
  // queued rather than crashing the board, and sent as soon as it is ready.
  const pendingResults = useRef<ResultPayload[]>([]);
  const flushResults = () => {
    if (typeof live.current.pushResult !== 'function') return;
    const queued = pendingResults.current;
    pendingResults.current = [];
    // [REVIEW REQUIRED] Data storage: writes this player's outcome to the shared results channel.
    queued.forEach((payload) => live.current.pushResult(payload));
  };
  const reportOutcome = (key: string, kind: ResultKind, state: GameState) => {
    pendingResults.current.push({
      gameKey: key, kind, found: state.found, mistakes: state.mistakes,
    });
    flushResults();
  };
  useEffect(flushResults);

  useEffect(() => {
    pluginApi.setAppsGalleryItems(isHost ? [
      new AppsGalleryEntry({
        name: 'Hide and Go Seek',
        icon: 'user',
        onClick: () => setSetupOpen(true),
      }),
    ] : []);
  }, [isHost]);

  useEffect(() => {
    if (!isHost) setSetupOpen(false);
  }, [isHost]);

  useEffect(() => {
    if (game) pluginApi.uiCommands.presentationArea.open();
  }, [gameKey]);

  useEffect(() => {
    const startGame = (size: number) => {
      const people = eligibleUsers(live.current.users);
      // [REVIEW REQUIRED] Data storage: writes participants' names and avatar links to the
      // meeting's shared data channel, kept on the BBB server until End game resets it.
      const previous = live.current.gameKey;
      // Data minimisation: the previous game's results go before the new game starts.
      live.current.deleteResults([RESET_DATA_CHANNEL]);
      live.current.pushEntry(createGamePayload(people, size, Math.random, live.current.userId));
      // Data minimisation: drop the previous game's names from the server.
      if (previous) live.current.deleteEntry([previous]);
      // [DILIGENCE: GDPR] Public chat is kept for the meeting and included in recordings.
      pluginApi.serverCommands.chat.sendPublicChatMessage({
        textMessageInMarkdownFormat: instructionsChat(size),
      });
      setSetupOpen(false);
    };
    const endGame = () => {
      live.current.deleteEntry([RESET_DATA_CHANNEL]);
      live.current.deleteResults([RESET_DATA_CHANNEL]);
    };

    if (isHost && setupOpen) {
      pluginApi.setGenericContentItems([
        new GenericContentMainArea({
          contentFunction: (element) => mount(
            element,
            <SetupCard
              onStart={startGame}
              onCancel={() => setSetupOpen(false)}
              ready={usersReady}
            />,
          ),
        }),
      ]);
    } else if (game) {
      pluginApi.setGenericContentItems([
        new GenericContentMainArea({
          contentFunction: (element) => mount(
            element,
            <Board
              key={gameKey}
              puzzle={game.puzzle}
              people={game.people}
              isHost={isHost}
              onEndGame={endGame}
              savedState={progress.current.get(gameKey)}
              onProgress={(state) => progress.current.set(gameKey, state)}
              standing={standing}
              onOutcome={(kind, state) => reportOutcome(gameKey, kind, state)}
              onNewGame={() => setSetupOpen(true)}
            />,
          ),
        }),
      ]);
    } else {
      pluginApi.setGenericContentItems([]);
    }
  }, [isHost, setupOpen, usersReady, gameKey, game]);

  return null;
}

export default PluginManager;
