/**
 * Pie/doughnut geometry: slice angles, arc paths, outside-label layout
 * with connector lines, and small-value grouping (dx parity). Angles are
 * radians, 0 at 12 o'clock, clockwise. Pure.
 */

export interface PieSlice {
  /** Index into the (possibly grouped) value list. */
  readonly index: number;
  readonly value: number;
  readonly fraction: number;
  readonly startAngle: number;
  readonly endAngle: number;
  /** True for the synthetic "others" slice from small-value grouping. */
  readonly grouped: boolean;
}

export interface PieSmallValuesGrouping {
  readonly mode: 'topN' | 'smallValueThreshold';
  readonly topCount?: number;
  readonly threshold?: number;
}

export interface GroupedPieValue {
  readonly value: number;
  /** Original point indices merged into this entry (1 for plain entries). */
  readonly sourceIndexes: readonly number[];
  readonly grouped: boolean;
}

/** Applies small-value grouping; order of surviving entries is preserved. */
export function groupSmallValues(
  values: readonly number[],
  grouping: PieSmallValuesGrouping | null,
): GroupedPieValue[] {
  const plain = values.map((value, index) => ({
    value,
    sourceIndexes: [index],
    grouped: false,
  }));
  if (grouping === null) return plain;
  let keep: boolean[];
  if (grouping.mode === 'topN') {
    const topCount = grouping.topCount ?? 3;
    const ranked = [...values.keys()].sort((a, b) => values[b] - values[a]);
    const top = new Set(ranked.slice(0, topCount));
    keep = values.map((_, index) => top.has(index));
  } else {
    const threshold = grouping.threshold ?? 0;
    keep = values.map((value) => value >= threshold);
  }
  const kept = plain.filter((_, index) => keep[index]);
  const dropped = plain.filter((_, index) => !keep[index]);
  if (dropped.length === 0) return kept;
  return [
    ...kept,
    {
      value: dropped.reduce((sum, entry) => sum + entry.value, 0),
      sourceIndexes: dropped.flatMap((entry) => entry.sourceIndexes),
      grouped: true,
    },
  ];
}

/** Slice angles for non-negative values (negatives are clamped to 0). */
export function buildPieSlices(
  values: readonly GroupedPieValue[],
  startAngle = 0,
): PieSlice[] {
  const clamped = values.map((entry) => Math.max(0, entry.value));
  const total = clamped.reduce((sum, value) => sum + value, 0);
  let angle = startAngle;
  return values.map((entry, index) => {
    const fraction = total > 0 ? clamped[index] / total : 0;
    const start = angle;
    angle += fraction * Math.PI * 2;
    return {
      index,
      value: entry.value,
      fraction,
      startAngle: start,
      endAngle: angle,
      grouped: entry.grouped,
    };
  });
}

const pt = (
  cx: number,
  cy: number,
  r: number,
  angle: number,
): { x: number; y: number } => ({
  // 0 rad = 12 o'clock, clockwise
  x: cx + r * Math.sin(angle),
  y: cy - r * Math.cos(angle),
});

const fmt = (value: number): string =>
  String(Math.round(value * 100) / 100);

/** Donut-capable slice path (innerR = 0 → plain pie wedge). */
export function sliceArcPath(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number,
): string {
  const sweep = endAngle - startAngle;
  if (sweep <= 0) return '';
  // full circle needs two arcs
  if (sweep >= Math.PI * 2 - 1e-9) {
    const a = pt(cx, cy, outerR, 0);
    const b = pt(cx, cy, outerR, Math.PI);
    const outer = `M ${fmt(a.x)} ${fmt(a.y)} A ${fmt(outerR)} ${fmt(outerR)} 0 1 1 ${fmt(b.x)} ${fmt(b.y)} A ${fmt(outerR)} ${fmt(outerR)} 0 1 1 ${fmt(a.x)} ${fmt(a.y)}`;
    if (innerR <= 0) return `${outer} Z`;
    const ia = pt(cx, cy, innerR, 0);
    const ib = pt(cx, cy, innerR, Math.PI);
    return `${outer} Z M ${fmt(ia.x)} ${fmt(ia.y)} A ${fmt(innerR)} ${fmt(innerR)} 0 1 0 ${fmt(ib.x)} ${fmt(ib.y)} A ${fmt(innerR)} ${fmt(innerR)} 0 1 0 ${fmt(ia.x)} ${fmt(ia.y)} Z`;
  }
  const large = sweep > Math.PI ? 1 : 0;
  const o1 = pt(cx, cy, outerR, startAngle);
  const o2 = pt(cx, cy, outerR, endAngle);
  if (innerR <= 0) {
    return `M ${fmt(cx)} ${fmt(cy)} L ${fmt(o1.x)} ${fmt(o1.y)} A ${fmt(outerR)} ${fmt(outerR)} 0 ${large} 1 ${fmt(o2.x)} ${fmt(o2.y)} Z`;
  }
  const i1 = pt(cx, cy, innerR, startAngle);
  const i2 = pt(cx, cy, innerR, endAngle);
  return `M ${fmt(i1.x)} ${fmt(i1.y)} L ${fmt(o1.x)} ${fmt(o1.y)} A ${fmt(outerR)} ${fmt(outerR)} 0 ${large} 1 ${fmt(o2.x)} ${fmt(o2.y)} L ${fmt(i2.x)} ${fmt(i2.y)} A ${fmt(innerR)} ${fmt(innerR)} 0 ${large} 0 ${fmt(i1.x)} ${fmt(i1.y)} Z`;
}

/** The slice under `angle` (normalized into the pie's own angle space). */
export function pieSliceAt(
  angle: number,
  slices: readonly PieSlice[],
): PieSlice | null {
  const tau = Math.PI * 2;
  for (const slice of slices) {
    const start = ((slice.startAngle % tau) + tau) % tau;
    const end = start + (slice.endAngle - slice.startAngle);
    let probe = ((angle % tau) + tau) % tau;
    if (probe < start) probe += tau;
    if (probe >= start && probe < end) return slice;
  }
  return null;
}

export interface PieLabelPosition {
  readonly sliceIndex: number;
  /** Anchor on the arc (connector start). */
  readonly arcX: number;
  readonly arcY: number;
  /** Label text position (connector end). */
  readonly labelX: number;
  readonly labelY: number;
  readonly side: 'start' | 'end';
}

/**
 * Outside labels in two columns (left/right of the pie), stacked without
 * overlap: slices sort by mid-angle per side, labels flow top-down with a
 * minimum `rowH` gap.
 */
export function layoutPieLabels(
  slices: readonly PieSlice[],
  cx: number,
  cy: number,
  outerR: number,
  rowH = 16,
  labelGap = 14,
): PieLabelPosition[] {
  interface Entry {
    slice: PieSlice;
    mid: number;
    arc: { x: number; y: number };
    side: 'start' | 'end';
  }
  const entries: Entry[] = slices
    .filter((slice) => slice.fraction > 0)
    .map((slice) => {
      const mid = (slice.startAngle + slice.endAngle) / 2;
      return {
        slice,
        mid,
        arc: pt(cx, cy, outerR + 2, mid),
        side: Math.sin(mid) >= 0 ? ('end' as const) : ('start' as const),
      };
    });
  const result: PieLabelPosition[] = [];
  for (const side of ['end', 'start'] as const) {
    const column = entries
      .filter((entry) => entry.side === side)
      .sort((a, b) => a.arc.y - b.arc.y);
    let lastY = -Infinity;
    for (const entry of column) {
      const y = Math.max(entry.arc.y, lastY + rowH);
      lastY = y;
      result.push({
        sliceIndex: entry.slice.index,
        arcX: entry.arc.x,
        arcY: entry.arc.y,
        labelX: side === 'end' ? cx + outerR + labelGap : cx - outerR - labelGap,
        labelY: y,
        side,
      });
    }
  }
  return result;
}
