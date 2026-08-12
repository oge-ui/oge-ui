/**
 * Focus-trap helpers for modal surfaces. Tabbables are computed at key-press
 * time (no sentinel elements), so content added or removed while the modal is
 * open never leaves the trap stale.
 */

const TABBABLE_SELECTOR = [
  'a[href]',
  'button',
  'input',
  'select',
  'textarea',
  '[tabindex]',
  '[contenteditable="true"]',
  'audio[controls]',
  'video[controls]',
  'details > summary',
].join(', ');

/**
 * Visible, enabled, `tabIndex >= 0` elements inside `root`, in DOM order.
 * Visibility is a pragmatic subset (inline/computed `display`/`visibility`,
 * `[hidden]` ancestors, `disabled`) that also behaves under jsdom, which does
 * not cascade ancestor `display: none` into computed styles.
 */
export function getTabbableElements(root: HTMLElement): HTMLElement[] {
  const candidates = Array.from(
    root.querySelectorAll<HTMLElement>(TABBABLE_SELECTOR),
  );
  return candidates.filter((el) => {
    if (el.tabIndex < 0) return false;
    if ((el as HTMLElement & { disabled?: boolean }).disabled === true) {
      return false;
    }
    if (el.closest('[hidden]') !== null) return false;
    const style = getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });
}

/**
 * Handles a Tab keydown inside `root`: wraps first ↔ last. With no tabbable
 * content the `fallback` element (the `tabindex="-1"` panel) is focused so
 * focus can never escape the trap.
 */
export function trapTabKey(
  event: KeyboardEvent,
  root: HTMLElement,
  fallback: HTMLElement,
): void {
  const tabbables = getTabbableElements(root);
  if (tabbables.length === 0) {
    event.preventDefault();
    fallback.focus();
    return;
  }
  const first = tabbables[0];
  const last = tabbables[tabbables.length - 1];
  const active = document.activeElement;
  if (event.shiftKey) {
    // Also wrap when focus sits on the panel itself (initial `panel` focus).
    if (active === first || !root.contains(active) || active === fallback) {
      event.preventDefault();
      last.focus();
    }
  } else if (active === last || active === fallback || !root.contains(active)) {
    event.preventDefault();
    first.focus();
  }
}
