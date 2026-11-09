/**
 * The Word document model: what a docx file says once styles, numbering and
 * table styles are resolved. Lengths are points.
 */
import type { OgeThemeColors } from '../color/color';
import type { OgeChartModel } from '../model/chart';

/** Character formatting, fully resolved. */
export interface OgeWordRunStyle {
  readonly font: string;
  /** Points. */
  readonly size: number;
  readonly bold: boolean;
  readonly italic: boolean;
  readonly underline: boolean;
  readonly strike: boolean;
  readonly caps: boolean;
  /** `RRGGBB`. */
  readonly color: string;
  /** `RRGGBB` behind the text, or `null`. */
  readonly background: string | null;
  readonly vertAlign: 'baseline' | 'superscript' | 'subscript';
  /** Target of a hyperlink, unsanitized. */
  readonly link?: string;
}

/** A picture part and how it is cut. */
export interface OgeWordPicture {
  readonly media: string;
  readonly crop: {
    readonly left: number;
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
  };
}

/** How text flows around a floating object. */
export type OgeWordWrap = 'square' | 'topAndBottom' | 'none';

/** A floating picture. */
export interface OgeWordFloat {
  readonly picture: OgeWordPicture;
  readonly width: number;
  readonly height: number;
  readonly horizontal: OgeWordFloatPosition;
  readonly vertical: OgeWordFloatPosition;
  readonly wrap: OgeWordWrap;
  readonly behind: boolean;
  /** Gaps kept around it. */
  readonly distance: {
    readonly left: number;
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
  };
  readonly description?: string;
}

/** One axis of a floating object's position. */
export interface OgeWordFloatPosition {
  /** `page`, `margin`, `column`, `paragraph`, `line`, … as written. */
  readonly from: string;
  /** Points from the origin, or `null` when `align` is used. */
  readonly offset: number | null;
  readonly align: string | null;
}

/** A piece of a paragraph. */
export type OgeWordInline =
  | {
      readonly kind: 'text';
      readonly text: string;
      readonly style: OgeWordRunStyle;
    }
  | { readonly kind: 'tab'; readonly style: OgeWordRunStyle }
  | {
      readonly kind: 'break';
      readonly type: 'line' | 'page' | 'column';
      readonly style: OgeWordRunStyle;
    }
  | {
      readonly kind: 'picture';
      readonly picture: OgeWordPicture;
      readonly width: number;
      readonly height: number;
      readonly description?: string;
    }
  | {
      readonly kind: 'chart';
      readonly chart: OgeChartModel;
      readonly theme: OgeThemeColors;
      readonly bodyFont?: string;
      readonly width: number;
      readonly height: number;
    }
  | { readonly kind: 'float'; readonly float: OgeWordFloat }
  | {
      readonly kind: 'footnote';
      readonly id: string;
      /** The note's mark in the text. */
      readonly style: OgeWordRunStyle;
    }
  | {
      /** Replaced by the number while the page is laid out. */
      readonly kind: 'field';
      readonly field: 'page' | 'pages';
      readonly style: OgeWordRunStyle;
    };

/** A tab stop. */
export interface OgeWordTab {
  readonly position: number;
  readonly align: 'left' | 'center' | 'right' | 'decimal';
  readonly leader: string;
}

/** A border line. */
export interface OgeWordBorder {
  /** Points. */
  readonly width: number;
  /** `RRGGBB`. */
  readonly color: string;
  /** The `w:val` as written (`single`, `dashed`, …). */
  readonly style: string;
  /** Points of space between text and line (paragraph borders). */
  readonly space: number;
}

/** Line spacing: a multiple (of 240), or a measure in points. */
export interface OgeWordLineSpacing {
  readonly rule: 'auto' | 'exact' | 'atLeast';
  readonly value: number;
}

/** A paragraph. */
export interface OgeWordParagraph {
  readonly kind: 'paragraph';
  readonly styleId: string;
  readonly align: 'left' | 'center' | 'right' | 'both';
  readonly left: number;
  readonly right: number;
  /** Negative for a hanging first line. */
  readonly first: number;
  readonly before: number;
  readonly after: number;
  readonly line: OgeWordLineSpacing;
  readonly keepNext: boolean;
  readonly keepLines: boolean;
  readonly widowControl: boolean;
  readonly pageBreakBefore: boolean;
  readonly contextualSpacing: boolean;
  readonly tabs: readonly OgeWordTab[];
  /** `RRGGBB` behind the paragraph, or `null`. */
  readonly shading: string | null;
  readonly borders: Readonly<Partial<Record<OgeWordEdge, OgeWordBorder>>>;
  /** The list label, resolved to its number. */
  readonly label: {
    readonly text: string;
    readonly style: OgeWordRunStyle;
    readonly suffix: 'tab' | 'space' | 'nothing';
  } | null;
  readonly inlines: readonly OgeWordInline[];
  /** The paragraph mark's formatting: an empty paragraph's height comes from it. */
  readonly mark: OgeWordRunStyle;
}

/** The sides of a box. */
export type OgeWordEdge = 'top' | 'left' | 'bottom' | 'right';

/** A table cell. */
export interface OgeWordCell {
  readonly columnSpan: number;
  /** `restart` begins a vertical merge, `continue` is covered by one. */
  readonly verticalMerge: 'none' | 'restart' | 'continue';
  readonly shading: string | null;
  readonly borders: Readonly<Partial<Record<OgeWordEdge, OgeWordBorder>>>;
  readonly margins: {
    readonly left: number;
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
  };
  readonly verticalAlign: 'top' | 'center' | 'bottom';
  readonly blocks: readonly OgeWordBlock[];
}

/** A table row. */
export interface OgeWordRow {
  readonly height: number;
  readonly heightRule: 'auto' | 'atLeast' | 'exact';
  readonly header: boolean;
  readonly cantSplit: boolean;
  /** Grid columns skipped before the first cell. */
  readonly skipBefore: number;
  readonly cells: readonly OgeWordCell[];
}

/** A table. */
export interface OgeWordTable {
  readonly kind: 'table';
  readonly columns: readonly number[];
  readonly indent: number;
  readonly align: 'left' | 'center' | 'right';
  readonly rows: readonly OgeWordRow[];
}

/** What flows down a page. */
export type OgeWordBlock = OgeWordParagraph | OgeWordTable;

/** Page geometry. */
export interface OgeWordPageSetup {
  readonly width: number;
  readonly height: number;
  readonly top: number;
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
  readonly header: number;
  readonly footer: number;
  readonly columns: number;
  readonly columnGap: number;
}

/** Header or footer content for each kind of page. */
export interface OgeWordHeaderSet {
  readonly default?: readonly OgeWordBlock[];
  readonly first?: readonly OgeWordBlock[];
  readonly even?: readonly OgeWordBlock[];
}

/** A section. */
export interface OgeWordSection {
  readonly page: OgeWordPageSetup;
  readonly type: 'nextPage' | 'continuous' | 'evenPage' | 'oddPage';
  readonly titlePage: boolean;
  readonly headers: OgeWordHeaderSet;
  readonly footers: OgeWordHeaderSet;
  readonly blocks: readonly OgeWordBlock[];
}

/** A document. */
export interface OgeWordDocument {
  readonly sections: readonly OgeWordSection[];
  /** Points between default tab stops. */
  readonly defaultTab: number;
  readonly evenAndOddHeaders: boolean;
  readonly footnotes: ReadonlyMap<string, readonly OgeWordBlock[]>;
  readonly media: ReadonlyMap<
    string,
    { readonly bytes: Uint8Array; readonly contentType: string }
  >;
}
