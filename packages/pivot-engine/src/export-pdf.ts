/**
 * The pure `.pdf` builder of the pivot grid, shared by both render layers
 * (ADR 0003) — `@oge-ui/pivot/export-pdf` and
 * `@oge-ui/react-pivot/export-pdf` keep only the download step.
 *
 * It writes exactly what is on screen: the multi-level column headers with
 * their spans (repeated on every page), one header column per row field in
 * the outline / tabular layouts or an indented one in the compact layout,
 * subtotal and grand-total lines in bold, the cell text the grid renders
 * (`cellText`, its formats and `customizeCell` included), page header /
 * footer callbacks and page numbers. The page chrome is `@oge-ui/behavior`'s,
 * so a pivot PDF looks like a grid PDF.
 *
 * `jspdf` and `jspdf-autotable` are **optional peers**.
 */
import type { jsPDF } from 'jspdf';
import autoTable, { type CellDef } from 'jspdf-autotable';
import {
  applyOgePdfPageChrome,
  createOgePdfDocument,
  ogePdfCellStyles,
  ogePdfLayout,
  type OgePdfPageInfo,
  type OgePdfPageOptions,
} from '@oge-ui/behavior/export-pdf';
import type { OgeExportCellStyle } from '@oge-ui/behavior';
import type { PivotResult } from '@oge-ui/core';
import {
  OGE_DEFAULT_PIVOT_MESSAGES,
  type OgePivotMessages,
} from './lib/pivot-messages';
import {
  pivotAxisDepth,
  pivotAxisLines,
  pivotColumnHeaderCells,
} from './lib/pivot-layout';
import {
  pivotRowHeaderSegments,
  type OgePivotRowHeaderLayout,
} from './lib/pivot-row-header';

export type { OgePdfPageInfo };

/** A value cell as the PDF builder hands it to `customizeCell`. */
export interface OgePivotPdfCell {
  readonly rowIndex: number;
  readonly columnIndex: number;
  readonly measureIndex: number;
  readonly value: unknown;
  readonly isTotal: boolean;
  /** Mutable: the text written. */
  text: string;
  /** Mutable: the cell's style. */
  style: OgeExportCellStyle;
}

export interface OgePivotPdfExportOptions extends OgePdfPageOptions {
  /** Download file name. Default: `pivot.pdf`. */
  filename?: string;
  /** Header texts (grand total, `{0} Total`, blank). Default: the English catalog. */
  messages?: Partial<OgePivotMessages>;
  /** Row-header layout, like the grid's. Default `'compact'`. */
  rowHeaderLayout?: OgePivotRowHeaderLayout;
  /** Captions over the row-header columns (row field captions). */
  rowFieldCaptions?: readonly string[];
  /**
   * The text of a value cell — the render layers pass the grid's own
   * prepared text (formats, display modes, `customizeCell`). Default: the
   * number with grouping separators.
   */
  cellText?: (
    rowIndex: number,
    columnIndex: number,
    measureIndex: number,
  ) => string;
  /** Restyle / rewrite single value cells. */
  customizeCell?: (cell: OgePivotPdfCell) => void;
}

const TOTAL_STYLE: OgeExportCellStyle = { bold: true, background: '#f6f7f9' };
const HEAD_STYLE: OgeExportCellStyle = {
  bold: true,
  background: '#f1f3f5',
  color: '#1f2937',
};

function defaultText(value: unknown): string {
  if (value == null) return '';
  return typeof value === 'number' ? value.toLocaleString() : String(value);
}

/**
 * Builds a jsPDF document from a materialized pivot — pure and testable.
 * Each render layer's `exportPivotToPdf` is the one-call grid → download flow.
 */
export function buildPivotPdfDocument(
  result: PivotResult,
  options: OgePivotPdfExportOptions = {},
): jsPDF {
  const messages = { ...OGE_DEFAULT_PIVOT_MESSAGES, ...options.messages };
  const doc = createOgePdfDocument(options);
  const { startY, margin } = ogePdfLayout(doc, options);
  const measureCount = Math.max(1, result.measures.length);
  const layout = options.rowHeaderLayout ?? 'compact';
  const rowLines = pivotAxisLines(result.rowRoot, messages);
  const segments = pivotRowHeaderSegments(
    rowLines,
    layout,
    options.rowFieldCaptions?.length ?? pivotAxisDepth(result.rowRoot),
  );
  const headerColumns = segments ? Math.max(1, segments[0]?.length ?? 1) : 1;
  const depth = pivotAxisDepth(result.columnRoot);
  const headRows = depth + (result.measures.length > 1 ? 1 : 0);
  const headStyles = ogePdfCellStyles(HEAD_STYLE);

  // --- head: corner(s), spanning column headers, measure captions ---
  const head: { column: number; cell: CellDef }[][] = Array.from(
    { length: headRows },
    () => [],
  );
  for (let c = 0; c < headerColumns; c++) {
    head[0].push({
      column: c,
      cell: {
        content: options.rowFieldCaptions?.[c] ?? '',
        rowSpan: headRows,
        styles: headStyles,
      },
    });
  }
  for (const cell of pivotColumnHeaderCells(
    result.columnRoot,
    depth,
    messages,
  )) {
    head[cell.rowStart - 1].push({
      column: headerColumns + (cell.columnStart - 1) * measureCount,
      cell: {
        content: cell.text,
        rowSpan: cell.rowEnd - cell.rowStart,
        colSpan: cell.span * measureCount,
        styles: { ...headStyles, halign: 'center' },
      },
    });
  }
  if (result.measures.length > 1) {
    for (let c = 0; c < result.columnLeafCount; c++) {
      result.measures.forEach((measure, m) => {
        head[depth].push({
          column: headerColumns + c * measureCount + m,
          cell: {
            content: measure.caption ?? measure.dataField,
            styles: { ...headStyles, halign: 'right' },
          },
        });
      });
    }
  }
  const headRowsOut = head.map((row) =>
    row.sort((a, b) => a.column - b.column).map((entry) => entry.cell),
  );

  // --- body ---
  const columnTotal = new Array<boolean>(result.columnLeafCount).fill(false);
  const markColumns = (nodes: PivotResult['columnRoot']): void => {
    for (const node of nodes) {
      if (node.leafIndex >= 0 && (node.isTotal || node.isGrandTotal))
        columnTotal[node.leafIndex] = true;
      markColumns(node.children);
    }
  };
  markColumns(result.columnRoot);
  const body: CellDef[][] = rowLines.map((line, r) => {
    const rowIsTotal = line.isTotal || line.isGrandTotal;
    const labelStyle = ogePdfCellStyles(rowIsTotal ? TOTAL_STYLE : {});
    const labels: CellDef[] = segments
      ? (segments[r] ?? []).map((text) => ({
          content: text,
          styles: labelStyle,
        }))
      : [
          {
            content: line.text,
            styles: {
              ...labelStyle,
              cellPadding: {
                top: 2,
                bottom: 2,
                right: 2,
                left: 2 + line.level * 4,
              },
            },
          },
        ];
    const values: CellDef[] = [];
    for (let c = 0; c < result.columnLeafCount; c++) {
      for (let m = 0; m < measureCount; m++) {
        const value = result.values[r]?.[c]?.[m];
        const isTotal = rowIsTotal || columnTotal[c];
        const cell: OgePivotPdfCell = {
          rowIndex: r,
          columnIndex: c,
          measureIndex: m,
          value,
          isTotal,
          text: options.cellText
            ? options.cellText(r, c, m)
            : defaultText(value),
          style: { alignment: 'end', ...(isTotal ? TOTAL_STYLE : {}) },
        };
        options.customizeCell?.(cell);
        values.push({
          content: cell.text,
          styles: ogePdfCellStyles(cell.style),
        });
      }
    }
    return [...labels, ...values];
  });

  autoTable(doc, {
    startY,
    margin,
    head: headRowsOut,
    body,
    showHead: options.repeatHeader === false ? 'firstPage' : 'everyPage',
    tableWidth: options.fitToWidth === false ? 'wrap' : 'auto',
    theme: 'grid',
    styles: {
      fontSize: options.fontSize ?? 9,
      cellPadding: 2,
      lineWidth: 0.1,
      lineColor: '#d0d5dd',
      textColor: '#1f2937',
      overflow: 'linebreak',
    },
  });
  applyOgePdfPageChrome(doc, options);
  return doc;
}

/**
 * Saves a pivot document as a download — the one DOM step both render
 * layers' `exportPivotToPdf` share; a no-op without a document (SSR).
 */
export function downloadPivotPdf(doc: jsPDF, filename = 'pivot.pdf'): void {
  if (typeof document === 'undefined') return;
  doc.save(filename);
}
