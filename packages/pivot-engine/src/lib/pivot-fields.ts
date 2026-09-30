import { humanize } from '@oge-ui/behavior';
import type {
  CustomSummaryMap,
  FilterExpr,
  PivotArea,
  PivotFieldConfig,
  PivotFieldFns,
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

/** Selector / formatter / text hook per field id (only fields that have one). */
export function pivotFieldFnsOf<T>(
  defs: readonly OgePivotFieldDef<T>[],
): Readonly<Record<string, PivotFieldFns<T>>> {
  const fns: Record<string, PivotFieldFns<T>> = {};
  for (const def of defs) {
    const id = def.id ?? def.dataField;
    const { selector, format, customizeText } = def;
    if (selector || format || customizeText)
      fns[id] = { selector, format, customizeText };
  }
  return fns;
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
