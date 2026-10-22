import { createStore } from './store';

describe('createStore', () => {
  it('Given a subscriber, when the value changes, then it is notified and reads the new value', () => {
    const store = createStore({ count: 0 });
    const listener = jest.fn();
    const unsubscribe = store.subscribe(listener);
    store.set({ count: 1 });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.get()).toEqual({ count: 1 });
    unsubscribe();
    store.set({ count: 2 });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('Given an equal value, then subscribers are not notified', () => {
    const store = createStore({ count: 0 });
    const listener = jest.fn();
    store.subscribe(listener);
    store.set({ count: 0 });
    expect(listener).not.toHaveBeenCalled();
  });
});
