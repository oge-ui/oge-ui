/**
 * Ref-counted body scroll lock shared by stacked modals. The first acquire
 * hides body overflow and compensates the vanished scrollbar width with
 * `padding-right` (read once, before any style write — no layout thrash);
 * the last release restores the previously inlined styles verbatim.
 */

let lockCount = 0;
let savedOverflow = '';
let savedPaddingRight = '';

/** Acquires one scroll-lock reference (first caller locks the body). */
export function lockBodyScroll(): void {
  if (typeof document === 'undefined') return;
  if (lockCount++ > 0) return;
  const body = document.body;
  const scrollbarWidth =
    window.innerWidth - document.documentElement.clientWidth;
  savedOverflow = body.style.overflow;
  savedPaddingRight = body.style.paddingRight;
  if (scrollbarWidth > 0) {
    const current = parseFloat(getComputedStyle(body).paddingRight) || 0;
    body.style.paddingRight = `${current + scrollbarWidth}px`;
  }
  body.style.overflow = 'hidden';
}

/** Releases one scroll-lock reference (last caller unlocks the body). */
export function unlockBodyScroll(): void {
  if (typeof document === 'undefined') return;
  if (lockCount === 0 || --lockCount > 0) return;
  restore('overflow', savedOverflow);
  restore('padding-right', savedPaddingRight);
}

/**
 * Puts one declaration back the way the app had it. An empty saved value
 * means the app never inlined the property, so it is *removed* rather than
 * assigned `''` — assigning an empty string to a longhand is a no-op in some
 * CSSOM implementations, which would leave the lock's own padding behind.
 */
function restore(property: 'overflow' | 'padding-right', value: string): void {
  if (value) document.body.style.setProperty(property, value);
  else document.body.style.removeProperty(property);
}

/** Resets the module state between tests. @internal */
export function resetScrollLockForTests(): void {
  lockCount = 0;
  savedOverflow = '';
  savedPaddingRight = '';
}
