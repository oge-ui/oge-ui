import type { OgeMenuItem } from './menu-types';

/**
 * Menu keyboard arithmetic, extracted verbatim from the Angular
 * `oge-menu-list` (ADR 0001 Faz 3) so the Angular and React menus cannot
 * drift on wrap-around, disabled-skipping or type-ahead semantics. The render
 * layers own the DOM (focus, `aria-activedescendant`, scrolling); everything
 * here is index math over the `items` array, separators included.
 */

/** Indexes of items an active row may land on: enabled, not a separator. */
export function menuEnabledIndexes(items: readonly OgeMenuItem[]): number[] {
  const indexes: number[] = [];
  items.forEach((item, index) => {
    if (!item.disabled && !item.separator) indexes.push(index);
  });
  return indexes;
}

/**
 * The next active index for ArrowDown/ArrowUp (`delta` ±1), wrapping and
 * skipping disabled rows and separators. From no active row (`-1`),
 * ArrowDown lands on the first enabled row and ArrowUp on the last — the
 * APG menu pattern. Returns `-1` when nothing is enabled.
 */
export function menuMoveIndex(
  items: readonly OgeMenuItem[],
  activeIndex: number,
  delta: 1 | -1,
): number {
  const enabled = menuEnabledIndexes(items);
  if (enabled.length === 0) return -1;
  const current = enabled.indexOf(activeIndex);
  if (current === -1) {
    return delta === 1 ? enabled[0] : enabled[enabled.length - 1];
  }
  return enabled[(current + delta + enabled.length) % enabled.length];
}

/** First (`'first'`) or last (`'last'`) enabled index; `-1` when none. */
export function menuEdgeIndex(
  items: readonly OgeMenuItem[],
  edge: 'first' | 'last',
): number {
  const enabled = menuEnabledIndexes(items);
  if (enabled.length === 0) return -1;
  return edge === 'first' ? enabled[0] : enabled[enabled.length - 1];
}

/**
 * The menu type-ahead buffer machine.
 *
 * A growing distinct buffer keeps matching the current item ("d", "de"); a
 * repeated single character cycles through the items starting with it. The
 * buffer resets after `timeoutMs` of silence. Time is injected per call so
 * the machine stays clock-free (hosts pass `performance.now()`).
 */
export class OgeMenuTypeAhead {
  private buffer = '';
  private lastTypeTime = Number.NEGATIVE_INFINITY;

  constructor(private readonly timeoutMs: () => number) {}

  /** Forgets the buffer — call when the menu closes or its items change. */
  reset(): void {
    this.buffer = '';
    this.lastTypeTime = Number.NEGATIVE_INFINITY;
  }

  /**
   * Feeds one printable key and returns the index the active row should move
   * to, or `-1` for no match. `now` is the caller's clock reading.
   */
  next(
    key: string,
    items: readonly OgeMenuItem[],
    activeIndex: number,
    now: number,
  ): number {
    if (now - this.lastTypeTime > this.timeoutMs()) this.buffer = '';
    this.lastTypeTime = now;
    this.buffer += key.toLowerCase();
    const buffer = this.buffer;
    const repeated =
      buffer.length > 1 && buffer.split('').every((c) => c === buffer[0]);
    const needle = repeated ? buffer[0] : buffer;
    // A growing distinct buffer keeps matching the current item; a repeated
    // single character starts searching from the next row so it cycles.
    const startOffset = buffer.length > 1 && !repeated ? 0 : 1;
    const count = items.length;
    for (let step = startOffset; step <= count; step++) {
      const index = (activeIndex + step + count) % count;
      const item = items[index];
      if (!item || item.disabled || item.separator) continue;
      if (item.text.toLowerCase().startsWith(needle)) return index;
    }
    return -1;
  }
}
