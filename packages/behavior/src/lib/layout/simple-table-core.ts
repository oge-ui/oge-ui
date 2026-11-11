import { createFieldAccessor, ogeFormatMessage } from '@oge-ui/core';

/**
 * `oge-simple-table` — a native `<table>` for small, template-driven lists:
 * the caller writes free `<tr>` / `<td>` markup per row, the table keeps the
 * header cells aligned with it and pages the rows. No sorting, filtering,
 * selection or virtualization — that is the grid's job. This file holds the
 * framework-free part both render layers share (ADR 0001): columns, paging
 * and messages.
 */

/** Horizontal alignment of a column's header and cells. */
export type OgeSimpleTableAlign = 'start' | 'center' | 'end';

/** One column: its header cell, and the default cell when no row template is given. */
export interface OgeSimpleTableColumn {
  /** Field (dotted paths allowed) the default cell shows. */
  readonly field?: string;
  /** Header text; defaults to the field, humanized. */
  readonly caption?: string;
  /** Alignment of the header and the default cell. Default `'start'`. */
  readonly align?: OgeSimpleTableAlign;
  /** CSS width of the column (`'8rem'`, `'20%'`), set on its `<col>`. */
  readonly width?: string;
  /** Extra class on the header and the default cells. */
  readonly cssClass?: string;
}

/** A column with its caption and cell class resolved. */
export interface OgeSimpleTableResolvedColumn extends OgeSimpleTableColumn {
  readonly caption: string;
  readonly align: OgeSimpleTableAlign;
  /**
   * Class for every cell of the column — alignment plus `cssClass`. A row
   * template puts it on its own `<td>` (`[class]="columns[1].cellClass"`) to
   * line up with the header.
   */
  readonly cellClass: string;
}

/** Strings of the simple table. */
export interface OgeSimpleTableMessages {
  /** Accessible name of the pager. */
  pager: string;
  previousPage: string;
  nextPage: string;
  /** Range text: `{from}`, `{to}`, `{count}`. */
  pageInfo: string;
  /** Shown in a full-width row when there are no rows. */
  noData: string;
}

export const OGE_DEFAULT_SIMPLE_TABLE_MESSAGES: OgeSimpleTableMessages = {
  pager: 'Table pages',
  previousPage: 'Previous page',
  nextPage: 'Next page',
  pageInfo: '{from}–{to} of {count}',
  noData: 'No rows to display',
};

/** Application-wide defaults for `oge-simple-table`. */
export interface OgeSimpleTableConfig {
  messages: OgeSimpleTableMessages;
  /** Default for the `pageSize` input (10). */
  pageSize?: number;
  /** Default for the `compact` input (`false`). */
  compact?: boolean;
  /** BCP 47 locale of the pager's numbers; unset = the application locale. */
  locale?: string;
}

export const OGE_DEFAULT_SIMPLE_TABLE_CONFIG: OgeSimpleTableConfig = {
  messages: OGE_DEFAULT_SIMPLE_TABLE_MESSAGES,
};

export type OgeSimpleTableConfigInput = Partial<
  Omit<OgeSimpleTableConfig, 'messages'>
> & {
  messages?: Partial<OgeSimpleTableMessages>;
};

export function resolveOgeSimpleTableConfig(
  input: OgeSimpleTableConfigInput | undefined,
): OgeSimpleTableConfig {
  return {
    ...OGE_DEFAULT_SIMPLE_TABLE_CONFIG,
    ...input,
    messages: { ...OGE_DEFAULT_SIMPLE_TABLE_MESSAGES, ...input?.messages },
  };
}

/** Default rows per page when paging is on. */
export const OGE_SIMPLE_TABLE_DEFAULT_PAGE_SIZE = 10;

function humanize(field: string): string {
  const last = field.split('.').pop() ?? field;
  const spaced = last
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Columns with captions and cell classes. Without `columns` they are taken
 * from the first row's own keys, so `[value]` alone renders a table.
 */
export function resolveOgeSimpleTableColumns(
  columns: readonly OgeSimpleTableColumn[] | undefined,
  rows: readonly unknown[],
): OgeSimpleTableResolvedColumn[] {
  const source: readonly OgeSimpleTableColumn[] =
    columns ??
    (rows[0] !== null && typeof rows[0] === 'object'
      ? Object.keys(rows[0] as object).map((field) => ({ field }))
      : []);
  return source.map((column) => {
    const align = column.align ?? 'start';
    return {
      ...column,
      align,
      caption: column.caption ?? (column.field ? humanize(column.field) : ''),
      cellClass: [`oge-simple-table-align-${align}`, column.cssClass]
        .filter(Boolean)
        .join(' '),
    };
  });
}

/** The text a default cell shows: the field's value, blank for null. */
export function ogeSimpleTableCellText(
  row: unknown,
  column: OgeSimpleTableColumn,
): string {
  if (!column.field) return '';
  const value = createFieldAccessor<unknown>(column.field)(row);
  return value == null ? '' : String(value);
}

/** Where the table stands in its rows. */
export interface OgeSimpleTablePage {
  /** The page shown, clamped into range. */
  readonly pageIndex: number;
  readonly pageCount: number;
  /** First and last row index of the page (exclusive end). */
  readonly start: number;
  readonly end: number;
}

/** Paging math: every row on one page when paging is off. */
export function ogeSimpleTablePage(
  count: number,
  paging: boolean,
  pageSize: number,
  pageIndex: number,
): OgeSimpleTablePage {
  if (!paging || pageSize <= 0) {
    return { pageIndex: 0, pageCount: 1, start: 0, end: count };
  }
  const size = Math.floor(pageSize);
  const pageCount = Math.max(1, Math.ceil(count / size));
  const index = Math.min(Math.max(0, Math.floor(pageIndex)), pageCount - 1);
  return {
    pageIndex: index,
    pageCount,
    start: index * size,
    end: Math.min(count, (index + 1) * size),
  };
}

/** The pager's range text, e.g. "11–20 of 42". */
export function ogeSimpleTablePageInfo(
  page: OgeSimpleTablePage,
  count: number,
  messages: OgeSimpleTableMessages,
  locale?: string,
): string {
  return ogeFormatMessage(
    messages.pageInfo,
    {
      from: count ? page.start + 1 : 0,
      to: page.end,
      count,
    },
    locale,
  );
}
