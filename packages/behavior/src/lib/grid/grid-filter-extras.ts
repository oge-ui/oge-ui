import {
  addDays,
  isOgeBlank,
  startOfDay,
  startOfMonth,
  startOfWeek,
  type FilterExpr,
  type FilterOperator,
} from '@oge-ui/core';
import { dateRangeFilterExpr, type OgeDataType } from './grid-columns';

/**
 * Filter helpers shared by both grid render layers: the automatic value list
 * for repetitive columns (`headerFilter.auto`), the date presets of the
 * header menu (`dateFilterPresets`), and the expressions behind a custom
 * filter cell (`filterCellTemplate` / `renderFilterCell`) and a range-slider
 * filter cell (`filterRange`).
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
