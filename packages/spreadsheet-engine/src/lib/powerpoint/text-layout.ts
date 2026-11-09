/**
 * Lays a text body out in points. The rules were measured on PowerPoint 16.0
 * (`read-pptx.corpus.spec.ts` and `text-layout.corpus.spec.ts`):
 *
 * - greedy breaking at spaces; a line keeps its trailing space, which never
 *   forces a break;
 * - the first paragraph's space-before is not applied;
 * - a line's height is 1.2 × the largest font size times the paragraph's
 *   line spacing, whatever the typeface (12 faces measured, from Times New
 *   Roman at a natural 1.107 to Segoe UI at 1.33), and spacing below 100%
 *   comes off the top;
 * - percent space-before and -after are of 1.2 × the font size.
 */
import type {
  OgeSlideParagraph,
  OgeSlideSpacing,
  OgeSlideTextBody,
  OgeSlideTextRun,
} from './model';

/** A font as the measurer sees it. */
export interface OgeSlideFont {
  readonly family: string;
  /** Points. */
  readonly size: number;
  readonly bold: boolean;
  readonly italic: boolean;
}

/** Measures text; sizes in points. Supplied by the caller (no DOM here). */
export interface OgeSlideTextMeasurer {
  width(text: string, font: OgeSlideFont): number;
  /** The face's own extents; only their ratio places the baseline. */
  extent(font: OgeSlideFont): {
    readonly ascent: number;
    readonly descent: number;
  };
}

/** A same-styled stretch of a line. */
export interface OgeSlideLaidFragment {
  readonly text: string;
  /** Points from the body box's left edge. */
  readonly x: number;
  readonly width: number;
  readonly font: OgeSlideFont;
  readonly run: OgeSlideTextRun;
}

/** A finished line. */
export interface OgeSlideLaidLine {
  /** Points from the body box's top edge; excludes the space before. */
  readonly top: number;
  readonly height: number;
  /** Points from the body box's top edge. */
  readonly baseline: number;
  /** Where the text starts, points from the body box's left edge. */
  readonly x: number;
  /** Including any trailing space. */
  readonly width: number;
  readonly fragments: readonly OgeSlideLaidFragment[];
  /** The bullet, on a paragraph's first line. */
  readonly bullet: OgeSlideLaidFragment | null;
}

const EMU_PER_POINT = 12700;
const INFINITE_WIDTH = 1e9;
const LINE_HEIGHT_RATIO = 1.2;

interface Piece {
  text: string;
  run: OgeSlideTextRun;
  font: OgeSlideFont;
  width: number;
  space: boolean;
  newline: boolean;
}

function fontOf(run: OgeSlideTextRun, scale: number): OgeSlideFont {
  return {
    family: run.font,
    size: run.size * scale,
    bold: run.bold,
    italic: run.italic,
  };
}

function piecesOf(
  paragraph: OgeSlideParagraph,
  scale: number,
  measurer: OgeSlideTextMeasurer,
): Piece[] {
  const pieces: Piece[] = [];
  for (const run of paragraph.runs) {
    const font = fontOf(run, scale);
    for (const match of run.text.matchAll(/\n|\s+|[^\s]+/g)) {
      const text = match[0];
      const newline = text === '\n';
      pieces.push({
        text,
        run,
        font,
        width: newline ? 0 : measurer.width(text, font),
        space: !newline && /^\s/.test(text),
        newline,
      });
    }
  }
  return pieces;
}

/** Splits a word wider than a whole line at the characters that still fit. */
function splitLongWord(
  piece: Piece,
  room: number,
  measurer: OgeSlideTextMeasurer,
): [Piece, Piece] {
  const chars = Array.from(piece.text);
  let count = 1;
  while (
    count < chars.length &&
    measurer.width(chars.slice(0, count + 1).join(''), piece.font) <= room
  ) {
    count++;
  }
  const head = chars.slice(0, count).join('');
  const tail = chars.slice(count).join('');
  return [
    { ...piece, text: head, width: measurer.width(head, piece.font) },
    { ...piece, text: tail, width: measurer.width(tail, piece.font) },
  ];
}

interface RawLine {
  pieces: Piece[];
}

function breakLines(
  source: Piece[],
  firstRoom: number,
  otherRoom: number,
  measurer: OgeSlideTextMeasurer,
): RawLine[] {
  const queue = [...source];
  const lines: RawLine[] = [{ pieces: [] }];
  let used = 0;
  const room = (): number => (lines.length === 1 ? firstRoom : otherRoom);
  const newLine = (): void => {
    lines.push({ pieces: [] });
    used = 0;
  };
  while (queue.length > 0) {
    const piece = queue[0];
    if (piece.newline) {
      queue.shift();
      newLine();
      continue;
    }
    if (piece.space) {
      queue.shift();
      lines[lines.length - 1].pieces.push(piece);
      used += piece.width;
      continue;
    }
    // a word may continue across runs: it stays together as a unit
    let end = 1;
    let width = piece.width;
    while (end < queue.length && !queue[end].space && !queue[end].newline) {
      width += queue[end].width;
      end++;
    }
    const current = lines[lines.length - 1];
    if (used + width > room() && current.pieces.length > 0) {
      newLine();
      continue;
    }
    if (width > room() && current.pieces.length === 0 && end === 1) {
      const [head, tail] = splitLongWord(piece, room(), measurer);
      if (tail.text !== '') {
        queue.splice(0, 1, tail);
        current.pieces.push(head);
        newLine();
        continue;
      }
    }
    for (const part of queue.splice(0, end)) {
      current.pieces.push(part);
      used += part.width;
    }
  }
  return lines;
}

function spacingPoints(spacing: OgeSlideSpacing, fontSize: number): number {
  return spacing.kind === 'points'
    ? spacing.value
    : (spacing.value / 100) * fontSize * 1.2;
}

function bulletNumber(scheme: string, index: number): string {
  const roman = (value: number): string => {
    const table: [number, string][] = [
      [1000, 'm'],
      [900, 'cm'],
      [500, 'd'],
      [400, 'cd'],
      [100, 'c'],
      [90, 'xc'],
      [50, 'l'],
      [40, 'xl'],
      [10, 'x'],
      [9, 'ix'],
      [5, 'v'],
      [4, 'iv'],
      [1, 'i'],
    ];
    let out = '';
    let rest = value;
    for (const [amount, text] of table) {
      while (rest >= amount) {
        out += text;
        rest -= amount;
      }
    }
    return out;
  };
  const letter = (value: number): string =>
    String.fromCharCode(97 + ((value - 1) % 26));
  const body = scheme.startsWith('romanLc')
    ? roman(index)
    : scheme.startsWith('romanUc')
      ? roman(index).toUpperCase()
      : scheme.startsWith('alphaLc')
        ? letter(index)
        : scheme.startsWith('alphaUc')
          ? letter(index).toUpperCase()
          : String(index);
  if (scheme.endsWith('ParenBoth')) return `(${body})`;
  if (scheme.endsWith('ParenR')) return `${body})`;
  if (scheme.endsWith('Plain')) return body;
  return `${body}.`;
}

/** Lays a body out inside a box of the given size, in points. */
export function ogeLayoutSlideText(
  body: OgeSlideTextBody,
  boxWidth: number,
  boxHeight: number,
  measurer: OgeSlideTextMeasurer,
): readonly OgeSlideLaidLine[] {
  const left = body.insets.left / EMU_PER_POINT;
  const right = body.insets.right / EMU_PER_POINT;
  const top = body.insets.top / EMU_PER_POINT;
  const bottom = body.insets.bottom / EMU_PER_POINT;
  const width = body.wrap ? boxWidth - left - right : INFINITE_WIDTH;
  const scale = body.fontScale;

  const lines: {
    line: Omit<OgeSlideLaidLine, 'top' | 'baseline'>;
    above: number;
    height: number;
    descent: number;
  }[] = [];
  const counters = new Map<number, number>();

  body.paragraphs.forEach((paragraph, index) => {
    const marginLeft = paragraph.marginLeft / EMU_PER_POINT;
    const firstStart = marginLeft + paragraph.indent / EMU_PER_POINT;
    const firstRun = paragraph.runs[0];
    const baseFont: OgeSlideFont = firstRun
      ? fontOf(firstRun, scale)
      : {
          family: 'Calibri',
          size: paragraph.endSize * scale,
          bold: false,
          italic: false,
        };

    let bulletFragment: OgeSlideLaidFragment | null = null;
    let textStart = firstStart;
    if (paragraph.bullet.kind === 'number') {
      const next =
        (counters.get(paragraph.level) ?? paragraph.bullet.startAt - 1) + 1;
      counters.set(paragraph.level, next);
    } else {
      counters.delete(paragraph.level);
    }
    if (paragraph.bullet.kind !== 'none' && firstRun) {
      const bullet = paragraph.bullet;
      const text =
        bullet.kind === 'char'
          ? bullet.char
          : bulletNumber(bullet.scheme, counters.get(paragraph.level) ?? 1);
      const font: OgeSlideFont = {
        ...baseFont,
        family: (bullet.kind === 'char' && bullet.font) || baseFont.family,
        size: baseFont.size * (bullet.size / 100),
      };
      const bulletWidth = measurer.width(text, font);
      bulletFragment = {
        text,
        x: left + firstStart,
        width: bulletWidth,
        font,
        run: bullet.color ? { ...firstRun, color: bullet.color } : firstRun,
      };
      textStart =
        firstStart < marginLeft
          ? Math.max(marginLeft, firstStart + bulletWidth)
          : firstStart + bulletWidth;
    }

    const raw = breakLines(
      piecesOf(paragraph, scale, measurer),
      width - textStart,
      width - marginLeft,
      measurer,
    );
    const reduction = 1 - body.lineSpacingReduction;
    raw.forEach((rawLine, lineIndex) => {
      const start = lineIndex === 0 ? textStart : marginLeft;
      const fonts = rawLine.pieces.length
        ? rawLine.pieces.map((piece) => piece.font)
        : [baseFont];
      let natural = 0;
      let descent = 0;
      for (const font of fonts) {
        const extent = measurer.extent(font);
        const full = font.size * LINE_HEIGHT_RATIO;
        natural = Math.max(natural, full);
        descent = Math.max(
          descent,
          (full * extent.descent) / (extent.ascent + extent.descent),
        );
      }
      const height =
        paragraph.lineSpacing.kind === 'points'
          ? paragraph.lineSpacing.value
          : natural * (paragraph.lineSpacing.value / 100) * reduction;

      const total = rawLine.pieces.reduce((sum, piece) => sum + piece.width, 0);
      let trailing = 0;
      for (let i = rawLine.pieces.length - 1; i >= 0; i--) {
        if (!rawLine.pieces[i].space) break;
        trailing += rawLine.pieces[i].width;
      }
      const room = width - start;
      const free = body.wrap ? room - (total - trailing) : 0;
      const shift =
        paragraph.align === 'ctr'
          ? free / 2
          : paragraph.align === 'r'
            ? free
            : 0;
      const x = left + start + shift;

      const fragments: {
        -readonly [K in keyof OgeSlideLaidFragment]: OgeSlideLaidFragment[K];
      }[] = [];
      let cursor = x;
      for (const piece of rawLine.pieces) {
        const last = fragments[fragments.length - 1];
        if (last && last.run === piece.run) {
          last.text += piece.text;
          last.width += piece.width;
        } else {
          fragments.push({
            text: piece.text,
            x: cursor,
            width: piece.width,
            font: piece.font,
            run: piece.run,
          });
        }
        cursor += piece.width;
      }

      let above = 0;
      if (lineIndex === 0 && index > 0) {
        above =
          spacingPoints(paragraph.spaceBefore, baseFont.size) +
          spacingPoints(body.paragraphs[index - 1].spaceAfter, baseFont.size);
      }
      lines.push({
        line: {
          height,
          x,
          width: total,
          fragments,
          bullet: lineIndex === 0 ? bulletFragment : null,
        },
        above,
        height,
        descent,
      });
    });
  });

  const content = lines.reduce((sum, l) => sum + l.above + l.height, 0);
  const inner = boxHeight - top - bottom;
  let cursor =
    top +
    (body.anchor === 'ctr'
      ? (inner - content) / 2
      : body.anchor === 'b'
        ? inner - content
        : 0);
  return lines.map(({ line, above, height, descent }) => {
    cursor += above;
    const lineTop = cursor;
    cursor += height;
    return { ...line, top: lineTop, baseline: lineTop + height - descent };
  });
}
