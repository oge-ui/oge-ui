/**
 * Treemap tilings. `squarify` is Bruls, Huizing and van Wijk's squarified
 * algorithm: values in descending order fill rows along the shorter side,
 * and a row closes as soon as adding the next value would worsen its
 * worst aspect ratio — tiles stay as close to squares as the data allows.
 * `sliceAndDice` splits along one axis (alternating per level), which
 * keeps the input order readable. Pure.
 */

export interface TreemapRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export type OgeTreemapLayoutAlgorithm = 'squarified' | 'sliceAndDice';

const EMPTY: TreemapRect = { x: 0, y: 0, w: 0, h: 0 };

/** The worst aspect ratio of a row of `areas` laid along `side`. */
export function worstAspectRatio(
  areas: readonly number[],
  side: number,
): number {
  if (areas.length === 0 || side <= 0) return Infinity;
  const sum = areas.reduce((total, area) => total + area, 0);
  const max = Math.max(...areas);
  const min = Math.min(...areas);
  if (min <= 0 || sum <= 0) return Infinity;
  const side2 = side * side;
  return Math.max((side2 * max) / (sum * sum), (sum * sum) / (side2 * min));
}

/**
 * Squarified tiling of `values` into `rect`; the result is aligned with
 * the input (zero / negative values get an empty rect at the origin).
 */
export function squarify(
  values: readonly number[],
  rect: TreemapRect,
): TreemapRect[] {
  const result: TreemapRect[] = values.map(() => EMPTY);
  const clean = values.map((v) => (Number.isFinite(v) ? Math.max(0, v) : 0));
  const total = clean.reduce((sum, v) => sum + v, 0);
  if (total <= 0 || rect.w <= 0 || rect.h <= 0) return result;
  const scale = (rect.w * rect.h) / total;
  const order = clean
    .map((value, index) => ({ index, area: value * scale }))
    .filter((entry) => entry.area > 0)
    .sort((a, b) => b.area - a.area || a.index - b.index);

  let { x, y, w, h } = rect;
  let row: { index: number; area: number }[] = [];
  const layoutRow = (entries: { index: number; area: number }[]): void => {
    if (entries.length === 0) return;
    const sum = entries.reduce((total, entry) => total + entry.area, 0);
    if (w >= h) {
      // a column along the left edge
      const colW = h > 0 ? sum / h : 0;
      let cursor = y;
      for (const entry of entries) {
        const tileH = colW > 0 ? entry.area / colW : 0;
        result[entry.index] = { x, y: cursor, w: colW, h: tileH };
        cursor += tileH;
      }
      x += colW;
      w -= colW;
    } else {
      // a row along the top edge
      const rowH = w > 0 ? sum / w : 0;
      let cursor = x;
      for (const entry of entries) {
        const tileW = rowH > 0 ? entry.area / rowH : 0;
        result[entry.index] = { x: cursor, y, w: tileW, h: rowH };
        cursor += tileW;
      }
      y += rowH;
      h -= rowH;
    }
  };
  let i = 0;
  while (i < order.length) {
    const side = Math.min(w, h);
    const candidate = [...row, order[i]];
    if (
      row.length === 0 ||
      worstAspectRatio(
        candidate.map((e) => e.area),
        side,
      ) <=
        worstAspectRatio(
          row.map((e) => e.area),
          side,
        )
    ) {
      row = candidate;
      i++;
    } else {
      layoutRow(row);
      row = [];
    }
  }
  layoutRow(row);
  return result;
}

/** Slice-and-dice: one strip per value, along x (`vertical` false) or y. */
export function sliceAndDice(
  values: readonly number[],
  rect: TreemapRect,
  vertical: boolean,
): TreemapRect[] {
  const clean = values.map((v) => (Number.isFinite(v) ? Math.max(0, v) : 0));
  const total = clean.reduce((sum, v) => sum + v, 0);
  if (total <= 0) return values.map(() => EMPTY);
  let cursor = vertical ? rect.y : rect.x;
  return clean.map((value) => {
    if (value <= 0) return EMPTY;
    const share = value / total;
    if (vertical) {
      const tile = { x: rect.x, y: cursor, w: rect.w, h: rect.h * share };
      cursor += tile.h;
      return tile;
    }
    const tile = { x: cursor, y: rect.y, w: rect.w * share, h: rect.h };
    cursor += tile.w;
    return tile;
  });
}

/** Mirrors `tile` horizontally inside `frame` (RTL). */
export function mirrorTreemapRect(
  tile: TreemapRect,
  frame: TreemapRect,
): TreemapRect {
  return { ...tile, x: frame.x + frame.w - (tile.x - frame.x) - tile.w };
}
