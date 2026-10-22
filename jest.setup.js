// jsdom has no PointerEvent, so React would never see `pointerType` in tests. Test-only stand-in.
if (typeof window !== 'undefined' && !window.PointerEvent) {
  class PointerEvent extends MouseEvent {
    constructor(type, init = {}) {
      super(type, init);
      this.pointerType = init.pointerType || '';
    }
  }
  window.PointerEvent = PointerEvent;
}
