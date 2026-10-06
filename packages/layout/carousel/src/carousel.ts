import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  LOCALE_ID,
  PLATFORM_ID,
  ViewEncapsulation,
  afterNextRender,
  afterRenderEffect,
  computed,
  contentChild,
  contentChildren,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
  type TemplateRef,
} from '@angular/core';
import { DOCUMENT, NgTemplateOutlet, isPlatformBrowser } from '@angular/common';
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
} from '@oge-ui/behavior';
import { OGE_CAROUSEL_CONFIG, type OgeCarouselMessages } from './config';
import { OgeCarouselSlide } from './carousel-slide';
import {
  OgeCarouselSlideTemplate,
  type OgeCarouselSlideTemplateContext,
} from './templates';
import type {
  OgeCarouselAutoplayChangedEvent,
  OgeCarouselChangeSource,
  OgeCarouselIndicators,
  OgeCarouselItem,
  OgeCarouselSlideChangedEvent,
} from './carousel-types';

let nextCarouselId = 0;

/** One rendered slide — a declarative child or an `items` entry. */
interface SlideDescriptor {
  readonly id: string;
  readonly template: TemplateRef<unknown> | null;
  readonly item: OgeCarouselItem | null;
  readonly label: string | undefined;
  readonly thumbnail: string | undefined;
}

/**
 * A slide show — a WAI-ARIA APG **carousel** with previous / next buttons, a
 * dot or thumbnail slide picker, optional looping and auto-rotation:
 *
 * ```html
 * <oge-carousel [items]="slides" ariaLabel="Featured destinations" />
 *
 * <oge-carousel ariaLabel="Highlights" [autoplay]="true" [loop]="true"
 *   indicators="thumbnails" [(selectedIndex)]="current">
 *   <oge-carousel-slide label="Spring sale" thumbnail="/img/spring-thumb.jpg">
 *     <img src="/img/spring.jpg" alt="Flowers on a market stall" />
 *   </oge-carousel-slide>
 * </oge-carousel>
 * ```
 *
 * The host is a region (named by `ariaLabel`; a group named by the `label`
 * message without one) with `aria-roledescription="carousel"`; slides are
 * groups named "N of M" and off-screen slides are `inert`. With one slide per
 * view the picker is an APG tab list (arrows, Home / End, automatic
 * activation); with several it is a row of buttons. Auto-rotation pauses
 * while the pointer is over the carousel or the tab is hidden, **stops** when
 * keyboard focus enters it, and always shows a rotation control (WCAG 2.2.2);
 * under `prefers-reduced-motion` it starts stopped. The track is a
 * scroll-snap container driven by script and by swipes on the shared pointer
 * gesture, so RTL, touch and mouse all land on whole slides.
 */
@Component({
  selector: 'oge-carousel',
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-carousel',
    '[class.oge-carousel-multi]': 'perView() > 1',
    '[class.oge-carousel-has-rotation]': 'autoplay()',
    '[attr.role]': "ariaLabel() ? 'region' : 'group'",
    '[attr.aria-roledescription]': 'msg().carousel',
    '[attr.aria-label]': 'ariaLabel() ?? msg().label',
    '[style.--oge-carousel-per-view]': 'perView()',
    '[style.--oge-carousel-gap]': 'gapCss()',
    '(pointerenter)': 'onPointerEnter($event)',
    '(pointerleave)': 'onPointerLeave($event)',
    '(pointerdown)': 'onHostPointerDown()',
    '(focusin)': 'onFocusIn($event)',
  },
  styleUrl: './carousel.scss',
  template: `
    @if (autoplay()) {
      <button
        type="button"
        class="oge-carousel-rotation"
        [attr.aria-label]="playing() ? msg().pause : msg().play"
        (click)="toggleAutoplay()"
      >
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          aria-hidden="true"
          focusable="false"
        >
          @if (playing()) {
            <path class="oge-carousel-glyph-bars" d="M8 5v14M16 5v14" />
          } @else {
            <path class="oge-carousel-glyph-play" d="M7 4.5v15l12-7.5z" />
          }
        </svg>
      </button>
    }
    <div class="oge-carousel-viewport" [style.height]="heightCss()">
      <div
        #track
        class="oge-carousel-track"
        [id]="trackId"
        [attr.aria-live]="live()"
        (pointerdown)="onTrackPointerDown($event)"
      >
        @for (slide of slides(); track slide.id; let i = $index) {
          <div
            class="oge-carousel-slide"
            [id]="slideId(i)"
            [class.oge-carousel-slide-active]="isVisible(i)"
            [attr.role]="tabbed() ? 'tabpanel' : 'group'"
            [attr.aria-roledescription]="msg().slide"
            [attr.aria-label]="slideLabel(i, slide)"
            [attr.aria-hidden]="isVisible(i) ? null : true"
            [attr.inert]="isVisible(i) ? null : ''"
          >
            @if (slide.template; as tpl) {
              <ng-container *ngTemplateOutlet="tpl" />
            } @else if (slide.item; as item) {
              @if (slideTemplate(); as custom) {
                <ng-container
                  *ngTemplateOutlet="
                    custom.templateRef;
                    context: slideContext(item, i)
                  "
                />
              } @else {
                <figure class="oge-carousel-figure">
                  @if (item.image) {
                    <img
                      class="oge-carousel-image"
                      [src]="item.image"
                      [attr.alt]="item.imageAlt ?? ''"
                      draggable="false"
                    />
                  }
                  @if (item.title || item.description) {
                    <figcaption class="oge-carousel-caption">
                      @if (item.title) {
                        <span class="oge-carousel-caption-title">{{
                          item.title
                        }}</span>
                      }
                      @if (item.description) {
                        <span class="oge-carousel-caption-text">{{
                          item.description
                        }}</span>
                      }
                    </figcaption>
                  }
                </figure>
              }
            }
          </div>
        }
      </div>
      @if (showNav()) {
        <button
          type="button"
          class="oge-carousel-nav oge-carousel-prev"
          [attr.aria-label]="msg().previous"
          [attr.aria-controls]="trackId"
          [attr.aria-disabled]="canPrevious() ? null : true"
          (click)="onNavClick(-1)"
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
          class="oge-carousel-nav oge-carousel-next"
          [attr.aria-label]="msg().next"
          [attr.aria-controls]="trackId"
          [attr.aria-disabled]="canNext() ? null : true"
          (click)="onNavClick(1)"
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
      }
    </div>
    @if (showPicker()) {
      @if (tabbed()) {
        <div
          class="oge-carousel-picker"
          [class.oge-carousel-picker-thumbnails]="thumbnails()"
          role="tablist"
          [attr.aria-label]="msg().picker"
        >
          @for (slide of slides(); track slide.id; let i = $index) {
            <button
              type="button"
              role="tab"
              [class]="pickerClass(i)"
              [id]="tabId(i)"
              [attr.aria-selected]="i === index()"
              [attr.aria-controls]="slideId(i)"
              [attr.aria-label]="pickerLabel(i)"
              [tabindex]="i === index() ? 0 : -1"
              (click)="pick(i)"
              (keydown)="onPickerKeydown($event, i)"
            >
              <ng-container
                *ngTemplateOutlet="mark; context: { slide: slide }"
              />
            </button>
          }
        </div>
      } @else {
        <div
          class="oge-carousel-picker"
          [class.oge-carousel-picker-thumbnails]="thumbnails()"
          role="group"
          [attr.aria-label]="msg().picker"
        >
          @for (position of positionList(); track position) {
            <button
              type="button"
              [class]="pickerClass(position)"
              [attr.aria-label]="pickerLabel(position)"
              [attr.aria-current]="position === index() ? true : null"
              [attr.aria-controls]="trackId"
              (click)="pick(position)"
            >
              <ng-container
                *ngTemplateOutlet="mark; context: { slide: slides()[position] }"
              />
            </button>
          }
        </div>
      }
    }

    <ng-template #mark let-slide="slide">
      @if (thumbnails() && thumbnailOf(slide); as src) {
        <img
          class="oge-carousel-thumb-image"
          [src]="src"
          alt=""
          draggable="false"
        />
      } @else {
        <span class="oge-carousel-dot-mark" aria-hidden="true"></span>
      }
    </ng-template>
  `,
})
export class OgeCarousel {
  private readonly config = inject(OGE_CAROUSEL_CONFIG);
  private readonly appLocale = inject(LOCALE_ID);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Data-driven slides, rendered after the declarative `oge-carousel-slide` children. */
  readonly items = input<readonly OgeCarouselItem[]>([]);
  /** Index of the first visible slide (two-way); clamped to the slides. */
  readonly selectedIndex = model(0);
  /** Slides shown side by side (default 1). Several per view switch the picker to buttons. */
  readonly slidesPerView = input(1);
  /** Space between slides in px (or any CSS length); default 0 for one slide per view, 16 otherwise. */
  readonly gap = input<number | string | undefined>(undefined);
  /** Height of the slide viewport (px number or CSS length); default: the tallest slide. */
  readonly height = input<number | string | undefined>(undefined);
  /** `dots` (default), `thumbnails` or `none`; falls back to the config. */
  readonly indicators = input<OgeCarouselIndicators | undefined>(undefined);
  /** Shows the previous / next buttons; falls back to the config, then `true`. */
  readonly showNavigation = input<boolean | undefined>(undefined);
  /** Wraps from the last slide to the first and back; falls back to the config, then `false`. */
  readonly loop = input<boolean | undefined>(undefined);
  /**
   * Rotates the slides automatically and renders the rotation control
   * (WCAG 2.2.2). Rotation always wraps to the first slide. Starts stopped
   * under `prefers-reduced-motion`.
   */
  readonly autoplay = input(false);
  /** Rotation interval in ms (min 1000); falls back to the config, then 5000. */
  readonly autoplayInterval = input<number | undefined>(undefined);
  /** Pauses the rotation while the pointer is over the carousel (default `true`). */
  readonly pauseOnHover = input(true);
  /** Lets touch, pen and mouse drags swipe between slides (default `true`). */
  readonly swipeEnabled = input(true);
  /** BCP 47 locale of the slide numbers; falls back to the config, then `LOCALE_ID`. */
  readonly locale = input<string | undefined>(undefined);
  /** Accessible name of the carousel; set it, and the host becomes a named region. */
  readonly ariaLabel = input<string | undefined>(undefined);

  /** The first visible slide changed — by a button, the picker, a swipe, autoplay or the API. */
  readonly slideChanged = output<OgeCarouselSlideChangedEvent>();
  /** The rotation was started or stopped by the user or the API. */
  readonly autoplayChanged = output<OgeCarouselAutoplayChangedEvent>();

  protected readonly slideTemplate = contentChild(OgeCarouselSlideTemplate, {
    descendants: false,
  });
  private readonly children = contentChildren(OgeCarouselSlide);
  private readonly track = viewChild<ElementRef<HTMLElement>>('track');

  private readonly uid = `oge-carousel-${nextCarouselId++}`;
  protected readonly trackId = `${this.uid}-track`;

  protected readonly msg = computed<OgeCarouselMessages>(
    () => this.config.messages,
  );
  private readonly resolvedLocale = computed(
    () => this.locale() ?? this.config.locale ?? this.appLocale,
  );

  protected readonly slides = computed<SlideDescriptor[]>(() => [
    ...this.children()
      .filter((child) => child.visible())
      .map((child) => ({
        id: child.autoId,
        template: child.contentTemplateRef() ?? null,
        item: null,
        label: child.label(),
        thumbnail: child.thumbnail(),
      })),
    ...this.items().map((item, i) => ({
      id: `i:${item.key ?? i}`,
      template: null,
      item,
      label: item.title ?? item.label,
      thumbnail: item.thumbnail ?? item.image,
    })),
  ]);
  protected readonly count = computed(() => this.slides().length);
  protected readonly perView = computed(() =>
    ogeCarouselPerView(this.slidesPerView(), this.count()),
  );
  protected readonly index = computed(() =>
    ogeCarouselClampIndex(this.selectedIndex(), this.count(), this.perView()),
  );
  private readonly resolvedLoop = computed(
    () => this.loop() ?? this.config.loop ?? false,
  );
  private readonly resolvedIndicators = computed<OgeCarouselIndicators>(
    () => this.indicators() ?? this.config.indicators ?? 'dots',
  );
  protected readonly thumbnails = computed(
    () => this.resolvedIndicators() === 'thumbnails',
  );
  protected readonly showNav = computed(
    () =>
      (this.showNavigation() ?? this.config.showNavigation ?? true) &&
      ogeCarouselPositions(this.count(), this.perView()) > 1,
  );
  protected readonly showPicker = computed(
    () =>
      this.resolvedIndicators() !== 'none' &&
      ogeCarouselPositions(this.count(), this.perView()) > 1,
  );
  protected readonly tabbed = computed(
    () => this.showPicker() && ogeCarouselPickerMode(this.perView()) === 'tabs',
  );
  protected readonly positionList = computed(() =>
    Array.from(
      { length: ogeCarouselPositions(this.count(), this.perView()) },
      (_, i) => i,
    ),
  );
  protected readonly canPrevious = computed(
    () =>
      ogeCarouselStep(
        this.index(),
        -1,
        this.count(),
        this.perView(),
        this.resolvedLoop(),
      ) !== null,
  );
  protected readonly canNext = computed(
    () =>
      ogeCarouselStep(
        this.index(),
        1,
        this.count(),
        this.perView(),
        this.resolvedLoop(),
      ) !== null,
  );
  protected readonly gapCss = computed(() => {
    const gap = this.gap() ?? (this.perView() > 1 ? 16 : 0);
    return typeof gap === 'number' ? `${gap}px` : gap;
  });
  protected readonly heightCss = computed(() => {
    const height = this.height();
    return typeof height === 'number' ? `${height}px` : (height ?? null);
  });

  /** The rotation control's state (user level — hover pauses do not flip it). */
  protected readonly playing = signal(false);
  protected readonly live = computed(() =>
    ogeCarouselLive(this.autoplay() && this.playing()),
  );

  private readonly timer = new OgeCarouselAutoplay({
    onTick: () => this.advance(),
    onChange: (playing) => this.playing.set(playing),
  });
  private rendered = false;
  private dragging = false;
  private pointerFocus = false;
  private firstScroll = true;
  private resize: ResizeObserver | null = null;
  private swipe: { cancel(): void } | null = null;

  constructor() {
    effect(() => {
      this.timer.setInterval(
        this.autoplayInterval() ?? this.config.autoplayInterval,
      );
    });
    effect(() => {
      const on = this.autoplay();
      untracked(() => {
        if (!this.rendered) return;
        if (on) this.startAutoplay();
        else this.timer.pause();
      });
    });
    afterRenderEffect(() => {
      const index = this.index();
      this.perView();
      this.slides();
      untracked(() => this.syncScroll(index));
    });
    afterNextRender(() => {
      this.rendered = true;
      if (this.autoplay()) this.startAutoplay();
      this.document.addEventListener('visibilitychange', this.onVisibility);
      const track = this.track()?.nativeElement;
      if (track && typeof ResizeObserver !== 'undefined') {
        this.resize = new ResizeObserver(() =>
          this.syncScroll(this.index(), true),
        );
        this.resize.observe(track);
      }
    });
    inject(DestroyRef).onDestroy(() => {
      this.timer.destroy();
      this.swipe?.cancel();
      this.resize?.disconnect();
      if (this.browser) {
        this.document.removeEventListener(
          'visibilitychange',
          this.onVisibility,
        );
      }
    });
  }

  /** Shows the next slide (wraps only with `loop`). */
  next(): void {
    this.step(1, 'next');
  }

  /** Shows the previous slide (wraps only with `loop`). */
  previous(): void {
    this.step(-1, 'previous');
  }

  /** Shows slide `index` (clamped). */
  goTo(index: number): void {
    this.commit(index, 'api');
  }

  /** Starts the rotation (only while `autoplay` is on). */
  play(): void {
    if (!this.autoplay() || this.timer.isPlaying()) return;
    this.timer.play();
    this.autoplayChanged.emit({ playing: true, source: 'api' });
  }

  /** Stops the rotation until the user or `play()` restarts it. */
  pause(): void {
    if (!this.timer.isPlaying()) return;
    this.timer.pause();
    this.autoplayChanged.emit({ playing: false, source: 'api' });
  }

  /** Focuses the selected picker entry, else the first control. */
  focus(): void {
    const host = this.host.nativeElement;
    const target =
      host.querySelector<HTMLElement>('.oge-carousel-picker [tabindex="0"]') ??
      host.querySelector<HTMLElement>('.oge-carousel-picker button') ??
      host.querySelector<HTMLElement>('button');
    target?.focus();
  }

  protected slideId(index: number): string {
    return `${this.uid}-slide-${index}`;
  }

  protected tabId(index: number): string {
    return `${this.uid}-tab-${index}`;
  }

  protected isVisible(slide: number): boolean {
    return ogeCarouselSlideVisible(slide, this.index(), this.perView());
  }

  protected slideLabel(index: number, slide: SlideDescriptor): string {
    return ogeCarouselSlideLabel(
      index,
      this.count(),
      this.msg(),
      slide.label,
      this.resolvedLocale(),
    );
  }

  protected pickerLabel(index: number): string {
    return ogeCarouselPickerLabel(index, this.msg(), this.resolvedLocale());
  }

  protected pickerClass(index: number): string {
    const base = this.thumbnails() ? 'oge-carousel-thumb' : 'oge-carousel-dot';
    return index === this.index() ? `${base} oge-carousel-current` : base;
  }

  protected thumbnailOf(slide: SlideDescriptor | undefined): string | null {
    return slide?.thumbnail ?? null;
  }

  protected slideContext(
    item: OgeCarouselItem,
    index: number,
  ): OgeCarouselSlideTemplateContext {
    return {
      $implicit: item,
      index,
      count: this.count(),
      active: this.isVisible(index),
    };
  }

  protected toggleAutoplay(): void {
    const playing = !this.timer.isPlaying();
    if (playing) this.timer.play();
    else this.timer.pause();
    this.autoplayChanged.emit({ playing, source: 'user' });
  }

  protected onNavClick(direction: 1 | -1): void {
    this.step(direction, direction > 0 ? 'next' : 'previous');
  }

  protected pick(index: number): void {
    this.commit(index, 'picker');
  }

  protected onPickerKeydown(event: KeyboardEvent, index: number): void {
    const intent = ogeCarouselPickerKey(
      event.key,
      ogeIsRtl(this.host.nativeElement),
    );
    if (!intent) return;
    event.preventDefault();
    const target = ogeCarouselPickerTarget(
      intent,
      index,
      ogeCarouselPositions(this.count(), this.perView()),
    );
    this.commit(target, 'picker');
    // automatic activation: focus follows the selection (APG tabs)
    this.host.nativeElement
      .querySelector<HTMLElement>(`#${this.tabId(target)}`)
      ?.focus();
  }

  protected onTrackPointerDown(event: PointerEvent): void {
    if (!this.swipeEnabled() || this.dragging) return;
    const track = this.track()?.nativeElement;
    if (!track) return;
    this.swipe = beginOgeCarouselSwipe(event, {
      track,
      index: this.index(),
      count: this.count(),
      perView: this.perView(),
      loop: this.resolvedLoop(),
      rtl: ogeIsRtl(this.host.nativeElement),
      onStart: () => {
        this.dragging = true;
        this.timer.hold('drag');
      },
      onFinish: (target, committed) => {
        this.dragging = false;
        this.swipe = null;
        this.timer.release('drag');
        if (committed) this.commit(target, 'swipe');
        // a short or cancelled drag snaps back to the current slide
        else this.syncScroll(this.index());
      },
    });
  }

  protected onPointerEnter(event: PointerEvent): void {
    if (event.pointerType === 'touch' || !this.pauseOnHover()) return;
    this.timer.hold('hover');
  }

  protected onPointerLeave(event: PointerEvent): void {
    if (event.pointerType === 'touch') return;
    this.timer.release('hover');
  }

  protected onHostPointerDown(): void {
    // a pointer press moves focus too; only *keyboard* focus stops rotation
    this.pointerFocus = true;
    setTimeout(() => (this.pointerFocus = false));
  }

  protected onFocusIn(event: FocusEvent): void {
    const from = event.relatedTarget as Node | null;
    if (from && this.host.nativeElement.contains(from)) return;
    if (this.pointerFocus || !this.timer.isPlaying()) return;
    // APG: keyboard focus entering the carousel stops the rotation for good
    this.timer.pause();
    this.autoplayChanged.emit({ playing: false, source: 'user' });
  }

  private startAutoplay(): void {
    if (prefersReducedMotion()) return;
    this.timer.play();
  }

  private readonly onVisibility = (): void => {
    if (this.document.visibilityState === 'hidden') this.timer.hold('hidden');
    else this.timer.release('hidden');
  };

  private advance(): void {
    // rotation always wraps, so a non-looping carousel rewinds to the start
    const next = ogeCarouselStep(
      this.index(),
      1,
      this.count(),
      this.perView(),
      true,
    );
    if (next !== null) this.commit(next, 'autoplay');
  }

  private step(direction: 1 | -1, source: OgeCarouselChangeSource): void {
    const next = ogeCarouselStep(
      this.index(),
      direction,
      this.count(),
      this.perView(),
      this.resolvedLoop(),
    );
    if (next !== null) this.commit(next, source);
  }

  private commit(index: number, source: OgeCarouselChangeSource): void {
    const next = ogeCarouselClampIndex(index, this.count(), this.perView());
    const previousIndex = this.index();
    if (next === previousIndex) {
      if (source === 'swipe') this.syncScroll(next);
      return;
    }
    this.selectedIndex.set(next);
    this.slideChanged.emit({ index: next, previousIndex, source });
    if (source !== 'autoplay') this.timer.restart();
  }

  private syncScroll(index: number, instant = false): void {
    if (this.dragging) return;
    const track = this.track()?.nativeElement;
    if (!track) return;
    const behavior: ScrollBehavior =
      instant || this.firstScroll ? 'auto' : motionScrollBehavior();
    this.firstScroll = false;
    ogeCarouselScrollTo(track, index, {
      perView: this.perView(),
      rtl: ogeIsRtl(this.host.nativeElement),
      behavior,
    });
  }
}
