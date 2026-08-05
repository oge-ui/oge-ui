import { computed, type Signal } from '@angular/core';
import type { ColumnSource, ResolvedColumn } from './column-model';

export interface ColumnLayoutModelDeps<T, S extends ColumnSource<T> = ColumnSource<T>> {
  resolvedColumns: Signal<readonly ResolvedColumn<T, S>[]>;
  /** Whether horizontal (column) virtualization is active — the host decides. */
  colVirtualized: Signal<boolean>;
  scrollLeft: Signal<number>;
  hostWidth: Signal<number>;
  /** CSS tracks of the leading utility cells (drag / expander / checkbox). */
  leadingTracks: Signal<readonly string[]>;
  /** CSS tracks of the trailing utility cells (command column). */
  trailingTracks: Signal<readonly string[]>;
  /** Total width in px of the leading utility cells. */
  leadingWidth: Signal<number>;
  /** Fallback minimum track width for flexible columns. */
  defaultMinWidth: Signal<number>;
  /** Track width for pinned columns without a numeric width. */
  pinnedDefaultWidth: Signal<number>;
}

/**
 * Horizontal layout of a grid-like component: the CSS grid track list,
 * sticky pinned-column offsets and the optional column-virtualization
 * window over the resolved columns. Hosted as a plain field by the
 * component (slice pattern — no DI).
 */
export class ColumnLayoutModel<T = unknown, S extends ColumnSource<T> = ColumnSource<T>> {
  /** Extra horizontal pixels rendered on each side of the viewport. */
  private static readonly COL_OVERSCAN_PX = 200;

  constructor(private readonly deps: ColumnLayoutModelDeps<T, S>) {}

  /** Effective numeric width per column (fallback: min width) for prefix sums. */
  readonly colWidths = computed<readonly number[]>(() => {
    const defaultMin = this.deps.defaultMinWidth();
    return this.deps.resolvedColumns().map((column) =>
      typeof column.width === 'number' ? column.width : (column.minWidth ?? defaultMin)
    );
  });

  private readonly colRange = computed<{
    start: number;
    end: number;
    spacerLeft: number;
    spacerRight: number;
  } | null>(() => {
    if (!this.deps.colVirtualized()) return null;
    const widths = this.colWidths();
    const viewLeft = this.deps.scrollLeft() - ColumnLayoutModel.COL_OVERSCAN_PX;
    const viewRight =
      this.deps.scrollLeft() + (this.deps.hostWidth() || 1200) + ColumnLayoutModel.COL_OVERSCAN_PX;
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

  /** Columns actually rendered — the horizontal window when virtualized. */
  readonly renderColumns = computed<readonly ResolvedColumn<T, S>[]>(() => {
    const columns = this.deps.resolvedColumns();
    const range = this.colRange();
    return range ? columns.slice(range.start, range.end) : columns;
  });

  readonly colSpacerLeft = computed(() => this.colRange()?.spacerLeft ?? 0);
  readonly colSpacerRight = computed(() => this.colRange()?.spacerRight ?? 0);

  readonly gridTemplateColumns = computed(() => {
    const defaultMin = this.deps.defaultMinWidth();
    const leading = this.deps.leadingTracks();
    const trailing = this.deps.trailingTracks();
    const range = this.colRange();
    if (range) {
      const widths = this.colWidths();
      const tracks: string[] = [];
      if (range.spacerLeft > 0) tracks.push(`${range.spacerLeft}px`);
      for (let i = range.start; i < range.end; i++) tracks.push(`${widths[i]}px`);
      if (range.spacerRight > 0) tracks.push(`${range.spacerRight}px`);
      return [...leading, ...tracks, ...trailing].join(' ');
    }
    const tracks = this.deps.resolvedColumns().map((column) => {
      const width = column.width;
      if (typeof width === 'number') return `${width}px`;
      if (width == null && column.pinned) return `${this.deps.pinnedDefaultWidth()}px`;
      return width ?? `minmax(${column.minWidth ?? defaultMin}px, 1fr)`;
    });
    return [...leading, ...tracks, ...trailing].join(' ');
  });

  private pinnedWidth(column: ResolvedColumn<T, S>): number {
    return typeof column.width === 'number' ? column.width : this.deps.pinnedDefaultWidth();
  }

  /** Sticky offsets for pinned columns (id → CSS left/right px). */
  readonly pinnedOffsets = computed<ReadonlyMap<string, { left?: number; right?: number }>>(() => {
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

  pinnedLeftOf(column: ResolvedColumn<T, S>): number | null {
    return this.pinnedOffsets().get(column.id)?.left ?? null;
  }

  pinnedRightOf(column: ResolvedColumn<T, S>): number | null {
    return this.pinnedOffsets().get(column.id)?.right ?? null;
  }
}
