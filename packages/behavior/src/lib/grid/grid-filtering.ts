import type { FilterExpr, FilterOperator } from '@oge-ui/core';
import {
  buildRowFilterExpr,
  defaultOperatorFor,
  type OgeDataType,
} from './grid-columns';

/** One field the filter builder can build a condition on. */
export interface OgeFilterBuilderField {
  field: string;
  caption: string;
  dataType: OgeDataType;
}

export interface OgeBuilderCondition {
  kind: 'condition';
  field: string;
  op: FilterOperator;
  value: string;
}

export interface OgeBuilderGroup {
  kind: 'group';
  logic: 'and' | 'or';
  items: (OgeBuilderGroup | OgeBuilderCondition)[];
}

/** Operators offered for a column's data type. */
export function operatorsFor(dataType: OgeDataType): FilterOperator[] {
  switch (dataType) {
    case 'number':
    case 'date':
      return ['eq', 'ne', 'lt', 'le', 'gt', 'ge', 'isnull', 'isnotnull'];
    case 'boolean':
      return ['eq', 'ne'];
    default:
      return [
        'contains',
        'notcontains',
        'startswith',
        'endswith',
        'eq',
        'ne',
        'isnull',
        'isnotnull',
      ];
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
  group: OgeBuilderGroup,
  fields: readonly OgeFilterBuilderField[],
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
      ...(needsValue
        ? { value: typedValue(item.value.trim(), meta.dataType) }
        : {}),
    });
  }
  if (!operands.length) return null;
  return operands.length === 1 ? operands[0] : { type: group.logic, operands };
}

/** Converts a FilterExpr back into an editable builder tree. */
export function exprToBuilder(
  expr: FilterExpr | null,
  fields: readonly OgeFilterBuilderField[],
): OgeBuilderGroup {
  const root: OgeBuilderGroup = { kind: 'group', logic: 'and', items: [] };
  if (!expr) return root;

  const toCondition = (node: FilterExpr): OgeBuilderCondition | null => {
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

/** The strings a described expression is worded with. */
export interface OgeFilterDescribeMessages {
  operators: Readonly<Record<FilterOperator, string>>;
  logicAnd: string;
  logicOr: string;
}

/** Human-readable summary of a FilterExpr for the filter panel. */
export function describeExpr(
  expr: FilterExpr,
  fields: readonly OgeFilterBuilderField[],
  messages: OgeFilterDescribeMessages,
): string {
  if (expr.type === 'binary') {
    const caption =
      fields.find((f) => f.field === expr.field)?.caption ?? expr.field;
    const op = messages.operators[expr.op] ?? expr.op;
    const needsValue = expr.op !== 'isnull' && expr.op !== 'isnotnull';
    return needsValue
      ? `[${caption}] ${op} '${String(expr.value ?? '')}'`
      : `[${caption}] ${op}`;
  }
  if (expr.type === 'not') {
    return `NOT (${describeExpr(expr.operand, fields, messages)})`;
  }
  const logic = expr.type === 'and' ? messages.logicAnd : messages.logicOr;
  return expr.operands
    .map((operand) =>
      operand.type === 'binary'
        ? describeExpr(operand, fields, messages)
        : `(${describeExpr(operand, fields, messages)})`,
    )
    .join(` ${logic} `);
}

// --- the filter row ---------------------------------------------------------

/** What the filter row needs to know about a column. */
export interface OgeFilterRowColumn {
  readonly field: string | undefined;
  readonly dataType: OgeDataType;
  readonly filterOperator: FilterOperator | undefined;
  readonly calculateFilterExpression:
    | ((value: unknown, operator: FilterOperator) => FilterExpr | null)
    | undefined;
}

/**
 * The operator a filter-row cell is currently applying: the user's per-column
 * override first, then the column's own `filterOperator`, then the data type's
 * default.
 */
export function effectiveFilterOperator(
  column: OgeFilterRowColumn,
  override?: FilterOperator,
): FilterOperator {
  if (!column.field) return 'contains';
  return (
    override ?? column.filterOperator ?? defaultOperatorFor(column.dataType)
  );
}

/**
 * The expression one filter-row cell contributes. A column with a
 * `calculateFilterExpression` owns the translation entirely — it is handed the
 * raw text and the operator in force.
 */
export function rowFilterExpr(
  column: OgeFilterRowColumn,
  raw: string,
  operator?: FilterOperator,
): FilterExpr | null {
  const field = column.field;
  if (!field) return null;
  if (column.calculateFilterExpression) {
    const text = raw.trim();
    const op = effectiveFilterOperator(column, operator);
    return text ? column.calculateFilterExpression(text, op) : null;
  }
  return buildRowFilterExpr(field, column.dataType, raw, operator);
}

/** Glyphs shown on the filter row's operator button. */
const OPERATOR_SYMBOLS: Partial<Record<FilterOperator, string>> = {
  eq: '=',
  ne: '≠',
  gt: '>',
  ge: '≥',
  lt: '<',
  le: '≤',
  contains: '∗',
  notcontains: '!∗',
  startswith: 'a…',
  endswith: '…z',
};

export function filterOperatorSymbol(operator: FilterOperator): string {
  return OPERATOR_SYMBOLS[operator] ?? '=';
}

/**
 * Operators the filter row offers. The null checks are deliberately absent:
 * the filter row's editor is a text box, and "is null" has no text to type —
 * the filter builder and `filterValue` cover them.
 */
export function filterRowOperatorChoices(
  dataType: OgeDataType,
): FilterOperator[] {
  return operatorsFor(dataType).filter(
    (op) => op !== 'isnull' && op !== 'isnotnull',
  );
}
