import { foldText, ogeDateTimeFormat, ogeValueFormatter } from '@oge-ui/core';
import {
  lookupTextOf,
  type LookupItem,
  type OgeColumnFormat,
  type OgeDataType,
} from './grid-columns';

const DATETIME_OPTIONS: Intl.DateTimeFormatOptions = {
  dateStyle: 'short',
  timeStyle: 'short',
};

/**
 * Default cell text when no cell slot is given: the column's `format`
 * (a function, or a declarative `OgeValueFormat` rendered in `locale`), else
 * the data type's default — dates in `locale`'s numeric date (date + short
 * time for `'datetime'`), everything else as `String(value)`.
 *
 * Formatters come from core's shared `Intl` cache (`ogeDateTimeFormat`), so
 * thousands of date cells share one formatter per locale instead of building
 * one per `toLocaleDateString()` call. `locale` unset = the runtime default.
 */
export function formatCellValue(
  value: unknown,
  dataType: OgeDataType,
  format?: OgeColumnFormat,
  locale?: string,
): string {
  if (typeof format === 'function') return format(value);
  if (format) return ogeValueFormatter(format, locale)(value);
  if (value == null) return '';
  switch (dataType) {
    case 'boolean':
      return value ? '✓' : '✗';
    case 'date':
      return value instanceof Date
        ? ogeDateTimeFormat(locale).format(value)
        : String(value);
    case 'datetime':
      return value instanceof Date
        ? ogeDateTimeFormat(locale, DATETIME_OPTIONS).format(value)
        : String(value);
    default:
      return String(value);
  }
}

/** Strings a default-rendered boolean cell is announced with. */
export interface OgeBooleanCellMessages {
  booleanTrueLabel: string;
  booleanFalseLabel: string;
}

/**
 * Screen-reader text of a default-rendered boolean cell, or `null` when the
 * cell is not one (another data type, a blank value, or a column whose text
 * comes from a custom `format` / lookup). Both render layers draw the visible
 * glyph `aria-hidden` and this text visually hidden beside it, so a `✓` / `✗`
 * cell is announced as a word instead of a symbol name — or not at all.
 */
export function booleanCellLabel(
  value: unknown,
  column: {
    readonly dataType: OgeDataType;
    readonly format?: ((value: unknown) => string) | undefined;
    readonly lookupItems?: readonly LookupItem[] | undefined;
  },
  messages: OgeBooleanCellMessages,
): string | null {
  if (column.dataType !== 'boolean' || value == null) return null;
  if (column.format || column.lookupItems) return null;
  return value ? messages.booleanTrueLabel : messages.booleanFalseLabel;
}

/** Strings the header filter needs from the host's message table. */
export interface OgeHeaderFilterMessages {
  /** Label for `null` / `''` values. */
  blankValue: string;
  booleanTrue: string;
  booleanFalse: string;
}

/** What one distinct value is labelled with, per column. */
export interface OgeHeaderValueTextOptions {
  dataType: OgeDataType;
  lookupItems?: readonly LookupItem[];
  format?: OgeColumnFormat;
  /** Locale dates and declarative formats render in (the column's). */
  locale?: string;
  messages: OgeHeaderFilterMessages;
}

/** The text a distinct value is listed under in the header-filter popup. */
export function headerValueText(
  value: unknown,
  options: OgeHeaderValueTextOptions,
): string {
  if (value == null || value === '') return options.messages.blankValue;
  if (options.lookupItems) return lookupTextOf(options.lookupItems, value);
  if (options.dataType === 'date' || options.dataType === 'datetime')
    return formatCellValue(
      value,
      options.dataType,
      options.format,
      options.locale,
    );
  if (options.dataType === 'boolean') {
    return value ? options.messages.booleanTrue : options.messages.booleanFalse;
  }
  // a formatted column lists its values the way its cells show them
  if (options.format)
    return formatCellValue(
      value,
      options.dataType,
      options.format,
      options.locale,
    );
  return String(value);
}

/** The year bucket a date value falls into, or its own text when unparsable. */
export function headerYearLabel(value: unknown, blankValue: string): string {
  if (value == null || value === '') return blankValue;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime())
    ? String(value)
    : String(date.getFullYear());
}

/** One year bucket of a date column's header filter. */
export interface OgeHeaderValueGroup {
  label: string;
  values: readonly unknown[];
}

/** The distinct values left after the popup's search box. */
export function filterHeaderValues(
  values: readonly unknown[],
  search: string,
  textOf: (value: unknown) => string,
): readonly unknown[] {
  const query = foldText(search.trim());
  if (!query) return values;
  return values.filter((value) => foldText(textOf(value)).includes(query));
}

/**
 * Date columns present their values grouped by year. The search box matches
 * the year label (keeping the whole group) or individual formatted dates;
 * groups left empty disappear.
 */
export function groupHeaderValuesByYear(
  values: readonly unknown[],
  search: string,
  textOf: (value: unknown) => string,
  yearOf: (value: unknown) => string,
): readonly OgeHeaderValueGroup[] {
  const buckets = new Map<string, unknown[]>();
  for (const value of values) {
    const label = yearOf(value);
    const bucket = buckets.get(label);
    if (bucket) bucket.push(value);
    else buckets.set(label, [value]);
  }
  const groups: OgeHeaderValueGroup[] = [...buckets.entries()].map(
    ([label, groupValues]) => ({ label, values: groupValues }),
  );
  const query = foldText(search.trim());
  if (!query) return groups;
  return groups.flatMap((group) => {
    if (foldText(group.label).includes(query)) return [group];
    const leaves = group.values.filter((value) =>
      foldText(textOf(value)).includes(query),
    );
    return leaves.length ? [{ label: group.label, values: leaves }] : [];
  });
}

/**
 * A header-filter selection. `null` is not "nothing selected" but **"every
 * value selected"** — the state in which the column applies no filter at all,
 * which is why every helper below round-trips it rather than materializing
 * the full list.
 */
export type OgeHeaderFilterSelection = readonly unknown[] | null;

export function isHeaderValueSelected(
  selection: OgeHeaderFilterSelection,
  value: unknown,
): boolean {
  return selection == null || selection.includes(value);
}

/** Tri-state of a year group's checkbox. */
export function headerGroupState(
  selection: OgeHeaderFilterSelection,
  groupValues: readonly unknown[],
): 'all' | 'none' | 'some' {
  const selected = groupValues.filter((value) =>
    isHeaderValueSelected(selection, value),
  ).length;
  if (selected === groupValues.length) return 'all';
  return selected === 0 ? 'none' : 'some';
}

/**
 * Adds or removes one value. Returns the next selection — `null` once every
 * value is back in, so the column stops filtering instead of listing all of
 * them.
 */
export function toggleHeaderValue(
  allValues: readonly unknown[],
  selection: OgeHeaderFilterSelection,
  value: unknown,
): OgeHeaderFilterSelection {
  const current = selection ?? allValues;
  const next = current.includes(value)
    ? current.filter((candidate) => candidate !== value)
    : [...current, value];
  return next.length === allValues.length ? null : next;
}

/** Checks/unchecks every value of a year group at once. */
export function toggleHeaderGroup(
  allValues: readonly unknown[],
  selection: OgeHeaderFilterSelection,
  groupValues: readonly unknown[],
): OgeHeaderFilterSelection {
  const current = selection ?? allValues;
  const allSelected = groupValues.every((value) => current.includes(value));
  const next = allSelected
    ? current.filter((value) => !groupValues.includes(value))
    : [...current, ...groupValues.filter((value) => !current.includes(value))];
  return next.length === allValues.length ? null : next;
}

/** The select-all checkbox: all selected → keep none; otherwise reset to all. */
export function toggleAllHeaderValues(
  selection: OgeHeaderFilterSelection,
): OgeHeaderFilterSelection {
  return selection == null ? [] : null;
}

/** Whether the select-all checkbox is checked. */
export function allHeaderValuesSelected(
  selection: OgeHeaderFilterSelection,
): boolean {
  return selection == null;
}
