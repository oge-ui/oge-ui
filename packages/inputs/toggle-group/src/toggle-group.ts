import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  TemplateRef,
  ViewEncapsulation,
  computed,
  inject,
  input,
  model,
  output,
  signal,
  viewChildren,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import {
  applyToggleGroupPress,
  buttonGroupNavIndex,
  buttonGroupRole,
  resolveDisabled,
  resolveDisplay,
  resolveValue,
  toggleGroupSelectedIndices,
  type OgeSelectDisabledExpr,
  type OgeSelectDisplayExpr,
  type OgeSelectValueExpr,
  type OgeToggleGroupSelectionMode,
} from '@oge-ui/behavior';
import { OgeControlBase } from '@oge-ui/inputs/field';

/** Context of a toggle group's `itemTemplate`. */
export interface OgeToggleGroupItemTemplateContext<TItem = unknown> {
  $implicit: TItem;
  index: number;
  selected: boolean;
}

/** Fired when a segment is pressed by click or keyboard. */
export interface OgeToggleGroupItemClickEvent<TItem = unknown> {
  readonly item: TItem;
  readonly index: number;
  readonly event: Event;
}

/** Payload of `selectionChanged` — the delta of a user press. */
export interface OgeToggleGroupSelectionChangedEvent {
  /** The new value — a scalar (`single`) or an array (`multiple`). */
  readonly value: unknown;
  readonly addedValues: readonly unknown[];
  readonly removedValues: readonly unknown[];
}

/**
 * Segmented toggle buttons as a form editor — PrimeNG's SelectButton, Kendo's
 * ButtonGroup with selection, but with the field contract (label, hint,
 * validation, Signal Forms / reactive forms) that `oge-button-group` does not
 * carry:
 *
 * ```html
 * <oge-toggle-group label="Alignment" [items]="aligns" [(value)]="align" />
 * <oge-toggle-group
 *   label="Days"
 *   selectionMode="multiple"
 *   [items]="days"
 *   displayExpr="short"
 *   valueExpr="id"
 *   [(value)]="days"
 * />
 * ```
 *
 * `single` is the WAI-ARIA radio-group pattern (`role="radiogroup"` of
 * `role="radio"` buttons; arrows move focus *and* selection, the selected
 * segment cannot be pressed off), `multiple` a `role="group"` of
 * `aria-pressed` toggle buttons (arrows move focus only). Both use one
 * roving tab stop; the selection rule and the arrow arithmetic are the
 * button group's own `@oge-ui/behavior` functions. The value is the item's
 * `valueExpr` result (`single`) or an array of them in items order
 * (`multiple`).
 */
@Component({
  selector: 'oge-toggle-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet],
  host: {
    class: 'oge-toggle-group',
    '[class.oge-toggle-group-fluid]': 'fluid()',
    '[class.oge-toggle-group-invalid]': 'showError()',
    '[class.oge-toggle-group-readonly]': 'readonly()',
    '[class.oge-toggle-group-sm]': "size() === 'sm'",
    '[class.oge-toggle-group-lg]': "size() === 'lg'",
    '[attr.title]': 'tooltip() ?? null',
    '(focusin)': 'onFocusIn($event)',
    '(focusout)': 'onFocusOut($event)',
    // on the host: the track is a composite whose buttons own the focus
    '(keydown)': 'onKeydown($event)',
  },
  template: `
    @if (label() && !hideLabel()) {
      <span class="oge-toggle-group-label" [id]="labelId">{{ label() }}</span>
    }
    <div
      class="oge-toggle-group-track"
      [attr.role]="role()"
      [attr.aria-labelledby]="label() && !hideLabel() ? labelId : null"
      [attr.aria-label]="label() && hideLabel() ? label() : null"
      [attr.aria-describedby]="describedBy()"
      [attr.aria-invalid]="showError() ? 'true' : null"
      [attr.aria-required]="
        required() && role() === 'radiogroup' ? 'true' : null
      "
      [attr.aria-disabled]="effectiveDisabled() ? 'true' : null"
      [attr.aria-readonly]="
        readonly() && role() === 'radiogroup' ? 'true' : null
      "
    >
      @for (item of items(); track $index) {
        <button
          #segment
          type="button"
          class="oge-toggle-group-item"
          [class.oge-toggle-group-item-selected]="isSelected($index)"
          [attr.role]="role() === 'radiogroup' ? 'radio' : null"
          [attr.aria-checked]="
            role() === 'radiogroup' ? isSelected($index) : null
          "
          [attr.aria-pressed]="
            role() === 'radiogroup' ? null : isSelected($index)
          "
          [disabled]="effectiveDisabled() || isItemDisabled(item)"
          [tabindex]="$index === focusTargetIndex() ? tabIndex() : -1"
          (click)="press($index, $event)"
          (focus)="focusedIndex.set($index)"
        >
          @if (itemTemplate(); as template) {
            <ng-container
              *ngTemplateOutlet="
                template;
                context: {
                  $implicit: item,
                  index: $index,
                  selected: isSelected($index),
                }
              "
            />
          } @else {
            {{ displayOf(item) }}
          }
        </button>
      }
    </div>
    @if (subscript(); as sub) {
      <div
        class="oge-toggle-group-subscript"
        [class.oge-toggle-group-error]="sub.error"
        [id]="sub.id"
      >
        {{ sub.text }}
      </div>
    }
  `,
  styleUrl: './toggle-group.scss',
})
export class OgeToggleGroup<TItem = unknown>
  extends OgeControlBase<unknown>
  implements FormValueControl<unknown>
{
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * The selected item's `valueExpr` result (`single`, `null` = none) or the
   * array of them in items order (`multiple`) — two-way.
   */
  readonly value = model<unknown>(null);
  /** The segments. */
  readonly items = input<readonly TItem[]>([]);
  /** Item → segment text. Omitted, the item itself is stringified. */
  readonly displayExpr = input<OgeSelectDisplayExpr<TItem> | undefined>(
    undefined,
  );
  /** Item → committed value. Omitted, the whole item is the value. */
  readonly valueExpr = input<OgeSelectValueExpr<TItem> | undefined>(undefined);
  /** Marks individual segments as non-pressable. */
  readonly disabledExpr = input<OgeSelectDisabledExpr<TItem> | undefined>(
    undefined,
  );
  /** One value (radio pattern) or many (toggle buttons). */
  readonly selectionMode = input<OgeToggleGroupSelectionMode>('single');
  /** Visible label; also the accessible name of the segment track. */
  readonly label = input('');
  /** Keeps `label` as the accessible name only (no visible caption). */
  readonly hideLabel = input(false);
  /** Helper text under the segments (hidden while an error shows). */
  readonly hint = input<string | undefined>(undefined);
  /** Stretches the track to the container width, segments sharing it. */
  readonly fluid = input(false);
  /** Custom segment content (icons, badges). */
  readonly itemTemplate = input<
    TemplateRef<OgeToggleGroupItemTemplateContext<TItem>> | undefined
  >(undefined);

  /** A segment was pressed by click or keyboard (before any value change). */
  readonly itemClick = output<OgeToggleGroupItemClickEvent<TItem>>();
  /** The value changed through user interaction — with the delta. */
  readonly selectionChanged = output<OgeToggleGroupSelectionChangedEvent>();

  private readonly segments =
    viewChildren<ElementRef<HTMLButtonElement>>('segment');

  protected readonly role = computed(() =>
    buttonGroupRole(this.selectionMode()),
  );

  private readonly itemValues = computed(() =>
    this.items().map((item) => resolveValue(this.valueExpr(), item)),
  );

  private readonly selectedIndices = computed(
    () =>
      new Set(
        toggleGroupSelectedIndices(
          this.selectionMode(),
          this.itemValues(),
          this.value(),
        ),
      ),
  );

  /** Last segment that held focus — the roving-tabindex anchor. */
  protected readonly focusedIndex = signal(-1);

  /** The one segment that carries the reachable tabindex. */
  protected readonly focusTargetIndex = computed(() => {
    const items = this.items();
    const enabled = (index: number): boolean =>
      index >= 0 && index < items.length && !this.isItemDisabled(items[index]);
    if (enabled(this.focusedIndex())) return this.focusedIndex();
    for (const index of this.selectedIndices()) {
      if (enabled(index)) return index;
    }
    return items.findIndex((item) => !this.isItemDisabled(item));
  });

  protected readonly subscript = computed(() => {
    if (this.showError() && this.resolvedErrorText()) {
      return { id: this.errorId, text: this.resolvedErrorText(), error: true };
    }
    const hint = this.hint();
    return hint ? { id: this.hintId, text: hint, error: false } : null;
  });

  protected readonly describedBy = computed(() => this.subscript()?.id ?? null);

  protected displayOf(item: TItem): string {
    return resolveDisplay(this.displayExpr(), item);
  }

  protected isItemDisabled(item: TItem): boolean {
    return resolveDisabled(this.disabledExpr(), item);
  }

  protected isSelected(index: number): boolean {
    return this.selectedIndices().has(index);
  }

  protected press(index: number, event: Event): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    const item = this.items()[index];
    if (item === undefined || this.isItemDisabled(item)) return;
    this.focusedIndex.set(index);
    this.itemClick.emit({ item, index, event });
    const change = applyToggleGroupPress(
      this.selectionMode(),
      this.itemValues(),
      this.value(),
      index,
    );
    if (!change) return;
    this.commitNow(change.value, event);
    this.selectionChanged.emit(change);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.effectiveDisabled()) return;
    const items = this.items();
    const enabled = items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => !this.isItemDisabled(item))
      .map(({ index }) => index);
    const rtl = getComputedStyle(this.hostEl.nativeElement).direction === 'rtl';
    // the wrap-around / RTL arithmetic is the button group's, from `behavior`
    const position = buttonGroupNavIndex(
      event.key,
      enabled.indexOf(this.focusTargetIndex()),
      enabled.length,
      rtl,
    );
    if (position < 0) return;
    event.preventDefault();
    const next = enabled[position];
    this.focusedIndex.set(next);
    this.segments()[next]?.nativeElement.focus();
    // WAI-ARIA radio-group pattern: arrows move the selection too.
    if (this.selectionMode() === 'single' && !this.readonly()) {
      this.press(next, event);
    }
  }

  protected onFocusIn(event: FocusEvent): void {
    const related = event.relatedTarget as Node | null;
    if (related && this.hostEl.nativeElement.contains(related)) return;
    this.handleFocus(event);
  }

  protected onFocusOut(event: FocusEvent): void {
    const related = event.relatedTarget as Node | null;
    if (related && this.hostEl.nativeElement.contains(related)) return;
    this.handleBlur(event);
  }

  // --- base contract ---------------------------------------------------------

  protected nativeElement(): HTMLElement | null {
    return this.segments()[this.focusTargetIndex()]?.nativeElement ?? null;
  }

  protected emptyValue(): unknown {
    return this.selectionMode() === 'multiple' ? [] : null;
  }

  protected valueIsEmpty(value: unknown): boolean {
    return Array.isArray(value) ? value.length === 0 : value == null;
  }
}
