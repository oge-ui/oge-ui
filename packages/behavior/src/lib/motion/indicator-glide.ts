/**
 * The sliding selection indicator (Material / MUI / Kendo tab ink): when the
 * selection moves, a transient bar travels from the old item's indicator to
 * the new one's instead of the ink swapping in place.
 *
 * The real, CSS-drawn indicator stays the source of truth — it is what the
 * first render, reduced motion, forced colors and the visual baselines show.
 * While a glide runs, the root carries `data-oge-indicator-glide="run"` (the
 * stylesheet hides the real ink and stops its colour transitions) and one
 * absolutely-positioned glide element FLIPs from the old box to the new one
 * with a `transform` (`--oge-motion-duration-layout` +
 * `--oge-motion-easing-spring`). Geometry is read from the items themselves —
 * the one physical border side that has a width is the ink edge — so RTL,
 * vertical strips and start/end placements need no configuration.
 */
import {
  ogeFlipDelta,
  ogeMotionEnabled,
  ogeMotionTiming,
  ogeRectOf,
  type OgeRect,
} from './motion';

/** The physical edge an indicator is drawn on. */
export type OgeIndicatorSide = 'top' | 'right' | 'bottom' | 'left';

/** Where the ink of an item sits: its edge and the bar's thickness. */
export interface OgeIndicatorEdge {
  readonly side: OgeIndicatorSide;
  readonly thickness: number;
}

/**
 * The indicator bar of an item box: `thickness` thick along `side`,
 * shortened by `inset` at both ends (`[start, end]` along the bar, for an
 * indicator fitted to the label instead of the whole item).
 */
export function ogeIndicatorRect(
  box: OgeRect,
  edge: OgeIndicatorEdge,
  inset: readonly [number, number] = [0, 0],
): OgeRect {
  const [a, b] = inset;
  const t = edge.thickness;
  switch (edge.side) {
    case 'top':
    case 'bottom':
      return {
        left: box.left + a,
        top: edge.side === 'top' ? box.top : box.top + box.height - t,
        width: Math.max(0, box.width - a - b),
        height: t,
      };
    default:
      return {
        left: edge.side === 'left' ? box.left : box.left + box.width - t,
        top: box.top + a,
        width: t,
        height: Math.max(0, box.height - a - b),
      };
  }
}

const SIDES: readonly OgeIndicatorSide[] = ['bottom', 'right', 'left', 'top'];

const px = (value: string | undefined): number => {
  const n = parseFloat(value ?? '');
  return Number.isFinite(n) ? n : 0;
};

/**
 * The ink edge of `item`: the single physical border side with a width (a
 * horizontal strip's block-end, a vertical strip's inline-end — `right` in
 * LTR, `left` in RTL — or inline-start for an end-placed strip). `null` when
 * no side or more than one has a width (pills, outlined tabs): there is no
 * underline to slide.
 */
export function ogeIndicatorEdge(item: Element): OgeIndicatorEdge | null {
  let style: CSSStyleDeclaration;
  try {
    style = getComputedStyle(item);
  } catch {
    return null;
  }
  let found: OgeIndicatorEdge | null = null;
  for (const side of SIDES) {
    const width = px(style.getPropertyValue(`border-${side}-width`));
    const lineStyle = style.getPropertyValue(`border-${side}-style`);
    if (width <= 0 || lineStyle === 'none' || lineStyle === 'hidden') continue;
    if (found) return null;
    found = { side, thickness: width };
  }
  return found;
}

/** How the indicator spans its item — the `indicatorFit` of a tab strip. */
export type OgeIndicatorFit = 'item' | 'content';

/** Options of {@link OgeIndicatorGlide.move}. */
export interface OgeIndicatorMoveOptions {
  /** `'content'` insets the bar by the item's padding (default `'item'`). */
  fit?: OgeIndicatorFit;
}

/** The glide controller — see {@link createOgeIndicatorGlide}. */
export interface OgeIndicatorGlide {
  /**
   * Slides the indicator from `from`'s ink to `to`'s, after the render that
   * moved the selection (both items still in the DOM). Returns whether a
   * glide started: nothing happens on a first selection (`from` null), for
   * the same item, without an ink edge, or with motion off — the CSS ink
   * then simply jumps. A move during a glide continues from where the bar
   * is.
   */
  move(
    from: HTMLElement | null,
    to: HTMLElement | null,
    options?: OgeIndicatorMoveOptions,
  ): boolean;
  /** Ends a running glide at once (the real ink shows); call on destroy. */
  cancel(): void;
  /** `true` while the glide runs. */
  readonly gliding: boolean;
}

/** Options of {@link createOgeIndicatorGlide}. */
export interface OgeIndicatorGlideOptions {
  /** Class of the transient bar (style it like the ink). Default `oge-indicator-glide`. */
  className?: string;
}

/** The attribute the root carries while a glide runs. */
export const OGE_INDICATOR_GLIDE_ATTR = 'data-oge-indicator-glide';

/**
 * A sliding selection indicator inside `root` — the element the items are
 * laid out in (it must be a positioning context, e.g. `position: relative`).
 * Boxes are measured against it, so a strip scrolling between the old and
 * the new selection is not travel.
 */
export function createOgeIndicatorGlide(
  root: HTMLElement,
  options: OgeIndicatorGlideOptions = {},
): OgeIndicatorGlide {
  const className = options.className ?? 'oge-indicator-glide';
  let bar: HTMLElement | null = null;
  let animation: Animation | null = null;

  const settle = (): void => {
    animation = null;
    if (root.hasAttribute(OGE_INDICATOR_GLIDE_ATTR)) {
      // show the real ink with its colour transitions still suppressed, flush
      // the style, then drop the flag — so the ink appears at once instead of
      // fading in where the bar just landed
      root.setAttribute(OGE_INDICATOR_GLIDE_ATTR, 'settle');
      void root.offsetWidth;
      root.removeAttribute(OGE_INDICATOR_GLIDE_ATTR);
    }
    bar?.remove();
    bar = null;
  };

  const relative = (rect: OgeRect, origin: OgeRect): OgeRect => ({
    left: rect.left - origin.left - root.clientLeft,
    top: rect.top - origin.top - root.clientTop,
    width: rect.width,
    height: rect.height,
  });

  const inkOf = (
    item: HTMLElement,
    edge: OgeIndicatorEdge,
    fit: OgeIndicatorFit,
  ): OgeRect => {
    let inset: [number, number] = [0, 0];
    if (fit === 'content') {
      const style = getComputedStyle(item);
      inset =
        edge.side === 'top' || edge.side === 'bottom'
          ? [px(style.paddingLeft), px(style.paddingRight)]
          : [px(style.paddingTop), px(style.paddingBottom)];
    }
    return ogeIndicatorRect(ogeRectOf(item), edge, inset);
  };

  return {
    get gliding() {
      return animation !== null;
    },
    move(from, to, move = {}) {
      if (!from || !to || from === to || !ogeMotionEnabled(root)) {
        if (animation) {
          animation.cancel();
          settle();
        }
        return false;
      }
      const edge = ogeIndicatorEdge(to);
      if (!edge) {
        if (animation) {
          animation.cancel();
          settle();
        }
        return false;
      }
      const fit = move.fit ?? 'item';
      const origin = ogeRectOf(root);
      // an interrupted glide continues from the bar's in-flight box
      const first = relative(
        animation && bar ? ogeRectOf(bar) : inkOf(from, edge, fit),
        origin,
      );
      const last = relative(inkOf(to, edge, fit), origin);
      if (animation) {
        const running = animation;
        animation = null;
        running.cancel();
      }
      const delta = ogeFlipDelta(first, last, { scale: true });
      if (!delta || last.width <= 0 || last.height <= 0) {
        settle();
        return false;
      }
      root.setAttribute(OGE_INDICATOR_GLIDE_ATTR, 'run');
      if (!bar) {
        bar = root.ownerDocument.createElement('span');
        bar.className = className;
        bar.setAttribute('aria-hidden', 'true');
        root.appendChild(bar);
      }
      Object.assign(bar.style, {
        position: 'absolute',
        left: `${last.left}px`,
        top: `${last.top}px`,
        width: `${last.width}px`,
        height: `${last.height}px`,
        transformOrigin: '0 0',
        pointerEvents: 'none',
      } satisfies Partial<CSSStyleDeclaration>);
      // a bar from `first` to `last`: translate + scale from the top-left
      // corner (ogeFlipDelta measures the travel between the corners)
      const timing = ogeMotionTiming(root, 'layout', 'spring');
      const current = bar.animate(
        [
          {
            transform: `translate(${delta.dx}px, ${delta.dy}px) scale(${delta.sx}, ${delta.sy})`,
          },
          { transform: 'none' },
        ],
        { duration: timing.duration, easing: timing.easing },
      );
      animation = current;
      current.finished.then(
        () => {
          if (animation === current) settle();
        },
        () => undefined,
      );
      return true;
    },
    cancel() {
      if (animation) {
        const running = animation;
        animation = null;
        running.cancel();
      }
      settle();
    },
  };
}
