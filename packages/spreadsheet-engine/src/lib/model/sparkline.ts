/**
 * Sparklines (Excel 2010, the worksheet's `extLst` → `x14:sparklineGroups`):
 * small line, column or win/loss charts drawn inside a cell from a row or
 * column of data. A group shares its type, colours and options — Excel
 * edits a group together — and each of its sparklines names its cell and its
 * data.
 */
import type { OgeCellRef } from '../address/address';
import type { OgeColor } from '../color/color';

/** How a group draws its values (`type`): `stacked` is Excel's win/loss. */
export type OgeSparklineType = 'line' | 'column' | 'stacked';

/** What an empty data cell becomes (`displayEmptyCellsAs`). */
export type OgeSparklineEmptyCells = 'gap' | 'zero' | 'span';

/** Where an axis end comes from (`minAxisType`, `maxAxisType`). */
export type OgeSparklineAxisScale = 'individual' | 'group' | 'custom';

/** The colours of a group's parts (`x14:color*`); one left out is Excel's default for it. */
export interface OgeSparklineColors {
  readonly series?: OgeColor;
  readonly negative?: OgeColor;
  readonly axis?: OgeColor;
  readonly markers?: OgeColor;
  readonly first?: OgeColor;
  readonly last?: OgeColor;
  readonly high?: OgeColor;
  readonly low?: OgeColor;
}

/** One sparkline (`x14:sparkline`). */
export interface OgeSparkline {
  /** The cell it is drawn in (`xm:sqref`). */
  readonly cell: OgeCellRef;
  /**
   * Its data (`xm:f`): a range of one row or column, as written —
   * `Sheet1!B2:G2`, `'Q1 sales'!B2:B13`; omitted = none (nothing is drawn).
   */
  readonly ref?: string;
}

/** A group of sparklines (`x14:sparklineGroup`). */
export interface OgeSparklineGroup {
  readonly type: OgeSparklineType;
  readonly sparklines: readonly OgeSparkline[];
  readonly colors: OgeSparklineColors;
  /** The line's width in points (`lineWeight`, default 0.75). */
  readonly lineWeight: number;
  /** Mark every point of a line (`markers`). */
  readonly markers: boolean;
  /** Colour the highest, lowest, first and last points and the negative ones. */
  readonly high: boolean;
  readonly low: boolean;
  readonly first: boolean;
  readonly last: boolean;
  readonly negative: boolean;
  /** Draw the horizontal axis where zero is (`displayXAxis`). */
  readonly displayXAxis: boolean;
  /** Plot data in hidden rows and columns too (`displayHidden`). */
  readonly displayHidden: boolean;
  /** What empty cells become (`displayEmptyCellsAs`, default `zero`). */
  readonly displayEmptyCellsAs: OgeSparklineEmptyCells;
  readonly minAxisType: OgeSparklineAxisScale;
  readonly maxAxisType: OgeSparklineAxisScale;
  /** The custom axis ends (`manualMin`, `manualMax`). */
  readonly manualMin?: number;
  readonly manualMax?: number;
  /** Points right to left (`rightToLeft`). */
  readonly rightToLeft: boolean;
  /**
   * The dates that place the points (`dateAxis` with the group's `xm:f`),
   * one cell per point; omitted = evenly spaced.
   */
  readonly dateRef?: string;
}
