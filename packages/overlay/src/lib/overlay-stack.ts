/**
 * Shared stack of open overlay surfaces (anchored panels, modals, drawers),
 * bottom → top. Escape handling only ever acts on the topmost surface, so a
 * popup opened inside a modal closes before the modal itself.
 *
 * **Exported from the package barrel on purpose.** Modal surfaces live outside
 * this package too — `@oge-ui/navigation`'s drawer is the first — and every one
 * of them has to join *this* ordering. A second stack does not merely duplicate
 * code: the two would each believe they hold the topmost surface, so Escape
 * inside a popup opened within a drawer would close the drawer instead of the
 * popup. There is exactly one stack, and it is public so it can stay that way.
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
