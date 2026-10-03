import {
  applyDisplayModes,
  pathKey,
  type PivotAxisNode,
  type PivotFieldConfig,
  type PivotResult,
  type PivotRunningTotal,
  type PivotSlot,
  type PivotSummaryDisplayMode,
} from '@oge-ui/core';

/**
 * A measure computed from the other measures of the same cell — the
 * `calculatedFields` input / prop. It is evaluated on every visible cell,
 * subtotals and grand totals included, so a ratio stays a ratio of the
 * totals (`sum(profit) / sum(revenue)`), never a sum of ratios.
 *
 * ```ts
 * { name: 'margin', caption: 'Margin', expression: (v) => v.revenue ? (v.profit ?? 0) / v.revenue : null,
 *   format: (v) => `${(Number(v) * 100).toFixed(1)}%` }
 * ```
 */
export interface OgePivotCalculatedField {
  /** Unique id — it becomes the measure id (`measureId` in cell payloads). */
  readonly name: string;
  /** Header / chooser label; defaults to `name`. */
  readonly caption?: string;
  /**
   * The value of one cell from that cell's measure values, keyed by measure
   * id (values as displayed: a measure's own display mode is applied).
   * Return `null` for "no value"; non-finite results become `null`.
   */
  readonly expression: (
    values: Readonly<Record<string, number | null>>,
    cell: OgePivotCalculatedCell,
  ) => number | null;
  /** Display formatting; default: the number formatting of measures. */
  readonly format?: (value: unknown) => string;
  /**
   * Post-processing like a measure's `summaryDisplayMode`: percent of the
   * row / column / grand total, `absoluteVariation` (difference from the
   * previous column), `percentVariation`. Default `'none'`.
   */
  readonly displayMode?: PivotSummaryDisplayMode;
  /** Running total along the rows or the columns (applied before `displayMode`). */
  readonly runningTotal?: PivotRunningTotal;
}

/** Where a calculated value is being evaluated. */
export interface OgePivotCalculatedCell {
  readonly rowPath: readonly unknown[];
  readonly columnPath: readonly unknown[];
  readonly isTotal: boolean;
  readonly isGrandTotal: boolean;
}

/** One axis' matrix slots in leaf order — what the display pass reads. */
export function pivotSlotsOf(
  nodes: readonly PivotAxisNode[],
  count: number,
): PivotSlot[] {
  const slots: PivotSlot[] = new Array<PivotSlot>(count);
  const visit = (list: readonly PivotAxisNode[], level: number): void => {
    for (const node of list) {
      if (node.leafIndex >= 0) {
        slots[node.leafIndex] = {
          path: node.path,
          level: node.isGrandTotal ? -1 : level,
          parentKey:
            node.path.length <= 1 ? null : pathKey(node.path.slice(0, -1)),
          isTotal: node.isTotal,
          isGrandTotal: node.isGrandTotal,
        };
      }
      visit(node.children, level + 1);
    }
  };
  visit(nodes, 0);
  for (let i = 0; i < count; i++) {
    slots[i] ??= {
      path: [],
      level: 0,
      parentKey: null,
      isTotal: false,
      isGrandTotal: false,
    };
  }
  return slots;
}

/** The measure config a calculated field shows up as. */
export function pivotCalculatedMeasureOf(
  field: OgePivotCalculatedField,
  index: number,
): PivotFieldConfig {
  return {
    id: field.name,
    dataField: field.name,
    caption: field.caption ?? field.name,
    area: 'data',
    areaIndex: 10_000 + index,
    dataType: 'number',
    summaryType: 'custom',
    summaryDisplayMode: field.displayMode ?? 'none',
    ...(field.runningTotal ? { runningTotal: field.runningTotal } : {}),
  };
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Appends the calculated measures to a materialized pivot: evaluates each
 * expression per cell over that cell's measure values, then runs the
 * fields' running totals / display modes over the new values with the same
 * routine the engine uses for regular measures. Returns `result` unchanged
 * without calculated fields.
 */
export function applyPivotCalculatedFields(
  result: PivotResult,
  fields: readonly OgePivotCalculatedField[],
): PivotResult {
  if (!fields.length) return result;
  const rowSlots = pivotSlotsOf(result.rowRoot, result.rowLeafCount);
  const columnSlots = pivotSlotsOf(result.columnRoot, result.columnLeafCount);
  const measures = result.measures;
  const calculated: unknown[][][] = [];
  for (let r = 0; r < result.rowLeafCount; r++) {
    const line: unknown[][] = [];
    for (let c = 0; c < result.columnLeafCount; c++) {
      const base = result.values[r]?.[c] ?? [];
      const values: Record<string, number | null> = {};
      let any = false;
      measures.forEach((measure, m) => {
        const value = asNumber(base[m]);
        if (value !== null) any = true;
        values[measure.id] = value;
      });
      const cell: OgePivotCalculatedCell = {
        rowPath: rowSlots[r].path,
        columnPath: columnSlots[c].path,
        isTotal: rowSlots[r].isTotal || columnSlots[c].isTotal,
        isGrandTotal: rowSlots[r].isGrandTotal || columnSlots[c].isGrandTotal,
      };
      // a cell with no measure value at all (hidden totals) stays blank
      line.push(
        fields.map((field) => {
          if (!any) return null;
          try {
            return asNumber(field.expression(values, cell));
          } catch {
            return null;
          }
        }),
      );
    }
    calculated.push(line);
  }
  const configs = fields.map((field, index) =>
    pivotCalculatedMeasureOf(field, index),
  );
  applyDisplayModes(calculated, rowSlots, columnSlots, configs);
  return {
    ...result,
    measures: [...measures, ...configs],
    values: result.values.map((line, r) =>
      line.map((cell, c) => [...cell, ...(calculated[r]?.[c] ?? [])]),
    ),
  };
}
