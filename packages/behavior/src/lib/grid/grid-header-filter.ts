import { foldText } from '@oge-ui/core';
import {
  lookupTextOf,
  type LookupItem,
  type OgeDataType,
} from './grid-columns';

/**
 * Shared date formatter: constructing Intl.DateTimeFormat is expensive, and
 * `Date.toLocaleDateString()` builds one per call — a real cost when
 * thousands of date cells render. One cached instance formats them all.
 */
let dateFormatter: Intl.DateTimeFormat | undefined;

function formatDate(value: Date): string {
  dateFormatter ??= new Intl.DateTimeFormat();
  return dateFormatter.format(value);
}

/** Default cell text when no cell slot and no custom `format` is given. */
export function formatCellValue(
  value: unknown,
  dataType: OgeDataType,
  format?: (value: unknown) => string,
): string {
  if (format) return format(value);
  if (value == null) return '';
  switch (dataType) {
    case 'boolean':
      return value ? '✓' : '✗';
    case 'date':
      return value instanceof Date ? formatDate(value) : String(value);
    default:
      return String(value);
  }
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
  format?: (value: unknown) => string;
  messages: OgeHeaderFilterMessages;
}

/** The text a distinct value is listed under in the header-filter popup. */
export function headerValueText(
  value: unknown,
  options: OgeHeaderValueTextOptions,
): string {
  if (value == null || value === '') return options.messages.blankValue;
  if (options.lookupItems) return lookupTextOf(options.lookupItems, value);
  if (options.dataType === 'date')
    return formatCellValue(value, 'date', options.format);
  if (options.dataType === 'boolean') {
    return value ? options.messages.booleanTrue : options.messages.booleanFalse;
  }
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
