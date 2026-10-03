import {
  accValue,
  accumulate,
  createAcc,
  createFieldAccessor,
  foldText,
  intervalKey,
  type CustomSummaryMap,
  type PivotAcc,
  type PivotFieldConfig,
  type PivotFieldFns,
} from '@oge-ui/core';

/** Label filter operators — matched against a member's display text. */
export type OgePivotLabelFilterOperator =
  | 'contains'
  | 'notContains'
  | 'beginsWith'
  | 'endsWith'
  | 'equals'
  | 'notEquals';

/** Keeps the members whose label matches (case- and accent-insensitive). */
export interface OgePivotLabelFilter {
  readonly operator: OgePivotLabelFilterOperator;
  readonly value: string;
}

/** Value filter operators — compared against a member's measure total. */
export type OgePivotValueFilterOperator =
  | 'greaterThan'
  | 'greaterThanOrEqual'
  | 'lessThan'
  | 'lessThanOrEqual'
  | 'equals'
  | 'notEquals'
  | 'between'
  | 'notBetween';

/**
 * Keeps the members whose total of `measure` (a data field's id) passes
 * the comparison — "regions with Sales greater than 10 000".
 */
export interface OgePivotValueFilter {
  readonly measure: string;
  readonly operator: OgePivotValueFilterOperator;
  readonly value: number;
  /** Upper bound of `between` / `notBetween`. */
  readonly value2?: number;
}

/** Keeps the `count` members with the highest (or lowest) `measure` total. */
export interface OgePivotTopNFilter {
  readonly count: number;
  /** A data field's id. */
  readonly measure: string;
  /** Default `'top'`. */
  readonly direction?: 'top' | 'bottom';
}

/** The member filters of one row / column field. */
export interface OgePivotMemberFilters {
  readonly labelFilter?: OgePivotLabelFilter;
  readonly valueFilter?: OgePivotValueFilter;
  readonly topN?: OgePivotTopNFilter;
}

/** Whether a label passes a label filter. */
export function pivotLabelMatches(
  label: string,
  filter: OgePivotLabelFilter,
): boolean {
  const text = foldText(label);
  const needle = foldText(filter.value);
  switch (filter.operator) {
    case 'contains':
      return text.includes(needle);
    case 'notContains':
      return !text.includes(needle);
    case 'beginsWith':
      return text.startsWith(needle);
    case 'endsWith':
      return text.endsWith(needle);
    case 'equals':
      return text === needle;
    case 'notEquals':
      return text !== needle;
  }
}

/** Whether a measure total passes a value filter (`null` never passes). */
export function pivotValueMatches(
  value: number | null,
  filter: OgePivotValueFilter,
): boolean {
  if (value === null) return false;
  const low = Math.min(filter.value, filter.value2 ?? filter.value);
  const high = Math.max(filter.value, filter.value2 ?? filter.value);
  switch (filter.operator) {
    case 'greaterThan':
      return value > filter.value;
    case 'greaterThanOrEqual':
      return value >= filter.value;
    case 'lessThan':
      return value < filter.value;
    case 'lessThanOrEqual':
      return value <= filter.value;
    case 'equals':
      return value === filter.value;
    case 'notEquals':
      return value !== filter.value;
    case 'between':
      return value >= low && value <= high;
    case 'notBetween':
      return value < low || value > high;
  }
}

/** Identity of a member value (dates by instant, like the engine's tries). */
function memberId(value: unknown): unknown {
  return value instanceof Date ? `\u0000date:${value.getTime()}` : value;
}

/**
 * Applies the label, value and Top-N filters of the row / column fields
 * before aggregation, so totals reflect what is shown — Excel's semantics.
 * Fields filter in area order (rows, then columns), each over the rows the
 * previous filters left. Value and Top-N filters compare a member's total
 * over all other fields (its grand total), not per parent group.
 */
export function applyPivotMemberFilters<T>(
  rows: readonly T[],
  fields: readonly PivotFieldConfig[],
  filters: ReadonlyMap<string, OgePivotMemberFilters>,
  fns: Readonly<Record<string, PivotFieldFns<T>>>,
  customSummaries?: CustomSummaryMap<T>,
): readonly T[] {
  if (!filters.size) return rows;
  const axisFields = [
    ...fields
      .filter((field) => field.area === 'row')
      .sort((a, b) => (a.areaIndex ?? 0) - (b.areaIndex ?? 0)),
    ...fields
      .filter((field) => field.area === 'column')
      .sort((a, b) => (a.areaIndex ?? 0) - (b.areaIndex ?? 0)),
  ];
  const accessorOf = (field: PivotFieldConfig): ((row: T) => unknown) =>
    fns[field.id]?.selector ?? createFieldAccessor<T>(field.dataField);
  let current = rows;
  for (const field of axisFields) {
    const filter = filters.get(field.id);
    if (!filter || (!filter.labelFilter && !filter.valueFilter && !filter.topN))
      continue;
    const accessor = accessorOf(field);
    const keyOf = (row: T): unknown =>
      intervalKey(accessor(row), field.groupInterval);
    // bucket the rows by member once; filters then decide per member
    const members = new Map<unknown, { key: unknown; rows: T[] }>();
    for (const row of current) {
      const key = keyOf(row);
      const id = memberId(key);
      const bucket = members.get(id);
      if (bucket) bucket.rows.push(row);
      else members.set(id, { key, rows: [row] });
    }
    let kept = [...members.values()];
    if (filter.labelFilter) {
      const label = filter.labelFilter;
      const fieldFns = fns[field.id];
      kept = kept.filter((member) => {
        const base = member.key == null ? '' : String(member.key);
        const formatted = fieldFns?.format ? fieldFns.format(member.key) : base;
        const text = fieldFns?.customizeText
          ? fieldFns.customizeText({ value: member.key, valueText: formatted })
          : formatted;
        return pivotLabelMatches(text, label);
      });
    }
    const totalOf = (measureId: string) => {
      const measure = fields.find((candidate) => candidate.id === measureId);
      if (!measure) return () => null;
      const read = accessorOf(measure);
      const type = measure.summaryType ?? 'sum';
      const custom =
        type === 'custom'
          ? customSummaries?.[measure.summaryName ?? measure.dataField]
          : undefined;
      return (member: { rows: T[] }): number | null => {
        if (type === 'custom') {
          const value = custom?.(member.rows, measure.dataField);
          return typeof value === 'number' ? value : null;
        }
        const acc: PivotAcc = createAcc();
        for (const row of member.rows) accumulate(acc, read(row));
        const value = accValue(acc, type);
        return typeof value === 'number' ? value : null;
      };
    };
    if (filter.valueFilter) {
      const value = filter.valueFilter;
      const total = totalOf(value.measure);
      kept = kept.filter((member) => pivotValueMatches(total(member), value));
    }
    if (filter.topN && filter.topN.count >= 0) {
      const total = totalOf(filter.topN.measure);
      const sign = filter.topN.direction === 'bottom' ? 1 : -1;
      kept = kept
        .map((member) => ({ member, value: total(member) }))
        // members without a value sort last either way
        .sort((a, b) =>
          a.value === null
            ? 1
            : b.value === null
              ? -1
              : sign * (a.value - b.value),
        )
        .slice(0, filter.topN.count)
        .map((entry) => entry.member);
    }
    if (kept.length === members.size) continue;
    const allowed = new Set(kept.map((member) => memberId(member.key)));
    current = current.filter((row) => allowed.has(memberId(keyOf(row))));
  }
  return current;
}
