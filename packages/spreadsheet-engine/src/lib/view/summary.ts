/**
 * The status bar's summary of a selection, by Excel's rules (measured in
 * Excel 16.0, build 17932):
 *
 * - it shows only once two or more visible cells hold something;
 * - Count is those cells — text, numbers, logicals and errors alike;
 * - Average and Sum add the numbers (dates are numbers), and they disappear
 *   when the selection holds an error — only Count is left;
 * - hidden rows and columns are left out (C13:C18 with rows 14–15 hidden
 *   sums four cells);
 * - the numbers take the active cell's number format, whatever it holds
 *   (a text cell's General format gives `4200,5`, a date cell's a date).
 *
 * Several ranges add up like `SUM(range1, range2)`: a cell in two of them
 * counts twice.
 */
import type { OgeSheetRange } from '../address/address';
import { isOgeCellError } from '../model/cell';
import type { OgeWorksheet } from '../model/worksheet';
import type { OgeSheetLayout } from '../paint/sheet-layout';

/** What the status bar summarises. */
export interface OgeSelectionSummary {
  /** Non-empty visible cells. */
  readonly count: number;
  /** Visible cells holding numbers. */
  readonly numbers: number;
  /** Sum of the numbers; `null` when an error is selected or there is no number. */
  readonly sum: number | null;
  /** Their average; `null` likewise. */
  readonly average: number | null;
}

/** Summarises the visible cells of `ranges`. */
export function ogeSelectionSummary(
  sheet: OgeWorksheet,
  layout: OgeSheetLayout,
  ranges: readonly OgeSheetRange[],
): OgeSelectionSummary {
  let count = 0;
  let numbers = 0;
  let sum = 0;
  let error = false;
  for (const range of ranges) {
    sheet.forEachCell((cell, row, col) => {
      if (layout.rows.size(row) === 0 || layout.cols.size(col) === 0) return;
      const value = cell.value;
      if (value === undefined && cell.formula === undefined) return;
      count++;
      if (typeof value === 'number') {
        numbers++;
        sum += value;
      } else if (value !== undefined && isOgeCellError(value)) {
        error = true;
      }
    }, range);
  }
  const shown = numbers > 0 && !error;
  return {
    count,
    numbers,
    sum: shown ? sum : null,
    average: shown ? sum / numbers : null,
  };
}
