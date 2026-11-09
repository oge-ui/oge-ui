/**
 * Turns a slide into flat SVG drawing instructions. Both render layers bind
 * these element for element and compute nothing themselves (ADR 0006). All
 * coordinates are points, the slide's own unit, so a layer only sets the
 * `viewBox` to scale it.
 */
import { sanitizeUrl } from '@oge-ui/behavior';
import {
  ogeIsSlideGeometryOpen,
  ogeSlideGeometryPath,
  ogeSlideGeometryTextInsets,
} from './geometry';
import type {
  OgePresentation,
  OgeSlide,
  OgeSlideColor,
  OgeSlideElement,
  OgeSlideFill,
  OgeSlideFrame,
  OgeSlideLine,
  OgeSlidePictureRef,
  OgeSlideTable,
  OgeSlideTextBody,
} from './model';
import {
  ogeLayoutSlideText,
  type OgeSlideLaidFragment,
  type OgeSlideTextMeasurer,
} from './text-layout';

const EMU_PER_POINT = 12700;
const pt = (emu: number): number => emu / EMU_PER_POINT;
const round = (value: number): number => Math.round(value * 1000) / 1000;

/** An SVG paint: a CSS colour or a gradient reference, with its opacity. */
export interface OgeSlidePaint {
  readonly paint: string;
  readonly opacity: number;
}

/** A linear gradient to declare in `<defs>`. */
export interface OgeSlideRenderGradient {
  readonly id: string;
  /** `gradientTransform`. */
  readonly transform: string;
  readonly stops: readonly {
    readonly offset: number;
    readonly color: string;
    readonly opacity: number;
  }[];
}

/** An outline or a filled area. */
export interface OgeSlideRenderPath {
  readonly kind: 'path';
  readonly d: string;
  readonly transform: string;
  readonly fill: OgeSlidePaint | null;
  readonly stroke: OgeSlidePaint | null;
  readonly strokeWidth: number;
  /** `stroke-dasharray`, or `null` for a solid line. */
  readonly dash: string | null;
  readonly cap: 'butt' | 'round' | 'square';
}

/** A picture: an `<svg>` window onto a unit-square `<image>`. */
export interface OgeSlideRenderImage {
  readonly kind: 'image';
  readonly media: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** The window's `viewBox`: the crop, in unit-square coordinates. */
  readonly viewBox: string;
  readonly transform: string;
  readonly label: string;
}

/** A run of text on one baseline. */
export interface OgeSlideRenderText {
  readonly kind: 'text';
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly transform: string;
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly fontWeight: 'normal' | 'bold';
  readonly fontStyle: 'normal' | 'italic';
  readonly fill: OgeSlidePaint;
  readonly decoration: string | null;
  /** Sanitized; `null` when the file's target is not a safe link. */
  readonly link: string | null;
}

/** One drawing instruction, in paint order. */
export type OgeSlideRenderNode =
  OgeSlideRenderPath | OgeSlideRenderImage | OgeSlideRenderText;

/** A drawn slide. */
export interface OgeSlideRender {
  /** Points. */
  readonly width: number;
  /** Points. */
  readonly height: number;
  readonly gradients: readonly OgeSlideRenderGradient[];
  readonly nodes: readonly OgeSlideRenderNode[];
}

/** Options of {@link ogeRenderSlide}. */
export interface OgeSlideRenderOptions {
  /** Prefix of gradient ids; unique per viewer on the page. */
  readonly idPrefix: string;
}

/** Faces with the same metrics, for machines without Microsoft's fonts. */
const METRIC_COMPATIBLE: Readonly<Record<string, string>> = {
  calibri: 'Carlito',
  cambria: 'Caladea',
  arial: 'Liberation Sans',
  'times new roman': 'Liberation Serif',
  'courier new': 'Liberation Mono',
};

/** The CSS font family list for a typeface. */
export function ogeSlideFontFamily(family: string): string {
  const fallback = METRIC_COMPATIBLE[family.toLowerCase()];
  const quoted = (name: string): string => `"${name.replace(/"/g, '')}"`;
  return [
    quoted(family),
    ...(fallback ? [quoted(fallback)] : []),
    'sans-serif',
  ].join(', ');
}

const DASHES: Readonly<Record<string, readonly number[]>> = {
  dash: [4, 3],
  dot: [1, 3],
  lgDash: [8, 3],
  dashDot: [4, 3, 1, 3],
  lgDashDot: [8, 3, 1, 3],
  lgDashDotDot: [8, 3, 1, 3, 1, 3],
  sysDash: [3, 1],
  sysDot: [1, 1],
  sysDashDot: [3, 1, 1, 1],
  sysDashDotDot: [3, 1, 1, 1, 1, 1],
};

const CAPS: Readonly<Record<string, OgeSlideRenderPath['cap']>> = {
  flat: 'butt',
  rnd: 'round',
  sq: 'square',
};

const colorPaint = (color: OgeSlideColor): OgeSlidePaint => ({
  paint: `#${color.rgb}`,
  opacity: color.alpha,
});

function safeLink(target: string | undefined): string | null {
  if (!target) return null;
  const safe = sanitizeUrl(target);
  return safe === '' || safe === 'about:blank' ? null : safe;
}

class SlideRenderer {
  readonly gradients: OgeSlideRenderGradient[] = [];
  readonly nodes: OgeSlideRenderNode[] = [];

  constructor(
    private readonly measurer: OgeSlideTextMeasurer,
    private readonly idPrefix: string,
  ) {}

  private paint(fill: OgeSlideFill): OgeSlidePaint | null {
    if (fill.kind === 'solid') return colorPaint(fill.color);
    if (fill.kind === 'gradient' && fill.stops.length > 0) {
      const id = `${this.idPrefix}-g${this.gradients.length}`;
      this.gradients.push({
        id,
        transform: `rotate(${round(fill.angle ?? 0)} 0.5 0.5)`,
        stops: fill.stops.map((stop) => ({
          offset: stop.position,
          color: `#${stop.color.rgb}`,
          opacity: stop.color.alpha,
        })),
      });
      return { paint: `url(#${id})`, opacity: 1 };
    }
    return null;
  }

  private strokeOf(line: OgeSlideLine | null): {
    stroke: OgeSlidePaint | null;
    strokeWidth: number;
    dash: string | null;
    cap: OgeSlideRenderPath['cap'];
  } {
    const width = line ? pt(line.width) : 0;
    const pattern = line ? DASHES[line.dash] : undefined;
    return {
      stroke: line ? this.paint(line.fill) : null,
      strokeWidth: width,
      dash: pattern ? pattern.map((n) => round(n * width)).join(' ') : null,
      cap: (line && CAPS[line.cap]) || 'butt',
    };
  }

  private rotation(frame: OgeSlideFrame): string {
    const x = round(pt(frame.x));
    const y = round(pt(frame.y));
    const w = round(pt(frame.width) / 2);
    const h = round(pt(frame.height) / 2);
    return frame.rotation
      ? `translate(${x} ${y}) rotate(${round(frame.rotation)} ${w} ${h})`
      : `translate(${x} ${y})`;
  }

  private shapeTransform(frame: OgeSlideFrame): string {
    const parts = [this.rotation(frame)];
    if (frame.flipH)
      parts.push(`translate(${round(pt(frame.width))} 0) scale(-1 1)`);
    if (frame.flipV)
      parts.push(`translate(0 ${round(pt(frame.height))}) scale(1 -1)`);
    return parts.join(' ');
  }

  /** Text is not mirrored by a flip; a vertical flip turns it over. */
  private textTransform(frame: OgeSlideFrame): string {
    const base = this.rotation(frame);
    return frame.flipV
      ? `${base} rotate(180 ${round(pt(frame.width) / 2)} ${round(pt(frame.height) / 2)})`
      : base;
  }

  background(fill: OgeSlideFill, width: number, height: number): void {
    if (fill.kind === 'picture') {
      this.picture(fill.picture, 0, 0, width, height, '', '');
      return;
    }
    this.nodes.push({
      kind: 'path',
      d: ogeSlideGeometryPath('rect', width, height, {}),
      transform: '',
      fill: this.paint(fill),
      stroke: null,
      strokeWidth: 0,
      dash: null,
      cap: 'butt',
    });
  }

  private picture(
    picture: OgeSlidePictureRef,
    x: number,
    y: number,
    width: number,
    height: number,
    transform: string,
    label: string,
  ): void {
    const { left, top, right, bottom } = picture.crop;
    this.nodes.push({
      kind: 'image',
      media: picture.media,
      x,
      y,
      width,
      height,
      viewBox: `${round(left)} ${round(top)} ${round(1 - left - right)} ${round(1 - top - bottom)}`,
      transform,
      label,
    });
  }

  element(element: OgeSlideElement): void {
    if (element.kind === 'table') {
      this.table(element);
      return;
    }
    const width = pt(element.frame.width);
    const height = pt(element.frame.height);
    if (element.kind === 'picture') {
      this.picture(
        element.picture,
        0,
        0,
        width,
        height,
        this.shapeTransform(element.frame),
        element.description ?? element.name,
      );
      if (element.line) {
        this.nodes.push({
          kind: 'path',
          d: ogeSlideGeometryPath('rect', width, height, {}),
          transform: this.shapeTransform(element.frame),
          fill: null,
          ...this.strokeOf(element.line),
        });
      }
      return;
    }
    if (element.fill.kind === 'picture') {
      this.picture(
        element.fill.picture,
        0,
        0,
        width,
        height,
        this.shapeTransform(element.frame),
        element.description ?? element.name,
      );
    }
    const open = ogeIsSlideGeometryOpen(element.geometry);
    const fill = open ? null : this.paint(element.fill);
    if (fill || element.line) {
      this.nodes.push({
        kind: 'path',
        d: ogeSlideGeometryPath(
          element.geometry,
          width,
          height,
          element.adjust,
        ),
        transform: this.shapeTransform(element.frame),
        fill,
        ...this.strokeOf(element.line),
      });
    }
    if (element.text) {
      const insets = ogeSlideGeometryTextInsets(
        element.geometry,
        width,
        height,
        element.adjust,
      );
      this.text(
        element.text,
        insets.left,
        insets.top,
        width - insets.left - insets.right,
        height - insets.top - insets.bottom,
        this.textTransform(element.frame),
      );
    }
  }

  private text(
    body: OgeSlideTextBody,
    x: number,
    y: number,
    width: number,
    height: number,
    transform: string,
  ): void {
    for (const line of ogeLayoutSlideText(body, width, height, this.measurer)) {
      if (line.bullet)
        this.fragment(line.bullet, x, y + line.baseline, transform);
      for (const fragment of line.fragments) {
        this.fragment(fragment, x, y + line.baseline, transform);
      }
    }
  }

  private fragment(
    fragment: OgeSlideLaidFragment,
    x: number,
    baseline: number,
    transform: string,
  ): void {
    const { run, font } = fragment;
    const decoration =
      [run.underline && 'underline', run.strike && 'line-through']
        .filter(Boolean)
        .join(' ') || null;
    // super- and subscript sit off the line at two thirds of the size
    const raised = run.baseline !== 0;
    this.nodes.push({
      kind: 'text',
      text: fragment.text,
      x: round(x + fragment.x),
      y: round(baseline - (run.baseline / 100) * font.size),
      transform,
      fontFamily: ogeSlideFontFamily(font.family),
      fontSize: round(raised ? font.size * (2 / 3) : font.size),
      fontWeight: font.bold ? 'bold' : 'normal',
      fontStyle: font.italic ? 'italic' : 'normal',
      fill: colorPaint(run.color),
      decoration,
      link: safeLink(run.link),
    });
  }

  private rowHeights(
    table: OgeSlideTable,
    columns: readonly number[],
  ): number[] {
    return table.rows.map((row) => {
      let needed = pt(row.height);
      row.cells.forEach((cell, c) => {
        if (cell.merged || cell.rowSpan > 1) return;
        const width = columns
          .slice(c, c + cell.columnSpan)
          .reduce((sum, w) => sum + w, 0);
        const lines = ogeLayoutSlideText(cell.text, width, 0, this.measurer);
        const last = lines[lines.length - 1];
        if (last) {
          const first = lines[0];
          const content = last.top + last.height - first.top;
          needed = Math.max(
            needed,
            content + pt(cell.text.insets.top + cell.text.insets.bottom),
          );
        }
      });
      return needed;
    });
  }

  private table(table: OgeSlideTable): void {
    const columns = table.columns.map(pt);
    const heights = this.rowHeights(table, columns);
    const transform = this.rotation(table.frame);
    const xs = columns.reduce<number[]>(
      (all, w) => [...all, all[all.length - 1] + w],
      [0],
    );
    const ys = heights.reduce<number[]>(
      (all, h) => [...all, all[all.length - 1] + h],
      [0],
    );
    const borders: OgeSlideRenderNode[] = [];
    table.rows.forEach((row, r) => {
      row.cells.forEach((cell, c) => {
        if (cell.merged) return;
        const x = xs[c];
        const y = ys[r];
        const width = xs[c + cell.columnSpan] - x;
        const height = ys[r + cell.rowSpan] - y;
        const fill = this.paint(cell.fill);
        const local = `${transform} translate(${round(x)} ${round(y)})`;
        if (fill) {
          this.nodes.push({
            kind: 'path',
            d: ogeSlideGeometryPath('rect', width, height, {}),
            transform: local,
            fill,
            stroke: null,
            strokeWidth: 0,
            dash: null,
            cap: 'butt',
          });
        }
        this.text(cell.text, 0, 0, width, height, local);
        const edges: [OgeSlideLine | null, string][] = [
          [cell.borders.top, `M0 0 L${round(width)} 0`],
          [cell.borders.left, `M0 0 L0 ${round(height)}`],
          [
            cell.borders.bottom,
            `M0 ${round(height)} L${round(width)} ${round(height)}`,
          ],
          [
            cell.borders.right,
            `M${round(width)} 0 L${round(width)} ${round(height)}`,
          ],
        ];
        for (const [line, d] of edges) {
          if (line) {
            borders.push({
              kind: 'path',
              d,
              transform: local,
              fill: null,
              ...this.strokeOf(line),
            });
          }
        }
      });
    });
    this.nodes.push(...borders);
  }
}

/** Draws one slide: background, master and layout shapes, then its own. */
export function ogeRenderSlide(
  presentation: OgePresentation,
  slide: OgeSlide,
  measurer: OgeSlideTextMeasurer,
  options: OgeSlideRenderOptions,
): OgeSlideRender {
  const width = pt(presentation.width);
  const height = pt(presentation.height);
  const renderer = new SlideRenderer(measurer, options.idPrefix);
  renderer.background(slide.background, width, height);
  for (const element of slide.backdrop) renderer.element(element);
  for (const element of slide.elements) renderer.element(element);
  return {
    width,
    height,
    gradients: renderer.gradients,
    nodes: renderer.nodes,
  };
}
