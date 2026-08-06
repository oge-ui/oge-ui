import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  contentChildren,
  inject,
  input,
  output,
} from '@angular/core';
import {
  PivotEngine,
  type CustomSummaryMap,
  type PivotAxisNode,
  type PivotDrillDownArgs,
  type PivotFieldConfig,
  type PivotFieldFns,
  type PivotPath,
  type PivotResult,
} from '@oge-ui/core';
import { formatCellValue } from '@oge-ui/grid';
import { humanize } from '@oge-ui/grid/foundation';
import { OGE_PIVOT_MESSAGES, type OgePivotMessages } from './pivot-config';
import { OgePivotField } from './pivot-field';
import { PivotStateStore } from './pivot-state.store';

export const PIVOT_FIELD_DRAG_TYPE = 'application/x-oge-pivot-field';

/** One visible line of an axis (row line or column slot), in matrix order. */
export interface PivotAxisLine {
  readonly text: string;
  readonly path: PivotPath;
  readonly level: number;
  readonly expanded: boolean;
  readonly hasChildren: boolean;
  readonly isTotal: boolean;
  readonly isGrandTotal: boolean;
}

/** A positioned column-header cell (multi-row header with spans). */
export interface PivotHeaderCell extends PivotAxisLine {
  /** 1-based grid row within the header block. */
  readonly rowStart: number;
  readonly rowEnd: number;
  /** 1-based matrix column the cell starts at. */
  readonly columnStart: number;
  readonly span: number;
}

export interface OgePivotCellClickEvent {
  readonly rowPath: PivotPath;
  readonly columnPath: PivotPath;
  readonly measureIndex: number;
  readonly value: unknown;
  readonly event: MouseEvent;
}

/**
 * PivotGrid MVP: local array data, four field areas, multi-level column
 * headers with spans, tree-layout row headers, expand/collapse on both axes,
 * sub/grand totals and a collapsible drag & drop field panel.
 */
@Component({
  selector: 'oge-pivot-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'oge-pivot-grid' },
  templateUrl: './pivot-grid.html',
  styleUrl: './pivot-grid.scss',
})
export class OgePivotGrid<T = unknown> {
  readonly data = input<readonly T[]>([]);
  readonly showRowTotals = input(true);
  readonly showColumnTotals = input(true);
  readonly showRowGrandTotals = input(true);
  readonly showColumnGrandTotals = input(true);
  readonly fieldPanel = input(true);
  readonly messages = input<Partial<OgePivotMessages>>({});

  readonly cellClick = output<OgePivotCellClickEvent>();
  readonly cellDblClick = output<OgePivotCellClickEvent>();
  readonly fieldLayoutChange = output<readonly PivotFieldConfig[]>();

  protected readonly store = new PivotStateStore();
  private readonly defaultMessages = inject(OGE_PIVOT_MESSAGES);
  protected readonly msg = computed<OgePivotMessages>(() => ({
    ...this.defaultMessages,
    ...this.messages(),
  }));

  protected readonly fieldDirectives = contentChildren(OgePivotField<T>);

  /** Declared fields + user layout overrides, ready for the engine. */
  protected readonly resolvedFields = computed<readonly PivotFieldConfig[]>(() => {
    const overrides = this.store.fieldOverrides();
    return this.fieldDirectives().map((directive, index) => {
      const dataField = directive.dataField();
      const id = directive.id() ?? dataField;
      const base: PivotFieldConfig = {
        id,
        dataField,
        caption: directive.caption() ?? humanize(dataField),
        area: directive.area(),
        areaIndex: directive.areaIndex() ?? index,
        dataType: directive.dataType(),
        groupInterval: directive.groupInterval(),
        summaryType: directive.summaryType(),
        summaryName: directive.summaryName(),
        summaryDisplayMode: directive.summaryDisplayMode(),
        runningTotal: directive.runningTotal(),
        sortOrder: directive.sortOrder(),
        sortBySummaryField: directive.sortBySummaryField(),
        sortBySummaryPath: directive.sortBySummaryPath(),
        filterValues: directive.filterValues(),
        filterType: directive.filterType(),
        showTotals: directive.showTotals(),
      };
      return { ...base, ...overrides.get(id) };
    });
  });

  private readonly fieldFns = computed<Readonly<Record<string, PivotFieldFns<T>>>>(() => {
    const fns: Record<string, PivotFieldFns<T>> = {};
    for (const directive of this.fieldDirectives()) {
      const id = directive.id() ?? directive.dataField();
      const selector = directive.selector();
      const format = directive.format();
      const customizeText = directive.customizeText();
      if (selector || format || customizeText) fns[id] = { selector, format, customizeText };
    }
    return fns;
  });

  private readonly customSummaries = computed<CustomSummaryMap<T> | undefined>(() => {
    const map: Record<string, (rows: readonly T[], field: string) => unknown> = {};
    let any = false;
    for (const directive of this.fieldDirectives()) {
      const reducer = directive.calculateCustomSummary();
      if (reducer) {
        map[directive.summaryName() ?? directive.dataField()] = reducer;
        any = true;
      }
    }
    return any ? map : undefined;
  });

  /** Data-dependent phase: rebuilt only when rows or the field layout change. */
  private readonly engine = computed(
    () =>
      new PivotEngine<T>({
        rows: this.data(),
        fields: this.resolvedFields(),
        fns: this.fieldFns(),
        customSummaries: this.customSummaries(),
      })
  );

  /** Expansion-dependent phase: cheap on toggle. */
  protected readonly result = computed<PivotResult>(() =>
    this.engine().materialize({
      rowExpandedPaths: this.store.rowExpandedPaths(),
      columnExpandedPaths: this.store.columnExpandedPaths(),
      settings: {
        showRowTotals: this.showRowTotals(),
        showColumnTotals: this.showColumnTotals(),
        showRowGrandTotals: this.showRowGrandTotals(),
        showColumnGrandTotals: this.showColumnGrandTotals(),
      },
    })
  );

  // --- axis projections -----------------------------------------------------

  protected readonly rowLines = computed<readonly PivotAxisLine[]>(() => {
    const lines: PivotAxisLine[] = [];
    const visit = (nodes: readonly PivotAxisNode[], level: number): void => {
      for (const node of nodes) {
        if (node.leafIndex >= 0) lines[node.leafIndex] = this.lineOf(node, level);
        if (node.children.length) visit(node.children, level + 1);
      }
    };
    visit(this.result().rowRoot, 0);
    return lines;
  });

  /** Depth of the visible column header block (≥ 1). */
  protected readonly columnDepth = computed<number>(() => {
    let depth = 1;
    const visit = (nodes: readonly PivotAxisNode[], level: number): void => {
      for (const node of nodes) {
        depth = Math.max(depth, level + 1);
        if (node.children.length) visit(node.children, level + 1);
      }
    };
    visit(this.result().columnRoot, 0);
    return depth;
  });

  protected readonly columnHeaderCells = computed<readonly PivotHeaderCell[]>(() => {
    const depth = this.columnDepth();
    const cells: PivotHeaderCell[] = [];
    const startOf = (node: PivotAxisNode): number =>
      node.leafIndex >= 0 ? node.leafIndex : startOf(node.children[0]);
    const visit = (nodes: readonly PivotAxisNode[], level: number): void => {
      for (const node of nodes) {
        const start = startOf(node);
        cells.push({
          ...this.lineOf(node, level),
          rowStart: level + 1,
          rowEnd: node.children.length ? level + 2 : depth + 1,
          columnStart: start + 1,
          span: Math.max(1, node.leafCount),
        });
        if (node.children.length) {
          // the expanded parent's own subtotal slot needs a header cell under
          // the spanning parent, down to the leaf row
          if (level + 2 <= depth) {
            cells.push({
              text: '',
              path: node.path,
              level: level + 1,
              expanded: false,
              hasChildren: false,
              isTotal: true,
              isGrandTotal: false,
              rowStart: level + 2,
              rowEnd: depth + 1,
              columnStart: start + 1,
              span: 1,
            });
          }
          visit(node.children, level + 1);
        }
      }
    };
    visit(this.result().columnRoot, 0);
    return cells;
  });

  protected readonly columnIndexes = computed<readonly number[]>(() =>
    Array.from({ length: this.result().columnLeafCount }, (_, index) => index)
  );

  private readonly columnSlotFlags = computed<{ total: boolean[]; grand: boolean[] }>(() => {
    const count = this.result().columnLeafCount;
    const total = new Array<boolean>(count).fill(false);
    const grand = new Array<boolean>(count).fill(false);
    const visit = (nodes: readonly PivotAxisNode[]): void => {
      for (const node of nodes) {
        if (node.leafIndex >= 0) {
          total[node.leafIndex] = node.isTotal;
          grand[node.leafIndex] = node.isGrandTotal;
        }
        if (node.children.length) visit(node.children);
      }
    };
    visit(this.result().columnRoot);
    return { total, grand };
  });

  protected columnSlotIsTotal(): readonly boolean[] {
    return this.columnSlotFlags().total;
  }

  protected columnSlotIsGrand(): readonly boolean[] {
    return this.columnSlotFlags().grand;
  }

  private lineOf(node: PivotAxisNode, level: number): PivotAxisLine {
    const messages = this.msg();
    const text = node.isGrandTotal
      ? messages.grandTotal
      : node.isTotal && !node.hasChildren
        ? messages.totalPattern.replace('{0}', node.text || messages.blankValue)
        : node.text || messages.blankValue;
    return {
      text,
      path: node.path,
      level,
      expanded: node.expanded,
      // expanded parents keep their expander even though they carry totals
      hasChildren: node.hasChildren && !node.isGrandTotal,
      isTotal: node.isTotal,
      isGrandTotal: node.isGrandTotal,
    };
  }

  // --- cells ----------------------------------------------------------------

  protected readonly measures = computed(() => this.result().measures);

  protected cellText(rowIndex: number, columnIndex: number, measureIndex: number): string {
    const value = this.result().values[rowIndex]?.[columnIndex]?.[measureIndex];
    if (value == null) return '';
    const measure = this.measures()[measureIndex];
    const fns = this.fieldFns()[measure.id];
    if (fns?.format) return fns.format(value);
    if (measure.summaryDisplayMode?.startsWith('percent')) {
      return `${(Number(value) * 100).toFixed(1)}%`;
    }
    return formatCellValue(value, measure.dataType ?? 'number', undefined);
  }

  protected onCellClick(rowIndex: number, columnIndex: number, event: MouseEvent, dbl = false): void {
    const rowLine = this.rowLines()[rowIndex];
    const columnLine = this.columnSlotLine(columnIndex);
    if (!rowLine || !columnLine) return;
    for (let m = 0; m < this.measures().length; m++) {
      const payload: OgePivotCellClickEvent = {
        rowPath: rowLine.path,
        columnPath: columnLine.path,
        measureIndex: m,
        value: this.result().values[rowIndex]?.[columnIndex]?.[m],
        event,
      };
      if (dbl) this.cellDblClick.emit(payload);
      else this.cellClick.emit(payload);
      break; // one event per cell; measureIndex 0 carries the location
    }
  }

  private columnSlotLine(index: number): PivotAxisLine | undefined {
    const find = (nodes: readonly PivotAxisNode[], level: number): PivotAxisLine | undefined => {
      for (const node of nodes) {
        if (node.leafIndex === index) return this.lineOf(node, level);
        const inChildren = find(node.children, level + 1);
        if (inChildren) return inChildren;
      }
      return undefined;
    };
    return find(this.result().columnRoot, 0);
  }

  /** Raw rows behind a cell — drill-down. */
  drillDown(args: PivotDrillDownArgs): T[] {
    return this.engine().drillDownRows(args.rowPath, args.columnPath);
  }

  protected toggleRow(line: PivotAxisLine, event?: Event): void {
    event?.stopPropagation();
    if (line.hasChildren) this.store.toggleRowPath(line.path);
  }

  protected toggleColumn(cell: PivotHeaderCell, event?: Event): void {
    event?.stopPropagation();
    if (cell.hasChildren) this.store.toggleColumnPath(cell.path);
  }

  expandAll(area: 'row' | 'column'): void {
    const keys = this.engine().allGroupKeys(area);
    if (area === 'row') this.store.setExpansion(keys, this.store.columnExpandedPaths());
    else this.store.setExpansion(this.store.rowExpandedPaths(), keys);
  }

  collapseAll(area: 'row' | 'column'): void {
    const empty: ReadonlySet<string> = new Set();
    if (area === 'row') this.store.setExpansion(empty, this.store.columnExpandedPaths());
    else this.store.setExpansion(this.store.rowExpandedPaths(), empty);
  }

  getFieldLayout(): readonly PivotFieldConfig[] {
    return this.resolvedFields();
  }

  // --- field panel ----------------------------------------------------------

  protected readonly panelAreas = computed(() => {
    const messages = this.msg();
    const fields = this.resolvedFields();
    const inArea = (area: string) =>
      fields
        .filter((field) => field.area === area)
        .sort((a, b) => (a.areaIndex ?? 0) - (b.areaIndex ?? 0));
    return [
      { area: 'filter' as const, label: messages.filterArea, fields: inArea('filter') },
      { area: 'row' as const, label: messages.rowArea, fields: inArea('row') },
      { area: 'column' as const, label: messages.columnArea, fields: inArea('column') },
      { area: 'data' as const, label: messages.dataArea, fields: inArea('data') },
    ];
  });

  private draggedFieldId: string | null = null;

  protected onFieldDragStart(field: PivotFieldConfig, event: DragEvent): void {
    this.draggedFieldId = field.id;
    event.dataTransfer?.setData(PIVOT_FIELD_DRAG_TYPE, field.id);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  protected onAreaDragOver(event: DragEvent): void {
    if (this.draggedFieldId) event.preventDefault();
  }

  protected onAreaDrop(area: 'row' | 'column' | 'data' | 'filter', event: DragEvent): void {
    const id = this.draggedFieldId;
    this.draggedFieldId = null;
    if (!id) return;
    event.preventDefault();
    const count = this.resolvedFields().filter((field) => field.area === area).length;
    this.store.moveField(id, area, count);
    this.fieldLayoutChange.emit(this.resolvedFields());
  }

  protected onFieldDragEnd(): void {
    this.draggedFieldId = null;
  }
}
