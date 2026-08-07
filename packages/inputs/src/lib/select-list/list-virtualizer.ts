import { computed, signal } from '@angular/core';
import { OffsetTree, computeWindow, type ViewportWindow } from '@oge-ui/core';
import type { OgeInputSize } from '../field/input-types';

/** Options object form of the `virtualScroll` input. */
export interface OgeVirtualScrollOptions {
  /** Fixed option row height in px; defaults to the size-matched `OGE_SELECT_OPTION_HEIGHT`. */
  itemHeight?: number;
  /** Extra rows rendered outside the viewport on each side (default 4). */
  overscan?: number;
}

/**
 * Fixed option row heights per field size — must match the
 * `.oge-select-list-virtual` CSS in `field-chrome.scss`.
 */
export const OGE_SELECT_OPTION_HEIGHT: Record<OgeInputSize, number> = {
  sm: 28,
  md: 34,
  lg: 40,
};

/** Signal getters the owning dropdown editor wires into the virtualizer. */
export interface ListVirtualizerDeps {
  itemCount: () => number;
  itemHeight: () => number;
  overscan: () => number;
  /** The scrollable list height budget (`dropdownMaxHeight` or the CSS default). */
  viewportHeight: () => number;
  /** The scrolling `.oge-select-list` element — `null` while the popup is closed. */
  scrollContainer: () => HTMLElement | null;
}

/**
 * Fixed-item-height window model for virtualized dropdown lists, built on
 * core's `OffsetTree` + `computeWindow`. The owning component renders
 * `window().start..end` inside a `totalHeight` spacer translated by
 * `offsetY`, feeds `onScroll` from the list element, and routes the engine's
 * `scrollActiveIntoView` hook to `scrollToIndex` (the active option may not
 * be in the DOM).
 */
export class ListVirtualizerModel {
  constructor(private readonly deps: ListVirtualizerDeps) {}

  /** Current scroll offset of the list element, mirrored into a signal. */
  readonly scrollTop = signal(0);

  private readonly tree = computed(
    () => new OffsetTree(this.deps.itemCount(), this.deps.itemHeight()),
  );

  /** The rendered slice: `{ start, end, offsetY, totalHeight }`. */
  readonly window = computed<ViewportWindow>(() =>
    computeWindow(
      this.scrollTop(),
      this.deps.viewportHeight(),
      this.tree(),
      this.deps.overscan(),
    ),
  );

  /** Scroll-event handler for the list element. */
  onScroll(event: Event): void {
    this.scrollTop.set((event.target as HTMLElement).scrollTop);
  }

  /** Resets to the top (popup close / filter reset). */
  reset(): void {
    this.scrollTop.set(0);
  }

  /**
   * Scrolls the given absolute index into view with offset math — the
   * virtualized row may not exist in the DOM, so `scrollIntoView` cannot be
   * used. The DOM write is deferred a frame because the list element renders
   * after the popup opens.
   */
  scrollToIndex(index: number): void {
    const itemHeight = this.deps.itemHeight();
    const viewport = this.deps.viewportHeight();
    const top = index * itemHeight;
    const bottom = top + itemHeight;
    const current = this.scrollTop();
    let target = current;
    if (top < current) target = top;
    else if (bottom > current + viewport) target = bottom - viewport;
    if (target === current) return;
    this.scrollTop.set(target);
    const schedule =
      typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame
        : (callback: FrameRequestCallback) => (callback(0), 0);
    schedule(() => {
      const el = this.deps.scrollContainer();
      if (el) el.scrollTop = target;
    });
  }
}
