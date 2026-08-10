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
import { constrainRangeValue, type OgeRangeThumb } from '@oge-ui/core';
import { OgeSliderBase } from './slider-base';

type RangePair = readonly [number, number];

/**
 * WAI-ARIA APG multi-thumb slider: two focusable `role="slider"` thumbs
 * selecting a `[start, end]` pair. Each thumb's `aria-valuemin`/`aria-valuemax`
 * is dynamically constrained by the other thumb's current value — the APG
 * multi-thumb rule — and `minRange` keeps a minimum gap between them:
 *
 * ```html
 * <oge-range-slider [(value)]="priceRange" [min]="0" [max]="1000" [minRange]="50" />
 * ```
 *
 * Clicking the track moves the nearest thumb; the tab order of the thumbs
 * never changes with their values (APG). Escape cancels a drag.
 */
@Component({
  selector: 'oge-range-slider',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-slider oge-range-slider',
    '[class.oge-slider-invalid]': 'showError()',
  },
  template: `
    <div class="oge-slider-body">
      <div
        #track
        class="oge-slider-track"
        (pointerdown)="onTrackPointerDown($event)"
      >
        <div class="oge-slider-rail"></div>
        @if (showRange()) {
        <div
          class="oge-slider-fill"
          [style.inset-inline-start.%]="
            orientation() === 'vertical' ? null : percent(value()[0])
          "
          [style.width.%]="
            orientation() === 'vertical'
              ? null
              : percent(value()[1]) - percent(value()[0])
          "
          [style.inset-block-end.%]="
            orientation() === 'vertical' ? percent(value()[0]) : null
          "
          [style.height.%]="
            orientation() === 'vertical'
              ? percent(value()[1]) - percent(value()[0])
              : null
          "
        ></div>
        } @if (showTicks()) { @for (tick of ticks(); track tick) {
        <span
          class="oge-slider-tick"
          [class.oge-slider-tick-in-range]="
            tick >= value()[0] && tick <= value()[1]
          "
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
          #startThumb
          class="oge-slider-thumb"
          role="slider"
          [attr.tabindex]="effectiveDisabled() ? -1 : tabIndex()"
          [attr.aria-valuemin]="minValue()"
          [attr.aria-valuemax]="value()[1] - minRange()"
          [attr.aria-valuenow]="value()[0]"
          [attr.aria-valuetext]="valueText(value()[0])"
          [attr.aria-orientation]="
            orientation() === 'vertical' ? 'vertical' : null
          "
          [attr.aria-label]="startLabel()"
          [attr.aria-disabled]="effectiveDisabled() ? 'true' : null"
          [attr.aria-invalid]="showError() ? 'true' : null"
          [attr.title]="tooltip() ?? null"
          [style.inset-inline-start.%]="
            orientation() === 'vertical' ? null : percent(value()[0])
          "
          [style.inset-block-end.%]="
            orientation() === 'vertical' ? percent(value()[0]) : null
          "
          (pointerdown)="onThumbPointerDown('start', $event)"
          (keydown)="onThumbKeydown('start', $event)"
          (focus)="handleFocus($event)"
          (blur)="handleBlur($event)"
          (pointerenter)="hovered.set(true)"
          (pointerleave)="hovered.set(false)"
        >
          @if (bubbleVisible()) {
          <output class="oge-slider-bubble" aria-hidden="true">{{
            format(value()[0])
          }}</output>
          }
        </div>
        <div
          #endThumb
          class="oge-slider-thumb"
          role="slider"
          [attr.tabindex]="effectiveDisabled() ? -1 : tabIndex()"
          [attr.aria-valuemin]="value()[0] + minRange()"
          [attr.aria-valuemax]="maxValue()"
          [attr.aria-valuenow]="value()[1]"
          [attr.aria-valuetext]="valueText(value()[1])"
          [attr.aria-orientation]="
            orientation() === 'vertical' ? 'vertical' : null
          "
          [attr.aria-label]="endLabel()"
          [attr.aria-disabled]="effectiveDisabled() ? 'true' : null"
          [attr.aria-invalid]="showError() ? 'true' : null"
          [attr.title]="tooltip() ?? null"
          [style.inset-inline-start.%]="
            orientation() === 'vertical' ? null : percent(value()[1])
          "
          [style.inset-block-end.%]="
            orientation() === 'vertical' ? percent(value()[1]) : null
          "
          (pointerdown)="onThumbPointerDown('end', $event)"
          (keydown)="onThumbKeydown('end', $event)"
          (focus)="handleFocus($event)"
          (blur)="handleBlur($event)"
          (pointerenter)="hovered.set(true)"
          (pointerleave)="hovered.set(false)"
        >
          @if (bubbleVisible()) {
          <output class="oge-slider-bubble" aria-hidden="true">{{
            format(value()[1])
          }}</output>
          }
        </div>
      </div>
    </div>
    @if (showLabels()) {
    <div class="oge-slider-labels" aria-hidden="true">
      <span>{{ format(minValue()) }}</span>
      <span>{{ format(maxValue()) }}</span>
    </div>
    } @if (startName()) {
    <!-- Plain-HTML form posts — dx's startName/endName contract. -->
    <input type="hidden" [name]="startName()" [value]="value()[0]" />
    } @if (endName()) {
    <input type="hidden" [name]="endName()" [value]="value()[1]" />
    }
  `,
  styleUrl: './slider.scss',
})
// Deliberately NOT `implements FormValueControl<RangePair>`: the Signal Forms
// contract types the optional `min`/`max` members as
// `InputSignal<NonNullable<TValue> | undefined>`, which for a tuple TValue
// would demand tuple-typed bounds — nonsense for a numeric scale. The runtime
// `[formField]` binding works regardless (it matches members by name), and
// CVA/`[(value)]` are unaffected; only the compile-time clause is omitted.
export class OgeRangeSlider extends OgeSliderBase<RangePair> {
  /** The `[start, end]` pair — two-way. */
  readonly value = model<RangePair>([0, 0]);
  /** Minimum distance kept between the thumbs (PrimeNG's steps-between). */
  readonly minRange = input(0);
  /** Accessible name of the start thumb; messages supply the default. */
  readonly startAriaLabel = input<string | undefined>(undefined);
  /** Accessible name of the end thumb; messages supply the default. */
  readonly endAriaLabel = input<string | undefined>(undefined);
  /** Hidden-input names for plain form posts (dx `startName`/`endName`). */
  readonly startName = input('');
  readonly endName = input('');

  private readonly startThumb =
    viewChild<ElementRef<HTMLElement>>('startThumb');
  private readonly endThumb = viewChild<ElementRef<HTMLElement>>('endThumb');

  protected readonly startLabel = computed(
    () => this.startAriaLabel() ?? this.msg().sliderStartHandle,
  );
  protected readonly endLabel = computed(
    () => this.endAriaLabel() ?? this.msg().sliderEndHandle,
  );
  protected readonly bubbleVisible = computed(() => {
    const mode = this.valueIndicator();
    if (mode === 'always') return true;
    if (mode === 'active') {
      // Focus, drag OR hover — DevExtreme's `showMode: 'onHover'`.
      return this.dragging() || this.focusedSig() || this.hovered();
    }
    return false;
  });

  protected onThumbPointerDown(thumb: OgeRangeThumb, event: PointerEvent): void {
    this.beginDrag(thumb, event);
  }

  /** Clicking the track moves the NEAREST thumb and starts dragging it. */
  protected onTrackPointerDown(event: PointerEvent): void {
    if (this.isThumbTarget(event.target)) return;
    if (this.effectiveDisabled() || this.readonly()) return;
    const track = this.trackEl()?.nativeElement;
    if (!track) return;
    const target = this.valueAtPointer(event, track.getBoundingClientRect());
    const [start, end] = this.value();
    const thumb: OgeRangeThumb =
      Math.abs(target - start) < Math.abs(target - end) ||
      (Math.abs(target - start) === Math.abs(target - end) && target < start)
        ? 'start'
        : 'end';
    this.beginDrag(thumb, event);
  }

  private isThumbTarget(target: EventTarget | null): boolean {
    const node = target as Node | null;
    return (
      !!node &&
      ((this.startThumb()?.nativeElement.contains(node) ?? false) ||
        (this.endThumb()?.nativeElement.contains(node) ?? false))
    );
  }

  private beginDrag(thumb: OgeRangeThumb, event: PointerEvent): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    const el =
      thumb === 'start'
        ? this.startThumb()?.nativeElement
        : this.endThumb()?.nativeElement;
    el?.focus({ preventScroll: true });
    const startPair = this.value();
    this.runDrag(
      event,
      (value, e) => this.applyThumb(thumb, value, e),
      () => {
        this.cancelCommit();
        this.commitPair(startPair, event);
      },
    );
  }

  protected onThumbKeydown(thumb: OgeRangeThumb, event: KeyboardEvent): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    const current = thumb === 'start' ? this.value()[0] : this.value()[1];
    const next = this.keyboardTarget(current, event);
    if (next === null) return;
    event.preventDefault();
    this.applyThumb(thumb, next, event, true);
  }

  /** Constrains against the sibling (APG multi-thumb) and commits. */
  private applyThumb(
    thumb: OgeRangeThumb,
    value: number,
    event: Event,
    discrete = false,
  ): void {
    const [start, end] = this.value();
    const sibling = thumb === 'start' ? end : start;
    const constrained = constrainRangeValue(
      value,
      sibling,
      thumb,
      this.minRange(),
    );
    const pair: RangePair =
      thumb === 'start' ? [constrained, end] : [start, constrained];
    if (pair[0] === start && pair[1] === end) return; // tuples are re-created —
    // an unchanged pair must not re-emit valueCommitted
    if (discrete) this.commitPair(pair, event);
    else this.queueCommit(pair, event);
  }

  private commitPair(pair: RangePair, event?: Event): void {
    const [start, end] = this.value();
    if (pair[0] === start && pair[1] === end) return;
    this.commitNow(pair, event);
  }

  protected nativeElement(): HTMLElement | null {
    return this.startThumb()?.nativeElement ?? null;
  }

  protected emptyValue(): RangePair {
    return [this.minValue(), this.minValue()];
  }

  protected override normalizeWrite(value: unknown): RangePair {
    const raw = Array.isArray(value) ? value : [];
    const a =
      typeof raw[0] === 'number' && Number.isFinite(raw[0])
        ? this.snap(raw[0])
        : this.minValue();
    const b =
      typeof raw[1] === 'number' && Number.isFinite(raw[1])
        ? this.snap(raw[1])
        : this.minValue();
    return a <= b ? [a, b] : [b, a];
  }
}
