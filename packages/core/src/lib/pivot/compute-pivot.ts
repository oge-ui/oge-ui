import type { CustomSummaryMap } from '../grouping/summaries';
import { createFieldAccessor } from '../util/value-accessor';
import {
  accumulate,
  accValue,
  createAcc,
  mergeAcc,
  type PivotAcc,
} from './pivot-accumulator';
import { applyDisplayModes, type PivotSlot } from './pivot-display';
import { intervalKey } from './pivot-interval';
import { sortAxisChildren } from './pivot-sort';
import type {
  PivotAxisNode,
  PivotComputeSettings,
  PivotFieldConfig,
  PivotFieldFns,
  PivotPath,
  PivotResult,
} from './pivot-types';

/** Stable, type-tagged key for an axis path (used for expansion sets). */
export function pathKey(path: PivotPath): string {
  return JSON.stringify(
    path.map((value) =>
      value === null ? ['null'] : [typeof value, String(value)],
    ),
  );
}

export interface PivotComputeOptions<T = unknown> {
  readonly rows: readonly T[];
  readonly fields: readonly PivotFieldConfig[];
  /** Out-of-band functions keyed by field id. */
  readonly fns?: Readonly<Record<string, PivotFieldFns<T>>>;
  /** Custom measure reducers keyed by `summaryName ?? dataField`. */
  readonly customSummaries?: CustomSummaryMap<T>;
  /** `pathKey` sets of expanded axis nodes (axes default to collapsed roots). */
  readonly rowExpandedPaths?: ReadonlySet<string>;
  readonly columnExpandedPaths?: ReadonlySet<string>;
  readonly settings?: PivotComputeSettings;
}

/** One-shot convenience over {@link PivotEngine}. */
export function computePivot<T>(input: PivotComputeOptions<T>): PivotResult {
  return new PivotEngine<T>(input).materialize(input);
}

// --- internal structures ----------------------------------------------------

interface TrieNode {
  readonly value: unknown;
  readonly path: PivotPath;
  readonly key: string;
  readonly children: Map<unknown, TrieNode>;
  /** Ordered children (after sorting); filled once per engine. */
  ordered: TrieNode[];
  /** Leaf id at full depth; -1 for internal nodes. */
  leafId: number;
  /** All descendant leaf ids (leaves: [own id]); built after the data pass. */
  leafIds: number[];
}

interface Cell {
  readonly accs: PivotAcc[];
  readonly rows: number[];
}

function createTrieNode(
  value: unknown,
  path: PivotPath,
  key: string,
): TrieNode {
  return {
    value,
    path,
    key,
    children: new Map(),
    ordered: [],
    leafId: -1,
    leafIds: [],
  };
}

/**
 * Two-layer pivot computation:
 *
 * 1. The constructor runs the data-dependent phases once — filter rows, intern
 *    both axis paths into tries, accumulate every (rowLeaf, columnLeaf) cell,
 *    then sort each trie level (labels or `sortBySummary`).
 * 2. {@link materialize} is expansion-dependent and cheap: it lays out the
 *    visible slots of both axes, aggregates the visible cells from the cached
 *    leaf accumulators and applies display modes. Toggling a node only
 *    re-runs this phase.
 */
export class PivotEngine<T = unknown> {
  private readonly rows: readonly T[];
  private readonly rowFields: readonly PivotFieldConfig[];
  private readonly columnFields: readonly PivotFieldConfig[];
  private readonly measures: readonly PivotFieldConfig[];
  private readonly fns: Readonly<Record<string, PivotFieldFns<T>>>;
  private readonly customSummaries: CustomSummaryMap<T> | undefined;

  private readonly rowRoot = createTrieNode(null, [], 'root');
  private readonly columnRoot = createTrieNode(null, [], 'root');
  /** rowLeafId → columnLeafId → cell. */
  private readonly cells = new Map<number, Map<number, Cell>>();
  private readonly measureAccessors: readonly ((row: T) => unknown)[];

  constructor(options: PivotComputeOptions<T>) {
    this.rows = options.rows;
    this.fns = options.fns ?? {};
    this.customSummaries = options.customSummaries;
    const byArea = (area: string) =>
      options.fields
        .filter((field) => field.area === area)
        .sort((a, b) => (a.areaIndex ?? 0) - (b.areaIndex ?? 0));
    this.rowFields = byArea('row');
    this.columnFields = byArea('column');
    this.measures = byArea('data');
    const filterFields = options.fields.filter(
      (field) => field.filterValues?.length && field.area !== 'data',
    );
    const filters = filterFields.map((field) => ({
      accessor: this.accessorOf(field),
      values: new Set(field.filterValues),
      exclude: field.filterType === 'exclude',
    }));

    const rowAccessors = this.rowFields.map((field) =>
      this.axisAccessorOf(field),
    );
    const columnAccessors = this.columnFields.map((field) =>
      this.axisAccessorOf(field),
    );
    this.measureAccessors = this.measures.map((field) =>
      this.accessorOf(field),
    );

    let nextRowLeaf = 0;
    let nextColumnLeaf = 0;
    const pathBuffer: unknown[] = [];

    for (let index = 0; index < this.rows.length; index++) {
      const row = this.rows[index];
      let excluded = false;
      for (const filter of filters) {
        const hit = filter.values.has(filter.accessor(row));
        if (filter.exclude ? hit : !hit) {
          excluded = true;
          break;
        }
      }
      if (excluded) continue;

      const rowLeaf = this.internPath(
        this.rowRoot,
        rowAccessors,
        row,
        pathBuffer,
        () => nextRowLeaf++,
      );
      const columnLeaf = this.internPath(
        this.columnRoot,
        columnAccessors,
        row,
        pathBuffer,
        () => nextColumnLeaf++,
      );

      let byColumn = this.cells.get(rowLeaf);
      if (!byColumn) {
        byColumn = new Map();
        this.cells.set(rowLeaf, byColumn);
      }
      let cell = byColumn.get(columnLeaf);
      if (!cell) {
        cell = { accs: this.measures.map(() => createAcc()), rows: [] };
        byColumn.set(columnLeaf, cell);
      }
      cell.rows.push(index);
      for (let m = 0; m < this.measures.length; m++) {
        accumulate(cell.accs[m], this.measureAccessors[m](row));
      }
    }

    this.finalizeTrie(this.rowRoot);
    this.finalizeTrie(this.columnRoot);
    sortAxisChildren(
      this.rowRoot,
      this.rowFields,
      this.measures,
      (node, target, measure) => this.aggregatedValue(node, target, measure),
      this.columnRoot,
    );
    sortAxisChildren(
      this.columnRoot,
      this.columnFields,
      this.measures,
      (node, target, measure) => this.aggregatedValue(target, node, measure),
      this.rowRoot,
    );
  }

  // --- construction helpers -------------------------------------------------

  private accessorOf(field: PivotFieldConfig): (row: T) => unknown {
    return (
      this.fns[field.id]?.selector ?? createFieldAccessor<T>(field.dataField)
    );
  }

  private axisAccessorOf(field: PivotFieldConfig): (row: T) => unknown {
    const base = this.accessorOf(field);
    const interval = field.groupInterval;
    return interval === undefined
      ? base
      : (row) => intervalKey(base(row), interval);
  }

  private internPath(
    root: TrieNode,
    accessors: readonly ((row: T) => unknown)[],
    row: T,
    buffer: unknown[],
    nextLeaf: () => number,
  ): number {
    if (!accessors.length) {
      if (root.leafId < 0) root.leafId = nextLeaf();
      return root.leafId;
    }
    let node = root;
    buffer.length = 0;
    for (const accessor of accessors) {
      const value = accessor(row) ?? null;
      buffer.push(value);
      let child = node.children.get(value);
      if (!child) {
        child = createTrieNode(value, [...buffer], pathKey(buffer));
        node.children.set(value, child);
      }
      node = child;
    }
    if (node.leafId < 0) node.leafId = nextLeaf();
    return node.leafId;
  }

  private finalizeTrie(node: TrieNode): void {
    node.ordered = [...node.children.values()];
    if (node.leafId >= 0) {
      node.leafIds.push(node.leafId);
      return;
    }
    for (const child of node.ordered) {
      this.finalizeTrie(child);
      node.leafIds.push(...child.leafIds);
    }
  }

  // --- aggregation ----------------------------------------------------------

  /** Merged accumulators + rows for (row subtree × column subtree). */
  private aggregateCell(rowNode: TrieNode, columnNode: TrieNode): Cell | null {
    let found: Cell | null = null;
    let merged: Cell | null = null;
    for (const rowLeaf of rowNode.leafIds) {
      const byColumn = this.cells.get(rowLeaf);
      if (!byColumn) continue;
      for (const columnLeaf of columnNode.leafIds) {
        const cell = byColumn.get(columnLeaf);
        if (!cell) continue;
        if (!found) {
          found = cell;
          continue;
        }
        if (!merged) {
          merged = {
            accs: this.measures.map(() => createAcc()),
            rows: [...found.rows],
          };
          for (let m = 0; m < this.measures.length; m++)
            mergeAcc(merged.accs[m], found.accs[m]);
          found = merged;
        }
        merged.rows.push(...cell.rows);
        for (let m = 0; m < this.measures.length; m++)
          mergeAcc(merged.accs[m], cell.accs[m]);
      }
    }
    return found;
  }

  private measureValues(cell: Cell | null): unknown[] {
    return this.measures.map((measure, index) => {
      if (!cell) return null;
      const type = measure.summaryType ?? 'sum';
      if (type === 'custom') {
        const reducer =
          this.customSummaries?.[measure.summaryName ?? measure.dataField];
        if (!reducer) return null;
        const rows = cell.rows.map((rowIndex) => this.rows[rowIndex]);
        return reducer(rows, measure.dataField);
      }
      return accValue(cell.accs[index], type);
    });
  }

  private aggregatedValue(
    rowNode: TrieNode,
    columnNode: TrieNode,
    measureIndex: number,
  ): unknown {
    const cell = this.aggregateCell(rowNode, columnNode);
    if (!cell) return null;
    const measure = this.measures[measureIndex];
    const type = measure.summaryType ?? 'sum';
    if (type === 'custom') return this.measureValues(cell)[measureIndex];
    return accValue(cell.accs[measureIndex], type);
  }

  /** Keys of every expandable node on an axis (for expand-all). */
  allGroupKeys(axis: 'row' | 'column'): ReadonlySet<string> {
    return new Set(this.allGroupPaths(axis).map((path) => pathKey(path)));
  }

  /** Paths of every expandable node on an axis. */
  allGroupPaths(axis: 'row' | 'column'): readonly PivotPath[] {
    const paths: PivotPath[] = [];
    const visit = (node: TrieNode): void => {
      for (const child of node.ordered) {
        if (child.ordered.length) {
          paths.push(child.path);
          visit(child);
        }
      }
    };
    visit(axis === 'row' ? this.rowRoot : this.columnRoot);
    return paths;
  }

  /** Rows behind one (rowPath, columnPath) intersection — the drill-down data. */
  drillDownRows(rowPath: PivotPath, columnPath: PivotPath): T[] {
    const rowNode = this.nodeAt(this.rowRoot, rowPath);
    const columnNode = this.nodeAt(this.columnRoot, columnPath);
    if (!rowNode || !columnNode) return [];
    const cell = this.aggregateCell(rowNode, columnNode);
    return cell ? cell.rows.map((index) => this.rows[index]) : [];
  }

  private nodeAt(root: TrieNode, path: PivotPath): TrieNode | null {
    let node: TrieNode = root;
    for (const value of path) {
      const child = node.children.get(value ?? null);
      if (!child) return null;
      node = child;
    }
    return node;
  }

  // --- materialization (expansion-dependent) --------------------------------

  materialize(config: {
    readonly rowExpandedPaths?: ReadonlySet<string>;
    readonly columnExpandedPaths?: ReadonlySet<string>;
    readonly settings?: PivotComputeSettings;
  }): PivotResult {
    const settings = config.settings ?? {};
    const rowAxis = this.buildAxis(
      this.rowRoot,
      this.rowFields,
      config.rowExpandedPaths ?? EMPTY_SET,
      settings.showRowTotals !== false,
      settings.showRowGrandTotals !== false,
    );
    const columnAxis = this.buildAxis(
      this.columnRoot,
      this.columnFields,
      config.columnExpandedPaths ?? EMPTY_SET,
      settings.showColumnTotals !== false,
      settings.showColumnGrandTotals !== false,
    );

    const values: unknown[][][] = [];
    for (const rowSlot of rowAxis.slots) {
      const line: unknown[][] = [];
      for (const columnSlot of columnAxis.slots) {
        line.push(
          rowSlot.suppress || columnSlot.suppress
            ? this.measures.map(() => null)
            : this.measureValues(
                this.aggregateCell(rowSlot.trie, columnSlot.trie),
              ),
        );
      }
      values.push(line);
    }

    applyDisplayModes(values, rowAxis.slots, columnAxis.slots, this.measures);

    return {
      rowRoot: rowAxis.nodes,
      columnRoot: columnAxis.nodes,
      rowLeafCount: rowAxis.slots.length,
      columnLeafCount: columnAxis.slots.length,
      values,
      measures: this.measures,
    };
  }

  private buildAxis(
    root: TrieNode,
    fields: readonly PivotFieldConfig[],
    expanded: ReadonlySet<string>,
    showTotals: boolean,
    showGrandTotals: boolean,
  ): { nodes: PivotAxisNode[]; slots: InternalSlot[] } {
    const slots: InternalSlot[] = [];

    const visit = (node: TrieNode, level: number): PivotAxisNode => {
      const field = fields[level];
      const hasChildren = node.ordered.length > 0;
      const isExpanded = hasChildren && expanded.has(node.key);
      const text = this.axisText(field, node.value);

      if (!isExpanded) {
        const slotIndex = slots.length;
        slots.push({
          trie: node,
          path: node.path,
          level,
          parentKey: parentKeyOf(node.path),
          isTotal: false,
          isGrandTotal: false,
          suppress: false,
        });
        return {
          value: node.value,
          text,
          path: node.path,
          children: [],
          expanded: false,
          hasChildren,
          leafIndex: slotIndex,
          leafCount: 1,
          isTotal: false,
          isGrandTotal: false,
        };
      }

      // Classic tree layout: the expanded parent keeps its own line, which
      // carries the subtotal values (blanked when totals are hidden), and its
      // children follow right after.
      const start = slots.length;
      const showOwnTotals = showTotals && (field?.showTotals ?? true);
      slots.push({
        trie: node,
        path: node.path,
        level,
        parentKey: parentKeyOf(node.path),
        isTotal: true,
        isGrandTotal: false,
        suppress: !showOwnTotals,
      });
      const children = node.ordered.map((child) => visit(child, level + 1));
      return {
        value: node.value,
        text,
        path: node.path,
        children,
        expanded: true,
        hasChildren,
        leafIndex: start,
        leafCount: slots.length - start,
        isTotal: true,
        isGrandTotal: false,
      };
    };

    const nodes = root.ordered.map((child) => visit(child, 0));

    // grand-total slot (always present when the axis has no fields at all,
    // so the data still has somewhere to render)
    if (showGrandTotals || fields.length === 0) {
      const slotIndex = slots.length;
      slots.push({
        trie: root,
        path: [],
        level: -1,
        parentKey: null,
        isTotal: false,
        isGrandTotal: true,
        suppress: false,
      });
      nodes.push({
        value: null,
        text: '',
        path: [],
        children: [],
        expanded: false,
        hasChildren: false,
        leafIndex: slotIndex,
        leafCount: 1,
        isTotal: false,
        isGrandTotal: true,
      });
    }

    return { nodes, slots };
  }

  private axisText(
    field: PivotFieldConfig | undefined,
    value: unknown,
  ): string {
    const base = value == null ? '' : String(value);
    if (!field) return base;
    const fns = this.fns[field.id];
    const formatted = fns?.format ? fns.format(value) : base;
    return fns?.customizeText
      ? fns.customizeText({ value, valueText: formatted })
      : formatted;
  }
}

interface InternalSlot extends PivotSlot {
  readonly trie: TrieNode;
  /** Totals hidden by settings: the slot stays (for the expander line) but renders blank. */
  readonly suppress: boolean;
}

function parentKeyOf(path: PivotPath): string | null {
  return path.length <= 1 ? null : pathKey(path.slice(0, -1));
}

const EMPTY_SET: ReadonlySet<string> = new Set();
