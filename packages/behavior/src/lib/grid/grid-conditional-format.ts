import {
  createFilterPredicate,
  type FilterOperator,
  type RowNode,
} from '@oge-ui/core';

/**
 * Row / cell styling hooks and declarative conditional formatting, shared by
 * both grid render layers (ADR 0001).
 *
 * Every visual a rule produces is a **class or a CSS custom property** — never
 * a colour value. The stylesheet maps the classes and properties onto the
 * design tokens (`--oge-success`, `--oge-danger`, `--oge-accent`…), so themes,
 * dark mode and forced colours keep working on formatted cells.
 */

/** What a class hook may return — the shapes Angular's `[class]` accepts. */
export type OgeClassValue =
  | string
  | readonly string[]
  | Readonly<Record<string, boolean | null | undefined>>
  | null
  | undefined;

/**
 * Normalizes a class hook's result into a list of class names: strings split
 * on whitespace, arrays flattened, records keep their truthy keys.
 */
export function ogeClassList(value: OgeClassValue): string[] {
  if (!value) return [];
  if (typeof value === 'string') return value.split(/\s+/).filter(Boolean);
  if (Array.isArray(value))
    return (value as readonly string[]).flatMap((entry) =>
      typeof entry === 'string' ? entry.split(/\s+/).filter(Boolean) : [],
    );
  return Object.entries(value)
    .filter(([, on]) => !!on)
    .map(([name]) => name);
}

/** A token tone a formatting rule paints with. */
export type OgeConditionalTone =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'accent'
  | 'muted';

/** Token-only styling a rule applies to a matching cell. */
export interface OgeConditionalStyle {
  /** Text colour from the tone's token. */
  tone?: OgeConditionalTone;
  /** Soft tinted background from the tone's token. */
  background?: OgeConditionalTone;
  /** Bold text. */
  bold?: boolean;
}

/** A declarative condition: `value <operator> operand`, as the filter row compares. */
export interface OgeConditionalCondition {
  operator: FilterOperator;
  value?: unknown;
}

/** A rule that styles cells matching a condition. */
export interface OgeConditionalRule<T = unknown> {
  /** A predicate over the cell value and row, or a declarative condition. */
  when:
    | ((value: unknown, row: T) => boolean)
    | OgeConditionalCondition;
  /** Class(es) added to matching cells. */
  class?: string | readonly string[];
  /** Token styling added to matching cells. */
  style?: OgeConditionalStyle;
}

/** A data bar: a token-coloured bar sized by the value's place in [min, max]. */
export interface OgeDataBarFormat {
  type: 'dataBar';
  /** Lower bound; default the column's minimum over the rendered rows (or 0). */
  min?: number;
  /** Upper bound; default the column's maximum over the rendered rows. */
  max?: number;
  /** Bar tone; default `'accent'`. Negative values use `'danger'`. */
  tone?: OgeConditionalTone;
}

/** A colour scale: the cell background blends between two or three tones. */
export interface OgeColorScaleFormat {
  type: 'colorScale';
  min?: number;
  max?: number;
  /** Low → (mid →) high tones; default `['danger', 'warning', 'success']`. */
  tones?:
    | readonly [OgeConditionalTone, OgeConditionalTone]
    | readonly [OgeConditionalTone, OgeConditionalTone, OgeConditionalTone];
}

/** An icon set: a trend glyph from where the value falls between two thresholds. */
export interface OgeIconSetFormat {
  type: 'iconSet';
  /** Glyph family. Default `'arrows'`. */
  icons?: 'arrows' | 'circles' | 'flags';
  /**
   * `[low, high]`: below `low` → low icon, at or above `high` → high icon,
   * between → middle icon. Default: the thirds of [min, max].
   */
  thresholds?: readonly [number, number];
}

/** One entry of a column's `conditionalFormats`. */
export type OgeConditionalFormat<T = unknown> =
  | OgeConditionalRule<T>
  | OgeDataBarFormat
  | OgeColorScaleFormat
  | OgeIconSetFormat;

/** Which glyph an icon set shows. */
export type OgeConditionalIcon = 'low' | 'mid' | 'high';

/** What the formats resolve to for one cell. */
export interface OgeConditionalCellFormat {
  /** Classes to add (`oge-cf-*` plus the rules' own classes). */
  classes: string[];
  /** CSS custom properties to set (`--oge-cf-bar`, `--oge-cf-scale`). */
  vars: Record<string, string>;
  /** Icon-set glyph, if any. */
  icon: OgeConditionalIcon | null;
  /** Icon family of `icon`. */
  iconSet: 'arrows' | 'circles' | 'flags' | null;
}

/** A column's numeric range over the rows a scale / bar is relative to. */
export interface OgeConditionalRange {
  min: number;
  max: number;
}

const EMPTY_FORMAT: OgeConditionalCellFormat = Object.freeze({
  classes: [],
  vars: {},
  icon: null,
  iconSet: null,
}) as OgeConditionalCellFormat;

/** Whether a format needs the column's value range (bars, scales, icons). */
export function ogeFormatsNeedRange(
  formats: readonly OgeConditionalFormat[] | undefined,
): boolean {
  return !!formats?.some((format) => 'type' in format);
}

/** Min/max of the finite numeric values `accessor` reads from the data rows. */
export function ogeColumnValueRange<T>(
  nodes: readonly RowNode<T>[],
  accessor: (row: T) => unknown,
): OgeConditionalRange | null {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const node of nodes) {
    if (node.kind !== 'data') continue;
    const value = accessor(node.data);
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return min <= max ? { min, max } : null;
}

const predicateCache = /* @__PURE__ */ new WeakMap<
  OgeConditionalCondition,
  (value: unknown) => boolean
>();

/** A declarative condition compiled once with the filter evaluator. */
function conditionPredicate(
  condition: OgeConditionalCondition,
): (value: unknown) => boolean {
  let predicate = predicateCache.get(condition);
  if (!predicate) {
    const test = createFilterPredicate<{ v: unknown }>({
      type: 'binary',
      field: 'v',
      op: condition.operator,
      value: condition.value,
    } as Parameters<typeof createFilterPredicate>[0]);
    predicate = (value: unknown) => test({ v: value });
    predicateCache.set(condition, predicate);
  }
  return predicate;
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/** `0.4` → `'0.4'` with three decimals at most (stable CSS values). */
const ratio = (value: number): string => String(Math.round(value * 1000) / 1000);

/**
 * Resolves a column's formats for one cell: rules add their classes and
 * `oge-cf-tone-*` / `oge-cf-bg-*` / `oge-cf-bold` style classes; a data bar
 * sets `--oge-cf-bar` (0–1, plus `--oge-cf-bar-start` for negatives); a colour
 * scale sets `--oge-cf-scale` (0–1) with its tone classes; an icon set picks a
 * glyph. Non-numeric values skip the numeric formats.
 */
export function resolveOgeConditionalFormat<T>(
  formats: readonly OgeConditionalFormat<T>[] | undefined,
  value: unknown,
  row: T,
  range: OgeConditionalRange | null,
): OgeConditionalCellFormat {
  if (!formats?.length) return EMPTY_FORMAT;
  const classes: string[] = [];
  const vars: Record<string, string> = {};
  let icon: OgeConditionalIcon | null = null;
  let iconSet: OgeConditionalCellFormat['iconSet'] = null;
  const numeric =
    typeof value === 'number' && Number.isFinite(value) ? value : null;
  for (const format of formats) {
    if (!('type' in format)) {
      const matches =
        typeof format.when === 'function'
          ? format.when(value, row)
          : conditionPredicate(format.when)(value);
      if (!matches) continue;
      if (format.class) {
        classes.push(
          ...(typeof format.class === 'string'
            ? format.class.split(/\s+/).filter(Boolean)
            : format.class),
        );
      }
      const style = format.style;
      if (style?.tone) classes.push(`oge-cf-tone-${style.tone}`);
      if (style?.background) classes.push(`oge-cf-bg-${style.background}`);
      if (style?.bold) classes.push('oge-cf-bold');
      continue;
    }
    if (numeric === null) continue;
    const min = format.type === 'iconSet' ? range?.min : (format.min ?? range?.min);
    const max = format.type === 'iconSet' ? range?.max : (format.max ?? range?.max);
    if (format.type === 'dataBar') {
      const low = Math.min(0, min ?? 0);
      const high = Math.max(max ?? numeric, low + Number.EPSILON);
      const span = high - low || 1;
      const zero = clamp01((0 - low) / span);
      const at = clamp01((numeric - low) / span);
      classes.push('oge-cf-databar');
      if (numeric < 0) classes.push('oge-cf-databar-negative');
      classes.push(`oge-cf-bar-${numeric < 0 ? 'danger' : (format.tone ?? 'accent')}`);
      vars['--oge-cf-bar-start'] = ratio(Math.min(zero, at));
      vars['--oge-cf-bar'] = ratio(Math.abs(at - zero));
      continue;
    }
    if (format.type === 'colorScale') {
      const low = min ?? numeric;
      const high = max ?? numeric;
      const position = high > low ? clamp01((numeric - low) / (high - low)) : 0.5;
      const tones = format.tones ?? ['danger', 'warning', 'success'];
      classes.push('oge-cf-scale');
      if (tones.length === 3) {
        // a three-tone scale is two halves: low→mid below 0.5, mid→high above
        const upper = position >= 0.5;
        classes.push(
          `oge-cf-scale-from-${upper ? tones[1] : tones[0]}`,
          `oge-cf-scale-to-${upper ? tones[2] : tones[1]}`,
        );
        vars['--oge-cf-scale'] = ratio(upper ? (position - 0.5) * 2 : position * 2);
      } else {
        classes.push(
          `oge-cf-scale-from-${tones[0]}`,
          `oge-cf-scale-to-${tones[1]}`,
        );
        vars['--oge-cf-scale'] = ratio(position);
      }
      continue;
    }
    // iconSet
    const [lowCut, highCut] =
      format.thresholds ??
      (min !== undefined && max !== undefined
        ? [min + (max - min) / 3, min + ((max - min) * 2) / 3]
        : [numeric, numeric]);
    icon = numeric < lowCut ? 'low' : numeric >= highCut ? 'high' : 'mid';
    iconSet = format.icons ?? 'arrows';
    classes.push('oge-cf-has-icon', `oge-cf-icon-${icon}`);
  }
  if (!classes.length && !icon) return EMPTY_FORMAT;
  return { classes, vars, icon, iconSet };
}

/** The payload of `rowPrepared`: a data row was rendered (or re-rendered with new data). */
export interface OgeRowPreparedEvent<T = unknown> {
  row: T;
  key: unknown;
  /** Flat row index. */
  rowIndex: number;
  /**
   * The row element — the one deliberate element hand-out of the API: the
   * hook exists for imperative decoration the declarative hooks cannot express.
   */
  element: HTMLElement;
}

/** The payload of `cellPrepared`: a data cell was rendered (or its row re-rendered). */
export interface OgeCellPreparedEvent<T = unknown> {
  row: T;
  key: unknown;
  field: string | undefined;
  value: unknown;
  /** Flat row index. */
  rowIndex: number;
  /** Visible column index. */
  columnIndex: number;
  element: HTMLElement;
}

/**
 * Remembers which rendered row elements were already reported to
 * `rowPrepared` / `cellPrepared`, so a re-render that reuses an element with
 * the same row object stays silent and a recycled element (virtual scroll)
 * or a changed row object reports again.
 */
export class OgePreparedTracker {
  private seen = new WeakMap<Element, unknown>();

  /** `true` when `element` shows `row` for the first time. */
  isNew(element: Element, row: unknown): boolean {
    if (this.seen.has(element) && this.seen.get(element) === row) return false;
    this.seen.set(element, row);
    return true;
  }

  /** Forget everything (column set changed — every cell is new). */
  reset(): void {
    this.seen = new WeakMap();
  }
}
