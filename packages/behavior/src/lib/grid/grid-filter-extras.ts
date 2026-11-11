import {
  addDays,
  createFieldAccessor,
  isOgeBlank,
  startOfDay,
  startOfMonth,
  startOfWeek,
  type FilterExpr,
  type FilterOperator,
} from '@oge-ui/core';
import {
  dateRangeFilterExpr,
  lookupTextOf,
  type LookupItem,
  type OgeDataType,
} from './grid-columns';

/**
 * Filter helpers shared by both grid render layers: the automatic value list
 * for repetitive columns (`headerFilter.auto`), the date presets of the
 * header menu (`dateFilterPresets`), and the expressions behind a custom
 * filter cell (`filterCellTemplate` / `renderFilterCell`), a range-slider
 * filter cell (`filterRange`), and the display values and server fields a
 * column filters by (`calculateFilterValue`, `filterField`).
 */

// --- automatic value lists ---------------------------------------------------

/** When a column's values repeat enough to deserve a value list. */
export interface OgeAutoListRule {
  /** Most distinct values a list may have. Default 25. */
  readonly maxDistinct: number;
  /** Fewest rows before any column qualifies. Default 8. */
  readonly minRows: number;
}

export const OGE_AUTO_LIST_RULE: OgeAutoListRule = {
  maxDistinct: 25,
  minRows: 8,
};

/**
 * Whether a column gets the automatic value list: at least `minRows` rows, at
 * most `maxDistinct` distinct values, and each value appearing more than
 * twice on average (distinct × 2 < rows). Blank values count as one value.
 * 7 rows never qualify; 40 rows carrying 20 different names do not either.
 */
export function ogeQualifiesForAutoList(
  values: readonly unknown[],
  rule: OgeAutoListRule = OGE_AUTO_LIST_RULE,
): boolean {
  if (values.length < rule.minRows) return false;
  const seen = new Set<unknown>();
  for (const value of values) {
    seen.add(
      isOgeBlank(value)
        ? null
        : value instanceof Date
          ? value.getTime()
          : value,
    );
    if (seen.size > rule.maxDistinct) return false;
  }
  return seen.size * 2 < values.length;
}

/** The fields among `fields` whose values (read with `valueOf`) qualify. */
export function ogeAutoListFields<T>(
  rows: readonly T[],
  fields: readonly string[],
  valueOf: (row: T, field: string) => unknown,
  rule: OgeAutoListRule = OGE_AUTO_LIST_RULE,
): ReadonlySet<string> {
  const out = new Set<string>();
  if (rows.length < rule.minRows) return out;
  for (const field of fields) {
    if (
      ogeQualifiesForAutoList(
        rows.map((row) => valueOf(row, field)),
        rule,
      )
    ) {
      out.add(field);
    }
  }
  return out;
}

// --- date presets --------------------------------------------------------------

/** A quick date range of the header menu. */
export type OgeDatePreset =
  'today' | 'yesterday' | 'thisWeek' | 'thisMonth' | 'last30Days' | 'thisYear';

/** Every preset, in menu order. */
export const OGE_DATE_PRESETS: readonly OgeDatePreset[] = [
  'today',
  'yesterday',
  'thisWeek',
  'thisMonth',
  'last30Days',
  'thisYear',
];

/** The presets `dateFilterPresets` turns on (`true` = all of them). */
export function ogeResolveDatePresets(
  option: boolean | readonly OgeDatePreset[] | undefined,
): readonly OgeDatePreset[] {
  if (!option) return [];
  return option === true
    ? OGE_DATE_PRESETS
    : option.filter((preset) => OGE_DATE_PRESETS.includes(preset));
}

/**
 * The whole local days a preset covers, both ends included. "This week"
 * starts on the locale's first day of the week; "last 30 days" ends today.
 */
export function ogeDatePresetRange(
  preset: OgeDatePreset,
  now: Date,
  firstDayOfWeek: number,
): { readonly from: Date; readonly to: Date } {
  const today = startOfDay(now);
  switch (preset) {
    case 'today':
      return { from: today, to: today };
    case 'yesterday': {
      const day = addDays(today, -1);
      return { from: day, to: day };
    }
    case 'thisWeek': {
      const from = startOfWeek(today, firstDayOfWeek);
      return { from, to: addDays(from, 6) };
    }
    case 'thisMonth': {
      const from = startOfMonth(today);
      return {
        from,
        to: new Date(from.getFullYear(), from.getMonth() + 1, 0),
      };
    }
    case 'last30Days':
      return { from: addDays(today, -29), to: today };
    case 'thisYear':
      return {
        from: new Date(today.getFullYear(), 0, 1),
        to: new Date(today.getFullYear(), 11, 31),
      };
  }
}

/** A preset as the half-open day range the filter contract describes. */
export function ogeDatePresetExpr(
  field: string,
  preset: OgeDatePreset,
  now: Date,
  firstDayOfWeek: number,
): FilterExpr {
  const { from, to } = ogeDatePresetRange(preset, now, firstDayOfWeek);
  return dateRangeFilterExpr(field, from, to) as FilterExpr;
}

// --- custom and range filter cells ---------------------------------------------

/** A numeric range-slider filter cell (`filterRange`). */
export interface OgeFilterRange {
  readonly min: number;
  readonly max: number;
  /** Default 1. */
  readonly step?: number;
}

/** What a custom filter cell is told about its column. */
export interface OgeFilterCellColumn {
  readonly field: string;
  readonly caption: string;
  readonly dataType: OgeDataType;
}

/**
 * The expression a custom filter cell's value stands for: nothing for an
 * empty value (null, blank text, an empty list), `between` for a two-item
 * array, `in` for a longer one, otherwise the operator in force. A column's
 * `calculateFilterExpression` still has the last word.
 */
export function ogeFilterCellExpr(
  field: string,
  value: unknown,
  operator: FilterOperator,
  calculate?: (value: unknown, operator: FilterOperator) => FilterExpr | null,
): FilterExpr | null {
  if (isOgeBlank(value) || (Array.isArray(value) && value.length === 0)) {
    return null;
  }
  if (calculate) return calculate(value, operator);
  if (Array.isArray(value)) {
    return value.length === 2
      ? { type: 'binary', field, op: 'between', value }
      : { type: 'binary', field, op: 'in', value };
  }
  return { type: 'binary', field, op: operator, value };
}

/**
 * A range slider's pair as a filter: `between`, or nothing while the pair
 * spans the whole range (an untouched slider does not narrow the rows).
 */
export function ogeFilterRangeExpr(
  field: string,
  range: OgeFilterRange,
  pair: readonly [number, number],
): FilterExpr | null {
  const [from, to] = pair;
  if (from <= range.min && to >= range.max) return null;
  return { type: 'binary', field, op: 'between', value: [from, to] };
}

// --- display values and server fields ------------------------------------------

/** What {@link ogeColumnFilterValues} reads from a column. */
export interface OgeFilterValueColumn<T> {
  readonly field: string | undefined;
  /** Client-side value the column filters, lists and searches by. */
  readonly calculateFilterValue?: ((row: T) => unknown) | undefined;
  /** The field the column's filters go to the data source under. */
  readonly filterField?: string | undefined;
  /** A static lookup's items: the search also matches their display text. */
  readonly lookupItems?: readonly LookupItem[] | undefined;
}

/** The per-field readers and redirects a grid hands its data layer. */
export interface OgeColumnFilterValues<T> {
  /** `ArrayDataSource` `filterValues` — `undefined` when no column has one. */
  readonly filterValues:
    Readonly<Record<string, (row: T) => unknown>> | undefined;
  /** `ArrayDataSource` `searchValues` (lookup display text). */
  readonly searchValues:
    Readonly<Record<string, (row: T) => unknown>> | undefined;
  /** Filter-state `fieldMap` (`filterField`). */
  readonly fieldMap: Readonly<Record<string, string>>;
}

/**
 * Collects the columns' display-value options in one pass, for both grid
 * layers: `calculateFilterValue` (what filters, value lists and the search
 * compare on the client), the lookup display text the search also matches,
 * and the `filterField` redirects of the load options.
 */
export function ogeColumnFilterValues<T>(
  columns: readonly OgeFilterValueColumn<T>[],
): OgeColumnFilterValues<T> {
  const filterValues: Record<string, (row: T) => unknown> = {};
  const searchValues: Record<string, (row: T) => unknown> = {};
  const fieldMap: Record<string, string> = {};
  for (const column of columns) {
    const field = column.field;
    if (!field) continue;
    if (column.calculateFilterValue) {
      filterValues[field] = column.calculateFilterValue;
    } else if (column.lookupItems?.length) {
      const items = column.lookupItems;
      const read = createFieldAccessor<T>(field);
      searchValues[field] = (row) => lookupTextOf(items, read(row));
    }
    if (column.filterField && column.filterField !== field) {
      fieldMap[field] = column.filterField;
    }
  }
  return {
    filterValues: Object.keys(filterValues).length ? filterValues : undefined,
    searchValues: Object.keys(searchValues).length ? searchValues : undefined,
    fieldMap,
  };
}
