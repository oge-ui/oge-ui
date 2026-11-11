'use client';

import {
  forwardRef,
  useImperativeHandle,
  useState,
  type CSSProperties,
  type ForwardedRef,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';
import {
  OGE_SIMPLE_TABLE_DEFAULT_PAGE_SIZE,
  ogeSimpleTableCellText,
  ogeSimpleTablePage,
  ogeSimpleTablePageInfo,
  resolveOgeSimpleTableColumns,
  type OgeSimpleTableColumn,
  type OgeSimpleTableResolvedColumn,
} from '@oge-ui/behavior';
import { useOgeSimpleTableConfig } from './layout-config';

/** Context of `renderRow` — the Angular `ogeSimpleTableRow` template context. */
export interface OgeSimpleTableRowRenderContext<T> {
  /** The row. */
  row: T;
  /** The resolved columns — put `columns[i].cellClass` on a `<td>` to align it with its header. */
  columns: readonly OgeSimpleTableResolvedColumn[];
  /** Index of the row in `value` (not in the page). */
  rowIndex: number;
}

/** Context of `renderHeader` / `renderFooter`. */
export interface OgeSimpleTableSectionRenderContext<T> {
  columns: readonly OgeSimpleTableResolvedColumn[];
  /** Every row of `value` — for totals in a footer. */
  rows: readonly T[];
}

export interface OgeSimpleTableProps<T> {
  /** The rows. */
  value?: readonly T[];
  /** Header cells and default cells; derived from the first row's keys when unset. */
  columns?: readonly OgeSimpleTableColumn[];
  /** Shows `pageSize` rows at a time with a previous / next pager. */
  paging?: boolean;
  /** Rows per page with `paging`; falls back to the config, then 10. */
  pageSize?: number;
  /** 0-based page shown (controlled). */
  pageIndex?: number;
  /** Initial page when uncontrolled. */
  defaultPageIndex?: number;
  /** The page the pager moved to — the controlled half of `pageIndex`. */
  onPageIndexChange?: (pageIndex: number) => void;
  /** Denser rows (smaller padding); falls back to the config. */
  compact?: boolean;
  /** Visible `<caption>` naming the table. */
  caption?: string;
  /** Accessible name when there is no visible caption. */
  ariaLabel?: string;
  /** Wraps the table in a focusable scroll region (default `true`). */
  scrollable?: boolean;
  /** BCP 47 locale of the pager's numbers; falls back to the config, then the runtime default. */
  locale?: string;
  /** A whole `<tr>` per row — free `<td>` markup. */
  renderRow?: (context: OgeSimpleTableRowRenderContext<T>) => ReactNode;
  /** Replaces the header row(s) inside `<thead>`. */
  renderHeader?: (context: OgeSimpleTableSectionRenderContext<T>) => ReactNode;
  /** Rows of a `<tfoot>`. */
  renderFooter?: (context: OgeSimpleTableSectionRenderContext<T>) => ReactNode;
  /** Content of the full-width cell shown when `value` is empty. */
  renderEmpty?: () => ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** Imperative API of `<OgeSimpleTable>`. */
export interface OgeSimpleTableHandle {
  /** Shows a page (clamped into range). */
  goToPage(index: number): void;
}

/**
 * A native `<table>` for small lists with free row markup: `renderRow`
 * returns the `<tr>` of a row and the header cells keep their alignment with
 * it; `paging` adds a previous / next pager. No sorting, filtering, selection
 * or virtualization — use `<OgeGrid>` for those.
 *
 * ```tsx
 * <OgeSimpleTable value={lines} columns={columns} caption="Order lines" />
 * ```
 */
function SimpleTableInner<T>(
  props: OgeSimpleTableProps<T>,
  ref: ForwardedRef<OgeSimpleTableHandle>,
) {
  const config = useOgeSimpleTableConfig();
  const msg = config.messages;
  const value = props.value ?? (EMPTY as readonly T[]);
  const [uPage, setUPage] = useState(props.defaultPageIndex ?? 0);
  const columns = resolveOgeSimpleTableColumns(props.columns, value);
  const paging = props.paging ?? false;
  const page = ogeSimpleTablePage(
    value.length,
    paging,
    props.pageSize ?? config.pageSize ?? OGE_SIMPLE_TABLE_DEFAULT_PAGE_SIZE,
    props.pageIndex ?? uPage,
  );
  const compact = props.compact ?? config.compact ?? false;
  const scrollable = props.scrollable ?? true;
  const rows = value.slice(page.start, page.end);
  const section: OgeSimpleTableSectionRenderContext<T> = {
    columns,
    rows: value,
  };

  const goToPage = (index: number): void => {
    const next = Math.min(Math.max(0, index), page.pageCount - 1);
    if (props.pageIndex === undefined) setUPage(next);
    props.onPageIndexChange?.(next);
  };
  useImperativeHandle(ref, () => ({ goToPage }));

  const scrollName = scrollable
    ? (props.caption ?? props.ariaLabel)
    : undefined;

  return (
    <div
      className={[
        'oge-simple-table',
        compact ? 'oge-simple-table-compact' : '',
        props.className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={props.style}
    >
      <div
        className="oge-simple-table-scroll"
        tabIndex={scrollable ? 0 : undefined}
        role={scrollable ? 'region' : undefined}
        aria-label={scrollName}
      >
        <table
          className="oge-simple-table-table"
          aria-label={props.caption ? undefined : props.ariaLabel}
        >
          {props.caption ? (
            <caption className="oge-simple-table-caption">
              {props.caption}
            </caption>
          ) : null}
          {columns.some((column) => column.width) ? (
            <colgroup>
              {columns.map((column, i) => (
                <col
                  key={i}
                  style={column.width ? { width: column.width } : undefined}
                />
              ))}
            </colgroup>
          ) : null}
          <thead>
            {props.renderHeader ? (
              props.renderHeader(section)
            ) : columns.length ? (
              <tr>
                {columns.map((column, i) => (
                  <th key={i} scope="col" className={column.cellClass}>
                    {column.caption}
                  </th>
                ))}
              </tr>
            ) : null}
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row, i) =>
                props.renderRow ? (
                  <RowSlot key={i}>
                    {props.renderRow({
                      row,
                      columns,
                      rowIndex: page.start + i,
                    })}
                  </RowSlot>
                ) : (
                  <tr key={i}>
                    {columns.map((column, c) => (
                      <td key={c} className={column.cellClass}>
                        {ogeSimpleTableCellText(row, column)}
                      </td>
                    ))}
                  </tr>
                ),
              )
            ) : (
              <tr className="oge-simple-table-empty-row">
                <td
                  className="oge-simple-table-empty"
                  colSpan={Math.max(1, columns.length)}
                >
                  {props.renderEmpty ? props.renderEmpty() : msg.noData}
                </td>
              </tr>
            )}
          </tbody>
          {props.renderFooter ? (
            <tfoot>{props.renderFooter(section)}</tfoot>
          ) : null}
        </table>
      </div>
      {paging && page.pageCount > 1 ? (
        <div
          className="oge-simple-table-pager"
          role="group"
          aria-label={msg.pager}
        >
          <button
            type="button"
            className="oge-simple-table-page-btn"
            data-oge-simple-table-pager="prev"
            disabled={page.pageIndex === 0}
            aria-label={msg.previousPage}
            title={msg.previousPage}
            onClick={() => goToPage(page.pageIndex - 1)}
          >
            <svg
              viewBox="0 0 16 16"
              width="12"
              height="12"
              aria-hidden="true"
              focusable="false"
            >
              <path d="m10 3.5-4.5 4.5L10 12.5" />
            </svg>
          </button>
          <span className="oge-simple-table-info" aria-live="polite">
            {ogeSimpleTablePageInfo(
              page,
              value.length,
              msg,
              props.locale ?? config.locale,
            )}
          </span>
          <button
            type="button"
            className="oge-simple-table-page-btn"
            data-oge-simple-table-pager="next"
            disabled={page.pageIndex >= page.pageCount - 1}
            aria-label={msg.nextPage}
            title={msg.nextPage}
            onClick={() => goToPage(page.pageIndex + 1)}
          >
            <svg
              viewBox="0 0 16 16"
              width="12"
              height="12"
              aria-hidden="true"
              focusable="false"
            >
              <path d="m6 3.5 4.5 4.5L6 12.5" />
            </svg>
          </button>
        </div>
      ) : null}
    </div>
  );
}

const EMPTY: readonly never[] = [];

/** Keys a render-prop row without wrapping it in extra DOM. */
function RowSlot({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export const OgeSimpleTable = forwardRef(SimpleTableInner) as <T>(
  props: OgeSimpleTableProps<T> & { ref?: Ref<OgeSimpleTableHandle> },
) => ReactElement | null;
