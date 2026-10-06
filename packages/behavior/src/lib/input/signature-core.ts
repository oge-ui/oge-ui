import type { OgeReactiveCell, OgeReactivityAdapter } from '../reactivity';

/**
 * The signature pad's framework-free half (ADR 0001): the stroke model, the
 * smoothing and width math, undo history and the SVG export — everything
 * both render layers draw from. The canvas itself stays with the render
 * layer (it owns the element); this module never touches the DOM, so it is
 * unit-tested without one and runs during SSR.
 *
 * Points are stored **normalized** to the drawing surface (`0..1` on both
 * axes) with their timestamp, so a resized pad redraws the same signature
 * exactly, and the width of each segment follows the pen speed (fast
 * strokes thin out, slow ones thicken) between `minWidth` and `maxWidth`.
 */

/** Export format of the pad's value — a `data:` URL either way. */
export type OgeSignatureFormat = 'png' | 'svg';

/** How the signature is entered: drawn with a pointer, or typed as text. */
export type OgeSignatureMode = 'draw' | 'type';

/** One sampled pen position — normalized coordinates, time in ms. */
export interface OgeSignaturePoint {
  readonly x: number;
  readonly y: number;
  readonly t: number;
}

/** One pen-down → pen-up trace. */
export interface OgeSignatureStroke {
  readonly points: readonly OgeSignaturePoint[];
}

/** Pen geometry shared by the canvas renderer and the SVG export. */
export interface OgeSignaturePen {
  /** Thinnest segment width (px) — reached at high pen speed. */
  readonly minWidth: number;
  /** Thickest segment width (px) — reached when the pen moves slowly. */
  readonly maxWidth: number;
}

/** A drawable piece of a stroke: a quadratic curve and its width. */
export interface OgeSignatureSegment {
  /** Start point (px). */
  readonly x0: number;
  readonly y0: number;
  /** Quadratic control point (px). */
  readonly cx: number;
  readonly cy: number;
  /** End point (px). */
  readonly x1: number;
  readonly y1: number;
  /** Stroke width (px). */
  readonly width: number;
}

/** The geometry of one stroke in surface pixels. */
export type OgeSignatureStrokeGeometry =
  | {
      readonly kind: 'dot';
      readonly x: number;
      readonly y: number;
      readonly radius: number;
    }
  | {
      readonly kind: 'curve';
      readonly segments: readonly OgeSignatureSegment[];
    };

/** Surface size in CSS pixels. */
export interface OgeSignatureSize {
  readonly width: number;
  readonly height: number;
}

/** Points closer than this (normalized) to the previous one are dropped. */
const MIN_POINT_DISTANCE = 0.002;
/** Pen speed (px/ms) at which a segment reaches `minWidth`. */
const SPEED_FOR_MIN_WIDTH = 3;
/** Weight of the previous width — keeps the line from jittering. */
const WIDTH_SMOOTHING = 0.65;

const clamp01 = (value: number): number =>
  value < 0 ? 0 : value > 1 ? 1 : value;

/** Rounds to two decimals — the SVG export's precision. */
const r2 = (value: number): number => Math.round(value * 100) / 100;

/**
 * Normalizes a client position against the surface rectangle — the one
 * conversion every pointer sample goes through.
 */
export function ogeSignaturePointFrom(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  t: number,
): OgeSignaturePoint {
  const width = rect.width || 1;
  const height = rect.height || 1;
  return {
    x: clamp01((clientX - rect.left) / width),
    y: clamp01((clientY - rect.top) / height),
    t,
  };
}

/**
 * Per-point widths from the pen speed: fast → `minWidth`, still →
 * `maxWidth`, exponentially smoothed so one quick sample cannot snap the
 * line thin.
 */
export function ogeSignatureWidths(
  points: readonly OgeSignaturePoint[],
  size: OgeSignatureSize,
  pen: OgeSignaturePen,
): number[] {
  const min = Math.min(pen.minWidth, pen.maxWidth);
  const max = Math.max(pen.minWidth, pen.maxWidth);
  const widths: number[] = [];
  let previous = (min + max) / 2;
  for (let i = 0; i < points.length; i++) {
    if (i === 0) {
      widths.push(previous);
      continue;
    }
    const a = points[i - 1];
    const b = points[i];
    const distance = Math.hypot(
      (b.x - a.x) * size.width,
      (b.y - a.y) * size.height,
    );
    const elapsed = Math.max(1, b.t - a.t);
    const speed = distance / elapsed;
    const target = max - (max - min) * Math.min(1, speed / SPEED_FOR_MIN_WIDTH);
    previous = WIDTH_SMOOTHING * previous + (1 - WIDTH_SMOOTHING) * target;
    widths.push(previous);
  }
  return widths;
}

/**
 * The stroke as quadratic curves through the midpoints of its samples (the
 * classic smoothing: each sample is the control point between two
 * midpoints), each with its own width. A single sample is a dot.
 */
export function ogeSignatureGeometry(
  stroke: OgeSignatureStroke,
  size: OgeSignatureSize,
  pen: OgeSignaturePen,
): OgeSignatureStrokeGeometry | null {
  const points = stroke.points;
  if (points.length === 0) return null;
  const px = (p: OgeSignaturePoint) => p.x * size.width;
  const py = (p: OgeSignaturePoint) => p.y * size.height;
  const widths = ogeSignatureWidths(points, size, pen);
  if (points.length === 1) {
    return {
      kind: 'dot',
      x: px(points[0]),
      y: py(points[0]),
      radius: Math.max(pen.minWidth, pen.maxWidth) / 2,
    };
  }
  const segments: OgeSignatureSegment[] = [];
  let startX = px(points[0]);
  let startY = py(points[0]);
  for (let i = 1; i < points.length; i++) {
    const control = points[i - 1];
    const last = i === points.length - 1;
    const endX = last ? px(points[i]) : (px(control) + px(points[i])) / 2;
    const endY = last ? py(points[i]) : (py(control) + py(points[i])) / 2;
    // the first segment is a straight lead-in from the first sample
    const cx = i === 1 ? startX : px(control);
    const cy = i === 1 ? startY : py(control);
    segments.push({
      x0: startX,
      y0: startY,
      cx,
      cy,
      x1: endX,
      y1: endY,
      width: (widths[i - 1] + widths[i]) / 2,
    });
    startX = endX;
    startY = endY;
  }
  return { kind: 'curve', segments };
}

/** The structural slice of a 2D canvas context the renderer calls. */
export interface OgeSignatureCanvasContext {
  fillStyle: unknown;
  strokeStyle: unknown;
  lineWidth: number;
  lineCap: string;
  lineJoin: string;
  font: string;
  textBaseline: string;
  textAlign: string;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  quadraticCurveTo(cx: number, cy: number, x: number, y: number): void;
  arc(x: number, y: number, r: number, start: number, end: number): void;
  stroke(): void;
  fill(): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  clearRect(x: number, y: number, w: number, h: number): void;
  fillText(text: string, x: number, y: number, maxWidth?: number): void;
}

/** Draws one stroke onto a canvas context (in CSS pixels). */
export function drawOgeSignatureStroke(
  ctx: OgeSignatureCanvasContext,
  stroke: OgeSignatureStroke,
  size: OgeSignatureSize,
  pen: OgeSignaturePen,
  color: string,
): void {
  const geometry = ogeSignatureGeometry(stroke, size, pen);
  if (!geometry) return;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (geometry.kind === 'dot') {
    ctx.beginPath();
    ctx.arc(geometry.x, geometry.y, geometry.radius, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  for (const segment of geometry.segments) {
    ctx.beginPath();
    ctx.lineWidth = segment.width;
    ctx.moveTo(segment.x0, segment.y0);
    ctx.quadraticCurveTo(segment.cx, segment.cy, segment.x1, segment.y1);
    ctx.stroke();
  }
}

/** Options of {@link renderOgeSignature} and {@link buildOgeSignatureSvg}. */
export interface OgeSignatureRenderOptions extends OgeSignaturePen {
  readonly size: OgeSignatureSize;
  /** Ink colour (any CSS colour). */
  readonly color: string;
  /** Background fill; `null`/`undefined` = transparent. */
  readonly background?: string | null;
  /** Typed-signature text — rendered instead of the strokes when non-empty. */
  readonly typedText?: string;
  /** Font family of the typed signature. */
  readonly fontFamily?: string;
}

/** Font size (px) of a typed signature on a surface of `height`. */
export function ogeSignatureFontSize(size: OgeSignatureSize): number {
  return Math.max(12, Math.round(size.height * 0.42));
}

/** Clears and repaints the whole surface — strokes or the typed text. */
export function renderOgeSignature(
  ctx: OgeSignatureCanvasContext,
  strokes: readonly OgeSignatureStroke[],
  options: OgeSignatureRenderOptions,
): void {
  const { size } = options;
  ctx.clearRect(0, 0, size.width, size.height);
  if (options.background) {
    ctx.fillStyle = options.background;
    ctx.fillRect(0, 0, size.width, size.height);
  }
  const typed = options.typedText?.trim() ?? '';
  if (typed) {
    ctx.fillStyle = options.color;
    ctx.font = `${ogeSignatureFontSize(size)}px ${options.fontFamily ?? 'cursive'}`;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'center';
    ctx.fillText(
      typed,
      size.width / 2,
      size.height * TYPED_BASELINE,
      size.width * 0.92,
    );
    return;
  }
  for (const stroke of strokes) {
    drawOgeSignatureStroke(ctx, stroke, size, options, options.color);
  }
}

/** Vertical position of the typed text's baseline (share of the height). */
const TYPED_BASELINE = 0.68;

const escapeXml = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** The metadata the SVG export embeds so a stored signature round-trips. */
export interface OgeSignatureData {
  readonly strokes: readonly OgeSignatureStroke[];
  readonly typedText: string;
}

/**
 * The signature as a standalone SVG document. Strokes become one `<path>`
 * per segment (each with its own width, round caps); a typed signature
 * becomes a `<text>`. The normalized strokes ride along in a `<metadata>`
 * element, so {@link parseOgeSignatureSvg} can restore an editable pad
 * from a stored value.
 */
export function buildOgeSignatureSvg(
  strokes: readonly OgeSignatureStroke[],
  options: OgeSignatureRenderOptions,
): string {
  const { size } = options;
  const w = r2(size.width);
  const h = r2(size.height);
  const color = escapeXml(options.color);
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`,
  ];
  const typed = options.typedText?.trim() ?? '';
  const data: OgeSignatureData = {
    strokes: typed
      ? []
      : strokes.map((stroke) => ({
          points: stroke.points.map((p) => ({
            x: Math.round(p.x * 10000) / 10000,
            y: Math.round(p.y * 10000) / 10000,
            t: Math.round(p.t),
          })),
        })),
    typedText: typed,
  };
  parts.push(
    `<metadata id="oge-signature">${escapeXml(JSON.stringify(data))}</metadata>`,
  );
  if (options.background) {
    parts.push(
      `<rect width="100%" height="100%" fill="${escapeXml(options.background)}"/>`,
    );
  }
  if (typed) {
    parts.push(
      `<text x="${r2(size.width / 2)}" y="${r2(size.height * TYPED_BASELINE)}" text-anchor="middle" font-size="${ogeSignatureFontSize(size)}" font-family="${escapeXml(options.fontFamily ?? 'cursive')}" fill="${color}">${escapeXml(typed)}</text>`,
    );
  } else {
    parts.push(
      `<g fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round">`,
    );
    for (const stroke of strokes) {
      const geometry = ogeSignatureGeometry(stroke, size, options);
      if (!geometry) continue;
      if (geometry.kind === 'dot') {
        parts.push(
          `<circle cx="${r2(geometry.x)}" cy="${r2(geometry.y)}" r="${r2(geometry.radius)}" fill="${color}" stroke="none"/>`,
        );
        continue;
      }
      for (const s of geometry.segments) {
        parts.push(
          `<path d="M${r2(s.x0)} ${r2(s.y0)}Q${r2(s.cx)} ${r2(s.cy)} ${r2(s.x1)} ${r2(s.y1)}" stroke-width="${r2(s.width)}"/>`,
        );
      }
    }
    parts.push('</g>');
  }
  parts.push('</svg>');
  return parts.join('');
}

/** UTF-8-safe base64 (`btoa` alone rejects non-Latin-1 text). */
function base64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decodeBase64Utf8(base64: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/** Wraps an SVG document as a base64 `data:image/svg+xml` URL. */
export function ogeSvgDataUrl(svg: string): string {
  return `data:image/svg+xml;base64,${base64Utf8(svg)}`;
}

const SVG_DATA_URL = /^data:image\/svg\+xml(;charset=[^;,]+)?(;base64)?,/i;

const isPoint = (value: unknown): value is OgeSignaturePoint => {
  if (typeof value !== 'object' || value === null) return false;
  const { x, y, t } = value as Record<string, unknown>;
  return (
    typeof x === 'number' &&
    typeof y === 'number' &&
    typeof t === 'number' &&
    Number.isFinite(x) &&
    Number.isFinite(y) &&
    Number.isFinite(t)
  );
};

/**
 * Restores the strokes / typed text from an SVG value the pad exported
 * (its `<metadata id="oge-signature">`). Untrusted input: anything that is
 * not that exact shape — another SVG, malformed JSON, non-numeric points —
 * returns `null`, never throws. Coordinates are clamped to the surface.
 */
export function parseOgeSignatureSvg(
  value: string | null | undefined,
): OgeSignatureData | null {
  if (typeof value !== 'string') return null;
  const match = SVG_DATA_URL.exec(value);
  if (!match) return null;
  let svg: string;
  try {
    const payload = value.slice(match[0].length);
    svg = match[2] ? decodeBase64Utf8(payload) : decodeURIComponent(payload);
  } catch {
    return null;
  }
  const meta = /<metadata id="oge-signature">([\s\S]*?)<\/metadata>/.exec(svg);
  if (!meta) return null;
  const json = meta[1]
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const { strokes, typedText } = parsed as Record<string, unknown>;
  if (!Array.isArray(strokes)) return null;
  const restored: OgeSignatureStroke[] = [];
  for (const stroke of strokes) {
    const points = (stroke as { points?: unknown } | null)?.points;
    if (!Array.isArray(points) || !points.every(isPoint)) return null;
    restored.push({
      points: points.map((p) => ({ x: clamp01(p.x), y: clamp01(p.y), t: p.t })),
    });
  }
  return {
    strokes: restored,
    typedText: typeof typedText === 'string' ? typedText : '',
  };
}

/** Payload of the pad's `strokeEnded` event. */
export interface OgeSignatureStrokeEvent {
  /** The stroke that was just committed. */
  readonly stroke: OgeSignatureStroke;
  /** Strokes on the pad after this one. */
  readonly strokeCount: number;
  /** The originating pointer event. */
  readonly event: Event | undefined;
}

/**
 * The stroke model + undo history both render layers run. Strokes live in
 * a reactive cell (the layers re-render the toolbar from it); the stroke in
 * progress does not — it is drawn incrementally by the render layer and
 * only committed by {@link endStroke}.
 */
export class OgeSignatureCore {
  /** Committed strokes, oldest first. */
  readonly strokes: OgeReactiveCell<readonly OgeSignatureStroke[]>;
  /** The typed-signature text (`mode: 'type'`). */
  readonly typedText: OgeReactiveCell<string>;
  /** No committed stroke. */
  readonly hasStrokes: () => boolean;

  private active: OgeSignaturePoint[] | null = null;

  constructor(rx: OgeReactivityAdapter) {
    this.strokes = rx.cell<readonly OgeSignatureStroke[]>([]);
    this.typedText = rx.cell('');
    this.hasStrokes = rx.derived(() => this.strokes().length > 0);
  }

  /** True while a stroke is being drawn. */
  get drawing(): boolean {
    return this.active !== null;
  }

  /** The points of the stroke in progress (empty when none). */
  activePoints(): readonly OgeSignaturePoint[] {
    return this.active ?? [];
  }

  /** Starts a stroke at `point`. */
  beginStroke(point: OgeSignaturePoint): void {
    this.active = [point];
  }

  /**
   * Adds a sample to the stroke in progress; returns `false` when it was
   * too close to the previous one to matter (nothing to draw).
   */
  addPoint(point: OgeSignaturePoint): boolean {
    const points = this.active;
    if (!points) return false;
    const last = points[points.length - 1];
    if (Math.hypot(point.x - last.x, point.y - last.y) < MIN_POINT_DISTANCE) {
      return false;
    }
    points.push(point);
    return true;
  }

  /** Commits the stroke in progress; `null` when none was active. */
  endStroke(): OgeSignatureStroke | null {
    const points = this.active;
    this.active = null;
    if (!points || points.length === 0) return null;
    const stroke: OgeSignatureStroke = { points };
    this.strokes.set([...this.strokes(), stroke]);
    return stroke;
  }

  /** Drops the stroke in progress (Escape, pointercancel). */
  cancelStroke(): void {
    this.active = null;
  }

  /** Removes the last stroke; `false` when there was none. */
  undo(): boolean {
    const strokes = this.strokes();
    if (strokes.length === 0) return false;
    this.strokes.set(strokes.slice(0, -1));
    return true;
  }

  /** Removes every stroke and the typed text. */
  clear(): void {
    this.active = null;
    if (this.strokes().length > 0) this.strokes.set([]);
    if (this.typedText() !== '') this.typedText.set('');
  }

  /** Replaces the whole model (a restored SVG value). */
  restore(data: OgeSignatureData): void {
    this.active = null;
    this.strokes.set(data.strokes);
    this.typedText.set(data.typedText);
  }

  /** Nothing to export in `mode`. */
  isEmpty(mode: OgeSignatureMode): boolean {
    return mode === 'type'
      ? this.typedText().trim() === ''
      : this.strokes().length === 0;
  }
}
