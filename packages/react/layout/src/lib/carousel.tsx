'use client';

import {
  Children,
  forwardRef,
  isValidElement,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type FocusEvent as ReactFocusEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  OgeCarouselAutoplay,
  beginOgeCarouselSwipe,
  motionScrollBehavior,
  ogeCarouselClampIndex,
  ogeCarouselLive,
  ogeCarouselPerView,
  ogeCarouselPickerKey,
  ogeCarouselPickerLabel,
  ogeCarouselPickerMode,
  ogeCarouselPickerTarget,
  ogeCarouselPositions,
  ogeCarouselScrollTo,
  ogeCarouselSlideLabel,
  ogeCarouselSlideVisible,
  ogeCarouselStep,
  ogeIsRtl,
  prefersReducedMotion,
  sanitizeResourceUrl,
  type OgeCarouselAutoplayChangedEvent,
  type OgeCarouselChangeSource,
  type OgeCarouselIndicators,
  type OgeCarouselItem,
  type OgeCarouselSlideChangedEvent,
} from '@oge-ui/behavior';
import { useOgeCarouselConfig } from './layout-config';
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect';

/** Props of a declarative `<OgeCarouselSlide>` — the Angular `oge-carousel-slide`. */
export interface OgeCarouselSlideProps {
  /** Accessible name prefix of the slide ("Spring sale, 1 of 4"). */
  label?: string;
  /** Thumbnail URL for `indicators="thumbnails"`. */
  thumbnail?: string;
  /** `false` removes the slide. */
  visible?: boolean;
  /** The slide body. */
  children?: ReactNode;
}

/**
 * One declarative slide of `<OgeCarousel>`. It renders nothing by itself:
 * the carousel reads its props and draws its children inside its own slide
 * wrapper, which carries the APG roles and the `inert` state.
 */
export function OgeCarouselSlide(_props: OgeCarouselSlideProps): null {
  return null;
}

/** Context of `renderSlide` — the Angular `[ogeCarouselSlideTemplate]` context. */
export interface OgeCarouselSlideRenderContext {
  item: OgeCarouselItem;
  index: number;
  count: number;
  active: boolean;
}

export interface OgeCarouselProps {
  /** Data-driven slides, rendered after the declarative `<OgeCarouselSlide>` children. */
  items?: readonly OgeCarouselItem[];
  /** Index of the first visible slide (controlled); clamped to the slides. */
  selectedIndex?: number;
  /** Initial index when uncontrolled. */
  defaultSelectedIndex?: number;
  /** The index a move committed — the controlled half of `selectedIndex`. */
  onSelectedIndexChange?: (index: number) => void;
  /** Slides shown side by side (default 1). Several per view switch the picker to buttons. */
  slidesPerView?: number;
  /** Space between slides in px (or any CSS length); default 0 for one slide per view, 16 otherwise. */
  gap?: number | string;
  /** Height of the slide viewport (px number or CSS length); default: the tallest slide. */
  height?: number | string;
  /** `dots` (default), `thumbnails` or `none`; falls back to the config. */
  indicators?: OgeCarouselIndicators;
  /** Shows the previous / next buttons; falls back to the config, then `true`. */
  showNavigation?: boolean;
  /** Wraps from the last slide to the first and back; falls back to the config, then `false`. */
  loop?: boolean;
  /**
   * Rotates the slides automatically and renders the rotation control
   * (WCAG 2.2.2). Rotation always wraps to the first slide. Starts stopped
   * under `prefers-reduced-motion`.
   */
  autoplay?: boolean;
  /** Rotation interval in ms (min 1000); falls back to the config, then 5000. */
  autoplayInterval?: number;
  /** Pauses the rotation while the pointer is over the carousel (default `true`). */
  pauseOnHover?: boolean;
  /** Lets touch, pen and mouse drags swipe between slides (default `true`). */
  swipeEnabled?: boolean;
  /** BCP 47 locale of the slide numbers; falls back to the config, then the runtime default. */
  locale?: string;
  /** Accessible name of the carousel; set it, and the host becomes a named region. */
  ariaLabel?: string;
  /** Replaces the built-in image + caption of every `items` slide — the Angular `[ogeCarouselSlideTemplate]`. */
  renderSlide?: (context: OgeCarouselSlideRenderContext) => ReactNode;
  /** The first visible slide changed — by a button, the picker, a swipe, autoplay or the API. */
  onSlideChanged?: (event: OgeCarouselSlideChangedEvent) => void;
  /** The rotation was started or stopped by the user or the API. */
  onAutoplayChanged?: (event: OgeCarouselAutoplayChangedEvent) => void;
  /** Declarative `<OgeCarouselSlide>` elements. */
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** Imperative handle of `<OgeCarousel>`. */
export interface OgeCarouselHandle {
  /** Shows the next slide (wraps only with `loop`). */
  next(): void;
  /** Shows the previous slide (wraps only with `loop`). */
  previous(): void;
  /** Shows slide `index` (clamped). */
  goTo(index: number): void;
  /** Starts the rotation (only while `autoplay` is on). */
  play(): void;
  /** Stops the rotation until the user or `play()` restarts it. */
  pause(): void;
  /** Focuses the selected picker entry, else the first control. */
  focus(): void;
}

interface Slide {
  id: string;
  content: ReactNode | null;
  item: OgeCarouselItem | null;
  label: string | undefined;
  thumbnail: string | undefined;
}

const EMPTY: readonly OgeCarouselItem[] = [];

const safeId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, '');

/**
 * A slide show — the React render of the Angular `<oge-carousel>`, same
 * markup, the same APG carousel roles and the same machines from
 * `@oge-ui/behavior`: a tab-list picker with one slide per view, a button
 * row with several, rotation that pauses on hover and a hidden tab, stops
 * when keyboard focus enters, and always renders its rotation control.
 *
 * ```tsx
 * <OgeCarousel items={slides} ariaLabel="Featured destinations" loop />
 *
 * <OgeCarousel ariaLabel="Highlights" autoplay indicators="thumbnails">
 *   <OgeCarouselSlide label="Spring sale" thumbnail="/img/spring-thumb.jpg">
 *     <img src="/img/spring.jpg" alt="Flowers on a market stall" />
 *   </OgeCarouselSlide>
 * </OgeCarousel>
 * ```
 */
export const OgeCarousel = forwardRef<OgeCarouselHandle, OgeCarouselProps>(
  function OgeCarousel(props, ref) {
    const config = useOgeCarouselConfig();
    const messages = config.messages;
    const items = props.items ?? EMPTY;
    const locale = props.locale ?? config.locale;
    const loop = props.loop ?? config.loop ?? false;
    const indicators = props.indicators ?? config.indicators ?? 'dots';
    const autoplay = props.autoplay ?? false;
    const swipeEnabled = props.swipeEnabled ?? true;
    const pauseOnHover = props.pauseOnHover ?? true;

    const uid = safeId(useId());
    const trackId = `oge-carousel-${uid}-track`;
    const slideId = (i: number) => `oge-carousel-${uid}-slide-${i}`;
    const tabId = (i: number) => `oge-carousel-${uid}-tab-${i}`;

    const slides = useMemo<Slide[]>(() => {
      const children: Slide[] = [];
      Children.toArray(props.children).forEach((child, i) => {
        if (!isValidElement(child) || child.type !== OgeCarouselSlide) return;
        const slide = (child as ReactElement<OgeCarouselSlideProps>).props;
        if (slide.visible === false) return;
        children.push({
          id: `c:${child.key ?? i}`,
          content: slide.children ?? null,
          item: null,
          label: slide.label,
          thumbnail: slide.thumbnail,
        });
      });
      return [
        ...children,
        ...items.map((item, i) => ({
          id: `i:${item.key ?? i}`,
          content: null,
          item,
          label: item.title ?? item.label,
          thumbnail: item.thumbnail ?? item.image,
        })),
      ];
    }, [props.children, items]);

    const count = slides.length;
    const perView = ogeCarouselPerView(props.slidesPerView ?? 1, count);
    const positions = ogeCarouselPositions(count, perView);
    const [uncontrolledIndex, setUncontrolledIndex] = useState(
      props.defaultSelectedIndex ?? 0,
    );
    const index = ogeCarouselClampIndex(
      props.selectedIndex ?? uncontrolledIndex,
      count,
      perView,
    );
    const [playing, setPlaying] = useState(false);

    const hostRef = useRef<HTMLDivElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const latest = useRef(props);
    latest.current = props;
    const state = useRef({ index, count, perView, loop });
    state.current = { index, count, perView, loop };
    const flags = useRef({ dragging: false, pointerFocus: false, first: true });
    const swipeRef = useRef<{ cancel(): void } | null>(null);

    const timerRef = useRef<OgeCarouselAutoplay | null>(null);
    if (timerRef.current === null) {
      timerRef.current = new OgeCarouselAutoplay({
        onTick: () => {
          const s = state.current;
          // rotation always wraps, so a non-looping carousel rewinds
          const next = ogeCarouselStep(s.index, 1, s.count, s.perView, true);
          if (next !== null) commitRef.current(next, 'autoplay');
        },
        onChange: (value) => setPlaying(value),
      });
    }
    const timer = timerRef.current;

    const commit = (target: number, source: OgeCarouselChangeSource) => {
      const s = state.current;
      const next = ogeCarouselClampIndex(target, s.count, s.perView);
      if (next === s.index) {
        if (source === 'swipe') syncScroll(next);
        return;
      }
      state.current = { ...s, index: next };
      if (latest.current.selectedIndex === undefined)
        setUncontrolledIndex(next);
      latest.current.onSelectedIndexChange?.(next);
      latest.current.onSlideChanged?.({
        index: next,
        previousIndex: s.index,
        source,
      });
      if (source !== 'autoplay') timer.restart();
    };
    const commitRef = useRef(commit);
    commitRef.current = commit;

    const syncScroll = (target: number, instant = false) => {
      if (flags.current.dragging) return;
      const track = trackRef.current;
      if (!track) return;
      const behavior: ScrollBehavior =
        instant || flags.current.first ? 'auto' : motionScrollBehavior();
      flags.current.first = false;
      ogeCarouselScrollTo(track, target, {
        perView: state.current.perView,
        rtl: ogeIsRtl(hostRef.current),
        behavior,
      });
    };
    const syncRef = useRef(syncScroll);
    syncRef.current = syncScroll;

    // the machine's lifetime: revived on mount (StrictMode remounts the same
    // instance), destroyed on unmount; `autoplay` starts / stops it
    useEffect(() => {
      timer.revive();
      if (autoplay) {
        if (!prefersReducedMotion()) timer.play();
      } else timer.pause();
      return () => timer.destroy();
    }, [timer, autoplay]);

    useEffect(() => {
      timer.setInterval(props.autoplayInterval ?? config.autoplayInterval);
    }, [timer, props.autoplayInterval, config.autoplayInterval]);

    useEffect(() => {
      if (typeof document === 'undefined') return;
      const onVisibility = () => {
        if (document.visibilityState === 'hidden') timer.hold('hidden');
        else timer.release('hidden');
      };
      document.addEventListener('visibilitychange', onVisibility);
      return () =>
        document.removeEventListener('visibilitychange', onVisibility);
    }, [timer]);

    useIsomorphicLayoutEffect(() => {
      syncRef.current(index);
    }, [index, perView, count]);

    useEffect(() => {
      const track = trackRef.current;
      if (!track || typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(() =>
        syncRef.current(state.current.index, true),
      );
      observer.observe(track);
      return () => observer.disconnect();
    }, []);

    useEffect(() => () => swipeRef.current?.cancel(), []);

    const step = (direction: 1 | -1, source: OgeCarouselChangeSource) => {
      const s = state.current;
      const next = ogeCarouselStep(
        s.index,
        direction,
        s.count,
        s.perView,
        s.loop,
      );
      if (next !== null) commitRef.current(next, source);
    };
    const stepRef = useRef(step);
    stepRef.current = step;

    const focusControl = () => {
      const host = hostRef.current;
      const target =
        host?.querySelector<HTMLElement>(
          '.oge-carousel-picker [tabindex="0"]',
        ) ??
        host?.querySelector<HTMLElement>('.oge-carousel-picker button') ??
        host?.querySelector<HTMLElement>('button');
      target?.focus();
    };

    useImperativeHandle(
      ref,
      () => ({
        next: () => stepRef.current(1, 'next'),
        previous: () => stepRef.current(-1, 'previous'),
        goTo: (i) => commitRef.current(i, 'api'),
        play: () => {
          if (!latest.current.autoplay || timer.isPlaying()) return;
          timer.play();
          latest.current.onAutoplayChanged?.({ playing: true, source: 'api' });
        },
        pause: () => {
          if (!timer.isPlaying()) return;
          timer.pause();
          latest.current.onAutoplayChanged?.({
            playing: false,
            source: 'api',
          });
        },
        focus: focusControl,
      }),
      [timer],
    );

    const toggleAutoplay = () => {
      const next = !timer.isPlaying();
      if (next) timer.play();
      else timer.pause();
      latest.current.onAutoplayChanged?.({ playing: next, source: 'user' });
    };

    const onTrackPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!swipeEnabled || flags.current.dragging) return;
      const track = trackRef.current;
      if (!track) return;
      const s = state.current;
      swipeRef.current = beginOgeCarouselSwipe(event, {
        track,
        index: s.index,
        count: s.count,
        perView: s.perView,
        loop: s.loop,
        rtl: ogeIsRtl(hostRef.current),
        onStart: () => {
          flags.current.dragging = true;
          timer.hold('drag');
        },
        onFinish: (target, committed) => {
          flags.current.dragging = false;
          swipeRef.current = null;
          timer.release('drag');
          if (committed) commitRef.current(target, 'swipe');
          else syncRef.current(state.current.index);
        },
      });
    };

    const onPickerKeyDown = (
      event: ReactKeyboardEvent<HTMLButtonElement>,
      current: number,
    ) => {
      const intent = ogeCarouselPickerKey(event.key, ogeIsRtl(hostRef.current));
      if (!intent) return;
      event.preventDefault();
      const target = ogeCarouselPickerTarget(intent, current, positions);
      commitRef.current(target, 'picker');
      // automatic activation: focus follows the selection (APG tabs)
      hostRef.current?.querySelector<HTMLElement>(`#${tabId(target)}`)?.focus();
    };

    const onFocus = (event: ReactFocusEvent<HTMLDivElement>) => {
      const from = event.relatedTarget as Node | null;
      if (from && hostRef.current?.contains(from)) return;
      if (flags.current.pointerFocus || !timer.isPlaying()) return;
      // APG: keyboard focus entering the carousel stops the rotation for good
      timer.pause();
      latest.current.onAutoplayChanged?.({ playing: false, source: 'user' });
    };

    const showNav =
      (props.showNavigation ?? config.showNavigation ?? true) && positions > 1;
    const showPicker = indicators !== 'none' && positions > 1;
    const tabbed = showPicker && ogeCarouselPickerMode(perView) === 'tabs';
    const thumbnails = indicators === 'thumbnails';
    const canPrevious =
      ogeCarouselStep(index, -1, count, perView, loop) !== null;
    const canNext = ogeCarouselStep(index, 1, count, perView, loop) !== null;
    const gap = props.gap ?? (perView > 1 ? 16 : 0);
    const height = props.height;
    const visible = (i: number) => ogeCarouselSlideVisible(i, index, perView);

    const pickerClass = (i: number) => {
      const base = thumbnails ? 'oge-carousel-thumb' : 'oge-carousel-dot';
      return i === index ? `${base} oge-carousel-current` : base;
    };
    const mark = (slide: Slide | undefined) =>
      thumbnails && slide?.thumbnail ? (
        <img
          className="oge-carousel-thumb-image"
          src={sanitizeResourceUrl(slide.thumbnail)}
          alt=""
          draggable={false}
        />
      ) : (
        <span className="oge-carousel-dot-mark" aria-hidden="true" />
      );

    const renderItem = (item: OgeCarouselItem, i: number) => {
      if (latest.current.renderSlide) {
        return latest.current.renderSlide({
          item,
          index: i,
          count,
          active: visible(i),
        });
      }
      return (
        <figure className="oge-carousel-figure">
          {item.image && (
            <img
              className="oge-carousel-image"
              src={sanitizeResourceUrl(item.image)}
              alt={item.imageAlt ?? ''}
              draggable={false}
            />
          )}
          {(item.title || item.description) && (
            <figcaption className="oge-carousel-caption">
              {item.title && (
                <span className="oge-carousel-caption-title">{item.title}</span>
              )}
              {item.description && (
                <span className="oge-carousel-caption-text">
                  {item.description}
                </span>
              )}
            </figcaption>
          )}
        </figure>
      );
    };

    const className = [
      'oge-carousel',
      perView > 1 && 'oge-carousel-multi',
      autoplay && 'oge-carousel-has-rotation',
      props.className,
    ]
      .filter(Boolean)
      .join(' ');
    const style = {
      ...props.style,
      '--oge-carousel-per-view': perView,
      '--oge-carousel-gap': typeof gap === 'number' ? `${gap}px` : gap,
    } as CSSProperties;

    return (
      <div
        ref={hostRef}
        className={className}
        style={style}
        role={props.ariaLabel ? 'region' : 'group'}
        aria-roledescription={messages.carousel}
        aria-label={props.ariaLabel ?? messages.label}
        onPointerEnter={(event) => {
          if (event.pointerType !== 'touch' && pauseOnHover)
            timer.hold('hover');
        }}
        onPointerLeave={(event) => {
          if (event.pointerType !== 'touch') timer.release('hover');
        }}
        onPointerDown={() => {
          // a pointer press moves focus too; only keyboard focus stops rotation
          flags.current.pointerFocus = true;
          setTimeout(() => (flags.current.pointerFocus = false));
        }}
        onFocus={onFocus}
      >
        {autoplay && (
          <button
            type="button"
            className="oge-carousel-rotation"
            aria-label={playing ? messages.pause : messages.play}
            onClick={toggleAutoplay}
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              aria-hidden="true"
              focusable="false"
            >
              {playing ? (
                <path className="oge-carousel-glyph-bars" d="M8 5v14M16 5v14" />
              ) : (
                <path
                  className="oge-carousel-glyph-play"
                  d="M7 4.5v15l12-7.5z"
                />
              )}
            </svg>
          </button>
        )}
        <div
          className="oge-carousel-viewport"
          style={
            height === undefined
              ? undefined
              : { height: typeof height === 'number' ? `${height}px` : height }
          }
        >
          <div
            ref={trackRef}
            className="oge-carousel-track"
            id={trackId}
            aria-live={ogeCarouselLive(autoplay && playing)}
            onPointerDown={onTrackPointerDown}
          >
            {slides.map((slide, i) => (
              <div
                key={slide.id}
                className={
                  visible(i)
                    ? 'oge-carousel-slide oge-carousel-slide-active'
                    : 'oge-carousel-slide'
                }
                id={slideId(i)}
                role={tabbed ? 'tabpanel' : 'group'}
                aria-roledescription={messages.slide}
                aria-label={ogeCarouselSlideLabel(
                  i,
                  count,
                  messages,
                  slide.label,
                  locale,
                )}
                aria-hidden={visible(i) ? undefined : true}
                inert={!visible(i)}
              >
                {slide.item ? renderItem(slide.item, i) : slide.content}
              </div>
            ))}
          </div>
          {showNav && (
            <>
              <button
                type="button"
                className="oge-carousel-nav oge-carousel-prev"
                aria-label={messages.previous}
                aria-controls={trackId}
                aria-disabled={canPrevious ? undefined : true}
                onClick={() => stepRef.current(-1, 'previous')}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="M15 5l-7 7 7 7" />
                </svg>
              </button>
              <button
                type="button"
                className="oge-carousel-nav oge-carousel-next"
                aria-label={messages.next}
                aria-controls={trackId}
                aria-disabled={canNext ? undefined : true}
                onClick={() => stepRef.current(1, 'next')}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
        </div>
        {showPicker &&
          (tabbed ? (
            <div
              className={
                thumbnails
                  ? 'oge-carousel-picker oge-carousel-picker-thumbnails'
                  : 'oge-carousel-picker'
              }
              role="tablist"
              aria-label={messages.picker}
            >
              {slides.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  role="tab"
                  className={pickerClass(i)}
                  id={tabId(i)}
                  aria-selected={i === index}
                  aria-controls={slideId(i)}
                  aria-label={ogeCarouselPickerLabel(i, messages, locale)}
                  tabIndex={i === index ? 0 : -1}
                  onClick={() => commitRef.current(i, 'picker')}
                  onKeyDown={(event) => onPickerKeyDown(event, i)}
                >
                  {mark(slide)}
                </button>
              ))}
            </div>
          ) : (
            <div
              className={
                thumbnails
                  ? 'oge-carousel-picker oge-carousel-picker-thumbnails'
                  : 'oge-carousel-picker'
              }
              role="group"
              aria-label={messages.picker}
            >
              {Array.from({ length: positions }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  className={pickerClass(i)}
                  aria-label={ogeCarouselPickerLabel(i, messages, locale)}
                  aria-current={i === index ? true : undefined}
                  aria-controls={trackId}
                  onClick={() => commitRef.current(i, 'picker')}
                >
                  {mark(slides[i])}
                </button>
              ))}
            </div>
          ))}
      </div>
    );
  },
);
