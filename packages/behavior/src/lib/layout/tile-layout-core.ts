/**
 * The framework-free half of the tile layout (W8d): the vocabulary, the
 * message catalog, the layout model (display order + spans), the keyboard
 * map, the pointer arithmetic (drop target from measured rects, resize spans
 * from a pointer delta), the serializable state and its validator.
 *
 * Semantics: there is no APG dashboard pattern, so the layout follows the
 * kanban precedent — a labelled `role="list"` whose `listitem`s each wrap a
 * focusable `role="group"` tile (`aria-roledescription` from the catalog,
 * labelled by its header). The tiles share **one** roving tab stop; the
 * content inside a tile keeps its own place in the Tab order, and the tile's
 * keys only act when the tile itself has focus, so a text field inside a tile
 * keeps its arrow keys.
 *
 * Every drag has a keyboard twin: `Ctrl+←/→` move one position (mirrored in
 * RTL), `Ctrl+↑/↓` move one row, `Ctrl+Shift+←/→` change the column span
 * (mirrored in RTL) and `Ctrl+Shift+↑/↓` the row span. The pointer drop and
 * the keys resolve to the same `move` / `resize` commit, so both fire the
 * same events.
 */
import { isUnsafeStateKey, ogeFormatMessage } from '@oge-ui/core';

/** Identity of a tile. */
export type OgeTileLayoutKey = string | number;

/** Which spans the user may change: both, one axis, or none. */
export type OgeTileLayoutResizable = boolean | 'horizontal' | 'vertical';

/** What started a change. `api` is a method call (`moveTile`, `resizeTile`). */
export type OgeTileLayoutChangeSource = 'pointer' | 'keyboard' | 'api';

/** One tile of a data-driven layout. */
export interface OgeTileLayoutItemData {
  /** Stable identity — events and the serialized state report it. */
  key: OgeTileLayoutKey;
  /** Header text; also the tile's accessible name. */
  title?: string;
  /** Columns the tile spans (default 1, clamped to `columns`). */
  colSpan?: number;
  /** Rows the tile spans (default 1). */
  rowSpan?: number;
  /** Initial position; tiles without one keep their array order. */
  order?: number;
  /** Smallest column span a resize may reach (default 1). */
  minColSpan?: number;
  /** Largest column span a resize may reach (default `columns`). */
  maxColSpan?: number;
  /** Smallest row span a resize may reach (default 1). */
  minRowSpan?: number;
  /** Largest row span a resize may reach (default unbounded). */
  maxRowSpan?: number;
  /** Per-tile override of the layout's `resizable`. */
  resizable?: OgeTileLayoutResizable;
  /** Per-tile override of the layout's `reorderable`. */
  reorderable?: boolean;
}

/** Column and row span of a tile. */
export interface OgeTileLayoutSpan {
  colSpan: number;
  rowSpan: number;
}

/** One tile of the serialized state. */
export interface OgeTileLayoutTileState extends OgeTileLayoutSpan {
  key: OgeTileLayoutKey;
  /** 0-based display position. */
  order: number;
}

/** The serializable layout: what to persist and hand back to `applyState`. */
export interface OgeTileLayoutState {
  version: 1;
  tiles: OgeTileLayoutTileState[];
}

/** A tile with its layout resolved: display position, clamped spans, flags. */
export interface OgeTileLayoutResolvedTile<
  TItem extends OgeTileLayoutItemData = OgeTileLayoutItemData,
> extends OgeTileLayoutSpan {
  key: OgeTileLayoutKey;
  item: TItem;
  /** 0-based display position. */
  index: number;
  minColSpan: number;
  maxColSpan: number;
  minRowSpan: number;
  maxRowSpan: number;
  resizeColumns: boolean;
  resizeRows: boolean;
  reorderable: boolean;
}

/** A tile is about to move; set `cancel` to keep it where it is. */
export interface OgeTileLayoutReorderingEvent<
  TItem extends OgeTileLayoutItemData = OgeTileLayoutItemData,
> {
  readonly item: TItem;
  readonly key: OgeTileLayoutKey;
  readonly fromIndex: number;
  readonly toIndex: number;
  readonly source: OgeTileLayoutChangeSource;
  /** The originating DOM event (key press, pointer up), when there is one. */
  readonly event?: Event;
  cancel: boolean;
}

/** A tile moved. */
export type OgeTileLayoutReorderedEvent<
  TItem extends OgeTileLayoutItemData = OgeTileLayoutItemData,
> = Omit<OgeTileLayoutReorderingEvent<TItem>, 'cancel'>;

/** A tile is about to change its spans; set `cancel` to keep them. */
export interface OgeTileLayoutResizingEvent<
  TItem extends OgeTileLayoutItemData = OgeTileLayoutItemData,
> {
  readonly item: TItem;
  readonly key: OgeTileLayoutKey;
  readonly previous: OgeTileLayoutSpan;
  readonly next: OgeTileLayoutSpan;
  readonly source: OgeTileLayoutChangeSource;
  readonly event?: Event;
  cancel: boolean;
}

/** A tile changed its spans. */
export type OgeTileLayoutResizedEvent<
  TItem extends OgeTileLayoutItemData = OgeTileLayoutItemData,
> = Omit<OgeTileLayoutResizingEvent<TItem>, 'cancel'>;

/** The layout changed (move, resize or `applyState`); persist `state`. */
export interface OgeTileLayoutChangedEvent {
  readonly state: OgeTileLayoutState;
  readonly source: OgeTileLayoutChangeSource;
}

/** Every user-facing string the tile layout renders or announces. */
export interface OgeTileLayoutMessages {
  /** Accessible name of the list when the app gives none. */
  layoutLabel: string;
  /** `aria-roledescription` of each tile. */
  tileRoleDescription: string;
  /** Accessible name of a tile without a title; `{position}` is 1-based. */
  untitledTile: string;
  /** Visually hidden keyboard help every tile is described by. */
  keyboardHint: string;
  /** `title` tooltip of a draggable header. */
  dragHint: string;
  /** Announced after a move. `{title}`, `{position}`, `{count}`. */
  moved: string;
  /** Announced after a resize. `{title}`, `{colSpan}`, `{rowSpan}` (ICU plurals). */
  resized: string;
  /** Announced when a move or resize is vetoed or already at its limit. `{title}`. */
  unchanged: string;
  /** Announced when Escape cancels a drag. */
  dragCancelled: string;
}

export const OGE_DEFAULT_TILE_LAYOUT_MESSAGES: OgeTileLayoutMessages = {
  layoutLabel: 'Dashboard',
  tileRoleDescription: 'tile',
  untitledTile: 'Tile {position}',
  keyboardHint:
    'Press Control and an arrow key to move the tile, Control, Shift and an arrow key to resize it.',
  dragHint: 'Drag to move',
  moved: '{title} moved to position {position} of {count}',
  resized:
    '{title} resized to {colSpan, plural, one {# column} other {# columns}} by {rowSpan, plural, one {# row} other {# rows}}',
  unchanged: '{title} cannot change further',
  dragCancelled: 'Drag cancelled',
};

/** Application-wide defaults for `oge-tile-layout`. */
export interface OgeTileLayoutConfig {
  messages: OgeTileLayoutMessages;
  /** Default for the `columns` input (4). */
  columns?: number;
  /** Default for the `rowHeight` input (160). */
  rowHeight?: number | 'auto';
  /** Default for the `gap` input (16). */
  gap?: number;
  /** BCP 47 locale of the announcements' plural rules. */
  locale?: string;
}

export const OGE_DEFAULT_TILE_LAYOUT_CONFIG: OgeTileLayoutConfig = {
  messages: OGE_DEFAULT_TILE_LAYOUT_MESSAGES,
};

export type OgeTileLayoutConfigInput = Partial<
  Omit<OgeTileLayoutConfig, 'messages'>
> & {
  messages?: Partial<OgeTileLayoutMessages>;
};

export function resolveOgeTileLayoutConfig(
  input: OgeTileLayoutConfigInput | undefined,
): OgeTileLayoutConfig {
  return {
    ...OGE_DEFAULT_TILE_LAYOUT_CONFIG,
    ...input,
    messages: { ...OGE_DEFAULT_TILE_LAYOUT_MESSAGES, ...input?.messages },
  };
}

/** House defaults of the layout inputs. */
export const OGE_TILE_LAYOUT_DEFAULTS = {
  columns: 4,
  rowHeight: 160,
  gap: 16,
} as const;

/** The keys a tile advertises in `aria-keyshortcuts`. */
export function ogeTileLayoutShortcuts(
  reorderable: boolean,
  resizable: boolean,
): string | null {
  const keys: string[] = [];
  const arrows = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
  if (reorderable) keys.push(...arrows.map((a) => `Control+${a}`));
  if (resizable) keys.push(...arrows.map((a) => `Control+Shift+${a}`));
  return keys.length ? keys.join(' ') : null;
}

const positiveInt = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 1
    ? Math.floor(value)
    : fallback;

/** Clamps a span into `[min, max]`, both already integers ≥ 1. */
export function ogeTileLayoutClampSpan(
  value: number,
  min: number,
  max: number,
): number {
  const lo = Math.max(1, Math.min(min, max));
  return Math.min(Math.max(Math.round(value), lo), Math.max(lo, max));
}

function resizeAxes(value: OgeTileLayoutResizable): [boolean, boolean] {
  if (value === 'horizontal') return [true, false];
  if (value === 'vertical') return [false, true];
  return [value, value];
}

/** Options of {@link ogeTileLayoutResolve}. */
export interface OgeTileLayoutResolveOptions {
  columns: number;
  /** Layout-wide default of `OgeTileLayoutItemData.resizable`. */
  resizable: OgeTileLayoutResizable;
  /** Layout-wide default of `OgeTileLayoutItemData.reorderable`. */
  reorderable: boolean;
  /** The committed state; tiles it does not know keep their item order. */
  state?: OgeTileLayoutState | null;
}

/**
 * Resolves the tiles in display order with clamped spans. The state wins
 * over the items' own `order` / spans; a tile the state does not list
 * (added since it was saved) is placed after the known ones by its `order`
 * (else its array position); a state entry whose key no longer exists is
 * ignored. The sort is stable.
 */
export function ogeTileLayoutResolve<TItem extends OgeTileLayoutItemData>(
  items: readonly TItem[],
  options: OgeTileLayoutResolveOptions,
): OgeTileLayoutResolvedTile<TItem>[] {
  const columns = positiveInt(
    options.columns,
    OGE_TILE_LAYOUT_DEFAULTS.columns,
  );
  const saved = new Map<OgeTileLayoutKey, OgeTileLayoutTileState>();
  for (const tile of options.state?.tiles ?? []) saved.set(tile.key, tile);
  const ranked = items.map((item, position) => {
    const known = saved.get(item.key);
    return {
      item,
      known,
      // known tiles first (by saved order), then the rest by their order
      rank: known
        ? [0, known.order, position]
        : [1, typeof item.order === 'number' ? item.order : position, position],
    };
  });
  ranked.sort((a, b) => {
    for (let i = 0; i < 3; i++) {
      const d = a.rank[i] - b.rank[i];
      if (d !== 0) return d;
    }
    return 0;
  });
  return ranked.map(({ item, known }, index) => {
    const maxColSpan = Math.min(columns, positiveInt(item.maxColSpan, columns));
    const minColSpan = Math.min(positiveInt(item.minColSpan, 1), maxColSpan);
    const maxRowSpan = positiveInt(item.maxRowSpan, Number.MAX_SAFE_INTEGER);
    const minRowSpan = Math.min(positiveInt(item.minRowSpan, 1), maxRowSpan);
    const [resizeColumns, resizeRows] = resizeAxes(
      item.resizable ?? options.resizable,
    );
    return {
      key: item.key,
      item,
      index,
      colSpan: ogeTileLayoutClampSpan(
        positiveInt(known?.colSpan ?? item.colSpan, 1),
        minColSpan,
        maxColSpan,
      ),
      rowSpan: ogeTileLayoutClampSpan(
        positiveInt(known?.rowSpan ?? item.rowSpan, 1),
        minRowSpan,
        maxRowSpan,
      ),
      minColSpan,
      maxColSpan,
      minRowSpan,
      maxRowSpan,
      resizeColumns,
      resizeRows,
      reorderable: item.reorderable ?? options.reorderable,
    };
  });
}

/** The serializable state of resolved tiles (`order` = display position). */
export function ogeTileLayoutToState(
  tiles: readonly OgeTileLayoutResolvedTile[],
): OgeTileLayoutState {
  return {
    version: 1,
    tiles: tiles.map((tile, order) => ({
      key: tile.key,
      order,
      colSpan: tile.colSpan,
      rowSpan: tile.rowSpan,
    })),
  };
}

/** The state after moving the tile at `fromIndex` to `toIndex`. */
export function ogeTileLayoutMoveState(
  tiles: readonly OgeTileLayoutResolvedTile[],
  fromIndex: number,
  toIndex: number,
): OgeTileLayoutState {
  const next = [...tiles];
  const [moved] = next.splice(fromIndex, 1);
  if (moved) next.splice(Math.max(0, Math.min(toIndex, next.length)), 0, moved);
  return ogeTileLayoutToState(next);
}

/** The state after giving the tile at `index` new spans. */
export function ogeTileLayoutResizeState(
  tiles: readonly OgeTileLayoutResolvedTile[],
  index: number,
  span: OgeTileLayoutSpan,
): OgeTileLayoutState {
  return ogeTileLayoutToState(
    tiles.map((tile, i) => (i === index ? { ...tile, ...span } : tile)),
  );
}

/**
 * The spans a tile may take, clamped to its bounds; an axis the tile may not
 * resize keeps its current span.
 */
export function ogeTileLayoutClampResize(
  tile: OgeTileLayoutResolvedTile,
  span: OgeTileLayoutSpan,
): OgeTileLayoutSpan {
  return {
    colSpan: tile.resizeColumns
      ? ogeTileLayoutClampSpan(span.colSpan, tile.minColSpan, tile.maxColSpan)
      : tile.colSpan,
    rowSpan: tile.resizeRows
      ? ogeTileLayoutClampSpan(span.rowSpan, tile.minRowSpan, tile.maxRowSpan)
      : tile.rowSpan,
  };
}

// --- keyboard ---------------------------------------------------------------

/** The slice of a keyboard event the map reads. */
export interface OgeTileLayoutKeyInput {
  readonly key: string;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
  readonly shiftKey?: boolean;
  readonly altKey?: boolean;
}

/** Visual direction of an arrow, after RTL mirroring. */
export type OgeTileLayoutDirection = 'prev' | 'next' | 'up' | 'down';

/** What a key press on a focused tile asks for. */
export type OgeTileLayoutKeyIntent =
  | { type: 'focus'; to: OgeTileLayoutDirection | 'first' | 'last' }
  | { type: 'move'; to: OgeTileLayoutDirection }
  | { type: 'resize'; axis: 'col' | 'row'; delta: 1 | -1 };

/**
 * The keyboard map as a pure decision. Arrows / Home / End move focus;
 * `Ctrl` (or `⌘`) + arrows move the tile; `Ctrl+Shift` + arrows resize it.
 * Horizontal arrows are visual — in RTL `←` means "later" and grows the span
 * towards the inline end, which is the left.
 */
export function ogeTileLayoutKeyIntent(
  event: OgeTileLayoutKeyInput,
  rtl: boolean,
): OgeTileLayoutKeyIntent | null {
  if (event.altKey) return null;
  const mod = !!(event.ctrlKey || event.metaKey);
  const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
  const back = rtl ? 'ArrowRight' : 'ArrowLeft';
  const dir: OgeTileLayoutDirection | null =
    event.key === forward
      ? 'next'
      : event.key === back
        ? 'prev'
        : event.key === 'ArrowUp'
          ? 'up'
          : event.key === 'ArrowDown'
            ? 'down'
            : null;
  if (!mod) {
    if (event.shiftKey) return null;
    if (dir) return { type: 'focus', to: dir };
    if (event.key === 'Home') return { type: 'focus', to: 'first' };
    if (event.key === 'End') return { type: 'focus', to: 'last' };
    return null;
  }
  if (!dir) return null;
  if (!event.shiftKey) return { type: 'move', to: dir };
  if (dir === 'next') return { type: 'resize', axis: 'col', delta: 1 };
  if (dir === 'prev') return { type: 'resize', axis: 'col', delta: -1 };
  return { type: 'resize', axis: 'row', delta: dir === 'down' ? 1 : -1 };
}

/** A measured tile rectangle (viewport coordinates). */
export interface OgeTileLayoutRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

const measured = (rects: readonly OgeTileLayoutRect[]): boolean =>
  rects.some((r) => r.width > 0 && r.height > 0);

/**
 * The index a directional step lands on. `prev` / `next` walk the display
 * order; `up` / `down` pick the tile in the row above / below whose centre
 * is horizontally closest, from the measured rects — or step by `columns`
 * when nothing is measured yet (SSR, jsdom). `-1` when there is no such tile.
 */
export function ogeTileLayoutStep(
  rects: readonly OgeTileLayoutRect[],
  index: number,
  direction: OgeTileLayoutDirection | 'first' | 'last',
  columns: number,
): number {
  const count = rects.length;
  if (count === 0) return -1;
  switch (direction) {
    case 'first':
      return 0;
    case 'last':
      return count - 1;
    case 'prev':
      return index > 0 ? index - 1 : -1;
    case 'next':
      return index < count - 1 ? index + 1 : -1;
  }
  const down = direction === 'down';
  if (!measured(rects)) {
    const to = index + (down ? columns : -columns);
    if (to < 0 || to >= count) {
      // a short last row: down from the row above it reaches its end
      return down &&
        Math.floor(index / columns) < Math.floor((count - 1) / columns)
        ? count - 1
        : -1;
    }
    return to;
  }
  const from = rects[index];
  if (!from) return -1;
  const cx = from.left + from.width / 2;
  // the nearest row in the direction (a tile starting below / above the
  // focused one's top edge), then the horizontally closest tile in it
  let best = -1;
  let bestTop = down ? Infinity : -Infinity;
  let bestDx = Infinity;
  rects.forEach((r, i) => {
    if (i === index) return;
    if (down ? r.top <= from.top + 1 : r.top >= from.top - 1) return;
    const dx = Math.abs(r.left + r.width / 2 - cx);
    const sameRow = Math.abs(r.top - bestTop) <= 1;
    const closer = down ? r.top < bestTop - 1 : r.top > bestTop + 1;
    if (closer || (sameRow && dx < bestDx)) {
      best = i;
      bestTop = r.top;
      bestDx = dx;
    }
  });
  return best;
}

/**
 * The display index a dragged tile drops at: the tile whose rect contains the
 * point, else the one whose centre is nearest. Rects are measured once at
 * drag start (the layout does not reflow while dragging). Returns `dragIndex`
 * when there is nothing to compare against.
 */
export function ogeTileLayoutDropIndex(
  rects: readonly OgeTileLayoutRect[],
  x: number,
  y: number,
  dragIndex: number,
): number {
  let best = dragIndex;
  let bestDistance = Infinity;
  rects.forEach((r, i) => {
    if (
      x >= r.left &&
      x <= r.left + r.width &&
      y >= r.top &&
      y <= r.top + r.height
    ) {
      best = i;
      bestDistance = -1;
      return;
    }
    if (bestDistance < 0) return;
    const d = Math.hypot(r.left + r.width / 2 - x, r.top + r.height / 2 - y);
    if (d < bestDistance) {
      best = i;
      bestDistance = d;
    }
  });
  return best;
}

/** Input of {@link ogeTileLayoutResizeSpan}. */
export interface OgeTileLayoutResizeInput {
  /** The tile's spans when the drag started. */
  readonly start: OgeTileLayoutSpan;
  /** The tile's measured size when the drag started. */
  readonly width: number;
  readonly height: number;
  /** Pointer travel since the drag started (viewport px, `x` physical). */
  readonly dx: number;
  readonly dy: number;
  /** Grid gap in px. */
  readonly gap: number;
  /** Whether the inline end is the left edge. */
  readonly rtl: boolean;
}

/**
 * The spans a resize handle points at — snapped to whole tracks. Track sizes
 * are derived from the tile's own measured size, so `rowHeight: 'auto'` and
 * fractional column widths work the same way.
 */
export function ogeTileLayoutResizeSpan(
  input: OgeTileLayoutResizeInput,
): OgeTileLayoutSpan {
  const { start, gap } = input;
  const colTrack = (input.width - (start.colSpan - 1) * gap) / start.colSpan;
  const rowTrack = (input.height - (start.rowSpan - 1) * gap) / start.rowSpan;
  const dx = input.rtl ? -input.dx : input.dx;
  const span = (
    size: number,
    delta: number,
    track: number,
    fallback: number,
  ) =>
    track > 0
      ? Math.max(1, Math.round((size + delta + gap) / (track + gap)))
      : fallback;
  return {
    colSpan: span(input.width, dx, colTrack, start.colSpan),
    rowSpan: span(input.height, input.dy, rowTrack, start.rowSpan),
  };
}

// --- text -------------------------------------------------------------------

/** Accessible name of a tile: its title, else "Tile 3". */
export function ogeTileLayoutTileLabel(
  tile: Pick<OgeTileLayoutResolvedTile, 'item' | 'index'>,
  messages: OgeTileLayoutMessages,
  locale?: string,
): string {
  const title = tile.item.title?.trim();
  return title
    ? title
    : ogeFormatMessage(
        messages.untitledTile,
        { position: tile.index + 1 },
        locale,
      );
}

/** "Sales moved to position 2 of 6". */
export function ogeTileLayoutMovedText(
  messages: OgeTileLayoutMessages,
  title: string,
  position: number,
  count: number,
  locale?: string,
): string {
  return ogeFormatMessage(messages.moved, { title, position, count }, locale);
}

/** "Sales resized to 2 columns by 1 row". */
export function ogeTileLayoutResizedText(
  messages: OgeTileLayoutMessages,
  title: string,
  span: OgeTileLayoutSpan,
  locale?: string,
): string {
  return ogeFormatMessage(
    messages.resized,
    { title, colSpan: span.colSpan, rowSpan: span.rowSpan },
    locale,
  );
}

/** "Sales cannot change further". */
export function ogeTileLayoutUnchangedText(
  messages: OgeTileLayoutMessages,
  title: string,
  locale?: string,
): string {
  return ogeFormatMessage(messages.unchanged, { title }, locale);
}

/** The key that owns the roving tab stop: the focused tile, else the first. */
export function ogeTileLayoutTabStop(
  tiles: readonly { key: OgeTileLayoutKey }[],
  focusKey: OgeTileLayoutKey | null | undefined,
): OgeTileLayoutKey | null {
  if (focusKey !== null && focusKey !== undefined) {
    if (tiles.some((t) => t.key === focusKey)) return focusKey;
  }
  return tiles[0]?.key ?? null;
}

/** CSS `grid-template-columns` of the layout. */
export function ogeTileLayoutTemplateColumns(
  columns: number,
  columnWidth: number | string | undefined,
): string {
  const n = positiveInt(columns, OGE_TILE_LAYOUT_DEFAULTS.columns);
  const width =
    columnWidth === undefined || columnWidth === ''
      ? 'minmax(0, 1fr)'
      : typeof columnWidth === 'number'
        ? `${columnWidth}px`
        : columnWidth;
  return `repeat(${n}, ${width})`;
}

/** CSS `grid-auto-rows` of the layout. */
export function ogeTileLayoutAutoRows(rowHeight: number | 'auto'): string {
  return rowHeight === 'auto' ? 'minmax(min-content, auto)' : `${rowHeight}px`;
}

// --- persistence ------------------------------------------------------------

const MAX_TILES = 1000;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function hasUnsafeKeys(value: unknown, depth = 0): boolean {
  if (depth > 8) return true;
  if (Array.isArray(value))
    return value.some((v) => hasUnsafeKeys(v, depth + 1));
  if (value !== null && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      if (isUnsafeStateKey(key)) return true;
      if (hasUnsafeKeys((value as Record<string, unknown>)[key], depth + 1))
        return true;
    }
  }
  return false;
}

/**
 * Validates a persisted / imported layout state — untrusted input, per the
 * suite's security rules. Never throws. Returns `null` for anything that is
 * not a version-1 state object or that carries a prototype key at any depth;
 * otherwise a fresh object with only the known fields: tiles with a
 * string/finite-number key (and, when `knownKeys` is given, one of those),
 * integer spans ≥ 1 and a finite order; duplicates keep their first entry,
 * and the order is renumbered 0…n-1 in the saved sequence.
 */
export function sanitizeOgeTileLayoutState(
  input: unknown,
  knownKeys?: Iterable<OgeTileLayoutKey>,
): OgeTileLayoutState | null {
  try {
    if (!isPlainObject(input) || hasUnsafeKeys(input)) return null;
    if (input['version'] !== 1 || !Array.isArray(input['tiles'])) return null;
    const known = knownKeys ? new Set(knownKeys) : null;
    const seen = new Set<OgeTileLayoutKey>();
    const tiles: {
      key: OgeTileLayoutKey;
      order: number;
      span: OgeTileLayoutSpan;
      at: number;
    }[] = [];
    (input['tiles'] as unknown[]).slice(0, MAX_TILES).forEach((raw, at) => {
      if (!isPlainObject(raw)) return;
      const key = raw['key'];
      const validKey =
        (typeof key === 'string' && key.length <= 256) ||
        (typeof key === 'number' && Number.isFinite(key));
      if (!validKey) return;
      const k = key as OgeTileLayoutKey;
      if (seen.has(k) || (known && !known.has(k))) return;
      const order = raw['order'];
      if (typeof order !== 'number' || !Number.isFinite(order)) return;
      seen.add(k);
      tiles.push({
        key: k,
        order,
        at,
        span: {
          colSpan: Math.min(positiveInt(raw['colSpan'], 1), 1000),
          rowSpan: Math.min(positiveInt(raw['rowSpan'], 1), 1000),
        },
      });
    });
    tiles.sort((a, b) => a.order - b.order || a.at - b.at);
    return {
      version: 1,
      tiles: tiles.map((t, order) => ({ key: t.key, order, ...t.span })),
    };
  } catch {
    return null;
  }
}
