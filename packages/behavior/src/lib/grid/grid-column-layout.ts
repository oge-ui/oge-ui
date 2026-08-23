import type { OgeReactivityAdapter } from '../reactivity';

/**
 * What the horizontal layout needs to know about a column — and nothing more.
 *
 * Deliberately a *minimum* rather than the host's full resolved-column type:
 * track sizing, sticky offsets and the virtualization window care about four
 * fields, while the full column carries per-framework content slots
 * (Angular `TemplateRef`s, React render props). Keeping the contract this
 * narrow is what lets both render layers pass their own column type in
 * unchanged, structurally.
 */
export interface OgeGridLayoutColumn {
  readonly id: string;
  readonly width: number | string | undefined;
  readonly minWidth: number | undefined;
  readonly pinned: false | 'left' | 'right';
}

/** Reactive getters the owning component wires into the model. */
export interface OgeGridColumnLayoutDeps<C extends OgeGridLayoutColumn> {
  resolvedColumns: () => readonly C[];
  /** Whether horizontal (column) virtualization is active — the host decides. */
  colVirtualized: () => boolean;
  scrollLeft: () => number;
  hostWidth: () => number;
  /** CSS tracks of the leading utility cells (drag / expander / checkbox). */
  leadingTracks: () => readonly string[];
  /** CSS tracks of the trailing utility cells (command column). */
  trailingTracks: () => readonly string[];
  /** Total width in px of the leading utility cells. */
  leadingWidth: () => number;
  /** Fallback minimum track width for flexible columns. */
  defaultMinWidth: () => number;
  /** Track width for pinned columns without a numeric width. */
  pinnedDefaultWidth: () => number;
}

/** The horizontal window when column virtualization is on. */
export interface OgeGridColumnRange {
  readonly start: number;
  readonly end: number;
  readonly spacerLeft: number;
  readonly spacerRight: number;
}

/**
 * Horizontal layout of a grid-like component: the CSS grid track list,
 * sticky pinned-column offsets and the optional column-virtualization
 * window over the resolved columns.
 *
 * Framework-free (ADR 0001): reactive state comes from the caller's
 * {@link OgeReactivityAdapter}, so the arithmetic exists once for both layers.
 */
export class OgeGridColumnLayoutCore<
  C extends OgeGridLayoutColumn = OgeGridLayoutColumn,
> {
  /** Extra horizontal pixels rendered on each side of the viewport. */
  private static readonly COL_OVERSCAN_PX = 200;

  /** Effective numeric width per column (fallback: min width) for prefix sums. */
  readonly colWidths: () => readonly number[];
  /** Columns actually rendered — the horizontal window when virtualized. */
  readonly renderColumns: () => readonly C[];
  readonly colSpacerLeft: () => number;
  readonly colSpacerRight: () => number;
  readonly gridTemplateColumns: () => string;
  /** Sticky offsets for pinned columns (id → CSS left/right px). */
  readonly pinnedOffsets: () => ReadonlyMap<
    string,
    { left?: number; right?: number }
  >;

  private readonly colRange: () => OgeGridColumnRange | null;

  constructor(
    private readonly deps: OgeGridColumnLayoutDeps<C>,
    rx: OgeReactivityAdapter,
  ) {
    this.colWidths = rx.derived<readonly number[]>(() => {
      const defaultMin = this.deps.defaultMinWidth();
      return this.deps
        .resolvedColumns()
        .map((column) =>
          typeof column.width === 'number'
            ? column.width
            : (column.minWidth ?? defaultMin),
        );
    });

    this.colRange = rx.derived<OgeGridColumnRange | null>(() => {
      if (!this.deps.colVirtualized()) return null;
      const widths = this.colWidths();
      const overscan = OgeGridColumnLayoutCore.COL_OVERSCAN_PX;
      const viewLeft = this.deps.scrollLeft() - overscan;
      const viewRight =
        this.deps.scrollLeft() + (this.deps.hostWidth() || 1200) + overscan;
      let x = this.deps.leadingWidth();
      let start = widths.length;
      let end = widths.length;
      let spacerLeft = 0;
      for (let i = 0; i < widths.length; i++) {
        if (x + widths[i] > viewLeft) {
          start = i;
          break;
        }
        spacerLeft += widths[i];
        x += widths[i];
      }
      for (let i = start; i < widths.length; i++) {
        if (x >= viewRight) {
          end = i;
          break;
        }
        x += widths[i];
      }
      let spacerRight = 0;
      for (let i = end; i < widths.length; i++) spacerRight += widths[i];
      return { start, end, spacerLeft, spacerRight };
    });

    this.renderColumns = rx.derived<readonly C[]>(() => {
      const columns = this.deps.resolvedColumns();
      const range = this.colRange();
      return range ? columns.slice(range.start, range.end) : columns;
    });

    this.colSpacerLeft = rx.derived(() => this.colRange()?.spacerLeft ?? 0);
    this.colSpacerRight = rx.derived(() => this.colRange()?.spacerRight ?? 0);

    this.gridTemplateColumns = rx.derived(() => {
      const defaultMin = this.deps.defaultMinWidth();
      const leading = this.deps.leadingTracks();
      const trailing = this.deps.trailingTracks();
      const range = this.colRange();
      if (range) {
        const widths = this.colWidths();
        const tracks: string[] = [];
        if (range.spacerLeft > 0) tracks.push(`${range.spacerLeft}px`);
        for (let i = range.start; i < range.end; i++)
          tracks.push(`${widths[i]}px`);
        if (range.spacerRight > 0) tracks.push(`${range.spacerRight}px`);
        return [...leading, ...tracks, ...trailing].join(' ');
      }
      const tracks = this.deps.resolvedColumns().map((column) => {
        const width = column.width;
        if (typeof width === 'number') return `${width}px`;
        if (width == null && column.pinned)
          return `${this.deps.pinnedDefaultWidth()}px`;
        return width ?? `minmax(${column.minWidth ?? defaultMin}px, 1fr)`;
      });
      return [...leading, ...tracks, ...trailing].join(' ');
    });

    this.pinnedOffsets = rx.derived<
      ReadonlyMap<string, { left?: number; right?: number }>
    >(() => {
      const offsets = new Map<string, { left?: number; right?: number }>();
      const columns = this.deps.resolvedColumns();
      let left = this.deps.leadingWidth();
      for (const column of columns) {
        if (column.pinned !== 'left') continue;
        offsets.set(column.id, { left });
        left += this.pinnedWidth(column);
      }
      let right = 0;
      for (const column of [...columns].reverse()) {
        if (column.pinned !== 'right') continue;
        offsets.set(column.id, { right });
        right += this.pinnedWidth(column);
      }
      return offsets;
    });
  }

  private pinnedWidth(column: C): number {
    return typeof column.width === 'number'
      ? column.width
      : this.deps.pinnedDefaultWidth();
  }

  pinnedLeftOf(column: C): number | null {
    return this.pinnedOffsets().get(column.id)?.left ?? null;
  }

  pinnedRightOf(column: C): number | null {
    return this.pinnedOffsets().get(column.id)?.right ?? null;
  }
}
