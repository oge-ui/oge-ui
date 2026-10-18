/**
 * Animated rows — the grid families' `animateRows`: when a sort, a filter,
 * grouping, an expand/collapse or a row drop reorders the rendered rows,
 * the rows on screen glide to their new slots instead of jumping.
 *
 * The core decides *whether* a change animates (pure, see
 * {@link ogeRowMotionDecision}) and drives one {@link createOgeLayoutAnimator}
 * over the rows that intersect the viewport. Hosts call `prepare()` while
 * the DOM still shows the old rows (Angular: a component `effect`, which
 * runs before the template refresh; React: the render body) and `commit()`
 * once it shows the new ones (Angular: `afterRenderEffect`; React: a layout
 * effect). Like every motion primitive it no-ops under reduced motion,
 * without the Web Animations API (SSR, jsdom) and in a hidden tab.
 */
import { createOgeLayoutAnimator, type OgeLayoutAnimator } from './motion';

/** Most on-screen rows one change animates — beyond it the change just applies. */
export const OGE_ROW_MOTION_LIMIT = 60;

/** What a rendered row window looks like to the motion core. */
export interface OgeRowMotionWindow<K> {
  /** Keys of the rendered rows, in DOM order. */
  readonly keys: readonly K[];
  /**
   * Flat index of the first rendered row (the virtualizer's `viewStart`).
   * A different start means scrolling re-created the window — never a move.
   */
  readonly start: number;
}

/**
 * - `animate`: the same rows, re-ordered or partly replaced — glide them;
 * - `record`: a scroll-driven re-creation, a virtual jump, a first render or
 *   an entirely new row set — apply without motion;
 * - `none`: nothing visible changed.
 */
export type OgeRowMotionDecision = 'animate' | 'record' | 'none';

/** Decides how the change from `shown` to `next` is presented. */
export function ogeRowMotionDecision<K>(
  shown: OgeRowMotionWindow<K> | null,
  next: OgeRowMotionWindow<K> | null,
): OgeRowMotionDecision {
  if (!shown || !next) return 'record';
  if (shown.start !== next.start) return 'record';
  const before = shown.keys;
  const after = next.keys;
  if (
    before.length === after.length &&
    before.every((key, index) => key === after[index])
  )
    return 'none';
  if (before.length === 0 || after.length === 0) return 'record';
  const known = new Set(before);
  return after.some((key) => known.has(key)) ? 'animate' : 'record';
}

/** Options of {@link OgeRowMotionCore}. */
export interface OgeRowMotionOptions<N, K> {
  /** The key of a rendered node. */
  keyOf(node: N): K;
  /** The scroll container — rows outside its box are not animated. */
  viewport(): HTMLElement | null;
  /**
   * The element the rows are measured against (the scrolled body, so a
   * scroll clamp between prepare and commit is not a move).
   */
  root(): HTMLElement | null;
  /** The rendered row elements, in DOM order, each carrying `data-rowindex`. */
  rows(root: HTMLElement): Iterable<HTMLElement>;
  /** Most on-screen rows per change (default {@link OGE_ROW_MOTION_LIMIT}). */
  limit?: number;
}

/** A rendered window as the host hands it over: its nodes and first index. */
export interface OgeRowMotionInput<N> {
  readonly nodes: readonly N[];
  readonly start: number;
}

/**
 * Drives row FLIP for one grid-like view. `prepare(null)` (motion switched
 * off, a remote window) forgets the shown window, so turning it back on
 * never animates from a stale layout.
 */
export class OgeRowMotionCore<N, K> {
  private readonly limit: number;
  private animator: OgeLayoutAnimator<K> | null = null;
  private animatorRoot: HTMLElement | null = null;
  private shown: (OgeRowMotionWindow<K> & { nodes: readonly N[] }) | null =
    null;
  private pending: {
    window: (OgeRowMotionWindow<K> & { nodes: readonly N[] }) | null;
    decision: OgeRowMotionDecision;
  } | null = null;
  /** The window the DOM currently shows — what `query` maps row indexes against. */
  private domWindow: OgeRowMotionWindow<K> | null = null;

  constructor(private readonly options: OgeRowMotionOptions<N, K>) {
    this.limit = options.limit ?? OGE_ROW_MOTION_LIMIT;
  }

  /** `true` while rows glide. */
  get animating(): boolean {
    return this.animator?.animating ?? false;
  }

  /**
   * Before the DOM changes: decides how `input` is presented and, when it
   * animates, snapshots the on-screen rows. Idempotent for the same input
   * (React may render twice before a commit).
   */
  prepare(input: OgeRowMotionInput<N> | null): OgeRowMotionDecision {
    const shown = this.shown;
    if (
      input &&
      shown &&
      input.nodes === shown.nodes &&
      input.start === shown.start
    ) {
      this.pending = null;
      return 'none';
    }
    const window = input
      ? {
          nodes: input.nodes,
          start: input.start,
          keys: input.nodes.map((node) => this.options.keyOf(node)),
        }
      : null;
    const decision = ogeRowMotionDecision(shown, window);
    this.pending = { window, decision };
    if (decision === 'animate') {
      this.domWindow = shown;
      this.ensureAnimator()?.capture();
    }
    return decision;
  }

  /** After the DOM shows the prepared window: plays an animating change. */
  commit(): Promise<void> {
    const pending = this.pending;
    this.pending = null;
    if (!pending) return Promise.resolve();
    this.shown = pending.window;
    this.domWindow = pending.window;
    if (pending.decision === 'none') return Promise.resolve();
    const animator = this.ensureAnimator();
    if (!animator) return Promise.resolve();
    if (pending.decision === 'record') {
      // a scroll re-created the rows: settle anything in flight, forget the boxes
      animator.cancel();
      animator.reset();
      return Promise.resolve();
    }
    return animator.play();
  }

  /** Stops running glides (destroy, a remote reload). */
  cancel(): void {
    this.animator?.cancel();
  }

  private ensureAnimator(): OgeLayoutAnimator<K> | null {
    const root = this.options.root();
    if (!root) return null;
    if (this.animator && this.animatorRoot === root) return this.animator;
    this.animator?.cancel();
    this.animatorRoot = root;
    this.animator = createOgeLayoutAnimator<K>({
      root,
      limit: this.limit,
      // rows leaving the window are simply gone: a ghost would float over
      // the sticky header and lose the grid's themed subtree
      exit: false,
      query: () => this.visibleRows(root),
    });
    return this.animator;
  }

  /** The rendered rows intersecting the viewport, keyed through `data-rowindex`. */
  private *visibleRows(root: HTMLElement): Iterable<readonly [K, HTMLElement]> {
    const window = this.domWindow;
    if (!window) return;
    const viewport = this.options.viewport();
    const frame = viewport?.getBoundingClientRect();
    for (const el of this.options.rows(root)) {
      const index = Number(el.getAttribute('data-rowindex'));
      if (!Number.isInteger(index)) continue;
      const offset = index - window.start;
      if (offset < 0 || offset >= window.keys.length) continue;
      if (frame) {
        const box = el.getBoundingClientRect();
        if (box.bottom <= frame.top) continue;
        // DOM order is visual order: everything after the first row below
        // the fold is off screen too
        if (box.top >= frame.bottom && frame.bottom > frame.top) return;
      }
      yield [window.keys[offset] as K, el] as const;
    }
  }
}
