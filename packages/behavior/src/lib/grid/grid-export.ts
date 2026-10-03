import {
  computeSummaries,
  groupRows,
  type CustomSummaryMap,
  type GroupedItem,
  type GroupInterval,
  type LoadOptions,
  type SummaryDescriptor,
  type SummaryType,
  type SummaryValue,
} from '@oge-ui/core';
import {
  lookupTextOf,
  type LookupItem,
  type OgeColumnAlignment,
  type OgeDataType,
} from './grid-columns';
import { formatCellValue } from './grid-header-filter';
import { formatPattern } from '../input/error-messages';
import type {
  OgeExportCellStyle,
  OgeExportCellStyleArgs,
  OgeExportColumn,
  OgeExportData,
  OgeExportItem,
  OgeExportOptions,
  OgeExportSummaryCell,
} from './grid-options';

/**
 * The export model both grid render layers and both tree lists build, and
 * both file builders (`@oge-ui/behavior/export-excel`, `/export-pdf`) read:
 * columns with their on-screen layout facts (width, alignment, pin side,
 * band), and an ordered list of lines — group headers, data rows, group
 * footers, the total row. Pure: no exceljs / jspdf import, so it lives in the
 * main barrel and is unit-tested without either optional peer.
 */

/** A column as the export reads it — the render layers' resolved column fits. */
export interface OgeExportColumnSource<T> {
  readonly caption: string;
  readonly field: string | undefined;
  readonly dataType: OgeDataType;
  readonly accessor: (row: T) => unknown;
  readonly format?: ((value: unknown) => string) | undefined;
  readonly lookupItems?: readonly LookupItem[] | undefined;
  readonly width?: number | string | undefined;
  readonly alignment?: OgeColumnAlignment | undefined;
  readonly pinned?: false | 'left' | 'right' | undefined;
  readonly bandCaption?: string | undefined;
}

/** `120`, `'120px'` → 120; `'1fr'`, `'20%'`, `undefined` → undefined. */
function pixelWidth(width: number | string | undefined): number | undefined {
  if (typeof width === 'number') return width > 0 ? width : undefined;
  if (typeof width === 'string') {
    const match = /^\s*(\d+(?:\.\d+)?)\s*(px)?\s*$/.exec(width);
    if (match) return Number(match[1]);
  }
  return undefined;
}

/**
 * Field columns as exporters read them: display formatting resolved
 * (format > lookup text > boolean words) and the layout facts carried over.
 */
export function ogeExportColumnsOf<T>(
  columns: readonly OgeExportColumnSource<T>[],
  messages: { booleanTrue: string; booleanFalse: string },
): OgeExportColumn<T>[] {
  return columns
    .filter((column) => column.field)
    .map((column) => ogeExportColumnOf(column, messages));
}

/** One column as exporters read it (see {@link ogeExportColumnsOf}). */
export function ogeExportColumnOf<T>(
  column: OgeExportColumnSource<T>,
  messages: { booleanTrue: string; booleanFalse: string },
): OgeExportColumn<T> {
  return {
    caption: column.caption,
    field: column.field,
    dataType: column.dataType,
    accessor: column.accessor,
    format:
      column.format ??
      (column.lookupItems
        ? (value: unknown): string =>
            lookupTextOf(column.lookupItems ?? [], value)
        : column.dataType === 'boolean'
          ? (value: unknown): string =>
              value == null
                ? ''
                : value
                  ? messages.booleanTrue
                  : messages.booleanFalse
          : undefined),
    width: pixelWidth(column.width),
    alignment:
      column.alignment ?? (column.dataType === 'number' ? 'end' : 'start'),
    pinned: column.pinned ?? false,
    bandCaption: column.bandCaption,
  };
}

/** One grouping level of an export. */
export interface OgeExportGroupLevel {
  readonly field: string;
  readonly interval?: GroupInterval;
}

/** What a group header line is built from. */
export interface OgeExportGroupInfo {
  readonly field: string;
  readonly level: number;
  readonly value: unknown;
  readonly count: number;
  /** The group's header-position summaries (footer ones are excluded). */
  readonly summaries: readonly SummaryValue[];
}

export interface OgeExportStructureOptions<T> {
  /** Grouping levels, outermost first. Empty / absent → flat rows. */
  readonly groups?: readonly OgeExportGroupLevel[];
  readonly groupSummary?: readonly SummaryDescriptor[];
  /**
   * Fields whose group summaries render on a group-footer line instead of
   * in the group header text (the grid's `groupSummaryPosition: 'footer'`).
   */
  readonly groupFooterFields?: ReadonlySet<string>;
  readonly totalSummary?: readonly SummaryDescriptor[];
  /** Server totals, positional to `totalSummary`; computed locally when absent. */
  readonly totalValues?: readonly unknown[];
  readonly customSummaries?: CustomSummaryMap<T>;
  /** Formatted text of one summary ("Sum: 1,234"). */
  readonly summaryText: (summary: SummaryValue) => string;
  /** The label part alone ("Sum") — Excel prefixes typed values with it. */
  readonly summaryLabel?: (type: SummaryType) => string;
  /** Group header text. */
  readonly groupText: (group: OgeExportGroupInfo) => string;
}

function summaryCells(
  values: readonly SummaryValue[],
  options: OgeExportStructureOptions<unknown>,
): OgeExportSummaryCell[] {
  return values.map((summary) => ({
    field: summary.field,
    type: summary.type,
    value: summary.value,
    text: options.summaryText(summary),
    ...(options.summaryLabel
      ? { label: options.summaryLabel(summary.type) }
      : {}),
  }));
}

function totalOf<T>(
  rows: readonly T[],
  options: OgeExportStructureOptions<T>,
): SummaryValue[] {
  const descriptors = options.totalSummary ?? [];
  if (options.totalValues) {
    return descriptors.map((descriptor, index) => ({
      field: descriptor.field,
      type: descriptor.type,
      value: options.totalValues?.[index] ?? null,
    }));
  }
  return computeSummaries(rows, descriptors, options.customSummaries);
}

/**
 * The ordered export lines of a (possibly grouped) row set: group headers,
 * data rows at their group depth, group footers for the footer-position
 * summaries, and a closing total line when total summaries are configured.
 * Groups bucket by first appearance, so pass rows sorted the way the grid
 * shows them (group fields first).
 */
export function buildOgeExportItems<T>(
  rows: readonly T[],
  options: OgeExportStructureOptions<T>,
): OgeExportItem<T>[] {
  const groups = options.groups ?? [];
  const groupSummary = options.groupSummary ?? [];
  const footerFields = options.groupFooterFields ?? new Set<string>();
  const loose = options as OgeExportStructureOptions<unknown>;
  const items: OgeExportItem<T>[] = [];
  if (!groups.length) {
    for (const row of rows) items.push({ kind: 'data', row, level: 0 });
  } else {
    const tree = groupRows(
      rows,
      groups.map((group) => ({
        field: group.field,
        dir: 'asc' as const,
        ...(group.interval ? { interval: group.interval } : {}),
      })),
      groupSummary,
      options.customSummaries,
    );
    const visit = (nodes: readonly GroupedItem<T>[], level: number): void => {
      const field = groups[level].field;
      for (const node of nodes) {
        const values: SummaryValue[] = groupSummary.map((descriptor, i) => ({
          field: descriptor.field,
          type: descriptor.type,
          value: node.summary?.[i] ?? null,
        }));
        const header = values.filter((value) => !footerFields.has(value.field));
        const footer = values.filter((value) => footerFields.has(value.field));
        items.push({
          kind: 'group',
          level,
          field,
          value: node.key,
          count: node.count ?? 0,
          text: options.groupText({
            field,
            level,
            value: node.key,
            count: node.count ?? 0,
            summaries: header,
          }),
          summaries: summaryCells(header, loose),
        });
        if (level + 1 < groups.length) {
          visit((node.items ?? []) as readonly GroupedItem<T>[], level + 1);
        } else {
          for (const row of (node.items ?? []) as readonly T[])
            items.push({ kind: 'data', row, level: groups.length });
        }
        if (footer.length)
          items.push({
            kind: 'groupFooter',
            level: level + 1,
            summaries: summaryCells(footer, loose),
          });
      }
    };
    visit(tree, 0);
  }
  if (options.totalSummary?.length) {
    items.push({
      kind: 'total',
      summaries: summaryCells(totalOf(rows, options), loose),
    });
  }
  return items;
}

/** The export's lines: `items`, or every row flat at level 0. */
export function ogeExportItemsOf<T>(
  data: OgeExportData<T>,
): readonly OgeExportItem<T>[] {
  return (
    data.items ?? data.rows.map((row) => ({ kind: 'data', row, level: 0 }))
  );
}

/** One cell of the export header block (1-based, inclusive spans). */
export interface OgeExportHeaderCell {
  readonly caption: string;
  readonly row: number;
  readonly column: number;
  readonly rowSpan: number;
  readonly colSpan: number;
  /** The leaf column when the cell sits over exactly one (`undefined` for bands). */
  readonly columnIndex: number | undefined;
}

/**
 * The header block: one caption row, or — when any column has a band — a
 * band row whose adjacent equal captions merge, above the leaf captions;
 * band-less columns span both rows.
 */
export function ogeExportHeaderCells<T>(
  columns: readonly OgeExportColumn<T>[],
): { rows: number; cells: OgeExportHeaderCell[] } {
  const banded = columns.some((column) => column.bandCaption);
  if (!banded) {
    return {
      rows: 1,
      cells: columns.map((column, index) => ({
        caption: column.caption,
        row: 1,
        column: index + 1,
        rowSpan: 1,
        colSpan: 1,
        columnIndex: index,
      })),
    };
  }
  const cells: OgeExportHeaderCell[] = [];
  let index = 0;
  while (index < columns.length) {
    const band = columns[index].bandCaption;
    if (!band) {
      cells.push({
        caption: columns[index].caption,
        row: 1,
        column: index + 1,
        rowSpan: 2,
        colSpan: 1,
        columnIndex: index,
      });
      index += 1;
      continue;
    }
    let end = index;
    while (end + 1 < columns.length && columns[end + 1].bandCaption === band)
      end += 1;
    cells.push({
      caption: band,
      row: 1,
      column: index + 1,
      rowSpan: 1,
      colSpan: end - index + 1,
      columnIndex: undefined,
    });
    for (let leaf = index; leaf <= end; leaf++) {
      cells.push({
        caption: columns[leaf].caption,
        row: 2,
        column: leaf + 1,
        rowSpan: 1,
        colSpan: 1,
        columnIndex: leaf,
      });
    }
    index = end + 1;
  }
  return { rows: 2, cells };
}

/** Display text of a data cell (format > dataType default). */
export function ogeExportCellText<T>(
  column: OgeExportColumn<T>,
  row: T,
): string {
  const raw = column.accessor(row);
  if (raw == null) return '';
  return column.format
    ? column.format(raw)
    : formatCellValue(raw, column.dataType, undefined);
}

/** Merges styles left to right (later wins per key; `undefined` keys skipped). */
export function mergeOgeExportStyles(
  ...styles: readonly (OgeExportCellStyle | undefined | void)[]
): OgeExportCellStyle {
  const out: Record<string, unknown> = {};
  for (const style of styles) {
    if (!style) continue;
    for (const [key, value] of Object.entries(style)) {
      if (value !== undefined) out[key] = value;
    }
  }
  return out as OgeExportCellStyle;
}

/** The base style + the `cellStyle` hook's answer for one cell. */
export function ogeExportCellStyle<T>(
  options: Pick<OgeExportOptions<T>, 'cellStyle'>,
  base: OgeExportCellStyle | undefined,
  args: OgeExportCellStyleArgs<T>,
): OgeExportCellStyle {
  return mergeOgeExportStyles(base, options.cellStyle?.(args));
}

// --- the grid's export structure (both render layers) ------------------------

/** The grid strings an export's group / summary lines are built from. */
export interface OgeGridExportMessages {
  summaryLabels: Record<SummaryType, string>;
  groupSummaryPattern: string;
  totalSummaryPattern: string;
}

/** A field's caption + display formatting, for group values and summaries. */
export interface OgeGridExportFieldInfo {
  readonly caption: string;
  readonly dataType: OgeDataType;
  readonly format?: ((value: unknown) => string) | undefined;
}

export interface OgeGridExportStructureInput<T> {
  readonly rows: readonly T[];
  /** The grid's load options — `group`, `groupSummary`, `totalSummary`. */
  readonly loadOptions: LoadOptions;
  /** Caption / format of a field (any column, hidden ones included). */
  readonly fieldInfo: (field: string) => OgeGridExportFieldInfo | undefined;
  readonly groupFooterFields: ReadonlySet<string>;
  readonly customSummaries?: CustomSummaryMap<T>;
  /** The source's total-summary values (remote summaries), if it sent any. */
  readonly totalValues?: readonly unknown[];
  readonly messages: OgeGridExportMessages;
  readonly options: Pick<OgeExportOptions<T>, 'groups' | 'summaries'>;
}

/**
 * The load an export issues: the view's sort with the group fields first
 * (so groups come out in on-screen order), the filter and search — paging
 * only for `scope: 'page'`.
 */
export function ogeGridExportLoadOptions(
  load: LoadOptions,
  scope: 'all' | 'page' | 'selection',
  includeGroups: boolean,
): LoadOptions {
  const groups = includeGroups ? (load.group ?? []) : [];
  const grouped = new Set(groups.map((group) => group.field));
  const sort = [
    ...groups.map((group) => ({ field: group.field, dir: group.dir })),
    ...(load.sort ?? []).filter((entry) => !grouped.has(entry.field)),
  ];
  return {
    ...(sort.length ? { sort } : {}),
    ...(load.filter ? { filter: load.filter } : {}),
    ...(load.searchText ? { searchText: load.searchText } : {}),
    ...(scope === 'page' && load.take != null
      ? { skip: load.skip ?? 0, take: load.take }
      : {}),
  };
}

/**
 * The grid's export lines — group headers worded like the on-screen group
 * row (`City: Paris (3) Sum of Amount: 120`), footers for the
 * footer-position summaries and the total row — or `undefined` when the view
 * is neither grouped nor summarized (the export stays flat).
 */
export function ogeGridExportItems<T>(
  input: OgeGridExportStructureInput<T>,
): OgeExportItem<T>[] | undefined {
  const load = input.loadOptions;
  const groups = input.options.groups === false ? [] : (load.group ?? []);
  const withSummaries = input.options.summaries !== false;
  const totalSummary = withSummaries ? (load.totalSummary ?? []) : [];
  if (!groups.length && !totalSummary.length) return undefined;
  const messages = input.messages;
  const valueText = (field: string, value: unknown): string => {
    const info = input.fieldInfo(field);
    return info
      ? formatCellValue(value, info.dataType, info.format)
      : String(value ?? '');
  };
  return buildOgeExportItems(input.rows, {
    groups: groups.map((group) => ({
      field: group.field,
      ...(group.interval ? { interval: group.interval } : {}),
    })),
    groupSummary: withSummaries ? (load.groupSummary ?? []) : [],
    groupFooterFields: input.groupFooterFields,
    totalSummary,
    ...(input.totalValues ? { totalValues: input.totalValues } : {}),
    ...(input.customSummaries
      ? { customSummaries: input.customSummaries }
      : {}),
    summaryText: (summary) =>
      formatPattern(messages.totalSummaryPattern, {
        label: messages.summaryLabels[summary.type],
        value:
          summary.type === 'count'
            ? String(summary.value ?? '')
            : valueText(summary.field, summary.value),
      }),
    summaryLabel: (type) => messages.summaryLabels[type],
    groupText: (group) => {
      const caption = input.fieldInfo(group.field)?.caption ?? group.field;
      const head = `${caption}: ${valueText(group.field, group.value)} (${group.count})`;
      const summaries = group.summaries
        .map((summary) =>
          formatPattern(messages.groupSummaryPattern, {
            label: messages.summaryLabels[summary.type],
            column: input.fieldInfo(summary.field)?.caption ?? summary.field,
            value:
              summary.type === 'count'
                ? String(summary.value ?? '')
                : valueText(summary.field, summary.value),
          }),
        )
        .join(', ');
      return summaries ? `${head} ${summaries}` : head;
    },
  });
}

/**
 * One summary as the total row words it (`Sum: $1,234`): the label from
 * `summaryLabels`, the value formatted like its column (counts stay plain).
 */
export function ogeSummaryText(
  summary: SummaryValue,
  column: OgeGridExportFieldInfo | undefined,
  messages: Pick<
    OgeGridExportMessages,
    'summaryLabels' | 'totalSummaryPattern'
  >,
): string {
  return formatPattern(messages.totalSummaryPattern, {
    label: messages.summaryLabels[summary.type],
    value:
      summary.type === 'count' || !column
        ? String(summary.value ?? '')
        : formatCellValue(summary.value, column.dataType, column.format),
  });
}

/**
 * The summaries of one column joined for a footer / parent cell, or `''`
 * when none targets it.
 */
export function ogeColumnSummaryText(
  values: readonly SummaryValue[],
  column: OgeGridExportFieldInfo & { readonly field: string | undefined },
  messages: Pick<
    OgeGridExportMessages,
    'summaryLabels' | 'totalSummaryPattern'
  >,
): string {
  if (!column.field) return '';
  return values
    .filter((summary) => summary.field === column.field)
    .map((summary) => ogeSummaryText(summary, column, messages))
    .join(' · ');
}

/** Normalizes the scope shorthand (`selectedRowsOnly`). */
export function ogeExportScope(
  options: Pick<OgeExportOptions<unknown>, 'scope' | 'selectedRowsOnly'>,
): 'all' | 'page' | 'selection' {
  return options.selectedRowsOnly ? 'selection' : (options.scope ?? 'all');
}
