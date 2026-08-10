import {
  Directive,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { snapToStep, valueToRatio } from '@oge-ui/core';
import { OgeControlBase } from '../field/control-base';
import type {
  OgeSliderDragStartedEvent,
  OgeSliderOrientation,
  OgeSliderSlideEndedEvent,
  OgeSliderValueIndicator,
} from './slider-types';

/** Hard cap on rendered ticks so a tiny `tickStep` cannot flood the DOM. */
const MAX_TICKS = 200;

/**
 * Shared machinery of `OgeSlider` and `OgeRangeSlider`: the scale inputs, the
 * pointer-gesture harness (document-level listeners, Escape-to-cancel, the
 * splitter precedent), the APG keyboard arithmetic and the render helpers.
 * The value shape — one number vs a `[start, end]` pair — stays with the
 * concrete components so their `FormValueControl` typing is honest.
 */
@Directive({
  host: {
    '[class.oge-slider-vertical]': "orientation() === 'vertical'",
    '[class.oge-slider-dragging]': 'dragging()',
    '[class.oge-slider-readonly]': 'readonly()',
    '[class.oge-slider-sm]': "size() === 'sm'",
    '[class.oge-slider-lg]': "size() === 'lg'",
  },
})
export abstract class OgeSliderBase<T> extends OgeControlBase<T> {
  protected readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);

  // `number | undefined` — the Signal Forms `FormUiControl` contract types a
  // `min`/`max` member as `InputSignal<NonNullable<TValue> | undefined>`, so
  // the single slider (TValue = number) can only carry the clause with this
  // shape (the number box precedent). Internal math uses minValue()/maxValue().
  readonly min = input<number | undefined>(0);
  readonly max = input<number | undefined>(100);
  protected readonly minValue = computed(() => this.min() ?? 0);
  protected readonly maxValue = computed(() => this.max() ?? 100);
  /** Arrow-key and drag increment; thumbs always sit on this grid. */
  readonly step = input(1);
  /** PageUp/PageDown increment; `undefined` → `step × 10`. */
  readonly largeStep = input<number | undefined>(undefined);
  readonly orientation = input<OgeSliderOrientation>('horizontal');
  /** Fills the selected portion of the track (DevExtreme `showRange`). */
  readonly showRange = input(true);
  readonly showTicks = input(false);
  /** Tick spacing; `undefined` → `largeStep` → `step`. */
  readonly tickStep = input<number | undefined>(undefined);
  /** Renders formatted `min`/`max` labels at the track ends. */
  readonly showLabels = input(false);
  /**
   * Formatted labels under each tick (Kendo's tick `title` callback, fed by
   * `formatValue`). Only meaningful with `showTicks`.
   */
  readonly showTickLabels = input(false);
  /** When the inline value bubble shows. */
  readonly valueIndicator = input<OgeSliderValueIndicator>('none');
  /**
   * Formats the bubble, the end labels **and** `aria-valuetext` — one input
   * where the references split display and announcement.
   */
  readonly formatValue = input<((value: number) => string) | undefined>(
    undefined,
  );
  /** Accessible name of the slider's handle(s); messages supply defaults. */
  readonly ariaLabel = input<string | undefined>(undefined);

  /** A drag gesture began. */
  readonly dragStarted = output<OgeSliderDragStartedEvent>();
  /** A drag gesture completed (not emitted on Escape-cancel). */
  readonly slideEnded = output<OgeSliderSlideEndedEvent<T>>();

  protected readonly trackEl =
    viewChild<ElementRef<HTMLElement>>('track');

  protected readonly dragging = signal(false);
  /** Pointer is over a thumb — the `'active'` indicator includes hover (dx). */
  protected readonly hovered = signal(false);

  private activeGestureCleanup: (() => void) | null = null;

  constructor() {
    super();
    this.destroyRef.onDestroy(() => this.activeGestureCleanup?.());
  }

  // --- arithmetic ------------------------------------------------------------

  protected resolvedLargeStep(): number {
    return this.largeStep() ?? this.step() * 10;
  }

  protected snap(value: number): number {
    return snapToStep(value, this.minValue(), this.maxValue(), this.step());
  }

  protected format(value: number): string {
    const fn = this.formatValue();
    return fn ? fn(value) : String(value);
  }

  /** `aria-valuetext` only exists when the number alone is not the meaning. */
  protected valueText(value: number): string | null {
    return this.formatValue() ? this.format(value) : null;
  }

  protected percent(value: number): number {
    return valueToRatio(value, this.minValue(), this.maxValue()) * 100;
  }

  protected readonly ticks = computed<readonly number[]>(() => {
    if (!this.showTicks()) return [];
    const spacing = this.tickStep() ?? this.largeStep() ?? this.step();
    const min = this.minValue();
    const max = this.maxValue();
    if (spacing <= 0 || max <= min) return [];
    const count = Math.floor((max - min) / spacing);
    const list: number[] = [];
    for (let i = 0; i <= count && list.length < MAX_TICKS; i++) {
      list.push(snapToStep(min + i * spacing, min, max, spacing));
    }
    if (list[list.length - 1] !== max && list.length < MAX_TICKS) {
      list.push(max); // the far end always gets a stop
    }
    return list;
  });

  // --- pointer machinery -----------------------------------------------------

  protected isRtl(): boolean {
    return (
      getComputedStyle(this.hostEl.nativeElement).direction === 'rtl'
    );
  }

  /**
   * Projects a pointer position onto the value scale against a rect captured
   * at gesture start — never measured per move (the splitter rule: layout
   * reads belong at the gesture boundary, not in the hot path).
   */
  protected valueAtPointer(event: PointerEvent, rect: DOMRect): number {
    let ratio: number;
    if (this.orientation() === 'vertical') {
      ratio = rect.height > 0 ? (rect.bottom - event.clientY) / rect.height : 0;
    } else {
      ratio = rect.width > 0 ? (event.clientX - rect.left) / rect.width : 0;
      if (this.isRtl()) ratio = 1 - ratio;
    }
    const min = this.minValue();
    return this.snap(min + Math.min(Math.max(ratio, 0), 1) * (this.maxValue() - min));
  }

  /**
   * Runs a drag: `apply` per move, live-committed by the subclass through
   * `queueCommit` (so `[debounce]` throttles it); release flushes and emits
   * `slideEnded`; Escape restores the start value and emits nothing.
   */
  protected runDrag(
    event: PointerEvent,
    apply: (value: number, event: PointerEvent) => void,
    restore: () => void,
  ): void {
    if (this.effectiveDisabled() || this.readonly() || event.button !== 0) {
      return;
    }
    const track = this.trackEl()?.nativeElement;
    if (!track) return;
    event.preventDefault();
    const rect = track.getBoundingClientRect();
    this.dragging.set(true);
    this.dragStarted.emit({ event });

    const target = event.target as HTMLElement | null;
    if (target && typeof target.setPointerCapture === 'function') {
      try {
        target.setPointerCapture(event.pointerId);
      } catch {
        /* jsdom / detached elements — capture is a progressive enhancement */
      }
    }

    apply(this.valueAtPointer(event, rect), event);

    const move = (e: PointerEvent): void => {
      apply(this.valueAtPointer(e, rect), e);
    };
    const finish = (e: PointerEvent, cancelled: boolean): void => {
      cleanup();
      this.dragging.set(false);
      if (cancelled) {
        restore();
        return;
      }
      this.flushCommit();
      this.slideEnded.emit({ value: this.value(), event: e });
    };
    const onMove = (e: PointerEvent): void => move(e);
    const onUp = (e: PointerEvent): void => finish(e, false);
    const onCancel = (e: PointerEvent): void => finish(e, true);
    const onKeydown = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      finish(event, true);
    };
    const onWindowBlur = (): void => finish(event, true);
    const cleanup = (): void => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onCancel);
      document.removeEventListener('keydown', onKeydown, true);
      window.removeEventListener('blur', onWindowBlur);
      this.activeGestureCleanup = null;
    };
    // Document-level listeners: pointer capture is not guaranteed, and
    // alt-tab / releases outside the document never deliver a pointerup.
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onCancel);
    document.addEventListener('keydown', onKeydown, true);
    window.addEventListener('blur', onWindowBlur);
    this.activeGestureCleanup = cleanup;
  }

  // --- keyboard --------------------------------------------------------------

  /**
   * The APG keyboard map: arrows ±step (RTL-aware on the horizontal axis),
   * PageUp/PageDown ±largeStep, Home/End to the ends. Returns the next value
   * for `current`, or `null` when the key is not part of the pattern.
   */
  protected keyboardTarget(current: number, event: KeyboardEvent): number | null {
    const key = event.key;
    if (key === 'Home') return this.minValue();
    if (key === 'End') return this.maxValue();
    const large = this.resolvedLargeStep();
    if (key === 'PageUp') return this.snap(current + large);
    if (key === 'PageDown') return this.snap(current - large);
    const vertical = this.orientation() === 'vertical';
    const rtl = !vertical && this.isRtl();
    let direction = 0;
    if (key === 'ArrowUp') direction = 1;
    else if (key === 'ArrowDown') direction = -1;
    else if (key === 'ArrowRight') direction = rtl ? -1 : 1;
    else if (key === 'ArrowLeft') direction = rtl ? 1 : -1;
    if (direction === 0) return null;
    return this.snap(current + direction * this.step());
  }

  // --- subclass contract defaults --------------------------------------------

  protected valueIsEmpty(_value: T): boolean {
    return false; // a slider always has a value — "empty" does not exist
  }
}
