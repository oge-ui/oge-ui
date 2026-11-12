/**
 * The rest of the preset outlines the suite draws, checked cell by cell
 * against PowerPoint's own picture of a preset gallery. SVG path data, in
 * points inside a `w` × `h` box.
 */

type Adjust = Readonly<Record<string, number>>;
type Preset = (w: number, h: number, a: Adjust) => string;

const n = (value: number): number => Math.round(value * 1000) / 1000;
const pin = (min: number, value: number, max: number): number =>
  Math.min(max, Math.max(min, value));
const adj = (a: Adjust, name: string, fallback: number): number =>
  a[name] ?? fallback;

const poly = (points: readonly (readonly [number, number])[]): string =>
  points.map(([x, y], i) => `${i ? 'L' : 'M'}${n(x)} ${n(y)}`).join(' ') + ' Z';

const open = (points: readonly (readonly [number, number])[]): string =>
  points.map(([x, y], i) => `${i ? 'L' : 'M'}${n(x)} ${n(y)}`).join(' ');

/** A star with its first tip straight up; `ratio` is inner over outer radius. */
function star(
  w: number,
  h: number,
  tips: number,
  ratio: number,
  hf = 1,
  vf = 1,
): string {
  const rx = (w / 2) * hf;
  const ry = (h / 2) * vf;
  const cy = (h / 2) * vf;
  const points: [number, number][] = [];
  for (let i = 0; i < tips * 2; i++) {
    const radians = -Math.PI / 2 + (i * Math.PI) / tips;
    const r = i % 2 ? ratio : 1;
    points.push([
      w / 2 + rx * r * Math.cos(radians),
      cy + ry * r * Math.sin(radians),
    ]);
  }
  return poly(points);
}

/** A rectangle with a radius (positive) or a snip (negative) at each corner. */
function corners(
  w: number,
  h: number,
  tl: number,
  tr: number,
  br: number,
  bl: number,
): string {
  const arc = (r: number, x: number, y: number): string =>
    r > 0 ? `A${n(r)} ${n(r)} 0 0 1 ${n(x)} ${n(y)}` : `L${n(x)} ${n(y)}`;
  const t = Math.abs(tl);
  const u = Math.abs(tr);
  const v = Math.abs(br);
  const b = Math.abs(bl);
  return [
    `M0 ${n(t)}`,
    arc(tl, t, 0),
    `L${n(w - u)} 0`,
    arc(tr, w, u),
    `L${n(w)} ${n(h - v)}`,
    arc(br, w - v, h),
    `L${n(b)} ${n(h)}`,
    arc(bl, 0, h - b),
    'Z',
  ].join(' ');
}

const ellipse = (cx: number, cy: number, rx: number, ry: number): string =>
  `M${n(cx - rx)} ${n(cy)} A${n(rx)} ${n(ry)} 0 0 1 ${n(cx + rx)} ${n(cy)} ` +
  `A${n(rx)} ${n(ry)} 0 0 1 ${n(cx - rx)} ${n(cy)} Z`;

/** A callout's outline: its body with the pointer let into one edge. */
function wedge(w: number, h: number, a: Adjust, radius: number): string {
  const tipX = w / 2 + (w * adj(a, 'adj1', -20833)) / 100000;
  const tipY = h / 2 + (h * adj(a, 'adj2', 62500)) / 100000;
  const r = radius;
  const c = n(r);
  const arc = (x: number, y: number): string =>
    r > 0 ? `A${c} ${c} 0 0 1 ${n(x)} ${n(y)}` : `L${n(x)} ${n(y)}`;
  const line = (x: number, y: number): string => `L${n(x)} ${n(y)}`;
  const xa = (w * (tipX < w / 2 ? 2 : 7)) / 12;
  const xb = xa + w / 4;
  const ya = (h * (tipY < h / 2 ? 2 : 7)) / 12;
  const yb = ya + h / 4;
  const tip = line(tipX, tipY);
  const dx = (tipX - w / 2) / w;
  const dy = (tipY - h / 2) / h;
  const horizontal = Math.abs(dx) > Math.abs(dy);
  const top = !horizontal && dy < 0 ? [line(xa, 0), tip, line(xb, 0)] : [];
  const right = horizontal && dx > 0 ? [line(w, ya), tip, line(w, yb)] : [];
  const bottom = !horizontal && dy > 0 ? [line(xb, h), tip, line(xa, h)] : [];
  const left = horizontal && dx < 0 ? [line(0, yb), tip, line(0, ya)] : [];
  return [
    `M0 ${c}`,
    arc(r, 0),
    ...top,
    line(w - r, 0),
    arc(w, r),
    ...right,
    line(w, h - r),
    arc(w - r, h),
    ...bottom,
    line(r, h),
    arc(0, h - r),
    ...left,
    'Z',
  ].join(' ');
}

export const OGE_MORE_SLIDE_PRESETS: Readonly<Record<string, Preset>> = {
  star4: (w, h, a) =>
    star(w, h, 4, pin(0, adj(a, 'adj', 12500), 50000) / 50000),
  star5: (w, h, a) =>
    star(
      w,
      h,
      5,
      pin(0, adj(a, 'adj', 19098), 50000) / 50000,
      adj(a, 'hf', 105146) / 100000,
      adj(a, 'vf', 110557) / 100000,
    ),
  star8: (w, h, a) =>
    star(w, h, 8, pin(0, adj(a, 'adj', 37500), 50000) / 50000),
  star16: (w, h, a) =>
    star(w, h, 16, pin(0, adj(a, 'adj', 37500), 50000) / 50000),
  star24: (w, h, a) =>
    star(w, h, 24, pin(0, adj(a, 'adj', 37500), 50000) / 50000),
  star32: (w, h, a) =>
    star(w, h, 32, pin(0, adj(a, 'adj', 37500), 50000) / 50000),

  flowChartProcess: (w, h) =>
    poly([
      [0, 0],
      [w, 0],
      [w, h],
      [0, h],
    ]),
  flowChartDecision: (w, h) =>
    poly([
      [0, h / 2],
      [w / 2, 0],
      [w, h / 2],
      [w / 2, h],
    ]),
  flowChartInputOutput: (w, h) =>
    poly([
      [0, h],
      [w / 5, 0],
      [w, 0],
      [(w * 4) / 5, h],
    ]),
  flowChartPreparation: (w, h) =>
    poly([
      [0, h / 2],
      [w / 5, 0],
      [(w * 4) / 5, 0],
      [w, h / 2],
      [(w * 4) / 5, h],
      [w / 5, h],
    ]),
  flowChartManualOperation: (w, h) =>
    poly([
      [0, 0],
      [w, 0],
      [(w * 4) / 5, h],
      [w / 5, h],
    ]),
  flowChartOffpageConnector: (w, h) =>
    poly([
      [0, 0],
      [w, 0],
      [w, (h * 4) / 5],
      [w / 2, h],
      [0, (h * 4) / 5],
    ]),
  flowChartConnector: (w, h) => ellipse(w / 2, h / 2, w / 2, h / 2),
  flowChartTerminator: (w, h) => {
    const rx = (w * 3475) / 21600;
    const ry = h / 2;
    return (
      `M${n(rx)} 0 L${n(w - rx)} 0 A${n(rx)} ${n(ry)} 0 0 1 ${n(w - rx)} ${n(h)} ` +
      `L${n(rx)} ${n(h)} A${n(rx)} ${n(ry)} 0 0 1 ${n(rx)} 0 Z`
    );
  },
  flowChartAlternateProcess: (w, h) => {
    const r = Math.min(w, h) / 6;
    return corners(w, h, r, r, r, r);
  },
  flowChartPredefinedProcess: (w, h) =>
    poly([
      [0, 0],
      [w, 0],
      [w, h],
      [0, h],
    ]) +
    ` M${n(w / 8)} 0 L${n(w / 8)} ${n(h)} M${n((w * 7) / 8)} 0 L${n((w * 7) / 8)} ${n(h)}`,

  // the rest of the flowchart set, from the DrawingML preset definitions and
  // checked against Excel's own picture of them (testing/corpus/shapes.Gallery.png)
  flowChartInternalStorage: (w, h) =>
    poly([
      [0, 0],
      [w, 0],
      [w, h],
      [0, h],
    ]) +
    ` M${n(w / 8)} 0 L${n(w / 8)} ${n(h)} M0 ${n(h / 8)} L${n(w)} ${n(h / 8)}`,
  flowChartDocument: (w, h) => {
    const x = (v: number) => n((w * v) / 21600);
    const y = (v: number) => n((h * v) / 21600);
    return `M0 0 L${n(w)} 0 L${n(w)} ${y(17322)} C${x(10800)} ${y(17322)} ${x(10800)} ${y(23922)} 0 ${y(20172)} Z`;
  },
  flowChartMultidocument: (w, h) => {
    const x = (v: number) => n((w * v) / 21600);
    const y = (v: number) => n((h * v) / 21600);
    return (
      `M${x(2972)} ${y(1815)} L${x(2972)} 0 L${n(w)} 0 L${n(w)} ${y(14392)} ` +
      `C${x(20800)} ${y(14392)} ${x(20000)} ${y(14467)} ${x(20000)} ${y(14467)} L${x(20000)} ${y(1815)} Z ` +
      `M${x(1532)} ${y(3675)} L${x(1532)} ${y(1815)} L${x(20000)} ${y(1815)} L${x(20000)} ${y(16252)} ` +
      `C${x(19298)} ${y(16252)} ${x(18595)} ${y(16352)} ${x(18595)} ${y(16352)} L${x(18595)} ${y(3675)} Z ` +
      `M0 ${y(3675)} L${x(18595)} ${y(3675)} L${x(18595)} ${y(18022)} ` +
      `C${x(9298)} ${y(18022)} ${x(9298)} ${y(23542)} 0 ${y(20782)} Z`
    );
  },
  flowChartManualInput: (w, h) =>
    poly([
      [0, h / 5],
      [w, 0],
      [w, h],
      [0, h],
    ]),
  flowChartPunchedCard: (w, h) =>
    poly([
      [0, h / 5],
      [w / 5, 0],
      [w, 0],
      [w, h],
      [0, h],
    ]),
  flowChartPunchedTape: (w, h) => {
    const rx = n(w / 4);
    const ry = n(h / 10);
    return (
      `M0 ${n(h / 10)} A${rx} ${ry} 0 0 0 ${n(w / 2)} ${n(h / 10)} ` +
      `A${rx} ${ry} 0 0 1 ${n(w)} ${n(h / 10)} L${n(w)} ${n((h * 9) / 10)} ` +
      `A${rx} ${ry} 0 0 0 ${n(w / 2)} ${n((h * 9) / 10)} ` +
      `A${rx} ${ry} 0 0 1 0 ${n((h * 9) / 10)} Z`
    );
  },
  flowChartSummingJunction: (w, h) => {
    const dx = (w / 2) * Math.SQRT1_2;
    const dy = (h / 2) * Math.SQRT1_2;
    return (
      ellipse(w / 2, h / 2, w / 2, h / 2) +
      ` M${n(w / 2 - dx)} ${n(h / 2 - dy)} L${n(w / 2 + dx)} ${n(h / 2 + dy)}` +
      ` M${n(w / 2 + dx)} ${n(h / 2 - dy)} L${n(w / 2 - dx)} ${n(h / 2 + dy)}`
    );
  },
  flowChartOr: (w, h) =>
    ellipse(w / 2, h / 2, w / 2, h / 2) +
    ` M${n(w / 2)} 0 L${n(w / 2)} ${n(h)} M0 ${n(h / 2)} L${n(w)} ${n(h / 2)}`,
  flowChartCollate: (w, h) =>
    poly([
      [0, 0],
      [w, 0],
      [w / 2, h / 2],
      [w, h],
      [0, h],
      [w / 2, h / 2],
    ]),
  flowChartSort: (w, h) =>
    poly([
      [0, h / 2],
      [w / 2, 0],
      [w, h / 2],
      [w / 2, h],
    ]) + ` M0 ${n(h / 2)} L${n(w)} ${n(h / 2)}`,
  flowChartExtract: (w, h) =>
    poly([
      [0, h],
      [w / 2, 0],
      [w, h],
    ]),
  flowChartMerge: (w, h) =>
    poly([
      [0, 0],
      [w, 0],
      [w / 2, h],
    ]),
  flowChartOnlineStorage: (w, h) => {
    const rx = n(w / 6);
    const ry = n(h / 2);
    return (
      `M${rx} 0 L${n(w)} 0 A${rx} ${ry} 0 0 0 ${n(w)} ${n(h)} ` +
      `L${rx} ${n(h)} A${rx} ${ry} 0 0 1 ${rx} 0 Z`
    );
  },
  flowChartDelay: (w, h) =>
    `M0 0 L${n(w / 2)} 0 A${n(w / 2)} ${n(h / 2)} 0 0 1 ${n(w / 2)} ${n(h)} L0 ${n(h)} Z`,
  flowChartMagneticTape: (w, h) => {
    const rx = w / 2;
    const ry = h / 2;
    const angle = Math.atan2(h, w);
    const ex = rx + rx * Math.cos(angle);
    const ey = ry + ry * Math.sin(angle);
    return (
      `M${n(rx)} ${n(h)} A${n(rx)} ${n(ry)} 0 0 1 ${n(rx)} 0 ` +
      `A${n(rx)} ${n(ry)} 0 0 1 ${n(w)} ${n(ry)} ` +
      `A${n(rx)} ${n(ry)} 0 0 1 ${n(ex)} ${n(ey)} L${n(w)} ${n(ey)} L${n(w)} ${n(h)} Z`
    );
  },
  // the lid's front edge runs the outline's way round, so the fill stays whole
  flowChartMagneticDisk: (w, h) => {
    const ry = n(h / 6);
    const rx = n(w / 2);
    return (
      `M0 ${ry} A${rx} ${ry} 0 0 1 ${n(w)} ${ry} L${n(w)} ${n(h - h / 6)} ` +
      `A${rx} ${ry} 0 0 1 0 ${n(h - h / 6)} Z M${n(w)} ${ry} A${rx} ${ry} 0 0 1 0 ${ry}`
    );
  },
  flowChartMagneticDrum: (w, h) => {
    const rx = n(w / 6);
    const ry = n(h / 2);
    return (
      `M${rx} 0 L${n(w - w / 6)} 0 A${rx} ${ry} 0 0 1 ${n(w - w / 6)} ${n(h)} ` +
      `L${rx} ${n(h)} A${rx} ${ry} 0 0 1 ${rx} 0 Z M${n(w - w / 6)} ${n(h)} A${rx} ${ry} 0 0 1 ${n(w - w / 6)} 0`
    );
  },
  flowChartDisplay: (w, h) =>
    `M0 ${n(h / 2)} L${n(w / 6)} 0 L${n((w * 5) / 6)} 0 ` +
    `A${n(w / 6)} ${n(h / 2)} 0 0 1 ${n((w * 5) / 6)} ${n(h)} L${n(w / 6)} ${n(h)} Z`,

  round1Rect: (w, h, a) => {
    const r = (Math.min(w, h) * pin(0, adj(a, 'adj', 16667), 50000)) / 100000;
    return corners(w, h, 0, r, 0, 0);
  },
  round2SameRect: (w, h, a) => {
    const ss = Math.min(w, h);
    const r1 = (ss * pin(0, adj(a, 'adj1', 16667), 50000)) / 100000;
    const r2 = (ss * pin(0, adj(a, 'adj2', 0), 50000)) / 100000;
    return corners(w, h, r1, r1, r2, r2);
  },
  round2DiagRect: (w, h, a) => {
    const ss = Math.min(w, h);
    const r1 = (ss * pin(0, adj(a, 'adj1', 16667), 50000)) / 100000;
    const r2 = (ss * pin(0, adj(a, 'adj2', 0), 50000)) / 100000;
    return corners(w, h, r1, r2, r1, r2);
  },
  snip1Rect: (w, h, a) => {
    const r = (Math.min(w, h) * pin(0, adj(a, 'adj', 16667), 50000)) / 100000;
    return corners(w, h, 0, -r, 0, 0);
  },
  snip2SameRect: (w, h, a) => {
    const ss = Math.min(w, h);
    const r1 = (ss * pin(0, adj(a, 'adj1', 16667), 50000)) / 100000;
    const r2 = (ss * pin(0, adj(a, 'adj2', 0), 50000)) / 100000;
    return corners(w, h, -r1, -r1, -r2, -r2);
  },
  snip2DiagRect: (w, h, a) => {
    const ss = Math.min(w, h);
    const r1 = (ss * pin(0, adj(a, 'adj1', 0), 50000)) / 100000;
    const r2 = (ss * pin(0, adj(a, 'adj2', 16667), 50000)) / 100000;
    return corners(w, h, -r1, -r2, -r1, -r2);
  },

  frame: (w, h, a) => {
    const t = (Math.min(w, h) * pin(0, adj(a, 'adj1', 12500), 50000)) / 100000;
    return (
      poly([
        [0, 0],
        [w, 0],
        [w, h],
        [0, h],
      ]) +
      ' ' +
      poly([
        [t, t],
        [t, h - t],
        [w - t, h - t],
        [w - t, t],
      ])
    );
  },
  donut: (w, h, a) => {
    const t = (Math.min(w, h) * pin(0, adj(a, 'adj', 25000), 50000)) / 100000;
    const irx = w / 2 - t;
    const iry = h / 2 - t;
    return (
      ellipse(w / 2, h / 2, w / 2, h / 2) +
      ` M${n(t)} ${n(h / 2)} A${n(irx)} ${n(iry)} 0 0 0 ${n(w - t)} ${n(h / 2)} ` +
      `A${n(irx)} ${n(iry)} 0 0 0 ${n(t)} ${n(h / 2)} Z`
    );
  },
  corner: (w, h, a) => {
    const ss = Math.min(w, h);
    const y = h - (ss * pin(0, adj(a, 'adj1', 50000), 100000)) / 100000;
    const x = (ss * pin(0, adj(a, 'adj2', 50000), 100000)) / 100000;
    return poly([
      [0, 0],
      [x, 0],
      [x, y],
      [w, y],
      [w, h],
      [0, h],
    ]);
  },
  diagStripe: (w, h, a) => {
    const v = pin(0, adj(a, 'adj', 50000), 100000) / 100000;
    return poly([
      [0, h * v],
      [w * v, 0],
      [w, 0],
      [0, h],
    ]);
  },
  plaque: (w, h, a) => {
    const r = (Math.min(w, h) * pin(0, adj(a, 'adj', 16667), 50000)) / 100000;
    const c = n(r);
    return (
      `M0 ${c} A${c} ${c} 0 0 0 ${c} 0 L${n(w - r)} 0 A${c} ${c} 0 0 0 ${n(w)} ${c} ` +
      `L${n(w)} ${n(h - r)} A${c} ${c} 0 0 0 ${n(w - r)} ${n(h)} L${c} ${n(h)} ` +
      `A${c} ${c} 0 0 0 0 ${n(h - r)} Z`
    );
  },
  can: (w, h, a) => {
    const ss = Math.min(w, h);
    const lid = (ss * pin(0, adj(a, 'adj', 25000), (50000 * h) / ss)) / 200000;
    const rx = n(w / 2);
    const ry = n(lid);
    return (
      `M0 ${ry} A${rx} ${ry} 0 0 1 ${n(w)} ${ry} L${n(w)} ${n(h - lid)} ` +
      `A${rx} ${ry} 0 0 1 0 ${n(h - lid)} Z`
    );
  },
  cube: (w, h, a) => {
    const d = (Math.min(w, h) * pin(0, adj(a, 'adj', 25000), 100000)) / 100000;
    return poly([
      [0, d],
      [d, 0],
      [w, 0],
      [w, h - d],
      [w - d, h],
      [0, h],
    ]);
  },
  foldedCorner: (w, h, a) => {
    const d = (Math.min(w, h) * pin(0, adj(a, 'adj', 16667), 50000)) / 100000;

    return poly([
      [0, 0],
      [w, 0],
      [w, h - d],
      [w - d, h],
      [0, h],
    ]);
  },

  leftRightArrow: (w, h, a) => {
    const ss = Math.min(w, h);
    const half = (h * pin(0, adj(a, 'adj1', 50000), 100000)) / 200000;
    const head =
      (ss * pin(0, adj(a, 'adj2', 50000), (50000 * w) / ss)) / 100000;
    return poly([
      [0, h / 2],
      [head, 0],
      [head, h / 2 - half],
      [w - head, h / 2 - half],
      [w - head, 0],
      [w, h / 2],
      [w - head, h],
      [w - head, h / 2 + half],
      [head, h / 2 + half],
      [head, h],
    ]);
  },
  upDownArrow: (w, h, a) => {
    const ss = Math.min(w, h);
    const half = (w * pin(0, adj(a, 'adj1', 50000), 100000)) / 200000;
    const head =
      (ss * pin(0, adj(a, 'adj2', 50000), (50000 * h) / ss)) / 100000;
    return poly([
      [w / 2, 0],
      [w, head],
      [w / 2 + half, head],
      [w / 2 + half, h - head],
      [w, h - head],
      [w / 2, h],
      [0, h - head],
      [w / 2 - half, h - head],
      [w / 2 - half, head],
      [0, head],
    ]);
  },
  notchedRightArrow: (w, h, a) => {
    const ss = Math.min(w, h);
    const half = (h * pin(0, adj(a, 'adj1', 50000), 100000)) / 200000;
    const head =
      (ss * pin(0, adj(a, 'adj2', 50000), (100000 * w) / ss)) / 100000;
    const notch = (half * head) / (h / 2);
    return poly([
      [0, h / 2 - half],
      [w - head, h / 2 - half],
      [w - head, 0],
      [w, h / 2],
      [w - head, h],
      [w - head, h / 2 + half],
      [0, h / 2 + half],
      [notch, h / 2],
    ]);
  },

  wedgeRectCallout: (w, h, a) => wedge(w, h, a, 0),
  wedgeRoundRectCallout: (w, h, a) => {
    const r = (Math.min(w, h) * adj(a, 'adj3', 16667)) / 100000;
    return wedge(w, h, a, r);
  },

  leftBracket: (w, h, a) => {
    const r = n((Math.min(w, h) * adj(a, 'adj', 8333)) / 100000);
    return `M${n(w)} ${n(h)} A${n(w)} ${r} 0 0 1 0 ${n(h - r)} L0 ${r} A${n(w)} ${r} 0 0 1 ${n(w)} 0`;
  },
  rightBracket: (w, h, a) => {
    const r = n((Math.min(w, h) * adj(a, 'adj', 8333)) / 100000);
    return `M0 0 A${n(w)} ${r} 0 0 1 ${n(w)} ${r} L${n(w)} ${n(h - r)} A${n(w)} ${r} 0 0 1 0 ${n(h)}`;
  },

  bentConnector2: (w, h) =>
    open([
      [0, 0],
      [w, 0],
      [w, h],
    ]),
  bentConnector3: (w, h, a) => {
    const x = (w * adj(a, 'adj1', 50000)) / 100000;
    return open([
      [0, 0],
      [x, 0],
      [x, h],
      [w, h],
    ]);
  },
  bentConnector4: (w, h, a) => {
    const x = (w * adj(a, 'adj1', 50000)) / 100000;
    const y = (h * adj(a, 'adj2', 50000)) / 100000;
    return open([
      [0, 0],
      [x, 0],
      [x, y],
      [w, y],
      [w, h],
    ]);
  },
  bentConnector5: (w, h, a) => {
    const x1 = (w * adj(a, 'adj1', 50000)) / 100000;
    const y = (h * adj(a, 'adj2', 50000)) / 100000;
    const x3 = (w * adj(a, 'adj3', 50000)) / 100000;
    return open([
      [0, 0],
      [x1, 0],
      [x1, y],
      [x3, y],
      [x3, h],
      [w, h],
    ]);
  },
  curvedConnector2: (w, h) =>
    `M0 0 C${n(w / 2)} 0 ${n(w)} ${n(h / 2)} ${n(w)} ${n(h)}`,
  curvedConnector3: (w, h, a) => {
    const x = (w * adj(a, 'adj1', 50000)) / 100000;
    return (
      `M0 0 C${n(x / 2)} 0 ${n(x)} ${n(h / 4)} ${n(x)} ${n(h / 2)} ` +
      `C${n(x)} ${n((h * 3) / 4)} ${n((x + w) / 2)} ${n(h)} ${n(w)} ${n(h)}`
    );
  },
};

/** Presets drawn as an open line, never filled. */
export const OGE_OPEN_SLIDE_PRESETS: ReadonlySet<string> = new Set([
  'bentConnector2',
  'bentConnector3',
  'bentConnector4',
  'bentConnector5',
  'curvedConnector2',
  'curvedConnector3',
]);

/** A face of a preset drawn over its fill, as PowerPoint's shaded path modes do. */
export interface OgeSlideGeometryFace {
  readonly d: string;
  /** White (positive) or black (negative) laid over the fill, 0 to 1. */
  readonly shade: number;
}

const FACES: Readonly<
  Record<string, (w: number, h: number, a: Adjust) => OgeSlideGeometryFace[]>
> = {
  can: (w, h, a) => {
    const ss = Math.min(w, h);
    const lid = (ss * pin(0, adj(a, 'adj', 25000), (50000 * h) / ss)) / 200000;
    return [{ d: ellipse(w / 2, lid, w / 2, lid), shade: 0.4 }];
  },
  cube: (w, h, a) => {
    const d = (Math.min(w, h) * pin(0, adj(a, 'adj', 25000), 100000)) / 100000;
    return [
      {
        d: poly([
          [0, d],
          [d, 0],
          [w, 0],
          [w - d, d],
        ]),
        shade: 0.2,
      },
      {
        d: poly([
          [w - d, d],
          [w, 0],
          [w, h - d],
          [w - d, h],
        ]),
        shade: -0.16,
      },
    ];
  },
  foldedCorner: (w, h, a) => {
    const d = (Math.min(w, h) * pin(0, adj(a, 'adj', 16667), 50000)) / 100000;
    const fold = d / 5;
    return [
      {
        d: poly([
          [w - d, h],
          [w - d + fold, h - d + fold],
          [w, h - d],
        ]),
        shade: -0.16,
      },
    ];
  },
};

/** The shaded faces of a preset, drawn over its outline. */
export function ogeSlideGeometryFaces(
  name: string,
  width: number,
  height: number,
  adjust: Adjust,
): readonly OgeSlideGeometryFace[] {
  return Object.hasOwn(FACES, name) ? FACES[name](width, height, adjust) : [];
}
