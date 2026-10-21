/**
 * Conditional formatting without a formula engine (phase P1): the rules
 * Excel evaluates from values alone — comparisons with constants, text
 * tests, blanks and errors, duplicates, top/bottom N, above/below average,
 * dates in a period, colour scales, data bars and icon sets. Rules that need
 * formulas (`expression`, comparisons with references) wait for the formula
 * engine (P3); the reader reports them as an import issue.
 *
 * Rules apply in priority order; several may apply to one cell, a higher
 * priority winning each property it sets, and `stopIfTrue` ends the list.
 */
import { ogeRangeContains, type OgeSheetRange } from '../address/address';
import {
  ogeDateToSerial,
  ogeSerialToDateParts,
  type OgeDateSystem,
} from '../date/date-serial';
import { formatOgeGeneral } from '../format/general';
import {
  isOgeCellError,
  isOgeRichText,
  ogeRichTextToString,
  type OgeCell,
  type OgeCellValue,
} from '../model/cell';
import type {
  OgeConditionalFormat,
  OgeConditionalRule,
  OgeConditionalValue,
} from '../model/sheet-features';
import type { OgeCellStyle } from '../model/style';
import type { OgeWorkbook } from '../model/workbook';
import type { OgeWorksheet } from '../model/worksheet';
import type {
  OgeConditionalPaint,
  OgeConditionalPainter,
} from './paint-window';
import type { OgeStyleResolver } from './resolve-style';

/** Options of {@link OgeConditionalFormatter}. */
export interface OgeConditionalFormatterOptions {
  /** "Today" for the date-period rules. Default: now. */
  readonly now?: Date;
}

/** A constant a rule compares with; `undefined` when the formula is not one. */
export function ogeConditionalConstant(
  formula: string,
): number | string | boolean | undefined {
  const text = formula.trim();
  if (/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(text)) return Number(text);
  if (/^"(?:[^"]|"")*"$/.test(text))
    return text.slice(1, -1).replace(/""/g, '"');
  const upper = text.toUpperCase();
  if (upper === 'TRUE') return true;
  if (upper === 'FALSE') return false;
  return undefined;
}

/** Whether a rule can be evaluated without formulas. */
export function ogeConditionalRuleSupported(rule: OgeConditionalRule): boolean {
  switch (rule.type) {
    case 'expression':
      return false;
    case 'cellIs':
      return (
        rule.formulas.length > 0 &&
        rule.formulas.every((f) => ogeConditionalConstant(f) !== undefined)
      );
    case 'colorScale':
      return (
        !!rule.colorScale &&
        rule.colorScale.values.every((v) => v.type !== 'formula')
      );
    case 'dataBar':
      return (
        !!rule.dataBar &&
        rule.dataBar.min.type !== 'formula' &&
        rule.dataBar.max.type !== 'formula'
      );
    case 'iconSet':
      return (
        !!rule.iconSet && rule.iconSet.values.every((v) => v.type !== 'formula')
      );
    default:
      return true;
  }
}

/** Statistics of a format's numbers, computed once. */
interface Stats {
  readonly numbers: readonly number[];
  readonly sorted: readonly number[];
  readonly sum: number;
  /** Occurrences of each value (text folded to upper case). */
  readonly counts: ReadonlyMap<string, number>;
}

function valueKey(value: OgeCellValue | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'number') return `n${value}`;
  if (typeof value === 'boolean') return `b${value}`;
  if (typeof value === 'string')
    return value === '' ? undefined : `s${value.toUpperCase()}`;
  if (isOgeRichText(value))
    return `s${ogeRichTextToString(value).toUpperCase()}`;
  return `e${value.code}`;
}

function textOf(value: OgeCellValue | undefined): string {
  if (value === undefined) return '';
  if (typeof value === 'number')
    return formatOgeGeneral(value) ?? String(value);
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'string') return value;
  if (isOgeRichText(value)) return ogeRichTextToString(value);
  return value.code;
}

/** Excel's comparison: numbers < text < booleans; text without case. */
function compare(
  a: OgeCellValue | undefined,
  b: number | string | boolean,
): number {
  const rank = (v: unknown) =>
    typeof v === 'number'
      ? 0
      : typeof v === 'string'
        ? 1
        : typeof v === 'boolean'
          ? 2
          : 3;
  const left =
    a === undefined ? 0 : isOgeRichText(a) ? ogeRichTextToString(a) : a;
  if (isOgeCellError(left)) return Number.NaN;
  const ra = rank(left);
  const rb = rank(b);
  if (ra !== rb) return ra - rb;
  if (typeof left === 'number') return left - (b as number);
  if (typeof left === 'string') {
    const x = left.toUpperCase();
    const y = (b as string).toUpperCase();
    return x < y ? -1 : x > y ? 1 : 0;
  }
  return Number(left) - Number(b);
}

function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0;
  // Excel's PERCENTILE.INC: linear between closest ranks
  const at = (sorted.length - 1) * Math.min(1, Math.max(0, p));
  const low = Math.floor(at);
  const high = Math.ceil(at);
  return sorted[low] + (sorted[high] - sorted[low]) * (at - low);
}

function threshold(
  value: OgeConditionalValue,
  stats: Stats,
  fallback: number,
): number {
  const { sorted } = stats;
  const min = sorted[0] ?? 0;
  const max = sorted[sorted.length - 1] ?? 0;
  const n = Number(value.value);
  switch (value.type) {
    case 'min':
    case 'autoMin':
      return min;
    case 'max':
    case 'autoMax':
      return max;
    case 'num':
      return Number.isFinite(n) ? n : fallback;
    case 'percent':
      return Number.isFinite(n) ? min + ((max - min) * n) / 100 : fallback;
    case 'percentile':
      return Number.isFinite(n) ? percentile(sorted, n / 100) : fallback;
    default:
      return fallback;
  }
}

function channel(hex: string, at: number): number {
  return parseInt(hex.slice(at, at + 2), 16);
}

/**
 * Linear mix in RGB as Excel blends colour scales: the step from the first
 * colour is truncated (measured: 249.5 shows as 249, 130.8 down from 255 as 131).
 */
function blend(a: string, b: string, t: number): string {
  let out = '#';
  for (const at of [1, 3, 5]) {
    const v =
      channel(a, at) + Math.trunc((channel(b, at) - channel(a, at)) * t);
    out += v.toString(16).padStart(2, '0').toUpperCase();
  }
  return out;
}

const PERIOD_DAYS: Readonly<Record<string, readonly [number, number]>> = {
  today: [0, 0],
  yesterday: [-1, -1],
  tomorrow: [1, 1],
  last7Days: [-6, 0],
};

/** Evaluates a sheet's conditional formats for the paint window. */
export class OgeConditionalFormatter implements OgeConditionalPainter {
  private readonly stats = new Map<OgeConditionalFormat, Stats>();
  private readonly buckets = new Map<number, OgeConditionalFormat[]>();
  private readonly today: number;

  constructor(
    private readonly workbook: OgeWorkbook,
    private readonly sheet: OgeWorksheet,
    private readonly resolver: OgeStyleResolver,
    options: OgeConditionalFormatterOptions = {},
  ) {
    const now = options.now ?? new Date();
    this.today = Math.floor(ogeDateToSerial(now, workbook.dateSystem) ?? 0);
    for (const format of sheet.conditionalFormats) {
      for (const range of format.ranges) {
        const last = Math.floor(
          Math.min(range.bottom, range.top + 1_048_575) / 256,
        );
        for (let b = Math.floor(range.top / 256); b <= last; b++) {
          const list = this.buckets.get(b);
          if (!list) this.buckets.set(b, [format]);
          else if (!list.includes(format)) list.push(format);
        }
      }
    }
  }

  /** Whether the sheet has any rule this formatter evaluates. */
  get active(): boolean {
    return this.buckets.size > 0;
  }

  private statsOf(format: OgeConditionalFormat): Stats {
    const known = this.stats.get(format);
    if (known) return known;
    const numbers: number[] = [];
    const counts = new Map<string, number>();
    const visit = (range: OgeSheetRange) =>
      this.sheet.forEachCell((cell) => {
        const key = valueKey(cell.value);
        if (key !== undefined) counts.set(key, (counts.get(key) ?? 0) + 1);
        if (typeof cell.value === 'number') numbers.push(cell.value);
      }, range);
    format.ranges.forEach(visit);
    const sorted = [...numbers].sort((a, b) => a - b);
    const stats: Stats = {
      numbers,
      sorted,
      sum: numbers.reduce((s, n) => s + n, 0),
      counts,
    };
    this.stats.set(format, stats);
    return stats;
  }

  paint(
    row: number,
    col: number,
    cell: OgeCell | undefined,
  ): OgeConditionalPaint | undefined {
    const formats = this.buckets.get(Math.floor(row / 256));
    if (!formats) return undefined;
    const rules: { rule: OgeConditionalRule; format: OgeConditionalFormat }[] =
      [];
    for (const format of formats) {
      if (!format.ranges.some((range) => ogeRangeContains(range, row, col)))
        continue;
      for (const rule of format.rules) rules.push({ rule, format });
    }
    if (rules.length === 0) return undefined;
    rules.sort((a, b) => a.rule.priority - b.rule.priority);
    const value = cell?.value;
    let patch: OgeCellStyle | undefined;
    let fill: OgeConditionalPaint['fill'];
    let dataBar: OgeConditionalPaint['dataBar'];
    let icon: OgeConditionalPaint['icon'];
    for (const { rule, format } of rules) {
      if (!ogeConditionalRuleSupported(rule)) continue;
      const stats = this.statsOf(format);
      if (rule.type === 'colorScale' && rule.colorScale) {
        if (fill || typeof value !== 'number') continue;
        const colors = rule.colorScale.colors.map(
          (c) => this.resolver.color(c, '#FFFFFF') as string,
        );
        const points = rule.colorScale.values.map((v) =>
          threshold(v, stats, 0),
        );
        let color = colors[colors.length - 1];
        if (value <= points[0]) color = colors[0];
        else {
          for (let i = 1; i < points.length; i++) {
            if (value <= points[i]) {
              const span = points[i] - points[i - 1];
              color = blend(
                colors[i - 1],
                colors[i],
                span === 0 ? 1 : (value - points[i - 1]) / span,
              );
              break;
            }
          }
        }
        fill = { css: color, color };
        continue;
      }
      if (rule.type === 'dataBar' && rule.dataBar) {
        if (dataBar || typeof value !== 'number') continue;
        const bar = rule.dataBar;
        const min = threshold(bar.min, stats, stats.sorted[0] ?? 0);
        const max = threshold(
          bar.max,
          stats,
          stats.sorted[stats.sorted.length - 1] ?? 0,
        );
        const t =
          max === min
            ? 1
            : Math.min(1, Math.max(0, (value - min) / (max - min)));
        const length =
          (bar.minLength + (bar.maxLength - bar.minLength) * t) / 100;
        dataBar = {
          from: 0,
          to: length,
          color: this.resolver.color(bar.color, '#638EC6') as string,
          negative: value < 0,
          showValue: bar.showValue,
        };
        continue;
      }
      if (rule.type === 'iconSet' && rule.iconSet) {
        if (icon || typeof value !== 'number') continue;
        const set = rule.iconSet;
        let index = 0;
        set.values.forEach((v, i) => {
          if (i === 0) return;
          const point = threshold(v, stats, Number.POSITIVE_INFINITY);
          if (v.greaterThan ? value > point : value >= point) index = i;
        });
        if (set.reverse) index = set.values.length - 1 - index;
        icon = { set: set.iconSet, index, showValue: set.showValue };
        continue;
      }
      if (!this.matches(rule, value, stats)) continue;
      const dxf =
        rule.dxf !== undefined ? this.workbook.dxfs[rule.dxf] : undefined;
      if (dxf) patch = mergeUnset(patch, dxf);
      if (rule.stopIfTrue) break;
    }
    if (!patch && !fill && !dataBar && !icon) return undefined;
    return {
      ...(patch ? { style: this.resolver.withPatch(cell?.style, patch) } : {}),
      ...(fill ? { fill } : {}),
      ...(dataBar ? { dataBar } : {}),
      ...(icon ? { icon } : {}),
    };
  }

  private matches(
    rule: OgeConditionalRule,
    value: OgeCellValue | undefined,
    stats: Stats,
  ): boolean {
    switch (rule.type) {
      case 'cellIs': {
        // an empty cell compares as 0 (compare() reads undefined as 0)
        const [a, b] = rule.formulas.map(
          (f) => ogeConditionalConstant(f) as number | string | boolean,
        );
        const x = compare(value, a);
        if (Number.isNaN(x)) return false;
        switch (rule.operator) {
          case 'lessThan':
            return x < 0;
          case 'lessThanOrEqual':
            return x <= 0;
          case 'equal':
            return x === 0;
          case 'notEqual':
            return x !== 0;
          case 'greaterThanOrEqual':
            return x >= 0;
          case 'greaterThan':
            return x > 0;
          case 'between':
          case 'notBetween': {
            // inclusive, either bound first
            const y = compare(value, b);
            const inside = (x >= 0 && y <= 0) || (y >= 0 && x <= 0);
            return rule.operator === 'between' ? inside : !inside;
          }
          default:
            return false;
        }
      }
      // Excel's text rules run SEARCH/LEFT/RIGHT on the value: on an error they
      // fail, so an error matches "does not contain" only
      case 'containsText':
        return (
          !isOgeCellError(value) &&
          textOf(value)
            .toUpperCase()
            .includes((rule.text ?? '').toUpperCase())
        );
      case 'notContainsText':
        return (
          isOgeCellError(value) ||
          !textOf(value)
            .toUpperCase()
            .includes((rule.text ?? '').toUpperCase())
        );
      case 'beginsWith':
        return (
          !isOgeCellError(value) &&
          textOf(value)
            .toUpperCase()
            .startsWith((rule.text ?? '').toUpperCase())
        );
      case 'endsWith':
        return (
          !isOgeCellError(value) &&
          textOf(value)
            .toUpperCase()
            .endsWith((rule.text ?? '').toUpperCase())
        );
      case 'containsBlanks':
        return textOf(value).trim() === '';
      case 'notContainsBlanks':
        return textOf(value).trim() !== '';
      case 'containsErrors':
        return isOgeCellError(value);
      case 'notContainsErrors':
        return !isOgeCellError(value);
      case 'duplicateValues':
      case 'uniqueValues': {
        const key = valueKey(value);
        if (key === undefined) return false;
        const count = stats.counts.get(key) ?? 0;
        return rule.type === 'duplicateValues' ? count > 1 : count === 1;
      }
      case 'top10': {
        if (typeof value !== 'number' || stats.sorted.length === 0)
          return false;
        const rank = rule.rank ?? 10;
        const count = rule.percent
          ? Math.max(1, Math.floor((stats.sorted.length * rank) / 100))
          : Math.min(rank, stats.sorted.length);
        return rule.bottom
          ? value <= stats.sorted[count - 1]
          : value >= stats.sorted[stats.sorted.length - count];
      }
      case 'aboveAverage': {
        if (typeof value !== 'number' || stats.numbers.length === 0)
          return false;
        const mean = stats.sum / stats.numbers.length;
        const above = rule.aboveAverage !== false;
        let target = mean;
        if (rule.stdDev) {
          const variance =
            stats.numbers.reduce((s, n) => s + (n - mean) ** 2, 0) /
            stats.numbers.length;
          target = mean + (above ? 1 : -1) * rule.stdDev * Math.sqrt(variance);
        }
        if (above) return rule.equalAverage ? value >= target : value > target;
        return rule.equalAverage ? value <= target : value < target;
      }
      case 'timePeriod':
        return (
          typeof value === 'number' &&
          this.inPeriod(Math.floor(value), rule.timePeriod ?? 'today')
        );
      default:
        return false;
    }
  }

  private inPeriod(day: number, period: string): boolean {
    const today = this.today;
    const span = PERIOD_DAYS[period];
    if (span) return day >= today + span[0] && day <= today + span[1];
    const system: OgeDateSystem = this.workbook.dateSystem;
    // weeks start on Sunday, as Excel's do
    const offset = system === '1900' ? 6 : 5;
    const weekday = (((today + offset) % 7) + 7) % 7;
    const weekStart = today - weekday;
    switch (period) {
      case 'thisWeek':
        return day >= weekStart && day <= weekStart + 6;
      case 'lastWeek':
        return day >= weekStart - 7 && day <= weekStart - 1;
      case 'nextWeek':
        return day >= weekStart + 7 && day <= weekStart + 13;
      default: {
        const month = (serial: number) => {
          const parts = ogeSerialToDateParts(serial, system, 0);
          return parts ? parts.year * 12 + parts.month : Number.NaN;
        };
        const delta = month(day) - month(today);
        if (period === 'thisMonth') return delta === 0;
        if (period === 'lastMonth') return delta === -1;
        if (period === 'nextMonth') return delta === 1;
        return false;
      }
    }
  }
}

/** Merges `patch` into `base` where `base` has not set the property yet. */
function mergeUnset(
  base: OgeCellStyle | undefined,
  patch: OgeCellStyle,
): OgeCellStyle {
  if (!base) return patch;
  return {
    ...patch,
    ...base,
    ...(patch.font || base.font
      ? { font: { ...patch.font, ...base.font } }
      : {}),
    ...(patch.border || base.border
      ? { border: { ...patch.border, ...base.border } }
      : {}),
  };
}
