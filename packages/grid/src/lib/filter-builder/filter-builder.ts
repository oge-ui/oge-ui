import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  input,
  output,
} from '@angular/core';
import type { FilterExpr, FilterOperator } from '@oge-ui/core';
import type { OgeDataType } from '../columns/column';
import { OGE_DEFAULT_MESSAGES, type OgeGridMessages } from '../config';

export interface FilterBuilderField {
  field: string;
  caption: string;
  dataType: OgeDataType;
}

export interface BuilderCondition {
  kind: 'condition';
  field: string;
  op: FilterOperator;
  value: string;
}

export interface BuilderGroup {
  kind: 'group';
  logic: 'and' | 'or';
  items: (BuilderGroup | BuilderCondition)[];
}

export function operatorsFor(dataType: OgeDataType): FilterOperator[] {
  switch (dataType) {
    case 'number':
    case 'date':
      return ['eq', 'ne', 'lt', 'le', 'gt', 'ge', 'isnull', 'isnotnull'];
    case 'boolean':
      return ['eq', 'ne'];
    default:
      return ['contains', 'notcontains', 'startswith', 'endswith', 'eq', 'ne', 'isnull', 'isnotnull'];
  }
}

function typedValue(raw: string, dataType: OgeDataType): unknown {
  if (dataType === 'number') {
    const parsed = Number(raw);
    return Number.isNaN(parsed) ? raw : parsed;
  }
  if (dataType === 'boolean') return raw === 'true';
  return raw;
}

/** Converts the mutable builder tree into a FilterExpr (drops empty parts). */
export function builderToExpr(
  group: BuilderGroup,
  fields: readonly FilterBuilderField[]
): FilterExpr | null {
  const operands: FilterExpr[] = [];
  for (const item of group.items) {
    if (item.kind === 'group') {
      const nested = builderToExpr(item, fields);
      if (nested) operands.push(nested);
      continue;
    }
    const meta = fields.find((candidate) => candidate.field === item.field);
    if (!meta) continue;
    const needsValue = item.op !== 'isnull' && item.op !== 'isnotnull';
    if (needsValue && item.value.trim() === '') continue;
    operands.push({
      type: 'binary',
      field: item.field,
      op: item.op,
      ...(needsValue ? { value: typedValue(item.value.trim(), meta.dataType) } : {}),
    });
  }
  if (!operands.length) return null;
  return operands.length === 1 ? operands[0] : { type: group.logic, operands };
}

/** Converts a FilterExpr back into an editable builder tree. */
export function exprToBuilder(
  expr: FilterExpr | null,
  fields: readonly FilterBuilderField[]
): BuilderGroup {
  const root: BuilderGroup = { kind: 'group', logic: 'and', items: [] };
  if (!expr) return root;

  const toCondition = (node: FilterExpr): BuilderCondition | null => {
    if (node.type !== 'binary') return null;
    return {
      kind: 'condition',
      field: node.field,
      op: node.op,
      value: node.value == null ? '' : String(node.value),
    };
  };

  if (expr.type === 'and' || expr.type === 'or') {
    root.logic = expr.type;
    for (const operand of expr.operands) {
      if (operand.type === 'and' || operand.type === 'or') {
        const nested = exprToBuilder(operand, fields);
        root.items.push(nested);
      } else {
        const condition = toCondition(operand);
        if (condition) root.items.push(condition);
      }
    }
  } else {
    const condition = toCondition(expr);
    if (condition) root.items.push(condition);
  }
  return root;
}

/** Human-readable summary of a FilterExpr for the filter panel. */
export function describeExpr(
  expr: FilterExpr,
  fields: readonly FilterBuilderField[],
  messages: OgeGridMessages
): string {
  if (expr.type === 'binary') {
    const caption = fields.find((f) => f.field === expr.field)?.caption ?? expr.field;
    const op = messages.operators[expr.op] ?? expr.op;
    const needsValue = expr.op !== 'isnull' && expr.op !== 'isnotnull';
    return needsValue ? `[${caption}] ${op} '${String(expr.value ?? '')}'` : `[${caption}] ${op}`;
  }
  if (expr.type === 'not') {
    return `NOT (${describeExpr(expr.operand, fields, messages)})`;
  }
  const logic = expr.type === 'and' ? messages.logicAnd : messages.logicOr;
  return expr.operands
    .map((operand) =>
      operand.type === 'binary'
        ? describeExpr(operand, fields, messages)
        : `(${describeExpr(operand, fields, messages)})`
    )
    .join(` ${logic} `);
}

/**
 * Visual editor for arbitrary and/or condition trees (`FilterExpr`).
 * Recursive: renders itself for nested groups.
 */
@Component({
  selector: 'oge-filter-builder-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [],
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
            (click)="remove.emit()"
          >
            <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m4 4 8 8M12 4l-8 8" /></svg>
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
                <option [value]="fieldMeta.field">{{ fieldMeta.caption }}</option>
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
                <select
                  class="oge-fb-input"
                  [value]="item.value"
                  (change)="setValue(index, $any($event.target).value)"
                >
                  <option value="true">{{ messages().booleanTrue }}</option>
                  <option value="false">{{ messages().booleanFalse }}</option>
                </select>
              } @else {
                <input
                  class="oge-fb-input"
                  [type]="dataTypeOf(item) === 'number' ? 'number' : dataTypeOf(item) === 'date' ? 'date' : 'text'"
                  [placeholder]="messages().filterValuePlaceholder"
                  [value]="item.value"
                  (input)="setValue(index, $any($event.target).value)"
                />
              }
            }
            <button
              type="button"
              class="oge-fb-remove"
              [attr.aria-label]="messages().removeItem"
              (click)="removeAt(index)"
            >
              <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m4 4 8 8M12 4l-8 8" /></svg>
            </button>
          </div>
        } @else {
          <oge-filter-builder-group
            [group]="item"
            [fields]="fields()"
            [messages]="messages()"
            (changed)="changed.emit()"
            (remove)="removeAt(index)"
          />
        }
      }
    </div>
  `,
})
export class OgeFilterBuilderGroup {
  readonly group = input.required<BuilderGroup>();
  readonly fields = input.required<readonly FilterBuilderField[]>();
  readonly messages = input<OgeGridMessages>(OGE_DEFAULT_MESSAGES);
  readonly root = input(false);
  readonly changed = output<void>();
  readonly remove = output<void>();

  protected dataTypeOf(condition: BuilderCondition): OgeDataType {
    return this.fields().find((f) => f.field === condition.field)?.dataType ?? 'string';
  }

  protected operatorsOf(condition: BuilderCondition): FilterOperator[] {
    return operatorsFor(this.dataTypeOf(condition));
  }

  protected setLogic(logic: 'and' | 'or'): void {
    this.group().logic = logic;
    this.changed.emit();
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
    this.changed.emit();
  }

  protected addGroup(): void {
    this.group().items.push({ kind: 'group', logic: 'and', items: [] });
    this.changed.emit();
  }

  protected removeAt(index: number): void {
    this.group().items.splice(index, 1);
    this.changed.emit();
  }

  protected setField(index: number, field: string): void {
    const item = this.group().items[index];
    if (item.kind !== 'condition') return;
    item.field = field;
    const ops = operatorsFor(this.dataTypeOf(item));
    if (!ops.includes(item.op)) item.op = ops[0];
    this.changed.emit();
  }

  protected setOp(index: number, op: FilterOperator): void {
    const item = this.group().items[index];
    if (item.kind !== 'condition') return;
    item.op = op;
    this.changed.emit();
  }

  protected setValue(index: number, value: string): void {
    const item = this.group().items[index];
    if (item.kind !== 'condition') return;
    item.value = value;
    this.changed.emit();
  }
}
