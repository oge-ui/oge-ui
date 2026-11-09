/**
 * Preset shape outlines as SVG path data, in points inside a `w` × `h` box,
 * following the guide formulas of ECMA-376 `presetShapeDefinitions`. A preset
 * not listed here is reported by the reader and drawn as its bounding box.
 */

type Adjust = Readonly<Record<string, number>>;

/** Text rectangle of a preset, as insets from the box. */
export interface OgeSlideTextInsets {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

const polygon = (points: readonly (readonly [number, number])[]): string =>
  points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${round(x)} ${round(y)}`)
    .join(' ') + ' Z';

const round = (value: number): number => Math.round(value * 1000) / 1000;

const pin = (min: number, value: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const adj = (values: Adjust, name: string, fallback: number): number =>
  values[name] ?? fallback;

const PRESETS: Readonly<
  Record<string, (w: number, h: number, a: Adjust) => string>
> = {
  rect: (w, h) =>
    polygon([
      [0, 0],
      [w, 0],
      [w, h],
      [0, h],
    ]),
  roundRect: (w, h, a) => {
    const r = (Math.min(w, h) * pin(0, adj(a, 'adj', 16667), 50000)) / 100000;
    const c = round(r);
    return (
      `M0 ${c} A${c} ${c} 0 0 1 ${c} 0 L${round(w - r)} 0 ` +
      `A${c} ${c} 0 0 1 ${round(w)} ${c} L${round(w)} ${round(h - r)} ` +
      `A${c} ${c} 0 0 1 ${round(w - r)} ${round(h)} L${c} ${round(h)} ` +
      `A${c} ${c} 0 0 1 0 ${round(h - r)} Z`
    );
  },
  ellipse: (w, h) => {
    const rx = round(w / 2);
    const ry = round(h / 2);
    return (
      `M0 ${ry} A${rx} ${ry} 0 0 1 ${round(w)} ${ry} ` +
      `A${rx} ${ry} 0 0 1 0 ${ry} Z`
    );
  },
  triangle: (w, h, a) => {
    const x = (w * pin(0, adj(a, 'adj', 50000), 100000)) / 100000;
    return polygon([
      [0, h],
      [x, 0],
      [w, h],
    ]);
  },
  rtTriangle: (w, h) =>
    polygon([
      [0, h],
      [0, 0],
      [w, h],
    ]),
  diamond: (w, h) =>
    polygon([
      [0, h / 2],
      [w / 2, 0],
      [w, h / 2],
      [w / 2, h],
    ]),
  parallelogram: (w, h, a) => {
    const ss = Math.min(w, h);
    const x = (ss * pin(0, adj(a, 'adj', 25000), (100000 * w) / ss)) / 100000;
    return polygon([
      [0, h],
      [x, 0],
      [w, 0],
      [w - x, h],
    ]);
  },
  trapezoid: (w, h, a) => {
    const ss = Math.min(w, h);
    const x = (ss * pin(0, adj(a, 'adj', 25000), (50000 * w) / ss)) / 100000;
    return polygon([
      [0, h],
      [x, 0],
      [w - x, 0],
      [w, h],
    ]);
  },
  pentagon: (w, h, a) => {
    const hf = adj(a, 'hf', 105146) / 100000;
    const vf = adj(a, 'vf', 110557) / 100000;
    const swd2 = (w / 2) * hf;
    const shd2 = (h / 2) * vf;
    const svc = (h / 2) * vf;
    const rad = Math.PI / 180;
    const dx1 = Math.cos(18 * rad) * swd2;
    const dx2 = Math.cos(306 * rad) * swd2;
    const dy1 = Math.sin(18 * rad) * shd2;
    const dy2 = Math.sin(306 * rad) * shd2;
    const hc = w / 2;
    return polygon([
      [hc - dx1, svc - dy1],
      [hc, 0],
      [hc + dx1, svc - dy1],
      [hc + dx2, svc - dy2],
      [hc - dx2, svc - dy2],
    ]);
  },
  hexagon: (w, h, a) => {
    const ss = Math.min(w, h);
    const x = (ss * pin(0, adj(a, 'adj', 25000), (50000 * w) / ss)) / 100000;
    const vf = adj(a, 'vf', 115470) / 100000;
    const dy = Math.sin((60 * Math.PI) / 180) * (h / 2) * vf;
    return polygon([
      [0, h / 2],
      [x, h / 2 - dy],
      [w - x, h / 2 - dy],
      [w, h / 2],
      [w - x, h / 2 + dy],
      [x, h / 2 + dy],
    ]);
  },
  octagon: (w, h, a) => {
    const x = (Math.min(w, h) * pin(0, adj(a, 'adj', 29289), 50000)) / 100000;
    return polygon([
      [0, x],
      [x, 0],
      [w - x, 0],
      [w, x],
      [w, h - x],
      [w - x, h],
      [x, h],
      [0, h - x],
    ]);
  },
  homePlate: (w, h, a) => {
    const ss = Math.min(w, h);
    const x =
      w - (ss * pin(0, adj(a, 'adj', 50000), (100000 * w) / ss)) / 100000;
    return polygon([
      [0, 0],
      [x, 0],
      [w, h / 2],
      [x, h],
      [0, h],
    ]);
  },
  chevron: (w, h, a) => {
    const ss = Math.min(w, h);
    const x = (ss * pin(0, adj(a, 'adj', 50000), (100000 * w) / ss)) / 100000;
    return polygon([
      [0, 0],
      [w - x, 0],
      [w, h / 2],
      [w - x, h],
      [0, h],
      [x, h / 2],
    ]);
  },
  plus: (w, h, a) => {
    const x = (Math.min(w, h) * pin(0, adj(a, 'adj', 25000), 50000)) / 100000;
    return polygon([
      [0, x],
      [x, x],
      [x, 0],
      [w - x, 0],
      [w - x, x],
      [w, x],
      [w, h - x],
      [w - x, h - x],
      [w - x, h],
      [x, h],
      [x, h - x],
      [0, h - x],
    ]);
  },
  rightArrow: (w, h, a) => horizontalArrow(w, h, a, false),
  leftArrow: (w, h, a) => horizontalArrow(w, h, a, true),
  downArrow: (w, h, a) => verticalArrow(w, h, a, false),
  upArrow: (w, h, a) => verticalArrow(w, h, a, true),
  line: (w, h) => `M0 0 L${round(w)} ${round(h)}`,
  straightConnector1: (w, h) => `M0 0 L${round(w)} ${round(h)}`,
};

function horizontalArrow(
  w: number,
  h: number,
  a: Adjust,
  mirrored: boolean,
): string {
  const ss = Math.min(w, h);
  const half = (h * pin(0, adj(a, 'adj1', 50000), 100000)) / 200000;
  const head = (ss * pin(0, adj(a, 'adj2', 50000), (100000 * w) / ss)) / 100000;
  const x = (value: number): number => (mirrored ? w - value : value);
  const neck = w - head;
  return polygon([
    [x(0), h / 2 - half],
    [x(neck), h / 2 - half],
    [x(neck), 0],
    [x(w), h / 2],
    [x(neck), h],
    [x(neck), h / 2 + half],
    [x(0), h / 2 + half],
  ]);
}

function verticalArrow(
  w: number,
  h: number,
  a: Adjust,
  mirrored: boolean,
): string {
  const ss = Math.min(w, h);
  const half = (w * pin(0, adj(a, 'adj1', 50000), 100000)) / 200000;
  const head = (ss * pin(0, adj(a, 'adj2', 50000), (100000 * h) / ss)) / 100000;
  const y = (value: number): number => (mirrored ? h - value : value);
  const neck = h - head;
  return polygon([
    [w / 2 - half, y(0)],
    [w / 2 - half, y(neck)],
    [0, y(neck)],
    [w / 2, y(h)],
    [w, y(neck)],
    [w / 2 + half, y(neck)],
    [w / 2 + half, y(0)],
  ]);
}

/** Whether a preset has an outline here. */
export function ogeIsSlideGeometryDrawn(name: string): boolean {
  return name === 'custom' || Object.hasOwn(PRESETS, name);
}

/** A preset's outline; its bounding box when the preset is not known. */
export function ogeSlideGeometryPath(
  name: string,
  width: number,
  height: number,
  adjust: Adjust,
): string {
  const draw = Object.hasOwn(PRESETS, name) ? PRESETS[name] : PRESETS['rect'];
  return draw(width, height, adjust);
}

/** Whether a preset is open (a line): it has no fill. */
export function ogeIsSlideGeometryOpen(name: string): boolean {
  return name === 'line' || name === 'straightConnector1';
}

/** Where a preset's text goes, as insets from the box, in points. */
export function ogeSlideGeometryTextInsets(
  name: string,
  width: number,
  height: number,
  adjust: Adjust,
): OgeSlideTextInsets {
  if (name === 'ellipse') {
    const factor = (1 - Math.cos(Math.PI / 4)) / 2;
    const x = width * factor;
    const y = height * factor;
    return { left: x, top: y, right: x, bottom: y };
  }
  if (name === 'roundRect') {
    const r =
      (Math.min(width, height) * pin(0, adj(adjust, 'adj', 16667), 50000)) /
      100000;
    const inset = r * (1 - Math.cos(Math.PI / 4));
    return { left: inset, top: inset, right: inset, bottom: inset };
  }
  return { left: 0, top: 0, right: 0, bottom: 0 };
}
