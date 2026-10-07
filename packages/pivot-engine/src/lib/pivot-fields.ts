import { humanize } from '@oge-ui/behavior';
import { isOgeDateFormatType, ogeValueFormatter } from '@oge-ui/core';
import type {
  CustomSummaryMap,
  FilterExpr,
  OgeValueFormat,
  PivotArea,
  PivotFieldConfig,
  PivotFieldFns,
  PivotGroupInterval,
  PivotGridStateSnapshot,
  PivotLoadOptions,
  PivotPath,
  SummaryDescriptor,
} from '@oge-ui/core';
import type { OgePivotMessages } from './pivot-messages';
import type { OgePivotFieldDef, OgePivotPanelArea } from './pivot-types';

/**
 * A declared field as the engine consumes it: `id` defaulted to `dataField`,
 * the caption humanized, `areaIndex` defaulted to the declaration order and
 * the directive's input defaults applied — so a React `fields` array and the
 * Angular `<oge-pivot-field>` children produce the identical config.
 */
export function pivotFieldConfigOf<T>(
  def: OgePivotFieldDef<T>,
  index: number,
): PivotFieldConfig {
  const dataField = def.dataField;
  return {
    id: def.id ?? dataField,
    dataField,
    caption: def.caption ?? humanize(dataField),
    area: def.area ?? null,
    areaIndex: def.areaIndex ?? index,
    dataType: def.dataType,
    groupInterval: def.groupInterval,
    summaryType: def.summaryType ?? 'sum',
    summaryName: def.summaryName,
    summaryDisplayMode: def.summaryDisplayMode ?? 'none',
    runningTotal: def.runningTotal,
    sortOrder: def.sortOrder,
    sortBySummaryField: def.sortBySummaryField,
    sortBySummaryPath: def.sortBySummaryPath,
    filterValues: def.filterValues,
    filterType: def.filterType ?? 'include',
    showTotals: def.showTotals ?? true,
  };
}

/** Declared configs with the user's layout overrides laid over each. */
export function applyPivotFieldOverrides(
  base: readonly PivotFieldConfig[],
  overrides: ReadonlyMap<string, Partial<PivotFieldConfig>>,
): readonly PivotFieldConfig[] {
  return base.map((field) => ({ ...field, ...overrides.get(field.id) }));
}

/**
 * Selector / formatter / text hook per field id (only fields that have one);
 * a declarative `format` is compiled for `locale` through the shared `Intl`
 * cache.
 */
export function pivotFieldFnsOf<T>(
  defs: readonly OgePivotFieldDef<T>[],
  locale?: string,
): Readonly<Record<string, OgePivotFieldFns<T>>> {
  const fns: Record<string, OgePivotFieldFns<T>> = {};
  for (const def of defs) {
    const id = def.id ?? def.dataField;
    const { selector, customizeText } = def;
    const format =
      def.format && typeof def.format !== 'function'
        ? ogeValueFormatter(def.format, locale)
        : def.format;
    const headerFormat =
      def.headerFormat === undefined
        ? undefined
        : pivotHeaderFormatter(def.headerFormat, def.groupInterval, locale);
    if (selector || format || customizeText || headerFormat)
      fns[id] = { selector, format, customizeText, headerFormat };
  }
  return fns;
}

/** A field's out-of-band functions, plus its compiled member-header format. */
export interface OgePivotFieldFns<T = unknown> extends PivotFieldFns<T> {
  /** Member-header text on a row / column axis (wins over `format` there). */
  readonly headerFormat?: (value: unknown) => string;
}

/**
 * A representative `Date` of a date group-interval bucket, so a date format
 * can name it: year `2024` → 1 Jan 2024, quarter `q` → the quarter's first
 * month, month `m` → 1st of that month, day `d` → that day of January,
 * dayOfWeek `w` (0 = Sunday) → a date on that weekday (the reference year is
 * 2000). Anything else — a numeric interval, no interval, a non-numeric
 * bucket — comes back unchanged.
 */
export function pivotIntervalDate(
  bucket: unknown,
  interval: PivotGroupInterval | undefined,
): unknown {
  if (typeof bucket !== 'number' || !Number.isFinite(bucket)) return bucket;
  switch (interval) {
    case 'year':
      return new Date(bucket, 0, 1);
    case 'quarter':
      return new Date(2000, (bucket - 1) * 3, 1);
    case 'month':
      return new Date(2000, bucket - 1, 1);
    case 'day':
      return new Date(2000, 0, bucket);
    case 'dayOfWeek':
      // 2 Jan 2000 was a Sunday
      return new Date(2000, 0, 2 + bucket);
    default:
      return bucket;
  }
}

/**
 * Compiles a field's `headerFormat`: a function passes through; a
 * declarative `OgeValueFormat` renders in `locale`, and a date format on a
 * date-grouped field formats the bucket's {@link pivotIntervalDate}.
 */
export function pivotHeaderFormatter(
  format: ((value: unknown) => string) | OgeValueFormat,
  groupInterval: PivotGroupInterval | undefined,
  locale?: string,
): (value: unknown) => string {
  if (typeof format === 'function') return format;
  const formatter = ogeValueFormatter(format, locale);
  if (!isOgeDateFormatType(format.type) || typeof groupInterval !== 'string') {
    return formatter;
  }
  return (value) => formatter(pivotIntervalDate(value, groupInterval));
}

/**
 * The functions an axis renders members with: `headerFormat` takes the place
 * of `format` (which keeps formatting the field's cells as a measure).
 */
export function pivotAxisFieldFns<T>(
  fns: Readonly<Record<string, OgePivotFieldFns<T>>>,
): Readonly<Record<string, PivotFieldFns<T>>> {
  const axis: Record<string, PivotFieldFns<T>> = {};
  for (const [id, entry] of Object.entries(fns)) {
    axis[id] =
      entry.headerFormat === undefined
        ? entry
        : { ...entry, format: entry.headerFormat };
  }
  return axis;
}

/**
 * A member's header text — the same rule the engine's axes use: the axis
 * `format`, else `String(value)`, then `customizeText`.
 */
export function pivotMemberText<T>(
  fns: PivotFieldFns<T> | undefined,
  value: unknown,
): string {
  const base = value == null ? '' : String(value);
  const formatted = fns?.format ? fns.format(value) : base;
  return fns?.customizeText
    ? fns.customizeText({ value, valueText: formatted })
    : formatted;
}

/** Custom reducers keyed by `summaryName ?? dataField`; `undefined` when none. */
export function pivotCustomSummariesOf<T>(
  defs: readonly OgePivotFieldDef<T>[],
): CustomSummaryMap<T> | undefined {
  const map: Record<string, (rows: readonly T[], field: string) => unknown> =
    {};
  let any = false;
  for (const def of defs) {
    const reducer = def.calculateCustomSummary;
    if (reducer) {
      map[def.summaryName ?? def.dataField] = reducer;
      any = true;
    }
  }
  return any ? map : undefined;
}

/** The fields of one area, in `areaIndex` order. */
export function pivotAreaFields<F extends PivotFieldConfig>(
  fields: readonly F[],
  area: PivotArea | null,
): F[] {
  return fields
    .filter((field) => field.area === area)
    .sort((a, b) => (a.areaIndex ?? 0) - (b.areaIndex ?? 0));
}

/** The four field-panel areas in their fixed order: filter, row, column, data. */
export function pivotPanelAreas(
  fields: readonly PivotFieldConfig[],
  messages: OgePivotMessages,
): OgePivotPanelArea<PivotFieldConfig>[] {
  return [
    {
      area: 'filter',
      label: messages.filterArea,
      fields: pivotAreaFields(fields, 'filter'),
    },
    {
      area: 'row',
      label: messages.rowArea,
      fields: pivotAreaFields(fields, 'row'),
    },
    {
      area: 'column',
      label: messages.columnArea,
      fields: pivotAreaFields(fields, 'column'),
    },
    {
      area: 'data',
      label: messages.dataArea,
      fields: pivotAreaFields(fields, 'data'),
    },
  ];
}

/**
 * The serializable request a remote `OgePivotStore` receives: axis fields,
 * measures, the include/exclude value filters folded into one filter tree,
 * and the expanded paths of both axes.
 */
export function buildPivotLoadOptions(
  fields: readonly PivotFieldConfig[],
  rowExpandedPaths: readonly PivotPath[],
  columnExpandedPaths: readonly PivotPath[],
): PivotLoadOptions {
  const measures: SummaryDescriptor[] = pivotAreaFields(fields, 'data').map(
    (field) => ({
      field: field.dataField,
      type: field.summaryType ?? 'sum',
      name: field.summaryName,
    }),
  );
  // fold include/exclude value filters into one serializable filter tree
  const operands: FilterExpr[] = [];
  for (const field of fields) {
    if (!field.filterValues?.length || field.area === 'data') continue;
    const inExpr: FilterExpr = {
      type: 'binary',
      field: field.dataField,
      op: 'in',
      value: [...field.filterValues],
    };
    operands.push(
      field.filterType === 'exclude'
        ? { type: 'not', operand: inExpr }
        : inExpr,
    );
  }
  const axis = (area: PivotArea) =>
    pivotAreaFields(fields, area).map((field) => ({
      dataField: field.dataField,
      groupInterval: field.groupInterval,
      dir: field.sortOrder,
    }));
  return {
    rowFields: axis('row'),
    columnFields: axis('column'),
    measures,
    filter: operands.length
      ? operands.length === 1
        ? operands[0]
        : { type: 'and', operands }
      : null,
    rowExpandedPaths,
    columnExpandedPaths,
  };
}

/** The persistable UI state: per-field layout + expansion + panel flag. */
export function pivotStateSnapshot(
  fields: readonly PivotFieldConfig[],
  rowExpandedPaths: readonly PivotPath[],
  columnExpandedPaths: readonly PivotPath[],
  fieldPanelCollapsed: boolean,
): PivotGridStateSnapshot {
  return {
    fields: fields.map((field) => ({
      id: field.id,
      area: field.area ?? null,
      areaIndex: field.areaIndex,
      summaryType: field.summaryType,
      summaryDisplayMode: field.summaryDisplayMode,
      sortOrder: field.sortOrder,
      sortBySummaryField: field.sortBySummaryField,
      sortBySummaryPath: field.sortBySummaryPath,
      filterValues: field.filterValues,
      filterType: field.filterType,
    })),
    rowExpandedPaths,
    columnExpandedPaths,
    fieldPanelCollapsed,
  };
}

/** A snapshot's field entries as a layout-override map. */
export function pivotOverridesFromSnapshot(
  snapshot: PivotGridStateSnapshot,
): ReadonlyMap<string, Partial<PivotFieldConfig>> | null {
  if (!snapshot.fields) return null;
  const overrides = new Map<string, Partial<PivotFieldConfig>>();
  for (const entry of snapshot.fields) {
    const { id, ...rest } = entry;
    overrides.set(id, rest as Partial<PivotFieldConfig>);
  }
  return overrides;
}
