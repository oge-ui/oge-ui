/**
 * Z-order of the open non-modal windows, back → front. Shared by every
 * window of both render layers so "bring to front" orders all of them, not
 * just the ones one component tree knows about. Deliberately separate from the
 * overlay Escape stack (`overlay-stack.ts`): a window is not modal, never
 * blocks the page and handles Escape only while it has focus.
 */
const order: object[] = [];
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of [...listeners]) listener();
}

/** Adds a window on top of the others (moves it there if already present). */
export function registerOgeWindow(window: object): void {
  const index = order.indexOf(window);
  if (index !== -1) {
    if (index === order.length - 1) return;
    order.splice(index, 1);
  }
  order.push(window);
  notify();
}

/** Removes a window (tolerates windows never registered). */
export function unregisterOgeWindow(window: object): void {
  const index = order.indexOf(window);
  if (index === -1) return;
  order.splice(index, 1);
  notify();
}

/** Raises a registered window above the others; `true` when the order changed. */
export function bringOgeWindowToFront(window: object): boolean {
  const index = order.indexOf(window);
  if (index === -1 || index === order.length - 1) return false;
  order.splice(index, 1);
  order.push(window);
  notify();
  return true;
}

/** Stacking layer of a window — `0` at the back; `-1` when not open. */
export function ogeWindowLayer(window: object): number {
  return order.indexOf(window);
}

/** `true` for the frontmost open window (the active one). */
export function isOgeFrontWindow(window: object): boolean {
  return order.length > 0 && order[order.length - 1] === window;
}

/** Number of open windows. */
export function ogeOpenWindowCount(): number {
  return order.length;
}

/** Calls `listener` after every order change; returns the unsubscribe. */
export function subscribeOgeWindows(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
