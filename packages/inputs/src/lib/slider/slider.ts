import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  computed,
  input,
  model,
  viewChild,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { OgeSliderBase } from './slider-base';

/**
 * WAI-ARIA APG slider: one focusable `role="slider"` thumb on a track —
 * arrows move by `step` (RTL-aware), PageUp/PageDown by `largeStep`,
 * Home/End to the ends, dragging commits live (`[debounce]` throttles it)
 * and Escape cancels the gesture, restoring the start value:
 *
 * ```html
 * <oge-slider [(value)]="volume" [min]="0" [max]="100" />
 * ```
 *
 * Works standalone via `[(value)]`, with Signal Forms via `[formField]`, and
 * with reactive/template forms via `formControl`/`ngModel`. `showButtons`
 * adds Kendo-style increment/decrement buttons with press-and-hold repeat.
 */
@Component({
  selector: 'oge-slider',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-slider',
    '[class.oge-slider-invalid]': 'showError()',
  },
  template: `
    <div class="oge-slider-body">
      @if (showButtons()) {
      <button
        type="button"
        class="oge-slider-step-button"
        [attr.aria-label]="msg().sliderDecrement"
        [attr.title]="msg().sliderDecrement"
        [disabled]="effectiveDisabled()"
        tabindex="-1"
        (pointerdown)="onStepPointerDown(-1, $event)"
      >
        <svg
          viewBox="0 0 16 16"
          width="12"
          height="12"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <path d="M3 8h10" />
        </svg>
      </button>
      }
      <div
        #track
        class="oge-slider-track"
        (pointerdown)="onTrackPointerDown($event)"
      >
        <div class="oge-slider-rail"></div>
        @if (showRange()) {
        <div
          class="oge-slider-fill"
          [style.width.%]="orientation() === 'vertical' ? null : percent(value())"
          [style.height.%]="orientation() === 'vertical' ? percent(value()) : null"
        ></div>
        } @if (showTicks()) { @for (tick of ticks(); track tick) {
        <span
          class="oge-slider-tick"
          [class.oge-slider-tick-in-range]="tick <= value()"
          [style.inset-inline-start.%]="
            orientation() === 'vertical' ? null : percent(tick)
          "
          [style.inset-block-end.%]="
            orientation() === 'vertical' ? percent(tick) : null
          "
        ></span>
        @if (showTickLabels()) {
        <span
          class="oge-slider-tick-label"
          aria-hidden="true"
          [style.inset-inline-start.%]="
            orientation() === 'vertical' ? null : percent(tick)
          "
          [style.inset-block-end.%]="
            orientation() === 'vertical' ? percent(tick) : null
          "
          >{{ format(tick) }}</span
        >
        } } }
        <div
          #thumb
          class="oge-slider-thumb"
          role="slider"
          [attr.tabindex]="effectiveDisabled() ? -1 : tabIndex()"
          [attr.aria-valuemin]="minValue()"
          [attr.aria-valuemax]="maxValue()"
          [attr.aria-valuenow]="value()"
          [attr.aria-valuetext]="valueText(value())"
          [attr.aria-orientation]="
            orientation() === 'vertical' ? 'vertical' : null
          "
          [attr.aria-label]="ariaLabel() ?? msg().sliderHandle"
          [attr.aria-disabled]="effectiveDisabled() ? 'true' : null"
          [attr.aria-invalid]="showError() ? 'true' : null"
          [attr.aria-required]="required() ? 'true' : null"
          [attr.title]="tooltip() ?? null"
          [style.inset-inline-start.%]="
            orientation() === 'vertical' ? null : percent(value())
          "
          [style.inset-block-end.%]="
            orientation() === 'vertical' ? percent(value()) : null
          "
          (pointerdown)="onThumbPointerDown($event)"
          (keydown)="onThumbKeydown($event)"
          (focus)="handleFocus($event)"
          (blur)="handleBlur($event)"
          (pointerenter)="hovered.set(true)"
          (pointerleave)="hovered.set(false)"
        >
          @if (bubbleVisible()) {
          <output class="oge-slider-bubble" aria-hidden="true">{{
            format(value())
          }}</output>
          }
        </div>
      </div>
      @if (showButtons()) {
      <button
        type="button"
        class="oge-slider-step-button"
        [attr.aria-label]="msg().sliderIncrement"
        [attr.title]="msg().sliderIncrement"
        [disabled]="effectiveDisabled()"
        tabindex="-1"
        (pointerdown)="onStepPointerDown(1, $event)"
      >
        <svg
          viewBox="0 0 16 16"
          width="12"
          height="12"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <path d="M8 3v10M3 8h10" />
        </svg>
      </button>
      }
    </div>
    @if (showLabels()) {
    <div class="oge-slider-labels" aria-hidden="true">
      <span>{{ format(minValue()) }}</span>
      <span>{{ format(maxValue()) }}</span>
    </div>
    } @if (name()) {
    <!-- Plain-HTML form posts (the references' hidden-input contract). -->
    <input type="hidden" [name]="name()" [value]="value()" />
    }
  `,
  styleUrl: './slider.scss',
})
export class OgeSlider
  extends OgeSliderBase<number>
  implements FormValueControl<number>
{
  /** The slider value — two-way. */
  readonly value = model(0);
  /** Kendo-style increment/decrement buttons with press-and-hold repeat. */
  readonly showButtons = input(false);

  private readonly thumb = viewChild<ElementRef<HTMLElement>>('thumb');

  protected readonly bubbleVisible = computed(() => {
    const mode = this.valueIndicator();
    if (mode === 'always') return true;
    if (mode === 'active') {
      // Focus, drag OR hover — DevExtreme's `showMode: 'onHover'` and
      // Material's discrete indicator in one state.
      return this.dragging() || this.focusedSig() || this.hovered();
    }
    return false;
  });

  private repeatDelay: ReturnType<typeof setTimeout> | null = null;
  private repeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super();
    this.destroyRef.onDestroy(() => this.stopRepeat());
  }

  protected onThumbPointerDown(event: PointerEvent): void {
    this.beginDrag(event);
  }

  /** Clicking the track jumps to the position and starts dragging (APG). */
  protected onTrackPointerDown(event: PointerEvent): void {
    const thumbEl = this.thumb()?.nativeElement;
    if (thumbEl && thumbEl.contains(event.target as Node)) return;
    this.beginDrag(event);
  }

  private beginDrag(event: PointerEvent): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    this.thumb()?.nativeElement.focus({ preventScroll: true });
    const startValue = this.value();
    this.runDrag(
      event,
      (value, e) => {
        if (value !== this.value()) this.queueCommit(value, e);
      },
      () => {
        this.cancelCommit();
        this.commitNow(startValue, event);
      },
    );
  }

  protected onThumbKeydown(event: KeyboardEvent): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    const next = this.keyboardTarget(this.value(), event);
    if (next === null) return;
    event.preventDefault();
    // A keyboard step is a discrete action — it commits immediately, the
    // number box's spin precedent.
    this.commitNow(next, event);
  }

  /** One discrete step; the buttons repeat it while held (spin config). */
  protected onStepPointerDown(direction: 1 | -1, event: PointerEvent): void {
    if (this.effectiveDisabled() || this.readonly() || event.button !== 0) {
      return;
    }
    event.preventDefault();
    this.stepBy(direction, event);
    this.stopRepeat();
    this.repeatDelay = setTimeout(() => {
      this.repeatTimer = setInterval(
        () => this.stepBy(direction),
        this.config.spinRepeatIntervalMs,
      );
    }, this.config.spinRepeatDelayMs);
    const stop = (): void => this.stopRepeat();
    document.addEventListener('pointerup', stop, { once: true });
    document.addEventListener('pointercancel', stop, { once: true });
  }

  private stepBy(direction: 1 | -1, event?: Event): void {
    this.commitNow(this.snap(this.value() + direction * this.step()), event);
  }

  private stopRepeat(): void {
    if (this.repeatDelay !== null) {
      clearTimeout(this.repeatDelay);
      this.repeatDelay = null;
    }
    if (this.repeatTimer !== null) {
      clearInterval(this.repeatTimer);
      this.repeatTimer = null;
    }
  }

  protected nativeElement(): HTMLElement | null {
    return this.thumb()?.nativeElement ?? null;
  }

  protected emptyValue(): number {
    return this.minValue();
  }

  protected override normalizeWrite(value: unknown): number {
    const numeric =
      typeof value === 'number' && Number.isFinite(value)
        ? value
        : this.minValue();
    return this.snap(numeric);
  }
}
