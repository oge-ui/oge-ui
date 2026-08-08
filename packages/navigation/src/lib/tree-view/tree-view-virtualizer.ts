import { computed, signal } from '@angular/core';
import { OffsetTree, computeWindow, type ViewportWindow } from '@oge-ui/core';

/** Signal getters the tree wires into the virtualizer. */
export interface TreeVirtualizerDeps {
  /** Number of visible nodes (the flattened list length). */
  itemCount: () => number;
  /** Fixed row height in px — every row must actually be this tall. */
  itemHeight: () => number;
  /** Extra rows rendered outside the viewport on each side. */
  overscan: () => number;
  /** Height budget of the scroll container. */
  viewportHeight: () => number;
  /** The scrolling element — `null` before first render. */
  scrollContainer: () => HTMLElement | null;
}

/**
 * Fixed-row-height window model for the tree, built on core's `OffsetTree` +
 * `computeWindow`. Adapted from the dropdown's `ListVirtualizerModel`: the
 * tree renders `window().start..end` inside a `totalHeight` spacer translated
 * by `offsetY`, feeds `onScroll` from the scroll element, and routes keyboard
 * focus moves through `scrollToIndex` — the target row may not be in the DOM.
 *
 * A flat DOM is what makes this possible at all; nested `role="group"`
 * wrappers could not be windowed.
 */
export class TreeVirtualizerModel {
  constructor(private readonly deps: TreeVirtualizerDeps) {}

  /** Current scroll offset, mirrored into a signal. */
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

  /** Scroll-event handler for the scroll element. */
  onScroll(event: Event): void {
    this.scrollTop.set((event.target as HTMLElement).scrollTop);
  }

  /** Resets to the top (data replaced / search cleared). */
  reset(): void {
    this.scrollTop.set(0);
  }

  /**
   * Scrolls an absolute index into view with offset math, since the row may
   * not exist in the DOM. The DOM write is deferred a frame so it lands after
   * the slice re-renders.
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
