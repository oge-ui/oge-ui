/**
 * The presentation model: what a pptx file shows once every inherited
 * property (theme, master, layout, placeholder, table style) is resolved.
 * Lengths are EMU (914400 per inch, 12700 per point), as in the file.
 */

import type { OgeThemeColors } from '../color/color';
import type { OgeChartModel } from '../model/chart';

/** A resolved colour. */
export interface OgeSlideColor {
  /** `RRGGBB`. */
  readonly rgb: string;
  /** 0 (transparent) to 1 (opaque). */
  readonly alpha: number;
}

/** One stop of a gradient. */
export interface OgeSlideGradientStop {
  /** 0 to 1 along the gradient. */
  readonly position: number;
  readonly color: OgeSlideColor;
}

/** A fill. */
export type OgeSlideFill =
  | { readonly kind: 'none' }
  | { readonly kind: 'solid'; readonly color: OgeSlideColor }
  | {
      readonly kind: 'gradient';
      readonly stops: readonly OgeSlideGradientStop[];
      /** Degrees clockwise from left-to-right; `null` for a path gradient. */
      readonly angle: number | null;
    }
  | { readonly kind: 'picture'; readonly picture: OgeSlidePictureRef }
  | {
      readonly kind: 'pattern';
      /** The preset name as written (`ltDnDiag`, `pct25`, …). */
      readonly preset: string;
      readonly foreground: OgeSlideColor;
      readonly background: OgeSlideColor;
    };

/** An outer shadow. */
export interface OgeSlideShadow {
  /** EMU. */
  readonly blur: number;
  /** EMU. */
  readonly distance: number;
  /** Degrees clockwise from the x axis. */
  readonly direction: number;
  readonly color: OgeSlideColor;
}

/** One sub-path of a custom outline, in its own coordinate box. */
export interface OgeSlideCustomPath {
  readonly width: number;
  readonly height: number;
  /** `false` for an outline-only sub-path. */
  readonly filled: boolean;
  /** `false` for a fill-only sub-path. */
  readonly stroked: boolean;
  readonly commands: readonly OgeSlidePathCommand[];
}

/** A drawing command of a custom outline. */
export type OgeSlidePathCommand =
  | { readonly op: 'M' | 'L'; readonly x: number; readonly y: number }
  | { readonly op: 'C' | 'Q'; readonly points: readonly number[] }
  | {
      readonly op: 'A';
      readonly rx: number;
      readonly ry: number;
      /** Degrees. */
      readonly start: number;
      readonly sweep: number;
    }
  | { readonly op: 'Z' };

/** A picture part and its crop. */
export interface OgeSlidePictureRef {
  /** Key in {@link OgePresentation.media}. */
  readonly media: string;
  /** Fractions cut from each edge. */
  readonly crop: {
    readonly left: number;
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
  };
}

/** An outline. */
export interface OgeSlideLine {
  readonly fill: OgeSlideFill;
  /** EMU. */
  readonly width: number;
  /** The preset name as written: `solid`, `dash`, `sysDot`, … */
  readonly dash: string;
  readonly cap: string;
}

/** A character run. */
export interface OgeSlideTextRun {
  readonly text: string;
  readonly font: string;
  /** Points. */
  readonly size: number;
  readonly bold: boolean;
  readonly italic: boolean;
  readonly underline: boolean;
  readonly strike: boolean;
  readonly color: OgeSlideColor;
  /** Percent of the size, positive above the line. 0 for normal text. */
  readonly baseline: number;
  /** External link target, unsanitized: the renderer must sanitize it. */
  readonly link?: string;
}

/** Line spacing: a percent of the font's line height, or exact points. */
export type OgeSlideSpacing =
  | { readonly kind: 'percent'; readonly value: number }
  | { readonly kind: 'points'; readonly value: number };

/** What precedes a paragraph's first line. */
export type OgeSlideBullet =
  | { readonly kind: 'none' }
  | {
      readonly kind: 'char';
      readonly char: string;
      readonly font?: string;
      readonly color?: OgeSlideColor;
      /** Percent of the text size. */
      readonly size: number;
    }
  | {
      readonly kind: 'number';
      /** The scheme name as written (`arabicPeriod`, `romanUcPeriod`, …). */
      readonly scheme: string;
      readonly startAt: number;
      readonly color?: OgeSlideColor;
      readonly size: number;
    };

/** A paragraph. */
export interface OgeSlideParagraph {
  /** 0-based outline level. */
  readonly level: number;
  readonly align: string;
  readonly rtl: boolean;
  /** EMU. */
  readonly marginLeft: number;
  /** EMU; negative for a hanging indent. */
  readonly indent: number;
  readonly lineSpacing: OgeSlideSpacing;
  readonly spaceBefore: OgeSlideSpacing;
  readonly spaceAfter: OgeSlideSpacing;
  readonly bullet: OgeSlideBullet;
  readonly runs: readonly OgeSlideTextRun[];
  /** Points: an empty paragraph's height comes from it. */
  readonly endSize: number;
}

/** A shape's text. */
export interface OgeSlideTextBody {
  /** EMU. */
  readonly insets: {
    readonly left: number;
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
  };
  readonly anchor: string;
  readonly wrap: boolean;
  readonly vertical: string;
  /** `normAutofit` font scale, 1 when there is none. */
  readonly fontScale: number;
  /** `normAutofit` line spacing reduction as a fraction. */
  readonly lineSpacingReduction: number;
  readonly paragraphs: readonly OgeSlideParagraph[];
}

/** Position and orientation on the slide, EMU, with groups resolved. */
export interface OgeSlideFrame {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** Degrees clockwise. */
  readonly rotation: number;
  readonly flipH: boolean;
  readonly flipV: boolean;
}

interface OgeSlideElementBase {
  readonly name: string;
  /** Alt text, when the file has one. */
  readonly description?: string;
  readonly frame: OgeSlideFrame;
}

/** An autoshape or text box. */
export interface OgeSlideShape extends OgeSlideElementBase {
  readonly kind: 'shape';
  /** The preset geometry (`rect`, `ellipse`, …). */
  readonly geometry: string;
  /** Adjust values as written, by guide name. */
  readonly adjust: Readonly<Record<string, number>>;
  readonly fill: OgeSlideFill;
  readonly line: OgeSlideLine | null;
  readonly text: OgeSlideTextBody | null;
  /** The placeholder type, when it is one (`body` when untyped). */
  readonly placeholder?: string;
  /** The outline of a `custom` geometry. */
  readonly customPaths?: readonly OgeSlideCustomPath[];
  /** Where the text goes, when it has its own box (SmartArt). */
  readonly textFrame?: OgeSlideFrame;
  readonly shadow?: OgeSlideShadow | null;
}

/** A picture. */
export interface OgeSlidePicture extends OgeSlideElementBase {
  readonly kind: 'picture';
  readonly picture: OgeSlidePictureRef;
  readonly line: OgeSlideLine | null;
}

/** A table cell. */
export interface OgeSlideTableCell {
  readonly fill: OgeSlideFill;
  readonly text: OgeSlideTextBody;
  readonly columnSpan: number;
  readonly rowSpan: number;
  /** Covered by a span starting in an earlier cell. */
  readonly merged: boolean;
  readonly borders: {
    readonly left: OgeSlideLine | null;
    readonly top: OgeSlideLine | null;
    readonly right: OgeSlideLine | null;
    readonly bottom: OgeSlideLine | null;
  };
}

/** A table. */
export interface OgeSlideTable extends OgeSlideElementBase {
  readonly kind: 'table';
  /** EMU. */
  readonly columns: readonly number[];
  readonly rows: readonly {
    readonly height: number;
    readonly cells: readonly OgeSlideTableCell[];
  }[];
}

/** A chart, drawn by the same layout as the workbook viewer's. */
export interface OgeSlideChart extends OgeSlideElementBase {
  readonly kind: 'chart';
  readonly chart: OgeChartModel;
  readonly theme: OgeThemeColors;
  readonly bodyFont?: string;
}

/** Anything drawn on a slide; groups are flattened in paint order. */
export type OgeSlideElement =
  OgeSlideShape | OgeSlidePicture | OgeSlideTable | OgeSlideChart;

/** A slide. */
export interface OgeSlide {
  /** 0-based position in the deck. */
  readonly index: number;
  /** Hidden from the slide show, still shown by a preview. */
  readonly hidden: boolean;
  readonly layoutName: string;
  readonly background: OgeSlideFill;
  /** Non-placeholder shapes of the master and the layout, behind the slide's. */
  readonly backdrop: readonly OgeSlideElement[];
  readonly elements: readonly OgeSlideElement[];
}

/** A presentation. */
export interface OgePresentation {
  /** EMU. */
  readonly width: number;
  /** EMU. */
  readonly height: number;
  readonly slides: readonly OgeSlide[];
  /** Picture parts by path. */
  readonly media: ReadonlyMap<
    string,
    { readonly bytes: Uint8Array; readonly contentType: string }
  >;
}
