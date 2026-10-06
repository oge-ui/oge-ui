/**
 * The heatmap view model — what `<oge-heatmap>` / `<OgeHeatmap>` draw: a
 * category × category grid of cells coloured through a colour scale, the
 * two category axes, optional cell labels, the colour-scale legend, the
 * hover tooltip, the keyboard's active cell and a real two-dimensional
 * screen-reader table. Framework-free and pure.
 */
import {
  createFieldAccessor,
  ogeDateTimeFormat,
  ogeFormatMessage,
  ogeNumberFormat,
} from '@oge-ui/core';
import { formatOgeChartMessage, type OgeChartsMessages } from './charts-config';
import {
  resolveChartColorScale,
  type OgeChartColorScale,
  type OgeChartColorScaleLegend,
} from './color-scale';
import { chartLabelBox } from './data-labels';

type FieldExpr<T> = string | ((item: T) => unknown);

const accessorOf = <T>(expr: FieldExpr<T>): ((item: T) => unknown) =>
  typeof expr === 'string' ? createFieldAccessor<T>(expr) : expr;

/** The payload of a cell click / activation. */
export interface OgeChartHeatmapCellEvent<T = unknown> {
  readonly row: number;
  readonly column: number;
  readonly x: unknown;
  readonly y: unknown;
  readonly value: number | null;
  /** The data item; `undefined` for an empty cell. */
  readonly source: T | undefined;
}

export interface OgeHeatmapSceneInput<T> {
  readonly dataSource: readonly T[];
  /** Column category. Default `'x'`. */
  readonly xField: FieldExpr<T>;
  /** Row category. Default `'y'`. */
  readonly yField: FieldExpr<T>;
  readonly valueField: FieldExpr<T>;
  /** Column order; default the order of first appearance. */
  readonly xCategories?: readonly unknown[];
  /** Row order (top to bottom); default the order of first appearance. */
  readonly yCategories?: readonly unknown[];
  readonly colorScale?: OgeChartColorScale;
  /** Values printed in the cells (dropped where they do not fit). */
  readonly showLabels: boolean;
  /** Cell / tooltip / table text; default the locale number. */
  readonly valueFormat?: (value: number) => string;
  /** Gap between cells, px. */
  readonly cellGap: number;
  /** Column labels above or below the grid. Default `'bottom'`. */
  readonly xAxisPosition?: 'top' | 'bottom';
  /** Mirrors the columns (first column on the right). */
  readonly rtl?: boolean;
  readonly title?: string;
  readonly width: number;
  readonly height: number;
  readonly locale?: string;
  readonly messages: OgeChartsMessages;
}

export interface OgeHeatmapCellVm<T> {
  readonly key: string;
  readonly row: number;
  readonly column: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly fill: string;
  readonly empty: boolean;
  readonly valueText: string;
  /** Cell label; `null` when hidden or too big for the cell. */
  readonly labelText: string | null;
  readonly payload: OgeChartHeatmapCellEvent<T>;
}

export interface OgeHeatmapAxisLabelVm {
  readonly x: number;
  readonly y: number;
  readonly text: string;
  readonly anchor: 'start' | 'middle' | 'end';
  readonly index: number;
}

export interface OgeHeatmapScene<T> {
  readonly cells: readonly OgeHeatmapCellVm<T>[];
  readonly rows: number;
  readonly columns: number;
  readonly xLabels: readonly OgeHeatmapAxisLabelVm[];
  readonly yLabels: readonly OgeHeatmapAxisLabelVm[];
  readonly xCategories: readonly string[];
  readonly yCategories: readonly string[];
  readonly legend: OgeChartColorScaleLegend;
  readonly ariaLabel: string;
}

const round = (value: number): number => Math.round(value * 100) / 100;

const keyOf = (value: unknown): string =>
  value instanceof Date ? String(value.getTime()) : String(value ?? '');

export function buildHeatmapScene<T>(
  input: OgeHeatmapSceneInput<T>,
): OgeHeatmapScene<T> {
  const xOf = accessorOf(input.xField);
  const yOf = accessorOf(input.yField);
  const valueOf = accessorOf(input.valueField);
  const format =
    input.valueFormat ??
    ((v: number) =>
      ogeNumberFormat(input.locale, { maximumFractionDigits: 2 }).format(v));

  const collect = (
    explicit: readonly unknown[] | undefined,
    read: (item: T) => unknown,
  ) => {
    const order: unknown[] = [];
    const seen = new Map<string, number>();
    const add = (value: unknown): void => {
      const key = keyOf(value);
      if (seen.has(key)) return;
      seen.set(key, order.length);
      order.push(value);
    };
    if (explicit !== undefined) explicit.forEach(add);
    else for (const item of input.dataSource) add(read(item));
    return { order, seen };
  };
  const xs = collect(input.xCategories, xOf);
  const ys = collect(input.yCategories, yOf);
  const columns = xs.order.length;
  const rows = ys.order.length;
  const text = (value: unknown): string =>
    value instanceof Date
      ? ogeDateTimeFormat(input.locale, { dateStyle: 'medium' }).format(value)
      : String(value ?? '');
  const xCategories = xs.order.map(text);
  const yCategories = ys.order.map(text);

  const grid = new Map<string, { value: number | null; source: T }>();
  for (const item of input.dataSource) {
    const column = xs.seen.get(keyOf(xOf(item)));
    const row = ys.seen.get(keyOf(yOf(item)));
    if (column === undefined || row === undefined) continue;
    const raw = valueOf(item);
    grid.set(`${row}:${column}`, {
      value: typeof raw === 'number' && Number.isFinite(raw) ? raw : null,
      source: item,
    });
  }
  const scale = resolveChartColorScale(
    input.colorScale,
    [...grid.values()].map((entry) => entry.value),
    input.locale,
  );

  // margins: row labels at the inline start, column labels top / bottom
  const longestRow = Math.max(0, ...yCategories.map((label) => label.length));
  const rowLabelW =
    rows > 0 ? Math.min(input.width * 0.35, longestRow * 6.4 + 12) : 0;
  const colLabelH = columns > 0 ? 20 : 0;
  const pad = 4;
  const rtl = input.rtl === true;
  const top = pad + (input.xAxisPosition === 'top' ? colLabelH : 0);
  const gridW = Math.max(1, input.width - rowLabelW - pad * 2);
  const gridH = Math.max(1, input.height - colLabelH - pad * 2);
  const gridX = rtl ? pad : pad + rowLabelW;
  const gap = Math.max(0, input.cellGap);
  const cellW = columns > 0 ? gridW / columns : 0;
  const cellH = rows > 0 ? gridH / rows : 0;
  const colX = (column: number): number =>
    gridX + (rtl ? columns - 1 - column : column) * cellW;

  const cells: OgeHeatmapCellVm<T>[] = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const entry = grid.get(`${row}:${column}`);
      const value = entry?.value ?? null;
      const valueText =
        value === null ? input.messages.visuals.noValue : format(value);
      const x = colX(column) + gap / 2;
      const y = top + row * cellH + gap / 2;
      const w = Math.max(0, cellW - gap);
      const h = Math.max(0, cellH - gap);
      let labelText: string | null = null;
      if (input.showLabels && value !== null) {
        const box = chartLabelBox({
          x: 0,
          y: 0,
          text: valueText,
          anchor: 'middle',
        });
        if (box.w <= w - 2 && h >= 14) labelText = valueText;
      }
      cells.push({
        key: `${row}:${column}`,
        row,
        column,
        x: round(x),
        y: round(y),
        width: round(w),
        height: round(h),
        fill: scale.colorOf(value),
        empty: value === null,
        valueText,
        labelText,
        payload: {
          row,
          column,
          x: xs.order[column],
          y: ys.order[row],
          value,
          source: entry?.source,
        },
      });
    }
  }

  // column labels: thin out when they would collide
  const longestCol = Math.max(1, ...xCategories.map((label) => label.length));
  const every =
    cellW > 0 ? Math.max(1, Math.ceil((longestCol * 6.4 + 6) / cellW)) : 1;
  const labelY =
    input.xAxisPosition === 'top' ? pad + 13 : top + rows * cellH + 14;
  const xLabels: OgeHeatmapAxisLabelVm[] = xCategories
    .map((label, index) => ({
      x: round(colX(index) + cellW / 2),
      y: round(labelY),
      text: label,
      anchor: 'middle' as const,
      index,
    }))
    .filter((_, index) => index % every === 0);
  const rowEvery = cellH > 0 ? Math.max(1, Math.ceil(13 / cellH)) : 1;
  const yLabels: OgeHeatmapAxisLabelVm[] = yCategories
    .map((label, index) => ({
      // right-aligned against the grid; in RTL the column sits on the right
      x: round(rtl ? input.width - pad - rowLabelW + 6 : pad + rowLabelW - 6),
      y: round(top + index * cellH + cellH / 2 + 4),
      text: label,
      anchor: rtl ? ('start' as const) : ('end' as const),
      index,
    }))
    .filter((_, index) => index % rowEvery === 0);

  return {
    cells,
    rows,
    columns,
    xLabels,
    yLabels,
    xCategories,
    yCategories,
    legend: scale.legend,
    ariaLabel: ogeFormatMessage(
      input.messages.visuals.heatmapLabel,
      { title: input.title ?? '', rows, columns },
      input.locale,
    ).trim(),
  };
}

/** The cell at (row, column). */
export function heatmapCell<T>(
  scene: OgeHeatmapScene<T>,
  row: number,
  column: number,
): OgeHeatmapCellVm<T> | undefined {
  return scene.cells[row * scene.columns + column];
}

export interface OgeHeatmapTooltipVm {
  readonly x: number;
  readonly y: number;
  readonly label: string;
  readonly valueText: string;
  readonly flipX: boolean;
}

/** The hover balloon of a cell (`key` = `row:column`). */
export function heatmapTooltip<T>(
  scene: OgeHeatmapScene<T>,
  key: string | null,
  width: number,
): OgeHeatmapTooltipVm | null {
  if (key === null) return null;
  const cell = scene.cells.find((entry) => entry.key === key);
  if (cell === undefined) return null;
  const right = cell.x + cell.width / 2 > width / 2;
  return {
    x: right ? cell.x - 6 : cell.x + cell.width + 6,
    y: cell.y + cell.height / 2,
    label: `${scene.yCategories[cell.row]} · ${scene.xCategories[cell.column]}`,
    valueText: cell.valueText,
    flipX: right,
  };
}

/** The live-region text of a cell. */
export function heatmapAnnouncement<T>(
  scene: OgeHeatmapScene<T>,
  cell: OgeHeatmapCellVm<T>,
  messages: OgeChartsMessages,
): string {
  return formatOgeChartMessage(messages.visuals.cell, {
    row: scene.yCategories[cell.row] ?? '',
    column: scene.xCategories[cell.column] ?? '',
    value: cell.valueText,
  });
}

/** The screen-reader table: one row per row category, one column per column category. */
export function heatmapSrTable<T>(
  scene: OgeHeatmapScene<T>,
  messages: OgeChartsMessages,
  limit: number,
): {
  readonly headers: readonly string[];
  readonly rows: readonly {
    readonly argText: string;
    readonly cells: readonly string[];
  }[];
} {
  const rows: { argText: string; cells: string[] }[] = [];
  for (let row = 0; row < Math.min(scene.rows, limit); row++) {
    const cells: string[] = [];
    for (let column = 0; column < scene.columns; column++) {
      cells.push(heatmapCell(scene, row, column)?.valueText ?? '');
    }
    rows.push({ argText: scene.yCategories[row], cells });
  }
  return {
    headers: [messages.aria.argumentHeader, ...scene.xCategories],
    rows,
  };
}
