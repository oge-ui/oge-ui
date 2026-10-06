/**
 * The framework-free half of the carousel (W8d): the vocabulary, the message
 * catalog, the index arithmetic (steps, loop, swipe targets, scroll offsets),
 * the slide-picker keyboard map, the APG roles and the autoplay timer.
 *
 * Semantics follow the WAI-ARIA APG **carousel** pattern: the container is a
 * labelled region (or group) with `aria-roledescription="carousel"`, every
 * slide is a `group` with `aria-roledescription="slide"` named "N of M", the
 * rotation control comes first in the Tab order, and the slides wrapper is
 * `aria-live="polite"` only while the carousel is not rotating — an
 * auto-rotating carousel that announced every slide would talk over the page.
 * With one slide per view the picker is the APG **tabbed** carousel (a
 * `tablist` of `tab`s controlling `tabpanel` slides, arrow keys + Home/End);
 * with several slides per view a picker entry no longer maps to one panel,
 * so it becomes the **grouped** carousel's row of buttons (`aria-current`).
 *
 * The track is a scroll-snap container (`overflow: hidden`, scrolled by
 * script), so programmatic moves and the end of a swipe snap to a slide;
 * swipes run on the shared `beginPointerGesture` machine (see
 * {@link beginOgeCarouselSwipe}).
 */
import { ogeFormatMessage } from '@oge-ui/core';
import { beginPointerGesture } from '../gesture/pointer-gesture';
import type { OgePointerGestureInput } from '../gesture/pointer-gesture';

/** What the picker under the slides shows. */
export type OgeCarouselIndicators = 'dots' | 'thumbnails' | 'none';

/** The APG picker shape (see {@link ogeCarouselPickerMode}). */
export type OgeCarouselPickerMode = 'tabs' | 'buttons';

/** What moved the carousel — reported by `slideChanged`. */
export type OgeCarouselChangeSource =
  'next' | 'previous' | 'picker' | 'swipe' | 'autoplay' | 'api';

/** One data-driven slide (the `items` input / prop). */
export interface OgeCarouselItem {
  /** Stable identity for the render loop; the index is used without one. */
  key?: string | number;
  /** Image URL of the default slide template. */
  image?: string;
  /** Alternative text of the image; `''` (the default) marks it decorative. */
  imageAlt?: string;
  /** Caption heading — also the slide's accessible name prefix. */
  title?: string;
  /** Caption text under the title. */
  description?: string;
  /** Thumbnail URL for `indicators: 'thumbnails'`; falls back to `image`. */
  thumbnail?: string;
  /** Accessible name prefix when there is no visible title. */
  label?: string;
}

/** Every user-facing string the carousel renders, aria labels included. */
export interface OgeCarouselMessages {
  /** `aria-roledescription` of the container. */
  carousel: string;
  /** `aria-roledescription` of every slide. */
  slide: string;
  /** Fallback accessible name of the container when no `ariaLabel` is given. */
  label: string;
  /** Accessible name of the previous-slide button. */
  previous: string;
  /** Accessible name of the next-slide button. */
  next: string;
  /** Accessible name of the rotation control while rotation is stopped. */
  play: string;
  /** Accessible name of the rotation control while the carousel rotates. */
  pause: string;
  /** Accessible name of the slide picker (`tablist` / button group). */
  picker: string;
  /** A slide's accessible name — `{index}` and `{count}` are numbers. */
  slideLabel: string;
  /** A slide's name when it has a title: `{title}`, `{index}`, `{count}`. */
  slideTitleLabel: string;
  /** Accessible name of a picker entry — `{index}` is a number. */
  goToSlide: string;
}

export const OGE_DEFAULT_CAROUSEL_MESSAGES: OgeCarouselMessages = {
  carousel: 'carousel',
  slide: 'slide',
  label: 'Carousel',
  previous: 'Previous slide',
  next: 'Next slide',
  play: 'Start automatic slide show',
  pause: 'Stop automatic slide show',
  picker: 'Choose a slide',
  slideLabel: '{index} of {count}',
  slideTitleLabel: '{title}, {index} of {count}',
  goToSlide: 'Slide {index}',
};

/** Application-wide defaults for `oge-carousel` / `<OgeCarousel>`. */
export interface OgeCarouselConfig {
  messages: OgeCarouselMessages;
  /** Default for the `indicators` input (`dots`). */
  indicators?: OgeCarouselIndicators;
  /** Default for the `loop` input (`false`). */
  loop?: boolean;
  /** Default for the `autoplayInterval` input in ms (5000). */
  autoplayInterval?: number;
  /** Default for the `showNavigation` input (`true`). */
  showNavigation?: boolean;
  /**
   * BCP 47 locale the slide numbers are formatted in; `undefined` = the
   * application locale (Angular `LOCALE_ID`, React the runtime default).
   */
  locale?: string;
}

export const OGE_DEFAULT_CAROUSEL_CONFIG: OgeCarouselConfig = {
  messages: OGE_DEFAULT_CAROUSEL_MESSAGES,
};

export type OgeCarouselConfigInput = Partial<
  Omit<OgeCarouselConfig, 'messages'>
> & {
  messages?: Partial<OgeCarouselMessages>;
};

export function resolveOgeCarouselConfig(
  input: OgeCarouselConfigInput | undefined,
): OgeCarouselConfig {
  return {
    ...OGE_DEFAULT_CAROUSEL_CONFIG,
    ...input,
    messages: { ...OGE_DEFAULT_CAROUSEL_MESSAGES, ...input?.messages },
  };
}

/** The default rotation interval (ms). */
export const OGE_CAROUSEL_DEFAULT_INTERVAL = 5000;

/** The shortest interval autoplay accepts (ms) — anything faster is unreadable. */
export const OGE_CAROUSEL_MIN_INTERVAL = 1000;

/** A slide moved (the `slideChanged` event / `onSlideChanged` callback). */
export interface OgeCarouselSlideChangedEvent {
  /** The new first-visible slide index. */
  readonly index: number;
  readonly previousIndex: number;
  readonly source: OgeCarouselChangeSource;
}

/** The user (or the API) started or stopped the rotation. */
export interface OgeCarouselAutoplayChangedEvent {
  /** Whether the carousel now rotates (temporary hover pauses do not count). */
  readonly playing: boolean;
  /** `user` — the rotation control or focus entering; `api` — `play()` / `pause()`. */
  readonly source: 'user' | 'api';
}

/** Slides per view, sanitised: a positive integer, at most `count`. */
export function ogeCarouselPerView(perView: number, count: number): number {
  const n = Math.floor(Number.isFinite(perView) ? perView : 1);
  return Math.max(1, Math.min(n, Math.max(1, count)));
}

/**
 * The last index the first visible slide can take — `count - perView`, so a
 * multi-slide view never shows empty space after the last slide.
 */
export function ogeCarouselMaxIndex(count: number, perView = 1): number {
  if (count <= 0) return 0;
  return Math.max(0, count - ogeCarouselPerView(perView, count));
}

/** `index` clamped into `0..maxIndex`. */
export function ogeCarouselClampIndex(
  index: number,
  count: number,
  perView = 1,
): number {
  if (!Number.isFinite(index)) return 0;
  return Math.max(
    0,
    Math.min(Math.round(index), ogeCarouselMaxIndex(count, perView)),
  );
}

/**
 * The index one step forward (`+1`) or back (`-1`) from `index`, or `null`
 * when the step is blocked (an end without `loop`). With `loop` the ends
 * wrap — the carousel rewinds rather than cloning slides, so the DOM and the
 * accessibility tree always hold exactly the real slides.
 */
export function ogeCarouselStep(
  index: number,
  direction: 1 | -1,
  count: number,
  perView = 1,
  loop = false,
): number | null {
  if (count <= 1) return null;
  const max = ogeCarouselMaxIndex(count, perView);
  if (max === 0) return null;
  const next = index + direction;
  if (next > max) return loop ? 0 : null;
  if (next < 0) return loop ? max : null;
  return next;
}

/** The picker shape for a slides-per-view value (see the module doc). */
export function ogeCarouselPickerMode(perView: number): OgeCarouselPickerMode {
  return perView > 1 ? 'buttons' : 'tabs';
}

/** Number of picker entries: one per reachable first-visible index. */
export function ogeCarouselPositions(count: number, perView = 1): number {
  return count <= 0 ? 0 : ogeCarouselMaxIndex(count, perView) + 1;
}

/** Whether slide `slide` is inside the view that starts at `index`. */
export function ogeCarouselSlideVisible(
  slide: number,
  index: number,
  perView = 1,
): boolean {
  return slide >= index && slide < index + Math.max(1, perView);
}

/** The live politeness of the slides wrapper: off while rotating (APG). */
export function ogeCarouselLive(rotating: boolean): 'off' | 'polite' {
  return rotating ? 'off' : 'polite';
}

/** A slide's accessible name: "Beach, 2 of 5" or "2 of 5". */
export function ogeCarouselSlideLabel(
  index: number,
  count: number,
  messages: OgeCarouselMessages,
  title?: string,
  locale?: string,
): string {
  const values = { index: index + 1, count };
  const text = title?.trim();
  return text
    ? ogeFormatMessage(
        messages.slideTitleLabel,
        { ...values, title: text },
        locale,
      )
    : ogeFormatMessage(messages.slideLabel, values, locale);
}

/** A picker entry's accessible name ("Slide 3"). */
export function ogeCarouselPickerLabel(
  index: number,
  messages: OgeCarouselMessages,
  locale?: string,
): string {
  return ogeFormatMessage(messages.goToSlide, { index: index + 1 }, locale);
}

/** What a key does in the slide picker. */
export type OgeCarouselPickerIntent = 'previous' | 'next' | 'first' | 'last';

/**
 * The APG tabs keyboard of the picker: ←/→ move (visual, so they swap in
 * RTL) and wrap, Home/End jump. `null` = not a picker key.
 */
export function ogeCarouselPickerKey(
  key: string,
  rtl: boolean,
): OgeCarouselPickerIntent | null {
  switch (key) {
    case 'ArrowRight':
      return rtl ? 'previous' : 'next';
    case 'ArrowLeft':
      return rtl ? 'next' : 'previous';
    case 'Home':
      return 'first';
    case 'End':
      return 'last';
    default:
      return null;
  }
}

/** The picker index a picker intent lands on (wrapping, like APG tabs). */
export function ogeCarouselPickerTarget(
  intent: OgeCarouselPickerIntent,
  current: number,
  positions: number,
): number {
  if (positions <= 0) return 0;
  switch (intent) {
    case 'first':
      return 0;
    case 'last':
      return positions - 1;
    case 'next':
      return (current + 1) % positions;
    case 'previous':
      return (current - 1 + positions) % positions;
  }
}

/**
 * `scrollLeft` that shows slide `index` at the inline-start edge. `step` is
 * the distance between two slide starts (slide width + gap). Modern engines
 * report RTL scroll offsets as zero-or-negative, so RTL negates.
 */
export function ogeCarouselScrollOffset(
  index: number,
  step: number,
  rtl: boolean,
): number {
  const offset = Math.max(0, index) * Math.max(0, step);
  return rtl ? -offset : offset;
}

/** The first-visible index a scroll offset corresponds to (nearest slide). */
export function ogeCarouselIndexFromOffset(
  scrollLeft: number,
  step: number,
  maxIndex: number,
): number {
  if (!(step > 0)) return 0;
  return Math.max(
    0,
    Math.min(maxIndex, Math.round(Math.abs(scrollLeft) / step)),
  );
}

/** Share of a slide a swipe must travel to change the slide. */
export const OGE_CAROUSEL_SWIPE_RATIO = 0.2;

/** Absolute travel (px) that changes the slide regardless of the slide width. */
export const OGE_CAROUSEL_SWIPE_DISTANCE = 48;

/**
 * Where a released swipe lands. A drag past {@link OGE_CAROUSEL_SWIPE_RATIO}
 * of a slide (or {@link OGE_CAROUSEL_SWIPE_DISTANCE} px) moves at least one
 * slide in the drag direction; long drags move by as many whole slides as
 * they covered. Content follows the finger, so dragging towards the
 * inline-start edge (left in LTR, right in RTL) goes forward.
 */
export function ogeCarouselSwipeTarget(input: {
  index: number;
  deltaX: number;
  step: number;
  count: number;
  perView?: number;
  loop?: boolean;
  rtl?: boolean;
}): number {
  const { index, deltaX, step, count } = input;
  const perView = input.perView ?? 1;
  const max = ogeCarouselMaxIndex(count, perView);
  const forward = input.rtl ? deltaX : -deltaX;
  const distance = Math.abs(deltaX);
  const threshold = Math.min(
    OGE_CAROUSEL_SWIPE_DISTANCE,
    Math.max(1, step) * OGE_CAROUSEL_SWIPE_RATIO,
  );
  if (distance < threshold || forward === 0) return index;
  const slides = Math.max(1, Math.round(distance / Math.max(1, step)));
  const target = index + (forward > 0 ? slides : -slides);
  if (target > max) return input.loop && index === max ? 0 : max;
  if (target < 0) return input.loop && index === 0 ? max : 0;
  return target;
}

/** Why the rotation is currently held (temporary pauses — not user stops). */
export type OgeCarouselHoldReason = 'hover' | 'hidden' | 'drag';

export interface OgeCarouselAutoplayOptions {
  /** Called on every rotation tick. */
  onTick: () => void;
  /** Called whenever {@link OgeCarouselAutoplay.isPlaying} changes. */
  onChange?: (playing: boolean) => void;
  /** Interval in ms (clamped to {@link OGE_CAROUSEL_MIN_INTERVAL}). */
  interval?: number;
}

/**
 * The rotation timer. `playing` is the user-level state the rotation control
 * shows (APG: focus entering the carousel or the control stops it for good;
 * only the user restarts it); `hold()` / `release()` are temporary pauses —
 * pointer hover, a hidden tab, a running swipe — which resume on their own.
 * A tick only fires while playing and nothing holds it; every release or
 * slide change restarts the full interval, so a slide is never cut short.
 * Framework-free and DOM-free: the host wires the events.
 */
export class OgeCarouselAutoplay {
  private playing = false;
  private readonly holds = new Set<OgeCarouselHoldReason>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private interval: number;
  private destroyed = false;

  constructor(private readonly options: OgeCarouselAutoplayOptions) {
    this.interval = OgeCarouselAutoplay.clampInterval(options.interval);
  }

  static clampInterval(interval: number | undefined): number {
    const value =
      interval === undefined || !Number.isFinite(interval)
        ? OGE_CAROUSEL_DEFAULT_INTERVAL
        : interval;
    return Math.max(OGE_CAROUSEL_MIN_INTERVAL, value);
  }

  /** The user-level state — what the rotation control shows. */
  isPlaying(): boolean {
    return this.playing;
  }

  /** Whether a tick is currently scheduled (playing and not held). */
  isRunning(): boolean {
    return this.timer !== null;
  }

  /** Starts (or keeps) the rotation. */
  play(): void {
    if (this.destroyed) return;
    if (!this.playing) {
      this.playing = true;
      this.options.onChange?.(true);
    }
    this.schedule();
  }

  /** Stops the rotation until `play()`. */
  pause(): void {
    this.clear();
    if (this.playing) {
      this.playing = false;
      this.options.onChange?.(false);
    }
  }

  /** Changes the interval; a running timer restarts with it. */
  setInterval(interval: number | undefined): void {
    this.interval = OgeCarouselAutoplay.clampInterval(interval);
    if (this.timer) this.schedule();
  }

  /** A temporary pause (hover, hidden tab, swipe). */
  hold(reason: OgeCarouselHoldReason): void {
    this.holds.add(reason);
    this.clear();
  }

  /** Ends a temporary pause; the full interval starts again. */
  release(reason: OgeCarouselHoldReason): void {
    if (!this.holds.delete(reason)) return;
    this.schedule();
  }

  /** Restarts the interval (after a manual slide change). */
  restart(): void {
    if (this.timer) this.schedule();
  }

  /** Stops everything; the instance stays inert until `revive()`. */
  destroy(): void {
    this.clear();
    this.destroyed = true;
  }

  /** Undoes `destroy()` (React StrictMode remounts the same instance). */
  revive(): void {
    this.destroyed = false;
    this.schedule();
  }

  private schedule(): void {
    this.clear();
    if (this.destroyed || !this.playing || this.holds.size > 0) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.options.onTick();
      this.schedule();
    }, this.interval);
  }

  private clear(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

/**
 * Distance between two slide starts, measured from the rendered slides
 * (width + gap); falls back to the track width over `perView`.
 */
export function ogeCarouselMeasureStep(
  track: HTMLElement | null,
  perView = 1,
): number {
  if (!track) return 0;
  const slides = track.children;
  const first = slides[0] as HTMLElement | undefined;
  const second = slides[1] as HTMLElement | undefined;
  if (first && second) {
    const a = first.getBoundingClientRect();
    const b = second.getBoundingClientRect();
    const step = Math.abs(b.left - a.left);
    if (step > 0) return step;
  }
  const width = track.clientWidth;
  return width > 0 ? width / Math.max(1, perView) : 0;
}

/** Moves the track to slide `index` (instant or smooth). SSR / jsdom safe. */
export function ogeCarouselScrollTo(
  track: HTMLElement | null,
  index: number,
  options: { perView?: number; rtl: boolean; behavior: ScrollBehavior },
): void {
  if (!track) return;
  const step = ogeCarouselMeasureStep(track, options.perView);
  const left = ogeCarouselScrollOffset(index, step, options.rtl);
  if (typeof track.scrollTo === 'function') {
    track.scrollTo({ left, behavior: options.behavior });
  } else {
    track.scrollLeft = left;
  }
}

/** The CSS class the track carries while a swipe drags it (snap off). */
export const OGE_CAROUSEL_DRAGGING_CLASS = 'oge-carousel-dragging';

export interface OgeCarouselSwipeOptions {
  /** The scroll-snap track the swipe drags. */
  track: HTMLElement;
  /** Current first-visible index. */
  index: number;
  count: number;
  perView?: number;
  loop?: boolean;
  rtl: boolean;
  /** Called once with the landing index (unchanged when the swipe was short). */
  onFinish: (index: number, committed: boolean) => void;
  /** Called when the swipe starts dragging (autoplay holds here). */
  onStart?: () => void;
}

/**
 * Starts a swipe from `pointerdown` on the track: the content follows the
 * pointer (snap disabled while dragging), and the release lands on
 * {@link ogeCarouselSwipeTarget}. Runs on the shared `beginPointerGesture`
 * (threshold, pointer capture, Escape / `pointercancel` cancel, click
 * suppression after a drag) with `touchLock: false`, because the track
 * declares `touch-action: pan-y` — a vertical swipe still scrolls the page.
 */
export function beginOgeCarouselSwipe(
  event: OgePointerGestureInput & { readonly button?: number },
  options: OgeCarouselSwipeOptions,
): { cancel(): void } | null {
  if (event.button !== undefined && event.button !== 0) return null;
  if (options.count <= 1) return null;
  const target = event.target as Element | null;
  // text fields keep their own pointer gestures (caret placement, selection)
  if (target?.closest?.('input, textarea, select, [contenteditable="true"]'))
    return null;
  const { track } = options;
  const startLeft = track.scrollLeft;
  const step = ogeCarouselMeasureStep(track, options.perView);
  let deltaX = 0;
  let started = false;
  const handle = beginPointerGesture(event, {
    source: track,
    // a mouse press would otherwise start a text-selection or image drag;
    // touch keeps its default so a vertical swipe still scrolls the page
    preventDefault: event.pointerType !== 'touch',
    touchAction: false,
    touchLock: false,
    suppressClick: true,
    onMove(dx) {
      if (!started) {
        started = true;
        track.classList.add(OGE_CAROUSEL_DRAGGING_CLASS);
        options.onStart?.();
      }
      deltaX = dx;
      track.scrollLeft = startLeft - dx;
    },
    onFinish(commit) {
      track.classList.remove(OGE_CAROUSEL_DRAGGING_CLASS);
      const target = commit
        ? ogeCarouselSwipeTarget({
            index: options.index,
            deltaX,
            step,
            count: options.count,
            perView: options.perView,
            loop: options.loop,
            rtl: options.rtl,
          })
        : options.index;
      options.onFinish(target, commit && target !== options.index);
    },
  });
  return handle;
}
