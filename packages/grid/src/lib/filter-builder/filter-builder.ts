import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  input,
  output,
} from '@angular/core';
import type { FilterOperator } from '@oge-ui/core';
import {
  operatorsFor,
  type OgeBuilderCondition,
  type OgeBuilderGroup,
  type OgeFilterBuilderField,
} from '@oge-ui/behavior';
import { OgeSelectBox, OgeTextBox } from '@oge-ui/inputs';
import type { OgeDataType } from '../columns/column';
import { OGE_DEFAULT_MESSAGES, type OgeGridMessages } from '../config';

// The builder's kernel — the condition tree, the operator table and the
// expression conversions — is framework-free and lives in `@oge-ui/behavior`
// (ADR 0001), so the React grid builds the very same expressions. This module
// keeps the Angular editor and re-exports the kernel, which is public API of
// `@oge-ui/grid`.
export {
  builderToExpr,
  describeExpr,
  exprToBuilder,
  operatorsFor,
} from '@oge-ui/behavior';
export type {
  OgeBuilderCondition,
  OgeBuilderGroup,
  OgeFilterBuilderField,
} from '@oge-ui/behavior';

/**
 * Visual editor for arbitrary and/or condition trees (`FilterExpr`).
 * Recursive: renders itself for nested groups.
 */
@Component({
  selector: 'oge-filter-builder-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [OgeSelectBox, OgeTextBox],
  template: `
    <div class="oge-fb-group" [class.oge-fb-root]="root()">
      <div class="oge-fb-logic" role="group">
        @for (logic of ['and', 'or']; track logic) {
          <button
            type="button"
            class="oge-fb-logic-btn"
            [class.oge-fb-logic-active]="group().logic === logic"
            (click)="setLogic(logic === 'and' ? 'and' : 'or')"
          >
            {{ logic === 'and' ? messages().logicAnd : messages().logicOr }}
          </button>
        }
        <button type="button" class="oge-fb-add" (click)="addCondition()">
          + {{ messages().addCondition }}
        </button>
        <button type="button" class="oge-fb-add" (click)="addGroup()">
          + {{ messages().addGroup }}
        </button>
        @if (!root()) {
          <button
            type="button"
            class="oge-fb-remove"
            [attr.aria-label]="messages().removeItem"
            (click)="removeRequest.emit()"
          >
            <svg
              viewBox="0 0 16 16"
              width="11"
              height="11"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            >
              <path d="m4 4 8 8M12 4l-8 8" />
            </svg>
          </button>
        }
      </div>
      @for (item of group().items; track $index; let index = $index) {
        @if (item.kind === 'condition') {
          <div class="oge-fb-condition">
            <select
              class="oge-fb-input"
              [value]="item.field"
              (change)="setField(index, $any($event.target).value)"
            >
              @for (fieldMeta of fields(); track fieldMeta.field) {
                <option [value]="fieldMeta.field">
                  {{ fieldMeta.caption }}
                </option>
              }
            </select>
            <select
              class="oge-fb-input"
              [value]="item.op"
              (change)="setOp(index, $any($event.target).value)"
            >
              @for (op of operatorsOf(item); track op) {
                <option [value]="op">{{ messages().operators[op] }}</option>
              }
            </select>
            @if (item.op !== 'isnull' && item.op !== 'isnotnull') {
              @if (dataTypeOf(item) === 'boolean') {
                <oge-select-box
                  class="oge-fb-input"
                  size="sm"
                  labelMode="hidden"
                  subscriptSizing="none"
                  [label]="messages().filterValuePlaceholder"
                  [items]="booleanItems()"
                  displayExpr="text"
                  valueExpr="value"
                  [value]="item.value"
                  (valueCommitted)="
                    setValue(index, $any($event.value ?? 'true'))
                  "
                />
              } @else if (dataTypeOf(item) === 'date') {
                <input
                  class="oge-fb-input"
                  type="date"
                  [placeholder]="messages().filterValuePlaceholder"
                  [value]="item.value"
                  (input)="setValue(index, $any($event.target).value)"
                />
              } @else {
                <oge-text-box
                  class="oge-fb-input"
                  size="sm"
                  labelMode="hidden"
                  subscriptSizing="none"
                  [label]="messages().filterValuePlaceholder"
                  [placeholder]="messages().filterValuePlaceholder"
                  [inputMode]="
                    dataTypeOf(item) === 'number' ? 'decimal' : undefined
                  "
                  [value]="textValueOf(item)"
                  (inputChange)="setValue(index, $event.text)"
                />
              }
            }
            <button
              type="button"
              class="oge-fb-remove"
              [attr.aria-label]="messages().removeItem"
              (click)="removeAt(index)"
            >
              <svg
                viewBox="0 0 16 16"
                width="11"
                height="11"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              >
                <path d="m4 4 8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>
        } @else {
          <oge-filter-builder-group
            [group]="item"
            [fields]="fields()"
            [messages]="messages()"
            (treeChanged)="treeChanged.emit()"
            (removeRequest)="removeAt(index)"
          />
        }
      }
    </div>
  `,
})
export class OgeFilterBuilderGroup {
  /** The mutable condition/group tree this node renders and edits. */
  readonly group = input.required<OgeBuilderGroup>();
  /** Filterable fields offered in the condition dropdowns. */
  readonly fields = input.required<readonly OgeFilterBuilderField[]>();
  /** Localized strings; defaults to the built-in English messages. */
  readonly messages = input<OgeGridMessages>(OGE_DEFAULT_MESSAGES);
  /** True on the outermost group — hides the remove-group button. */
  readonly root = input(false);
  /** Emitted after any mutation of the tree (logic, field, operator, value, add/remove). */
  readonly treeChanged = output<void>();
  /** Asks the parent group to remove this subgroup from its items. */
  readonly removeRequest = output<void>();

  protected dataTypeOf(condition: OgeBuilderCondition): OgeDataType {
    return (
      this.fields().find((f) => f.field === condition.field)?.dataType ??
      'string'
    );
  }

  /** Boolean value editor items. */
  protected readonly booleanItems = computed(() => [
    { value: 'true', text: this.messages().booleanTrue },
    { value: 'false', text: this.messages().booleanFalse },
  ]);

  protected textValueOf(condition: OgeBuilderCondition): string {
    return condition.value == null ? '' : String(condition.value);
  }

  protected operatorsOf(condition: OgeBuilderCondition): FilterOperator[] {
    return operatorsFor(this.dataTypeOf(condition));
  }

  protected setLogic(logic: 'and' | 'or'): void {
    this.group().logic = logic;
    this.treeChanged.emit();
  }

  protected addCondition(): void {
    const first = this.fields()[0];
    if (!first) return;
    this.group().items.push({
      kind: 'condition',
      field: first.field,
      op: operatorsFor(first.dataType)[0],
      value: '',
    });
    this.treeChanged.emit();
  }

  protected addGroup(): void {
    this.group().items.push({ kind: 'group', logic: 'and', items: [] });
    this.treeChanged.emit();
  }

  protected removeAt(index: number): void {
    this.group().items.splice(index, 1);
    this.treeChanged.emit();
  }

  protected setField(index: number, field: string): void {
    const item = this.group().items[index];
    if (item.kind !== 'condition') return;
    item.field = field;
    const ops = operatorsFor(this.dataTypeOf(item));
    if (!ops.includes(item.op)) item.op = ops[0];
    this.treeChanged.emit();
  }

  protected setOp(index: number, op: FilterOperator): void {
    const item = this.group().items[index];
    if (item.kind !== 'condition') return;
    item.op = op;
    this.treeChanged.emit();
  }

  protected setValue(index: number, value: string): void {
    const item = this.group().items[index];
    if (item.kind !== 'condition') return;
    item.value = value;
    this.treeChanged.emit();
  }
}
