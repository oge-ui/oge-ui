/**
 * A sheet's sparklines, ready to draw (`ogeDrawSparkline`): each one's
 * points read from its data — on this or another sheet — the way Excel
 * reads them, its axis (the sparkline's own, the group's, or custom), and
 * its group's colours resolved through the theme. Measured on Excel
 * (`testing/corpus/sparklines.*`):
 *
 * - numbers plot; text counts as 0, TRUE as 1 and FALSE as 0; `#N/A` is
 *   left out with the line joined over it, any other error counts as 0;
 * - an empty cell is a gap, a zero or joined over (`displayEmptyCellsAs`,
 *   default `zero`);
 * - hidden rows and columns drop their points altogether — the others
 *   spread over the cell — unless the group shows hidden data.
 */
import { parseOgeRangeAddress } from '../address/address';
import { isOgeRichText, type OgeCellValue } from '../model/cell';
import type { OgeColor } from '../color/color';
import type { OgeSparkline, OgeSparklineGroup } from '../model/sparkline';
import type { OgeWorkbook } from '../model/workbook';
import type { OgeWorksheet } from '../model/worksheet';
import type { OgeSparklinePainter } from './paint-window';
import type { OgeStyleResolver } from './resolve-style';
import {
  ogeSparklineAxis,
  type OgeSparklinePaintColors,
  type OgeSparklineSpec,
  type OgeSparklineValue,
} from './sparkline';

/** Excel's colours for a group that leaves one out: its default style. */
const DEFAULT_COLORS: Readonly<
  Record<keyof OgeSparklinePaintColors, OgeColor>
> = {
  series: { theme: 4, tint: -0.499984740745262 },
  negative: { theme: 5 },
  axis: { rgb: 'FF000000' },
  markers: { theme: 4, tint: -0.499984740745262 },
  first: { theme: 4, tint: 0.39997558519241921 },
  last: { theme: 4, tint: 0.39997558519241921 },
  high: { theme: 4 },
  low: { theme: 4 },
};

interface Placed {
  readonly group: OgeSparklineGroup;
  readonly sparkline: OgeSparkline;
}

export class OgeSparklineFormatter implements OgeSparklinePainter {
  private readonly byCell = new Map<number, Placed>();
  private readonly rows = new Map<number, number[]>();
  private readonly specs = new Map<number, OgeSparklineSpec | null>();
  private readonly points = new Map<
    OgeSparkline,
    readonly OgeSparklineValue[] | null
  >();
  private readonly extents = new Map<
    OgeSparklineGroup,
    { min: number; max: number } | null
  >();
  private readonly colors = new Map<
    OgeSparklineGroup,
    OgeSparklinePaintColors
  >();

  constructor(
    private readonly workbook: OgeWorkbook,
    private readonly sheet: OgeWorksheet,
    private readonly resolver: OgeStyleResolver,
  ) {
    for (const group of sheet.sparklineGroups)
      for (const sparkline of group.sparklines) {
        const key = sparkline.cell.row * 16384 + sparkline.cell.col;
        // a later group's sparkline in the same cell wins, as Excel draws one
        this.byCell.set(key, { group, sparkline });
        const row = this.rows.get(sparkline.cell.row);
        if (row) row.push(sparkline.cell.col);
        else this.rows.set(sparkline.cell.row, [sparkline.cell.col]);
      }
  }

  /** Whether the sheet has any sparkline. */
  get active(): boolean {
    return this.byCell.size > 0;
  }

  /** The columns of a row that hold a sparkline. */
  columns(row: number): readonly number[] {
    return this.rows.get(row) ?? [];
  }

  /** What the sparkline in a cell draws, or `undefined` when the cell has none. */
  at(row: number, col: number): OgeSparklineSpec | undefined {
    const key = row * 16384 + col;
    const placed = this.byCell.get(key);
    if (!placed) return undefined;
    let spec = this.specs.get(key);
    if (spec === undefined) {
      spec = this.build(placed);
      this.specs.set(key, spec);
    }
    return spec ?? undefined;
  }

  private build({ group, sparkline }: Placed): OgeSparklineSpec | null {
    const values = this.valuesOf(group, sparkline);
    if (!values) return null;
    const numbers = values.filter((v): v is number => typeof v === 'number');
    const extent = this.extentOf(group);
    const dates = group.dateRef ? this.datesOf(group, sparkline) : undefined;
    return {
      type: group.type,
      values,
      ...(dates ? { dates } : {}),
      axis: ogeSparklineAxis(numbers, {
        minAxisType: group.minAxisType,
        maxAxisType: group.maxAxisType,
        ...(group.manualMin !== undefined
          ? { manualMin: group.manualMin }
          : {}),
        ...(group.manualMax !== undefined
          ? { manualMax: group.manualMax }
          : {}),
        ...(extent ? { groupMin: extent.min, groupMax: extent.max } : {}),
      }),
      lineWeight: group.lineWeight,
      markers: group.markers,
      high: group.high,
      low: group.low,
      first: group.first,
      last: group.last,
      negative: group.negative,
      displayXAxis: group.displayXAxis,
      rightToLeft: group.rightToLeft,
      colors: this.colorsOf(group),
    };
  }

  /** A sparkline's points in data order, hidden cells dropped; `null` without readable data. */
  private valuesOf(
    group: OgeSparklineGroup,
    sparkline: OgeSparkline,
  ): readonly OgeSparklineValue[] | null {
    let known = this.points.get(sparkline);
    if (known !== undefined) return known;
    known = null;
    const cells = this.cellsOf(sparkline.ref, group.displayHidden);
    if (cells) {
      known = cells.map(({ sheet, row, col }) =>
        pointOf(sheet.getValue(row, col), group.displayEmptyCellsAs),
      );
    }
    this.points.set(sparkline, known);
    return known;
  }

  /** The dates of a date axis, one per point that shows. */
  private datesOf(
    group: OgeSparklineGroup,
    sparkline: OgeSparkline,
  ): readonly (number | undefined)[] | undefined {
    const all = this.cellsOf(group.dateRef, true);
    const data = this.cellsOf(sparkline.ref, true);
    if (!all || !data || all.length !== data.length) return undefined;
    const shown = new Set(
      (this.cellsOf(sparkline.ref, group.displayHidden) ?? []).map(
        (c) => c.index,
      ),
    );
    return all
      .filter((_, i) => shown.has(i))
      .map(({ sheet, row, col }) => {
        const v = sheet.getValue(row, col);
        return typeof v === 'number' ? v : undefined;
      });
  }

  /** The numbers of every sparkline in a group, for `group` axis ends. */
  private extentOf(
    group: OgeSparklineGroup,
  ): { min: number; max: number } | null {
    if (group.minAxisType !== 'group' && group.maxAxisType !== 'group')
      return null;
    let known = this.extents.get(group);
    if (known !== undefined) return known;
    let min = Infinity;
    let max = -Infinity;
    for (const sparkline of group.sparklines)
      for (const v of this.valuesOf(group, sparkline) ?? [])
        if (typeof v === 'number') {
          if (v < min) min = v;
          if (v > max) max = v;
        }
    known = min <= max ? { min, max } : null;
    this.extents.set(group, known);
    return known;
  }

  private colorsOf(group: OgeSparklineGroup): OgeSparklinePaintColors {
    let known = this.colors.get(group);
    if (known) return known;
    const resolve = (part: keyof OgeSparklinePaintColors) =>
      (this.resolver.color(group.colors[part] ?? DEFAULT_COLORS[part], null) ??
        this.resolver.color(DEFAULT_COLORS[part], '#000000')) as string;
    known = {
      series: resolve('series'),
      negative: resolve('negative'),
      axis: resolve('axis'),
      markers: resolve('markers'),
      first: resolve('first'),
      last: resolve('last'),
      high: resolve('high'),
      low: resolve('low'),
    };
    this.colors.set(group, known);
    return known;
  }

  /** The cells of a one-row or one-column reference, in order (a block row by row). */
  private cellsOf(
    ref: string | undefined,
    withHidden: boolean,
  ): { sheet: OgeWorksheet; row: number; col: number; index: number }[] | null {
    const range = ref ? parseOgeRangeAddress(ref) : null;
    // whole rows or columns, or a 3-D reference, are not sparkline data
    if (
      !range ||
      (range.kind !== 'cell' && range.kind !== 'range') ||
      range.lastSheet !== undefined
    )
      return null;
    const sheet =
      range.sheet === undefined
        ? this.sheet
        : this.workbook.sheets.find(
            (s) =>
              s.name.toLowerCase() === (range.sheet as string).toLowerCase(),
          );
    if (!sheet) return null;
    const out: {
      sheet: OgeWorksheet;
      row: number;
      col: number;
      index: number;
    }[] = [];
    let index = 0;
    for (let row = range.top; row <= range.bottom; row++)
      for (let col = range.left; col <= range.right; col++, index++) {
        if (
          !withHidden &&
          (rowHidden(sheet, row) || sheet.getColumn(col)?.hidden)
        )
          continue;
        out.push({ sheet, row, col, index });
      }
    return out;
  }
}

/**
 * A row hides when its record says so, or on a zeroHeight sheet when the
 * sheet does not list it (no record, no cell).
 */
function rowHidden(sheet: OgeWorksheet, row: number): boolean {
  const info = sheet.getRow(row);
  return info ? !!info.hidden : !!sheet.format.zeroHeight && !sheet.hasRow(row);
}

/** A data cell as Excel plots it. */
function pointOf(
  value: OgeCellValue | undefined,
  empty: OgeSparklineGroup['displayEmptyCellsAs'],
): OgeSparklineValue {
  if (value === undefined)
    return empty === 'zero' ? 0 : empty === 'span' ? 'join' : 'gap';
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'string' || isOgeRichText(value)) return 0;
  return value.code === '#N/A' ? 'join' : 0;
}
