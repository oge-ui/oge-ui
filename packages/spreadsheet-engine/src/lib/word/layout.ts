/**
 * Word's layout: lines, then pages. The rules were measured on Word 16.0
 * (`layout.corpus.spec.ts`, `testing/tools/docx-capture.ps1`):
 *
 * - a line's height is the font's own line ratio × size × the spacing
 *   multiple; the positions Word reports are rounded to its reference device
 *   (106 dpi, 0.679 pt steps), the heights themselves are not;
 * - the gap between two paragraphs is the larger of the after and before
 *   spacing, not their sum;
 * - space-before is dropped at the top of a page reached by a natural break
 *   and kept after an explicit one;
 * - a line keeps its trailing spaces, which never force a break.
 */
import { sanitizeUrl } from '@oge-ui/behavior';
import { ogeSlideGeometryPath } from '../powerpoint/geometry';
import {
  OgeSlideDrawing,
  type OgeSlidePaint,
  type OgeSlideRender,
} from '../powerpoint/render';
import type {
  OgeSlideFont,
  OgeSlideTextMeasurer,
} from '../powerpoint/text-layout';
import type {
  OgeWordBlock,
  OgeWordBorder,
  OgeWordDocument,
  OgeWordEdge,
  OgeWordFloat,
  OgeWordInline,
  OgeWordPageSetup,
  OgeWordParagraph,
  OgeWordPicture,
  OgeWordRunStyle,
  OgeWordSection,
  OgeWordTable,
  OgeWordTab,
} from './model';

/** Line height ÷ size per face, measured in Word at 72 pt. */
const LINE_RATIOS: Readonly<Record<string, number>> = {
  calibri: 1.2207,
  symbol: 1.2598,
  'calibri light': 1.2207,
  cambria: 1.1724,
  arial: 1.1499,
  'times new roman': 1.1499,
  'segoe ui': 1.3301,
  verdana: 1.2153,
  tahoma: 1.2073,
  georgia: 1.1362,
  'courier new': 1.1328,
  'trebuchet ms': 1.1611,
  consolas: 1.1709,
  garamond: 1.1245,
  'book antiqua': 1.2451,
  'palatino linotype': 1.3486,
  'century gothic': 1.2264,
  candara: 1.2207,
  constantia: 1.2207,
  corbel: 1.2207,
};

/** How far a justified line may squeeze its spaces to fit one more word. */
const JUSTIFY_SHRINK = 0.25;

/** The share of a line above the baseline, from the face's own extents. */
function ascentShare(
  font: OgeSlideFont,
  measurer: OgeSlideTextMeasurer,
): number {
  const { ascent, descent } = measurer.extent(font);
  return ascent / (ascent + descent);
}

function naturalRatio(
  font: OgeSlideFont,
  measurer: OgeSlideTextMeasurer,
): number {
  const known = LINE_RATIOS[font.family.toLowerCase()];
  if (known !== undefined) return known;
  const { ascent, descent } = measurer.extent(font);
  return (ascent + descent) / font.size;
}

const fontOf = (style: OgeWordRunStyle): OgeSlideFont => ({
  family: style.font,
  size: style.vertAlign === 'baseline' ? style.size : style.size * 0.65,
  bold: style.bold,
  italic: style.italic,
});

// --- pieces -----------------------------------------------------------------

type Piece =
  | {
      kind: 'word' | 'space';
      text: string;
      style: OgeWordRunStyle;
      width: number;
    }
  | { kind: 'tab'; style: OgeWordRunStyle }
  | { kind: 'line' | 'page' | 'column' }
  | {
      kind: 'picture';
      picture: OgeWordPicture;
      width: number;
      height: number;
      description?: string;
    }
  | {
      kind: 'chart';
      inline: Extract<OgeWordInline, { kind: 'chart' }>;
      width: number;
      height: number;
    }
  | {
      kind: 'footnote';
      id: string;
      text: string;
      style: OgeWordRunStyle;
      width: number;
    };

interface LineItem {
  readonly piece: Piece;
  x: number;
  width: number;
}

/** One finished line. */
interface LaidLine {
  readonly items: LineItem[];
  /** Full height, spacing included. */
  readonly height: number;
  /** Baseline, from the line's top. */
  readonly baseline: number;
  readonly footnotes: string[];
  /** The break that ended the line, when explicit. */
  readonly end: 'wrap' | 'line' | 'page' | 'column' | 'last';
  /** Leading items that are the list label. */
  readonly labelItems: number;
}

interface LayoutContext {
  readonly measurer: OgeSlideTextMeasurer;
  readonly document: OgeWordDocument;
  page: number;
  pages: number;
  footnoteNumbers: Map<string, number>;
  endnoteNumbers: Map<string, number>;
}

function noteNumber(context: LayoutContext, id: string): number {
  let number = context.footnoteNumbers.get(id);
  if (number === undefined) {
    number = context.footnoteNumbers.size + 1;
    context.footnoteNumbers.set(id, number);
  }
  return number;
}

function endnoteNumber(context: LayoutContext, id: string): number {
  let number = context.endnoteNumbers.get(id);
  if (number === undefined) {
    number = context.endnoteNumbers.size + 1;
    context.endnoteNumbers.set(id, number);
  }
  return number;
}

/** Endnotes number in lower-case roman by default. */
function romanLower(value: number): string {
  const table: [number, string][] = [
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
}

function piecesOf(
  paragraph: OgeWordParagraph,
  context: LayoutContext,
  noteMark: string | undefined,
): Piece[] {
  const { measurer } = context;
  const out: Piece[] = [];
  const addText = (raw: string, style: OgeWordRunStyle): void => {
    const text = style.caps ? raw.toUpperCase() : raw;
    const font = fontOf(style);
    // Word breaks after a space and after a hyphen inside a word.
    for (const match of text.matchAll(/ +|[^ -]*-+|[^ ]+?(?=-| |$)|[^ ]+/g)) {
      const part = match[0];
      out.push({
        kind: part[0] === ' ' ? 'space' : 'word',
        text: part,
        style,
        width: measurer.width(part, font),
      });
    }
  };
  for (const inline of paragraph.inlines) {
    switch (inline.kind) {
      case 'text':
        if (inline.text === '\u0001') addText(noteMark ?? '', inline.style);
        else addText(inline.text, inline.style);
        break;
      case 'tab':
        out.push({ kind: 'tab', style: inline.style });
        break;
      case 'break':
        out.push({ kind: inline.type });
        break;
      case 'picture':
        out.push({
          kind: 'picture',
          picture: inline.picture,
          width: inline.width,
          height: inline.height,
          ...(inline.description ? { description: inline.description } : {}),
        });
        break;
      case 'chart':
        out.push({
          kind: 'chart',
          inline,
          width: inline.width,
          height: inline.height,
        });
        break;
      case 'endnote': {
        const text = romanLower(endnoteNumber(context, inline.id));
        out.push({
          kind: 'footnote',
          id: '',
          text,
          style: inline.style,
          width: measurer.width(text, fontOf(inline.style)),
        });
        break;
      }
      case 'footnote': {
        const text = String(noteNumber(context, inline.id));
        out.push({
          kind: 'footnote',
          id: inline.id,
          text,
          style: inline.style,
          width: measurer.width(text, fontOf(inline.style)),
        });
        break;
      }
      case 'field':
        addText(
          String(inline.field === 'page' ? context.page : context.pages),
          inline.style,
        );
        break;
      case 'float':
        break;
    }
  }
  return out;
}

/** Breaks a paragraph into lines one at a time, for the room each one gets. */
class LineFlow {
  private readonly pieces: Piece[];
  private cursor = 0;
  private first = true;
  private labelDone: boolean;

  constructor(
    private readonly paragraph: OgeWordParagraph,
    private readonly context: LayoutContext,
    noteMark?: string,
  ) {
    this.pieces = piecesOf(paragraph, context, noteMark);
    this.labelDone = paragraph.label === null;
  }

  get done(): boolean {
    return !this.first && this.cursor >= this.pieces.length;
  }

  /** The next line in `[start, end]` of the column; `null` when finished. */
  next(
    start: number,
    end: number,
    more: readonly { start: number; end: number }[] = [],
  ): LaidLine | null {
    if (this.done) return null;
    const p = this.paragraph;
    const { measurer } = this.context;
    const items: LineItem[] = [];
    const footnotes: string[] = [];
    let labelItems = 0;
    const lineStart = start + p.left + (this.first ? p.first : 0);
    let right = end - p.right;
    let hops = 0;
    let x = lineStart;

    if (this.first && p.label) {
      const font = fontOf(p.label.style);
      const width = measurer.width(p.label.text, font);
      items.push({
        piece: {
          kind: 'word',
          text: p.label.text,
          style: p.label.style,
          width,
        },
        x,
        width,
      });
      labelItems = 1;
      x += width;
      if (p.label.suffix === 'space') {
        x += measurer.width(' ', font);
      } else if (p.label.suffix === 'tab') {
        x = this.nextTab(x, start).position;
      }
    }
    this.labelDone = true;
    this.first = false;

    let end_: LaidLine['end'] = 'last';
    let group: { start: number; tab: OgeWordTab } | null = null;
    const closeGroup = (): void => {
      if (!group) return;
      const width = x - group.tab.position;
      const shift =
        group.tab.align === 'right'
          ? width
          : group.tab.align === 'center'
            ? width / 2
            : 0;
      if (shift > 0) {
        const room = group.tab.position - shift;
        const offset = Math.max(0, group.start ? 0 : 0) || -shift;
        for (let i = group.start; i < items.length; i++) {
          items[i].x += offset;
        }
        x += offset;
        void room;
      }
      group = null;
    };

    scan: while (this.cursor < this.pieces.length) {
      const piece = this.pieces[this.cursor];
      switch (piece.kind) {
        case 'line':
        case 'page':
        case 'column':
          this.cursor++;
          end_ = piece.kind;
          break scan;
        case 'tab': {
          closeGroup();
          const stop = this.nextTab(x, start);
          this.cursor++;
          const leaderFrom = x;
          x = stop.position;
          if (stop.leader !== 'none' && x > leaderFrom) {
            const font = fontOf(piece.style);
            const dot =
              stop.leader === 'hyphen'
                ? '-'
                : stop.leader === 'underscore'
                  ? '_'
                  : '.';
            const unit = Math.max(0.5, measurer.width(dot, font));
            const count = Math.floor((x - leaderFrom) / unit);
            items.push({
              piece: {
                kind: 'word',
                text: dot.repeat(count),
                style: piece.style,
                width: unit * count,
              },
              x: x - unit * count,
              width: unit * count,
            });
          }
          if (stop.align === 'right' || stop.align === 'center') {
            group = { start: items.length, tab: stop };
          }
          break;
        }
        case 'space':
          this.cursor++;
          items.push({ piece, x, width: piece.width });
          x += piece.width;
          break;
        default: {
          // a word may continue across runs: it moves as one unit
          let width = 0;
          let last = this.cursor;
          for (; last < this.pieces.length; last++) {
            const part = this.pieces[last];
            if (part.kind === 'word' || part.kind === 'footnote') {
              width += part.width;
              if (part.kind === 'word' && part.text.endsWith('-')) {
                last++;
                break;
              }
            } else if (part.kind === 'picture' || part.kind === 'chart') {
              width += part.width;
              last++;
              break;
            } else break;
          }
          // Text continues on the far side of a floating object when the next
          // word fits there, however narrow the gap.
          if (x + width > right + 0.01 && hops < more.length && !group) {
            const segment = more[hops++];
            x = segment.start;
            right = segment.end;
            continue scan;
          }
          const hasContent = items.some((item) => item.piece.kind !== 'space');
          const slack =
            p.align === 'both'
              ? items
                  .filter((item) => item.piece.kind === 'space')
                  .reduce((sum, item) => sum + item.width * JUSTIFY_SHRINK, 0)
              : 0;
          if (x + width > right + slack + 0.01 && hasContent && !group) {
            end_ = 'wrap';
            break scan;
          }
          if (
            x + width > right + 0.01 &&
            !hasContent &&
            piece.kind === 'word'
          ) {
            // a word wider than the line breaks at the character that fits
            const chars = Array.from(piece.text);
            const font = fontOf(piece.style);
            let count = 1;
            while (
              count < chars.length &&
              x + measurer.width(chars.slice(0, count + 1).join(''), font) <=
                right
            ) {
              count++;
            }
            if (count < chars.length) {
              const head = chars.slice(0, count).join('');
              const tail = chars.slice(count).join('');
              const headWidth = measurer.width(head, font);
              items.push({
                piece: { ...piece, text: head, width: headWidth },
                x,
                width: headWidth,
              });
              x += headWidth;
              this.pieces[this.cursor] = {
                ...piece,
                text: tail,
                width: measurer.width(tail, font),
              };
              end_ = 'wrap';
              break scan;
            }
          }
          for (; this.cursor < last; this.cursor++) {
            const part = this.pieces[this.cursor];
            const partWidth =
              part.kind === 'word' ||
              part.kind === 'footnote' ||
              part.kind === 'picture' ||
              part.kind === 'chart'
                ? part.width
                : 0;
            if (part.kind === 'footnote' && part.id) footnotes.push(part.id);
            items.push({ piece: part, x, width: partWidth });
            x += partWidth;
          }
          break;
        }
      }
    }
    closeGroup();
    if (this.cursor >= this.pieces.length && end_ === 'wrap') end_ = 'last';

    this.align(items, lineStart, right, end_);
    return { ...this.measure(items), items, footnotes, end: end_, labelItems };
  }

  private align(
    items: LineItem[],
    lineStart: number,
    right: number,
    end: LaidLine['end'],
  ): void {
    const { align } = this.paragraph;
    if (align === 'left' || items.length === 0) return;
    let last = items.length - 1;
    while (last > 0 && items[last].piece.kind === 'space') last--;
    const contentEnd = items[last].x + items[last].width;
    const free = right - contentEnd;
    if (free <= 0 && align !== 'both') return;
    if (align === 'center' || align === 'right') {
      const shift = align === 'center' ? free / 2 : free;
      for (const item of items) item.x += shift;
      return;
    }
    if (end !== 'wrap') return;
    let gaps = 0;
    for (let i = 0; i < last; i++) if (items[i].piece.kind === 'space') gaps++;
    if (gaps === 0) return;
    const extra = free / gaps;
    let moved = 0;
    for (let i = 0; i <= last; i++) {
      items[i].x += moved;
      if (items[i].piece.kind === 'space') {
        moved += extra;
        items[i].width += extra;
      }
    }
    void lineStart;
  }

  private nextTab(x: number, start: number): OgeWordTab {
    const p = this.paragraph;
    const relative = x - start;
    for (const tab of p.tabs) {
      if (tab.position > relative + 0.01) {
        return { ...tab, position: start + tab.position };
      }
    }
    // a hanging indent is a tab stop
    if (p.first < 0 && p.left > relative + 0.01) {
      return { position: start + p.left, align: 'left', leader: 'none' };
    }
    const step = this.context.document.defaultTab || 36;
    const next = (Math.floor(relative / step + 1e-6) + 1) * step;
    return { position: start + next, align: 'left', leader: 'none' };
  }

  private measure(items: LineItem[]): { height: number; baseline: number } {
    const { measurer } = this.context;
    const { line, mark } = this.paragraph;
    const multiple = line.rule === 'auto' ? line.value / 240 : 1;
    let above = 0;
    let below = 0;
    let textual = 0;
    const consider = (font: OgeSlideFont): void => {
      const natural = naturalRatio(font, measurer) * font.size;
      const share = ascentShare(font, measurer);
      textual = Math.max(textual, natural);
      above = Math.max(above, natural * share);
      below = Math.max(below, natural * (1 - share));
    };
    let objectHeight = 0;
    let any = false;
    for (const item of items) {
      const piece = item.piece;
      if (piece.kind === 'word' || piece.kind === 'space') {
        any = true;
        consider(fontOf(piece.style));
      } else if (piece.kind === 'footnote') {
        any = true;
        consider(fontOf(piece.style));
      } else if (piece.kind === 'picture' || piece.kind === 'chart') {
        objectHeight = Math.max(objectHeight, piece.height);
      }
    }
    // an object still sits on a text line: the mark's font gives its descent
    if (!any) consider(fontOf(mark));
    const natural = above + below;
    if (line.rule === 'exact') {
      const height = line.value / 20;
      return { height, baseline: height - below };
    }
    const text = natural * multiple;
    // The spacing multiple stretches the text, not a tall object: what the
    // line adds below the object is what it would add below the text.
    const under = text - above;
    const tall = objectHeight > above ? objectHeight + under : text;
    const height =
      line.rule === 'atLeast' ? Math.max(tall, line.value / 20) : tall;
    return { height, baseline: height - under };
  }
}

// --- drawing helpers --------------------------------------------------------

const solid = (rgb: string): OgeSlidePaint => ({
  paint: `#${rgb}`,
  opacity: 1,
});

const num = (value: number): number => Math.round(value * 1000) / 1000;

const DASHED: Readonly<Record<string, string>> = {
  dashed: '4 3',
  dotted: '1 2',
  dashSmallGap: '3 1',
  dotDash: '4 2 1 2',
};

class PageCanvas {
  readonly drawing: OgeSlideDrawing;

  constructor(
    measurer: OgeSlideTextMeasurer,
    idPrefix: string,
    readonly setup: OgeWordPageSetup,
  ) {
    this.drawing = new OgeSlideDrawing(measurer, idPrefix);
  }

  rect(x: number, y: number, width: number, height: number, rgb: string): void {
    this.drawing.nodes.push({
      kind: 'path',
      d: `M${num(x)} ${num(y)} H${num(x + width)} V${num(y + height)} H${num(x)} Z`,
      transform: '',
      fill: solid(rgb),
      stroke: null,
      strokeWidth: 0,
      dash: null,
      cap: 'butt',
      filter: null,
    });
  }

  line(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    border: OgeWordBorder,
  ): void {
    this.drawing.nodes.push({
      kind: 'path',
      d: `M${num(x1)} ${num(y1)} L${num(x2)} ${num(y2)}`,
      transform: '',
      fill: null,
      stroke: solid(border.color),
      strokeWidth: border.width,
      dash: DASHED[border.style] ?? null,
      cap: 'butt',
      filter: null,
    });
  }

  picture(
    picture: OgeWordPicture,
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
  ): void {
    const { left, top, right, bottom } = picture.crop;
    this.drawing.nodes.push({
      kind: 'image',
      media: picture.media,
      x: num(x),
      y: num(y),
      width: num(width),
      height: num(height),
      viewBox: `${num(left)} ${num(top)} ${num(1 - left - right)} ${num(1 - top - bottom)}`,
      transform: '',
      label,
    });
  }
}

function safeLink(target: string | undefined): string | null {
  if (!target) return null;
  const safe = sanitizeUrl(target);
  return safe === '' || safe === 'about:blank' ? null : safe;
}

function drawLine(
  canvas: PageCanvas,
  line: LaidLine,
  top: number,
  family: (name: string) => string,
): void {
  const baseline = top + line.baseline;
  for (let i = 0; i < line.items.length; i++) {
    const item = line.items[i];
    const piece = item.piece;
    if (piece.kind === 'picture') {
      canvas.picture(
        piece.picture,
        item.x,
        baseline - piece.height,
        piece.width,
        piece.height,
        piece.description ?? '',
      );
      continue;
    }
    if (piece.kind === 'chart') {
      const EMU = 12700;
      canvas.drawing.element({
        kind: 'chart',
        name: '',
        frame: {
          x: item.x * EMU,
          y: (baseline - piece.height) * EMU,
          width: piece.width * EMU,
          height: piece.height * EMU,
          rotation: 0,
          flipH: false,
          flipV: false,
        },
        chart: piece.inline.chart,
        theme: piece.inline.theme,
        bodyFont: piece.inline.bodyFont,
      });
      continue;
    }
    if (
      piece.kind !== 'word' &&
      piece.kind !== 'space' &&
      piece.kind !== 'footnote'
    )
      continue;
    const style = piece.style;
    if (style.background) {
      const font = fontOf(style);
      canvas.rect(item.x, top, item.width, line.height, style.background);
      void font;
    }
    if (piece.kind === 'space' && !style.underline && !style.strike) continue;
    // Merging equal neighbours keeps the drawing small and kerning intact.
    let text = piece.text;
    let width = item.width;
    let j = i;
    while (j + 1 < line.items.length) {
      const next = line.items[j + 1];
      if (
        (next.piece.kind !== 'word' && next.piece.kind !== 'space') ||
        next.piece.style !== style ||
        Math.abs(item.x + width - next.x) > 0.01 ||
        next.width !== (next.piece as { width: number }).width
      )
        break;
      text += next.piece.text;
      width += next.width;
      j++;
    }
    i = j;
    const font = fontOf(style);
    const raise =
      style.vertAlign === 'superscript' || piece.kind === 'footnote'
        ? style.size * 0.33
        : style.vertAlign === 'subscript'
          ? -style.size * 0.14
          : 0;
    const decoration =
      [style.underline && 'underline', style.strike && 'line-through']
        .filter(Boolean)
        .join(' ') || null;
    canvas.drawing.nodes.push({
      kind: 'text',
      text,
      x: num(item.x),
      y: num(baseline - raise),
      transform: '',
      fontFamily: family(style.font),
      fontSize: num(piece.kind === 'footnote' ? style.size * 0.65 : font.size),
      fontWeight: style.bold ? 'bold' : 'normal',
      fontStyle: style.italic ? 'italic' : 'normal',
      anchor: 'start',
      direction: 'ltr',
      fill: solid(style.color),
      decoration,
      link: safeLink(style.link),
    });
  }
}

// --- measuring without pagination -------------------------------------------

interface Stacked {
  readonly paragraph: OgeWordParagraph;
  readonly lines: LaidLine[];
  /** Top of the first line, from the stack's top. */
  readonly top: number;
}

function stackBlocks(
  blocks: readonly OgeWordBlock[],
  start: number,
  end: number,
  context: LayoutContext,
): { paragraphs: Stacked[]; height: number } {
  const paragraphs: Stacked[] = [];
  let y = 0;
  let previous: OgeWordParagraph | null = null;
  for (const block of blocks) {
    if (block.kind !== 'paragraph') continue;
    y += gapBetween(previous, block, previous === null);
    const flow = new LineFlow(block, context);
    const lines: LaidLine[] = [];
    let line: LaidLine | null;
    while ((line = flow.next(start, end))) lines.push(line);
    paragraphs.push({ paragraph: block, lines, top: y });
    y += lines.reduce((sum, l) => sum + l.height, 0);
    previous = block;
  }
  if (previous) y += previous.after;
  return { paragraphs, height: y };
}

function gapBetween(
  previous: OgeWordParagraph | null,
  next: OgeWordParagraph,
  keepBefore: boolean,
): number {
  if (previous === null) return keepBefore ? next.before : 0;
  const sameStyle = previous.styleId === next.styleId;
  const after = previous.contextualSpacing && sameStyle ? 0 : previous.after;
  const before = next.contextualSpacing && sameStyle ? 0 : next.before;
  return Math.max(after, before);
}

function drawStack(
  canvas: PageCanvas,
  stack: readonly Stacked[],
  top: number,
  family: (name: string) => string,
): void {
  for (const { lines, top: offset } of stack) {
    let y = top + offset;
    for (const line of lines) {
      drawLine(canvas, line, y, family);
      y += line.height;
    }
  }
}

// --- pagination -------------------------------------------------------------

interface Exclusion {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly wrap: 'square' | 'topAndBottom';
}

interface PageState {
  readonly canvas: PageCanvas;
  readonly section: OgeWordSection;
  readonly exclusions: Exclusion[];
  readonly notes: string[];
  noteHeight: number;
  bodyTop: number;
  bodyBottom: number;
}

const FOOTNOTE_SEPARATOR = 13.6;

/** One laid-out page: what the viewer draws. */
export interface OgeWordLaidPage {
  readonly width: number;
  readonly height: number;
  readonly render: OgeSlideRender;
  /** Lines in reading order, for tests and text extraction. */
  readonly lines: readonly OgeWordLaidLine[];
}

/** A body line on a page, in points. */
export interface OgeWordLaidLine {
  readonly text: string;
  readonly x: number;
  readonly top: number;
  readonly height: number;
}

/** Options of {@link ogeLayoutWordDocument}. */
export interface OgeWordLayoutOptions {
  readonly idPrefix: string;
  /** The CSS family list for a typeface. */
  readonly fontFamily: (name: string) => string;
}

class Paginator {
  readonly pages: PageState[] = [];
  readonly laid: OgeWordLaidLine[][] = [];
  private y = 0;
  private column = 0;
  private atTop = true;
  private explicitBreak = true;
  private previous: OgeWordParagraph | null = null;
  private section!: OgeWordSection;
  /** The mark a note's own paragraph opens with, while notes are placed. */
  private noteMark: string | undefined;

  constructor(
    private readonly context: LayoutContext,
    private readonly options: OgeWordLayoutOptions,
  ) {}

  private get page(): PageState {
    return this.pages[this.pages.length - 1];
  }

  private columnBounds(): { start: number; end: number } {
    const { left, right, width, columns, columnGap } = this.section.page;
    const span = width - left - right;
    const each = (span - columnGap * (columns - 1)) / columns;
    const start = left + this.column * (each + columnGap);
    return { start, end: start + each };
  }

  private headerBlocks(
    set: OgeWordSection['headers'],
    pageNumber: number,
    firstOfSection: boolean,
  ): readonly OgeWordBlock[] | undefined {
    if (firstOfSection && this.section.titlePage) return set.first ?? [];
    if (this.context.document.evenAndOddHeaders && pageNumber % 2 === 0)
      return set.even ?? set.default;
    return set.default;
  }

  newPage(firstOfSection = false): void {
    const pageNumber = this.pages.length + 1;
    this.context.page = pageNumber;
    const setup = this.section.page;
    const canvas = new PageCanvas(
      this.context.measurer,
      `${this.options.idPrefix}-p${pageNumber}`,
      setup,
    );
    canvas.rect(0, 0, setup.width, setup.height, 'FFFFFF');
    const start = setup.left;
    const end = setup.width - setup.right;
    const family = this.options.fontFamily;

    let bodyTop = setup.top;
    const header = this.headerBlocks(
      this.section.headers,
      pageNumber,
      firstOfSection,
    );
    if (header?.length) {
      const stack = stackBlocks(header, start, end, this.context);
      drawStack(canvas, stack.paragraphs, setup.header, family);
      bodyTop = Math.max(bodyTop, setup.header + stack.height);
    }
    let bodyBottom = setup.height - setup.bottom;
    const footer = this.headerBlocks(
      this.section.footers,
      pageNumber,
      firstOfSection,
    );
    if (footer?.length) {
      const stack = stackBlocks(footer, start, end, this.context);
      const last = stack.paragraphs[stack.paragraphs.length - 1]?.paragraph;
      const height = stack.height - (last?.after ?? 0);
      const top = setup.height - setup.footer - height;
      drawStack(canvas, stack.paragraphs, top, family);
      bodyBottom = Math.min(bodyBottom, top);
    }
    this.pages.push({
      canvas,
      section: this.section,
      exclusions: [],
      notes: [],
      noteHeight: 0,
      bodyTop,
      bodyBottom,
    });
    this.laid.push([]);
    this.column = 0;
    this.y = bodyTop;
    this.atTop = true;
    this.previous = null;
  }

  private nextColumnOrPage(): void {
    if (this.column + 1 < this.section.page.columns) {
      this.column++;
      this.y = this.page.bodyTop;
      this.atTop = true;
      this.previous = null;
      return;
    }
    this.newPage();
  }

  private limit(extraNotes = 0): number {
    const { noteHeight, bodyBottom, notes } = this.page;
    const total = noteHeight + extraNotes;
    return total > 0 || notes.length > 0
      ? bodyBottom - total - FOOTNOTE_SEPARATOR
      : bodyBottom;
  }

  run(document: OgeWordDocument): void {
    document.sections.forEach((section, index) => {
      this.section = section;
      if (index === 0 || section.type !== 'continuous') {
        this.newPage(true);
        if (
          (section.type === 'evenPage' && this.pages.length % 2 === 1) ||
          (section.type === 'oddPage' && this.pages.length % 2 === 0)
        ) {
          this.newPage(true);
        }
        this.explicitBreak = true;
      }
      section.blocks.forEach((block, i) => {
        if (block.kind === 'table') {
          this.placeTable(block);
        } else {
          this.placeParagraph(block, section.blocks, i);
        }
      });
    });
    this.placeEndnotes(document);
    this.finishNotes();
  }

  /** Endnotes follow the last section, after a short rule. */
  private placeEndnotes(document: OgeWordDocument): void {
    const used = [...this.context.endnoteNumbers.entries()];
    if (used.length === 0) return;
    const { start } = this.columnBounds();
    this.y += 10;
    this.page.canvas.line(start, this.y, start + 144, this.y, {
      width: 0.5,
      color: '000000',
      style: 'single',
      space: 0,
    });
    this.y += 6;
    this.previous = null;
    for (const [id, number] of used) {
      const blocks = document.endnotes.get(id) ?? [];
      this.noteMark = romanLower(number);
      blocks.forEach((block, index) => {
        if (block.kind === 'paragraph')
          this.placeParagraph(block, blocks, index);
      });
    }
    this.noteMark = undefined;
  }

  // --- keep rules ----------------------------------------------------------

  private firstLinesHeight(block: OgeWordBlock): number {
    const { start, end } = this.columnBounds();
    if (block.kind === 'table') {
      const row = block.rows[0];
      return row ? this.rowHeight(block, row, 0) : 0;
    }
    const flow = new LineFlow(block, this.context);
    const lines: LaidLine[] = [];
    let line: LaidLine | null;
    while ((line = flow.next(start, end))) lines.push(line);
    const count = block.keepLines
      ? lines.length
      : block.widowControl
        ? Math.min(2, lines.length)
        : 1;
    return (
      block.before + lines.slice(0, count).reduce((sum, l) => sum + l.height, 0)
    );
  }

  private keepChainHeight(
    blocks: readonly OgeWordBlock[],
    index: number,
  ): number {
    const { start, end } = this.columnBounds();
    let total = 0;
    let i = index;
    for (; i < blocks.length; i++) {
      const block = blocks[i];
      if (block.kind !== 'paragraph' || !block.keepNext) break;
      const stack = stackBlocks([block], start, end, this.context);
      total += stack.height;
    }
    if (i === index) return 0;
    if (i < blocks.length) total += this.firstLinesHeight(blocks[i]);
    return total;
  }

  // --- paragraphs ----------------------------------------------------------

  /** The free stretch of the column for a line at `y`, `height` tall. */
  private lineRoom(
    start: number,
    end: number,
    y: number,
    height: number,
  ): {
    start: number;
    end: number;
    y: number;
    more: { start: number; end: number }[];
  } {
    let top = y;
    let free = [{ start, end }];
    let moved = true;
    while (moved) {
      moved = false;
      free = [{ start, end }];
      for (const box of this.page.exclusions) {
        if (top + height <= box.top || top >= box.bottom) continue;
        if (box.right <= start || box.left >= end) continue;
        if (box.wrap === 'topAndBottom') {
          top = box.bottom;
          moved = true;
          break;
        }
        free = free.flatMap((part) => {
          if (box.right <= part.start || box.left >= part.end) return [part];
          const pieces: { start: number; end: number }[] = [];
          if (box.left > part.start)
            pieces.push({ start: part.start, end: box.left });
          if (box.right < part.end)
            pieces.push({ start: box.right, end: part.end });
          return pieces;
        });
      }
    }
    const [first, ...more] = free.length ? free : [{ start, end }];
    return { ...first, y: top, more };
  }

  private placeFloats(paragraph: OgeWordParagraph, top: number): void {
    for (const inline of paragraph.inlines) {
      if (inline.kind !== 'float') continue;
      this.placeFloat(inline.float, top);
    }
  }

  private drawShape(float: OgeWordFloat, x: number, y: number): void {
    const shape = float.shape;
    if (!shape) return;
    const { canvas } = this.page;
    canvas.drawing.nodes.push({
      kind: 'path',
      d: ogeSlideGeometryPath(
        shape.geometry,
        float.width,
        float.height,
        shape.adjust,
      ),
      transform: `translate(${num(x)} ${num(y)})`,
      fill: shape.fill ? solid(shape.fill) : null,
      stroke: shape.line ? solid(shape.line.color) : null,
      strokeWidth: shape.line?.width ?? 0,
      dash: null,
      cap: 'butt',
      filter: null,
    });
    const start = x + shape.insets.left;
    const end = x + float.width - shape.insets.right;
    const stack = stackBlocks(shape.blocks, start, end, this.context);
    const room = float.height - shape.insets.top - shape.insets.bottom;
    const shift =
      shape.anchor === 'center'
        ? (room - stack.height) / 2
        : shape.anchor === 'bottom'
          ? room - stack.height
          : 0;
    drawStack(
      canvas,
      stack.paragraphs,
      y + shape.insets.top + Math.max(0, shift),
      this.options.fontFamily,
    );
  }

  private placeFloat(float: OgeWordFloat, paragraphTop: number): void {
    const setup = this.section.page;
    const { start, end } = this.columnBounds();
    const originX = (from: string): [number, number] => {
      if (from === 'page') return [0, setup.width];
      if (from === 'margin') return [setup.left, setup.width - setup.right];
      return [start, end];
    };
    const originY = (from: string): [number, number] => {
      if (from === 'page') return [0, setup.height];
      if (from === 'margin' || from === 'topMargin')
        return [setup.top, setup.height - setup.bottom];
      return [paragraphTop, setup.height - setup.bottom];
    };
    const place = (
      position: OgeWordFloat['horizontal'],
      [low, high]: [number, number],
      size: number,
    ): number => {
      if (position.offset !== null) return low + position.offset;
      if (position.align === 'center') return (low + high - size) / 2;
      if (position.align === 'right' || position.align === 'bottom')
        return high - size;
      return low;
    };
    const x = place(
      float.horizontal,
      originX(float.horizontal.from),
      float.width,
    );
    const y = place(float.vertical, originY(float.vertical.from), float.height);
    if (float.picture) {
      this.page.canvas.picture(
        float.picture,
        x,
        y,
        float.width,
        float.height,
        float.description ?? '',
      );
    } else {
      this.drawShape(float, x, y);
    }
    if (float.wrap === 'none') return;
    this.page.exclusions.push({
      left: x - float.distance.left,
      top: y - float.distance.top,
      right: x + float.width + float.distance.right,
      bottom: y + float.height + float.distance.bottom,
      wrap: float.wrap,
    });
  }

  private noteHeightOf(id: string): number {
    const blocks = this.context.document.footnotes.get(id);
    if (!blocks) return 0;
    const { left, width, right } = this.section.page;
    const number = noteNumber(this.context, id);
    return this.stackNote(blocks, left, width - right, number).height;
  }

  private stackNote(
    blocks: readonly OgeWordBlock[],
    start: number,
    end: number,
    number: number,
  ): { paragraphs: Stacked[]; height: number } {
    const paragraphs: Stacked[] = [];
    let y = 0;
    let previous: OgeWordParagraph | null = null;
    for (const block of blocks) {
      if (block.kind !== 'paragraph') continue;
      y += gapBetween(previous, block, false);
      const flow = new LineFlow(block, this.context, String(number));
      const lines: LaidLine[] = [];
      let line: LaidLine | null;
      while ((line = flow.next(start, end))) lines.push(line);
      paragraphs.push({ paragraph: block, lines, top: y });
      y += lines.reduce((sum, l) => sum + l.height, 0);
      previous = block;
    }
    return { paragraphs, height: y };
  }

  private placeParagraph(
    paragraph: OgeWordParagraph,
    blocks: readonly OgeWordBlock[],
    index: number,
  ): void {
    if (paragraph.pageBreakBefore && !(this.atTop && this.previous === null)) {
      this.newPage();
      this.explicitBreak = true;
    }
    const chain = this.keepChainHeight(blocks, index);
    if (
      chain > 0 &&
      !this.atTop &&
      this.y + chain > this.limit() &&
      chain <= this.limit() - this.page.bodyTop
    ) {
      this.nextColumnOrPage();
    }

    const { start, end } = this.columnBounds();
    let gap = gapBetween(this.previous, paragraph, this.explicitBreak);
    this.explicitBreak = false;

    // the whole paragraph's lines, for the keep and widow decisions
    const preview = new LineFlow(paragraph, this.context, this.noteMark);
    const allLines: LaidLine[] = [];
    let previewLine: LaidLine | null;
    while ((previewLine = preview.next(start, end))) allLines.push(previewLine);
    const count = allLines.length;

    const fits = (height: number, y: number, notes = 0): boolean =>
      y + height <= this.limit(notes) + 0.01;

    if (
      paragraph.keepLines &&
      !this.atTop &&
      !fits(
        allLines.reduce((sum, l) => sum + l.height, 0),
        this.y + gap,
      ) &&
      allLines.reduce((sum, l) => sum + l.height, 0) <=
        this.limit() - this.page.bodyTop
    ) {
      this.nextColumnOrPage();
      gap = 0;
    }

    const twoFit = (): boolean => {
      const need = allLines
        .slice(0, paragraph.widowControl ? Math.min(2, count) : 1)
        .reduce((sum, l) => sum + l.height, 0);
      return fits(need, this.y + gap);
    };
    if (!this.atTop && !twoFit()) {
      this.nextColumnOrPage();
      gap = 0;
    }

    this.placeFloats(paragraph, this.y + gap);
    this.y += gap;
    this.atTop = false;
    this.drawParagraphBox(paragraph, allLines, start, end);

    const flow = new LineFlow(paragraph, this.context, this.noteMark);
    let placed = 0;
    let line: LaidLine | null = null;
    for (;;) {
      const estimate = allLines[Math.min(placed, count - 1)]?.height ?? 14;
      const room = this.lineRoom(start, end, this.y, estimate);
      line = flow.next(room.start, room.end, room.more);
      if (!line) break;
      this.y = room.y;

      const notes = line.footnotes.reduce(
        (sum, id) => sum + this.noteHeightOf(id),
        0,
      );
      let must = !fits(line.height, this.y, notes);
      // widow control: never leave one line alone on either page
      if (!must && paragraph.widowControl && count - placed === 2) {
        const nextHeight = allLines[placed + 1]?.height ?? line.height;
        if (!fits(line.height + nextHeight, this.y, notes) && placed > 0) {
          must = true;
        }
      }
      if (must && placed > 0) {
        this.nextColumnOrPage();
        const again = this.lineRoom(start, end, this.y, line.height);
        this.y = again.y;
      }
      this.placeLine(line);
      placed++;
      if (line.end === 'page') {
        this.newPage();
        this.explicitBreak = true;
        this.atTop = true;
      } else if (line.end === 'column') {
        this.nextColumnOrPage();
      }
    }
    this.previous = paragraph;
  }

  private drawParagraphBox(
    paragraph: OgeWordParagraph,
    lines: readonly LaidLine[],
    start: number,
    end: number,
  ): void {
    const height = lines.reduce((sum, l) => sum + l.height, 0);
    const left = start + paragraph.left;
    const right = end - paragraph.right;
    const { canvas } = this.page;
    if (paragraph.shading) {
      canvas.rect(left, this.y, right - left, height, paragraph.shading);
    }
    const b = paragraph.borders;
    if (b.top)
      canvas.line(
        left,
        this.y - b.top.space,
        right,
        this.y - b.top.space,
        b.top,
      );
    const bottom = this.y + height;
    if (b.bottom)
      canvas.line(
        left,
        bottom + b.bottom.space,
        right,
        bottom + b.bottom.space,
        b.bottom,
      );
    if (b.left)
      canvas.line(
        left - b.left.space,
        this.y,
        left - b.left.space,
        bottom,
        b.left,
      );
    if (b.right)
      canvas.line(
        right + b.right.space,
        this.y,
        right + b.right.space,
        bottom,
        b.right,
      );
  }

  private placeLine(line: LaidLine): void {
    drawLine(this.page.canvas, line, this.y, this.options.fontFamily);
    const textItems = line.items.filter(
      (item) => item.piece.kind === 'word' || item.piece.kind === 'space',
    );
    this.laid[this.laid.length - 1].push({
      text: textItems
        .slice(line.labelItems)
        .map((item) => (item.piece as { text: string }).text)
        .join(''),
      x: textItems[line.labelItems]?.x ?? line.items[0]?.x ?? 0,
      top: this.y,
      height: line.height,
    });
    for (const id of line.footnotes) {
      this.page.notes.push(id);
      this.page.noteHeight += this.noteHeightOf(id);
    }
    this.y += line.height;
  }

  // --- tables --------------------------------------------------------------

  private columnsX(table: OgeWordTable): number[] {
    const { start, end } = this.columnBounds();
    const width = table.columns.reduce((sum, w) => sum + w, 0);
    let x = start + table.indent;
    if (table.align === 'center') x = start + (end - start - width) / 2;
    else if (table.align === 'right') x = end - width;
    const out = [x];
    for (const w of table.columns) out.push(out[out.length - 1] + w);
    return out;
  }

  private cellStack(
    table: OgeWordTable,
    row: OgeWordTable['rows'][number],
    cell: OgeWordTable['rows'][number]['cells'][number],
    column: number,
  ): { stack: ReturnType<typeof stackBlocks>; left: number; right: number } {
    const xs = this.columnsX(table);
    const left = xs[column];
    const right = xs[Math.min(column + cell.columnSpan, table.columns.length)];
    void row;
    return {
      stack: stackBlocks(
        cell.blocks,
        left + cell.margins.left,
        right - cell.margins.right,
        this.context,
      ),
      left,
      right,
    };
  }

  private rowHeight(
    table: OgeWordTable,
    row: OgeWordTable['rows'][number],
    _rowIndex: number,
  ): number {
    if (row.heightRule === 'exact') return row.height;
    let needed = 0;
    let column = row.skipBefore;
    for (const cell of row.cells) {
      if (cell.verticalMerge === 'none') {
        const { stack } = this.cellStack(table, row, cell, column);
        const last = stack.paragraphs[stack.paragraphs.length - 1]?.paragraph;
        needed = Math.max(
          needed,
          stack.height -
            (last?.after ?? 0) * 0 +
            cell.margins.top +
            cell.margins.bottom,
        );
      }
      column += cell.columnSpan;
    }
    // a row's height includes its top border, as Word measures it
    const rule = Math.max(
      0,
      ...row.cells.map((cell) => cell.borders.top?.width ?? 0),
    );
    return (
      (row.heightRule === 'atLeast' ? Math.max(needed, row.height) : needed) +
      rule
    );
  }

  private drawRow(
    table: OgeWordTable,
    rowIndex: number,
    heights: readonly number[],
    tops: Map<number, number>,
  ): void {
    const row = table.rows[rowIndex];
    const { canvas } = this.page;
    const family = this.options.fontFamily;
    const xs = this.columnsX(table);
    const top = tops.get(rowIndex) ?? this.y;
    let column = row.skipBefore;
    for (const cell of row.cells) {
      const span = cell.columnSpan;
      if (cell.verticalMerge !== 'continue') {
        let height = heights[rowIndex];
        if (cell.verticalMerge === 'restart') {
          for (
            let r = rowIndex + 1;
            r < table.rows.length && this.continuesMerge(table.rows[r], column);
            r++
          ) {
            height += heights[r];
          }
        }
        const left = xs[column];
        const right = xs[Math.min(column + span, table.columns.length)];
        if (cell.shading)
          canvas.rect(left, top, right - left, height, cell.shading);
        const { stack } = this.cellStack(table, row, cell, column);
        const free =
          height - stack.height - cell.margins.top - cell.margins.bottom;
        const shift =
          cell.verticalAlign === 'center'
            ? free / 2
            : cell.verticalAlign === 'bottom'
              ? free
              : 0;
        const contentTop = top + cell.margins.top + Math.max(0, shift);
        drawStack(canvas, stack.paragraphs, contentTop, family);
        this.recordCell(stack.paragraphs, contentTop);
        this.drawCellBorders(
          canvas,
          left,
          top,
          right,
          top + height,
          cell.borders,
        );
      }
      column += span;
    }
  }

  private recordCell(stack: readonly Stacked[], top: number): void {
    for (const { lines, top: offset } of stack) {
      let y = top + offset;
      for (const line of lines) {
        this.laid[this.laid.length - 1].push({
          text: line.items
            .filter((i) => i.piece.kind === 'word' || i.piece.kind === 'space')
            .map((i) => (i.piece as { text: string }).text)
            .join(''),
          x: line.items[0]?.x ?? 0,
          top: y,
          height: line.height,
        });
        y += line.height;
      }
    }
  }

  private drawCellBorders(
    canvas: PageCanvas,
    left: number,
    top: number,
    right: number,
    bottom: number,
    borders: Readonly<Partial<Record<OgeWordEdge, OgeWordBorder>>>,
  ): void {
    if (borders.top) canvas.line(left, top, right, top, borders.top);
    if (borders.bottom)
      canvas.line(left, bottom, right, bottom, borders.bottom);
    if (borders.left) canvas.line(left, top, left, bottom, borders.left);
    if (borders.right) canvas.line(right, top, right, bottom, borders.right);
  }

  /**
   * Lets a row run over the page: each cell keeps the lines that fit and the
   * rest continue at the top of the next page. `false` when not even one
   * line of any cell fits, so the caller moves the row whole.
   */
  private placeSplitRow(
    table: OgeWordTable,
    r: number,
    headers: number,
    heights: readonly number[],
  ): boolean {
    const row = table.rows[r];
    const xs = this.columnsX(table);
    let column = row.skipBefore;
    const cells = row.cells.map((cell) => {
      const at = column;
      column += cell.columnSpan;
      const { stack, left, right } = this.cellStack(table, row, cell, at);
      const lines = stack.paragraphs.flatMap(({ lines: own, top }) => {
        let y = top;
        return own.map((line) => {
          const entry = { line, y };
          y += line.height;
          return entry;
        });
      });
      return { cell, left, right, lines, drawn: 0 };
    });
    void xs;
    const firstFits = cells.some(
      ({ cell, lines }) =>
        lines.length > 0 &&
        this.y + cell.margins.top + lines[0].line.height <= this.limit(),
    );
    if (!firstFits) return false;
    for (;;) {
      const room = this.limit() - this.y;
      const top = this.y;
      let used = 0;
      let remaining = false;
      for (const part of cells) {
        const offset = part.lines[part.drawn]?.y ?? 0;
        let n = part.drawn;
        while (
          n < part.lines.length &&
          part.cell.margins.top +
            part.lines[n].y -
            offset +
            part.lines[n].line.height <=
            room
        ) {
          drawLine(
            this.page.canvas,
            part.lines[n].line,
            top + part.cell.margins.top + part.lines[n].y - offset,
            this.options.fontFamily,
          );
          n++;
        }
        if (n > part.drawn) {
          const last = part.lines[n - 1];
          used = Math.max(
            used,
            part.cell.margins.top + last.y - offset + last.line.height,
          );
        }
        part.drawn = n;
        if (n < part.lines.length) remaining = true;
      }
      const bottom = remaining ? top + room : top + used;
      for (const part of cells) {
        if (part.cell.shading) {
          // the fill goes under the text already drawn on this page
          this.page.canvas.drawing.nodes.unshift({
            kind: 'path',
            d: `M${num(part.left)} ${num(top)} H${num(part.right)} V${num(bottom)} H${num(part.left)} Z`,
            transform: '',
            fill: solid(part.cell.shading),
            stroke: null,
            strokeWidth: 0,
            dash: null,
            cap: 'butt',
            filter: null,
          });
        }
        this.drawCellBorders(
          this.page.canvas,
          part.left,
          top,
          part.right,
          bottom,
          part.cell.borders,
        );
      }
      this.y = bottom;
      if (!remaining) return true;
      this.nextColumnOrPage();
      for (let h = 0; h < headers; h++) {
        this.drawRow(table, h, heights, new Map([[h, this.y]]));
        this.y += heights[h];
      }
    }
  }

  private continuesMerge(
    row: OgeWordTable['rows'][number],
    column: number,
  ): boolean {
    let at = row.skipBefore;
    for (const cell of row.cells) {
      if (at === column) return cell.verticalMerge === 'continue';
      at += cell.columnSpan;
    }
    return false;
  }

  private placeTable(table: OgeWordTable): void {
    this.y += this.previous ? this.previous.after : 0;
    this.previous = null;
    this.explicitBreak = false;
    const heights = table.rows.map((row, r) => this.rowHeight(table, row, r));
    const headerCount = table.rows.findIndex((row) => !row.header);
    const headers = headerCount < 0 ? table.rows.length : headerCount;
    let onPage = 0;
    for (let r = 0; r < table.rows.length; r++) {
      const height = heights[r];
      const breakable =
        r >= headers &&
        !table.rows[r].cantSplit &&
        table.rows[r].heightRule !== 'exact';
      if (this.y + height > this.limit() + 0.01 && breakable) {
        if (this.placeSplitRow(table, r, headers, heights)) {
          this.atTop = false;
          continue;
        }
      }
      if (
        this.y + height > this.limit() + 0.01 &&
        !this.atTop &&
        height <= this.limit() - this.page.bodyTop
      ) {
        this.nextColumnOrPage();
        onPage = 0;
        if (r >= headers) {
          for (let h = 0; h < headers; h++) {
            this.drawRow(table, h, heights, new Map([[h, this.y]]));
            this.y += heights[h];
          }
        }
      }
      this.drawRow(table, r, heights, new Map([[r, this.y]]));
      this.y += height;
      this.atTop = false;
      onPage++;
    }
    void onPage;
  }

  // --- footnotes -----------------------------------------------------------

  private finishNotes(): void {
    for (const page of this.pages) {
      if (page.notes.length === 0) continue;
      const setup = page.section.page;
      const start = setup.left;
      const end = setup.width - setup.right;
      const family = this.options.fontFamily;
      let y = page.bodyBottom - page.noteHeight;
      page.canvas.line(start, y - 6, start + 144, y - 6, {
        width: 0.5,
        color: '000000',
        style: 'single',
        space: 0,
      });
      for (const id of page.notes) {
        const blocks = this.context.document.footnotes.get(id);
        if (!blocks) continue;
        const number = noteNumber(this.context, id);
        const stack = this.stackNote(blocks, start, end, number);
        drawStack(page.canvas, stack.paragraphs, y, family);
        y += stack.height;
      }
    }
  }
}

/** Lays a document out into pages. */
export function ogeLayoutWordDocument(
  document: OgeWordDocument,
  measurer: OgeSlideTextMeasurer,
  options: OgeWordLayoutOptions,
): readonly OgeWordLaidPage[] {
  const run = (pages: number): Paginator => {
    const context: LayoutContext = {
      measurer,
      document,
      page: 1,
      pages,
      footnoteNumbers: new Map(),
      endnoteNumbers: new Map(),
    };
    const paginator = new Paginator(context, options);
    paginator.run(document);
    return paginator;
  };
  // NUMPAGES is known only after a first pass.
  const first = run(1);
  const paginator = first.pages.length === 1 ? first : run(first.pages.length);
  return paginator.pages.map((page, i) => ({
    width: page.section.page.width,
    height: page.section.page.height,
    render: {
      width: page.section.page.width,
      height: page.section.page.height,
      gradients: page.canvas.drawing.gradients,
      patterns: page.canvas.drawing.patterns,
      nodes: page.canvas.drawing.nodes,
    },
    lines: paginator.laid[i],
  }));
}
