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
  canHostGame, createGamePayload, GamePayload, readGamePayload,
} from '../../game/session';

interface PluginManagerProps {
  pluginUuid: string;
}

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

  // Each board saves its progress here, so re-registering the board (role change, setup card
  // opened and cancelled, avatars arriving) never resets a player's game.
  const progress = useRef(new Map<string, GameState>());

  // The setup card and board are mounted in their own React roots, so they read the latest
  // values through refs rather than re-registering (which would reset a player's progress).
  const live = useRef({
    users: [] as MeetingUserRecord[], pushEntry, deleteEntry, gameKey,
  });
  live.current = {
    users: users?.data?.user ?? [],
    pushEntry,
    deleteEntry,
    gameKey,
  };

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
      live.current.pushEntry(createGamePayload(people, size, Math.random));
      // Data minimisation: drop the previous game's names from the server.
      if (previous) live.current.deleteEntry([previous]);
      setSetupOpen(false);
    };
    const endGame = () => live.current.deleteEntry([RESET_DATA_CHANNEL]);

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
