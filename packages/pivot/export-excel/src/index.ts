import { Workbook } from 'exceljs';
import type { PivotAxisNode, PivotResult } from '@oge-ui/core';
import type { OgePivotGrid } from '@oge-ui/pivot';

export interface OgePivotExcelExportOptions {
  /** Download file name. Default: `pivot.xlsx`. */
  filename?: string;
  /** Worksheet name. Default: `Pivot`. */
  sheetName?: string;
  /** Grand-total label. Default: `Grand Total`. */
  grandTotalText?: string;
}

interface HeaderCell {
  text: string;
  rowStart: number;
  rowEnd: number;
  columnStart: number;
  span: number;
  isTotal: boolean;
}

function axisDepth(nodes: readonly PivotAxisNode[]): number {
  let depth = 1;
  const visit = (list: readonly PivotAxisNode[], level: number): void => {
    for (const node of list) {
      depth = Math.max(depth, level + 1);
      visit(node.children, level + 1);
    }
  };
  visit(nodes, 0);
  return depth;
}

function headerCells(
  nodes: readonly PivotAxisNode[],
  depth: number,
  grandText: string,
): HeaderCell[] {
  const cells: HeaderCell[] = [];
  const startOf = (node: PivotAxisNode): number =>
    node.leafIndex >= 0 ? node.leafIndex : startOf(node.children[0]);
  const visit = (list: readonly PivotAxisNode[], level: number): void => {
    for (const node of list) {
      cells.push({
        text: node.isGrandTotal ? grandText : node.text,
        rowStart: level + 1,
        rowEnd: node.children.length ? level + 1 : depth,
        columnStart: startOf(node) + 1,
        span: Math.max(1, node.leafCount),
        isTotal: node.isTotal || node.isGrandTotal,
      });
      visit(node.children, level + 1);
    }
  };
  visit(nodes, 0);
  return cells;
}

function rowLabels(
  nodes: readonly PivotAxisNode[],
  grandText: string,
): string[] {
  const labels: string[] = [];
  const visit = (list: readonly PivotAxisNode[], level: number): void => {
    for (const node of list) {
      if (node.leafIndex >= 0) {
        labels[node.leafIndex] =
          '  '.repeat(Math.max(0, level)) +
          (node.isGrandTotal ? grandText : node.text);
      }
      visit(node.children, level + 1);
    }
  };
  visit(nodes, 0);
  return labels;
}

/**
 * Builds an exceljs Workbook from a materialized pivot: multi-level column
 * headers become merged cells, row headers keep their tree indentation, and
 * numeric values stay typed. Pure and testable — use
 * {@link exportPivotToExcel} for the one-call grid → download flow.
 */
export function buildPivotWorkbook(
  result: PivotResult,
  options: OgePivotExcelExportOptions = {},
): Workbook {
  const grandText = options.grandTotalText ?? 'Grand Total';
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet(options.sheetName ?? 'Pivot');
  const depth = axisDepth(result.columnRoot);
  const measureCount = Math.max(1, result.measures.length);

  // column headers (offset by one for the row-header column)
  for (const cell of headerCells(result.columnRoot, depth, grandText)) {
    const columnStart = 2 + (cell.columnStart - 1) * measureCount;
    const columnEnd = columnStart + cell.span * measureCount - 1;
    const target = sheet.getCell(cell.rowStart, columnStart);
    target.value = cell.text;
    target.font = { bold: true };
    if (cell.rowEnd > cell.rowStart || columnEnd > columnStart) {
      sheet.mergeCells(cell.rowStart, columnStart, cell.rowEnd, columnEnd);
    }
  }
  // measure captions under the leaf headers when there are several measures
  if (result.measures.length > 1) {
    for (let c = 0; c < result.columnLeafCount; c++) {
      result.measures.forEach((measure, m) => {
        const cell = sheet.getCell(depth + 1, 2 + c * measureCount + m);
        cell.value = measure.caption ?? measure.dataField;
        cell.font = { bold: true };
      });
    }
  }

  const headerRows = depth + (result.measures.length > 1 ? 1 : 0);
  const labels = rowLabels(result.rowRoot, grandText);
  for (let r = 0; r < result.rowLeafCount; r++) {
    const excelRow = sheet.getRow(headerRows + 1 + r);
    excelRow.getCell(1).value = labels[r] ?? '';
    for (let c = 0; c < result.columnLeafCount; c++) {
      for (let m = 0; m < measureCount; m++) {
        const value = result.values[r]?.[c]?.[m];
        excelRow.getCell(2 + c * measureCount + m).value =
          typeof value === 'number'
            ? value
            : value == null
              ? ''
              : String(value);
      }
    }
  }
  sheet.getColumn(1).width = 28;
  return workbook;
}

/** Exports the pivot's current view as an `.xlsx` download. */
export async function exportPivotToExcel<T extends object>(
  grid: OgePivotGrid<T>,
  options: OgePivotExcelExportOptions = {},
): Promise<void> {
  const workbook = buildPivotWorkbook(grid.getResult(), options);
  if (typeof document === 'undefined') return;
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = options.filename ?? 'pivot.xlsx';
  anchor.click();
  URL.revokeObjectURL(url);
}
