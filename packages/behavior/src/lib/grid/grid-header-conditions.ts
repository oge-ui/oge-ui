import {
  foldText,
  nextDay,
  startOfDay,
  toLocalDate,
  type FilterExpr,
  type FilterOperator,
} from '@oge-ui/core';
import { isOgeDateType, type OgeDataType } from './grid-columns';
import { parseLocaleNumber } from './grid-clipboard';

/**
 * The Excel-style column filter menu (`headerFilter.mode: 'conditions' |
 * 'both'`): up to two operator + value conditions joined by And / Or, next
 * to the distinct-value list — plus the year → month → day tree a date
 * column's value list becomes. Pure functions shared by both grid render
 * layers (ADR 0001).
 *
 * A column's condition filter is stored as an ordinary row-filter expression
 * under {@link ogeHeaderConditionKey}, so it persists through `stateKey` and
 * `state()` with no snapshot change, combines with every other filter, and
 * is cleared by `clearFilters()`.
 */

/** Which sections the header filter popup shows. */
export type OgeHeaderFilterMode = 'list' | 'conditions' | 'both';

/** One condition of the menu. `value` is the editor's raw value. */
export interface OgeHeaderCondition {
  operator: FilterOperator;
  value: unknown;
}

/** The menu's condition state for one column. */
export interface OgeHeaderConditionFilter {
  first: OgeHeaderCondition;
  second: OgeHeaderCondition;
  logic: 'and' | 'or';
}

/** The row-filter slot a column's condition filter lives in. */
export function ogeHeaderConditionKey(field: string): string {
  return `hf:${field}`;
}

/** Operators the condition section offers for a data type. */
export function headerConditionOperators(
  dataType: OgeDataType,
): FilterOperator[] {
  switch (dataType) {
    case 'number':
      return ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'isnull', 'isnotnull'];
    case 'date':
    case 'datetime':
      return ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'isnull', 'isnotnull'];
    case 'boolean':
      return ['eq', 'ne', 'isnull', 'isnotnull'];
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

/** Whether an operator takes a value (the null checks do not). */
export function headerConditionNeedsValue(operator: FilterOperator): boolean {
  return operator !== 'isnull' && operator !== 'isnotnull';
}

/** A fresh, inactive condition state for a data type. */
export function emptyHeaderConditionFilter(
  dataType: OgeDataType,
): OgeHeaderConditionFilter {
  const operator = headerConditionOperators(dataType)[0];
  return {
    first: { operator, value: null },
    second: { operator, value: null },
    logic: 'and',
  };
}

/** One condition as an expression, or `null` when it is not filled in. */
function conditionExpr(
  field: string,
  dataType: OgeDataType,
  condition: OgeHeaderCondition,
): FilterExpr | null {
  const op = condition.operator;
  if (!headerConditionNeedsValue(op)) return { type: 'binary', field, op };
  const raw = condition.value;
  if (raw == null || raw === '') return null;
  if (isOgeDateType(dataType)) {
    const day = raw instanceof Date ? raw : toLocalDate(raw);
    if (!day) return null;
    const start = startOfDay(day);
    const end = nextDay(day);
    switch (op) {
      case 'ne':
        return {
          type: 'or',
          operands: [
            { type: 'binary', field, op: 'lt', value: start },
            { type: 'binary', field, op: 'ge', value: end },
          ],
        };
      case 'lt':
        return { type: 'binary', field, op: 'lt', value: start };
      case 'le':
        return { type: 'binary', field, op: 'lt', value: end };
      case 'gt':
        return { type: 'binary', field, op: 'ge', value: end };
      case 'ge':
        return { type: 'binary', field, op: 'ge', value: start };
      default:
        return {
          type: 'and',
          operands: [
            { type: 'binary', field, op: 'ge', value: start },
            { type: 'binary', field, op: 'lt', value: end },
          ],
        };
    }
  }
  if (dataType === 'number') {
    const value =
      typeof raw === 'number' ? raw : parseLocaleNumber(String(raw));
    return value === null || Number.isNaN(value)
      ? null
      : { type: 'binary', field, op, value };
  }
  if (dataType === 'boolean') {
    const value =
      typeof raw === 'boolean' ? raw : String(raw).toLowerCase() === 'true';
    return { type: 'binary', field, op, value };
  }
  return { type: 'binary', field, op, value: String(raw) };
}

/**
 * The column's condition filter as one expression: the filled-in conditions
 * joined by the logic; `null` when neither is filled in (the column then
 * applies no condition filter).
 */
export function headerConditionExpr(
  field: string,
  dataType: OgeDataType,
  filter: OgeHeaderConditionFilter,
): FilterExpr | null {
  const operands = [filter.first, filter.second]
    .map((condition) => conditionExpr(field, dataType, condition))
    .filter((expr): expr is FilterExpr => expr !== null);
  if (!operands.length) return null;
  return operands.length === 1 ? operands[0] : { type: filter.logic, operands };
}

/** Reads one condition back from the expression {@link conditionExpr} built. */
function readCondition(expr: FilterExpr): OgeHeaderCondition | null {
  if (expr.type === 'binary') {
    return { operator: expr.op, value: expr.value ?? null };
  }
  // a whole-day date range: [start, nextDay) → eq, (< start | >= end) → ne
  if (
    (expr.type === 'and' || expr.type === 'or') &&
    expr.operands.length === 2
  ) {
    const [a, b] = expr.operands;
    if (
      a.type === 'binary' &&
      b.type === 'binary' &&
      a.value instanceof Date &&
      b.value instanceof Date &&
      nextDay(a.value).getTime() === b.value.getTime()
    ) {
      if (expr.type === 'and' && a.op === 'ge' && b.op === 'lt')
        return { operator: 'eq', value: a.value };
      if (expr.type === 'or' && a.op === 'lt' && b.op === 'ge')
        return { operator: 'ne', value: a.value };
    }
  }
  return null;
}

/**
 * Rebuilds the menu's state from a stored condition expression (a restored
 * `stateKey`, a reopened menu). Unknown shapes fall back to the empty state —
 * the filter itself stays active and `Clear` still removes it.
 */
export function parseHeaderConditionExpr(
  expr: FilterExpr | null | undefined,
  dataType: OgeDataType,
): OgeHeaderConditionFilter {
  const empty = emptyHeaderConditionFilter(dataType);
  if (!expr) return empty;
  const single = readCondition(expr);
  if (single) return { ...empty, first: single };
  if (
    (expr.type === 'and' || expr.type === 'or') &&
    expr.operands.length === 2
  ) {
    const first = readCondition(expr.operands[0]);
    const second = readCondition(expr.operands[1]);
    if (first && second) return { first, second, logic: expr.type };
  }
  return empty;
}

// --- the date tree ------------------------------------------------------

/** One node of a date column's year → month → day value tree. */
export interface OgeHeaderDateNode {
  /** Stable id (`2026`, `2026-03`, `2026-03-14`, or the blank label). */
  readonly key: string;
  readonly label: string;
  readonly level: 0 | 1 | 2;
  /** Every distinct value under this node (what its checkbox toggles). */
  readonly values: readonly unknown[];
  /** Months of a year, days of a month; empty for a day. */
  readonly children: readonly OgeHeaderDateNode[];
}

let monthFormatter: Intl.DateTimeFormat | undefined;

const pad = (n: number): string => String(n).padStart(2, '0');

/**
 * Groups a date column's distinct values into year → month → day nodes, in
 * value order (a day is labelled by `dayLabel`, default the value's text) (the distinct list already arrives sorted). Values that are not
 * dates — blanks included — become top-level leaves under their own label.
 * The search keeps a node whose label matches (with its whole subtree) or
 * whose descendants match; empty nodes disappear.
 */
export function groupHeaderValuesByDate(
  values: readonly unknown[],
  search: string,
  blankValue: string,
  textOf: (value: unknown) => string,
  dayLabel: (date: Date, value: unknown) => string = (_date, value) =>
    textOf(value),
): readonly OgeHeaderDateNode[] {
  monthFormatter ??= new Intl.DateTimeFormat(undefined, { month: 'long' });
  interface Draft {
    key: string;
    label: string;
    level: 0 | 1 | 2;
    values: unknown[];
    children: Map<string, Draft>;
  }
  const roots = new Map<string, Draft>();
  const child = (
    parent: Map<string, Draft>,
    key: string,
    label: string,
    level: 0 | 1 | 2,
  ): Draft => {
    let node = parent.get(key);
    if (!node) {
      node = { key, label, level, values: [], children: new Map() };
      parent.set(key, node);
    }
    return node;
  };
  for (const value of values) {
    const date =
      value == null || value === ''
        ? null
        : value instanceof Date
          ? value
          : toLocalDate(value);
    if (!date || Number.isNaN(date.getTime())) {
      const label =
        value == null || value === '' ? blankValue : String(textOf(value));
      child(roots, `~${label}`, label, 0).values.push(value);
      continue;
    }
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const year = child(roots, String(y), String(y), 0);
    const month = child(
      year.children,
      `${y}-${pad(m)}`,
      monthFormatter.format(date),
      1,
    );
    const day = child(
      month.children,
      `${y}-${pad(m)}-${pad(date.getDate())}`,
      dayLabel(date, value),
      2,
    );
    year.values.push(value);
    month.values.push(value);
    day.values.push(value);
  }
  const freeze = (node: Draft): OgeHeaderDateNode => ({
    key: node.key,
    label: node.label,
    level: node.level,
    values: node.values,
    children: [...node.children.values()].map(freeze),
  });
  const tree = [...roots.values()].map(freeze);
  const query = foldText(search.trim());
  if (!query) return tree;
  const prune = (node: OgeHeaderDateNode): OgeHeaderDateNode | null => {
    const matches =
      foldText(node.label).includes(query) ||
      node.values.some(
        (value) =>
          !node.children.length && foldText(textOf(value)).includes(query),
      );
    if (matches) return node;
    const children = node.children
      .map(prune)
      .filter((entry): entry is OgeHeaderDateNode => entry !== null);
    if (!children.length) return null;
    return {
      ...node,
      children,
      values: children.flatMap((entry) => entry.values),
    };
  };
  return tree
    .map(prune)
    .filter((entry): entry is OgeHeaderDateNode => entry !== null);
}

/** The tree's rows in render order, skipping the children of collapsed nodes. */
export function flattenHeaderDateTree(
  nodes: readonly OgeHeaderDateNode[],
  collapsed: ReadonlySet<string>,
): OgeHeaderDateNode[] {
  const out: OgeHeaderDateNode[] = [];
  const visit = (list: readonly OgeHeaderDateNode[]): void => {
    for (const node of list) {
      out.push(node);
      if (node.children.length && !collapsed.has(node.key))
        visit(node.children);
    }
  };
  visit(nodes);
  return out;
}
