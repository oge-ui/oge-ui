import {
  nextDay,
  ogeFilterOperatorTakesValue,
  type FilterExpr,
} from '@oge-ui/core';
import type { OgeDataType } from './grid-columns';
import type { OgeGridMessages } from './grid-config';
import type { OgeGridFilterStateSnapshot } from './grid-state';
import {
  headerValueText,
  type OgeHeaderValueTextOptions,
} from './grid-header-filter';
import {
  describeExpr,
  ogeDisplayFilterOperator,
  type OgeFilterBuilderField,
} from './grid-filtering';

/**
 * The active-filter chip bar (`filterChips`), shared by both grid render
 * layers: one chip per filter that actually narrows the rows — a filter-row
 * cell, a header condition menu, a value-list selection, the filter
 * builder's expression and the search text — each reading
 * "Column · operator · value" and removable on its own.
 *
 * A filter only exists once it narrows: an empty or unparsable filter-row
 * cell stores no expression, so it never produces a chip.
 */

/** Where a chip's filter lives (what removing it clears). */
export type OgeGridFilterChipKind = 'row' | 'header' | 'builder' | 'search';

/** One chip of the bar. */
export interface OgeGridFilterChip {
  /** Stable id: the kind and the filter slot (`row:hf:city`, `header:city`). */
  readonly id: string;
  readonly kind: OgeGridFilterChipKind;
  /** The row-filter slot or header field the chip clears; `''` otherwise. */
  readonly slot: string;
  /** The column caption (or "Search" / "Custom filter"). */
  readonly label: string;
  /** "operator · value" — the rest of the chip text. */
  readonly text: string;
}

/** What a chip needs to know about a column. */
export interface OgeGridFilterChipColumn {
  readonly caption: string;
  readonly dataType: OgeDataType;
  readonly format?: OgeHeaderValueTextOptions['format'];
  readonly lookupItems?: OgeHeaderValueTextOptions['lookupItems'];
  readonly locale?: string;
}

type ChipMessages = Pick<
  OgeGridMessages,
  | 'operators'
  | 'logicAnd'
  | 'logicOr'
  | 'blankValue'
  | 'booleanTrue'
  | 'booleanFalse'
  | 'searchChip'
  | 'builderChip'
>;

/** Values a list chip names before it summarises the rest as "+n". */
const LIST_SHOWN = 3;

const isBinary = (
  expr: FilterExpr,
): expr is Extract<FilterExpr, { type: 'binary' }> => expr.type === 'binary';

/** A whole local day `[start, start + 1 day)` (how date filters are built). */
function isDayPair(
  a: FilterExpr,
  b: FilterExpr,
): a is Extract<FilterExpr, { type: 'binary' }> & { value: Date } {
  return (
    isBinary(a) &&
    isBinary(b) &&
    a.value instanceof Date &&
    b.value instanceof Date &&
    nextDay(a.value).getTime() === b.value.getTime()
  );
}

/** "operator · value" of one expression, recognising the grid's date idioms. */
export function ogeFilterChipText(
  expr: FilterExpr,
  column: OgeGridFilterChipColumn | undefined,
  messages: ChipMessages,
): string {
  const options: OgeHeaderValueTextOptions = {
    dataType: column?.dataType ?? 'string',
    format: column?.format,
    lookupItems: column?.lookupItems,
    locale: column?.locale,
    messages,
  };
  const valueText = (value: unknown): string =>
    Array.isArray(value)
      ? value.map((item) => valueText(item)).join(' – ')
      : headerValueText(value, options);
  const leaf = (node: FilterExpr): string => {
    if (!isBinary(node)) return ogeFilterChipText(node, column, messages);
    const op = messages.operators[ogeDisplayFilterOperator(node.op)];
    if (!ogeFilterOperatorTakesValue(node.op)) return op;
    if (node.op === 'in' || node.op === 'notin') {
      return `${op} · ${listText((node.value as unknown[]) ?? [], valueText)}`;
    }
    return `${op} · ${valueText(node.value)}`;
  };
  if (isBinary(expr)) return leaf(expr);
  if (expr.type === 'not') return `≠ (${leaf(expr.operand)})`;
  const [a, b] = expr.operands;
  // a day: [start, next day) → equals; (< start | ≥ next day [| blank]) → not
  if (expr.type === 'and' && expr.operands.length === 2 && isDayPair(a, b)) {
    if (a.op === 'ge' && (b as { op: string }).op === 'lt') {
      return `${messages.operators.eq} · ${valueText(a.value)}`;
    }
  }
  if (
    expr.type === 'or' &&
    (expr.operands.length === 2 || expr.operands.length === 3) &&
    isDayPair(a, b) &&
    a.op === 'lt'
  ) {
    return `${messages.operators.ne} · ${valueText(a.value)}`;
  }
  const logic = expr.type === 'and' ? messages.logicAnd : messages.logicOr;
  return expr.operands.map(leaf).join(` ${logic.toLowerCase()} `);
}

function listText(
  values: readonly unknown[],
  text: (value: unknown) => string,
): string {
  const shown = values.slice(0, LIST_SHOWN).map(text).join(', ');
  return values.length > LIST_SHOWN
    ? `${shown} +${values.length - LIST_SHOWN}`
    : shown;
}

/** The field a row-filter slot belongs to (`hf:city` → `city`). */
const fieldOfSlot = (slot: string): string => slot.replace(/^hf:/, '');

/** Every chip for the current filter state, in a stable order. */
export function ogeGridFilterChips(
  state: OgeGridFilterStateSnapshot,
  columnOf: (field: string) => OgeGridFilterChipColumn | undefined,
  messages: ChipMessages,
  /** Captions the builder chip names its fields with. */
  builderFields: readonly OgeFilterBuilderField[] = [],
): OgeGridFilterChip[] {
  const chips: OgeGridFilterChip[] = [];
  for (const [slot, expr] of state.row) {
    const field = fieldOfSlot(slot);
    const column = columnOf(field);
    chips.push({
      id: `row:${slot}`,
      kind: 'row',
      slot,
      label: column?.caption ?? field,
      text: ogeFilterChipText(expr, column, messages),
    });
  }
  for (const [field, values] of state.header) {
    const column = columnOf(field);
    chips.push({
      id: `header:${field}`,
      kind: 'header',
      slot: field,
      label: column?.caption ?? field,
      text: ogeFilterChipText(
        { type: 'binary', field, op: 'in', value: values },
        column,
        messages,
      ),
    });
  }
  if (state.builder) {
    chips.push({
      id: 'builder',
      kind: 'builder',
      slot: '',
      label: messages.builderChip,
      text: describeExpr(state.builder, builderFields, messages),
    });
  }
  const search = state.searchText.trim();
  if (search) {
    chips.push({
      id: 'search',
      kind: 'search',
      slot: '',
      label: messages.searchChip,
      text: `“${search}”`,
    });
  }
  return chips;
}
