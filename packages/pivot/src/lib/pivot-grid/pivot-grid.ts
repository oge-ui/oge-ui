import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  computed,
  contentChildren,
  effect,
  inject,
  input,
  output,
  untracked,
  viewChild,
} from '@angular/core';
import type {
  OgePivotStore,
  PivotArea,
  PivotCsvOptions,
  PivotDrillDownArgs,
  PivotFieldConfig,
  PivotGridStateSnapshot,
  PivotResult,
} from '@oge-ui/core';
import {
  OGE_STATE_STORAGE,
  createStatePersistence,
} from '@oge-ui/grid/foundation';
import {
  OgePivotGridCore,
  type OgePivotAxisLine,
  type OgePivotCellClickEvent,
  type OgePivotCellPrepared,
  type OgePivotFieldChooserOptions,
  type OgePivotFieldDef,
  type OgePivotHeaderCell,
  type OgePivotMenuItem,
} from '@oge-ui/pivot-engine';
import { OGE_PIVOT_MESSAGES, type OgePivotMessages } from './pivot-config';
import { OgePivotField } from './pivot-field';
import { OgePivotStateStore } from './pivot-state.store';
import { SIGNAL_ADAPTER } from './signal-adapter';

// The shapes below are framework-free and live in `@oge-ui/pivot-engine`
// (ADR 0003) — re-exported because they are public API of this package.
export {
  OGE_PIVOT_FIELD_DRAG_TYPE,
  type OgePivotAxisLine,
  type OgePivotCellClickEvent,
  type OgePivotCellPrepared,
  type OgePivotFieldChooserOptions,
  type OgePivotFieldDef,
  type OgePivotHeaderCell,
  type OgePivotMenuItem,
} from '@oge-ui/pivot-engine';

/** Reads one `<oge-pivot-field>` directive into its data form. */
function fieldDefOf<T>(directive: OgePivotField<T>): OgePivotFieldDef<T> {
  return {
    dataField: directive.dataField(),
    id: directive.id(),
    caption: directive.caption(),
    area: directive.area(),
    areaIndex: directive.areaIndex(),
    dataType: directive.dataType(),
    groupInterval: directive.groupInterval(),
    summaryType: directive.summaryType(),
    summaryName: directive.summaryName(),
    summaryDisplayMode: directive.summaryDisplayMode(),
    runningTotal: directive.runningTotal(),
    calculateCustomSummary: directive.calculateCustomSummary(),
    sortOrder: directive.sortOrder(),
    sortBySummaryField: directive.sortBySummaryField(),
    sortBySummaryPath: directive.sortBySummaryPath(),
    filterValues: directive.filterValues(),
    filterType: directive.filterType(),
    showTotals: directive.showTotals(),
    selector: directive.selector(),
    format: directive.format(),
    customizeText: directive.customizeText(),
  };
}

/**
 * Pivot grid: local array data or a remote `OgePivotStore`, four field areas,
 * multi-level column headers with spans, tree-layout row headers,
 * expand/collapse on both axes, sub/grand totals, a collapsible drag & drop
 * field panel, header/measure menus, value filters, a field chooser and
 * two-axis virtualization.
 *
 * Everything below the template runs in `@oge-ui/pivot-engine`'s
 * `OgePivotGridCore`, the same machine `@oge-ui/react-pivot` renders.
 *
 * ```html
 * <oge-pivot-grid [data]="sales">
 *   <oge-pivot-field dataField="region" area="row" />
 *   <oge-pivot-field dataField="amount" area="data" summaryType="sum" />
 * </oge-pivot-grid>
 * ```
 */
@Component({
  selector: 'oge-pivot-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-pivot-grid',
    '(document:click)': 'onDocumentClick($event)',
    '(keydown.escape)': 'closePopups()',
  },
  templateUrl: './pivot-grid.html',
  styleUrl: './pivot-grid.scss',
})
export class OgePivotGrid<T = unknown> {
  /** Local rows, or any {@link OgePivotStore} for remote (pre-aggregated) data. */
  readonly data = input<readonly T[] | OgePivotStore<T>>([]);
  /**
   * Fields as data — the programmatic twin of `<oge-pivot-field>` children,
   * appended after them (content queries cannot see children projected
   * through a wrapper component).
   */
  readonly fields = input<readonly OgePivotFieldDef<T>[]>([]);
  readonly virtualScrolling = input(false);
  readonly showRowTotals = input(true);
  readonly showColumnTotals = input(true);
  readonly showRowGrandTotals = input(true);
  readonly showColumnGrandTotals = input(true);
  readonly fieldPanel = input(true);
  readonly messages = input<Partial<OgePivotMessages>>({});
  /** Conditional appearance hook: mutate `text` / `cssClass` per cell. */
  readonly customizeCell = input<(cell: OgePivotCellPrepared) => void>();
  /** Persists the field layout + expansion under this key (`OGE_STATE_STORAGE`). */
  readonly stateKey = input<string | undefined>(undefined);
  /** Field-chooser dialog behavior. */
  readonly fieldChooser = input<OgePivotFieldChooserOptions>({});
  /** Debounced notification whenever the persistable state changes. */
  readonly stateChange = output<PivotGridStateSnapshot>();

  readonly cellClick = output<OgePivotCellClickEvent>();
  readonly cellDblClick = output<OgePivotCellClickEvent>();
  readonly fieldLayoutChange = output<readonly PivotFieldConfig[]>();

  protected readonly store = new OgePivotStateStore();
  private readonly defaultMessages = inject(OGE_PIVOT_MESSAGES);
  protected readonly msg = computed<OgePivotMessages>(() => ({
    ...this.defaultMessages,
    ...this.messages(),
  }));

  protected readonly fieldDirectives = contentChildren(OgePivotField<T>);

  private readonly fieldDefs = computed<readonly OgePivotFieldDef<T>[]>(() => [
    ...this.fieldDirectives().map((directive) => fieldDefOf(directive)),
    ...this.fields(),
  ]);

  /** The shared machine; every protected member below reads through it. */
  private readonly core = new OgePivotGridCore<T>(SIGNAL_ADAPTER, {
    store: this.store,
    inputs: {
      data: () => this.data(),
      fields: () => this.fieldDefs(),
      virtualScrolling: () => this.virtualScrolling(),
      showRowTotals: () => this.showRowTotals(),
      showColumnTotals: () => this.showColumnTotals(),
      showRowGrandTotals: () => this.showRowGrandTotals(),
      showColumnGrandTotals: () => this.showColumnGrandTotals(),
      messages: () => this.msg(),
      customizeCell: () => this.customizeCell(),
      fieldChooser: () => this.fieldChooser(),
    },
    fieldLayoutChange: (fields) => this.fieldLayoutChange.emit(fields),
  });

  // --- template surface (all owned by the core) ------------------------------

  protected readonly resolvedFields = this.core.resolvedFields;
  protected readonly isRemote = this.core.isRemote;
  protected readonly loading = this.core.loading;
  protected readonly result = this.core.result;
  protected readonly scrollPos = this.core.scrollPos;
  protected readonly viewportSize = this.core.viewportSize;
  protected readonly rowWindow = this.core.rowWindow;
  protected readonly columnWindow = this.core.columnWindow;
  protected readonly virtualColumnWidth = this.core.virtualColumnWidth;
  protected readonly visibleRowIndexes = this.core.visibleRowIndexes;
  protected readonly visibleColumnIndexes = this.core.visibleColumnIndexes;
  protected readonly visibleHeaderCells = this.core.visibleHeaderCells;
  protected readonly visibleHeaderRows = this.core.visibleHeaderRows;
  protected readonly matrixTemplate = this.core.matrixTemplate;
  protected readonly rowLines = this.core.rowLines;
  protected readonly columnLines = this.core.columnLines;
  protected readonly columnDepth = this.core.columnDepth;
  protected readonly columnHeaderCells = this.core.columnHeaderCells;
  protected readonly measures = this.core.measures;
  protected readonly focusedCell = this.core.focusedCell;
  protected readonly panelAreas = this.core.panelAreas;
  protected readonly menu = this.core.menu;
  protected readonly filterPopup = this.core.filterPopup;
  protected readonly filterSearch = this.core.filterSearch;
  protected readonly visibleFilterValues = this.core.visibleFilterValues;
  protected readonly chooserOpen = this.core.chooserOpen;
  protected readonly chooserSearch = this.core.chooserSearch;
  protected readonly chooserDraft = this.core.chooserDraft;
  protected readonly chooserFields = this.core.chooserFields;
  protected readonly chooserAllFields = this.core.chooserAllFields;

  protected readonly viewportRef =
    viewChild<ElementRef<HTMLElement>>('pivotViewport');

  constructor() {
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => this.core.dispose());
    createStatePersistence<PivotGridStateSnapshot>({
      stateKey: this.stateKey,
      prefix: 'oge-pivot',
      storage: inject(OGE_STATE_STORAGE),
      snapshot: computed(() => this.core.persistedSnapshot()),
      apply: (snapshot) => this.applyState(snapshot),
      beforeRestore: () => this.fieldDirectives(),
      onChange: (snapshot) => this.stateChange.emit(snapshot),
    });
    // remote load: layout or expansion changes issue one (abortable) request
    effect(() => {
      const request = this.core.remoteRequest();
      untracked(() => this.core.load(request));
    });
    afterNextRender(() => {
      const viewport = this.viewportRef()?.nativeElement;
      if (!viewport || typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(() => {
        this.core.viewportSize.set({
          width: viewport.clientWidth,
          height: viewport.clientHeight,
        });
      });
      observer.observe(viewport);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  // --- public API -------------------------------------------------------------

  /** Current persistable UI state: field layout + expansion. */
  state(): PivotGridStateSnapshot {
    return untracked(() => this.core.state());
  }

  /** Applies a previously captured state snapshot. */
  applyState(snapshot: PivotGridStateSnapshot): void {
    untracked(() => this.core.applyState(snapshot));
  }

  /** The materialized pivot exactly as rendered — for custom export integrations. */
  getResult(): PivotResult {
    return untracked(() => this.core.getResult());
  }

  /** CSV of exactly what is on screen (multi-level headers flattened). */
  getCsv(options?: PivotCsvOptions): string {
    return untracked(() => this.core.getCsv(options));
  }

  /** Downloads the current view as a CSV file. */
  exportCsv(filename = 'pivot.csv'): void {
    untracked(() => this.core.exportCsv(filename));
  }

  /** Raw rows behind a cell — drill-down. */
  drillDown(args: PivotDrillDownArgs): T[] {
    return untracked(() => this.core.drillDown(args));
  }

  expandAll(area: 'row' | 'column'): void {
    untracked(() => this.core.expandAll(area));
  }

  collapseAll(area: 'row' | 'column'): void {
    untracked(() => this.core.collapseAll(area));
  }

  getFieldLayout(): readonly PivotFieldConfig[] {
    return untracked(() => this.core.getFieldLayout());
  }

  /** Opens the field-chooser dialog. */
  showFieldChooser(): void {
    untracked(() => this.core.showFieldChooser());
  }

  // --- template handlers --------------------------------------------------------

  protected onViewportScroll(event: Event): void {
    if (!this.virtualScrolling()) return;
    const target = event.target as HTMLElement;
    this.core.scrollPos.set({ top: target.scrollTop, left: target.scrollLeft });
  }

  protected columnSlotIsTotal(): readonly boolean[] {
    return this.core.columnSlotFlags().total;
  }

  protected columnSlotIsGrand(): readonly boolean[] {
    return this.core.columnSlotFlags().grand;
  }

  protected cellText(
    rowIndex: number,
    columnIndex: number,
    measureIndex: number,
  ): string {
    return this.core.preparedCell(rowIndex, columnIndex, measureIndex).text;
  }

  protected cellClass(
    rowIndex: number,
    columnIndex: number,
    measureIndex: number,
  ): string | null {
    return (
      this.core.preparedCell(rowIndex, columnIndex, measureIndex).cssClass ??
      null
    );
  }

  protected onCellClick(
    rowIndex: number,
    columnIndex: number,
    event: MouseEvent,
    dbl = false,
  ): void {
    const payload = this.core.cellClickPayload(rowIndex, columnIndex, event);
    if (!payload) return;
    if (dbl) this.cellDblClick.emit(payload);
    else this.cellClick.emit(payload);
  }

  protected toggleRow(line: OgePivotAxisLine, event?: Event): void {
    event?.stopPropagation();
    if (event instanceof KeyboardEvent) event.preventDefault();
    this.core.toggleRow(line);
  }

  protected toggleColumn(cell: OgePivotHeaderCell, event?: Event): void {
    event?.stopPropagation();
    if (event instanceof KeyboardEvent) event.preventDefault();
    this.core.toggleColumn(cell);
  }

  protected isCellTabbable(row: number, col: number): boolean {
    return this.core.isCellTabbable(row, col);
  }

  protected onCellFocus(row: number, col: number): void {
    this.core.focusCell(row, col);
  }

  protected onMatrixKeydown(event: KeyboardEvent): void {
    const outcome = this.core.matrixKeydown(event.key);
    if (!outcome) return;
    event.preventDefault();
    if (!outcome.moved) return;
    const { row, col } = outcome.cell;
    // move DOM focus to the newly tabbable cell
    setTimeout(() => {
      const host = (event.target as HTMLElement).closest('.oge-pivot-matrix');
      const next = host?.querySelector<HTMLElement>(
        `[data-cell="${String(row)}-${String(col)}"]`,
      );
      next?.focus();
    });
  }

  protected onFieldDragStart(field: PivotFieldConfig, event: DragEvent): void {
    this.core.fieldDragStart(field, event);
  }

  protected onAreaDragOver(event: DragEvent): void {
    this.core.areaDragOver(event);
  }

  protected onAreaDrop(area: PivotArea | null, event: DragEvent): void {
    this.core.areaDrop(area, event);
  }

  protected onFieldDragEnd(): void {
    this.core.fieldDragEnd();
  }

  protected closePopups(): void {
    this.core.closePopups();
  }

  /** Outside clicks close the menu/popup; clicks inside them (or menu actions
   *  that just opened a popup) must not. */
  protected onDocumentClick(event: Event): void {
    this.core.documentClick(event.target);
  }

  protected runMenuItem(item: OgePivotMenuItem): void {
    this.core.runMenuItem(item);
  }

  /** Right-click on an axis header: sort / sortBySummary / filter / layout items. */
  protected onHeaderContextMenu(
    axis: 'row' | 'column',
    line: OgePivotAxisLine,
    event: MouseEvent,
  ): void {
    this.core.openHeaderMenu(axis, line, event);
  }

  /** Right-click on a measure chip: summary type + display mode. */
  protected onMeasureContextMenu(
    field: PivotFieldConfig,
    event: MouseEvent,
  ): void {
    this.core.openMeasureMenu(field, event);
  }

  protected filterValueText(value: unknown): string {
    return this.core.filterValueText(value);
  }

  protected toggleFilterValue(value: unknown): void {
    this.core.toggleFilterValue(value);
  }

  protected toggleAllFilterValues(): void {
    this.core.toggleAllFilterValues();
  }

  protected setFilterType(type: 'include' | 'exclude'): void {
    this.core.setFilterType(type);
  }

  protected applyFilterPopup(): void {
    this.core.applyFilterPopup();
  }

  protected clearFilterPopup(): void {
    this.core.clearFilterPopup();
  }

  protected closeFieldChooser(): void {
    this.core.closeFieldChooser();
  }

  protected applyFieldChooser(): void {
    this.core.applyFieldChooser();
  }

  protected chooserAreaFields(area: PivotArea): readonly PivotFieldConfig[] {
    return this.core.chooserAreaFields(area);
  }
}
