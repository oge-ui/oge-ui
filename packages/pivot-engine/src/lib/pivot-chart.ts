import type { PivotAxisNode, PivotPath, PivotResult } from '@oge-ui/core';

/**
 * Pivot → chart binding as plain data. The pivot packages do not depend on
 * `@oge-ui/charts`: this returns a `dataSource` + `series` pair whose shape
 * is what `<oge-chart>` / `<OgeChart>` take, and the app wires the two.
 */
export interface OgePivotChartOptions {
  /** The pivot axis whose lines become the chart's arguments. Default `'row'`. */
  argumentAxis?: 'row' | 'column';
  /** Measure ids to chart, in this order. Default: every measure. */
  measures?: readonly string[];
  /** Expanded-parent (subtotal) lines join the chart. Default false. */
  includeTotals?: boolean;
  /** Grand-total lines join the chart. Default false. */
  includeGrandTotals?: boolean;
  /**
   * Only these argument-axis lines (matrix indexes, e.g. the selected pivot
   * rows). Default: all of them.
   */
  argumentIndexes?: readonly number[];
  /** Only these series-axis lines (matrix indexes). Default: all of them. */
  seriesIndexes?: readonly number[];
  /** The series `type` every series gets. Default `'bar'`. */
  type?: string;
  /** Joins a path into a label (`Europe / France`). Default `' / '`. */
  pathSeparator?: string;
  /** Label of grand-total lines. Default `Grand Total`. */
  grandTotalText?: string;
}

/** One chart argument: its label, its pivot path, a value per series. */
export interface OgePivotChartPoint {
  readonly argument: string;
  readonly argumentPath: PivotPath;
  readonly [valueField: string]: unknown;
}

/** One chart series — assignable to the charts' series input. */
export interface OgePivotChartSeries {
  readonly type: string;
  readonly name: string;
  readonly argumentField: 'argument';
  readonly valueField: string;
  /** The measure the series plots. */
  readonly measureId: string;
  /** The series-axis path it plots (`[]` for the grand total). */
  readonly path: PivotPath;
}

/** `dataSource` + `series` for a chart — see {@link toChartSeries}. */
export interface OgePivotChartData {
  readonly dataSource: OgePivotChartPoint[];
  readonly series: OgePivotChartSeries[];
}

interface Line {
  readonly index: number;
  readonly label: string;
  readonly path: PivotPath;
  readonly isTotal: boolean;
  readonly isGrandTotal: boolean;
}

function axisLines(
  root: readonly PivotAxisNode[],
  separator: string,
  grandText: string,
): Line[] {
  const lines: Line[] = [];
  const visit = (nodes: readonly PivotAxisNode[], labels: string[]): void => {
    for (const node of nodes) {
      const own = node.isGrandTotal ? grandText : node.text;
      const path = [...labels, own];
      if (node.leafIndex >= 0) {
        lines.push({
          index: node.leafIndex,
          label: path.join(separator),
          path: node.path,
          isTotal: node.isTotal,
          isGrandTotal: node.isGrandTotal,
        });
      }
      visit(node.children, path);
    }
  };
  visit(root, []);
  return lines.sort((a, b) => a.index - b.index);
}

/** Lines that take part: leaves, plus totals on request; grand only if alone. */
function chartLines(
  lines: Line[],
  options: OgePivotChartOptions,
  pick: readonly number[] | undefined,
): Line[] {
  const regular = lines.filter((line) => !line.isGrandTotal);
  const kept = lines.filter((line) => {
    if (line.isGrandTotal)
      return options.includeGrandTotals === true || regular.length === 0;
    if (line.isTotal) return options.includeTotals === true;
    return true;
  });
  if (!pick) return kept;
  const wanted = new Set(pick);
  return kept.filter((line) => wanted.has(line.index));
}

/**
 * Turns the current pivot view into chart data: one argument per visible
 * argument-axis line (the deepest expanded level — expanding or collapsing
 * the pivot re-shapes the chart), one series per series-axis line ×
 * measure. Respects the expand state, hidden totals and a selection
 * (`argumentIndexes`).
 *
 * ```ts
 * const chart = toChartSeries(pivot.getResult(), { type: 'bar' });
 * // <oge-chart [dataSource]="chart.dataSource" [series]="chart.series" />
 * ```
 */
export function toChartSeries(
  result: PivotResult,
  options: OgePivotChartOptions = {},
): OgePivotChartData {
  const separator = options.pathSeparator ?? ' / ';
  const grandText = options.grandTotalText ?? 'Grand Total';
  const byRows = (options.argumentAxis ?? 'row') === 'row';
  const rowLines = axisLines(result.rowRoot, separator, grandText);
  const columnLines = axisLines(result.columnRoot, separator, grandText);
  const args = chartLines(
    byRows ? rowLines : columnLines,
    options,
    options.argumentIndexes,
  );
  const seriesLines = chartLines(
    byRows ? columnLines : rowLines,
    options,
    options.seriesIndexes,
  );
  const measureIndexes = (
    options.measures
      ? options.measures.map((id) =>
          result.measures.findIndex((measure) => measure.id === id),
        )
      : result.measures.map((_, index) => index)
  ).filter((index) => index >= 0);
  const several = measureIndexes.length > 1;
  const type = options.type ?? 'bar';
  const series: OgePivotChartSeries[] = [];
  const cells: { line: Line; measure: number; field: string }[] = [];
  for (const line of seriesLines) {
    for (const m of measureIndexes) {
      const measure = result.measures[m];
      const caption = measure.caption ?? measure.dataField;
      const field = `s${String(series.length)}`;
      // a series axis without fields only has its grand total: name the
      // series after the measure instead
      const name =
        line.isGrandTotal && seriesLines.length === 1
          ? caption
          : several
            ? `${line.label} · ${caption}`
            : line.label;
      series.push({
        type,
        name,
        argumentField: 'argument',
        valueField: field,
        measureId: measure.id,
        path: line.path,
      });
      cells.push({ line, measure: m, field });
    }
  }
  const dataSource = args.map((arg) => {
    const point: Record<string, unknown> = {
      argument: arg.label,
      argumentPath: arg.path,
    };
    for (const cell of cells) {
      const value = byRows
        ? result.values[arg.index]?.[cell.line.index]?.[cell.measure]
        : result.values[cell.line.index]?.[arg.index]?.[cell.measure];
      point[cell.field] = typeof value === 'number' ? value : null;
    }
    return point as OgePivotChartPoint;
  });
  return { dataSource, series };
}
