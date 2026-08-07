/**
 * Shared stack of open overlay surfaces (anchored panels, modals),
 * bottom → top. Escape handling only ever acts on the topmost surface, so a
 * popup opened inside a modal closes before the modal itself. Module-internal
 * — not exported from the package barrel.
 */
const stack: object[] = [];

/** Registers a surface as the new topmost overlay (no-op if already present). */
export function pushOverlay(surface: object): void {
  if (!stack.includes(surface)) stack.push(surface);
}

/** Removes a surface from the stack (tolerates surfaces never pushed). */
export function removeOverlay(surface: object): void {
  const index = stack.indexOf(surface);
  if (index !== -1) stack.splice(index, 1);
}

/** `true` only for the topmost surface; `false` for absent surfaces. */
export function isTopOverlay(surface: object): boolean {
  return stack[stack.length - 1] === surface;
}
