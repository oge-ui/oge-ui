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
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import {
  applySelectAll,
  choiceIncludes,
  resolveDisabled,
  resolveDisplay,
  resolveValue,
  selectAllState,
  toggleChoiceValue,
  type OgeCheckBoxGroupLayout,
  type OgeSelectDisabledExpr,
  type OgeSelectDisplayExpr,
  type OgeSelectValueExpr,
} from '@oge-ui/behavior';
import { OgeCheckBox } from '@oge-ui/inputs/check-box';
import {
  OgeControlBase,
  type OgeInputValueCommittedEvent,
} from '@oge-ui/inputs/field';
import type {
  OgeCheckBoxGroupItemClickEvent,
  OgeCheckBoxGroupSelectAllEvent,
} from './check-box-group-types';

/** Context of a check box group's `itemTemplate`. */
export interface OgeCheckBoxGroupItemTemplateContext<TItem = unknown> {
  $implicit: TItem;
  index: number;
  checked: boolean;
}

/**
 * Items-bound check box list whose value is the **array** of checked item
 * values — the Syncfusion / PrimeNG checkbox group, as one form field:
 *
 * ```html
 * <oge-check-box-group
 *   label="Notify me by"
 *   [items]="channels"
 *   displayExpr="name"
 *   valueExpr="id"
 *   layout="horizontal"
 *   [showSelectAll]="true"
 *   [(value)]="notify"
 * />
 * ```
 *
 * Each item is a real `oge-check-box` (native checkbox semantics, its own Tab
 * stop — the APG checkbox-group pattern), inside a `role="group"` named by
 * the visible label. The optional "select all" box is tri-state (checked /
 * mixed / unchecked) over the **enabled** items only — disabled items keep
 * their state. The committed array follows the items order, whatever order
 * the user clicked in. `layout` arranges the boxes vertically, horizontally
 * (wrapping) or in `columns`. Works standalone via `[(value)]`, with Signal
 * Forms via `[formField]` (`required()` means "at least one"), and with
 * reactive/template forms via `formControl`/`ngModel`.
 */
@Component({
  selector: 'oge-check-box-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [OgeCheckBox, NgTemplateOutlet],
  host: {
    class: 'oge-check-box-group',
    role: 'group',
    '[class.oge-check-box-group-horizontal]': "layout() === 'horizontal'",
    '[class.oge-check-box-group-columns]': "layout() === 'columns'",
    '[class.oge-check-box-group-invalid]': 'showError()',
    '[class.oge-check-box-group-readonly]': 'readonly()',
    '[style.--oge-check-box-group-columns]': 'columns()',
    '[attr.aria-labelledby]': 'label() ? labelId : null',
    '[attr.aria-describedby]': 'describedBy()',
    '[attr.aria-invalid]': "showError() ? 'true' : null",
    '[attr.aria-disabled]': "effectiveDisabled() ? 'true' : null",
    '[attr.title]': 'tooltip() ?? null',
    '(focusin)': 'onFocusIn($event)',
    '(focusout)': 'onFocusOut($event)',
  },
  template: `
    @if (label()) {
      <span class="oge-check-box-group-label" [id]="labelId"
        >{{ label() }}
        @if (required()) {
          <span class="oge-check-box-group-required" aria-hidden="true">*</span>
        }
      </span>
    }
    @if (showSelectAll()) {
      <oge-check-box
        class="oge-check-box-group-select-all"
        [value]="allState()"
        [text]="selectAllText() ?? msg().selectAllText"
        [disabled]="effectiveDisabled() || selectableValues().length === 0"
        [readonly]="readonly()"
        [size]="size()"
        [tabIndex]="tabIndex()"
        (valueCommitted)="onSelectAll($event)"
      />
    }
    <div class="oge-check-box-group-items">
      @for (item of items(); track $index) {
        <oge-check-box
          class="oge-check-box-group-item"
          [value]="isChecked(item)"
          [text]="itemTemplate() ? '' : displayOf(item)"
          [disabled]="effectiveDisabled() || isItemDisabled(item)"
          [readonly]="readonly()"
          [size]="size()"
          [tabIndex]="tabIndex()"
          [name]="name()"
          (valueCommitted)="onItemCommitted(item, $index, $event)"
        >
          @if (itemTemplate(); as template) {
            <ng-container
              *ngTemplateOutlet="
                template;
                context: {
                  $implicit: item,
                  index: $index,
                  checked: isChecked(item),
                }
              "
            />
          }
        </oge-check-box>
      }
    </div>
    @if (subscript(); as sub) {
      <div
        class="oge-check-box-group-subscript"
        [class.oge-check-box-group-error]="sub.error"
        [id]="sub.id"
      >
        {{ sub.text }}
      </div>
    }
  `,
  styleUrl: './check-box-group.scss',
})
export class OgeCheckBoxGroup<TItem = unknown>
  extends OgeControlBase<readonly unknown[]>
  implements FormValueControl<readonly unknown[]>
{
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The checked items' `valueExpr` results, in items order — two-way. */
  readonly value = model<readonly unknown[]>([]);
  /** The items, one check box each. */
  readonly items = input<readonly TItem[]>([]);
  /** Item → label text. Omitted, the item itself is stringified. */
  readonly displayExpr = input<OgeSelectDisplayExpr<TItem> | undefined>(
    undefined,
  );
  /** Item → value in the array. Omitted, the whole item is the value. */
  readonly valueExpr = input<OgeSelectValueExpr<TItem> | undefined>(undefined);
  /** Marks individual items as non-editable (their state is kept). */
  readonly disabledExpr = input<OgeSelectDisabledExpr<TItem> | undefined>(
    undefined,
  );
  /** Vertical list (default), wrapping row, or a `columns`-column grid. */
  readonly layout = input<OgeCheckBoxGroupLayout>('vertical');
  /** Column count of `layout: 'columns'`. */
  readonly columns = input(2);
  /** Visible group label; also the group's accessible name. */
  readonly label = input('');
  /** Helper text under the items (hidden while an error shows). */
  readonly hint = input<string | undefined>(undefined);
  /** Renders a tri-state "select all" box above the items. */
  readonly showSelectAll = input(false);
  /** Text of the "select all" box; `undefined` = the messages catalog. */
  readonly selectAllText = input<string | undefined>(undefined);
  /** Custom item label rendering (the check box glyph stays). */
  readonly itemTemplate = input<
    TemplateRef<OgeCheckBoxGroupItemTemplateContext<TItem>> | undefined
  >(undefined);

  /** One check box was toggled by the user. */
  readonly itemClick = output<OgeCheckBoxGroupItemClickEvent<TItem>>();
  /** The "select all" box was toggled by the user. */
  readonly selectAllChanged = output<OgeCheckBoxGroupSelectAllEvent>();

  private readonly itemValues = computed(() =>
    this.items().map((item) => resolveValue(this.valueExpr(), item)),
  );

  /** Values of the enabled items — the scope of "select all". */
  protected readonly selectableValues = computed(() =>
    this.items()
      .filter((item) => !this.isItemDisabled(item))
      .map((item) => resolveValue(this.valueExpr(), item)),
  );

  /** `true` / `false` / `null` (mixed) — the "select all" box state. */
  protected readonly allState = computed(() =>
    selectAllState(this.selectableValues(), this.value() ?? []),
  );

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

  protected isChecked(item: TItem): boolean {
    return choiceIncludes(
      this.value() ?? [],
      resolveValue(this.valueExpr(), item),
    );
  }

  // --- public API ------------------------------------------------------------

  /** Checks every enabled item (disabled items keep their state). */
  selectAll(): void {
    this.applyAll(true, undefined);
  }

  /** Unchecks every enabled item (disabled items keep their state). */
  unselectAll(): void {
    this.applyAll(false, undefined);
  }

  // --- interactions ----------------------------------------------------------

  protected onItemCommitted(
    item: TItem,
    index: number,
    change: OgeInputValueCommittedEvent<boolean | null>,
  ): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    const checked = change.value === true;
    this.itemClick.emit({ item, index, checked, event: change.event });
    const next = toggleChoiceValue(
      this.itemValues(),
      this.value() ?? [],
      resolveValue(this.valueExpr(), item),
      checked,
    );
    this.commitNow(next, change.event);
  }

  protected onSelectAll(
    change: OgeInputValueCommittedEvent<boolean | null>,
  ): void {
    // from mixed the native box goes to checked — "select all" first
    const checked = change.previousValue === true ? false : true;
    this.selectAllChanged.emit({ checked, event: change.event });
    this.applyAll(checked, change.event);
  }

  private applyAll(checked: boolean, event: Event | undefined): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    const next = applySelectAll(
      this.itemValues(),
      this.selectableValues(),
      this.value() ?? [],
      checked,
    );
    this.commitNow(next, event);
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
    return this.hostEl.nativeElement.querySelector<HTMLInputElement>(
      '.oge-check-box-input:not(:disabled)',
    );
  }

  protected emptyValue(): readonly unknown[] {
    return [];
  }

  protected valueIsEmpty(value: readonly unknown[]): boolean {
    return !value || value.length === 0;
  }

  protected override normalizeWrite(value: unknown): readonly unknown[] {
    return Array.isArray(value) ? value : [];
  }
}
