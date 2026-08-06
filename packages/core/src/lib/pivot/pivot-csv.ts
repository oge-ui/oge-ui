import type { PivotAxisNode, PivotResult } from './pivot-types';

export interface PivotCsvOptions {
  /** Field separator. Default `,`. */
  separator?: string;
  /** Prefix with a UTF-8 BOM so spreadsheet apps detect the encoding. Default true. */
  bom?: boolean;
  /** Label of the grand-total lines. Default `Grand Total`. */
  grandTotalText?: string;
  /** Corner-cell caption above the row headers. Default empty. */
  cornerText?: string;
}

function escapeCell(text: string, separator: string): string {
  if (text.includes(separator) || text.includes('"') || text.includes('\n') || text.includes('\r')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function slotLabels(nodes: readonly PivotAxisNode[], grandText: string): string[] {
  const labels: string[] = [];
  const visit = (list: readonly PivotAxisNode[], trail: readonly string[]): void => {
    for (const node of list) {
      const ownTrail = node.isGrandTotal ? [grandText] : [...trail, node.text || ''];
      if (node.leafIndex >= 0) labels[node.leafIndex] = ownTrail.join(' / ');
      if (node.children.length) visit(node.children, ownTrail);
    }
  };
  visit(nodes, []);
  return labels;
}

/**
 * Flattens a materialized pivot into CSV: one header row with the column
 * paths (multi-level labels joined with ` / `, one column per measure), then
 * one line per visible row slot. Totals rows/columns come through as their
 * slots — exactly what is on screen is what exports.
 */
export function buildPivotCsv(result: PivotResult, options: PivotCsvOptions = {}): string {
  const separator = options.separator ?? ',';
  const grandText = options.grandTotalText ?? 'Grand Total';
  const rowLabels = slotLabels(result.rowRoot, grandText);
  const columnLabels = slotLabels(result.columnRoot, grandText);
  const multiMeasure = result.measures.length > 1;

  const header: string[] = [options.cornerText ?? ''];
  for (let c = 0; c < result.columnLeafCount; c++) {
    for (const measure of result.measures) {
      const label = columnLabels[c] ?? '';
      header.push(
        multiMeasure ? `${label} — ${measure.caption ?? measure.dataField}` : label
      );
    }
  }

  const lines: string[] = [header.map((cell) => escapeCell(cell, separator)).join(separator)];
  for (let r = 0; r < result.rowLeafCount; r++) {
    const cells: string[] = [rowLabels[r] ?? ''];
    for (let c = 0; c < result.columnLeafCount; c++) {
      for (let m = 0; m < result.measures.length; m++) {
        const value = result.values[r]?.[c]?.[m];
        cells.push(value == null ? '' : String(value));
      }
    }
    lines.push(cells.map((cell) => escapeCell(cell, separator)).join(separator));
  }
  const body = lines.join('\r\n');
  return options.bom === false ? body : `\uFEFF${body}`;
}
