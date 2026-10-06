import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  LOCALE_ID,
  TemplateRef,
  ViewEncapsulation,
  computed,
  contentChild,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import {
  OGE_RATING_ICON_PATHS,
  normalizeRatingMax,
  normalizeRatingPrecision,
  ogeIsRtl,
  ratingItemStates,
  ratingKeyboardTarget,
  ratingPointerRatio,
  ratingPressValue,
  ratingRadioKeyTarget,
  ratingValueFromPointer,
  ratingValueText,
  resolveRatingSemantics,
  snapRatingValue,
  type OgeRatingIcon,
  type OgeRatingItemState,
  type OgeRatingSelection,
  type OgeRatingSemantics,
} from '@oge-ui/behavior';
import { OgeControlBase } from '@oge-ui/inputs/field';

/** Context of a rating's item template — rendered once per layer (empty / filled). */
export interface OgeRatingItemTemplateContext {
  /** The item's fill state. */
  $implicit: OgeRatingItemState;
  /** `true` while rendering the filled (clipped) layer, `false` for the empty one. */
  filled: boolean;
  /** `true` while a pointer previews a value (hover). */
  hovered: boolean;
}

/** The hover preview changed (`value: null` once the pointer leaves). */
export interface OgeRatingHoverEvent {
  value: number | null;
  event: Event;
}

/**
 * Custom rating glyph — any markup per item. Rendered twice per item: the
 * empty layer (`filled: false`) and the filled layer (`filled: true`) clipped
 * to the item's fill, so half and fractional values work with any icon.
 *
 * ```html
 * <oge-rating [(value)]="mood">
 *   <ng-template ogeRatingItemTemplate let-item let-filled="filled">
 *     <span class="mood">{{ filled ? '●' : '○' }}</span>
 *   </ng-template>
 * </oge-rating>
 * ```
 */
@Directive({ selector: '[ogeRatingItemTemplate]' })
export class OgeRatingItemTemplate {
  readonly template = inject(TemplateRef<OgeRatingItemTemplateContext>);

  static ngTemplateContextGuard(
    _dir: OgeRatingItemTemplate,
    _ctx: unknown,
  ): _ctx is OgeRatingItemTemplateContext {
    return true;
  }
}

/**
 * Star rating — a value between `0` (no rating, committed as `null`) and
 * `max`, in steps of `precision` (`0.5` for half stars):
 *
 * ```html
 * <oge-rating label="Your rating" [(value)]="stars" />
 * <oge-rating [precision]="0.5" [max]="10" icon="heart" [(value)]="score" />
 * <oge-rating [value]="4.3" [precision]="0.1" [readonly]="true" />
 * ```
 *
 * An APG **slider** by default (arrows step by `precision`, PageUp/PageDown
 * by one item, Home/End, Delete/Backspace and `0` clear, digits jump; the
 * horizontal arrows follow the reading direction, so RTL mirrors them).
 * `semantics="radiogroup"` renders one radio per item instead (whole-item
 * precision only). A press on the current value clears it while
 * `allowClear` is on; the pointer previews the value it would pick.
 * Works standalone via `[(value)]`, with Signal Forms via `[formField]`,
 * and with reactive/template forms via `formControl`/`ngModel`.
 */
@Component({
  selector: 'oge-rating',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet],
  host: {
    class: 'oge-rating',
    '[class.oge-rating-readonly]': 'readonly()',
    '[class.oge-rating-invalid]': 'showError()',
    '[class.oge-rating-hovering]': 'hoverValue() !== null',
    '[class.oge-rating-sm]': "size() === 'sm'",
    '[class.oge-rating-lg]': "size() === 'lg'",
    '[class.oge-rating-single]': "selection() === 'single'",
  },
  template: `
    <ng-template #glyph let-state let-filled="filled">
      @if (itemTemplateRef(); as template) {
        <ng-container
          *ngTemplateOutlet="
            template;
            context: {
              $implicit: state,
              filled: filled,
              hovered: hoverValue() !== null,
            }
          "
        />
      } @else {
        <svg
          class="oge-rating-svg"
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path [attr.d]="iconPath()" />
        </svg>
      }
    </ng-template>

    @if (resolvedSemantics() === 'slider') {
      <div
        class="oge-rating-items"
        role="slider"
        [id]="inputId"
        [tabindex]="effectiveDisabled() ? -1 : tabIndex()"
        [attr.aria-label]="label() || msg().ratingLabel"
        [attr.aria-valuemin]="allowClear() ? 0 : step()"
        [attr.aria-valuemax]="resolvedMax()"
        [attr.aria-valuenow]="snappedValue() ?? 0"
        [attr.aria-valuetext]="valueText()"
        [attr.aria-readonly]="readonly() ? 'true' : null"
        [attr.aria-disabled]="effectiveDisabled() ? 'true' : null"
        [attr.aria-invalid]="showError() ? 'true' : null"
        [attr.aria-required]="required() ? 'true' : null"
        [attr.title]="tooltip() ?? null"
        (keydown)="onSliderKeydown($event)"
        (pointermove)="onPointerMove($event)"
        (pointerleave)="onPointerLeave($event)"
        (click)="onItemsClick($event)"
        (focus)="handleFocus($event)"
        (blur)="handleBlur($event)"
      >
        @for (state of states(); track state.index) {
          <span
            class="oge-rating-item"
            [class.oge-rating-item-full]="state.full"
            [class.oge-rating-item-partial]="state.partial"
            [attr.data-index]="state.index"
            aria-hidden="true"
          >
            <span class="oge-rating-layer oge-rating-empty">
              <ng-container
                *ngTemplateOutlet="
                  glyph;
                  context: { $implicit: state, filled: false }
                "
              />
            </span>
            <span class="oge-rating-fill" [style.width.%]="state.fill * 100">
              <span class="oge-rating-layer oge-rating-filled">
                <ng-container
                  *ngTemplateOutlet="
                    glyph;
                    context: { $implicit: state, filled: true }
                  "
                />
              </span>
            </span>
          </span>
        }
      </div>
    } @else {
      <div
        class="oge-rating-items"
        role="radiogroup"
        [id]="inputId"
        [attr.aria-label]="label() || msg().ratingLabel"
        [attr.aria-readonly]="readonly() ? 'true' : null"
        [attr.aria-disabled]="effectiveDisabled() ? 'true' : null"
        [attr.aria-invalid]="showError() ? 'true' : null"
        [attr.aria-required]="required() ? 'true' : null"
        [attr.title]="tooltip() ?? null"
        (pointermove)="onPointerMove($event)"
        (pointerleave)="onPointerLeave($event)"
        (focusin)="onGroupFocusIn($event)"
        (focusout)="onGroupFocusOut($event)"
      >
        @for (state of states(); track state.index) {
          <span
            class="oge-rating-item"
            role="radio"
            [class.oge-rating-item-full]="state.full"
            [attr.data-index]="state.index"
            [tabindex]="radioTabIndex(state.index)"
            [attr.aria-checked]="isChecked(state.index)"
            [attr.aria-label]="radioLabel(state.itemValue)"
            [attr.aria-disabled]="effectiveDisabled() ? 'true' : null"
            (click)="onRadioClick(state.index, $event)"
            (keydown)="onRadioKeydown($event)"
          >
            <span class="oge-rating-layer oge-rating-empty" aria-hidden="true">
              <ng-container
                *ngTemplateOutlet="
                  glyph;
                  context: { $implicit: state, filled: false }
                "
              />
            </span>
            <span
              class="oge-rating-fill"
              aria-hidden="true"
              [style.width.%]="state.fill * 100"
            >
              <span class="oge-rating-layer oge-rating-filled">
                <ng-container
                  *ngTemplateOutlet="
                    glyph;
                    context: { $implicit: state, filled: true }
                  "
                />
              </span>
            </span>
          </span>
        }
      </div>
    }
  `,
  styleUrl: './rating.scss',
})
export class OgeRating
  extends OgeControlBase<number | null>
  implements FormValueControl<number | null>
{
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly localeId = inject(LOCALE_ID);

  /** The rating, `null` = not rated — two-way. Snapped to `precision`. */
  readonly value = model<number | null>(null);
  /**
   * Number of items (stars). Typed `number | undefined` for the Signal Forms
   * `FormValueControl` contract (`[formField]` writes a schema `max()` here);
   * `undefined` means 5.
   */
  readonly max = input<number | undefined>(5);
  /** Value step: `1` whole items, `0.5` halves, `0.1` tenths (≥ 0.01). */
  readonly precision = input(1);
  /** A press on the current value — or Delete/Backspace/`0` — clears it. */
  readonly allowClear = input(true);
  /** The built-in glyph; an item template replaces it. */
  readonly icon = input<OgeRatingIcon>('star');
  /** Paint every item up to the value (`continuous`) or only its holder (`single`). */
  readonly selection = input<OgeRatingSelection>('continuous');
  /** APG `slider` (default, any precision) or `radiogroup` (whole items). */
  readonly semantics = input<OgeRatingSemantics>('slider');
  /** Previews the value under the pointer before it is pressed. */
  readonly hoverPreview = input(true);
  /** Accessible name; `''` = the `ratingLabel` message. */
  readonly label = input('');
  /** Overrides the locale of the spoken value (`LOCALE_ID` / config otherwise). */
  readonly locale = input<string | undefined>(undefined);
  /** Custom glyph per item — the `[ogeRatingItemTemplate]` slot as an input. */
  readonly itemTemplate = input<
    TemplateRef<OgeRatingItemTemplateContext> | undefined
  >(undefined);

  /** The pointer previews another value (`null` when it leaves). */
  readonly hoverChanged = output<OgeRatingHoverEvent>();

  private readonly projectedItemTemplate = contentChild(OgeRatingItemTemplate);
  /** The value the pointer currently previews, `null` when none. */
  protected readonly hoverValue = signal<number | null>(null);

  protected readonly itemTemplateRef = computed(
    () => this.itemTemplate() ?? this.projectedItemTemplate()?.template,
  );
  protected readonly resolvedMax = computed(() =>
    normalizeRatingMax(this.max() ?? 5),
  );
  protected readonly step = computed(() =>
    normalizeRatingPrecision(this.precision()),
  );
  protected readonly resolvedSemantics = computed(() =>
    resolveRatingSemantics(this.semantics(), this.precision()),
  );
  protected readonly iconPath = computed(
    () => OGE_RATING_ICON_PATHS[this.icon()] ?? OGE_RATING_ICON_PATHS.star,
  );
  private readonly effectiveLocale = computed(
    () => this.locale() ?? this.config.locale ?? this.localeId,
  );
  /** The committed value, snapped to `precision` inside `0…max`. */
  protected readonly snappedValue = computed(() => this.snapped(this.value()));
  /** The value painted right now: the hover preview, else the committed one. */
  private readonly shownValue = computed(() => {
    const hover = this.hoverValue();
    return hover !== null ? hover : this.snapped(this.value());
  });
  protected readonly states = computed(() =>
    ratingItemStates(this.shownValue(), this.resolvedMax(), this.selection()),
  );
  protected readonly valueText = computed(() =>
    ratingValueText(
      this.snapped(this.value()),
      this.resolvedMax(),
      this.msg(),
      this.effectiveLocale(),
    ),
  );

  private editable(): boolean {
    return !this.effectiveDisabled() && !this.readonly();
  }

  private snapped(value: number | null): number | null {
    return snapRatingValue(value, this.resolvedMax(), this.step());
  }

  private commit(next: number | null, event?: Event): void {
    if (!this.editable()) return;
    this.commitNow(this.snapped(next), event);
  }

  // --- pointer -----------------------------------------------------------------

  private pointerValue(event: MouseEvent): number | null {
    const item = (event.target as Element | null)?.closest?.(
      '.oge-rating-item',
    ) as HTMLElement | null;
    if (!item || !this.hostEl.nativeElement.contains(item)) return null;
    const index = Number(item.dataset['index']);
    if (!Number.isFinite(index)) return null;
    const ratio = ratingPointerRatio(
      event.clientX,
      item.getBoundingClientRect(),
      ogeIsRtl(this.hostEl.nativeElement),
    );
    return ratingValueFromPointer(index, ratio, this.step());
  }

  protected onPointerMove(event: PointerEvent): void {
    if (!this.editable() || !this.hoverPreview()) return;
    if (event.pointerType && event.pointerType !== 'mouse') return;
    const next = this.pointerValue(event);
    if (next === this.hoverValue()) return;
    this.hoverValue.set(next);
    this.hoverChanged.emit({ value: next, event });
  }

  protected onPointerLeave(event: PointerEvent): void {
    if (this.hoverValue() === null) return;
    this.hoverValue.set(null);
    this.hoverChanged.emit({ value: null, event });
  }

  protected onItemsClick(event: MouseEvent): void {
    if (!this.editable()) return;
    const pressed = this.pointerValue(event);
    if (pressed === null) return;
    this.hoverValue.set(null);
    this.commit(
      ratingPressValue(this.snapped(this.value()), pressed, this.allowClear()),
      event,
    );
  }

  // --- keyboard ----------------------------------------------------------------

  protected onSliderKeydown(event: KeyboardEvent): void {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'Enter') {
      this.handleEnterKey(event);
      return;
    }
    const next = ratingKeyboardTarget(event.key, this.snapped(this.value()), {
      max: this.resolvedMax(),
      precision: this.step(),
      rtl: ogeIsRtl(this.hostEl.nativeElement),
      allowClear: this.allowClear(),
    });
    if (next === undefined) return;
    event.preventDefault();
    this.commit(next, event);
  }

  // --- radio group -------------------------------------------------------------

  protected isChecked(index: number): boolean {
    return Math.round(this.snapped(this.value()) ?? 0) === index + 1;
  }

  protected radioTabIndex(index: number): number {
    if (this.effectiveDisabled()) return -1;
    const current = Math.round(this.snapped(this.value()) ?? 0);
    const stop = current > 0 ? current - 1 : 0;
    return index === stop ? this.tabIndex() : -1;
  }

  protected radioLabel(itemValue: number): string {
    return ratingValueText(
      itemValue,
      this.resolvedMax(),
      this.msg(),
      this.effectiveLocale(),
    );
  }

  protected onRadioClick(index: number, event: MouseEvent): void {
    if (!this.editable()) return;
    this.hoverValue.set(null);
    this.commit(
      ratingPressValue(
        this.snapped(this.value()),
        index + 1,
        this.allowClear(),
      ),
      event,
    );
  }

  protected onRadioKeydown(event: KeyboardEvent): void {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === ' ') {
      event.preventDefault();
      const index = Number(
        (event.currentTarget as HTMLElement).dataset['index'],
      );
      if (this.editable() && !this.isChecked(index)) {
        this.commit(index + 1, event);
      }
      return;
    }
    if (event.key === 'Enter') {
      this.handleEnterKey(event);
      return;
    }
    const target = ratingRadioKeyTarget(
      event.key,
      this.snapped(this.value()),
      this.resolvedMax(),
      ogeIsRtl(this.hostEl.nativeElement),
    );
    if (target === undefined) return;
    event.preventDefault();
    if (this.editable()) this.commit(target, event);
    // APG radio group: the focus follows the arrow even when read-only
    this.focusRadio(target - 1);
  }

  private focusRadio(index: number): void {
    queueMicrotask(() =>
      this.hostEl.nativeElement
        .querySelector<HTMLElement>(`.oge-rating-item[data-index="${index}"]`)
        ?.focus(),
    );
  }

  protected onGroupFocusIn(event: FocusEvent): void {
    const related = event.relatedTarget as Node | null;
    if (related && this.hostEl.nativeElement.contains(related)) return;
    this.handleFocus(event);
  }

  protected onGroupFocusOut(event: FocusEvent): void {
    const related = event.relatedTarget as Node | null;
    if (related && this.hostEl.nativeElement.contains(related)) return;
    this.handleBlur(event);
  }

  // --- base contract -----------------------------------------------------------

  protected nativeElement(): HTMLElement | null {
    const host = this.hostEl.nativeElement;
    return (
      host.querySelector<HTMLElement>('[role="slider"]') ??
      host.querySelector<HTMLElement>('[role="radio"][tabindex="0"]') ??
      host.querySelector<HTMLElement>('[role="radio"]')
    );
  }

  protected emptyValue(): number | null {
    return null;
  }

  protected valueIsEmpty(value: number | null): boolean {
    return value === null || value === 0;
  }

  protected override normalizeWrite(value: unknown): number | null {
    const numeric = typeof value === 'number' ? value : Number(value);
    return value == null || value === ''
      ? null
      : snapRatingValue(numeric, this.resolvedMax(), this.step());
  }
}
