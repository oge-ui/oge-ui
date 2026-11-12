import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  afterRenderEffect,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  OgeActionSheetCore,
  ogeFormatMessage,
  ogeOverlayMessage,
  ogeTourCardPosition,
  ogeTourClampStep,
  ogeTourKeyIntent,
  ogeTourResolveTarget,
  ogeTourReveal,
  ogeTourSpotlight,
  type OgeRect,
  type OgeTourCardPosition,
  type OgeTourCloseReason,
  type OgeTourClosedEvent,
  type OgeTourStep,
} from '@oge-ui/behavior';
import { OGE_OVERLAY_CONFIG, type OgeOverlayMessages } from '../config';

let nextTourId = 0;

/**
 * A guided tour — a sequence of cards that each point at a part of the page:
 *
 * ```html
 * <oge-tour #tour [steps]="steps" (closed)="saveSeen($event)" />
 * <button (click)="tour.start()">Take the tour</button>
 * ```
 *
 * Each step dims the page and cuts a spotlight around its target (a selector,
 * an element or a function), scrolls it into view and places the card beside
 * it, flipping to fit; a step without a target centers the card. The card is
 * a modal `role="dialog"` named by the step's title and described by its text,
 * with Back / Next (Done on the last step) and Skip. → / ← move between steps
 * (mirrored in RTL), Escape skips, and focus returns where it was. Under
 * `prefers-reduced-motion` the spotlight jumps instead of gliding and
 * scrolling is instant.
 */
@Component({
  selector: 'oge-tour',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'oge-tour-host' },
  styleUrl: './tour.scss',
  template: `
    @if (opened() && current(); as step) {
      <div
        #layer
        class="oge-tour-layer"
        [class.oge-tour-ready]="ready()"
        [class.oge-tour-no-target]="!spotlight()"
      >
        @if (spotlight(); as spot) {
          <div
            class="oge-tour-spotlight"
            aria-hidden="true"
            [style.top.px]="spot.top"
            [style.left.px]="spot.left"
            [style.width.px]="spot.width"
            [style.height.px]="spot.height"
          ></div>
        }
        <div
          #card
          class="oge-tour-card"
          role="dialog"
          aria-modal="true"
          tabindex="-1"
          (keydown)="onKeydown($event)"
          [attr.aria-roledescription]="roleLabel()"
          [attr.aria-labelledby]="titleId"
          [attr.aria-describedby]="step.content ? contentId : null"
          [attr.data-placement]="position()?.placement ?? 'center'"
          [style.top.px]="position()?.top ?? 0"
          [style.left.px]="position()?.left ?? 0"
        >
          <p class="oge-tour-progress">{{ progress() }}</p>
          <h2 class="oge-tour-title" [id]="titleId">{{ step.title }}</h2>
          @if (step.content) {
            <p class="oge-tour-content" [id]="contentId">{{ step.content }}</p>
          }
          <div class="oge-tour-footer">
            @if (showSkip() && !isLast()) {
              <button
                type="button"
                class="oge-tour-button oge-tour-skip"
                (click)="finish('skip')"
              >
                {{ text('tourSkip') }}
              </button>
            }
            <span class="oge-tour-spacer"></span>
            @if (index() > 0) {
              <button
                type="button"
                class="oge-tour-button oge-tour-previous"
                (click)="back()"
              >
                {{ text('tourPrevious') }}
              </button>
            }
            <button
              type="button"
              class="oge-tour-button oge-tour-next"
              data-oge-action-sheet-focus
              (click)="next()"
            >
              {{ isLast() ? text('tourDone') : text('tourNext') }}
            </button>
          </div>
        </div>
        <span class="oge-tour-status" role="status">{{ announcement() }}</span>
      </div>
    }
  `,
})
export class OgeTour {
  private readonly config = inject(OGE_OVERLAY_CONFIG);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The steps, in order. */
  readonly steps = input.required<readonly OgeTourStep[]>();
  /** Two-way open state. */
  readonly opened = model(false);
  /** Two-way index of the shown step (0-based, clamped to the steps). */
  readonly step = model(0);
  /** Escape skips the tour (default `true`). */
  readonly closeOnEscape = input(true);
  /** A press on the dimmed page skips the tour (default `false`). */
  readonly closeOnBackdropClick = input(false);
  /** Renders the Skip button (default `true`; never on the last step). */
  readonly showSkip = input(true);
  /** Per-instance message overrides. */
  readonly messages = input<Partial<OgeOverlayMessages>>();

  /** The tour closed: finished (`'done'`), skipped, dismissed or closed from code. */
  readonly closed = output<OgeTourClosedEvent>();

  private readonly layerEl = viewChild<ElementRef<HTMLElement>>('layer');
  private readonly cardEl = viewChild<ElementRef<HTMLElement>>('card');

  private readonly uid = `oge-tour-${nextTourId++}`;
  protected readonly titleId = `${this.uid}-title`;
  protected readonly contentId = `${this.uid}-content`;

  protected readonly index = computed(() =>
    ogeTourClampStep(this.step(), this.steps().length),
  );
  protected readonly current = computed<OgeTourStep | undefined>(
    () => this.steps()[this.index()],
  );
  protected readonly isLast = computed(
    () => this.index() >= this.steps().length - 1,
  );
  protected readonly spotlight = signal<OgeRect | null>(null);
  protected readonly position = signal<OgeTourCardPosition | null>(null);
  protected readonly ready = signal(false);

  private readonly mergedMessages = computed(() => ({
    ...this.config.messages,
    ...this.messages(),
  }));
  protected readonly roleLabel = computed(() => this.text('tourLabel'));
  protected readonly progress = computed(() =>
    ogeFormatMessage(this.text('tourStep'), {
      index: this.index() + 1,
      count: this.steps().length,
    }),
  );
  protected readonly announcement = computed(
    () => `${this.progress()}: ${this.current()?.title ?? ''}`,
  );

  private lastReason: OgeTourCloseReason = 'api';
  private frame = 0;

  private readonly core = new OgeActionSheetCore({
    layer: () => this.layerEl()?.nativeElement ?? null,
    sheet: () => this.cardEl()?.nativeElement ?? null,
    onDismiss: (reason) => {
      if (reason === 'escape' && this.closeOnEscape()) this.finish('escape');
      if (reason === 'backdrop' && this.closeOnBackdropClick())
        this.finish('backdrop');
    },
  });

  constructor() {
    let portaled: HTMLElement | null = null;
    let wasOpen = false;
    effect(() => {
      const open = this.opened() && !!this.current();
      untracked(() => {
        if (open) this.core.arm();
        else if (!wasOpen && this.core.isArmed()) this.core.deactivate();
      });
    });
    afterRenderEffect(() => {
      const layer = this.layerEl()?.nativeElement ?? null;
      untracked(() => {
        if (layer) {
          if (layer.parentElement !== layer.ownerDocument.body) {
            layer.ownerDocument.body.appendChild(layer);
          }
          portaled = layer;
          if (!wasOpen) {
            wasOpen = true;
            this.core.activate();
            requestAnimationFrame(() => this.ready.set(true));
          }
        } else if (wasOpen) {
          wasOpen = false;
          portaled = null;
          this.ready.set(false);
          this.spotlight.set(null);
          this.position.set(null);
          this.core.deactivate();
          const reason = this.lastReason;
          this.lastReason = 'api';
          this.closed.emit({ reason, step: this.index() });
        }
      });
    });
    // each step: bring the target into view, then measure
    afterRenderEffect(() => {
      const step = this.current();
      const layer = this.layerEl()?.nativeElement;
      if (!step || !layer) return;
      untracked(() => {
        ogeTourReveal(ogeTourResolveTarget(step.target, layer.ownerDocument));
        this.schedule();
      });
    });
    const win = this.host.nativeElement.ownerDocument.defaultView;
    const onViewportChange = () => {
      if (this.opened()) this.schedule();
    };
    win?.addEventListener('resize', onViewportChange);
    win?.addEventListener('scroll', onViewportChange, true);
    inject(DestroyRef).onDestroy(() => {
      win?.removeEventListener('resize', onViewportChange);
      win?.removeEventListener('scroll', onViewportChange, true);
      if (this.frame) cancelAnimationFrame(this.frame);
      this.core.destroy();
      portaled?.remove();
      portaled = null;
    });
  }

  /** Opens the tour at `step` (default the first). */
  start(step = 0): void {
    this.step.set(ogeTourClampStep(step, this.steps().length));
    this.lastReason = 'api';
    this.opened.set(true);
  }

  /** The next step; on the last one, finishes the tour (`'done'`). */
  next(): void {
    if (this.isLast()) this.finish('done');
    else this.step.set(this.index() + 1);
  }

  /** The previous step (no-op on the first). */
  previous(): void {
    if (this.index() > 0) this.step.set(this.index() - 1);
  }

  /** Closes the tour (reason `'api'`). */
  close(): void {
    this.finish('api');
  }

  /**
   * Back from the card: on the first step the Back button goes away, so focus
   * moves to Next instead of falling out of the dialog.
   */
  protected back(): void {
    this.previous();
    if (this.index() === 0) {
      this.cardEl()
        ?.nativeElement.querySelector<HTMLElement>('.oge-tour-next')
        ?.focus();
    }
  }

  protected text(key: keyof OgeOverlayMessages): string {
    return ogeOverlayMessage(this.mergedMessages(), key);
  }

  protected finish(reason: OgeTourCloseReason): void {
    if (!this.opened()) return;
    this.lastReason = reason;
    this.opened.set(false);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    // a button keeps ← / → for nothing; text fields inside a card keep them
    if (target?.closest('input, textarea, select, [contenteditable]')) return;
    const rtl = getComputedStyle(this.host.nativeElement).direction === 'rtl';
    const intent = ogeTourKeyIntent(event, rtl);
    if (!intent) return;
    event.preventDefault();
    if (intent === 'next') {
      if (!this.isLast()) this.next();
    } else {
      this.back();
    }
  }

  private schedule(): void {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.measure();
    });
  }

  private measure(): void {
    const step = this.current();
    const card = this.cardEl()?.nativeElement;
    if (!step || !card) return;
    const doc = card.ownerDocument;
    const win = doc.defaultView;
    const viewport = {
      width: win?.innerWidth ?? 0,
      height: win?.innerHeight ?? 0,
    };
    const target = ogeTourResolveTarget(step.target, doc);
    const spot = ogeTourSpotlight(
      target ? target.getBoundingClientRect() : null,
      step.padding ?? 6,
      viewport,
    );
    this.spotlight.set(spot);
    this.position.set(
      ogeTourCardPosition(
        spot,
        { width: card.offsetWidth, height: card.offsetHeight },
        viewport,
        step.placement ?? 'bottom',
        getComputedStyle(this.host.nativeElement).direction === 'rtl',
      ),
    );
  }
}
