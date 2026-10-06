import { ogeFormatMessage } from '@oge-ui/core';

/**
 * The rating editor's arithmetic — value snapping, per-item fill, the pointer
 * → value mapping and the keyboard map — shared by the Angular `oge-rating`
 * and the React `<OgeRating>` (ADR 0001). Pure functions: no DOM, no state.
 *
 * Values run from `0` (no rating, committed as `null`) to `max` in steps of
 * `precision` (`1` whole items, `0.5` halves, `0.25` quarters, `0.1` tenths).
 */

/**
 * How the rating is exposed to assistive technology: one APG **slider**
 * (any precision; the default), or an APG **radio group** of one radio per
 * item (whole-item precision only — fractional precisions fall back to the
 * slider).
 */
export type OgeRatingSemantics = 'slider' | 'radiogroup';

/** The built-in item glyphs. */
export type OgeRatingIcon = 'star' | 'heart' | 'circle';

/**
 * SVG path data (24 × 24 view box) of the built-in glyphs — both layers draw
 * the same shapes.
 */
export const OGE_RATING_ICON_PATHS: Readonly<Record<OgeRatingIcon, string>> = {
  star: 'M12 2.4l2.95 5.98 6.6.96-4.78 4.65 1.13 6.57L12 17.46l-5.9 3.1 1.13-6.57-4.78-4.65 6.6-.96z',
  heart:
    'M12 20.6l-1.37-1.24C5.76 14.95 2.6 12.1 2.6 8.6 2.6 5.74 4.84 3.5 7.7 3.5c1.6 0 3.15.75 4.3 1.94 1.15-1.19 2.7-1.94 4.3-1.94 2.86 0 5.1 2.24 5.1 5.1 0 3.5-3.16 6.35-8.03 10.77z',
  circle: 'M12 2.6a9.4 9.4 0 1 0 0 18.8 9.4 9.4 0 1 0 0-18.8z',
};

/** Render state of one rating item. */
export interface OgeRatingItemState {
  /** Zero-based position. */
  index: number;
  /** The value a full press on this item commits (`index + 1`). */
  itemValue: number;
  /** Filled share of the item, `0`…`1`. */
  fill: number;
  /** `fill === 1`. */
  full: boolean;
  /** `0 < fill < 1`. */
  partial: boolean;
}

/** The smallest precision a rating accepts — finer values are clamped up. */
export const OGE_RATING_MIN_PRECISION = 0.01;

/** A usable precision: positive, at most `1`, `1` when not finite. */
export function normalizeRatingPrecision(precision: number): number {
  if (!Number.isFinite(precision) || precision <= 0) return 1;
  return Math.min(1, Math.max(OGE_RATING_MIN_PRECISION, precision));
}

/** A usable item count: a whole number ≥ 1 (default 5). */
export function normalizeRatingMax(max: number): number {
  if (!Number.isFinite(max) || max < 1) return 5;
  return Math.round(max);
}

/** Rounds floating-point noise away (`0.1 * 3` → `0.3`). */
function tidy(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

/**
 * Snaps `value` to the nearest `precision` step inside `0…max`; `0`, `null`,
 * `NaN` and negative values mean "no rating" and return `null`.
 */
export function snapRatingValue(
  value: number | null | undefined,
  max: number,
  precision: number,
): number | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  const step = normalizeRatingPrecision(precision);
  const top = normalizeRatingMax(max);
  const snapped = tidy(Math.round(value / step) * step);
  if (snapped <= 0) return null;
  return Math.min(top, snapped);
}

/**
 * How the value is painted: every item up to it (`continuous`, the star-row
 * default) or only the item holding it (`single` — a pick-one scale such as
 * a mood row).
 */
export type OgeRatingSelection = 'continuous' | 'single';

/** The per-item fill for `value` (hover preview or committed). */
export function ratingItemStates(
  value: number | null,
  max: number,
  selection: OgeRatingSelection = 'continuous',
): OgeRatingItemState[] {
  const top = normalizeRatingMax(max);
  const current = value ?? 0;
  const holder = current > 0 ? Math.ceil(tidy(current)) - 1 : -1;
  const states: OgeRatingItemState[] = [];
  for (let index = 0; index < top; index++) {
    const share = tidy(Math.min(1, Math.max(0, current - index)));
    const fill = selection === 'single' && index !== holder ? 0 : share;
    states.push({
      index,
      itemValue: index + 1,
      fill,
      full: fill === 1,
      partial: fill > 0 && fill < 1,
    });
  }
  return states;
}

/**
 * The value a pointer at `ratio` (`0`…`1` across item `index`, measured from
 * the item's **inline-start** edge — the caller mirrors it in RTL) selects:
 * rounded **up** to the next precision step, so any press inside the first
 * half of a half-precision star picks the half.
 */
export function ratingValueFromPointer(
  index: number,
  ratio: number,
  precision: number,
): number {
  const step = normalizeRatingPrecision(precision);
  const clamped = Math.min(1, Math.max(0, ratio));
  const steps = Math.max(1, Math.ceil(tidy(clamped / step)));
  return tidy(index + Math.min(1, steps * step));
}

/**
 * Inline-start ratio of `clientX` inside an item's rect; mirrored for RTL so
 * the "first half" is always the half the reading direction starts at.
 */
export function ratingPointerRatio(
  clientX: number,
  rect: { left: number; width: number },
  rtl: boolean,
): number {
  if (!(rect.width > 0)) return 1;
  const ratio = (clientX - rect.left) / rect.width;
  if (!Number.isFinite(ratio)) return 1;
  return rtl ? 1 - ratio : ratio;
}

/**
 * What a press on `pressed` does: commits it, or — when `allowClear` is set
 * and it equals the current value — clears the rating (`null`).
 */
export function ratingPressValue(
  current: number | null,
  pressed: number,
  allowClear: boolean,
): number | null {
  if (allowClear && current !== null && tidy(current) === tidy(pressed)) {
    return null;
  }
  return pressed;
}

/** Options of {@link ratingKeyboardTarget}. */
export interface OgeRatingKeyOptions {
  max: number;
  precision: number;
  /** Mirrors ArrowLeft/ArrowRight (APG: arrows follow the reading direction). */
  rtl: boolean;
  /** Delete / Backspace / Home may return `null` (no rating). */
  allowClear: boolean;
}

/**
 * The APG slider key map over the rating: ArrowRight/ArrowUp step up by
 * `precision` (ArrowLeft/ArrowDown down; horizontal arrows mirror in RTL),
 * PageUp/PageDown by one whole item, Home to the lowest value (`null` when
 * `allowClear`, else one step), End to `max`, Delete/Backspace clear
 * (`allowClear` only), and the digit keys `0`–`9` jump to that many items
 * (`0` clears). Returns `undefined` for keys the rating does not handle;
 * the result is already snapped and clamped.
 */
export function ratingKeyboardTarget(
  key: string,
  current: number | null,
  options: OgeRatingKeyOptions,
): number | null | undefined {
  const max = normalizeRatingMax(options.max);
  const step = normalizeRatingPrecision(options.precision);
  const floor = options.allowClear ? 0 : step;
  const value = current ?? 0;
  const clamp = (next: number): number | null => {
    const bounded = tidy(Math.min(max, Math.max(floor, next)));
    return bounded <= 0 ? null : bounded;
  };
  const forward = options.rtl ? 'ArrowLeft' : 'ArrowRight';
  const backward = options.rtl ? 'ArrowRight' : 'ArrowLeft';
  switch (key) {
    case forward:
    case 'ArrowUp':
      return clamp(value + step);
    case backward:
    case 'ArrowDown':
      return clamp(value - step);
    case 'PageUp':
      return clamp(value + 1);
    case 'PageDown':
      return clamp(value - 1);
    case 'Home':
      return clamp(floor);
    case 'End':
      return clamp(max);
    case 'Delete':
    case 'Backspace':
      return options.allowClear ? null : undefined;
    default:
      if (/^[0-9]$/.test(key)) {
        const digit = Number(key);
        if (digit === 0) return options.allowClear ? null : undefined;
        return digit <= max ? clamp(digit) : undefined;
      }
      return undefined;
  }
}

/**
 * The radio-group key map (whole items): arrows move to — and select — the
 * previous/next item (RTL-mirrored), wrapping at the ends as the APG radio
 * group does; Home/End to the first/last item. Returns the 1-based value.
 */
export function ratingRadioKeyTarget(
  key: string,
  current: number | null,
  max: number,
  rtl: boolean,
): number | undefined {
  const top = normalizeRatingMax(max);
  const value = Math.round(current ?? 0);
  const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
  const backward = rtl ? 'ArrowRight' : 'ArrowLeft';
  switch (key) {
    case forward:
    case 'ArrowDown':
      return value >= top ? 1 : value + 1;
    case backward:
    case 'ArrowUp':
      return value <= 1 ? top : value - 1;
    case 'Home':
      return 1;
    case 'End':
      return top;
    default:
      return undefined;
  }
}

/** The semantics actually rendered: radio groups need whole-item precision. */
export function resolveRatingSemantics(
  semantics: OgeRatingSemantics,
  precision: number,
): OgeRatingSemantics {
  return semantics === 'radiogroup' && normalizeRatingPrecision(precision) === 1
    ? 'radiogroup'
    : 'slider';
}

/**
 * The spoken value (`aria-valuetext`, each radio's name): the catalog's
 * `ratingValueText` pattern (`{value}` / `{max}`, or an ICU plural over
 * them) with locale digits, or `ratingNoValueText` for "no rating".
 */
export function ratingValueText(
  value: number | null,
  max: number,
  messages: { ratingValueText: string; ratingNoValueText: string },
  locale?: string,
): string {
  if (value === null) return messages.ratingNoValueText;
  return ogeFormatMessage(
    messages.ratingValueText,
    { value, max: normalizeRatingMax(max) },
    locale,
  );
}
