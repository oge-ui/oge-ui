import {
  computed,
  signal,
  untracked,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import {
  OffsetTree,
  computeWindow,
  type RowKey,
  type RowNode,
  type ViewportWindow,
} from '@oge-ui/core';

/**
 * Optional sparse-window (remote virtual / infinite scrolling) data feed.
 * When active, the virtual space is `count` rows tall and `viewNodes`
 * synthesizes data/filler nodes from the block cache instead of slicing
 * `flatNodes`.
 */
export interface RowVirtualizerWindowAdapter<T> {
  /** Whether windowed (sparse block) mode is active. */
  active: Signal<boolean>;
  /** Row count of the windowed virtual space (may grow while total unknown). */
  count: Signal<number>;
  /** Sparse row cache by absolute row index. */
  rows: Signal<ReadonlyMap<number, T>>;
  keyOf: Signal<(row: T, index: number) => RowKey>;
  /** Fallback window length before the first viewport window exists. */
  blockSize: number;
}

export interface RowVirtualizerModelDeps<T> {
  flatNodes: Signal<readonly RowNode<T>[]>;
  /** Whether row virtualization is active at all. */
  virtualized: Signal<boolean>;
  /** Owned by the host (its scroll handler writes it); measurement corrections write back. */
  scrollTop: WritableSignal<number>;
  viewportHeight: Signal<number>;
  rowHeight: Signal<number>;
  detailRowHeight: Signal<number>;
  overscan: Signal<number>;
  /** Measured (variable) row heights instead of the fixed `rowHeight`. */
  autoRowHeight: Signal<boolean>;
  viewport: () => HTMLElement | null;
  /** Sparse windowed mode (grid infinite scrolling); omit for tree lists. */
  windowAdapter?: RowVirtualizerWindowAdapter<T>;
}

/**
 * Row virtualization over the flat `RowNode` list: Fenwick-tree offsets,
 * viewport windowing, measured variable heights with scroll anchoring, and
 * the rendered node slice. Hosted as a plain field by the component (slice
 * pattern — no DI).
 */
export class RowVirtualizerModel<T = unknown> {
  constructor(private readonly deps: RowVirtualizerModelDeps<T>) {}

  private readonly windowed = computed(
    () => this.deps.windowAdapter?.active() ?? false,
  );

  /** Measured row heights by row key (auto row-height mode). */
  readonly measuredHeights = signal<ReadonlyMap<RowKey, number>>(new Map());

  /** Whether measured (variable) row heights are in effect this frame. */
  readonly measuring = computed(
    () =>
      this.deps.autoRowHeight() && this.deps.virtualized() && !this.windowed(),
  );

  readonly offsetTree = computed<OffsetTree>(() => {
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

  /**
   * Reads real row heights after each render and folds them into the offset
   * tree. Corrections above the first visible row shift `scrollTop` by the
   * same delta (scroll anchoring), so content on screen never jumps.
   */
  measureRenderedRows(): void {
    const viewport = this.deps.viewport();
    if (!viewport) return;
    const nodes = untracked(this.deps.flatNodes);
    const defaults = {
      row: untracked(this.deps.rowHeight),
      detail: untracked(this.deps.detailRowHeight),
    };
    const current = untracked(this.measuredHeights);
    const anchorIndex = untracked(this.viewStart);
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
      this.deps.scrollTop.set(viewport.scrollTop);
    }
  }

  readonly viewWindow = computed<ViewportWindow | null>(() => {
    if (!this.deps.virtualized()) return null;
    return computeWindow(
      this.deps.scrollTop(),
      this.deps.viewportHeight(),
      this.offsetTree(),
      this.deps.overscan(),
    );
  });

  /** Index of the first rendered node within the flat row space. */
  readonly viewStart = computed(() => this.viewWindow()?.start ?? 0);

  readonly viewNodes = computed<readonly RowNode<T>[]>(() => {
    const window = this.viewWindow();
    const windowAdapter = this.deps.windowAdapter;
    if (windowAdapter?.active()) {
      const rows = windowAdapter.rows();
      const keyOf = windowAdapter.keyOf();
      const start = window?.start ?? 0;
      const end =
        window?.end ?? Math.min(windowAdapter.count(), windowAdapter.blockSize);
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

  readonly bodyHeight = computed<number | null>(
    () => this.viewWindow()?.totalHeight ?? null,
  );

  readonly rowsTransform = computed<string | null>(() => {
    const window = this.viewWindow();
    return window ? `translateY(${window.offsetY}px)` : null;
  });

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
