import { untracked, type WritableSignal } from '@angular/core';
import type { RowKey, RowNode } from '@oge-ui/core';
import { OgeGridRowVirtualizerCore } from '@oge-ui/behavior';
import { SIGNAL_ADAPTER } from './signal-adapter';

/**
 * Optional sparse-window (remote virtual / infinite scrolling) data feed.
 * When active, the virtual space is `count` rows tall and `viewNodes`
 * synthesizes data/filler nodes from the block cache instead of slicing
 * `flatNodes`.
 */
export interface RowVirtualizerWindowAdapter<T> {
  /** Whether windowed (sparse block) mode is active. */
  active: () => boolean;
  /** Row count of the windowed virtual space (may grow while total unknown). */
  count: () => number;
  /** Sparse row cache by absolute row index. */
  rows: () => ReadonlyMap<number, T>;
  keyOf: () => (row: T, index: number) => RowKey;
  /** Fallback window length before the first viewport window exists. */
  blockSize: number;
}

export interface RowVirtualizerModelDeps<T> {
  flatNodes: () => readonly RowNode<T>[];
  /** Whether row virtualization is active at all. */
  virtualized: () => boolean;
  /** Owned by the host (its scroll handler writes it); measurement corrections write back. */
  scrollTop: WritableSignal<number>;
  viewportHeight: () => number;
  rowHeight: () => number;
  detailRowHeight: () => number;
  overscan: () => number;
  /** Measured (variable) row heights instead of the fixed `rowHeight`. */
  autoRowHeight: () => boolean;
  viewport: () => HTMLElement | null;
  /** Sparse windowed mode (grid infinite scrolling); omit for tree lists. */
  windowAdapter?: RowVirtualizerWindowAdapter<T>;
}

/**
 * Row virtualization over the flat `RowNode` list: Fenwick-tree offsets,
 * viewport windowing, measured variable heights with scroll anchoring, and
 * the rendered node slice. Hosted as a plain field by the component (slice
 * pattern — no DI).
 *
 * Since ADR 0001's grid phase the machine is `@oge-ui/behavior`'s
 * `OgeGridRowVirtualizerCore`, shared verbatim with the React grid; this class
 * is the Angular seam. It also owns the one Angular-only concern the core
 * cannot express: `measureRenderedRows()` reads reactive state while a render
 * effect is running, so it runs inside `untracked()` here — the core just
 * reads its getters.
 */
export class RowVirtualizerModel<
  T = unknown,
> extends OgeGridRowVirtualizerCore<T> {
  constructor(deps: RowVirtualizerModelDeps<T>) {
    super(
      {
        ...deps,
        setScrollTop: (value) => deps.scrollTop.set(value),
      },
      SIGNAL_ADAPTER,
    );
  }

  override measureRenderedRows(): void {
    untracked(() => super.measureRenderedRows());
  }
}
