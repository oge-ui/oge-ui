/**
 * What a cell shows: its value through its number format, fitted to its
 * column the way Excel fits it (measured in Excel 2024, see
 * `testing/captures/fit.json`):
 *
 * - **General** spends one maximum-digit-width slot per character, except a
 *   leading minus, which costs its own width; the most precise rendering
 *   that fits `width − padding` wins; a non-negative number always gets one
 *   slot. When nothing fits, the cell fills with `#`.
 * - **Every other format** keeps its text and fills the cell with `#` when
 *   the text is wider than `width − padding` — numbers and dates never spill.
 * - **Text** never becomes `#`; it spills into empty neighbours (the paint
 *   window works that out).
 */
import {
  formatOgeCellValue,
  type OgeFormattedValue,
} from '../format/number-format';
import { OGE_GENERAL_MAX_CHARS, formatOgeGeneral } from '../format/general';
import type { OgeFormatLocale } from '../format/format-locale';
import type { OgeDateSystem } from '../date/date-serial';
import {
  isOgeRichText,
  ogeRichTextToString,
  type OgeCell,
  type OgeRichText,
} from '../model/cell';
import type { OgePaintFont, OgeResolvedStyle } from './resolve-style';

/** Measures text in a font, at 100% zoom, in CSS pixels. */
export interface OgeTextMeasurer {
  measure(text: string, font: OgePaintFont): number;
}

/**
 * A measurer without a DOM: per-character widths scaled from the font's
 * maximum digit width. Good enough on a server and in tests; the render
 * layers measure with a canvas.
 */
export const OGE_ESTIMATING_MEASURER: OgeTextMeasurer = {
  measure(text: string, font: OgePaintFont): number {
    const digit = font.maxDigitWidth;
    let width = 0;
    for (const ch of text) {
      if (ch >= '0' && ch <= '9') width += digit;
      else if (ch === ' ') width += digit * 0.45;
      else if (".,:;!|'`il".includes(ch)) width += digit * 0.55;
      else if ('-()[]{}/\\"'.includes(ch)) width += digit * 0.7;
      else if (
        ch === 'm' ||
        ch === 'w' ||
        ch === 'M' ||
        ch === 'W' ||
        ch === '%'
      )
        width += digit * 1.6;
      else if (ch >= 'A' && ch <= 'Z') width += digit * 1.15;
      else width += digit;
    }
    return width * (font.bold ? 1.06 : 1);
  },
};

/** The kind of value shown. */
export type OgeDisplayKind = 'number' | 'text' | 'boolean' | 'error' | 'blank';

/** Horizontal alignment with `general` resolved. */
export type OgePaintAlignment =
  | 'left'
  | 'center'
  | 'right'
  | 'fill'
  | 'justify'
  | 'distributed'
  | 'centerContinuous';

/** What a cell displays. */
export interface OgeCellDisplay {
  /** The text, after formatting and fitting (`#` fill when it does not fit). */
  readonly text: string;
  readonly kind: OgeDisplayKind;
  /** A number-format section colour (`[Red]`), overriding the font colour. */
  readonly color?: string;
  /** A `*x` fill: `char` repeats at `index` of `text` across the free width. */
  readonly fill?: { readonly char: string; readonly index: number };
  /** The value did not fit and shows as `#` characters. */
  readonly hashed: boolean;
  readonly align: OgePaintAlignment;
  /** Rich text runs, for cells holding rich text. */
  readonly rich?: OgeRichText;
}

/** How a cell is displayed. */
export interface OgeCellDisplayOptions {
  /** Width available to the cell at 100% zoom, px (a merge: all its columns). */
  readonly width: number;
  /** The column padding (margins and gridline) of the sheet's Normal font. */
  readonly padding: number;
  readonly measurer: OgeTextMeasurer;
  readonly locale: OgeFormatLocale;
  readonly dateSystem: OgeDateSystem;
  /** `false` shows zero values empty (`showZeros="0"`). */
  readonly showZeros?: boolean;
}

/**
 * `#` characters filling `width`. General shows at least one; other formats
 * show none in a cell narrower than one `#` (measured).
 */
export function ogeHashFill(
  width: number,
  hashWidth: number,
  minimum = 0,
): string {
  return '#'.repeat(
    Math.max(minimum, Math.floor(width / Math.max(1, hashWidth))),
  );
}

function resolveAlign(
  style: OgeResolvedStyle,
  kind: OgeDisplayKind,
): OgePaintAlignment {
  switch (style.horizontal) {
    case 'general':
      return kind === 'number'
        ? 'right'
        : kind === 'boolean' || kind === 'error'
          ? 'center'
          : 'left';
    default:
      return style.horizontal;
  }
}

/**
 * General fitted into `budget` px: the slot model Excel uses. The Text
 * format (`@`) on a number fits the same way but without General's minimum
 * of one slot, and a negative that rounds to zero loses its sign.
 */
function fitGeneral(
  value: number,
  budget: number,
  font: OgePaintFont,
  options: OgeCellDisplayOptions,
  textFormat: boolean,
): { text: string; hashed: boolean } {
  const digit = Math.max(1, font.maxDigitWidth);
  const minimum = textFormat ? 0 : 1;
  const decimal = options.locale.decimal;
  const hashed = () => ({
    text: ogeHashFill(budget, digit, minimum),
    hashed: true,
  });
  // Excel rounds a number of at least 1E-4 to zero more readily than a
  // smaller one (measured: 0.000123 shows "0" in a 10 px column, 0.00002 "#")
  const tiny = Math.abs(value) < 1e-4;
  if (value < 0) {
    if (textFormat && !tiny) {
      // the Text format drops the sign of a value that rounds to zero
      const slots = Math.min(OGE_GENERAL_MAX_CHARS, Math.floor(budget / digit));
      if (slots >= 1 && formatOgeGeneral(-value, slots, decimal) === '0')
        return { text: '0', hashed: false };
    }
    const minus = Math.ceil(options.measurer.measure('-', font) - 0.01);
    const slots = Math.min(
      OGE_GENERAL_MAX_CHARS,
      Math.floor((budget - minus) / digit),
    );
    const text = slots >= 1 ? formatOgeGeneral(-value, slots, decimal) : null;
    if (text === null) return hashed();
    return {
      text: textFormat && text === '0' ? '0' : `-${text}`,
      hashed: false,
    };
  }
  const slots = Math.min(
    OGE_GENERAL_MAX_CHARS,
    Math.max(minimum, Math.floor(budget / digit)),
  );
  const text = slots >= 1 ? formatOgeGeneral(value, slots, decimal) : null;
  // less than one slot wide, only a digit of a number from 1E-4 up is shown
  if (text === null || (budget < digit && tiny && text === '0'))
    return hashed();
  return { text, hashed: false };
}

/** What a stored cell displays under its resolved style. */
export function ogeCellDisplay(
  cell: OgeCell | undefined,
  style: OgeResolvedStyle,
  options: OgeCellDisplayOptions,
): OgeCellDisplay | null {
  const value = cell?.value;
  if (value === undefined) return null;
  const font = style.font;
  const budget = options.width - options.padding;
  if (typeof value === 'number') {
    if (value === 0 && options.showZeros === false) return null;
    const format = style.format;
    // General, and the Text format on a number, fit by slots
    if (!format || (format.isText && format.code.trim() === '@')) {
      const fitted = fitGeneral(value, budget, font, options, !!format);
      return {
        text: fitted.text,
        kind: 'number',
        hashed: fitted.hashed,
        align: resolveAlign(style, 'number'),
      };
    }
    const rendered: OgeFormattedValue = formatOgeCellValue(value, format, {
      locale: options.locale,
      dateSystem: options.dateSystem,
      localeMarkers: style.localeMarkers,
    });
    const color = rendered.color ? { color: rendered.color } : {};
    if (
      rendered.overflow ||
      options.measurer.measure(rendered.text, font) > budget + 0.01
    ) {
      return {
        text: ogeHashFill(budget, font.maxDigitWidth),
        // (no minimum: a cell narrower than one # shows nothing)
        kind: 'number',
        hashed: true,
        align: resolveAlign(style, 'number'),
        ...color,
      };
    }
    return {
      text: rendered.text,
      kind: 'number',
      hashed: false,
      align: resolveAlign(style, 'number'),
      ...color,
      ...(rendered.fill ? { fill: rendered.fill } : {}),
    };
  }
  if (typeof value === 'boolean') {
    return {
      text: value ? 'TRUE' : 'FALSE',
      kind: 'boolean',
      hashed: false,
      align: resolveAlign(style, 'boolean'),
    };
  }
  if (typeof value === 'string' || isOgeRichText(value)) {
    const plain =
      typeof value === 'string' ? value : ogeRichTextToString(value);
    const format = style.format;
    if (format && format.isText && typeof value === 'string') {
      const rendered = formatOgeCellValue(plain, format, {
        locale: options.locale,
      });
      return {
        text: rendered.text,
        kind: 'text',
        hashed: false,
        align: resolveAlign(style, 'text'),
        ...(rendered.color ? { color: rendered.color } : {}),
        ...(rendered.fill ? { fill: rendered.fill } : {}),
      };
    }
    return {
      text: plain,
      kind: 'text',
      hashed: false,
      align: resolveAlign(style, 'text'),
      ...(typeof value === 'string' ? {} : { rich: value }),
    };
  }
  return {
    text: value.code,
    kind: 'error',
    hashed: false,
    align: resolveAlign(style, 'error'),
  };
}

/**
 * Lines `text` wraps into within `width` px: greedy by words, a word longer
 * than the line broken by characters, explicit line breaks kept.
 */
export function ogeWrapText(
  text: string,
  width: number,
  font: OgePaintFont,
  measurer: OgeTextMeasurer,
): string[] {
  const lines: string[] = [];
  const room = Math.max(1, width);
  for (const paragraph of text.split(/\r\n|\r|\n/)) {
    if (paragraph === '') {
      lines.push('');
      continue;
    }
    let line = '';
    for (const word of paragraph.split(/(?<= )/)) {
      const candidate = line + word;
      if (measurer.measure(candidate.trimEnd(), font) <= room) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line.trimEnd());
      // a word wider than the line: break it by characters
      let rest = word;
      line = '';
      while (measurer.measure(rest.trimEnd(), font) > room && rest.length > 1) {
        let cut = rest.length - 1;
        while (cut > 1 && measurer.measure(rest.slice(0, cut), font) > room)
          cut--;
        lines.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      line = rest;
    }
    lines.push(line.trimEnd());
  }
  return lines;
}
