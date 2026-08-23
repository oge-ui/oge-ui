import {
  OffsetTree,
  computeWindow,
  type RowKey,
  type RowNode,
  type ViewportWindow,
} from '@oge-ui/core';
import type { OgeReactiveCell, OgeReactivityAdapter } from '../reactivity';

/**
 * Optional sparse-window (remote virtual / infinite scrolling) data feed.
 * When active, the virtual space is `count` rows tall and `viewNodes`
 * synthesizes data/filler nodes from the block cache instead of slicing
 * `flatNodes`.
 */
export interface OgeGridRowWindowAdapter<T> {
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

/** Reactive getters the owning component wires into the model. */
export interface OgeGridRowVirtualizerDeps<T> {
  flatNodes: () => readonly RowNode<T>[];
  /** Whether row virtualization is active at all. */
  virtualized: () => boolean;
  /** Owned by the host (its scroll handler writes it). */
  scrollTop: () => number;
  /** Written back when a measurement correction anchors the scroll position. */
  setScrollTop: (value: number) => void;
  viewportHeight: () => number;
  rowHeight: () => number;
  detailRowHeight: () => number;
  overscan: () => number;
  /** Measured (variable) row heights instead of the fixed `rowHeight`. */
  autoRowHeight: () => boolean;
  viewport: () => HTMLElement | null;
  /** Sparse windowed mode (grid infinite scrolling); omit for tree lists. */
  windowAdapter?: OgeGridRowWindowAdapter<T>;
}

/**
 * Row virtualization over the flat `RowNode` list: Fenwick-tree offsets,
 * viewport windowing, measured variable heights with scroll anchoring, and
 * the rendered node slice.
 *
 * Framework-free (ADR 0001): reactive state comes from the caller's
 * {@link OgeReactivityAdapter}. `measureRenderedRows()` reads the DOM, which
 * is not a framework concern — but a host whose reactivity tracks reads (an
 * Angular `computed`) must call it inside its own untracked scope, exactly as
 * the Angular seam does.
 */
export class OgeGridRowVirtualizerCore<T = unknown> {
  /** Measured row heights by row key (auto row-height mode). */
  readonly measuredHeights: OgeReactiveCell<ReadonlyMap<RowKey, number>>;
  /** Whether measured (variable) row heights are in effect this frame. */
  readonly measuring: () => boolean;
  readonly offsetTree: () => OffsetTree;
  readonly viewWindow: () => ViewportWindow | null;
  /** Index of the first rendered node within the flat row space. */
  readonly viewStart: () => number;
  readonly viewNodes: () => readonly RowNode<T>[];
  readonly bodyHeight: () => number | null;
  readonly rowsTransform: () => string | null;

  private readonly windowed: () => boolean;

  constructor(
    private readonly deps: OgeGridRowVirtualizerDeps<T>,
    rx: OgeReactivityAdapter,
  ) {
    this.windowed = rx.derived(
      () => this.deps.windowAdapter?.active() ?? false,
    );
    this.measuredHeights = rx.cell<ReadonlyMap<RowKey, number>>(new Map());

    this.measuring = rx.derived(
      () =>
        this.deps.autoRowHeight() &&
        this.deps.virtualized() &&
        !this.windowed(),
    );

    this.offsetTree = rx.derived<OffsetTree>(() => {
      const rowHeight = this.deps.rowHeight();
      const windowAdapter = this.deps.windowAdapter;
      if (windowAdapter?.active()) {
        return new OffsetTree(windowAdapter.count(), () => rowHeight);
      }
      const nodes = this.deps.flatNodes();
      const detailHeight = this.deps.detailRowHeight();
      const measured = this.measuring() ? this.measuredHeights() : null;
      return new OffsetTree(nodes.length, (i) => {
        const node = nodes[i];
        return (
          measured?.get(node.key) ??
          (node.kind === 'detail' ? detailHeight : rowHeight)
        );
      });
    });

    this.viewWindow = rx.derived<ViewportWindow | null>(() => {
      if (!this.deps.virtualized()) return null;
      return computeWindow(
        this.deps.scrollTop(),
        this.deps.viewportHeight(),
        this.offsetTree(),
        this.deps.overscan(),
      );
    });

    this.viewStart = rx.derived(() => this.viewWindow()?.start ?? 0);

    this.viewNodes = rx.derived<readonly RowNode<T>[]>(() => {
      const window = this.viewWindow();
      const windowAdapter = this.deps.windowAdapter;
      if (windowAdapter?.active()) {
        const rows = windowAdapter.rows();
        const keyOf = windowAdapter.keyOf();
        const start = window?.start ?? 0;
        const end =
          window?.end ??
          Math.min(windowAdapter.count(), windowAdapter.blockSize);
        const nodes: RowNode<T>[] = [];
        for (let i = start; i < end; i++) {
          const row = rows.get(i);
          nodes.push(
            row !== undefined
              ? {
                  kind: 'data',
                  key: keyOf(row, i),
                  data: row,
                  sourceIndex: i,
                  level: 0,
                }
              : { kind: 'filler', key: `oge-filler-${i}`, index: i },
          );
        }
        return nodes;
      }
      const nodes = this.deps.flatNodes();
      return window ? nodes.slice(window.start, window.end) : nodes;
    });

    this.bodyHeight = rx.derived<number | null>(
      () => this.viewWindow()?.totalHeight ?? null,
    );

    this.rowsTransform = rx.derived<string | null>(() => {
      const window = this.viewWindow();
      return window ? `translateY(${window.offsetY}px)` : null;
    });
  }

  /**
   * Reads real row heights after each render and folds them into the offset
   * tree. Corrections above the first visible row shift `scrollTop` by the
   * same delta (scroll anchoring), so content on screen never jumps.
   */
  measureRenderedRows(): void {
    const viewport = this.deps.viewport();
    if (!viewport) return;
    const nodes = this.deps.flatNodes();
    const defaults = {
      row: this.deps.rowHeight(),
      detail: this.deps.detailRowHeight(),
    };
    const current = this.measuredHeights();
    const anchorIndex = this.viewStart();
    let changed: Map<RowKey, number> | null = null;
    let deltaAbove = 0;
    for (const el of viewport.querySelectorAll<HTMLElement>(
      '[data-rowindex]',
    )) {
      const index = Number(el.dataset['rowindex']);
      const node = nodes[index];
      const height = el.offsetHeight;
      if (!node || !height) continue;
      const previous =
        current.get(node.key) ??
        (node.kind === 'detail' ? defaults.detail : defaults.row);
      if (Math.abs(height - previous) < 1) continue;
      (changed ??= new Map(current)).set(node.key, height);
      if (index < anchorIndex) deltaAbove += height - previous;
    }
    if (!changed) return;
    this.measuredHeights.set(changed);
    if (deltaAbove !== 0) {
      viewport.scrollTop += deltaAbove;
      this.deps.setScrollTop(viewport.scrollTop);
    }
  }

  /** Scrolls the given flat row index into the vertical viewport. */
  scrollRowIntoView(row: number): void {
    if (!this.deps.virtualized()) return;
    const tree = this.offsetTree();
    const viewport = this.deps.viewport();
    if (!viewport) return;
    const top = tree.offsetOf(row);
    const bottom = top + tree.heightAt(row);
    if (top < viewport.scrollTop) viewport.scrollTop = top;
    else if (bottom > viewport.scrollTop + viewport.clientHeight) {
      viewport.scrollTop = bottom - viewport.clientHeight;
    }
  }
}
