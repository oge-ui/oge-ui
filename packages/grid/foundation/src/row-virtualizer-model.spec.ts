import { signal } from '@angular/core';
import type { RowNode } from '@oge-ui/core';
import {
  RowVirtualizerModel,
  type RowVirtualizerModelDeps,
  type RowVirtualizerWindowAdapter,
} from './row-virtualizer-model';

interface Row {
  id: number;
}

function dataNode(i: number): RowNode<Row> {
  return { kind: 'data', key: i, data: { id: i }, sourceIndex: i, level: 0 };
}

function detailNode(key: string, parentKey: number): RowNode<Row> {
  return { kind: 'detail', key, parentKey, data: { id: parentKey } };
}

const NODES: readonly RowNode<Row>[] = Array.from({ length: 1000 }, (_, i) =>
  dataNode(i),
);

interface ModelOverrides {
  flatNodes?: readonly RowNode<Row>[];
  virtualized?: boolean;
  scrollTop?: number;
  viewportHeight?: number;
  rowHeight?: number;
  detailRowHeight?: number;
  overscan?: number;
  autoRowHeight?: boolean;
  viewport?: () => HTMLElement | null;
  windowAdapter?: RowVirtualizerWindowAdapter<Row>;
}

function createModel(over: ModelOverrides = {}) {
  const deps = {
    flatNodes: signal(over.flatNodes ?? NODES),
    virtualized: signal(over.virtualized ?? true),
    scrollTop: signal(over.scrollTop ?? 0),
    viewportHeight: signal(over.viewportHeight ?? 400),
    rowHeight: signal(over.rowHeight ?? 40),
    detailRowHeight: signal(over.detailRowHeight ?? 200),
    overscan: signal(over.overscan ?? 2),
    autoRowHeight: signal(over.autoRowHeight ?? false),
    viewport: over.viewport ?? (() => null),
    windowAdapter: over.windowAdapter,
  } satisfies RowVirtualizerModelDeps<Row>;
  return { deps, model: new RowVirtualizerModel<Row>(deps) };
}

function makeAdapter(over: Partial<RowVirtualizerWindowAdapter<Row>> = {}) {
  return {
    active: signal(true),
    count: signal(500),
    rows: signal<ReadonlyMap<number, Row>>(
      new Map([
        [0, { id: 100 }],
        [1, { id: 101 }],
        [3, { id: 103 }],
      ]),
    ),
    keyOf: signal((row: Row) => row.id),
    blockSize: 5,
    ...over,
  } satisfies RowVirtualizerWindowAdapter<Row>;
}

describe('RowVirtualizerModel', () => {
  describe('offsetTree', () => {
    it('builds fixed-height offsets from rowHeight', () => {
      const { model } = createModel();
      const tree = model.offsetTree();
      expect(tree.length).toBe(1000);
      expect(tree.totalHeight).toBe(40_000);
      expect(tree.heightAt(5)).toBe(40);
      expect(tree.offsetOf(10)).toBe(400);
    });

    it('gives detail rows the detailRowHeight', () => {
      const { model } = createModel({
        flatNodes: [
          dataNode(0),
          dataNode(1),
          detailNode('det', 1),
          dataNode(2),
        ],
      });
      const tree = model.offsetTree();
      expect(tree.heightAt(2)).toBe(200);
      expect(tree.totalHeight).toBe(3 * 40 + 200);
    });

    it('honors manually set measured heights while measuring', () => {
      const { model } = createModel({
        flatNodes: [
          dataNode(0),
          dataNode(1),
          detailNode('det', 1),
          dataNode(2),
        ],
        autoRowHeight: true,
      });
      expect(model.measuring()).toBe(true);
      model.measuredHeights.set(
        new Map([
          [1, 90],
          ['det', 64],
        ]),
      );
      const tree = model.offsetTree();
      expect(tree.heightAt(0)).toBe(40); // unmeasured → default
      expect(tree.heightAt(1)).toBe(90); // measured data row
      expect(tree.heightAt(2)).toBe(64); // measured detail row beats detailRowHeight
      expect(tree.offsetOf(2)).toBe(40 + 90);
    });

    it('ignores measured heights when autoRowHeight is off', () => {
      const { model } = createModel({ autoRowHeight: false });
      model.measuredHeights.set(new Map([[1, 90]]));
      expect(model.measuring()).toBe(false);
      expect(model.offsetTree().heightAt(1)).toBe(40);
    });
  });

  describe('viewWindow', () => {
    it('responds to scrollTop, viewportHeight and overscan', () => {
      const { deps, model } = createModel();
      expect(model.viewWindow()).toEqual({
        start: 0,
        end: 13,
        offsetY: 0,
        totalHeight: 40_000,
      });

      deps.scrollTop.set(4000);
      expect(model.viewWindow()).toEqual({
        start: 98,
        end: 113,
        offsetY: 3920,
        totalHeight: 40_000,
      });
      expect(model.viewStart()).toBe(98);

      deps.viewportHeight.set(800);
      expect(model.viewWindow()?.end).toBe(123);

      deps.overscan.set(0);
      expect(model.viewWindow()).toEqual({
        start: 100,
        end: 121,
        offsetY: 4000,
        totalHeight: 40_000,
      });
    });

    it('slices viewNodes to the window and derives bodyHeight/rowsTransform', () => {
      const { model } = createModel({ scrollTop: 4000 });
      const nodes = model.viewNodes();
      expect(nodes).toHaveLength(15);
      expect(nodes[0].key).toBe(98);
      expect(nodes[nodes.length - 1].key).toBe(112);
      expect(model.bodyHeight()).toBe(40_000);
      expect(model.rowsTransform()).toBe('translateY(3920px)');
    });

    it('passes all nodes through when virtualization is off', () => {
      const { deps, model } = createModel({ virtualized: false });
      expect(model.viewWindow()).toBeNull();
      expect(model.viewNodes()).toBe(deps.flatNodes());
      expect(model.viewStart()).toBe(0);
      expect(model.bodyHeight()).toBeNull();
      expect(model.rowsTransform()).toBeNull();
    });
  });

  describe('windowed (sparse block) mode', () => {
    it('sizes the offset tree from the adapter count, not flatNodes', () => {
      const { model } = createModel({
        flatNodes: [dataNode(0), detailNode('det', 0)],
        windowAdapter: makeAdapter(),
        autoRowHeight: true,
      });
      expect(model.measuring()).toBe(false); // measurement never applies to windowed mode
      expect(model.offsetTree().length).toBe(500);
      expect(model.offsetTree().totalHeight).toBe(500 * 40);
      expect(model.bodyHeight()).toBe(500 * 40);
    });

    it('synthesizes data and filler nodes from the sparse row cache', () => {
      const { model } = createModel({
        flatNodes: [],
        windowAdapter: makeAdapter(),
        overscan: 0,
      });
      const nodes = model.viewNodes();
      expect(nodes).toHaveLength(11); // rows 0..10 for a 400px viewport of 40px rows
      expect(nodes.map((n) => n.kind)).toEqual([
        'data',
        'data',
        'filler',
        'data',
        ...Array(7).fill('filler'),
      ]);
      expect(nodes[0]).toEqual({
        kind: 'data',
        key: 100,
        data: { id: 100 },
        sourceIndex: 0,
        level: 0,
      });
      expect(nodes[3]).toEqual({
        kind: 'data',
        key: 103,
        data: { id: 103 },
        sourceIndex: 3,
        level: 0,
      });
      expect(nodes[2].key).toBe('oge-filler-2');
      expect(nodes[10].key).toBe('oge-filler-10');
    });

    it('falls back to blockSize rows when there is no viewport window', () => {
      const { model } = createModel({
        flatNodes: [],
        virtualized: false,
        windowAdapter: makeAdapter({ blockSize: 5 }),
      });
      expect(model.viewWindow()).toBeNull();
      const nodes = model.viewNodes();
      expect(nodes).toHaveLength(5);
      expect(nodes[0].kind).toBe('data');
      expect(nodes[4].kind).toBe('filler');
    });
  });

  describe('scrollRowIntoView', () => {
    it('scrolls down to reveal a row below and up for a row above', () => {
      const fake = { scrollTop: 0, clientHeight: 400 };
      const { model } = createModel({
        viewport: () => fake as unknown as HTMLElement,
      });

      model.scrollRowIntoView(50); // rows 50 spans 2000..2040 → align bottom
      expect(fake.scrollTop).toBe(2040 - 400);

      model.scrollRowIntoView(10); // 400..440 is above → align top
      expect(fake.scrollTop).toBe(400);

      model.scrollRowIntoView(12); // 480..520 already visible → untouched
      expect(fake.scrollTop).toBe(400);
    });

    it('is a no-op without virtualization or without a viewport', () => {
      const fake = { scrollTop: 123, clientHeight: 400 };
      const { model } = createModel({
        virtualized: false,
        viewport: () => fake as unknown as HTMLElement,
      });
      model.scrollRowIntoView(50);
      expect(fake.scrollTop).toBe(123);

      const { model: detached } = createModel();
      expect(() => detached.scrollRowIntoView(50)).not.toThrow();
    });
  });

  it('measureRenderedRows is a no-op without a viewport element', () => {
    const { model } = createModel({ autoRowHeight: true });
    expect(() => model.measureRenderedRows()).not.toThrow();
    expect(model.measuredHeights().size).toBe(0);
  });
});
