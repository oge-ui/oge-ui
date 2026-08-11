import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ratioToValue, valueToRatio } from '@oge-ui/core';

/** A 1D value change from the hue/alpha slider. */
export interface OgeColorSliderChange {
  value: number;
  event: Event;
}

/**
 * Internal 1D slider of the color panel — the hue ring (0–360°) or the alpha
 * ramp (0–100%) as an APG `role="slider"`, deliberately NOT `OgeSliderBase`:
 * that base drags the whole CVA/commit machinery of a form control, and a
 * panel part is not a form control. The pointer-gesture and keyboard idioms
 * are the slider's, copied per the house "copy the Angular-shaped idioms"
 * rule; the arithmetic is core's `slider-math`.
 */
@Component({
  selector: 'oge-color-slider',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-color-slider',
    '[class.oge-color-slider-alpha]': "kind() === 'alpha'",
    '[class.oge-color-slider-dragging]': 'dragging()',
    '(pointerdown)': 'onPointerDown($event)',
  },
  template: `
    <div #track class="oge-color-slider-track">
      <div
        #thumb
        class="oge-color-slider-thumb"
        role="slider"
        tabindex="0"
        [attr.aria-label]="label()"
        [attr.aria-valuemin]="0"
        [attr.aria-valuemax]="max()"
        [attr.aria-valuenow]="value()"
        [attr.aria-valuetext]="valueText()"
        [attr.aria-orientation]="'horizontal'"
        [style.inset-inline-start.%]="percent()"
        (keydown)="onKeydown($event)"
      ></div>
    </div>
  `,
})
export class OgeColorSlider {
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly kind = input.required<'hue' | 'alpha'>();
  /** Current value — hue degrees (0–360) or alpha percent (0–100). */
  readonly value = input.required<number>();
  /** Arrow-key increment in value units; PageUp/PageDown move by 5×. */
  readonly keyStep = input.required<number>();
  /** Accessible name of the slider thumb. */
  readonly label = input.required<string>();
  /** `aria-valuetext` — the number alone is not the meaning. */
  readonly valueText = input.required<string>();

  readonly changed = output<OgeColorSliderChange>();
  /** A pointer gesture completed (not emitted on Escape-cancel). */
  readonly released = output<Event>();

  private readonly trackEl = viewChild<ElementRef<HTMLElement>>('track');
  private readonly thumbEl = viewChild<ElementRef<HTMLElement>>('thumb');

  protected readonly dragging = signal(false);
  private activeGestureCleanup: (() => void) | null = null;

  protected readonly max = computed(() => (this.kind() === 'hue' ? 360 : 100));
  protected readonly percent = computed(
    () => valueToRatio(this.value(), 0, this.max()) * 100,
  );

  constructor() {
    this.destroyRef.onDestroy(() => this.activeGestureCleanup?.());
  }

  private isRtl(): boolean {
    return getComputedStyle(this.hostEl.nativeElement).direction === 'rtl';
  }

  private valueAtPointer(event: PointerEvent, rect: DOMRect): number {
    let ratio = rect.width > 0 ? (event.clientX - rect.left) / rect.width : 0;
    if (this.isRtl()) ratio = 1 - ratio;
    return ratioToValue(ratio, 0, this.max(), 1);
  }

  protected onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    const track = this.trackEl()?.nativeElement;
    if (!track) return;
    event.preventDefault();
    this.thumbEl()?.nativeElement.focus();
    const rect = track.getBoundingClientRect();
    const startValue = this.value();
    this.dragging.set(true);

    const target = event.target as HTMLElement | null;
    if (target && typeof target.setPointerCapture === 'function') {
      try {
        target.setPointerCapture(event.pointerId);
      } catch {
        /* jsdom / detached elements — capture is a progressive enhancement */
      }
    }

    this.changed.emit({ value: this.valueAtPointer(event, rect), event });

    const onMove = (e: PointerEvent): void => {
      this.changed.emit({ value: this.valueAtPointer(e, rect), event: e });
    };
    const finish = (e: Event, cancelled: boolean): void => {
      cleanup();
      this.dragging.set(false);
      if (cancelled) {
        this.changed.emit({ value: startValue, event: e });
        return;
      }
      this.released.emit(e);
    };
    const onUp = (e: PointerEvent): void => finish(e, false);
    const onCancel = (e: PointerEvent): void => finish(e, true);
    const onKeydown = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      finish(e, true);
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
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onCancel);
    document.addEventListener('keydown', onKeydown, true);
    window.addEventListener('blur', onWindowBlur);
    this.activeGestureCleanup = cleanup;
  }

  protected onKeydown(event: KeyboardEvent): void {
    const next = this.keyboardTarget(this.value(), event);
    if (next === null) return;
    event.preventDefault();
    if (next !== this.value()) this.changed.emit({ value: next, event });
  }

  private keyboardTarget(current: number, event: KeyboardEvent): number | null {
    const key = event.key;
    if (key === 'Home') return 0;
    if (key === 'End') return this.max();
    const step = this.keyStep();
    if (key === 'PageUp') return this.snap(current + step * 5);
    if (key === 'PageDown') return this.snap(current - step * 5);
    const rtl = this.isRtl();
    let direction = 0;
    if (key === 'ArrowUp') direction = 1;
    else if (key === 'ArrowDown') direction = -1;
    else if (key === 'ArrowRight') direction = rtl ? -1 : 1;
    else if (key === 'ArrowLeft') direction = rtl ? 1 : -1;
    if (direction === 0) return null;
    return this.snap(current + direction * step);
  }

  private snap(value: number): number {
    return Math.min(Math.max(Math.round(value), 0), this.max());
  }
}
