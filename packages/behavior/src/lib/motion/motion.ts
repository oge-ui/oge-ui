/**
 * Shared motion primitives — the layout-motion layer every family uses so a
 * reorder, a drop or a removal glides instead of teleporting, identically in
 * both render layers.
 *
 * Everything here is gated by {@link ogeMotionEnabled}: under reduced motion,
 * without the Web Animations API (SSR, jsdom — so specs never see an
 * animation) or in a hidden document every function no-ops and resolves at
 * once. Animations touch `transform` (and `opacity` for exits) only, so they
 * stay on the compositor and never change what layout code measures.
 */
import { prefersReducedMotion } from '../a11y/motion';
import type { OgeRect } from '../overlay/position';

export type { OgeRect };

/** The inverse transform that puts an element back at its first box. */
export interface OgeFlipDelta {
  readonly dx: number;
  readonly dy: number;
  readonly sx: number;
  readonly sy: number;
}

/** Duration steps of the motion tokens (`--oge-motion-duration-<step>`). */
export type OgeMotionDuration = 'fast' | 'base' | 'slow' | 'layout';
/** Curves of the motion tokens (`--oge-motion-easing-<curve>`). */
export type OgeMotionEasing =
  'standard' | 'emphasized' | 'decelerate' | 'accelerate' | 'spring';

/** A resolved duration (ms) + CSS easing pair. */
export interface OgeMotionTiming {
  readonly duration: number;
  readonly easing: string;
}

/** Below this travel (px) a move is not worth animating. */
const MIN_TRAVEL = 0.5;

/**
 * Spring curves as CSS `linear()` easing: samples a damped harmonic
 * oscillator from rest to rest. The defaults overshoot by about 1 % and
 * settle within the duration, which suits layout moves and drop settles —
 * the "physical" feel without a JS physics loop.
 */
export function ogeSpringEasing(
  options: {
    stiffness?: number;
    damping?: number;
    mass?: number;
    samples?: number;
  } = {},
): string {
  const stiffness = options.stiffness ?? 170;
  const damping = options.damping ?? 22;
  const mass = options.mass ?? 1;
  const samples = Math.max(8, Math.min(100, Math.round(options.samples ?? 32)));
  const omega = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  // the time the envelope needs to fall under 0.5 % — the curve's length
  const settle = Math.min(10, -Math.log(0.005) / (zeta * omega));
  const at = (t: number): number => {
    if (zeta < 1) {
      const wd = omega * Math.sqrt(1 - zeta * zeta);
      return (
        1 -
        Math.exp(-zeta * omega * t) *
          (Math.cos(wd * t) + ((zeta * omega) / wd) * Math.sin(wd * t))
      );
    }
    return 1 - Math.exp(-omega * t) * (1 + omega * t);
  };
  const points: string[] = [];
  for (let i = 0; i <= samples; i++) {
    const value = i === samples ? 1 : at((settle * i) / samples);
    points.push(String(Math.round(value * 1000) / 1000));
  }
  return `linear(${points.join(', ')})`;
}

/** Token defaults, used where no stylesheet is reachable (SSR, detached nodes). */
export const OGE_MOTION_DEFAULTS: {
  readonly durations: Readonly<Record<OgeMotionDuration, number>>;
  readonly easings: Readonly<Record<OgeMotionEasing, string>>;
} = {
  durations: { fast: 120, base: 200, slow: 300, layout: 280 },
  easings: {
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    emphasized: 'cubic-bezier(0.05, 0.7, 0.1, 1)',
    decelerate: 'cubic-bezier(0, 0, 0, 1)',
    accelerate: 'cubic-bezier(0.3, 0, 1, 1)',
    spring: ogeSpringEasing(),
  },
};

function parseDuration(value: string): number | null {
  const text = value.trim();
  if (!text) return null;
  const n = parseFloat(text);
  if (!Number.isFinite(n) || n < 0) return null;
  return text.endsWith('ms') ? n : text.endsWith('s') ? n * 1000 : n;
}

/**
 * Reads the motion tokens as `element` sees them, so a consumer that retimes
 * the suite from `:root` (or a themed subtree) retimes script motion too.
 */
export function ogeMotionTiming(
  element: Element | null,
  duration: OgeMotionDuration = 'layout',
  easing: OgeMotionEasing = 'spring',
): OgeMotionTiming {
  let style: CSSStyleDeclaration | null = null;
  try {
    style =
      element && typeof getComputedStyle === 'function'
        ? getComputedStyle(element)
        : null;
  } catch {
    style = null;
  }
  const read = (name: string): string =>
    style?.getPropertyValue(name)?.trim() ?? '';
  return {
    duration:
      parseDuration(read(`--oge-motion-duration-${duration}`)) ??
      OGE_MOTION_DEFAULTS.durations[duration],
    easing:
      read(`--oge-motion-easing-${easing}`) ||
      OGE_MOTION_DEFAULTS.easings[easing],
  };
}

/**
 * `true` when script motion may run for `element`: the Web Animations API
 * exists, the user did not ask for reduced motion and the document is
 * visible (a hidden tab would only queue work nobody sees).
 */
export function ogeMotionEnabled(element?: Element | null): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined')
    return false;
  const probe = element ?? document.documentElement;
  if (!probe || typeof (probe as HTMLElement).animate !== 'function')
    return false;
  if (document.hidden) return false;
  return !prefersReducedMotion();
}

/**
 * The inverse transform from `last` back to `first` (the "I" of FLIP), or
 * `null` when the element did not travel noticeably. Scale is only computed
 * when asked — scaling a box distorts its text, so moves translate only.
 */
export function ogeFlipDelta(
  first: OgeRect,
  last: OgeRect,
  options: { scale?: boolean } = {},
): OgeFlipDelta | null {
  const dx = first.left - last.left;
  const dy = first.top - last.top;
  const sx = options.scale && last.width > 0 ? first.width / last.width : 1;
  const sy = options.scale && last.height > 0 ? first.height / last.height : 1;
  if (
    Math.abs(dx) < MIN_TRAVEL &&
    Math.abs(dy) < MIN_TRAVEL &&
    Math.abs(sx - 1) < 0.01 &&
    Math.abs(sy - 1) < 0.01
  )
    return null;
  return { dx, dy, sx, sy };
}

/** The `DOMRect` of `element` as a plain {@link OgeRect}. */
export function ogeRectOf(element: Element): OgeRect {
  const r = element.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

function deltaTransform(delta: OgeFlipDelta): string {
  const scale =
    delta.sx !== 1 || delta.sy !== 1 ? ` scale(${delta.sx}, ${delta.sy})` : '';
  return `translate(${delta.dx}px, ${delta.dy}px)${scale}`;
}

const finished = (animation: Animation): Promise<void> =>
  animation.finished.then(
    () => undefined,
    () => undefined,
  );

/** Options of {@link OgeLayoutAnimator.play}. */
export interface OgeLayoutPlayOptions<K> {
  /** Keys not to animate (an element the pointer is still carrying). */
  exclude?: Iterable<K>;
  duration?: OgeMotionDuration;
  easing?: OgeMotionEasing;
  /** Also animate size changes with a scale (default `false`). */
  scale?: boolean;
}

/** FLIP animation of a keyed set of elements — see {@link createOgeLayoutAnimator}. */
export interface OgeLayoutAnimator<K> {
  /**
   * "First": snapshots the keyed elements' boxes. Call before a state write
   * the host makes itself; a capture while moves run reads the in-flight
   * boxes, so an interrupted move continues from where the element is.
   */
  capture(): void;
  /**
   * "Last, Invert, Play": after the render, glides every element that moved
   * since the snapshot to its new box, fades in the ones that appeared and
   * fades out a ghost of the ones that left. The new boxes become the next
   * snapshot, so a change the host did not capture (new `items`) animates
   * from the last settled layout. Resolves when everything settled; with
   * motion off it only records.
   */
  play(options?: OgeLayoutPlayOptions<K>): Promise<void>;
  /** Stops every running move, leaving the elements at their layout boxes. */
  cancel(): void;
  /** Forgets the snapshot — the next `play()` only records (after a resize, a column change). */
  reset(): void;
  /** `true` while moves run (the root also carries `data-oge-animating`). */
  readonly animating: boolean;
}

/** Options of {@link createOgeLayoutAnimator}. */
export interface OgeLayoutAnimatorOptions<K> {
  /** The keyed elements to animate, e.g. every `[data-oge-tile-key]`. */
  query(): Iterable<readonly [K, HTMLElement]>;
  /**
   * The container the boxes are measured against (so scrolling between the
   * capture and the play is not a move); it carries `data-oge-animating`
   * while moves run and is the token source.
   */
  root: HTMLElement;
  /** Most elements animated per play — beyond it the change just applies. Default 200. */
  limit?: number;
  /** Animate appearing elements (default `true`). */
  enter?: boolean;
  /** Fade out a ghost of leaving elements (default `true`). */
  exit?: boolean;
}

interface Snapshot<K> {
  readonly boxes: Map<K, { rect: OgeRect; el: HTMLElement }>;
}

const ENTER_KEYFRAMES: Keyframe[] = [
  { opacity: 0, transform: 'scale(0.96)' },
  { opacity: 1, transform: 'none' },
];

/**
 * The FLIP layout animator: `capture()` before a change, `play()` after the
 * render. Elements are matched by key, so a re-rendered node still glides
 * from where its predecessor was.
 */
export function createOgeLayoutAnimator<K>(
  options: OgeLayoutAnimatorOptions<K>,
): OgeLayoutAnimator<K> {
  const limit = options.limit ?? 200;
  const root = options.root;
  let snapshot: Snapshot<K> | null = null;
  const running = new Map<HTMLElement, Animation>();
  let generation = 0;

  const setFlag = (on: boolean): void => {
    if (on) root.setAttribute('data-oge-animating', '');
    else root.removeAttribute('data-oge-animating');
  };

  const relative = (rect: OgeRect, origin: OgeRect): OgeRect => ({
    left: rect.left - origin.left,
    top: rect.top - origin.top,
    width: rect.width,
    height: rect.height,
  });

  const measure = (): Snapshot<K> | null => {
    const origin = ogeRectOf(root);
    const boxes = new Map<K, { rect: OgeRect; el: HTMLElement }>();
    let n = 0;
    for (const [key, el] of options.query()) {
      if (n++ >= limit) return null;
      boxes.set(key, { rect: relative(ogeRectOf(el), origin), el });
    }
    return { boxes };
  };

  const cancel = (): void => {
    for (const animation of running.values()) animation.cancel();
    running.clear();
    setFlag(false);
  };

  const track = (el: HTMLElement, animation: Animation): Promise<void> => {
    running.set(el, animation);
    return finished(animation).then(() => {
      if (running.get(el) === animation) running.delete(el);
    });
  };

  return {
    get animating() {
      return running.size > 0;
    },
    capture() {
      snapshot = ogeMotionEnabled(root) ? measure() : null;
    },
    reset() {
      snapshot = null;
    },
    play(play = {}) {
      const before = snapshot;
      const enabled = ogeMotionEnabled(root);
      const elements = [...options.query()];
      // drop in-flight transforms before measuring, so "last" is the layout box
      for (const [, el] of elements) running.get(el)?.cancel();
      if (!enabled) {
        snapshot = null;
        return Promise.resolve();
      }
      const after = measure();
      snapshot = after;
      if (!before || !after) return Promise.resolve();
      const exclude = new Set(play.exclude ?? []);
      const timing = ogeMotionTiming(
        root,
        play.duration ?? 'layout',
        play.easing ?? 'spring',
      );
      const moves: Promise<void>[] = [];
      const id = ++generation;
      for (const [key, el] of elements) {
        if (exclude.has(key)) continue;
        const last = after.boxes.get(key);
        const first = before.boxes.get(key);
        if (!last) continue;
        if (!first) {
          if (options.enter === false) continue;
          const enter = ogeMotionTiming(root, 'base', 'emphasized');
          moves.push(
            track(
              el,
              el.animate(ENTER_KEYFRAMES, {
                duration: enter.duration,
                easing: enter.easing,
              }),
            ),
          );
          continue;
        }
        const delta = ogeFlipDelta(first.rect, last.rect, {
          scale: play.scale,
        });
        if (!delta) continue;
        moves.push(
          track(
            el,
            el.animate(
              [{ transform: deltaTransform(delta) }, { transform: 'none' }],
              { duration: timing.duration, easing: timing.easing },
            ),
          ),
        );
      }
      if (options.exit !== false) {
        const origin = ogeRectOf(root);
        for (const [key, { rect, el }] of before.boxes) {
          if (after.boxes.has(key) || el.isConnected) continue;
          ogeExitGhost(el, {
            rect: {
              left: rect.left + origin.left,
              top: rect.top + origin.top,
              width: rect.width,
              height: rect.height,
            },
          });
        }
      }
      if (moves.length === 0) return Promise.resolve();
      setFlag(true);
      return Promise.all(moves).then(() => {
        if (id === generation && running.size === 0) setFlag(false);
      });
    },
    cancel,
  };
}

/**
 * Glides a floating element (a drag ghost) to `to` and resolves when it
 * arrives — the drop settle, or the return to the origin on cancel. The
 * element is left in place; remove it once the promise resolves.
 */
export function ogeSettleGhost(
  ghost: HTMLElement,
  to: OgeRect,
  timing?: Partial<OgeMotionTiming>,
): Promise<void> {
  if (!ogeMotionEnabled(ghost)) return Promise.resolve();
  // settle from the top-left corner at true size, so translate + scale land
  // the box exactly on `to`
  ghost.style.scale = '1';
  ghost.style.transformOrigin = '0 0';
  const from = ogeRectOf(ghost);
  const dx = to.left - from.left;
  const dy = to.top - from.top;
  const sx = from.width > 0 ? to.width / from.width : 1;
  const sy = from.height > 0 ? to.height / from.height : 1;
  const base = ogeMotionTiming(ghost, 'base', 'emphasized');
  const current = getComputedStyle(ghost).transform;
  const start = current && current !== 'none' ? current : 'none';
  const animation = ghost.animate(
    [
      { transform: start },
      {
        transform: `${start === 'none' ? '' : `${start} `}translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
        boxShadow: 'var(--oge-shadow-card)',
      },
    ],
    {
      duration: timing?.duration ?? base.duration,
      easing: timing?.easing ?? base.easing,
      fill: 'forwards',
    },
  );
  return finished(animation);
}

/** Options of {@link ogeExitGhost}. */
export interface OgeExitGhostOptions {
  /** The exit keyframes (default: fade out while shrinking to 96 %). */
  keyframes?: readonly Keyframe[];
  /** Where the ghost appears — for an element already detached. Default: its current box. */
  rect?: OgeRect;
  /**
   * The element the ghost is appended to (default `document.body`). Pass the
   * leaving node's own parent so the ghost keeps the theme, direction and
   * stacking context it inherited — an overlay closing inside a themed
   * subtree or a modal layer. Falls back to `body` when detached.
   */
  parent?: Element | null;
}

/** Opacity-only exit keyframes — for surfaces whose geometry must stay put. */
export const OGE_EXIT_FADE: readonly Keyframe[] = [
  { opacity: 1 },
  { opacity: 0 },
];

/**
 * Lifts a ghost that has no stacking order of its own (a tile, a card) above
 * the page; one that does (a popup, a modal layer — same classes, same
 * parent) keeps it, so it never paints over a surface opened meanwhile.
 */
function liftGhost(clone: HTMLElement): void {
  let z = '';
  try {
    z = getComputedStyle(clone).zIndex;
  } catch {
    z = '';
  }
  if (!z || z === 'auto') clone.style.zIndex = '10000';
}

/**
 * Jumps the CSS animations a fresh clone would replay (enter keyframes,
 * staggered items) to their end, so the ghost leaves from the settled look.
 * Endless loops (spinners) cannot finish and keep running.
 */
function settleCloneAnimations(clone: HTMLElement): void {
  if (typeof clone.getAnimations !== 'function') return;
  for (const animation of clone.getAnimations({ subtree: true })) {
    try {
      animation.finish();
    } catch {
      // infinite iteration count — leave the loop running
    }
  }
}

/** How long a ghost waits for the framework to remove the real node. */
const DETACH_WAIT_MS = 250;

/**
 * Runs `then` once `element` has left the document — at once when it
 * already has, else from the mutation that removes it (a microtask, so
 * before the next paint). Gives up when the node is still there after
 * {@link DETACH_WAIT_MS}: the owner kept it, so nothing vanished.
 */
function whenDetached(element: Element, then: () => void): void {
  if (!element.isConnected) {
    then();
    return;
  }
  const doc = element.ownerDocument;
  if (typeof MutationObserver === 'undefined' || !doc.documentElement) return;
  let done = false;
  const observer = new MutationObserver(() => {
    if (done || element.isConnected) return;
    done = true;
    observer.disconnect();
    clearTimeout(timer);
    then();
  });
  observer.observe(doc.documentElement, { childList: true, subtree: true });
  const timer = setTimeout(() => {
    done = true;
    observer.disconnect();
  }, DETACH_WAIT_MS);
}

/**
 * The exit animation without holding the node: clones `element` into an
 * `aria-hidden`, inert, pointer-transparent overlay at its box and fades it
 * out there, so the caller removes the real node synchronously — focus
 * return, `inert` and specs keep seeing an immediate removal. Call it just
 * before the removal (the box and the clone are taken then), or afterwards
 * with the last known `rect`. The ghost is appended only once the real node
 * has left the document — the framework's next render — so the two never
 * exist side by side (a strict test locator never sees two matches); a node
 * the owner keeps gets no ghost. The ghost keeps the element's own `z-index`
 * and starts from its settled look (the clone's CSS enter animations are
 * finished at once). A no-op with motion off.
 */
export function ogeExitGhost(
  element: Element,
  options: OgeExitGhostOptions = {},
): void {
  const doc = element.ownerDocument;
  if (!doc?.body || !ogeMotionEnabled(doc.body)) return;
  const rect = options.rect ?? ogeRectOf(element);
  if (rect.width === 0 && rect.height === 0) return;
  const clone = element.cloneNode(true) as HTMLElement;
  clone.removeAttribute('id');
  clone.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
  clone.setAttribute('aria-hidden', 'true');
  clone.setAttribute('inert', '');
  clone.classList.add('oge-exit-ghost');
  Object.assign(clone.style, {
    position: 'fixed',
    inset: 'auto',
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    margin: '0',
    boxSizing: 'border-box',
    pointerEvents: 'none',
    transform: 'none',
    transition: 'none',
  } satisfies Partial<CSSStyleDeclaration>);
  const keyframes = (options.keyframes as Keyframe[] | undefined) ?? [
    { opacity: 1, transform: 'scale(1)' },
    { opacity: 0, transform: 'scale(0.96)' },
  ];
  whenDetached(element, () => {
    const parent = options.parent?.isConnected ? options.parent : doc.body;
    parent.appendChild(clone);
    liftGhost(clone);
    settleCloneAnimations(clone);
    const timing = ogeMotionTiming(clone, 'fast', 'accelerate');
    const animation = clone.animate(keyframes, {
      duration: timing.duration,
      easing: timing.easing,
      fill: 'forwards',
    });
    void finished(animation).then(() => clone.remove());
  });
}
