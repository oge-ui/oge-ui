/**
 * Animated rows — the grid families' `animateRows`: when a sort, a filter,
 * grouping, an expand/collapse or a row drop reorders the rendered rows,
 * the rows on screen glide to their new slots instead of jumping.
 *
 * The core decides *whether* a change animates (pure, see
 * {@link ogeRowMotionDecision}) and drives one {@link createOgeLayoutAnimator}
 * over the rows that intersect the viewport: moved rows glide, rows that join
 * the window (an expanded node's children, a detail row) slide in with a
 * small stagger, and rows that leave it (a collapse, a filter) fade out as a
 * ghost cloned into the rows' own container — under the sticky header and
 * inside the themed subtree, while the real row is removed synchronously. Hosts call `prepare()` while
 * the DOM still shows the old rows (Angular: a component `effect`, which
 * runs before the template refresh; React: the render body) and `commit()`
 * once it shows the new ones (Angular: `afterRenderEffect`; React: a layout
 * effect). Like every motion primitive it no-ops under reduced motion,
 * without the Web Animations API (SSR, jsdom) and in a hidden tab.
 */
import {
  createOgeLayoutAnimator,
  ogeMotionEnabled,
  ogeMotionTiming,
  ogeRectOf,
  type OgeLayoutAnimator,
  type OgeRect,
} from './motion';

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
  /**
   * The rendered row elements, in DOM order — each carrying `data-rowindex`,
   * or with `order: 'dom'` one element per window node.
   */
  rows(root: HTMLElement): Iterable<HTMLElement>;
  /**
   * How a row element maps onto the window: `'rowindex'` (default) reads its
   * absolute `data-rowindex`; `'dom'` takes the n-th element as the n-th
   * node (a flat list such as the tree view, which renders every node).
   */
  order?: 'rowindex' | 'dom';
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
  /** The on-screen rows at `prepare`, for the exit ghosts of the ones that leave. */
  private leaving: {
    readonly origin: OgeRect;
    readonly rows: readonly LeavingRow<K>[];
  } | null = null;
  private readonly ghosts = new Set<HTMLElement>();

  constructor(private readonly options: OgeRowMotionOptions<N, K>) {
    this.limit = options.limit ?? OGE_ROW_MOTION_LIMIT;
  }

  /** `true` while rows glide. */
  get animating(): boolean {
    return (this.animator?.animating ?? false) || this.ghosts.size > 0;
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
    this.leaving = null;
    if (decision === 'animate') {
      this.domWindow = shown;
      this.ensureAnimator()?.capture();
      this.recordLeaving();
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
      this.leaving = null;
      return Promise.resolve();
    }
    const played = animator.play();
    this.ghostLeaving(pending.window);
    return played;
  }

  /** Stops running glides and exit ghosts (destroy, a remote reload). */
  cancel(): void {
    this.animator?.cancel();
    this.leaving = null;
    for (const ghost of this.ghosts) ghost.remove();
    this.ghosts.clear();
  }

  /** Remembers where the on-screen rows are, while the DOM still shows them. */
  private recordLeaving(): void {
    const root = this.options.root();
    if (!root || !ogeMotionEnabled(root)) return;
    const rows: LeavingRow<K>[] = [];
    for (const [key, el] of this.visibleRows(root)) {
      if (rows.length >= this.limit) return;
      rows.push({ key, el, rect: ogeRectOf(el), parent: el.parentElement });
    }
    this.leaving = { origin: ogeRectOf(root), rows };
  }

  /**
   * Fades a clone of every recorded row that left the window, at its old
   * slot inside its old container — the container stays the clip and the
   * stacking context, so the ghost never floats over a sticky header.
   */
  private ghostLeaving(next: OgeRowMotionWindow<K> | null): void {
    const leaving = this.leaving;
    this.leaving = null;
    const root = this.options.root();
    if (!leaving || !next || !root || !ogeMotionEnabled(root)) return;
    const kept = new Set(next.keys);
    const gone = leaving.rows.filter(
      (row) =>
        !kept.has(row.key) && !row.el.isConnected && !!row.parent?.isConnected,
    );
    if (gone.length === 0) return;
    // a scroll clamp between prepare and commit moves the content: follow it
    const now = ogeRectOf(root);
    const shiftX = now.left - leaving.origin.left;
    const shiftY = now.top - leaving.origin.top;
    const timing = ogeMotionTiming(root, 'fast', 'accelerate');
    for (const row of gone) {
      const parent = row.parent as HTMLElement;
      const ghost = rowGhost(row.el, row.rect);
      // first in its container: rows gliding over the slot paint above it
      parent.insertBefore(ghost, parent.firstChild);
      const at = ogeRectOf(ghost);
      ghost.style.left = `${row.rect.left + shiftX - at.left}px`;
      ghost.style.top = `${row.rect.top + shiftY - at.top}px`;
      this.ghosts.add(ghost);
      const animation = ghost.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: timing.duration,
        easing: timing.easing,
        fill: 'forwards',
      });
      const done = (): void => {
        ghost.remove();
        this.ghosts.delete(ghost);
      };
      animation.finished.then(done, done);
    }
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
      // the animator's ghosts live in <body> (over the sticky header,
      // outside the themed subtree): leaving rows ghost in place instead
      exit: false,
      enterKeyframes: ROW_ENTER_KEYFRAMES,
      enterStagger: true,
      query: () => this.visibleRows(root),
    });
    return this.animator;
  }

  /** The rendered rows intersecting the viewport, keyed through `data-rowindex`. */
  private *visibleRows(root: HTMLElement): Iterable<readonly [K, HTMLElement]> {
    const window = this.domWindow;
    if (!window) return;
    const frame = visibleFrame(this.options.viewport());
    const byOrder = this.options.order === 'dom';
    let position = 0;
    for (const el of this.options.rows(root)) {
      if (el.classList.contains(GHOST_CLASS)) continue;
      const offset = byOrder
        ? position++
        : Number(el.getAttribute('data-rowindex')) - window.start;
      if (!Number.isInteger(offset)) continue;
      if (offset < 0 || offset >= window.keys.length) continue;
      if (frame) {
        const box = el.getBoundingClientRect();
        if (box.bottom <= frame.top) continue;
        // DOM order is visual order: everything after the first row below
        // the fold is off screen too
        if (box.top >= frame.bottom) return;
      }
      yield [window.keys[offset] as K, el] as const;
    }
  }
}

interface LeavingRow<K> {
  readonly key: K;
  readonly el: HTMLElement;
  readonly rect: OgeRect;
  readonly parent: HTMLElement | null;
}

/** Revealed rows slide down a few pixels into place while they fade in. */
const ROW_ENTER_KEYFRAMES: Keyframe[] = [
  { opacity: 0, transform: 'translateY(-4px)' },
  { opacity: 1, transform: 'none' },
];

const GHOST_CLASS = 'oge-row-ghost';

/**
 * The vertical band rows count as on screen in: the scroll container's box,
 * clipped to the window (a grid without a height is as tall as its rows).
 */
function visibleFrame(
  viewport: HTMLElement | null,
): { top: number; bottom: number } | null {
  if (!viewport) return null;
  const box = viewport.getBoundingClientRect();
  let top = box.top;
  let bottom = box.bottom;
  const height = typeof window === 'undefined' ? 0 : window.innerHeight;
  if (height > 0) {
    top = Math.max(top, 0);
    bottom = Math.min(bottom, height);
  }
  return bottom > top ? { top, bottom } : null;
}

/**
 * An inert, unaddressable clone of a row that just left: no ids, no row
 * index, key, role or test id (virtualizers, the motion core and specs never
 * count it), out of flow at the row's old size.
 */
function rowGhost(row: HTMLElement, rect: OgeRect): HTMLElement {
  const ghost = row.cloneNode(true) as HTMLElement;
  for (const node of [ghost, ...ghost.querySelectorAll<HTMLElement>('*')]) {
    node.removeAttribute('id');
    node.removeAttribute('data-rowindex');
    node.removeAttribute('data-key');
    node.removeAttribute('tabindex');
    node.removeAttribute('data-testid');
    node.removeAttribute('role');
  }
  ghost.setAttribute('aria-hidden', 'true');
  ghost.setAttribute('inert', '');
  ghost.classList.add(GHOST_CLASS);
  Object.assign(ghost.style, {
    position: 'absolute',
    left: '0px',
    top: '0px',
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    margin: '0',
    boxSizing: 'border-box',
    pointerEvents: 'none',
    transform: 'none',
  } satisfies Partial<CSSStyleDeclaration>);
  return ghost;
}
