/**
 * What a worksheet carries besides cells: hyperlinks, notes, conditional
 * formats, data validations, the auto-filter, page setup and protection.
 *
 * The shapes follow SpreadsheetML closely so the writer (P2) can put back
 * what the reader took out. Anything that holds a formula keeps it as text
 * (A1 notation, no leading `=`); the formula engine (P3) interprets it.
 */
import type { OgeSheetRange } from '../address/address';
import type { OgeColor } from '../color/color';
import type { OgeRichText } from './cell';

/** A hyperlink over a range. */
export interface OgeHyperlink {
  readonly range: OgeSheetRange;
  /**
   * External target as the file states it (`https://…`, `mailto:…`). The
   * render layers pass it through `sanitizeUrl` before it becomes an `href`.
   */
  readonly target?: string;
  /** A place inside the workbook: `Sheet2!A1`, `'My sheet'!B4:C9` or a defined name. */
  readonly location?: string;
  /** Screen tip. */
  readonly tooltip?: string;
  /** Display text the file recorded (Excel shows the cell's value instead). */
  readonly display?: string;
}

/** A note — Excel's legacy comment, shown on hover. */
export interface OgeNote {
  readonly text: string | OgeRichText;
  readonly author?: string;
  /** Pinned open (`<x:Visible/>` in the note's VML shape). */
  readonly visible?: boolean;
  /** Excel also wrote it as a threaded comment (this is the legacy copy). */
  readonly threaded?: boolean;
}

/** A conditional-format rule kind (`cfRule/@type`). */
export type OgeConditionalRuleType =
  | 'cellIs'
  | 'expression'
  | 'colorScale'
  | 'dataBar'
  | 'iconSet'
  | 'top10'
  | 'uniqueValues'
  | 'duplicateValues'
  | 'containsText'
  | 'notContainsText'
  | 'beginsWith'
  | 'endsWith'
  | 'containsBlanks'
  | 'notContainsBlanks'
  | 'containsErrors'
  | 'notContainsErrors'
  | 'timePeriod'
  | 'aboveAverage';

/** A threshold of a colour scale, data bar or icon set (`cfvo`). */
export interface OgeConditionalValue {
  readonly type:
    | 'num'
    | 'percent'
    | 'max'
    | 'min'
    | 'formula'
    | 'percentile'
    | 'autoMin'
    | 'autoMax';
  /** The number or formula text, when the type takes one. */
  readonly value?: string;
  /** `gte="0"`: the threshold is exclusive (icon sets). */
  readonly greaterThan?: boolean;
}

/** A colour scale: two or three thresholds and their colours. */
export interface OgeColorScale {
  readonly values: readonly OgeConditionalValue[];
  readonly colors: readonly OgeColor[];
}

/** A data bar. */
export interface OgeDataBar {
  readonly min: OgeConditionalValue;
  readonly max: OgeConditionalValue;
  readonly color: OgeColor;
  /** Show the value beside the bar (`showValue`, default `true`). */
  readonly showValue: boolean;
  /** Bar length bounds in percent of the cell (`minLength`/`maxLength`, 10/90). */
  readonly minLength: number;
  readonly maxLength: number;
}

/** An icon set. */
export interface OgeIconSet {
  /** `3Arrows`, `3TrafficLights1`, `4Rating`, `5Quarters`, … */
  readonly iconSet: string;
  readonly values: readonly OgeConditionalValue[];
  readonly reverse: boolean;
  readonly showValue: boolean;
}

/** One rule of a conditional format. */
export interface OgeConditionalRule {
  readonly type: OgeConditionalRuleType;
  /** Lower runs first. */
  readonly priority: number;
  /** Index into the workbook's differential formats (`dxfs`). */
  readonly dxf?: number;
  readonly stopIfTrue?: boolean;
  /** `cellIs`: `between`, `equal`, `greaterThan`, …; text rules: `containsText`, … */
  readonly operator?: string;
  /** Formulas (no leading `=`), in order. */
  readonly formulas: readonly string[];
  /** Text of the text rules. */
  readonly text?: string;
  /** `today`, `yesterday`, `last7Days`, `thisMonth`, … */
  readonly timePeriod?: string;
  /** `top10`: how many; `percent`: of the count; `bottom`: lowest instead. */
  readonly rank?: number;
  readonly percent?: boolean;
  readonly bottom?: boolean;
  /** `aboveAverage`: above (`true`, default) or below; with the mean, or n standard deviations. */
  readonly aboveAverage?: boolean;
  readonly equalAverage?: boolean;
  readonly stdDev?: number;
  readonly colorScale?: OgeColorScale;
  readonly dataBar?: OgeDataBar;
  readonly iconSet?: OgeIconSet;
}

/** Rules applying to a set of ranges (`conditionalFormatting/@sqref`). */
export interface OgeConditionalFormat {
  readonly ranges: readonly OgeSheetRange[];
  readonly rules: readonly OgeConditionalRule[];
}

/** A data-validation rule (`dataValidation`) — kept for the editor (P2). */
export interface OgeDataValidation {
  readonly ranges: readonly OgeSheetRange[];
  readonly type:
    | 'none'
    | 'whole'
    | 'decimal'
    | 'list'
    | 'date'
    | 'time'
    | 'textLength'
    | 'custom';
  readonly operator?: string;
  readonly formula1?: string;
  readonly formula2?: string;
  readonly allowBlank?: boolean;
  /** Excel's attribute is inverted: `showDropDown="1"` **hides** the list arrow. */
  readonly hideDropDown?: boolean;
  readonly showInputMessage?: boolean;
  readonly showErrorMessage?: boolean;
  readonly errorStyle?: 'stop' | 'warning' | 'information';
  readonly promptTitle?: string;
  readonly prompt?: string;
  readonly errorTitle?: string;
  readonly error?: string;
}

/** The auto-filter: its range and each filtered column's raw criteria. */
export interface OgeAutoFilter {
  readonly range: OgeSheetRange;
  /** Columns with criteria: zero-based offset in the range and the `filterColumn` XML. */
  readonly columns: readonly {
    readonly offset: number;
    readonly xml: string;
    /** The column shows no filter button (`hiddenButton`, or `showButton="0"`). */
    readonly hiddenButton?: boolean;
  }[];
}

/** Page setup and print options of a sheet. */
export interface OgePageSetup {
  readonly orientation?: 'portrait' | 'landscape';
  /** Excel's paper size code (1 Letter, 9 A4, …). */
  readonly paperSize?: number;
  /** Print scale in percent. */
  readonly scale?: number;
  /** Fit to this many pages across / down (0 = automatic) when `fitToPage`. */
  readonly fitToWidth?: number;
  readonly fitToHeight?: number;
  readonly fitToPage?: boolean;
  /** Margins in inches. */
  readonly margins?: {
    readonly left: number;
    readonly right: number;
    readonly top: number;
    readonly bottom: number;
    readonly header: number;
    readonly footer: number;
  };
  readonly printGridLines?: boolean;
  readonly printHeadings?: boolean;
  readonly centerHorizontally?: boolean;
  readonly centerVertically?: boolean;
  /** Header/footer codes as stored (`&C&P of &N`). */
  readonly oddHeader?: string;
  readonly oddFooter?: string;
  /** Manual breaks: rows/columns a new page starts **after** (zero-based). */
  readonly rowBreaks?: readonly number[];
  readonly columnBreaks?: readonly number[];
}

/** Sheet protection as stored — enforced by the editor (P2). */
export interface OgeSheetProtection {
  /** Every attribute of `sheetProtection`, verbatim (hash, salt, allowed actions). */
  readonly attributes: Readonly<Record<string, string>>;
}

/**
 * Worksheet content the engine does not model yet, kept byte-for-byte for
 * the writer: each element's XML and the element it followed in the file.
 */
export interface OgeSheetPassthrough {
  readonly name: string;
  readonly xml: string;
}

/** A cell corner a picture is anchored to, with offsets in px (96 dpi). */
export interface OgePictureCorner {
  readonly row: number;
  readonly col: number;
  readonly rowOffset: number;
  readonly colOffset: number;
}

/**
 * Where a picture sits. `twoCell` stretches between two cell corners,
 * `oneCell` has a corner and a size, `absolute` a position and a size
 * (px at 96 dpi, 100% zoom).
 */
export type OgePictureAnchor =
  | {
      readonly kind: 'twoCell' | 'oneCell' | 'absolute';
      readonly from: OgePictureCorner;
      readonly to: OgePictureCorner;
    }
  | {
      readonly kind: 'twoCell' | 'oneCell' | 'absolute';
      readonly from: OgePictureCorner;
      readonly width: number;
      readonly height: number;
    }
  | {
      readonly kind: 'absolute';
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
    };

/** A picture floating over the sheet. */
export interface OgePicture {
  readonly anchor: OgePictureAnchor;
  /** The media part it shows (`xl/media/image1.png`, in the workbook's opaque parts). */
  readonly image: string;
  readonly name?: string;
  /** Alternative text (`descr`). */
  readonly description?: string;
  readonly hidden?: boolean;
  /** Cropped fractions of the source image per side. */
  readonly crop?: {
    readonly left: number;
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
  };
  /** Clockwise degrees. */
  readonly rotation?: number;
  readonly flipH?: boolean;
  readonly flipV?: boolean;
}
