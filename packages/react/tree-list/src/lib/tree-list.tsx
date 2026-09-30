'use client';

import {
  Fragment,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useReducer,
  useRef,
  type ForwardedRef,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';
import {
  buildSearchHighlightSegments,
  type CsvOptions,
  foldText,
  type DataRowNode,
  type FilterOperator,
  type RowKey,
  type RowNode,
  type TreeListStateSnapshot,
} from '@oge-ui/core';
import {
  OgeContextMenuEcho,
  OgeGridColumnLayoutCore,
  OgeGridDataCore,
  OgeGridKeyboardNavCore,
  OgeGridRowVirtualizerCore,
  OgeGridStateCore,
  OgeGridStatePersistenceCore,
  OgeTreeListCore,
  adaptiveHiddenColumnIds,
  allHeaderValuesSelected,
  builderToExpr,
  dateFilterExpr,
  describeExpr,
  effectiveFilterOperator,
  exprToBuilder,
  filterOperatorSymbol,
  filterRowOperatorChoices,
  formatCellValue,
  headerGroupState,
  humanize,
  isHeaderValueSelected,
  isOgeContextMenuKey,
  lookupTextOf,
  ogeContextMenuKeyTarget,
  ogeGridBandRow,
  ogeTreeCsv,
  ogeTreeDropPosition,
  ogeTreeHeaderValueGroups,
  ogeTreeHeaderValueText,
  operatorsFor,
  resolveOgeGridColumns,
  rowClickSelectionIntent,
  rowFilterExpr,
  toggleAllHeaderValues,
  toggleHeaderGroup,
  toggleHeaderValue,
  type OgeBuilderGroup,
  type OgeContextMenuSource,
  type OgeExportingEvent,
  type OgeFilterBuilderField,
  type OgeGridColumnSpec,
  type OgeGridMessages,
  type OgeGridResolvedColumn,
  type OgeMenuItem,
  type OgePagingOptions,
  type OgeSearchPanelOptions,
  type OgeTreeDropPosition,
  type OgeTreeExportData,
  type OgeTreeInitNewRowEvent,
} from '@oge-ui/behavior';
import {
  OgeCheckBox,
  OgeDateBox,
  OgeNumberBox,
  OgeSelectBox,
  OgeTextBox,
} from '@oge-ui/react-inputs';
import { OgeForm } from '@oge-ui/react-forms';
import { OgeToolbar } from '@oge-ui/react-layout';
import {
  OgeMenuList,
  OgeModal,
  OgePopup,
  useAnchoredPanel,
} from '@oge-ui/react-overlay';
import {
  OgeCellEditor,
  OgePager,
  useOgeGridConfig,
  useOgeGridStateStorage,
  type OgeCommandButton,
  type OgeGridColumnProps,
} from '@oge-ui/react-grid';
import {
  OgeFilterBuilderGroup,
  OgeGridEditingModel,
  createGridRxAdapter,
} from '@oge-ui/react-grid/foundation';
import type { OgeTreeListHandle, OgeTreeListProps } from './tree-list-types';
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect';

// the same leading/trailing widths the Angular tree list lays out with
// (`@oge-ui/grid/foundation`'s constants)
const CHECKBOX_WIDTH = 36;
const COMMAND_WIDTH = 90;
const DRAG_WIDTH = 28;
const COLUMN_DRAG_TYPE = 'application/x-oge-column';

type Slot<T> = OgeGridColumnProps<T>['renderCell'];
type ResolvedColumn<T> = OgeGridResolvedColumn<
  T,
  Slot<T>,
  OgeGridColumnProps<T>
>;

/** The column list as column objects (plain field names expanded). */
function normalizeColumns<T>(
  columns: OgeTreeListProps<T & object>['columns'],
): readonly OgeGridColumnProps<T>[] | undefined {
  if (!columns) return undefined;
  return columns.map((column) =>
    typeof column === 'string' ? { field: column } : column,
  ) as readonly OgeGridColumnProps<T>[];
}

/** Command-column glyph — the Angular template's inline 13px stroke icon. */
const commandIcon = (paths: readonly string[], width = 2) => (
  <svg
    viewBox="0 0 16 16"
    width="13"
    height="13"
    fill="none"
    stroke="currentColor"
    strokeWidth={width}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {paths.map((d) => (
      <path key={d} d={d} />
    ))}
  </svg>
);

const sameKeys = (keys: readonly RowKey[], set: ReadonlySet<RowKey>): boolean =>
  keys.length === set.size && keys.every((key) => set.has(key));

function OgeTreeListInner<T extends object>(
  props: OgeTreeListProps<T>,
  ref: ForwardedRef<OgeTreeListHandle<T>>,
): ReactElement {
  const config = useOgeGridConfig();
  const contextStorage = useOgeGridStateStorage();
  const [, rerender] = useReducer((n: number) => n + 1, 0);

  // The machines read live props through this ref, so inline objects and
  // callbacks stay current without recreating them.
  const latest = useRef(props);
  latest.current = props;
  const configRef = useRef(config);
  configRef.current = config;
  const contextStorageRef = useRef(contextStorage);
  contextStorageRef.current = contextStorage;
  const hostRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const msg = useMemo<OgeGridMessages>(
    () => ({ ...config.messages, ...props.messages }),
    [config.messages, props.messages],
  );
  const msgRef = useRef(msg);
  msgRef.current = msg;

  // --- the model: every derived value, built once ---------------------------
  const model = useMemo(() => {
    const rx = createGridRxAdapter(() => rerender());
    const p = () => latest.current;
    const cfg = () => configRef.current;

    const state = new OgeGridStateCore(rx);
    const data = new OgeGridDataCore<T>({ loadOptions: state.loadOptions }, rx);

    const scrollTop = rx.cell(0);
    const scrollLeft = rx.cell(0);
    // the Angular tree list starts from the same assumed viewport, so the
    // first (server) paint renders the same row window
    const viewportHeight = rx.cell(400);
    const hostWidth = rx.cell(0);
    const detectedRtl = rx.cell(false);
    const customLoadingMessage = rx.cell<string | null>(null);
    const focusedRowKeyCell = rx.cell<RowKey | null>(null);
    const pageIndex = rx.cell(0);
    const rowFilterOps = rx.cell<ReadonlyMap<string, FilterOperator>>(
      new Map(),
    );
    const operatorMenu = rx.cell<{
      column: ResolvedColumn<T>;
      anchor: HTMLElement;
    } | null>(null);
    const headerDropTargetId = rx.cell<string | null>(null);
    const dropTarget = rx.cell<{
      key: RowKey;
      position: OgeTreeDropPosition;
    } | null>(null);
    const headerFilterField = rx.cell<string | null>(null);
    const headerFilterAnchor = rx.cell<HTMLElement | null>(null);
    const headerFilterSearch = rx.cell('');
    const contextMenu = rx.cell<{
      x: number;
      y: number;
      items: OgeMenuItem[];
    } | null>(null);
    const chooserOpen = rx.cell(false);
    const chooserAnchor = rx.cell<HTMLElement | null>(null);
    const chooserDropTargetId = rx.cell<string | null>(null);
    /** Chooser/header-menu visibility writes by field, over the column prop. */
    const visibilityOverrides = rx.cell<ReadonlyMap<string, boolean>>(
      new Map(),
    );
    const builderOpen = rx.cell(false);
    const builderVersion = rx.cell(0);
    let builderTree: OgeBuilderGroup = {
      kind: 'group',
      logic: 'and',
      items: [],
    };

    const rtl = rx.derived(() => p().rtlEnabled ?? detectedRtl());
    const effRowHeight = rx.derived(() => p().rowHeight ?? cfg().rowHeight);
    const effOverscan = rx.derived(() => p().overscan ?? cfg().overscan);
    const effColumnMinWidth = rx.derived(
      () => p().columnMinWidth ?? cfg().columnMinWidth,
    );
    const sortMode = rx.derived<'none' | 'single' | 'multi'>(() => {
      const explicit = p().sorting?.mode;
      if (explicit) return explicit;
      const shorthand = p().sortable ?? true;
      if (shorthand === false) return 'none';
      return shorthand === true ? 'multi' : shorthand;
    });
    const allowUnsorting = rx.derived(
      () => p().sorting?.allowUnsorting ?? cfg().allowUnsorting,
    );
    const virtualized = rx.derived(() => p().virtualScroll === true);
    const filterRowVisible = rx.derived(() => {
      const value = p().filterRow ?? false;
      return typeof value === 'boolean' ? value : value.visible !== false;
    });
    const effFilterDebounce = rx.derived(() => {
      const row = p().filterRow;
      const fromOptions = typeof row === 'object' ? row.debounce : undefined;
      return fromOptions ?? p().filterDebounce ?? cfg().filterDebounce;
    });
    const searchPanelVisible = rx.derived(() => {
      const value = p().searchPanel ?? false;
      return typeof value === 'boolean' ? value : value.visible !== false;
    });
    const searchPanelOptions = rx.derived<OgeSearchPanelOptions>(() => {
      const value = p().searchPanel;
      return typeof value === 'object' ? value : {};
    });
    const headerFilterVisible = rx.derived(() => {
      const value = p().headerFilter ?? false;
      return typeof value === 'boolean' ? value : value.visible !== false;
    });
    const effHeaderFilterLimit = rx.derived(() => {
      const value = p().headerFilter;
      return (
        (typeof value === 'object' ? value.valueLimit : undefined) ??
        cfg().headerFilterValueLimit
      );
    });
    const pagingOptions = rx.derived<OgePagingOptions | null>(() => {
      const value = p().paging ?? false;
      return value === false ? null : value;
    });
    const selectionMode = rx.derived(() => p().selectionMode ?? 'none');
    const hasCheckboxColumn = rx.derived(() => selectionMode() === 'checkbox');
    const rowDragging = rx.derived(() => p().rowDragging === true);
    const columnReorder = rx.derived(() => p().columnReorder !== false);
    const leadingCellCount = rx.derived(
      () => (rowDragging() ? 1 : 0) + (hasCheckboxColumn() ? 1 : 0),
    );
    const leadingWidth = rx.derived(
      () =>
        (rowDragging() ? DRAG_WIDTH : 0) +
        (hasCheckboxColumn() ? CHECKBOX_WIDTH : 0),
    );
    const leadingTracks = rx.derived<readonly string[]>(() => {
      const tracks: string[] = [];
      if (rowDragging()) tracks.push(`${DRAG_WIDTH}px`);
      if (hasCheckboxColumn()) tracks.push(`${CHECKBOX_WIDTH}px`);
      return tracks;
    });

    // --- columns ---
    const declaredColumns = rx.derived(() => normalizeColumns<T>(p().columns));

    /** Effective visibility: a chooser write wins over the column prop. */
    const columnVisible = (column: OgeGridColumnProps<T>): boolean => {
      const override =
        column.field !== undefined
          ? visibilityOverrides().get(column.field)
          : undefined;
      return override ?? column.visible !== false;
    };

    const columnSpecs = rx.derived<
      readonly OgeGridColumnSpec<T, Slot<T>, OgeGridColumnProps<T>>[]
    >(() =>
      (declaredColumns() ?? []).map((column) => ({
        field: column.field,
        caption: column.caption,
        width: column.width,
        dataType: column.dataType ?? 'string',
        alignment: column.alignment,
        format: column.format,
        visible: columnVisible(column),
        sortable: column.sortable !== false,
        filterable: column.filterable !== false,
        filterOperator: column.filterOperator,
        minWidth: column.minWidth,
        lookup: column.lookup,
        calculateCellValue: column.calculateCellValue,
        calculateFilterExpression: column.calculateFilterExpression,
        hidingPriority: column.hidingPriority,
        pinned: column.pinned ?? false,
        editable: column.editable !== false,
        cellTemplate: column.renderCell,
        // header and editor slots have their own context shapes, so the
        // render layer reads them off `source` instead of the one-slot field
        headerTemplate: undefined,
        editTemplate: undefined,
        bandCaption: column.bandCaption,
        source: column,
      })),
    );

    const adaptiveHiddenIds = rx.derived(() =>
      adaptiveHiddenColumnIds({
        columns: columnSpecs(),
        hostWidth: hostWidth(),
        defaultMinWidth: effColumnMinWidth(),
        leadingWidth: leadingWidth(),
      }),
    );

    const resolvedColumns = rx.derived<ResolvedColumn<T>[]>(() =>
      resolveOgeGridColumns<T, Slot<T>, OgeGridColumnProps<T>>({
        specs: columnSpecs(),
        columnDefs: () => undefined,
        // auto-derived columns read the first *loaded* row: the flattened
        // rows depend on the columns themselves (the search panel), and the
        // loaded payload carries the same keys
        firstDataRow: () => data.result()?.data[0] as T | undefined,
        widthOverrides: state.columns.widthOverrides(),
        pinOverrides: state.columns.pinOverrides(),
        order: state.columns.order(),
        adaptiveHiddenIds: adaptiveHiddenIds(),
      }),
    );

    // --- the tree model (shared with the Angular tree list) ---
    const core = new OgeTreeListCore<T>(
      {
        data: () => p().data ?? [],
        keyExpr: () => p().keyExpr ?? 'id',
        parentIdExpr: () => p().parentIdExpr ?? 'parentId',
        rootValue: () => (p().rootValue === undefined ? null : p().rootValue),
        orphanPolicy: () => p().orphanPolicy ?? 'discard',
        autoExpandAll: () => p().autoExpandAll === true,
        hasItemsExpr: () => p().hasItemsExpr,
        itemsExpr: () => p().itemsExpr,
        loadMode: () => p().loadMode,
        filterMode: () => p().filterMode ?? 'withAncestors',
        expandNodesOnFiltering: () => p().expandNodesOnFiltering !== false,
        selectionRecursive: () => p().selectionRecursive === true,
        paging: pagingOptions,
        searchColumns: resolvedColumns,
        state,
        result: data.result,
        pageIndex,
        onError: (err) => data.error.set(err),
      },
      rx,
    );

    /** Adjacent columns sharing a `bandCaption` merge into one spanning cell. */
    const bandRow = rx.derived(() => ogeGridBandRow(resolvedColumns()));

    const colVirtualized = rx.derived(
      () =>
        p().columnRenderingMode === 'virtual' &&
        // bands and pinned columns rely on every column being in the DOM
        bandRow() === null &&
        resolvedColumns().every((column) => column.pinned === false),
    );

    const editing = new OgeGridEditingModel<T, Slot<T>>(
      {
        editing: () => p().editing ?? false,
        state: state.editing,
        columns: resolvedColumns,
        flatNodes: core.flatNodes,
        source: data.source,
        confirmDeleteMessage: () => msgRef.current.confirmDelete,
        requiredMessage: () => msgRef.current.requiredError,
        events: {
          savingChanges: (event) => p().onSavingChanges?.(event),
          savedChanges: (event) => p().onSavedChanges?.(event),
          editingStart: (event) => p().onEditingStart?.(event),
          rowInserting: (event) => p().onRowInserting?.(event),
          rowInserted: (event) => p().onRowInserted?.(event),
          rowUpdating: (event) => p().onRowUpdating?.(event),
          rowUpdated: (event) => p().onRowUpdated?.(event),
          rowRemoving: (event) => p().onRowRemoving?.(event),
          rowRemoved: (event) => p().onRowRemoved?.(event),
          editCanceled: () => p().onEditCanceled?.(),
          dataError: (error) => p().onDataErrorOccurred?.({ error }),
        },
        // saved rows may live in the lazy child cache — drop it so the reload
        // re-fetches open levels and the UI shows the persisted values
        reload: () => {
          core.deferredLoader.reset();
          data.reload();
        },
      },
      rx,
    );

    /** Trailing command cell: editing actions or custom command buttons. */
    const hasCommandColumn = rx.derived(
      () =>
        (editing.editingOptions() !== null &&
          (editing.canUpdate() || editing.canDelete())) ||
        (p().commandButtons?.length ?? 0) > 0,
    );

    /** Custom buttons win; otherwise edit/delete derive from the edit mode. */
    const effCommandButtons = rx.derived<readonly OgeCommandButton<T>[]>(() => {
      const custom = p().commandButtons;
      if (custom?.length) return custom;
      const mode = editing.editMode();
      const buttons: OgeCommandButton<T>[] = [];
      if (
        (mode === 'row' || mode === 'popup' || mode === 'form') &&
        editing.canUpdate()
      )
        buttons.push({ name: 'edit' });
      if (mode && editing.canDelete()) buttons.push({ name: 'delete' });
      return buttons;
    });

    const layout = new OgeGridColumnLayoutCore<ResolvedColumn<T>>(
      {
        resolvedColumns,
        colVirtualized,
        scrollLeft,
        hostWidth,
        leadingTracks,
        trailingTracks: () =>
          hasCommandColumn() ? [`${COMMAND_WIDTH}px`] : [],
        leadingWidth,
        defaultMinWidth: effColumnMinWidth,
        pinnedDefaultWidth: () => cfg().pinnedDefaultWidth,
      },
      rx,
    );

    const virtualizer = new OgeGridRowVirtualizerCore<T>(
      {
        flatNodes: core.renderNodes,
        virtualized,
        scrollTop,
        setScrollTop: (value) => scrollTop.set(value),
        viewportHeight,
        rowHeight: effRowHeight,
        detailRowHeight: () => cfg().detailRowHeight,
        overscan: effOverscan,
        autoRowHeight: () => false,
        viewport: () => viewportRef.current,
      },
      rx,
    );

    // late-bound: the toggle pipeline reads the latest callbacks
    let toggleRow: (node: DataRowNode<T>, expand: boolean) => void = () =>
      undefined;
    const keyboard = new OgeGridKeyboardNavCore<T>(
      {
        flatNodes: core.renderNodes,
        columnCount: () => resolvedColumns().length,
        rtl,
        pageSize: () =>
          Math.max(1, Math.floor(viewportHeight() / effRowHeight()) - 1),
        tree: core.keyboardTreeHooks((node, expand) => toggleRow(node, expand)),
      },
      rx,
    );

    /**
     * Fields the form/popup editors render, resolved from `editing.formItems`
     * (selection, order, labels, spans) — default: every editable column.
     */
    const editFormItems = rx.derived<
      readonly { column: ResolvedColumn<T>; label: string; colSpan: number }[]
    >(() => {
      const editable = resolvedColumns().filter(
        (column) => column.editable && column.field,
      );
      const items = editing.editingOptions()?.formItems;
      if (!items?.length) {
        return editable.map((column) => ({
          column,
          label: column.caption,
          colSpan: 1,
        }));
      }
      return items.flatMap((entry) => {
        const spec = typeof entry === 'string' ? { field: entry } : entry;
        const column = editable.find(
          (candidate) => candidate.field === spec.field,
        );
        if (!column) return [];
        return [
          {
            column,
            label: spec.label ?? column.caption,
            colSpan: Math.max(1, spec.colSpan ?? 1),
          },
        ];
      });
    });

    /** The row rendered as an inline edit form or in the popup, if any. */
    const editFormNode = rx.derived<DataRowNode<T> | null>(() => {
      const mode = editing.editMode();
      if (mode !== 'form' && mode !== 'popup') return null;
      const key = state.editing.editRowKey();
      if (key === null) return null;
      return core.dataNodeByKey(key) ?? null;
    });

    /** Layout columns for the edit form; `'auto'` keeps the auto-fit default. */
    const editFormColCount = rx.derived<number | 'auto'>(() => {
      const count = editing.editingOptions()?.formColCount;
      return count && count > 0 ? count : 'auto';
    });

    const builderFields = rx.derived<OgeFilterBuilderField[]>(() =>
      resolvedColumns()
        .filter((column) => column.filterable && column.field)
        .map((column) => ({
          field: column.field as string,
          caption: column.caption,
          dataType: column.dataType,
        })),
    );

    /** Chooser rows: every column with its id and caption, in display order. */
    const chooserEntries = rx.derived<
      readonly {
        id: string;
        caption: string;
        column: OgeGridColumnProps<T> | undefined;
      }[]
    >(() => {
      const declared = declaredColumns() ?? [];
      const entries = declared.length
        ? declared.map((column, index) => ({
            id: column.field ?? `col-${index}`,
            caption:
              column.caption ?? (column.field ? humanize(column.field) : ''),
            column: column as OgeGridColumnProps<T> | undefined,
          }))
        : resolvedColumns().map((column) => ({
            id: column.id,
            caption: column.caption,
            column: undefined,
          }));
      const order = state.columns.order();
      if (!order) return entries;
      return [...entries].sort((a, b) => {
        const ia = order.indexOf(a.id);
        const ib = order.indexOf(b.id);
        return (
          (ia < 0 ? Number.MAX_SAFE_INTEGER : ia) -
          (ib < 0 ? Number.MAX_SAFE_INTEGER : ib)
        );
      });
    });

    const headerFilterColumn = rx.derived<ResolvedColumn<T> | null>(() => {
      const field = headerFilterField();
      if (field === null) return null;
      return resolvedColumns().find((column) => column.field === field) ?? null;
    });

    /** Distinct raw values of the open column over all loaded rows. */
    const headerValues = rx.derived<readonly unknown[]>(() => {
      const column = headerFilterColumn();
      if (!column) return [];
      return core.distinctValues(column.accessor, effHeaderFilterLimit());
    });

    // --- persistence ---
    /** Store snapshot + column visibility + expansion (paging/grouping don't apply). */
    const persistedSnapshot = rx.derived<TreeListStateSnapshot>(() => {
      const base = { ...state.snapshot() };
      delete base.group;
      delete base.paging;
      const hidden = (declaredColumns() ?? [])
        .filter((column) => !columnVisible(column))
        .map((column) => column.field)
        .filter((field): field is string => field != null);
      return {
        ...base,
        columns: { ...base.columns, hidden },
        expansion: core.expansionSnapshot(),
      };
    });

    function applyState(snapshot: TreeListStateSnapshot): void {
      state.applySnapshot(snapshot);
      core.applyExpansionSnapshot(snapshot);
      const hidden = new Set(snapshot.columns?.hidden ?? []);
      const next = new Map<string, boolean>();
      for (const column of declaredColumns() ?? []) {
        if (column.field) next.set(column.field, !hidden.has(column.field));
      }
      visibilityOverrides.set(next);
    }

    const persistence = new OgeGridStatePersistenceCore<TreeListStateSnapshot>({
      prefix: 'oge-tree-list',
      get storage() {
        return latest.current.stateStorage ?? contextStorageRef.current;
      },
      snapshot: () => persistedSnapshot(),
      stateKey: () => latest.current.stateKey,
      apply: (snapshot) => applyState(snapshot),
      onChange: (snapshot) => latest.current.onStateChange?.(snapshot),
    });

    return {
      rx,
      state,
      data,
      core,
      scrollTop,
      scrollLeft,
      viewportHeight,
      hostWidth,
      detectedRtl,
      customLoadingMessage,
      focusedRowKeyCell,
      pageIndex,
      rowFilterOps,
      operatorMenu,
      headerDropTargetId,
      dropTarget,
      headerFilterField,
      headerFilterAnchor,
      headerFilterSearch,
      contextMenu,
      chooserOpen,
      chooserAnchor,
      chooserDropTargetId,
      visibilityOverrides,
      columnVisible,
      builderOpen,
      builderVersion,
      getBuilderTree: () => builderTree,
      setBuilderTree: (tree: OgeBuilderGroup) => {
        builderTree = tree;
      },
      rtl,
      effRowHeight,
      sortMode,
      allowUnsorting,
      virtualized,
      filterRowVisible,
      effFilterDebounce,
      searchPanelVisible,
      searchPanelOptions,
      headerFilterVisible,
      pagingOptions,
      selectionMode,
      hasCheckboxColumn,
      rowDragging,
      columnReorder,
      leadingCellCount,
      leadingWidth,
      declaredColumns,
      resolvedColumns,
      bandRow,
      colVirtualized,
      layout,
      virtualizer,
      keyboard,
      setToggleRow: (fn: (node: DataRowNode<T>, expand: boolean) => void) => {
        toggleRow = fn;
      },
      editing,
      hasCommandColumn,
      effCommandButtons,
      editFormItems,
      editFormNode,
      editFormColCount,
      builderFields,
      chooserEntries,
      headerFilterColumn,
      headerValues,
      persistedSnapshot,
      applyState,
      persistence,
    };
  }, []);

  // every render starts a new version: props may have changed
  model.rx.invalidate();
  const { state, data, core } = model;

  // --- expansion pipeline (keyboard + expander + API share it) ---------------
  function setRowExpanded(node: DataRowNode<T>, expand: boolean): void {
    // consumers may veto UI-driven toggles (the imperative API stays silent)
    core.requestToggle(node, expand, {
      expanding: (event) => latest.current.onRowExpanding?.(event),
      collapsing: (event) => latest.current.onRowCollapsing?.(event),
      expanded: (event) => latest.current.onRowExpanded?.(event),
      collapsed: (event) => latest.current.onRowCollapsed?.(event),
    });
  }
  model.setToggleRow(setRowExpanded);

  // --- effects -----------------------------------------------------------------
  // keyed on *which* fields sort by a selector, so an inline `columns` array
  // (a new identity every render) does not re-wire the source; the selector
  // itself is read live
  const sortValueFields = (normalizeColumns<T>(props.columns) ?? [])
    .filter((column) => column.field && column.calculateSortValue)
    .map((column) => column.field as string)
    .join(' ');
  const sortValues = useMemo(() => {
    if (!sortValueFields) return undefined;
    const selectors: Record<string, (row: T) => unknown> = {};
    for (const field of sortValueFields.split(' ')) {
      selectors[field] = (row) =>
        normalizeColumns<T>(latest.current.columns)
          ?.find((column) => column.field === field)
          ?.calculateSortValue?.(row);
    }
    return selectors;
  }, [sortValueFields]);

  // the source wiring re-runs on the inputs Angular's effect tracks; accessor
  // functions count by kind, not identity — an inline selector is a new
  // function every render and must not re-wire (and re-fetch) the tree
  const exprDep = (expr: unknown, fallback: string): string =>
    typeof expr === 'function' ? ' fn' : String(expr ?? fallback);
  const keyExprDep = exprDep(props.keyExpr, 'id');
  const parentIdExprDep = exprDep(props.parentIdExpr, 'parentId');
  const itemsExprDep = exprDep(props.itemsExpr, '');
  const lazyDep = core.effLoadMode();
  useEffect(() => {
    data.setSource(core.connect(latest.current.data ?? [], sortValues));
    return () => data.setSource(null);
  }, [
    data,
    core,
    props.data,
    keyExprDep,
    parentIdExprDep,
    props.rootValue,
    itemsExprDep,
    lazyDep,
    sortValues,
  ]);

  // StrictMode unmounts and remounts with the same model: the cleanup tears
  // the data core down, and the effect above re-wires the source on remount
  useEffect(() => () => data.destroy(), [data]);

  // loads, lazy children and remote match discovery — after every render,
  // all idempotent (each core fingerprints its own inputs)
  useEffect(() => {
    data.sync();
    core.deferredLoader.sync();
    core.syncRemoteFilter();
  });

  // filter/search changes jump back to the first page
  const filterJson = JSON.stringify([
    state.filter.combinedExpr(),
    state.filter.searchText(),
  ]);
  useEffect(() => {
    model.pageIndex.set(0);
  }, [model, filterJson]);

  // selectedKeys (controlled) → selection slice
  const selectedKeysProp = props.selectedKeys;
  useEffect(() => {
    if (!selectedKeysProp) return;
    if (sameKeys(selectedKeysProp, state.selection.selected())) return;
    state.selection.replace(selectedKeysProp);
  }, [state, selectedKeysProp]);
  useEffect(() => {
    const initial = latest.current.defaultSelectedKeys;
    if (initial?.length) state.selection.replace(initial);
  }, [state]);

  // selection → callbacks, with diffs; the initial state is not a change
  const previousSelection = useRef<ReadonlySet<RowKey> | null>(null);
  const selected = state.selection.selected();
  useEffect(() => {
    const previous = previousSelection.current;
    previousSelection.current = selected;
    if (previous === null) return;
    if (sameKeys([...selected], previous)) return;
    const keys = [...selected];
    latest.current.onSelectedKeysChange?.(keys);
    latest.current.onSelectionChanged?.({
      selectedKeys: keys,
      addedKeys: keys.filter((key) => !previous.has(key)),
      removedKeys: [...previous].filter((key) => !selected.has(key)),
    });
  }, [selected]);

  // expandedRowKeys (controlled) → expansion slice, polarity-aware
  const expandedKeysJson =
    props.expandedRowKeys === undefined
      ? null
      : JSON.stringify(props.expandedRowKeys);
  useEffect(() => {
    const keys = latest.current.expandedRowKeys;
    if (keys !== undefined) core.applyExpandedRowKeys(keys);
  }, [core, expandedKeysJson]);
  useEffect(() => {
    const initial = latest.current.defaultExpandedRowKeys;
    if (initial?.length) core.applyExpandedRowKeys(initial);
  }, [core]);

  // expansion → onExpandedRowKeysChange; the initial state is not a change
  const expandedSet = core.expandedSet();
  const previousExpanded = useRef<ReadonlySet<RowKey> | null>(null);
  useEffect(() => {
    const previous = previousExpanded.current;
    previousExpanded.current = expandedSet;
    if (previous === null || sameKeys([...expandedSet], previous)) return;
    const controlled = latest.current.expandedRowKeys;
    if (controlled && sameKeys(controlled, expandedSet)) return;
    latest.current.onExpandedRowKeysChange?.([...expandedSet]);
  }, [expandedSet]);

  // focused row (controlled or not) → callbacks
  const focusedRowKeyProp = props.focusedRowKey;
  useEffect(() => {
    if (focusedRowKeyProp !== undefined)
      model.focusedRowKeyCell.set(focusedRowKeyProp);
  }, [model, focusedRowKeyProp]);
  const focusedRowKey = model.focusedRowKeyCell();
  const previousFocusedKey = useRef<RowKey | null | undefined>(undefined);
  useEffect(() => {
    const previous = previousFocusedKey.current;
    previousFocusedKey.current = focusedRowKey;
    if (previous === undefined || previous === focusedRowKey) return;
    latest.current.onFocusedRowChanged?.({
      key: focusedRowKey,
      row:
        focusedRowKey === null ? undefined : core.getNodeByKey(focusedRowKey),
    });
  }, [focusedRowKey]);

  // autoNavigateToFocusedRow: expand the ancestors and scroll it into view
  const autoNavigate = props.autoNavigateToFocusedRow === true;
  useEffect(() => {
    if (focusedRowKey === null || !autoNavigate) return;
    const flatIndex = core.revealRow(focusedRowKey);
    if (flatIndex !== undefined) scrollRowIntoView(flatIndex);
  }, [focusedRowKey, autoNavigate]);

  // load failures
  const error = data.error();
  useEffect(() => {
    if (error !== null) latest.current.onDataErrorOccurred?.({ error });
  }, [error]);

  // contentReady: after the DOM for a new result set is in place
  const result = data.result();
  useEffect(() => {
    if (result !== null) latest.current.onContentReady?.();
  }, [result]);

  // viewport measurements + RTL detection
  useIsomorphicLayoutEffect(() => {
    const viewport = viewportRef.current;
    const host = hostRef.current;
    if (!viewport || !host) return;
    model.viewportHeight.set(viewport.clientHeight || 400);
    model.hostWidth.set(viewport.clientWidth);
    model.detectedRtl.set(getComputedStyle(host).direction === 'rtl');
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      model.viewportHeight.set(viewport.clientHeight);
      model.hostWidth.set(viewport.clientWidth);
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [model]);

  // state persistence
  const stateKey = props.stateKey;
  useEffect(() => {
    model.persistence.restore(stateKey);
  }, [model, stateKey]);
  useEffect(() => {
    model.persistence.noteSnapshot(model.persistedSnapshot(), stateKey);
  });
  useEffect(() => () => model.persistence.dispose(), [model]);

  // filterValue ⇄ the builder filter slice (guarded both ways, like Angular's
  // two effects: whichever side changed wins, and neither echoes back)
  const filterValueProp = props.filterValue;
  const filterValueJson = JSON.stringify(filterValueProp ?? null);
  useEffect(() => {
    if (filterValueProp === undefined) return;
    if (filterValueJson === JSON.stringify(state.filter.builderFilter()))
      return;
    state.filter.setBuilderFilter(filterValueProp ?? null);
  }, [filterValueJson]);
  useEffect(() => {
    const initial = latest.current.defaultFilterValue;
    if (initial) state.filter.setBuilderFilter(initial);
  }, [state]);
  const builderFilter = state.filter.builderFilter();
  const builderFilterJson = JSON.stringify(builderFilter);
  // the mount value is the baseline, not a change — reporting it would echo
  // the stale pre-sync slice back into a controlled owner
  const previousBuilderJson = useRef<string | null>(null);
  useEffect(() => {
    const previous = previousBuilderJson.current;
    previousBuilderJson.current = builderFilterJson;
    if (previous === null || builderFilterJson === filterValueJson) return;
    latest.current.onFilterValueChange?.(builderFilter);
  }, [builderFilterJson]);

  // focus the first editor when one opens
  const editCell = state.editing.editCell();
  const editRowKey = state.editing.editRowKey();
  const editorSession = editCell
    ? `${String(editCell.key)}::${editCell.field}`
    : editRowKey === null
      ? null
      : `row:${String(editRowKey)}`;
  useEffect(() => {
    if (editorSession === null) return;
    const editor = hostRef.current?.querySelector<HTMLElement>('.oge-editor');
    // composite editors carry .oge-editor on the host — focus the control
    (
      editor?.querySelector<HTMLElement>('input, select, textarea') ?? editor
    )?.focus();
  }, [editorSession]);

  // focus follows the keyboard-navigation cell — unless an editor is open
  const focusedCell = model.keyboard.focusedCell();
  const editorOpen = editCell !== null || editRowKey !== null;
  useEffect(() => {
    if (!focusedCell || editorOpen) return;
    scrollRowIntoView(focusedCell.row);
    scrollColumnIntoView(focusedCell.col);
    const el = viewportRef.current?.querySelector<HTMLElement>(
      `[data-cell="${focusedCell.row}-${focusedCell.col}"]`,
    );
    if (el && document.activeElement !== el) el.focus({ preventScroll: true });
  }, [focusedCell?.row, focusedCell?.col, editorOpen]);

  // debounced filter writes
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const map = timers.current;
    return () => {
      for (const timer of map.values()) clearTimeout(timer);
      map.clear();
    };
  }, []);
  function debounced(key: string, run: () => void): void {
    const pending = timers.current.get(key);
    if (pending) clearTimeout(pending);
    const wait = model.effFilterDebounce();
    if (wait <= 0) {
      timers.current.delete(key);
      run();
      return;
    }
    timers.current.set(
      key,
      setTimeout(() => {
        timers.current.delete(key);
        run();
      }, wait),
    );
  }

  // --- helpers -----------------------------------------------------------------
  function scrollRowIntoView(index: number): void {
    if (model.virtualized()) {
      model.virtualizer.scrollRowIntoView(index);
      return;
    }
    viewportRef.current
      ?.querySelector<HTMLElement>(`[data-rowindex="${index}"]`)
      ?.scrollIntoView?.({ block: 'nearest' });
  }

  function scrollColumnIntoView(col: number): void {
    if (!model.colVirtualized()) return;
    const widths = model.layout.colWidths();
    if (col < 0 || col >= widths.length) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    let left = model.leadingWidth();
    for (let i = 0; i < col; i++) left += widths[i];
    const right = left + widths[col];
    if (left < viewport.scrollLeft) viewport.scrollLeft = left;
    else if (right > viewport.scrollLeft + viewport.clientWidth) {
      viewport.scrollLeft = right - viewport.clientWidth;
    }
    model.scrollLeft.set(viewport.scrollLeft);
  }

  function setFocusedRowKey(key: RowKey | null): void {
    if (latest.current.focusedRowKey === undefined)
      model.focusedRowKeyCell.set(key);
    else if (key !== latest.current.focusedRowKey) {
      // controlled: report, the owner writes the prop back
      latest.current.onFocusedRowKeyChange?.(key);
    }
  }

  function scrollToRow(target: number | RowKey): void {
    const nodes = core.renderNodes();
    let index = nodes.findIndex((node) => node.key === target);
    if (
      index < 0 &&
      typeof target === 'number' &&
      target >= 0 &&
      target < nodes.length
    ) {
      index = target;
    }
    if (index >= 0) scrollRowIntoView(index);
  }

  function focusRow(key: RowKey): void {
    if (!core.treeIndex().byKey.has(key)) return;
    const flatIndex = core.revealRow(key);
    if (latest.current.focusedRowEnabled) setFocusedRowKey(key);
    if (flatIndex !== undefined) {
      scrollRowIntoView(flatIndex);
      model.keyboard.focusedCell.set({ row: flatIndex, col: 0 });
    }
  }

  function getExportData(): OgeTreeExportData<T> {
    return core.getExportData(model.resolvedColumns(), msgRef.current);
  }

  function addRow(parentKey?: RowKey): void {
    model.editing.addNewRow();
    const key = state.editing.added()[0];
    if (key === undefined) return;
    core.stageNewRowParent(key, parentKey);
    // prefill hook: values the consumer writes stage onto the new row
    const event: OgeTreeInitNewRowEvent = {
      key,
      parentKey: parentKey ?? null,
      values: {},
    };
    latest.current.onInitNewRow?.(event);
    if (Object.keys(event.values).length) {
      state.editing.setRowChanges(key, event.values);
    }
  }

  function saveChanges(): void {
    const mode = model.editing.editMode();
    if (mode === 'batch') {
      model.editing.commitActiveCell();
      model.editing.saveAllChanges();
    } else if (mode === 'cell') {
      model.editing.commitActiveCell();
    } else {
      model.editing.commitActiveRow();
    }
  }

  function exportCsv(filename = 'tree-list.csv'): void {
    const event: OgeExportingEvent = { fileName: filename, cancel: false };
    latest.current.onExporting?.(event);
    if (event.cancel) return;
    const csv = ogeTreeCsv(getExportData());
    if (typeof document === 'undefined') return;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = event.fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function copyToClipboard(): Promise<void> {
    const text = core.clipboardText(getExportData().columns);
    if (!text) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    }
  }

  function clearSelection(): void {
    state.selection.clear();
  }

  function toggleSelectAll(): void {
    if (core.allSelected()) clearSelection();
    else core.selectAll();
  }

  useImperativeHandle(ref, (): OgeTreeListHandle<T> => ({
    getSelectedRowKeys: (mode) => core.getSelectedRowKeys(mode),
    getSelectedRowsData: (mode) => core.getSelectedRowsData(mode),
    selectAll: () => core.selectAll(),
    clearSelection,
    deselectAll: clearSelection,
    isRowSelected: (key) => state.selection.isSelected(key),
    copyToClipboard,
    addRow,
    forEachNode: (callback) => core.forEachNode(callback),
    getVisibleRows: () => core.getVisibleRows(),
    refresh: () => {
      core.refresh();
      data.reload();
    },
    clearFilters: () => state.filter.clearAll(),
    clearSorting: () => state.sort.clear(),
    expandAll: () => core.expandAll(),
    collapseAll: () => core.collapseAll(),
    expandRow: (key) => core.expandRow(key),
    collapseRow: (key) => core.collapseRow(key),
    isRowExpanded: (key) => core.isRowExpanded(key),
    getNodeByKey: (key) => core.getNodeByKey(key),
    focusRow,
    navigateToRow: focusRow,
    scrollToRow,
    beginCustomLoading: (message) =>
      model.customLoadingMessage.set(message ?? msgRef.current.loading),
    endCustomLoading: () => model.customLoadingMessage.set(null),
    pageIndex: () => model.pageIndex(),
    setPageIndex: (index) => core.setPageIndex(index),
    pageSize: () => core.pageSize(),
    setPageSize: (size) => core.setPageSize(size),
    pageCount: () => core.pageCount(),
    totalCount: () => core.totalCount(),
    state: () => model.persistedSnapshot(),
    applyState: (snapshot) => model.applyState(snapshot),
    editRow: (key) => {
      if (!model.editing.canUpdate()) return;
      const node = core.dataNodeByKey(key);
      if (node) model.editing.startRowEdit(node);
    },
    deleteRow: (key) => {
      if (!model.editing.canDelete()) return;
      const node = core.dataNodeByKey(key);
      if (node) model.editing.deleteRow(node);
    },
    saveChanges,
    discardChanges: () => model.editing.cancelEditing(),
    hasChanges: () => state.editing.hasPending(),
    getExportData,
    getCsv: (options?: CsvOptions) => ogeTreeCsv(getExportData(), options),
    exportCsv,
  }));

  // --- event handlers --------------------------------------------------------------
  const suppressHeaderClick = useRef(false);

  function onHeaderClick(
    column: ResolvedColumn<T>,
    event: React.SyntheticEvent,
  ): void {
    if (suppressHeaderClick.current) {
      suppressHeaderClick.current = false;
      return;
    }
    if (!column.sortable || !column.field || model.sortMode() === 'none')
      return;
    if ('key' in event.nativeEvent) event.preventDefault();
    const { shiftKey, ctrlKey } = event.nativeEvent as
      MouseEvent | KeyboardEvent;
    const additive = model.sortMode() === 'multi' && (shiftKey || ctrlKey);
    state.sort.toggle(column.field, additive, model.allowUnsorting());
  }

  function onResizeStart(
    column: ResolvedColumn<T>,
    event: React.PointerEvent,
  ): void {
    if (latest.current.columnResize === false) return;
    event.preventDefault();
    event.stopPropagation();
    const headerCell = (event.target as HTMLElement).closest(
      '.oge-header-cell',
    ) as HTMLElement | null;
    const startWidth =
      headerCell?.offsetWidth ??
      (typeof column.width === 'number'
        ? column.width
        : configRef.current.pinnedDefaultWidth);
    const startX = event.clientX;
    const onMove = (move: PointerEvent): void => {
      suppressHeaderClick.current = true;
      state.columns.setWidth(column.id, startWidth + (move.clientX - startX));
    };
    const onUp = (): void => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setTimeout(() => (suppressHeaderClick.current = false));
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  // --- column drag reorder ---
  function onHeaderDragStart(
    column: ResolvedColumn<T>,
    event: React.DragEvent,
  ): void {
    if (!column.field || !model.columnReorder()) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData(COLUMN_DRAG_TYPE, column.id);
    event.dataTransfer.effectAllowed = 'move';
  }

  function onHeaderDragOver(
    column: ResolvedColumn<T>,
    event: React.DragEvent,
  ): void {
    if (!event.dataTransfer.types.includes(COLUMN_DRAG_TYPE)) return;
    event.preventDefault();
    if (model.columnReorder() && model.headerDropTargetId() !== column.id)
      model.headerDropTargetId.set(column.id);
  }

  function onHeaderDrop(
    target: ResolvedColumn<T>,
    event: React.DragEvent,
  ): void {
    model.headerDropTargetId.set(null);
    const sourceId = event.dataTransfer.getData(COLUMN_DRAG_TYPE);
    if (!sourceId || !model.columnReorder() || sourceId === target.id) return;
    event.preventDefault();
    state.columns.reorder(
      model.resolvedColumns().map((c) => c.id),
      sourceId,
      target.id,
    );
  }

  // --- row drag reparenting ---
  const draggedRowKey = useRef<RowKey | null>(null);

  function dropPositionOf(event: React.DragEvent): OgeTreeDropPosition {
    const row = event.currentTarget as HTMLElement | null;
    return ogeTreeDropPosition(event.clientY, row?.getBoundingClientRect?.());
  }

  function onRowDragOver(node: DataRowNode<T>, event: React.DragEvent): void {
    if (!core.isValidDropTarget(draggedRowKey.current, node.key)) return;
    event.preventDefault();
    const position = dropPositionOf(event);
    const current = model.dropTarget();
    if (current?.key !== node.key || current.position !== position) {
      model.dropTarget.set({ key: node.key, position });
    }
  }

  function onRowDragEnd(): void {
    draggedRowKey.current = null;
    model.dropTarget.set(null);
  }

  function onRowDrop(target: DataRowNode<T>, event: React.DragEvent): void {
    const draggedKey = draggedRowKey.current;
    const position = model.dropTarget()?.position ?? dropPositionOf(event);
    const valid =
      draggedKey !== null && core.isValidDropTarget(draggedKey, target.key);
    onRowDragEnd();
    if (!valid || draggedKey === null) return;
    event.preventDefault();
    // plain arrays with a writable top-level parent field move in place;
    // dotted paths, nested payloads and DataSources are the consumer's job
    const moved = core.applyDrop(draggedKey, target.key, position, () =>
      data.reload(),
    );
    if (moved) latest.current.onRowReparented?.(moved);
  }

  // --- selection ---
  function onRowClick(node: DataRowNode<T>, event: React.MouseEvent): void {
    latest.current.onRowClick?.({ row: node.data, key: node.key, event });
    if (latest.current.focusedRowEnabled) setFocusedRowKey(node.key);
    switch (rowClickSelectionIntent(model.selectionMode(), event)) {
      case 'range':
        state.selection.selectRange(core.dataKeys(), node.key);
        break;
      case 'toggle':
        core.toggleSelection(node.key);
        break;
      case 'selectOnly':
        state.selection.selectOnly(node.key);
        break;
      default:
        break;
    }
  }

  // --- cells & editing ---
  function onCellClickToEdit(
    node: DataRowNode<T>,
    column: ResolvedColumn<T>,
    event: React.SyntheticEvent,
  ): void {
    // ignore events bubbling out of an open editor (e.g. its own Enter commit)
    if ((event.target as HTMLElement | null)?.closest?.('.oge-editor')) return;
    const payload = {
      row: node.data,
      key: node.key,
      field: column.field,
      value: column.accessor(node.data),
      event,
    };
    if (event.type === 'dblclick') {
      latest.current.onCellDblClick?.(payload);
      return;
    }
    if (event.type === 'click') latest.current.onCellClick?.(payload);
    const mode = model.editing.editMode();
    if (
      (mode !== 'cell' && mode !== 'batch') ||
      !model.editing.canUpdate() ||
      !column.editable ||
      !column.field ||
      state.editing.isRemoved(node.key)
    ) {
      return;
    }
    if (!state.editing.isCellEditing(node.key, column.field)) {
      if (!model.editing.notifyEditingStart(node.key, node.data, column.field))
        return;
      state.editing.startCell(node.key, column.field);
    }
  }

  function onEditorEnter(): void {
    const mode = model.editing.editMode();
    if (mode === 'row' || mode === 'popup' || mode === 'form') {
      model.editing.commitActiveRow();
    } else {
      model.editing.commitActiveCell();
    }
  }

  /** One cell's editor — a column's `renderEditor`, else the dataType-matched one. */
  function renderCellEditor(
    node: DataRowNode<T>,
    column: ResolvedColumn<T>,
  ): ReactNode {
    const field = column.field as string;
    const entry = model.editing.editorAt(node, column);
    if (!entry) return null;
    const setValue = (next: unknown) =>
      model.editing.setEditorValue(node.key, field, next);
    const spec = column.source;
    if (spec?.renderEditor) {
      return spec.renderEditor({
        value: entry.value,
        setValue,
        row: node.data,
        key: node.key,
        column: spec,
        error: entry.touched ? entry.error : null,
        commit: () => onEditorEnter(),
        cancel: () => model.editing.cancelActiveEditor(),
      });
    }
    const showError = entry.touched && entry.error !== null;
    return (
      <OgeCellEditor
        surface="cell"
        value={entry.value}
        onValueChange={setValue}
        dataType={column.dataType}
        lookupItems={model.editing.lookupItemsFor(node, column)}
        label={column.caption}
        invalid={showError}
        errorTitle={showError ? entry.error : null}
        onEnterKey={() => onEditorEnter()}
        onEscapeKey={() => model.editing.cancelActiveEditor()}
        onTabKey={(event) =>
          model.editing.commitAndNext(node, column, event.nativeEvent)
        }
        onFocusLeft={() => model.editing.onEditorBlur()}
      />
    );
  }

  function onTreeKeydown(event: React.KeyboardEvent): void {
    if (
      isOgeContextMenuKey(event) &&
      state.editing.editCell() === null &&
      state.editing.editRowKey() === null &&
      openContextMenuFromKeyboard(event)
    )
      return;
    const cell = model.keyboard.focusedCell();
    if (!cell) return;
    if (event.key === ' ') {
      const node = core.renderNodes()[cell.row];
      if (node?.kind === 'data' && model.selectionMode() !== 'none') {
        event.preventDefault();
        if (model.selectionMode() === 'single')
          state.selection.selectOnly(node.key);
        else core.toggleSelection(node.key);
      }
      return;
    }
    if (model.keyboard.handleKey(event.nativeEvent)) event.preventDefault();
  }

  // --- filter row ---
  function currentOperator(column: ResolvedColumn<T>): FilterOperator {
    return effectiveFilterOperator(
      column,
      column.field ? model.rowFilterOps().get(column.field) : undefined,
    );
  }

  const rowFilterRaw = useRef(new Map<string, string>());

  function onFilterInput(column: ResolvedColumn<T>, raw: string): void {
    const field = column.field;
    if (!field) return;
    rowFilterRaw.current.set(field, raw);
    debounced(`f:${field}`, () =>
      state.filter.setRowFilter(
        field,
        rowFilterExpr(column, raw, currentOperator(column)),
      ),
    );
  }

  /** Selects apply immediately (no debounce). */
  function onFilterSelect(column: ResolvedColumn<T>, raw: string): void {
    const field = column.field;
    if (!field) return;
    rowFilterRaw.current.set(field, raw);
    state.filter.setRowFilter(
      field,
      rowFilterExpr(column, raw, currentOperator(column)),
    );
  }

  /** Filter-row lookup select: applies an exact-match filter on the raw value. */
  function onLookupFilter(column: ResolvedColumn<T>, value: unknown): void {
    const field = column.field;
    if (!field || !column.lookupItems) return;
    state.filter.setRowFilter(
      field,
      value == null ? null : { type: 'binary', field, op: 'eq', value },
    );
  }

  /** Filter-row date editor: applies a timezone-safe day-range expression. */
  function onDateFilter(column: ResolvedColumn<T>, value: unknown): void {
    const field = column.field;
    if (!field) return;
    state.filter.setRowFilter(
      field,
      value instanceof Date
        ? dateFilterExpr(field, currentOperator(column), value)
        : null,
    );
  }

  // --- filter-row operator menu ---
  const operatorPopupRef = useRef<HTMLDivElement>(null);
  const operatorPanel = useAnchoredPanel({
    anchor: () => model.operatorMenu()?.anchor ?? hostRef.current,
    panel: () => operatorPopupRef.current,
    placement: () => 'bottom-start',
    onClosed: () => model.operatorMenu.set(null),
  });

  function toggleOperatorMenu(
    column: ResolvedColumn<T>,
    event: React.MouseEvent,
  ): void {
    event.stopPropagation();
    if (model.operatorMenu()?.column.id === column.id) {
      operatorPanel.close();
      return;
    }
    model.operatorMenu.set({
      column,
      anchor: event.currentTarget as HTMLElement,
    });
    operatorPanel.open();
    operatorPanel.updatePosition();
  }

  /**
   * The grid's filter-row choices minus `between`: the tree's date filter
   * cell is a single date box, not a range picker — as in Angular.
   */
  function operatorItems(column: ResolvedColumn<T>): OgeMenuItem[] {
    const current = currentOperator(column);
    const items: OgeMenuItem[] = filterRowOperatorChoices(column.dataType)
      .filter((op) => op !== 'between')
      .map((op) => ({
        text: msg.operators[op],
        value: op,
        checked: op === current ? true : undefined,
      }));
    items.push({ text: '', separator: true });
    items.push({ text: msg.resetOperator });
    return items;
  }

  function chooseOperator(op: FilterOperator | null): void {
    const menu = model.operatorMenu();
    operatorPanel.close('select');
    const field = menu?.column.field;
    if (!menu || !field) return;
    const next = new Map(model.rowFilterOps());
    if (op === null) next.delete(field);
    else next.set(field, op);
    model.rowFilterOps.set(next);
    // re-apply the current editor value with the new operator
    const raw = rowFilterRaw.current.get(field) ?? '';
    state.filter.setRowFilter(
      field,
      rowFilterExpr(
        menu.column,
        raw,
        effectiveFilterOperator(menu.column, op ?? undefined),
      ),
    );
  }

  // --- filter panel + builder ---
  function openFilterBuilder(): void {
    const tree = exprToBuilder(
      state.filter.builderFilter(),
      model.builderFields(),
    );
    if (!tree.items.length) {
      const first = model.builderFields()[0];
      if (first) {
        tree.items.push({
          kind: 'condition',
          field: first.field,
          op: operatorsFor(first.dataType)[0],
          value: '',
        });
      }
    }
    model.setBuilderTree(tree);
    model.builderVersion.set(model.builderVersion() + 1);
    model.builderOpen.set(true);
  }

  function applyFilterBuilder(): void {
    state.filter.setBuilderFilter(
      builderToExpr(model.getBuilderTree(), model.builderFields()),
    );
    model.builderOpen.set(false);
  }

  // --- header filter (distinct values over the loaded rows) ---
  const headerFilterPopupRef = useRef<HTMLDivElement>(null);
  const headerFilterPanel = useAnchoredPanel({
    anchor: () => model.headerFilterAnchor() ?? hostRef.current,
    panel: () => headerFilterPopupRef.current,
    placement: () => 'bottom-start',
    onClosed: () => model.headerFilterField.set(null),
  });

  function toggleHeaderFilter(
    column: ResolvedColumn<T>,
    event: React.MouseEvent,
  ): void {
    event.stopPropagation();
    if (!column.field) return;
    if (model.headerFilterField() === column.field) {
      headerFilterPanel.close();
      return;
    }
    model.headerFilterSearch.set('');
    model.headerFilterAnchor.set(event.currentTarget as HTMLElement);
    model.headerFilterField.set(column.field);
    headerFilterPanel.open();
    headerFilterPanel.updatePosition();
  }

  const headerSelection = (): readonly unknown[] | null => {
    const field = model.headerFilterField();
    return field === null ? null : state.filter.headerFilterOf(field);
  };

  const headerValueTextOf = (value: unknown): string =>
    ogeTreeHeaderValueText(value, model.headerFilterColumn(), msg.blankValue);

  function setHeaderSelection(next: readonly unknown[] | null): void {
    const field = model.headerFilterField();
    if (field !== null) state.filter.setHeaderFilter(field, next);
  }

  // --- context menus ---
  const contextMenuPopupRef = useRef<HTMLDivElement>(null);
  /** Swallows the native `contextmenu` that may follow a keyboard-opened menu. */
  const contextMenuEcho = useRef(new OgeContextMenuEcho());
  /** Pointer-point positioning with viewport clamping. */
  const contextMenuPanel = useAnchoredPanel({
    anchor: () => hostRef.current,
    anchorRect: () => {
      const menu = model.contextMenu();
      return menu ? { top: menu.y, left: menu.x, width: 0, height: 0 } : null;
    },
    panel: () => contextMenuPopupRef.current,
    placement: () => 'bottom-start',
    onClosed: () => model.contextMenu.set(null),
  });

  function openContextMenu(x: number, y: number, items: OgeMenuItem[]): void {
    model.contextMenu.set({ x, y, items });
    contextMenuPanel.open();
    contextMenuPanel.updatePosition();
    // the WAI-ARIA menu keyboard lives on the focused menu-list container
    setTimeout(() =>
      contextMenuPopupRef.current
        ?.querySelector<HTMLElement>('.oge-menu-list')
        ?.focus(),
    );
  }

  function openRowContextMenu(
    node: DataRowNode<T>,
    x: number,
    y: number,
    event: React.MouseEvent | React.KeyboardEvent,
    source: OgeContextMenuSource,
  ): void {
    const items: OgeMenuItem[] = [];
    latest.current.onRowContextMenu?.({
      row: node.data,
      key: node.key,
      clientX: x,
      clientY: y,
      items,
      source,
      event,
    });
    if (!items.length) return; // fall back to the native browser menu
    event.preventDefault();
    openContextMenu(x, y, items);
  }

  function onRowContextMenuOpen(
    node: DataRowNode<T>,
    event: React.MouseEvent,
  ): void {
    if (contextMenuEcho.current.swallow(event)) return;
    openRowContextMenu(node, event.clientX, event.clientY, event, 'pointer');
  }

  /** The Menu key / Shift+F10 open the row or header menu at the focused cell. */
  function openContextMenuFromKeyboard(event: React.KeyboardEvent): boolean {
    const target = ogeContextMenuKeyTarget(event.target);
    if (!target) return false;
    if (target.headerColumnId !== null) {
      const column = model
        .resolvedColumns()
        .find((c) => c.id === target.headerColumnId);
      if (!column?.field) return false;
      contextMenuEcho.current.mark(event.timeStamp);
      event.preventDefault();
      openHeaderContextMenu(column, target.x, target.y, event, 'keyboard');
      return true;
    }
    const node =
      target.rowIndex === null
        ? undefined
        : core.renderNodes()[target.rowIndex];
    if (node?.kind !== 'data') return false;
    contextMenuEcho.current.mark(event.timeStamp);
    event.preventDefault();
    openRowContextMenu(node, target.x, target.y, event, 'keyboard');
    return true;
  }

  function onHeaderContextMenu(
    column: ResolvedColumn<T>,
    event: React.MouseEvent,
  ): void {
    if (contextMenuEcho.current.swallow(event)) return;
    openHeaderContextMenu(
      column,
      event.clientX,
      event.clientY,
      event,
      'pointer',
    );
  }

  function setColumnVisible(field: string, visible: boolean): void {
    const next = new Map(model.visibilityOverrides());
    next.set(field, visible);
    model.visibilityOverrides.set(next);
  }

  /** Built-in header context menu: sort / pin / hide. */
  function openHeaderContextMenu(
    column: ResolvedColumn<T>,
    x: number,
    y: number,
    event: React.MouseEvent | React.KeyboardEvent,
    source: OgeContextMenuSource,
  ): void {
    const field = column.field;
    if (!field) return;
    const items: OgeMenuItem[] = [];
    if (column.sortable && model.sortMode() !== 'none') {
      items.push(
        {
          text: msg.sortAscending,
          action: () => state.sort.set([{ field, dir: 'asc' }]),
        },
        {
          text: msg.sortDescending,
          action: () => state.sort.set([{ field, dir: 'desc' }]),
        },
      );
      if (state.sort.stateOf(field)) {
        items.push({ text: msg.clearSort, action: () => state.sort.clear() });
      }
    }
    if (column.pinned !== 'left') {
      items.push({
        text: msg.pinLeft,
        action: () => state.columns.setPinned(column.id, 'left'),
      });
    }
    if (column.pinned !== 'right') {
      items.push({
        text: msg.pinRight,
        action: () => state.columns.setPinned(column.id, 'right'),
      });
    }
    if (column.pinned !== false) {
      items.push({
        text: msg.unpin,
        action: () => state.columns.setPinned(column.id, false),
      });
    }
    if (column.source) {
      items.push({
        text: msg.hideColumn,
        action: () => setColumnVisible(field, false),
      });
    }
    // consumers may add / remove / reorder the built-in items
    latest.current.onHeaderContextMenu?.({
      field,
      caption: column.caption,
      clientX: x,
      clientY: y,
      items,
      source,
      event,
    });
    if (!items.length) return;
    event.preventDefault();
    event.stopPropagation();
    openContextMenu(x, y, items);
  }

  // --- column chooser ---
  const chooserPopupRef = useRef<HTMLDivElement>(null);
  const chooserPanel = useAnchoredPanel({
    anchor: () => model.chooserAnchor() ?? hostRef.current,
    panel: () => chooserPopupRef.current,
    placement: () => 'bottom-end',
    onClosed: () => model.chooserOpen.set(false),
  });
  const chooserDragId = useRef<string | null>(null);

  function toggleChooser(event: React.MouseEvent): void {
    event.stopPropagation();
    if (model.chooserOpen()) {
      chooserPanel.close();
      return;
    }
    model.chooserAnchor.set(event.currentTarget as HTMLElement);
    model.chooserOpen.set(true);
    chooserPanel.open();
    chooserPanel.updatePosition();
  }

  function onChooserDragEnd(): void {
    chooserDragId.current = null;
    model.chooserDropTargetId.set(null);
  }

  /** Reorders columns by dropping one chooser row onto another. */
  function onChooserDrop(targetId: string, event: React.DragEvent): void {
    const sourceId = chooserDragId.current;
    onChooserDragEnd();
    if (!sourceId || sourceId === targetId || !model.columnReorder()) return;
    event.preventDefault();
    state.columns.reorder(
      model.chooserEntries().map((entry) => entry.id),
      sourceId,
      targetId,
    );
  }

  // the Angular tree list closes every anchored popup on a document Escape
  // (the API/keyboard sweep; the panels also close themselves)
  const panels = { headerFilterPanel, chooserPanel, contextMenuPanel };
  const panelsRef = useRef(panels);
  panelsRef.current = panels;
  const operatorPanelRef = useRef(operatorPanel);
  operatorPanelRef.current = operatorPanel;
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      if (model.headerFilterField() !== null)
        panelsRef.current.headerFilterPanel.close();
      if (model.chooserOpen()) panelsRef.current.chooserPanel.close();
      if (model.contextMenu()) panelsRef.current.contextMenuPanel.close();
      if (model.operatorMenu()) operatorPanelRef.current.close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [model]);

  // --- render -------------------------------------------------------------------------
  const resolvedColumns = model.resolvedColumns();
  const renderColumns = model.layout.renderColumns();
  const colSpacerLeft = model.layout.colSpacerLeft();
  const colSpacerRight = model.layout.colSpacerRight();
  const gridTemplateColumns = model.layout.gridTemplateColumns();
  const viewNodes = model.virtualizer.viewNodes();
  const viewStart = model.virtualizer.viewStart();
  const bodyHeight = model.virtualizer.bodyHeight();
  const rowsTransform = model.virtualizer.rowsTransform();
  const virtualized = model.virtualized();
  const effRowHeight = model.effRowHeight();
  const selectionMode = model.selectionMode();
  const hasCheckboxColumn = model.hasCheckboxColumn();
  const rowDragging = model.rowDragging();
  const leadingCellCount = model.leadingCellCount();
  const hasCommandColumn = model.hasCommandColumn();
  const bandRow = model.bandRow();
  const sortMode = model.sortMode();
  const multiSorted = state.sort.descriptors().length > 1;
  const loading = data.loading();
  const customLoading = model.customLoadingMessage();
  const rtl = model.rtl();
  const focusedRowEnabled = props.focusedRowEnabled === true;
  const operatorMenu = model.operatorMenu();
  const pagingOptions = model.pagingOptions();
  const headerFilterField = model.headerFilterField();
  const headerFilterColumn = model.headerFilterColumn();
  const headerFilterVisible = model.headerFilterVisible();
  const columnReorder = model.columnReorder();
  const dropTarget = model.dropTarget();
  const headerDropTargetId = model.headerDropTargetId();
  const editMode = model.editing.editMode();
  const popupNode = editMode === 'popup' ? model.editFormNode() : null;
  const searchQuery = state.filter.searchText().trim();
  const colSpanAll = resolvedColumns.length + leadingCellCount;

  const pinnedStyle = (column: ResolvedColumn<T>): React.CSSProperties => ({
    insetInlineStart: model.layout.pinnedLeftOf(column) ?? undefined,
    insetInlineEnd: model.layout.pinnedRightOf(column) ?? undefined,
  });

  const alignClass = (column: ResolvedColumn<T>): string | null =>
    column.alignment === 'center'
      ? 'oge-align-center'
      : column.alignment === 'end'
        ? 'oge-align-end'
        : null;

  const cellDisplayText = (
    node: DataRowNode<T>,
    column: ResolvedColumn<T>,
  ): string => {
    const value = column.accessor(node.data);
    if (column.format) return column.format(value);
    if (column.lookupItems) return lookupTextOf(column.lookupItems, value);
    if (column.dataType === 'boolean' && value != null)
      return value ? msg.booleanTrue : msg.booleanFalse;
    return formatCellValue(value, column.dataType, undefined);
  };

  const booleanFilterItems = [
    { value: '', text: msg.selectAllValues },
    { value: 'true', text: msg.booleanTrue },
    { value: 'false', text: msg.booleanFalse },
  ];

  const classes = ['oge-tree-list'];
  if (virtualized) classes.push('oge-virtual');
  if (loading || customLoading !== null) classes.push('oge-loading');
  if (props.wordWrap) classes.push('oge-wrap');
  if (rtl) classes.push('oge-rtl');
  if (props.className) classes.push(props.className);

  const spacer = (side: 'left' | 'right', className: string) => {
    const width = side === 'left' ? colSpacerLeft : colSpacerRight;
    return width > 0 ? (
      <div
        className={`${className} oge-col-spacer`}
        role="gridcell"
        aria-hidden="true"
      />
    ) : null;
  };

  const filterEditor = (column: ResolvedColumn<T>): ReactNode => {
    if (!column.filterable) return null;
    const common = {
      className: 'oge-filter-input',
      size: 'sm' as const,
      labelMode: 'hidden' as const,
      subscriptSizing: 'none' as const,
      fluid: true,
      label: `${msg.filterPrefix} ${column.caption}`,
    };
    if (column.lookupItems) {
      return (
        <OgeSelectBox
          {...common}
          showClearButton
          items={column.lookupItems}
          displayExpr="text"
          valueExpr="value"
          onValueCommitted={(event) => onLookupFilter(column, event.value)}
        />
      );
    }
    const opButton =
      column.dataType !== 'boolean' ? (
        <button
          type="button"
          className="oge-filter-op-btn"
          aria-label={msg.operators[currentOperator(column)]}
          title={msg.operators[currentOperator(column)]}
          onClick={(event) => toggleOperatorMenu(column, event)}
        >
          {filterOperatorSymbol(currentOperator(column))}
        </button>
      ) : null;
    let editor: ReactNode;
    switch (column.dataType) {
      case 'boolean':
        editor = (
          <OgeSelectBox
            {...common}
            items={booleanFilterItems}
            displayExpr="text"
            valueExpr="value"
            onValueCommitted={(event) =>
              onFilterSelect(column, String(event.value ?? ''))
            }
          />
        );
        break;
      case 'number':
        editor = (
          <OgeNumberBox
            {...common}
            onInputChange={(event) => onFilterInput(column, event.text)}
          />
        );
        break;
      case 'date':
        editor = (
          <OgeDateBox
            {...common}
            showClearButton
            onValueCommitted={(event) => onDateFilter(column, event.value)}
          />
        );
        break;
      default:
        editor = (
          <OgeTextBox
            {...common}
            onInputChange={(event) => onFilterInput(column, event.text)}
          />
        );
    }
    return (
      <>
        {opButton}
        {editor}
      </>
    );
  };

  /**
   * The edit form shared by the `form` and `popup` modes. Angular hands
   * `<oge-form>` a `FormGroup` of the same controls the cell editors use;
   * React has no forms engine, so the draft map is handed over as `formData`
   * and every change written straight back to it.
   */
  const renderEditForm = (node: DataRowNode<T>, className: string) => {
    const items = model.editFormItems();
    const formData: Record<string, unknown> = {};
    for (const item of items) {
      const field = item.column.field as string;
      formData[field] = model.editing.editorAt(node, item.column)?.value;
    }
    return (
      <OgeForm
        className={className}
        renderFormElement={false}
        subscriptSizing="dynamic"
        colCount={model.editFormColCount()}
        formData={formData}
        onFormDataChange={(next) => {
          for (const item of items) {
            const field = item.column.field as string;
            if (!Object.is(next[field], formData[field])) {
              model.editing.setEditorValue(node.key, field, next[field]);
            }
          }
        }}
        onEditorEnterKey={() => onEditorEnter()}
        items={items.map((item) => {
          const field = item.column.field as string;
          const lookupItems = model.editing.lookupItemsFor(node, item.column);
          const spec = item.column.source;
          const rules = spec?.validators ?? [];
          return {
            field,
            label: item.label,
            colSpan: item.colSpan,
            dataType: item.column.dataType,
            isRequired: spec?.required,
            editorType: lookupItems ? ('selectBox' as const) : undefined,
            editorOptions: lookupItems
              ? {
                  items: lookupItems,
                  displayExpr: 'text',
                  valueExpr: 'value',
                }
              : undefined,
            validationRules: rules.length
              ? rules.map((rule) => ({
                  type: 'custom' as const,
                  validate: (context: { value: unknown }) =>
                    rule(context.value, node.data),
                }))
              : undefined,
          };
        })}
      />
    );
  };

  const editFormActions = (
    <div className="oge-edit-form-actions">
      <button
        type="button"
        className="oge-tool-btn oge-tool-text-btn oge-btn-accent"
        onClick={() => model.editing.commitActiveRow()}
      >
        {msg.saveRow}
      </button>
      <button
        type="button"
        className="oge-tool-btn oge-tool-text-btn"
        onClick={() => model.editing.cancelActiveEditor()}
      >
        {msg.cancelEdit}
      </button>
    </div>
  );

  const renderCommandCell = (node: DataRowNode<T>): ReactNode => {
    const editingRow =
      model.editing.isRowEditing(node.key) ||
      (editMode === 'popup' && state.editing.editRowKey() === node.key);
    if (editingRow) {
      return (
        <div className="oge-cell oge-command-cell" role="gridcell">
          <button
            type="button"
            className="oge-command-btn oge-command-save"
            aria-label={msg.saveRow}
            onClick={(event) => {
              model.editing.commitActiveRow();
              event.stopPropagation();
            }}
          >
            {commandIcon(['m3 8.5 3.5 3.5L13 5'])}
          </button>
          <button
            type="button"
            className="oge-command-btn"
            aria-label={msg.cancelEdit}
            onClick={(event) => {
              model.editing.cancelActiveEditor();
              event.stopPropagation();
            }}
          >
            {commandIcon(['m4 4 8 8M12 4l-8 8'])}
          </button>
        </div>
      );
    }
    const removed = state.editing.isRemoved(node.key);
    return (
      <div className="oge-cell oge-command-cell" role="gridcell">
        {model.effCommandButtons().map((button, index) => {
          if (button.visible && !button.visible(node.data)) return null;
          if (button.name === 'edit') {
            return (
              <button
                key={index}
                type="button"
                className="oge-command-btn"
                aria-label={msg.editRow}
                onClick={(event) => {
                  model.editing.startRowEdit(node, event.nativeEvent);
                  event.stopPropagation();
                }}
              >
                {commandIcon(['M10.5 2.5 13.5 5.5 5.5 13.5H2.5v-3z'], 1.6)}
              </button>
            );
          }
          if (button.name === 'delete') {
            return (
              <button
                key={index}
                type="button"
                className="oge-command-btn oge-command-delete"
                aria-label={removed ? msg.undeleteRow : msg.deleteRow}
                onClick={(event) => {
                  model.editing.deleteRow(node, event.nativeEvent);
                  event.stopPropagation();
                }}
              >
                {removed
                  ? commandIcon(
                      ['M3 7c1-2.5 3-4 5.5-4A5.5 5.5 0 1 1 3.5 10', 'M3 3v4h4'],
                      1.6,
                    )
                  : commandIcon(
                      [
                        'M2.5 4.5h11M5.5 4.5V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1.5M4 4.5l.7 8.2a1 1 0 0 0 1 .8h4.6a1 1 0 0 0 1-.8l.7-8.2',
                      ],
                      1.6,
                    )}
              </button>
            );
          }
          return (
            <button
              key={index}
              type="button"
              className="oge-command-btn oge-command-text-btn"
              onClick={(event) => {
                event.stopPropagation();
                button.onClick?.({ row: node.data, key: node.key, event });
              }}
            >
              {button.text}
            </button>
          );
        })}
      </div>
    );
  };

  const renderCellContent = (
    node: DataRowNode<T>,
    column: ResolvedColumn<T>,
  ): ReactNode => {
    if (model.editing.isCellEditorOpen(node, column))
      return renderCellEditor(node, column);
    if (column.cellTemplate) {
      return column.cellTemplate({
        value: column.accessor(node.data),
        row: node.data,
        rowIndex: node.sourceIndex,
        key: node.key,
        column: column.source as OgeGridColumnProps<T>,
      });
    }
    const text = cellDisplayText(node, column);
    const runs = searchQuery
      ? buildSearchHighlightSegments(text, searchQuery)
      : null;
    if (runs) {
      return (
        <span className="oge-tree-cell-text">
          {runs.map((run, i) =>
            run.match ? (
              <mark key={i} className="oge-highlight">
                {run.text}
              </mark>
            ) : (
              <Fragment key={i}>{run.text}</Fragment>
            ),
          )}
        </span>
      );
    }
    return <span className="oge-tree-cell-text">{text}</span>;
  };

  const renderDataRow = (node: DataRowNode<T>, rowIndex: number): ReactNode => {
    if (model.editing.isFormRow(node.key)) {
      return (
        <div
          key={node.key}
          className="oge-row oge-edit-form-row"
          role="row"
          aria-rowindex={rowIndex + 2}
          data-rowindex={rowIndex}
        >
          <div
            className="oge-edit-form-cell"
            role="gridcell"
            aria-colspan={colSpanAll}
            style={{ maxWidth: model.hostWidth() || undefined }}
          >
            {renderEditForm(node, 'oge-edit-form-fields')}
            {editFormActions}
          </div>
        </div>
      );
    }
    const rowSelected =
      selectionMode !== 'none' && state.selection.isSelected(node.key);
    const rowClasses = ['oge-row'];
    if (props.rowAlternation && rowIndex % 2 === 1)
      rowClasses.push('oge-row-alt');
    if (focusedRowEnabled && focusedRowKey === node.key)
      rowClasses.push('oge-row-focused');
    if (rowSelected) rowClasses.push('oge-row-selected');
    if (state.editing.isRemoved(node.key)) rowClasses.push('oge-row-removed');
    if (state.editing.isAdded(node.key)) rowClasses.push('oge-row-new');
    if (dropTarget?.key === node.key) {
      rowClasses.push(
        dropTarget.position === 'inside'
          ? 'oge-drop-target'
          : `oge-drop-${dropTarget.position}`,
      );
    }
    const checkState = hasCheckboxColumn ? core.rowCheckState(node.key) : null;
    return (
      // Row click/contextmenu are pointer conveniences; the keyboard path goes
      // through the focusable cells (arrows + Space).
      <div
        key={node.key}
        className={rowClasses.join(' ')}
        role="row"
        aria-selected={
          selectionMode === 'none'
            ? undefined
            : state.selection.isSelected(node.key)
        }
        aria-level={node.level + 1}
        aria-posinset={node.posInSet}
        aria-setsize={node.setSize}
        aria-expanded={node.hasChildren ? node.expanded : undefined}
        aria-rowindex={rowIndex + 2}
        data-rowindex={rowIndex}
        style={{
          height: virtualized ? effRowHeight : undefined,
          gridTemplateColumns,
        }}
        onClick={(event) => onRowClick(node, event)}
        onDoubleClick={(event) =>
          latest.current.onRowDblClick?.({
            row: node.data,
            key: node.key,
            event,
          })
        }
        onContextMenu={(event) => onRowContextMenuOpen(node, event)}
        onDragOver={
          rowDragging ? (event) => onRowDragOver(node, event) : undefined
        }
        onDrop={rowDragging ? (event) => onRowDrop(node, event) : undefined}
      >
        {rowDragging ? (
          <div className="oge-cell oge-drag-cell" role="gridcell">
            {/* the click handler only shields the row-click; dragging is pointer-driven */}
            <span
              className="oge-drag-handle"
              draggable
              aria-label="Reparent row"
              onDragStart={(event) => {
                draggedRowKey.current = node.key;
                event.dataTransfer.setData('text/plain', String(node.key));
                event.dataTransfer.effectAllowed = 'move';
              }}
              onDragEnd={onRowDragEnd}
              onClick={(event) => event.stopPropagation()}
            >
              <svg
                viewBox="0 0 16 16"
                width="12"
                height="12"
                fill="currentColor"
                aria-hidden="true"
              >
                <circle cx="5.5" cy="4" r="1.2" />
                <circle cx="10.5" cy="4" r="1.2" />
                <circle cx="5.5" cy="8" r="1.2" />
                <circle cx="10.5" cy="8" r="1.2" />
                <circle cx="5.5" cy="12" r="1.2" />
                <circle cx="10.5" cy="12" r="1.2" />
              </svg>
            </span>
          </div>
        ) : null}
        {hasCheckboxColumn ? (
          <div className="oge-cell oge-checkbox-cell" role="gridcell">
            <input
              type="checkbox"
              ref={(input) => {
                if (input) input.indeterminate = checkState === 'indeterminate';
              }}
              checked={checkState === 'checked'}
              aria-label={msg.selectRow}
              onClick={(event) => event.stopPropagation()}
              onChange={() => core.toggleSelection(node.key)}
            />
          </div>
        ) : null}
        {spacer('left', 'oge-cell')}
        {renderColumns.map((column) => {
          const cellClasses = ['oge-cell'];
          if (column.absIndex === 0) cellClasses.push('oge-tree-cell');
          if (column.dataType === 'number') cellClasses.push('oge-cell-number');
          const align = alignClass(column);
          if (align) cellClasses.push(align);
          if (column.pinned !== false) cellClasses.push('oge-pinned');
          if (model.editing.isCellDirty(node, column))
            cellClasses.push('oge-cell-dirty');
          if (model.editing.isCellEditorOpen(node, column))
            cellClasses.push('oge-cell-editing');
          const tabbable = model.keyboard.isCellTabbable(
            rowIndex,
            column.absIndex,
          );
          return (
            <div
              key={column.id}
              className={cellClasses.join(' ')}
              role="gridcell"
              style={pinnedStyle(column)}
              data-cell={`${rowIndex}-${column.absIndex}`}
              aria-colindex={leadingCellCount + column.absIndex + 1}
              tabIndex={tabbable ? 0 : -1}
              onFocus={() =>
                model.keyboard.onCellFocus(rowIndex, column.absIndex)
              }
              onClick={(event) => onCellClickToEdit(node, column, event)}
              onDoubleClick={(event) => onCellClickToEdit(node, column, event)}
              onKeyDown={(event) => {
                if (event.key === 'F2' || event.key === 'Enter')
                  onCellClickToEdit(node, column, event);
              }}
            >
              {column.absIndex === 0 ? (
                <>
                  <span
                    className="oge-tree-indent"
                    style={{
                      inlineSize: `calc(var(--oge-tree-indent, 20px) * ${node.level})`,
                    }}
                    aria-hidden="true"
                  />
                  {node.hasChildren ? (
                    <button
                      type="button"
                      className={
                        node.expanded
                          ? 'oge-expander-btn oge-tree-expander oge-expanded'
                          : 'oge-expander-btn oge-tree-expander'
                      }
                      aria-label={
                        node.expanded ? msg.collapseRow : msg.expandRow
                      }
                      tabIndex={-1}
                      onClick={(event) => {
                        event.stopPropagation();
                        setRowExpanded(node, !node.expanded);
                      }}
                    >
                      <svg
                        viewBox="0 0 16 16"
                        width="12"
                        height="12"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m6 3.5 4.5 4.5L6 12.5" />
                      </svg>
                    </button>
                  ) : (
                    <span
                      className="oge-tree-expander-spacer"
                      aria-hidden="true"
                    />
                  )}
                </>
              ) : null}
              {renderCellContent(node, column)}
            </div>
          );
        })}
        {spacer('right', 'oge-cell')}
        {hasCommandColumn ? renderCommandCell(node) : null}
      </div>
    );
  };

  const renderNode = (node: RowNode<T>, nodeIndex: number): ReactNode => {
    const rowIndex = viewStart + nodeIndex;
    if (node.kind === 'data') return renderDataRow(node, rowIndex);
    if (node.kind !== 'filler') return null;
    return (
      <div
        key={node.key}
        className="oge-row oge-filler-row"
        role="row"
        aria-rowindex={rowIndex + 2}
        style={{ height: effRowHeight, gridTemplateColumns }}
      >
        {rowDragging ? (
          <div className="oge-cell" role="gridcell" aria-hidden="true" />
        ) : null}
        {hasCheckboxColumn ? (
          <div className="oge-cell" role="gridcell" aria-hidden="true" />
        ) : null}
        {spacer('left', 'oge-cell')}
        {renderColumns.map((column) => (
          <div
            key={column.id}
            className="oge-cell"
            role="gridcell"
            aria-busy="true"
          >
            <span className="oge-grid-skeleton" aria-hidden="true" />
          </div>
        ))}
        {spacer('right', 'oge-cell')}
      </div>
    );
  };

  const noData = () => {
    // while a load is in flight the load panel speaks for the tree
    if (loading) return null;
    const custom = latest.current.renderNoData;
    return (
      <div className="oge-no-data">
        {custom ? custom({ messages: msg }) : msg.noData}
      </div>
    );
  };

  const canAdd = model.editing.canAdd();
  const batchPending = editMode === 'batch' && state.editing.hasPending();
  const toolbarVisible =
    model.searchPanelVisible() ||
    canAdd ||
    props.columnChooser === true ||
    props.toolbarBefore != null ||
    batchPending;
  const filterPanelText = (() => {
    const expr = state.filter.builderFilter();
    return expr ? describeExpr(expr, model.builderFields(), msg) : null;
  })();

  const headerCheck = (
    value: boolean | null,
    onCommit: () => void,
  ): ReactNode => <OgeCheckBox value={value} onValueCommitted={onCommit} />;

  const headerValueGroups =
    headerFilterColumn?.dataType === 'date'
      ? ogeTreeHeaderValueGroups(
          model.headerValues(),
          model.headerFilterSearch(),
          headerValueTextOf,
          msg.blankValue,
        )
      : null;
  const visibleHeaderValues = (() => {
    const values = model.headerValues();
    const query = foldText(model.headerFilterSearch().trim());
    if (!query) return values;
    return values.filter((value) =>
      foldText(headerValueTextOf(value)).includes(query),
    );
  })();

  return (
    <div
      ref={hostRef}
      className={classes.join(' ')}
      style={props.style}
      dir={
        props.rtlEnabled === undefined
          ? undefined
          : props.rtlEnabled
            ? 'rtl'
            : 'ltr'
      }
    >
      {toolbarVisible ? (
        <OgeToolbar
          className="oge-tree-list-toolbar"
          stylingMode="flat"
          ariaLabel={msg.toolbar}
          messages={{ overflowMenu: msg.moreCommands }}
          before={
            <>
              {props.toolbarBefore}
              {props.columnChooser ? (
                <button
                  type="button"
                  className="oge-tool-btn"
                  aria-label={msg.columnChooser}
                  title={msg.columnChooser}
                  onClick={toggleChooser}
                >
                  <svg
                    viewBox="0 0 16 16"
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.6}
                    strokeLinecap="round"
                  >
                    <rect x="2" y="2.5" width="3.2" height="11" rx="0.8" />
                    <rect x="6.4" y="2.5" width="3.2" height="11" rx="0.8" />
                    <rect x="10.8" y="2.5" width="3.2" height="11" rx="0.8" />
                  </svg>
                </button>
              ) : null}
              {canAdd ? (
                <button
                  type="button"
                  className="oge-tool-text-btn"
                  onClick={() => addRow()}
                >
                  {msg.addRow}
                </button>
              ) : null}
              {batchPending ? (
                <span className="oge-toolbar-cluster">
                  <button
                    type="button"
                    className="oge-tool-text-btn oge-btn-accent"
                    onClick={() => model.editing.saveAllChanges()}
                  >
                    {msg.saveChanges}
                  </button>
                  <button
                    type="button"
                    className="oge-tool-text-btn"
                    onClick={() => model.editing.discardAllChanges()}
                  >
                    {msg.discardChanges}
                  </button>
                </span>
              ) : null}
            </>
          }
          after={
            model.searchPanelVisible() ? (
              <input
                className="oge-search-input"
                type="search"
                placeholder={
                  model.searchPanelOptions().placeholder ?? msg.search
                }
                aria-label={
                  model.searchPanelOptions().placeholder ?? msg.search
                }
                style={
                  model.searchPanelOptions().width
                    ? { width: model.searchPanelOptions().width }
                    : undefined
                }
                onChange={(event) => {
                  const raw = event.target.value;
                  debounced('search', () => state.filter.setSearchText(raw));
                }}
              />
            ) : undefined
          }
        />
      ) : null}
      {props.filterPanel ? (
        <div className="oge-filter-panel">
          <svg
            viewBox="0 0 16 16"
            width="12"
            height="12"
            aria-hidden="true"
            className="oge-filter-panel-icon"
          >
            <path d="M1 2h14L10 8.5V14l-4-1.8V8.5L1 2z" fill="currentColor" />
          </svg>
          <button
            type="button"
            className="oge-filter-panel-text"
            onClick={openFilterBuilder}
          >
            {filterPanelText ?? msg.createFilter}
          </button>
          {filterPanelText ? (
            <button
              type="button"
              className="oge-filter-panel-clear"
              aria-label={msg.clearFilter}
              onClick={(event) => {
                event.stopPropagation();
                state.filter.setBuilderFilter(null);
              }}
            >
              <svg
                viewBox="0 0 16 16"
                width="11"
                height="11"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
              >
                <path d="m4 4 8 8M12 4l-8 8" />
              </svg>
            </button>
          ) : null}
        </div>
      ) : null}
      {/* Delegated keyboard handler: focus lives on the tree cells inside (roving tabindex). */}
      <div
        ref={viewportRef}
        className="oge-viewport"
        role="treegrid"
        aria-label={props.ariaLabel}
        aria-rowcount={core.renderedRowCount() + 1}
        aria-colcount={colSpanAll}
        aria-multiselectable={
          selectionMode === 'multiple' || selectionMode === 'checkbox'
            ? true
            : undefined
        }
        onScroll={(event) => {
          const target = event.currentTarget;
          model.scrollTop.set(target.scrollTop);
          model.scrollLeft.set(target.scrollLeft);
        }}
        onKeyDown={onTreeKeydown}
      >
        <div className="oge-header" role="rowgroup">
          {bandRow ? (
            <div
              className="oge-band-row"
              role="row"
              style={{ gridTemplateColumns }}
            >
              {rowDragging ? (
                <div className="oge-band-cell" role="columnheader" />
              ) : null}
              {hasCheckboxColumn ? (
                <div className="oge-band-cell" role="columnheader" />
              ) : null}
              {bandRow.map((band, index) => (
                <div
                  key={index}
                  className={
                    band.caption !== null
                      ? 'oge-band-cell oge-band-filled'
                      : 'oge-band-cell'
                  }
                  role="columnheader"
                  style={{ gridColumn: `span ${band.span}` }}
                  aria-colspan={band.span}
                >
                  {band.caption ?? ''}
                </div>
              ))}
            </div>
          ) : null}
          <div
            className="oge-header-row"
            role="row"
            style={{ gridTemplateColumns }}
          >
            {rowDragging ? (
              <div
                className="oge-header-cell oge-drag-cell"
                role="columnheader"
                aria-label="Reparent"
              />
            ) : null}
            {hasCheckboxColumn ? (
              <div
                className="oge-header-cell oge-checkbox-cell"
                role="columnheader"
                aria-label="Select all"
              >
                {props.allowSelectAll !== false ? (
                  <OgeCheckBox
                    value={core.someSelected() ? null : core.allSelected()}
                    label={msg.selectAllRows}
                    onValueCommitted={() => toggleSelectAll()}
                  />
                ) : null}
              </div>
            ) : null}
            {spacer('left', 'oge-header-cell')}
            {renderColumns.map((column) => {
              const sortable = column.sortable && sortMode !== 'none';
              const reorderable = column.field !== undefined && columnReorder;
              const headerClasses = ['oge-header-cell'];
              const align = alignClass(column);
              if (align) headerClasses.push(align);
              if (sortable) headerClasses.push('oge-header-sortable');
              if (column.pinned !== false) headerClasses.push('oge-pinned');
              if (headerDropTargetId === column.id)
                headerClasses.push('oge-col-drop-target');
              const sort = column.field
                ? state.sort.stateOf(column.field)
                : null;
              return (
                <div
                  key={column.id}
                  className={headerClasses.join(' ')}
                  role="columnheader"
                  data-colid={column.id}
                  style={pinnedStyle(column)}
                  aria-sort={
                    sort
                      ? sort.dir === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : sortable
                        ? 'none'
                        : undefined
                  }
                  tabIndex={sortable || reorderable ? 0 : undefined}
                  draggable={reorderable || undefined}
                  onDragStart={(event) => onHeaderDragStart(column, event)}
                  onDragOver={(event) => onHeaderDragOver(column, event)}
                  onDragEnd={() => model.headerDropTargetId.set(null)}
                  onDrop={(event) => onHeaderDrop(column, event)}
                  onContextMenu={(event) => onHeaderContextMenu(column, event)}
                  onClick={(event) => onHeaderClick(column, event)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ')
                      onHeaderClick(column, event);
                  }}
                >
                  <span className="oge-header-caption">
                    {column.source?.renderHeader
                      ? column.source.renderHeader({
                          column: column.source,
                          caption: column.caption,
                        })
                      : column.caption}
                  </span>
                  {sort ? (
                    <span className="oge-sort-indicator" aria-hidden="true">
                      <svg
                        viewBox="0 0 16 16"
                        width="11"
                        height="11"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path
                          d={
                            sort.dir === 'asc'
                              ? 'm3.5 10 4.5-4.5L12.5 10'
                              : 'm3.5 6 4.5 4.5L12.5 6'
                          }
                        />
                      </svg>
                      {multiSorted ? <sub>{sort.index}</sub> : null}
                    </span>
                  ) : null}
                  {headerFilterVisible && column.filterable ? (
                    <button
                      type="button"
                      className={
                        column.field != null &&
                        state.filter.headerFilterOf(column.field) != null
                          ? 'oge-header-filter-btn oge-header-filter-active'
                          : 'oge-header-filter-btn'
                      }
                      aria-label={msg.filterValues}
                      onClick={(event) => toggleHeaderFilter(column, event)}
                    >
                      <svg
                        viewBox="0 0 16 16"
                        width="12"
                        height="12"
                        aria-hidden="true"
                      >
                        <path
                          d="M1 2h14L10 8.5V14l-4-1.8V8.5L1 2z"
                          fill="currentColor"
                        />
                      </svg>
                    </button>
                  ) : null}
                  {props.columnResize !== false ? (
                    <span
                      className="oge-resize-handle"
                      onPointerDown={(event) => onResizeStart(column, event)}
                    />
                  ) : null}
                </div>
              );
            })}
            {spacer('right', 'oge-header-cell')}
            {hasCommandColumn ? (
              <div
                className="oge-header-cell oge-command-cell"
                role="columnheader"
              />
            ) : null}
          </div>
          {model.filterRowVisible() ? (
            <div
              className="oge-filter-row"
              role="row"
              style={{ gridTemplateColumns }}
            >
              {rowDragging ? (
                <div className="oge-filter-cell" role="gridcell" />
              ) : null}
              {hasCheckboxColumn ? (
                <div className="oge-filter-cell" role="gridcell" />
              ) : null}
              {spacer('left', 'oge-filter-cell')}
              {renderColumns.map((column) => (
                <div
                  key={column.id}
                  className={
                    column.pinned !== false
                      ? 'oge-filter-cell oge-pinned'
                      : 'oge-filter-cell'
                  }
                  role="gridcell"
                  style={pinnedStyle(column)}
                >
                  {filterEditor(column)}
                </div>
              ))}
              {spacer('right', 'oge-filter-cell')}
              {hasCommandColumn ? (
                <div className="oge-filter-cell" role="gridcell" />
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="oge-body" style={{ height: bodyHeight ?? undefined }}>
          <div
            className="oge-rows"
            role="rowgroup"
            style={{ transform: rowsTransform ?? undefined }}
          >
            {viewNodes.length === 0 ? noData() : viewNodes.map(renderNode)}
          </div>
        </div>
      </div>
      {pagingOptions ? (
        <OgePager
          pageIndex={model.pageIndex()}
          pageCount={core.pageCount()}
          totalCount={core.totalCount()}
          pageSize={core.effPageSize() ?? 0}
          pageSizes={pagingOptions.pageSizes ?? null}
          showInfo={pagingOptions.showInfo !== false}
          displayMode={pagingOptions.displayMode ?? 'full'}
          messages={msg}
          onPageChange={(page) => model.pageIndex.set(page)}
          onPageSizeChange={(size) => core.setPageSize(size)}
        />
      ) : null}
      {customLoading !== null || (props.loadPanel && loading) ? (
        <div className="oge-load-panel" role="status">
          <span className="oge-spinner" aria-hidden="true" />
          {customLoading ?? msg.loading}
        </div>
      ) : null}
      {popupNode ? (
        <OgeModal
          className="oge-edit-modal"
          opened
          title={msg.editRow}
          width={420}
          onClosed={() => model.editing.cancelActiveEditor()}
          renderFooter={() => (
            <>
              <button
                type="button"
                className="oge-tool-btn oge-tool-text-btn oge-btn-accent"
                onClick={() => model.editing.commitActiveRow()}
              >
                {msg.saveRow}
              </button>
              <button
                type="button"
                className="oge-tool-btn oge-tool-text-btn"
                onClick={() => model.editing.cancelActiveEditor()}
              >
                {msg.cancelEdit}
              </button>
            </>
          )}
        >
          {renderEditForm(popupNode, 'oge-popup-fields')}
        </OgeModal>
      ) : null}
      {headerFilterField !== null ? (
        <OgePopup ref={headerFilterPopupRef} panel={headerFilterPanel}>
          <div className="oge-header-filter-popup">
            <input
              className="oge-hf-search"
              type="search"
              placeholder={msg.search}
              aria-label={msg.search}
              value={model.headerFilterSearch()}
              onChange={(event) =>
                model.headerFilterSearch.set(event.target.value)
              }
            />
            <label className="oge-hf-item oge-hf-all">
              {headerCheck(allHeaderValuesSelected(headerSelection()), () =>
                setHeaderSelection(toggleAllHeaderValues(headerSelection())),
              )}
              <span>{msg.selectAllValues}</span>
            </label>
            {headerValueGroups
              ? headerValueGroups.map((group) => {
                  const groupState = headerGroupState(
                    headerSelection(),
                    group.values,
                  );
                  return (
                    <Fragment key={group.label}>
                      <label className="oge-hf-item oge-hf-group">
                        {headerCheck(
                          groupState === 'some' ? null : groupState === 'all',
                          () =>
                            setHeaderSelection(
                              toggleHeaderGroup(
                                model.headerValues(),
                                headerSelection(),
                                group.values,
                              ),
                            ),
                        )}
                        <span>{group.label}</span>
                      </label>
                      {group.values.map((value, index) => (
                        <label key={index} className="oge-hf-item oge-hf-leaf">
                          {headerCheck(
                            isHeaderValueSelected(headerSelection(), value),
                            () =>
                              setHeaderSelection(
                                toggleHeaderValue(
                                  model.headerValues(),
                                  headerSelection(),
                                  value,
                                ),
                              ),
                          )}
                          <span>{headerValueTextOf(value)}</span>
                        </label>
                      ))}
                    </Fragment>
                  );
                })
              : visibleHeaderValues.map((value, index) => (
                  <label key={index} className="oge-hf-item">
                    {headerCheck(
                      isHeaderValueSelected(headerSelection(), value),
                      () =>
                        setHeaderSelection(
                          toggleHeaderValue(
                            model.headerValues(),
                            headerSelection(),
                            value,
                          ),
                        ),
                    )}
                    <span>{headerValueTextOf(value)}</span>
                  </label>
                ))}
          </div>
        </OgePopup>
      ) : null}
      {model.contextMenu() ? (
        <OgePopup
          ref={contextMenuPopupRef}
          panel={contextMenuPanel}
          className="oge-context-menu"
        >
          <OgeMenuList
            items={model.contextMenu()?.items ?? []}
            ariaLabel={props.ariaLabel ?? msg.toolbar}
            onItemClick={() => contextMenuPanel.close('select')}
            onCloseRequest={(event) => contextMenuPanel.close(event.reason)}
          />
        </OgePopup>
      ) : null}
      {model.chooserOpen() ? (
        <OgePopup ref={chooserPopupRef} panel={chooserPanel}>
          <div className="oge-chooser-popup">
            <div className="oge-chooser-title">{msg.columnChooserTitle}</div>
            {model.chooserEntries().map((entry) => (
              <label
                key={entry.id}
                className={
                  model.chooserDropTargetId() === entry.id
                    ? 'oge-hf-item oge-chooser-item oge-chooser-drop-target'
                    : 'oge-hf-item oge-chooser-item'
                }
                draggable={columnReorder}
                onDragStart={(event) => {
                  chooserDragId.current = entry.id;
                  event.dataTransfer.setData('text/plain', entry.id);
                  event.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(event) => {
                  if (!chooserDragId.current) return;
                  event.preventDefault();
                  if (model.chooserDropTargetId() !== entry.id)
                    model.chooserDropTargetId.set(entry.id);
                }}
                onDragEnd={onChooserDragEnd}
                onDrop={(event) => onChooserDrop(entry.id, event)}
              >
                {columnReorder ? (
                  <span className="oge-chooser-grip" aria-hidden="true">
                    <svg
                      viewBox="0 0 16 16"
                      width="10"
                      height="10"
                      fill="currentColor"
                    >
                      <circle cx="5" cy="3.5" r="1.2" />
                      <circle cx="11" cy="3.5" r="1.2" />
                      <circle cx="5" cy="8" r="1.2" />
                      <circle cx="11" cy="8" r="1.2" />
                      <circle cx="5" cy="12.5" r="1.2" />
                      <circle cx="11" cy="12.5" r="1.2" />
                    </svg>
                  </span>
                ) : null}
                <OgeCheckBox
                  value={
                    entry.column ? model.columnVisible(entry.column) : true
                  }
                  disabled={!entry.column}
                  onValueCommitted={() => {
                    const field = entry.column?.field;
                    if (entry.column && field)
                      setColumnVisible(
                        field,
                        !model.columnVisible(entry.column),
                      );
                  }}
                />
                <span>{entry.caption}</span>
              </label>
            ))}
          </div>
        </OgePopup>
      ) : null}
      {operatorMenu ? (
        <OgePopup
          ref={operatorPopupRef}
          panel={operatorPanel}
          className="oge-operator-menu"
        >
          <OgeMenuList
            items={operatorItems(operatorMenu.column)}
            ariaLabel={`${msg.filterPrefix} ${operatorMenu.column.caption}`}
            onItemClick={(event) =>
              chooseOperator(
                (event.item.value as FilterOperator | undefined) ?? null,
              )
            }
            onCloseRequest={(event) => operatorPanel.close(event.reason)}
          />
        </OgePopup>
      ) : null}
      {model.builderOpen() ? (
        <OgeModal
          className="oge-builder-modal"
          opened
          title={msg.filterBuilderTitle}
          width={560}
          onClosed={() => model.builderOpen.set(false)}
          renderFooter={() => (
            <>
              <button
                type="button"
                className="oge-tool-btn oge-tool-text-btn oge-btn-accent"
                onClick={applyFilterBuilder}
              >
                {msg.apply}
              </button>
              <button
                type="button"
                className="oge-tool-btn oge-tool-text-btn"
                onClick={() => model.builderOpen.set(false)}
              >
                {msg.cancelEdit}
              </button>
            </>
          )}
        >
          <OgeFilterBuilderGroup
            key={model.builderVersion()}
            root
            group={model.getBuilderTree()}
            fields={model.builderFields()}
            messages={msg}
            onTreeChanged={() =>
              model.builderVersion.set(model.builderVersion() + 1)
            }
          />
          <div className="oge-builder-preview">
            {(() => {
              model.builderVersion();
              const expr = builderToExpr(
                model.getBuilderTree(),
                model.builderFields(),
              );
              return expr
                ? describeExpr(expr, model.builderFields(), msg)
                : '—';
            })()}
          </div>
        </OgeModal>
      ) : null}
    </div>
  );
}

/**
 * The tree list — the React render of Angular's `<oge-tree-list>`, on the
 * same framework-free engine: `OgeTreeListCore` (index, expansion polarity,
 * ancestor-preserving filtering, lazy children, recursive selection, paging,
 * reparenting) plus the grid's state slices, data core, column resolver,
 * virtualizers and keyboard machine from `@oge-ui/behavior`, and the markup
 * is the same `.oge-tree-list` structure the Angular stylesheet styles.
 *
 * ```tsx
 * <OgeTreeList
 *   data={tasks}
 *   keyExpr="id"
 *   parentIdExpr="parentId"
 *   columns={[{ field: 'title' }, { field: 'owner' }]}
 * />
 * ```
 */
export const OgeTreeList = forwardRef(OgeTreeListInner) as <
  T extends object = Record<string, unknown>,
>(
  props: OgeTreeListProps<T> & { ref?: Ref<OgeTreeListHandle<T>> },
) => ReactElement;
