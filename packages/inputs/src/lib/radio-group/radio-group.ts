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
import { OgeControlBase } from '../field/control-base';
import {
  resolveDisabled,
  resolveDisplay,
  resolveValue,
} from '../select-list/expr';
import type {
  OgeSelectBoxDisabledExpr,
  OgeSelectBoxDisplayExpr,
  OgeSelectBoxValueExpr,
  OgeSelectItemTemplateContext,
} from '../select-box/select-box-types';
import type {
  OgeRadioGroupItemClickEvent,
  OgeRadioGroupLayout,
} from './radio-group-types';

/**
 * Radio group over a flat item array — WAI-ARIA radiogroup with roving
 * tabindex: arrows move focus *and* selection (wrapping, disabled items
 * skipped, RTL-aware), Home/End jump to the edges. Shares the select box
 * expression vocabulary (`displayExpr`/`valueExpr`/`disabledExpr`):
 *
 * ```html
 * <oge-radio-group label="Plan" [items]="plans" [(value)]="plan" />
 * <oge-radio-group
 *   [items]="users"
 *   displayExpr="name"
 *   valueExpr="id"
 *   layout="horizontal"
 *   [(value)]="userId"
 * />
 * ```
 *
 * Works standalone via `[(value)]`, with Signal Forms via `[formField]`, and
 * with reactive/template forms via `formControl`/`ngModel`.
 */
@Component({
  selector: 'oge-radio-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet],
  host: {
    class: 'oge-radio-group',
    role: 'radiogroup',
    '[class.oge-radio-group-horizontal]': "layout() === 'horizontal'",
    '[class.oge-radio-group-invalid]': 'showError()',
    '[class.oge-radio-group-readonly]': 'readonly()',
    '[class.oge-radio-group-sm]': "size() === 'sm'",
    '[class.oge-radio-group-lg]': "size() === 'lg'",
    '[attr.aria-label]': 'label() || null',
    '[attr.aria-required]': "required() ? 'true' : null",
    '[attr.aria-invalid]': "showError() ? 'true' : null",
    '[attr.title]': 'tooltip() ?? null',
    '(keydown)': 'onKeydown($event)',
    '(focusin)': 'onFocusIn($event)',
    '(focusout)': 'onFocusOut($event)',
  },
  template: `
    @for (item of items(); track $index) {
      <button
        #radio
        type="button"
        role="radio"
        class="oge-radio"
        [class.oge-radio-checked]="isChecked(item)"
        [class.oge-disabled]="isItemDisabled(item)"
        [disabled]="effectiveDisabled() || isItemDisabled(item)"
        [attr.aria-checked]="isChecked(item)"
        [attr.tabindex]="$index === focusTargetIndex() ? tabIndex() : -1"
        (click)="onItemClick(item, $index, $event)"
        (focus)="focusedIndex.set($index)"
      >
        <span class="oge-radio-dot" aria-hidden="true"></span>
        @if (itemTemplate(); as template) {
          <ng-container
            *ngTemplateOutlet="
              template;
              context: {
                $implicit: item,
                index: $index,
                selected: isChecked(item),
                active: $index === focusedIndex(),
              }
            "
          />
        } @else {
          <span class="oge-radio-text">{{ displayOf(item) }}</span>
        }
      </button>
    }
  `,
  styleUrl: './radio-group.scss',
})
export class OgeRadioGroup<TItem = unknown>
  extends OgeControlBase<unknown>
  implements FormValueControl<unknown>
{
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The selected item's `valueExpr` result; `null` when nothing is selected. */
  readonly value = model<unknown>(null);
  /** The selectable items. */
  readonly items = input<readonly TItem[]>([]);
  /** Item → display text. Omitted, the item itself is stringified. */
  readonly displayExpr = input<OgeSelectBoxDisplayExpr<TItem> | undefined>(
    undefined,
  );
  /** Item → committed value. Omitted, the whole item is the value. */
  readonly valueExpr = input<OgeSelectBoxValueExpr<TItem> | undefined>(
    undefined,
  );
  /** Marks individual items as non-selectable. */
  readonly disabledExpr = input<OgeSelectBoxDisabledExpr<TItem> | undefined>(
    undefined,
  );
  /** Column (`vertical`, default) or row (`horizontal`) arrangement. */
  readonly layout = input<OgeRadioGroupLayout>('vertical');
  /** Accessible name of the group (`aria-label`). */
  readonly label = input('');
  /** Custom item rendering (the radio dot stays). */
  readonly itemTemplate = input<
    TemplateRef<OgeSelectItemTemplateContext<TItem>> | undefined
  >(undefined);

  /** A radio item was activated by click or keyboard. */
  readonly itemClick = output<OgeRadioGroupItemClickEvent<TItem>>();

  private readonly radios =
    viewChildren<ElementRef<HTMLButtonElement>>('radio');

  /** Last item that held focus — the roving-tabindex anchor. */
  protected readonly focusedIndex = signal(-1);

  /** The single item that carries the reachable tabindex. */
  protected readonly focusTargetIndex = computed(() => {
    const items = this.items();
    const enabled = (index: number): boolean =>
      index >= 0 && index < items.length && !this.isItemDisabled(items[index]);
    if (enabled(this.focusedIndex())) return this.focusedIndex();
    const selected = items.findIndex(
      (item) => this.isChecked(item) && !this.isItemDisabled(item),
    );
    if (selected >= 0) return selected;
    return items.findIndex((item) => !this.isItemDisabled(item));
  });

  // --- template helpers ------------------------------------------------------

  protected displayOf(item: TItem): string {
    return resolveDisplay(this.displayExpr(), item);
  }

  protected isItemDisabled(item: TItem): boolean {
    return resolveDisabled(this.disabledExpr(), item);
  }

  protected isChecked(item: TItem): boolean {
    return Object.is(resolveValue(this.valueExpr(), item), this.value());
  }

  protected onItemClick(item: TItem, index: number, event: Event): void {
    if (this.effectiveDisabled() || this.readonly()) return;
    if (this.isItemDisabled(item)) return;
    this.focusedIndex.set(index);
    this.itemClick.emit({ item, index, event });
    const next = resolveValue(this.valueExpr(), item);
    if (Object.is(next, this.value())) return; // radios can't unselect
    this.commitNow(next, event);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const key = event.key;
    const isArrow =
      key === 'ArrowRight' ||
      key === 'ArrowLeft' ||
      key === 'ArrowDown' ||
      key === 'ArrowUp';
    if (!isArrow && key !== 'Home' && key !== 'End') return;
    if (this.effectiveDisabled() || this.readonly()) return;
    const items = this.items();
    const enabledIndices = items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => !this.isItemDisabled(item))
      .map(({ index }) => index);
    if (enabledIndices.length === 0) return;
    event.preventDefault();
    let nextIndex: number;
    if (key === 'Home') {
      nextIndex = enabledIndices[0];
    } else if (key === 'End') {
      nextIndex = enabledIndices[enabledIndices.length - 1];
    } else {
      let forward: boolean;
      if (key === 'ArrowDown') {
        forward = true;
      } else if (key === 'ArrowUp') {
        forward = false;
      } else {
        const rtl =
          getComputedStyle(this.hostEl.nativeElement).direction === 'rtl';
        forward = (key === 'ArrowRight') !== rtl;
      }
      const position = enabledIndices.indexOf(this.focusTargetIndex());
      const delta = forward ? 1 : -1;
      nextIndex =
        enabledIndices[
          (position + delta + enabledIndices.length) % enabledIndices.length
        ];
    }
    this.focusedIndex.set(nextIndex);
    this.radios()[nextIndex]?.nativeElement.focus();
    // WAI-ARIA radio-group pattern: arrows move the selection too.
    this.onItemClick(items[nextIndex], nextIndex, event);
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
    return this.radios()[this.focusTargetIndex()]?.nativeElement ?? null;
  }

  protected emptyValue(): unknown {
    return null;
  }

  protected valueIsEmpty(value: unknown): boolean {
    return value == null;
  }
}
