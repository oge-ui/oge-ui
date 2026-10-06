/**
 * Keyboard maps of the non-cartesian charts. No WAI-ARIA APG chart pattern
 * exists; like the cartesian and polar charts, each plot is one focusable
 * group whose arrow keys move an active item (announced in a polite live
 * region) and whose Enter / Space activates it. The horizontal arrows
 * follow the screen, so they swap in RTL. Pure: a key + the state in, a
 * command out — the render layer applies it and calls `preventDefault()`
 * whenever a command comes back.
 */

/** Move the active item, or activate it. */
export type OgeChartListCommand =
  | { readonly type: 'move'; readonly index: number }
  | { readonly type: 'activate' };

/**
 * A one-dimensional list (funnel stages): Down/Right next, Up/Left
 * previous (clamped), Home/End, Enter/Space.
 */
export function chartListKeyCommand(
  key: string,
  ctx: {
    readonly count: number;
    readonly index: number | null;
    readonly rtl?: boolean;
  },
): OgeChartListCommand | null {
  if (ctx.count === 0) return null;
  const next = ctx.rtl === true ? 'ArrowLeft' : 'ArrowRight';
  const prev = ctx.rtl === true ? 'ArrowRight' : 'ArrowLeft';
  const clamp = (index: number): number =>
    Math.max(0, Math.min(ctx.count - 1, index));
  switch (key) {
    case 'ArrowDown':
    case next:
      return {
        type: 'move',
        index: ctx.index === null ? 0 : clamp(ctx.index + 1),
      };
    case 'ArrowUp':
    case prev:
      return {
        type: 'move',
        index: ctx.index === null ? 0 : clamp(ctx.index - 1),
      };
    case 'Home':
      return { type: 'move', index: 0 };
    case 'End':
      return { type: 'move', index: ctx.count - 1 };
    case 'Enter':
    case ' ':
      return ctx.index === null ? null : { type: 'activate' };
    default:
      return null;
  }
}

export type OgeChartGridCommand =
  | { readonly type: 'move'; readonly row: number; readonly column: number }
  | { readonly type: 'activate' };

/**
 * A cell grid (heatmap, the APG grid's navigation keys): arrows move one
 * cell (clamped), Home/End to the row's first/last cell, Ctrl+Home/End to
 * the first/last cell, PageUp/PageDown to the first/last row,
 * Enter/Space activate.
 */
export function chartGridKeyCommand(
  key: string,
  ctx: {
    readonly rows: number;
    readonly columns: number;
    readonly row: number | null;
    readonly column: number | null;
    readonly ctrl?: boolean;
    readonly rtl?: boolean;
  },
): OgeChartGridCommand | null {
  if (ctx.rows === 0 || ctx.columns === 0) return null;
  const row = ctx.row ?? 0;
  const column = ctx.column ?? 0;
  const started = ctx.row !== null && ctx.column !== null;
  const move = (r: number, c: number): OgeChartGridCommand => ({
    type: 'move',
    row: Math.max(0, Math.min(ctx.rows - 1, r)),
    column: Math.max(0, Math.min(ctx.columns - 1, c)),
  });
  const forward = ctx.rtl === true ? 'ArrowLeft' : 'ArrowRight';
  const backward = ctx.rtl === true ? 'ArrowRight' : 'ArrowLeft';
  switch (key) {
    case forward:
      return started ? move(row, column + 1) : move(0, 0);
    case backward:
      return started ? move(row, column - 1) : move(0, 0);
    case 'ArrowDown':
      return started ? move(row + 1, column) : move(0, 0);
    case 'ArrowUp':
      return started ? move(row - 1, column) : move(0, 0);
    case 'Home':
      return ctx.ctrl === true ? move(0, 0) : move(row, 0);
    case 'End':
      return ctx.ctrl === true
        ? move(ctx.rows - 1, ctx.columns - 1)
        : move(row, ctx.columns - 1);
    case 'PageUp':
      return move(0, column);
    case 'PageDown':
      return move(ctx.rows - 1, column);
    case 'Enter':
    case ' ':
      return started ? { type: 'activate' } : null;
    default:
      return null;
  }
}

/**
 * Columns of items (Sankey nodes by layer): Up/Down within the column,
 * Left/Right to the neighbouring column's item at the closest rank,
 * Home/End to the column's first/last item, Enter/Space activate.
 * `columns` lists item indexes per column, top to bottom.
 */
export function chartColumnsKeyCommand(
  key: string,
  ctx: {
    readonly columns: readonly (readonly number[])[];
    readonly index: number | null;
    readonly rtl?: boolean;
  },
): OgeChartListCommand | null {
  const filled = ctx.columns.filter((column) => column.length > 0);
  if (filled.length === 0) return null;
  let col = -1;
  let rank = -1;
  if (ctx.index !== null) {
    col = filled.findIndex((column) => column.includes(ctx.index as number));
    if (col !== -1) rank = filled[col].indexOf(ctx.index);
  }
  const first = (): OgeChartListCommand => ({
    type: 'move',
    index: filled[0][0],
  });
  if (col === -1) {
    return key.startsWith('Arrow') || key === 'Home' || key === 'End'
      ? first()
      : null;
  }
  const column = filled[col];
  const hop = (delta: number): OgeChartListCommand => {
    const target =
      filled[Math.max(0, Math.min(filled.length - 1, col + delta))];
    // closest relative rank, so a hop keeps roughly the same height
    const relative = column.length > 1 ? rank / (column.length - 1) : 0;
    const at = Math.round(relative * (target.length - 1));
    return { type: 'move', index: target[at] };
  };
  const forward = ctx.rtl === true ? 'ArrowLeft' : 'ArrowRight';
  const backward = ctx.rtl === true ? 'ArrowRight' : 'ArrowLeft';
  switch (key) {
    case 'ArrowDown':
      return {
        type: 'move',
        index: column[Math.min(column.length - 1, rank + 1)],
      };
    case 'ArrowUp':
      return { type: 'move', index: column[Math.max(0, rank - 1)] };
    case forward:
      return hop(1);
    case backward:
      return hop(-1);
    case 'Home':
      return { type: 'move', index: column[0] };
    case 'End':
      return { type: 'move', index: column[column.length - 1] };
    case 'Enter':
    case ' ':
      return { type: 'activate' };
    default:
      return null;
  }
}

export type OgeChartMapCommand =
  | { readonly type: 'move'; readonly index: number }
  | { readonly type: 'activate' }
  | { readonly type: 'zoom'; readonly factor: number }
  | { readonly type: 'pan'; readonly dx: number; readonly dy: number }
  | { readonly type: 'reset' };

/**
 * The map: arrows move to the nearest region in that screen direction
 * (by centroid, within a 45° cone first, then anywhere on that side);
 * Shift+arrows pan by 10% of the view; `+`/`=` and `-` zoom about the
 * centre; `0` resets; Enter/Space activate.
 */
export function chartMapKeyCommand(
  key: string,
  ctx: {
    readonly centroids: readonly { readonly x: number; readonly y: number }[];
    readonly index: number | null;
    readonly shift?: boolean;
    readonly panStep: number;
  },
): OgeChartMapCommand | null {
  const direction: Readonly<Record<string, readonly [number, number]>> = {
    ArrowRight: [1, 0],
    ArrowLeft: [-1, 0],
    ArrowDown: [0, 1],
    ArrowUp: [0, -1],
  };
  const dir = direction[key];
  if (dir !== undefined && ctx.shift === true) {
    // panning moves the content against the arrow: Shift+Right shows what is right
    return {
      type: 'pan',
      dx: -dir[0] * ctx.panStep,
      dy: -dir[1] * ctx.panStep,
    };
  }
  switch (key) {
    case '+':
    case '=':
      return { type: 'zoom', factor: 1.5 };
    case '-':
    case '_':
      return { type: 'zoom', factor: 1 / 1.5 };
    case '0':
      return { type: 'reset' };
    case 'Enter':
    case ' ':
      return ctx.index === null ? null : { type: 'activate' };
    case 'Home':
      return ctx.centroids.length > 0 ? { type: 'move', index: 0 } : null;
    case 'End':
      return ctx.centroids.length > 0
        ? { type: 'move', index: ctx.centroids.length - 1 }
        : null;
    default:
      break;
  }
  if (dir === undefined || ctx.centroids.length === 0) return null;
  if (ctx.index === null) return { type: 'move', index: 0 };
  const from = ctx.centroids[ctx.index];
  if (from === undefined) return { type: 'move', index: 0 };
  let best = -1;
  let bestScore = Infinity;
  ctx.centroids.forEach((c, index) => {
    if (index === ctx.index) return;
    const dx = c.x - from.x;
    const dy = c.y - from.y;
    const along = dx * dir[0] + dy * dir[1];
    if (along <= 0) return;
    const across = Math.abs(dx * dir[1] - dy * dir[0]);
    // inside the 45° cone first; outside it costs extra
    const score = along + across * (across > along ? 4 : 1.5);
    if (score < bestScore) {
      bestScore = score;
      best = index;
    }
  });
  return best === -1 ? null : { type: 'move', index: best };
}
