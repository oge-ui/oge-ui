import { captionize, readPath } from '../forms/form-model';

/**
 * A multi-column combo box column, minus the render layer's cell slot
 * (Angular adds a `TemplateRef`, React a `renderCell` prop).
 */
export interface OgeComboBoxColumnBase<TItem> {
  /** Item field the column shows; dot-notation reaches nested objects. */
  readonly field: string;
  /** Header text; defaults to a title-cased `field`. */
  readonly caption?: string;
  /** Pixel width (`number`) or any CSS track size (`'8rem'`, `'2fr'`); default `minmax(6rem, 1fr)`. */
  readonly width?: number | string;
  /**
   * Cell text: `Intl` options (number options for numbers, date options for
   * `Date`s) or a function of the raw value and the row item.
   */
  readonly format?:
    | Intl.NumberFormatOptions
    | Intl.DateTimeFormatOptions
    | ((value: unknown, item: TItem) => string);
  /** Whether typed search text matches this column (default `true`). */
  readonly searchable?: boolean;
  /** Text alignment inside the cell (default `'start'`; numbers often want `'end'`). */
  readonly alignment?: 'start' | 'center' | 'end';
  /** Extra class on the column's header and body cells. */
  readonly cssClass?: string;
}

/** The header caption of a column. */
export function ogeComboColumnCaption<TItem>(
  column: OgeComboBoxColumnBase<TItem>,
): string {
  return column.caption ?? captionize(column.field);
}

/** The raw cell value — a dot-path read of `column.field`. */
export function ogeComboCellValue<TItem>(
  column: OgeComboBoxColumnBase<TItem>,
  item: TItem,
): unknown {
  return readPath(item, column.field);
}

const NUMBER_FORMATS = new Map<string, Intl.NumberFormat>();
const DATE_FORMATS = new Map<string, Intl.DateTimeFormat>();

function cachedFormatter<F>(
  cache: Map<string, F>,
  locale: string | undefined,
  options: object,
  create: () => F,
): F {
  const key = `${locale ?? ''}|${JSON.stringify(options)}`;
  let formatter = cache.get(key);
  if (!formatter) {
    formatter = create();
    cache.set(key, formatter);
  }
  return formatter;
}

/**
 * The text a cell shows: the column's `format` applied to the raw value
 * (`Intl` options pick a number or date formatter by the value's type), or
 * the value stringified. `null` / `undefined` render empty.
 */
export function ogeComboCellText<TItem>(
  column: OgeComboBoxColumnBase<TItem>,
  item: TItem,
  locale?: string,
): string {
  const value = ogeComboCellValue(column, item);
  const format = column.format;
  if (typeof format === 'function') return format(value, item);
  if (value == null) return '';
  if (format && typeof value === 'number') {
    return cachedFormatter(
      NUMBER_FORMATS,
      locale,
      format,
      () => new Intl.NumberFormat(locale, format as Intl.NumberFormatOptions),
    ).format(value);
  }
  if (format && value instanceof Date) {
    return cachedFormatter(
      DATE_FORMATS,
      locale,
      format,
      () =>
        new Intl.DateTimeFormat(locale, format as Intl.DateTimeFormatOptions),
    ).format(value);
  }
  return String(value);
}

/** The strings typed search text is matched against: every searchable column's cell text. */
export function ogeComboSearchStrings<TItem>(
  columns: readonly OgeComboBoxColumnBase<TItem>[],
  item: TItem,
  locale?: string,
): string[] {
  return columns
    .filter((column) => column.searchable !== false)
    .map((column) => ogeComboCellText(column, item, locale));
}

/** `grid-template-columns` for the popup grid — header and rows share it. */
export function ogeComboGridTemplate<TItem>(
  columns: readonly OgeComboBoxColumnBase<TItem>[],
): string {
  if (columns.length === 0) return 'minmax(0, 1fr)';
  return columns
    .map((column) => {
      const width = column.width;
      if (typeof width === 'number') return `${Math.max(0, width)}px`;
      if (typeof width === 'string' && width.trim().length > 0) return width;
      return 'minmax(6rem, 1fr)';
    })
    .join(' ');
}

/**
 * The popup's natural width when the columns are all pixel-sized — used as
 * the minimum popup width so a wide grid is not squeezed into the field's
 * width. `undefined` when any column is flexible.
 */
export function ogeComboFixedWidth<TItem>(
  columns: readonly OgeComboBoxColumnBase<TItem>[],
): number | undefined {
  let total = 0;
  for (const column of columns) {
    if (typeof column.width !== 'number') return undefined;
    total += column.width;
  }
  return total;
}

/** The active column after a Left/Right/Home/End move, clamped to the grid. */
export function ogeComboColumnTarget(
  current: number,
  key: 'ArrowLeft' | 'ArrowRight' | 'Home' | 'End',
  count: number,
  rtl = false,
): number {
  if (count <= 0) return -1;
  const start = current < 0 ? 0 : current;
  switch (key) {
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    case 'ArrowLeft':
      return Math.max(0, Math.min(count - 1, start + (rtl ? 1 : -1)));
    default:
      return Math.max(0, Math.min(count - 1, start + (rtl ? -1 : 1)));
  }
}
