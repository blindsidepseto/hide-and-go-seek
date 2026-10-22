// A minimal observable value. The board is mounted in its own React root by the BBB client,
// so live data (winner, host controls) reaches it through a store instead of re-registering
// the board, which would interrupt the player.
export interface Store<T> {
  get: () => T;
  set: (value: T) => void;
  subscribe: (listener: () => void) => () => void;
}

export function createStore<T>(initial: T): Store<T> {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set: (next) => {
      if (JSON.stringify(next) === JSON.stringify(value)) return;
      value = next;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}
