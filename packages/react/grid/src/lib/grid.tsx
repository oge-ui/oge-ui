'use client';

import {
  Fragment,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  type ForwardedRef,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';
import {
  ArrayDataSource,
  buildCsv,
  createFilterPredicate,
  flattenGroupedData,
  groupNodeKey,
  resolveKeySelector,
  type CsvOptions,
  type DataRowNode,
  type FilterExpr,
  type FilterOperator,
  type GridStateSnapshot,
  type GroupRowNode,
  type GroupedItem,
  type RowKey,
  type RowNode,
  type SummaryDescriptor,
  type SummaryRowNode,
  type SummaryType,
} from '@oge-ui/core';
import {
  OGE_GRID_WINDOW_BLOCK_SIZE,
  OgeGridColumnLayoutCore,
  OgeGridDataCore,
  OgeGridDeferredChildrenCore,
  OgeGridKeyboardNavCore,
  OgeGridRowVirtualizerCore,
  OgeGridStateCore,
  OgeGridStatePersistenceCore,
  adaptiveHiddenColumnIds,
  allRowsSelected,
  dateFilterExpr,
  effectiveFilterOperator,
  filterOperatorSymbol,
  filterRowOperatorChoices,
  allHeaderValuesSelected as everyHeaderValueSelected,
  filterHeaderValues,
  formatCellValue,
  formatPattern,
  groupHeaderValuesByYear,
  headerGroupState,
  headerValueText,
  headerYearLabel,
  isHeaderValueSelected as headerValueIsSelected,
  toggleAllHeaderValues as toggleAllHeaderValueSelection,
  toggleHeaderGroup as toggleHeaderGroupSelection,
  toggleHeaderValue as toggleHeaderValueSelection,
  humanize,
  deferredToggleExpr,
  isDataSource,
  keyEqualsExpr,
  lookupTextOf,
  ogeGridBandRow,
  resolveOgeGridColumns,
  rowClickSelectionIntent,
  rowFilterExpr,
  someRowsSelected,
  builderToExpr,
  describeExpr,
  exprToBuilder,
  operatorsFor,
  type LookupItem,
  type OgeBuilderGroup,
  type OgeExportColumn,
  type OgeFilterBuilderField,
  type OgeExportData,
  type OgeExportOptions,
  type OgeExportingEvent,
  type OgeGridColumnSpec,
  type OgeGridMessages,
  type OgeGridResolvedColumn,
  type OgeMenuItem,
  type OgePagingOptions,
  type OgePendingChildRequest,
  type OgeSearchPanelOptions,
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
import { OgeCellEditor } from './cell-editor';
import { OgeFilterBuilderGroup } from './filter-builder';
import { OgeGridEditingModel } from './grid-editing';
import {
  OgeMenuList,
  OgeModal,
  OgePopup,
  useAnchoredPanel,
} from '@oge-ui/react-overlay';
import { useOgeGridConfig, useOgeGridStateStorage } from './grid-config';
import type {
  OgeCommandButton,
  OgeGridColumnProps,
  OgeGridHandle,
  OgeGridProps,
  OgeInitNewRowEvent,
} from './grid-types';
import { OgePager } from './pager';
import { createGridRxAdapter } from './rx-adapter';

// the same leading-cell widths the Angular grid lays out with
const EXPANDER_WIDTH = 32;
const CHECKBOX_WIDTH = 36;
/** Trailing command column width — the Angular grid's `COMMAND_WIDTH`. */
const COMMAND_WIDTH = 90;
const DRAG_WIDTH = 28;
const COLUMN_DRAG_TYPE = 'application/x-oge-column';

type Slot<T> = OgeGridColumnProps<T>['renderCell'];
type ResolvedColumn<T> = OgeGridResolvedColumn<
  T,
  Slot<T>,
  OgeGridColumnProps<T>
>;

/** The full column list as column objects (strings and defs expanded). */
function normalizeColumns<T>(
  columns: OgeGridProps<T & object>['columns'],
): readonly OgeGridColumnProps<T>[] | undefined {
  if (!columns) return undefined;
  return columns.map((column) =>
    typeof column === 'string' ? { field: column } : column,
  ) as readonly OgeGridColumnProps<T>[];
}

const asList = (
  value: SummaryType | readonly SummaryType[] | undefined,
): readonly SummaryType[] =>
  value === undefined ? [] : typeof value === 'string' ? [value] : value;

/** Command-column glyph — the Angular template's inline 13px stroke icon. */
const commandIcon = (path: string, width = 2) => (
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
    <path d={path} />
  </svg>
);

const chevron = (path: string, size = 12, width = 2) => (
  <svg
    viewBox="0 0 16 16"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={width}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={path} />
  </svg>
);

function OgeGridInner<T extends object>(
  props: OgeGridProps<T>,
  ref: ForwardedRef<OgeGridHandle<T>>,
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
  const hostRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const contextStorageRef = useRef(contextStorage);
  contextStorageRef.current = contextStorage;

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
    const viewportHeight = rx.cell(0);
    const hostWidth = rx.cell(0);
    const detectedRtl = rx.cell(false);
    const customLoadingMessage = rx.cell<string | null>(null);
    const focusedRowKeyCell = rx.cell<RowKey | null>(null);
    const rowFilterOps = rx.cell<ReadonlyMap<string, FilterOperator>>(
      new Map(),
    );
    const operatorMenu = rx.cell<{
      column: ResolvedColumn<T>;
      anchor: HTMLElement;
    } | null>(null);
    const headerDropTargetId = rx.cell<string | null>(null);
    const dropTargetKey = rx.cell<RowKey | null>(null);

    const effScrolling = rx.derived(() => {
      const options = p().scrolling;
      const mode =
        options?.mode ?? (p().virtualScroll ? 'virtual' : 'standard');
      return { mode, remote: options?.remote ?? mode === 'infinite' };
    });
    const virtualized = rx.derived(() => effScrolling().mode !== 'standard');
    const windowed = rx.derived(() => virtualized() && effScrolling().remote);
    const rtl = rx.derived(() => p().rtlEnabled ?? detectedRtl());
    const effRowHeight = rx.derived(() => p().rowHeight ?? cfg().rowHeight);
    const effDetailRowHeight = rx.derived(
      () => p().detailRowHeight ?? cfg().detailRowHeight,
    );
    const effOverscan = rx.derived(() => p().overscan ?? cfg().overscan);
    const effColumnMinWidth = rx.derived(
      () => p().columnMinWidth ?? cfg().columnMinWidth,
    );
    const sortMode = rx.derived<'none' | 'single' | 'multi'>(() => {
      const explicit = p().sorting?.mode;
      if (explicit) return explicit;
      const shorthand = p().sortable ?? 'multi';
      if (shorthand === false) return 'none';
      return shorthand === true ? 'multi' : shorthand;
    });
    const allowUnsorting = rx.derived(
      () => p().sorting?.allowUnsorting ?? cfg().allowUnsorting,
    );
    const pagingOptions = rx.derived<OgePagingOptions | null>(() => {
      const value = p().paging ?? false;
      return value === false ? null : value;
    });
    const filterRowVisible = rx.derived(() => {
      const value = p().filterRow ?? false;
      return typeof value === 'boolean' ? value : value.visible !== false;
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
    /** The funnel only shows where the source can actually list distinct values. */
    const headerFilterAvailable = rx.derived(
      () =>
        headerFilterVisible() && typeof data.source()?.distinct === 'function',
    );
    const headerFilterField = rx.cell<string | null>(null);
    const headerFilterAnchor = rx.cell<HTMLElement | null>(null);
    /** `null` while the distinct values are loading. */
    const headerFilterValues = rx.cell<readonly unknown[] | null>(null);
    const headerFilterSearch = rx.cell('');

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
    const selectionMode = rx.derived(() => p().selectionMode ?? 'none');
    const hasCheckboxColumn = rx.derived(() => selectionMode() === 'checkbox');
    const hasExpander = rx.derived(() => p().renderDetail !== undefined);
    const rowDragging = rx.derived(() => p().rowDragging ?? false);
    const groupPanel = rx.derived(() => p().groupPanel ?? false);
    const columnReorder = rx.derived(() => p().columnReorder !== false);
    const groupsAutoExpand = rx.derived(
      () => p().grouping?.autoExpandAll !== false,
    );
    const leadingCellCount = rx.derived(
      () =>
        (rowDragging() ? 1 : 0) +
        (hasExpander() ? 1 : 0) +
        (hasCheckboxColumn() ? 1 : 0),
    );
    const leadingWidth = rx.derived(
      () =>
        (rowDragging() ? DRAG_WIDTH : 0) +
        (hasExpander() ? EXPANDER_WIDTH : 0) +
        (hasCheckboxColumn() ? CHECKBOX_WIDTH : 0),
    );
    /** Leading width counted against adaptive hiding (drag handle excluded). */
    const adaptiveLeadingWidth = rx.derived(
      () =>
        (hasExpander() ? EXPANDER_WIDTH : 0) +
        (hasCheckboxColumn() ? CHECKBOX_WIDTH : 0),
    );
    const leadingTracks = rx.derived<readonly string[]>(() => {
      const leading: string[] = [];
      if (rowDragging()) leading.push(`${DRAG_WIDTH}px`);
      if (hasExpander()) leading.push(`${EXPANDER_WIDTH}px`);
      if (hasCheckboxColumn()) leading.push(`${CHECKBOX_WIDTH}px`);
      return leading;
    });

    // --- columns ---
    const declaredColumns = rx.derived(() => normalizeColumns<T>(p().columns));

    const columnSpecs = rx.derived<
      readonly OgeGridColumnSpec<T, Slot<T>, OgeGridColumnProps<T>>[]
    >(() =>
      (declaredColumns() ?? []).map((column) => ({
        field: column.field,
        caption: column.caption,
        width: column.width,
        dataType: column.dataType ?? 'string',
        format: column.format,
        // lazy: `hiddenOverrides` is declared below and read from a closure
        visible:
          column.visible !== false &&
          !(column.field !== undefined && hiddenOverrides().has(column.field)),
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

    /** Fields whose group summaries render on a footer row instead of the group header. */
    const groupFooterFields = rx.derived<ReadonlySet<string>>(() => {
      const fields = new Set<string>();
      for (const column of declaredColumns() ?? []) {
        if (
          column.field &&
          column.groupSummary &&
          column.groupSummaryPosition === 'footer'
        )
          fields.add(column.field);
      }
      return fields;
    });

    // --- data & rows ---
    const keySelector = rx.derived<(row: T, index: number) => RowKey>(() => {
      const key = p().keyField;
      if (key === undefined) return (_row, index) => index;
      const selector = resolveKeySelector<T>(key);
      return (row) => selector(row);
    });

    const grouped = rx.derived(() => state.grouping.descriptors().length > 0);

    // --- deferred group loading ---
    const pendingGroups = rx.derived<{ key: RowKey; path: unknown[] }[]>(() => {
      const result = data.result();
      const groups = state.grouping.descriptors();
      if (!result || !groups.length || !result.data.length) return [];
      const first = result.data[0] as Record<string, unknown> | null;
      if (typeof first !== 'object' || first === null || !('items' in first))
        return [];
      const autoExpand = groupsAutoExpand();
      const toggled = state.expansion.collapsedGroups();
      const cache = deferredLoader.children();
      const pending: { key: RowKey; path: unknown[] }[] = [];
      const visit = (
        items: readonly GroupedItem<T>[],
        parentKey: RowKey | null,
        path: readonly unknown[],
      ): void => {
        for (const item of items) {
          const key = groupNodeKey(parentKey, item.key);
          const expanded = autoExpand ? !toggled.has(key) : toggled.has(key);
          if (!expanded) continue;
          const children = item.items ?? cache.get(key) ?? null;
          if (children === null) {
            pending.push({ key, path: [...path, item.key] });
            continue;
          }
          const child = children[0] as Record<string, unknown> | undefined;
          if (
            child &&
            typeof child === 'object' &&
            'items' in child &&
            'key' in child
          ) {
            visit(children as readonly GroupedItem<T>[], key, [
              ...path,
              item.key,
            ]);
          }
        }
      };
      visit(result.data as readonly GroupedItem<T>[], null, []);
      return pending;
    });

    const pendingGroupRequests = rx.derived<readonly OgePendingChildRequest[]>(
      () =>
        pendingGroups().map((entry) => ({
          key: entry.key,
          buildOptions: (rest) => {
            const groups = rest.group ?? [];
            const pathFilters: FilterExpr[] = entry.path.map((value, i) => ({
              type: 'binary',
              field: groups[i]?.field ?? '',
              op: 'eq',
              value,
            }));
            const operands = [
              ...(rest.filter ? [rest.filter] : []),
              ...pathFilters,
            ];
            const filter =
              operands.length === 1
                ? operands[0]
                : { type: 'and' as const, operands };
            const remaining = groups.slice(entry.path.length);
            return {
              filter,
              ...(rest.sort?.length ? { sort: rest.sort } : {}),
              ...(rest.searchText ? { searchText: rest.searchText } : {}),
              ...(remaining.length
                ? {
                    group: remaining,
                    ...(rest.groupSummary?.length
                      ? { groupSummary: rest.groupSummary }
                      : {}),
                  }
                : {}),
            };
          },
        })),
    );

    const deferredLoader = new OgeGridDeferredChildrenCore<T>(
      {
        pending: () => pendingGroupRequests(),
        baseOptions: state.loadOptions,
        source: data.source,
        onError: (err) => data.error.set(err),
      },
      rx,
    );

    const flatNodes = rx.derived<RowNode<T>[]>(() => {
      const result = data.result();
      const toggledGroups = state.expansion.collapsedGroups();
      if (!result) {
        return state.editing.added().map((key, index) => ({
          kind: 'data' as const,
          key,
          data: {} as T,
          sourceIndex: -1 - index,
          level: 0,
        }));
      }
      const flattened = flattenGroupedData<T>(result.data as readonly T[], {
        keyOf: keySelector(),
        groups: state.grouping.descriptors(),
        groupSummary: state.grouping.groupSummary(),
        ...(groupsAutoExpand()
          ? { collapsedGroupKeys: toggledGroups }
          : { expandedGroupKeys: toggledGroups }),
        deferredChildren: deferredLoader.children(),
        expandedDetailKeys: hasExpander()
          ? state.expansion.expandedDetails()
          : undefined,
        groupFooters: groupFooterFields().size > 0,
      });
      // unsaved new rows render on top
      const added = state.editing.added();
      if (!added.length) return flattened;
      const addedNodes: RowNode<T>[] = added.map((key, index) => ({
        kind: 'data',
        key,
        data: {} as T,
        sourceIndex: -1 - index,
        level: 0,
      }));
      return [...addedNodes, ...flattened];
    });

    const firstDataRow = rx.derived<T | undefined>(() => {
      const node = flatNodes().find((n) => n.kind === 'data');
      if (node?.kind === 'data') return node.data;
      const first = data.windowRows().values().next();
      return first.done ? undefined : first.value;
    });

    const totalCount = rx.derived<number>(() => {
      if (windowed()) return data.windowTotal() ?? data.highestLoaded();
      const result = data.result();
      if (result?.totalCount != null) return result.totalCount;
      return flatNodes().reduce(
        (count, node) => (node.kind === 'data' ? count + 1 : count),
        0,
      );
    });

    const pageCount = rx.derived<number>(() => {
      const pageSize = state.paging.pageSize();
      return pageSize == null
        ? 1
        : Math.max(1, Math.ceil(totalCount() / pageSize));
    });

    const dataKeys = rx.derived<readonly RowKey[]>(() =>
      flatNodes().flatMap((node) => (node.kind === 'data' ? [node.key] : [])),
    );

    const adaptiveHiddenIds = rx.derived(() =>
      adaptiveHiddenColumnIds({
        columns: columnSpecs(),
        hostWidth: hostWidth(),
        defaultMinWidth: effColumnMinWidth(),
        leadingWidth: adaptiveLeadingWidth(),
      }),
    );

    const resolvedColumns = rx.derived<ResolvedColumn<T>[]>(() =>
      resolveOgeGridColumns<T, Slot<T>, OgeGridColumnProps<T>>({
        specs: columnSpecs(),
        columnDefs: () => undefined,
        firstDataRow,
        widthOverrides: state.columns.widthOverrides(),
        pinOverrides: state.columns.pinOverrides(),
        order: state.columns.order(),
        adaptiveHiddenIds: adaptiveHiddenIds(),
      }),
    );

    /** Adjacent columns sharing a `bandCaption` merge into one spanning cell. */
    const bandRow = rx.derived(() => ogeGridBandRow(resolvedColumns()));

    const colVirtualized = rx.derived(
      () =>
        p().scrolling?.columnRenderingMode === 'virtual' &&
        // bands and pinned columns rely on every column being in the DOM
        bandRow() === null &&
        resolvedColumns().every((column) => column.pinned === false),
    );

    const layout = new OgeGridColumnLayoutCore<ResolvedColumn<T>>(
      {
        resolvedColumns,
        colVirtualized,
        scrollLeft,
        hostWidth,
        leadingTracks,
        // lazy: `hasCommandColumn` is declared below and only ever read from
        // a closure the layout core calls after this function has returned
        trailingTracks: () =>
          hasCommandColumn() ? [`${COMMAND_WIDTH}px`] : [],
        leadingWidth,
        defaultMinWidth: effColumnMinWidth,
        pinnedDefaultWidth: () => cfg().pinnedDefaultWidth,
      },
      rx,
    );

    const columnsByField = rx.derived<ReadonlyMap<string, ResolvedColumn<T>>>(
      () => {
        const map = new Map<string, ResolvedColumn<T>>();
        for (const column of resolvedColumns()) {
          if (column.field !== undefined && !map.has(column.field))
            map.set(column.field, column);
        }
        return map;
      },
    );

    /** Total-summary text per column id; empty when no totals are configured. */
    const totalSummaryByColumn = rx.derived<ReadonlyMap<string, string>>(() => {
      const descriptors = state.grouping.totalSummary();
      const values = data.result()?.summary;
      const out = new Map<string, string>();
      if (!descriptors.length || !values) return out;
      const messages = msgRef.current;
      descriptors.forEach((descriptor, i) => {
        const column = columnsByField().get(descriptor.field);
        if (!column) return;
        const value = formatCellValue(
          values[i],
          column.dataType,
          column.format,
        );
        const text = formatPattern(messages.totalSummaryPattern, {
          label: messages.summaryLabels[descriptor.type],
          value,
        });
        const existing = out.get(column.id);
        out.set(column.id, existing ? `${existing} · ${text}` : text);
      });
      return out;
    });

    // --- virtualization ---
    const windowCount = rx.derived<number>(() => {
      const total = data.windowTotal();
      if (total != null) return total;
      return data.highestLoaded() + OGE_GRID_WINDOW_BLOCK_SIZE;
    });

    const virtualizer = new OgeGridRowVirtualizerCore<T>(
      {
        flatNodes,
        virtualized,
        scrollTop,
        setScrollTop: (value) => scrollTop.set(value),
        viewportHeight,
        rowHeight: effRowHeight,
        detailRowHeight: effDetailRowHeight,
        overscan: effOverscan,
        autoRowHeight: () => p().autoRowHeight ?? false,
        viewport: () => viewportRef.current,
        windowAdapter: {
          active: windowed,
          count: windowCount,
          rows: data.windowRows,
          keyOf: keySelector,
          blockSize: OGE_GRID_WINDOW_BLOCK_SIZE,
        },
      },
      rx,
    );

    // --- keyboard ---
    const keyboard = new OgeGridKeyboardNavCore<T>(
      {
        flatNodes,
        columnCount: () => resolvedColumns().length,
        rtl,
        pageSize: () =>
          Math.max(1, Math.floor(viewportHeight() / effRowHeight()) - 1),
      },
      rx,
    );

    // --- selection ---
    const allSelected = rx.derived(() => {
      const keys = dataKeys();
      if (!keys.length) return false;
      return allRowsSelected({
        keys,
        selected: state.selection.selected(),
        totalCount: totalCount(),
        selectAllMode: p().selectAllMode ?? 'allPages',
      });
    });
    const someSelected = rx.derived(() =>
      someRowsSelected({
        keys: dataKeys(),
        selected: state.selection.selected(),
        totalCount: totalCount(),
        selectAllMode: p().selectAllMode ?? 'allPages',
      }),
    );

    // --- persistence ---
    const hiddenOverrides = rx.cell<ReadonlySet<string>>(new Set());

    const persistedSnapshot = rx.derived<GridStateSnapshot>(() => {
      const base = state.snapshot();
      const hidden = (declaredColumns() ?? [])
        .filter(
          (column) =>
            column.visible === false ||
            (column.field !== undefined && hiddenOverrides().has(column.field)),
        )
        .map((column) => column.field)
        .filter((field): field is string => field != null);
      return { ...base, columns: { ...base.columns, hidden } };
    });

    function applyState(snapshot: GridStateSnapshot): void {
      state.applySnapshot(snapshot);
      hiddenOverrides.set(new Set(snapshot.columns?.hidden ?? []));
    }

    const persistence = new OgeGridStatePersistenceCore<GridStateSnapshot>({
      prefix: 'oge-grid',
      get storage() {
        return latest.current.stateStorage ?? contextStorageRef.current;
      },
      snapshot: () => persistedSnapshot(),
      stateKey: () => latest.current.stateKey,
      apply: (snapshot) => applyState(snapshot),
      onChange: (snapshot) => latest.current.onStateChange?.(snapshot),
    });

    const editing = new OgeGridEditingModel<T, Slot<T>>(
      {
        editing: () => p().editing ?? false,
        state: state.editing,
        columns: resolvedColumns,
        flatNodes,
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
          dataError: (error) => data.error.set(error),
        },
        reload: () => data.reload(),
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

    /**
     * The row currently rendered as an inline edit form or a popup, if any.
     * Both surfaces edit exactly one row at a time, which is what lets one
     * draft map back either.
     */
    const editFormNode = rx.derived<DataRowNode<T> | null>(() => {
      const mode = editing.editMode();
      if (mode !== 'form' && mode !== 'popup') return null;
      const key = state.editing.editRowKey();
      if (key === null) return null;
      return (
        flatNodes().find(
          (node): node is DataRowNode<T> =>
            node.kind === 'data' && node.key === key,
        ) ?? null
      );
    });

    /** Layout columns for the edit form; `'auto'` keeps the auto-fit default. */
    const editFormColCount = rx.derived<number | 'auto'>(() => {
      const count = editing.editingOptions()?.formColCount;
      return count && count > 0 ? count : 'auto';
    });

    /**
     * `highlightChanges`: cells a push updated, stamped with the batch that
     * changed them. 1/2 alternate per batch so consecutive updates to the
     * same cell restart the CSS animation (two identical keyframes, new class).
     */
    const updatedCells = rx.cell<ReadonlyMap<string, number>>(new Map());

    /**
     * The builder's condition tree — a plain mutable object, edited in place
     * by the recursive editor and stamped by `builderVersion` so the preview
     * and the modal re-render. The kernel in `@oge-ui/behavior` works on this
     * exact shape, so both layers edit the same model.
     */
    let builderTree: OgeBuilderGroup = {
      kind: 'group',
      logic: 'and',
      items: [],
    };
    const builderOpen = rx.cell(false);
    const builderVersion = rx.cell(0);

    const builderFields = rx.derived<OgeFilterBuilderField[]>(() =>
      resolvedColumns()
        .filter((column) => column.filterable && column.field)
        .map((column) => ({
          field: column.field as string,
          caption: column.caption,
          dataType: column.dataType,
        })),
    );

    // --- deferred selection ---
    const uncontrolledSelectionFilter = rx.cell<FilterExpr | null>(null);
    const selectionFilter = rx.derived<FilterExpr | null>(() =>
      p().selectionFilter !== undefined
        ? (p().selectionFilter ?? null)
        : uncontrolledSelectionFilter(),
    );
    const setSelectionFilter = (next: FilterExpr | null): void => {
      if (p().selectionFilter === undefined)
        uncontrolledSelectionFilter.set(next);
      p().onSelectionFilterChange?.(next);
    };
    const selectionDeferred = rx.derived(() => p().selectionDeferred === true);
    const deferredKeyFieldName = rx.derived<string | null>(() => {
      const key = p().keyField;
      return typeof key === 'string' ? key : null;
    });
    /** Keys of the currently rendered rows that match `selectionFilter`. */
    const deferredSelectedKeys = rx.derived<ReadonlySet<RowKey>>(() => {
      const expr = selectionFilter();
      if (!selectionDeferred() || !expr) return new Set<RowKey>();
      const predicate = createFilterPredicate<T>(expr);
      const keys = new Set<RowKey>();
      for (const node of flatNodes()) {
        if (node.kind === 'data' && predicate(node.data)) keys.add(node.key);
      }
      return keys;
    });

    const contextMenu = rx.cell<{
      x: number;
      y: number;
      items: OgeMenuItem[];
    } | null>(null);

    const chooserOpen = rx.cell(false);
    const chooserAnchor = rx.cell<HTMLElement | null>(null);
    /** Chooser row the dragged column would be inserted in front of. */
    const chooserDropTargetId = rx.cell<string | null>(null);

    /** Chooser rows: every column with its id and caption, in display order. */
    const chooserEntries = rx.derived<
      readonly { id: string; caption: string; field: string | undefined }[]
    >(() => {
      const declared = declaredColumns() ?? [];
      const entries = declared.length
        ? declared.map((column, index) => ({
            id: column.field ?? `col-${index}`,
            caption:
              column.caption ?? (column.field ? humanize(column.field) : ''),
            field: column.field,
          }))
        : resolvedColumns().map((column) => ({
            id: column.id,
            caption: column.caption,
            field: column.field,
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

    const hasCommandColumn = rx.derived(() => {
      if (p().commandButtons?.length) return true;
      const mode = editing.editMode();
      if (!mode) return false;
      if (mode === 'row' || mode === 'popup' || mode === 'form')
        return editing.canUpdate() || editing.canDelete();
      return editing.canDelete();
    });

    /** Buttons rendered in a row's idle command cell — the prop overrides the defaults. */
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

    /** All group node keys of the current result, across levels. */
    function collectGroupKeys(): Set<RowKey> {
      const keys = new Set<RowKey>();
      const result = data.result();
      if (!result?.data.length) return keys;
      const visit = (
        items: readonly unknown[],
        parentKey: RowKey | null,
      ): void => {
        for (const item of items) {
          if (
            typeof item !== 'object' ||
            item === null ||
            !('items' in item) ||
            !('key' in item)
          )
            return;
          const group = item as GroupedItem<T>;
          const key = groupNodeKey(parentKey, group.key);
          keys.add(key);
          if (group.items?.length) visit(group.items, key);
        }
      };
      visit(result.data, null);
      return keys;
    }

    return {
      rx,
      state,
      data,
      scrollTop,
      scrollLeft,
      viewportHeight,
      hostWidth,
      detectedRtl,
      customLoadingMessage,
      focusedRowKeyCell,
      rowFilterOps,
      operatorMenu,
      headerDropTargetId,
      dropTargetKey,
      virtualized,
      windowed,
      rtl,
      effRowHeight,
      effDetailRowHeight,
      sortMode,
      allowUnsorting,
      pagingOptions,
      filterRowVisible,
      headerFilterVisible,
      headerFilterAvailable,
      effHeaderFilterLimit,
      headerFilterField,
      headerFilterAnchor,
      headerFilterValues,
      headerFilterSearch,
      effFilterDebounce,
      searchPanelVisible,
      searchPanelOptions,
      selectionMode,
      hasCheckboxColumn,
      hasExpander,
      rowDragging,
      groupPanel,
      columnReorder,
      groupsAutoExpand,
      leadingCellCount,
      leadingWidth,
      keySelector,
      grouped,
      flatNodes,
      totalCount,
      pageCount,
      dataKeys,
      declaredColumns,
      groupFooterFields,
      resolvedColumns,
      bandRow,
      colVirtualized,
      layout,
      columnsByField,
      totalSummaryByColumn,
      virtualizer,
      keyboard,
      allSelected,
      someSelected,
      persistence,
      persistedSnapshot,
      applyState,
      deferredLoader,
      editing,
      updatedCells,
      selectionDeferred,
      selectionFilter,
      setSelectionFilter,
      deferredKeyFieldName,
      deferredSelectedKeys,
      contextMenu,
      builderOpen,
      builderVersion,
      builderFields,
      getBuilderTree: () => builderTree,
      setBuilderTree: (tree: OgeBuilderGroup) => {
        builderTree = tree;
      },
      chooserOpen,
      chooserAnchor,
      chooserDropTargetId,
      chooserEntries,
      hiddenOverrides,
      editFormItems,
      editFormNode,
      editFormColCount,
      hasCommandColumn,
      effCommandButtons,
      collectGroupKeys,
    };
  }, []);

  // every render starts a new version: props may have changed
  model.rx.invalidate();
  const { state, data } = model;

  // --- effects -----------------------------------------------------------
  const keyField = props.keyField;
  const columnSelectors = useMemo(() => {
    const sortValues: Record<string, (row: T) => unknown> = {};
    const customSummaries: Record<string, (rows: readonly T[]) => unknown> = {};
    for (const column of normalizeColumns<T>(props.columns) ?? []) {
      if (!column.field) continue;
      if (column.calculateSortValue)
        sortValues[column.field] = column.calculateSortValue;
      if (column.calculateCustomSummary)
        customSummaries[column.field] = column.calculateCustomSummary;
    }
    return {
      sortValues: Object.keys(sortValues).length ? sortValues : undefined,
      customSummaries: Object.keys(customSummaries).length
        ? customSummaries
        : undefined,
    };
  }, [props.columns]);

  useEffect(() => {
    const source = props.data ?? [];
    data.setSource(
      isDataSource(source)
        ? source
        : new ArrayDataSource<T>(source, {
            key: keyField,
            sortValues: columnSelectors.sortValues,
            customSummaries: columnSelectors.customSummaries,
          }),
    );
    return () => data.setSource(null);
  }, [data, props.data, keyField, columnSelectors]);

  useEffect(() => () => data.destroy(), [data]);

  // option effects react to *content* changes only (inline objects/arrays are new every render)
  const pagingJson = props.paging ? JSON.stringify(props.paging) : 'off';
  useEffect(() => {
    const options = props.paging ? props.paging : null;
    state.paging.configure(options ? options.pageSize : null);
  }, [state, pagingJson]);

  const groupByJson = props.groupBy ? JSON.stringify(props.groupBy) : null;
  useEffect(() => {
    if (groupByJson === null) return;
    const fields = JSON.parse(groupByJson) as string[];
    state.grouping.set(fields.map((field) => ({ field, dir: 'asc' as const })));
  }, [state, groupByJson]);

  // summary configuration comes from the declared columns
  const summaryJson = JSON.stringify(
    (normalizeColumns<T>(props.columns) ?? []).map((column) => [
      column.field,
      asList(column.groupSummary),
      asList(column.totalSummary),
    ]),
  );
  useEffect(() => {
    const group: SummaryDescriptor[] = [];
    const total: SummaryDescriptor[] = [];
    for (const column of normalizeColumns<T>(latest.current.columns) ?? []) {
      const field = column.field;
      if (!field) continue;
      for (const type of asList(column.groupSummary))
        group.push({ field, type });
      for (const type of asList(column.totalSummary))
        total.push({ field, type });
    }
    state.grouping.setSummaries(group, total);
  }, [state, summaryJson]);

  // initial sort/group from the column props — applied only while untouched
  const initialJson = JSON.stringify(
    (normalizeColumns<T>(props.columns) ?? []).map((column) => ({
      field: column.field,
      dir: column.sortOrder,
      index: column.sortIndex ?? 0,
      group: column.groupIndex,
    })),
  );
  useEffect(() => {
    const columns = JSON.parse(initialJson) as {
      field?: string;
      dir?: 'asc' | 'desc';
      index: number;
      group?: number;
    }[];
    const sortConfigs = columns
      .filter((c) => c.field && c.dir)
      .sort((a, b) => a.index - b.index);
    const groupConfigs = columns
      .filter((c) => c.field && c.group !== undefined)
      .sort((a, b) => (a.group ?? 0) - (b.group ?? 0));
    if (sortConfigs.length && state.sort.descriptors().length === 0) {
      state.sort.set(
        sortConfigs.map((c) => ({
          field: c.field as string,
          dir: c.dir as 'asc' | 'desc',
        })),
      );
    }
    if (groupConfigs.length && state.grouping.descriptors().length === 0) {
      state.grouping.set(
        groupConfigs.map((c) => ({ field: c.field as string, dir: 'asc' })),
      );
    }
  }, [state, initialJson]);

  // windowed mode: load strategy + block requests for the visible window
  const windowed = model.windowed();
  useEffect(() => {
    data.setMode(windowed ? 'window' : 'full');
    if (!windowed) data.sync();
  }, [data, windowed]);

  // cross-slice invariants, then the loads the options call for — after
  // every render, all idempotent
  useLayoutEffect(() => {
    if (state.reconcile()) rerender();
  });
  useEffect(() => {
    if (model.windowed()) {
      if (!data.source()) return;
      const window = model.virtualizer.viewWindow();
      const start = window?.start ?? 0;
      const end = window?.end ?? OGE_GRID_WINDOW_BLOCK_SIZE;
      data.requestRange(start, end + OGE_GRID_WINDOW_BLOCK_SIZE);
      return;
    }
    data.sync();
    model.deferredLoader.sync();
  });

  // measured row heights (auto row height) once the DOM for the window exists
  useLayoutEffect(() => {
    if (!model.virtualizer.measuring()) return;
    model.virtualizer.measureRenderedRows();
  });

  // selectedKeys (controlled) → selection slice
  const selectedKeysProp = props.selectedKeys;
  const defaultSelectedKeys = props.defaultSelectedKeys;
  useEffect(() => {
    const keys = selectedKeysProp;
    if (!keys) return;
    const current = state.selection.selected();
    if (keys.length === current.size && keys.every((key) => current.has(key)))
      return;
    state.selection.replace(keys);
  }, [state, selectedKeysProp]);
  useEffect(() => {
    if (defaultSelectedKeys?.length)
      state.selection.replace(defaultSelectedKeys);
  }, []);

  // selection → callbacks, with diffs; the initial state is not a change
  const previousSelection = useRef<ReadonlySet<RowKey> | null>(null);
  const selected = state.selection.selected();
  useEffect(() => {
    const previous = previousSelection.current;
    previousSelection.current = selected;
    if (previous === null) return;
    if (
      previous.size === selected.size &&
      [...selected].every((key) => previous.has(key))
    )
      return;
    const keys = [...selected];
    latest.current.onSelectedKeysChange?.(keys);
    latest.current.onSelectionChanged?.({
      selectedKeys: keys,
      addedKeys: keys.filter((key) => !previous.has(key)),
      removedKeys: [...previous].filter((key) => !selected.has(key)),
    });
  }, [selected]);

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
    latest.current.onFocusedRowKeyChange?.(focusedRowKey);
    latest.current.onFocusedRowChanged?.({
      key: focusedRowKey,
      row:
        focusedRowKey === null ? undefined : dataNodeByKey(focusedRowKey)?.data,
    });
  }, [focusedRowKey]);

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
  useEffect(() => {
    const viewport = viewportRef.current;
    const host = hostRef.current;
    if (!viewport || !host) return;
    model.viewportHeight.set(viewport.clientHeight);
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

  // highlightChanges: stamp pushed cells, clear each batch after its flash
  const pushed = data.pushedCells();
  useEffect(() => {
    if (!pushed.cells.length || !latest.current.highlightChanges) return;
    const next = new Map(model.updatedCells());
    for (const cell of pushed.cells)
      next.set(`${String(cell.key)}::${cell.field}`, pushed.batch);
    model.updatedCells.set(next);
    const timer = setTimeout(() => {
      const current = new Map(model.updatedCells());
      let changed = false;
      for (const [cellKey, cellBatch] of current) {
        if (cellBatch === pushed.batch) {
          current.delete(cellKey);
          changed = true;
        }
      }
      if (changed) model.updatedCells.set(current);
    }, 1300);
    return () => clearTimeout(timer);
  }, [pushed.batch]);

  // filterValue ⇄ the builder filter slice (guarded both ways, like Angular's
  // two effects: whichever side changed wins, and neither echoes back)
  const filterValueProp = props.filterValue;
  useEffect(() => {
    if (filterValueProp === undefined) return;
    const current = state.filter.builderFilter();
    if (JSON.stringify(filterValueProp) === JSON.stringify(current)) return;
    state.filter.setBuilderFilter(filterValueProp ?? null);
  }, [JSON.stringify(filterValueProp ?? null)]);

  const builderFilter = state.filter.builderFilter();
  useEffect(() => {
    if (
      JSON.stringify(builderFilter) === JSON.stringify(filterValueProp ?? null)
    )
      return;
    latest.current.onFilterValueChange?.(builderFilter);
  }, [JSON.stringify(builderFilter)]);

  // focus the first editor when one opens
  const editorSession =
    state.editing.editCell() ?? state.editing.editRowKey() ?? null;
  useEffect(() => {
    if (editorSession === null) return;
    const editor = hostRef.current?.querySelector<HTMLElement>('.oge-editor');
    // composite editors carry .oge-editor on the host — focus the control
    (
      editor?.querySelector<HTMLElement>('input, select, textarea') ?? editor
    )?.focus();
  }, [
    typeof editorSession === 'object' && editorSession !== null
      ? `${String(editorSession.key)}::${editorSession.field}`
      : editorSession,
  ]);

  // focus follows the keyboard-navigation cell — unless an editor is open,
  // in which case the effect above owns the focus. Without this guard the
  // cell steals focus back the moment its own editor mounts, the editor's
  // focusout commits, and click-to-edit closes on the frame it opened.
  const focusedCell = model.keyboard.focusedCell();
  const editorOpen =
    state.editing.editCell() !== null || state.editing.editRowKey() !== null;
  useEffect(() => {
    if (!focusedCell || editorOpen) return;
    model.virtualizer.scrollRowIntoView(focusedCell.row);
    scrollColumnIntoView(focusedCell.col);
    const viewport = viewportRef.current;
    const el = viewport?.querySelector<HTMLElement>(
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

  // --- helpers -----------------------------------------------------------
  function dataNodeByKey(key: RowKey): DataRowNode<T> | undefined {
    return model
      .flatNodes()
      .find(
        (node): node is DataRowNode<T> =>
          node.kind === 'data' && node.key === key,
      );
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

  function scrollToRow(target: number | RowKey): void {
    const nodes = model.flatNodes();
    let index = nodes.findIndex((node) => node.key === target);
    if (
      index < 0 &&
      typeof target === 'number' &&
      target >= 0 &&
      target < nodes.length
    ) {
      index = target;
    }
    if (index < 0) return;
    if (model.virtualized()) {
      model.virtualizer.scrollRowIntoView(index);
      return;
    }
    viewportRef.current
      ?.querySelector<HTMLElement>(`[data-rowindex="${index}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }

  function setFocusedRowKey(key: RowKey | null): void {
    if (latest.current.focusedRowKey === undefined)
      model.focusedRowKeyCell.set(key);
    else if (key !== latest.current.focusedRowKey) {
      // controlled: report, the owner writes the prop back
      latest.current.onFocusedRowKeyChange?.(key);
    }
  }

  // --- grouping & expansion ---
  function expandAllGroups(): void {
    state.expansion.setGroups(
      model.groupsAutoExpand() ? new Set() : model.collectGroupKeys(),
    );
  }

  function collapseAllGroups(): void {
    state.expansion.setGroups(
      model.groupsAutoExpand() ? model.collectGroupKeys() : new Set(),
    );
  }

  function isRowExpanded(key: RowKey): boolean {
    if (model.collectGroupKeys().has(key)) {
      const toggled = state.expansion.collapsedGroups();
      return model.groupsAutoExpand() ? !toggled.has(key) : toggled.has(key);
    }
    return state.expansion.isDetailExpanded(key);
  }

  function setRowExpansion(key: RowKey, expanded: boolean): void {
    if (isRowExpanded(key) === expanded) return;
    if (model.collectGroupKeys().has(key)) state.expansion.toggleGroup(key);
    else state.expansion.toggleDetail(key);
  }

  function groupCaption(field: string): string {
    return model.columnsByField().get(field)?.caption ?? humanize(field);
  }

  function groupValueText(node: GroupRowNode): string {
    const column = model.columnsByField().get(node.groupField);
    return column
      ? formatCellValue(node.groupValue, column.dataType, column.format)
      : String(node.groupValue ?? '');
  }

  function groupSummaryText(node: GroupRowNode): string {
    const footerFields = model.groupFooterFields();
    return node.summaries
      .filter((summary) => !footerFields.has(summary.field))
      .map((summary) => {
        const column = summary.field
          ? model.columnsByField().get(summary.field)
          : undefined;
        const value = column
          ? formatCellValue(summary.value, column.dataType, column.format)
          : String(summary.value ?? '');
        return formatPattern(msg.groupSummaryPattern, {
          label: msg.summaryLabels[summary.type],
          column: column?.caption ?? summary.field,
          value,
        });
      })
      .join('  ·  ');
  }

  function groupFooterText(
    node: SummaryRowNode,
    column: ResolvedColumn<T>,
  ): string {
    const field = column.field;
    if (!field || !model.groupFooterFields().has(field)) return '';
    return node.summaries
      .filter((summary) => summary.field === field)
      .map((summary) =>
        formatPattern(msg.totalSummaryPattern, {
          label: msg.summaryLabels[summary.type],
          value: formatCellValue(summary.value, column.dataType, column.format),
        }),
      )
      .join(' · ');
  }

  // --- export ---
  function exportColumns(): OgeExportColumn<T>[] {
    const messages = msgRef.current;
    return model
      .resolvedColumns()
      .filter((column) => column.field)
      .map((column) => ({
        caption: column.caption,
        field: column.field,
        dataType: column.dataType,
        accessor: column.accessor as (row: T) => unknown,
        format:
          column.format ??
          (column.lookupItems
            ? (value: unknown) =>
                lookupTextOf(column.lookupItems as LookupItem[], value)
            : column.dataType === 'boolean'
              ? (value: unknown) =>
                  value ? messages.booleanTrue : messages.booleanFalse
              : undefined),
      }));
  }

  async function getExportData(
    options: OgeExportOptions<T> = {},
  ): Promise<OgeExportData<T>> {
    const scope = options.scope ?? 'all';
    const source = data.source();
    const load = state.loadOptions();
    const loaded = source
      ? await source.load({
          ...(load.sort?.length ? { sort: load.sort } : {}),
          ...(load.filter ? { filter: load.filter } : {}),
          ...(load.searchText ? { searchText: load.searchText } : {}),
          ...(scope === 'page' && load.take != null
            ? { skip: load.skip ?? 0, take: load.take }
            : {}),
        })
      : { data: [] };
    let rows = loaded.data as readonly T[];
    if (scope === 'selection') {
      const selectedNow = state.selection.selected();
      const keyOf = model.keySelector();
      rows = rows.filter((row, index) => selectedNow.has(keyOf(row, index)));
    }
    return { rows, columns: exportColumns() };
  }

  async function getCsv(
    options?: CsvOptions & OgeExportOptions<T>,
  ): Promise<string> {
    const { rows, columns } = await getExportData({ scope: options?.scope });
    const customize = options?.customizeCell;
    const csvColumns = customize
      ? columns.map((column) => ({
          caption: column.caption,
          accessor: (row: T) => {
            const value = column.accessor(row);
            const text =
              value == null
                ? ''
                : column.format
                  ? column.format(value)
                  : String(value);
            const out = customize({
              row,
              field: column.field,
              caption: column.caption,
              value,
              text,
            });
            return out === undefined ? text : out;
          },
        }))
      : columns;
    return buildCsv(rows, csvColumns, options);
  }

  async function exportCsv(filename = 'grid.csv'): Promise<void> {
    const event: OgeExportingEvent = { fileName: filename, cancel: false };
    latest.current.onExporting?.(event);
    if (event.cancel) return;
    const csv = await getCsv();
    if (typeof document === 'undefined') return;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = event.fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function clipboardText(): string {
    const nodes = model.flatNodes();
    const columns = exportColumns();
    const selectedNow = state.selection.selected();
    const rows = nodes
      .filter(
        (node): node is DataRowNode<T> =>
          node.kind === 'data' && selectedNow.has(node.key),
      )
      .map((node) => node.data);
    if (rows.length)
      return buildCsv(rows, columns, { separator: '\t', bom: false });
    const cell = model.keyboard.focusedCell();
    const node = cell ? nodes[cell.row] : undefined;
    const column = cell ? model.resolvedColumns()[cell.col] : undefined;
    if (!node || node.kind !== 'data' || !column) return '';
    const value = column.accessor(node.data);
    return value == null
      ? ''
      : column.format
        ? column.format(value)
        : String(value);
  }

  async function copyToClipboard(): Promise<void> {
    const text = clipboardText();
    if (text && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    }
  }

  /** True when `key` is selected, whichever selection model is in force. */
  function isRowSelected(key: RowKey): boolean {
    return model.selectionDeferred()
      ? model.deferredSelectedKeys().has(key)
      : state.selection.isSelected(key);
  }

  /** Adds or removes one key from the deferred selection expression. */
  function deferredToggle(key: RowKey): void {
    const eq = keyEqualsExpr(model.deferredKeyFieldName(), key);
    if (!eq) return;
    model.setSelectionFilter(
      deferredToggleExpr(model.selectionFilter(), eq, isRowSelected(key)),
    );
  }

  function selectAll(): void {
    if (model.selectionDeferred()) {
      const field = model.deferredKeyFieldName();
      if (!field) return;
      // the selection *is* the current filter, so no keys are materialized
      const filter = state.loadOptions().filter;
      model.setSelectionFilter(
        filter ?? { type: 'binary', field, op: 'isnotnull' },
      );
      return;
    }
    if ((latest.current.selectAllMode ?? 'allPages') === 'page') {
      state.selection.replace(model.dataKeys());
      return;
    }
    void getExportData().then(({ rows }) => {
      const keyOf = model.keySelector();
      state.selection.replace(rows.map((row, index) => keyOf(row, index)));
    });
  }

  function clearSelection(): void {
    if (model.selectionDeferred()) {
      model.setSelectionFilter(null);
      return;
    }
    state.selection.clear();
  }

  function toggleSelectAll(): void {
    if (model.allSelected()) clearSelection();
    else selectAll();
  }

  /** Shared toolbar/imperative add-row path — stages `onInitNewRow` prefills. */
  function createNewRow(): void {
    model.editing.addNewRow();
    const key = state.editing.added()[0];
    if (key === undefined) return;
    const event: OgeInitNewRowEvent = { key, values: {} };
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

  useImperativeHandle(ref, (): OgeGridHandle<T> => ({
    refresh: () => {
      model.deferredLoader.reset();
      data.reload();
    },
    clearFilters: () => state.filter.clearAll(),
    clearSorting: () => state.sort.clear(),
    scrollToRow,
    navigateToRow: (key) => {
      scrollToRow(key);
      if (latest.current.focusedRowEnabled) setFocusedRowKey(key);
    },
    expandAllGroups,
    collapseAllGroups,
    isRowExpanded,
    expandRow: (key) => setRowExpansion(key, true),
    collapseRow: (key) => setRowExpansion(key, false),
    beginCustomLoading: (message) =>
      model.customLoadingMessage.set(message ?? msgRef.current.loading),
    endCustomLoading: () => model.customLoadingMessage.set(null),
    pageIndex: () => state.paging.pageIndex(),
    setPageIndex: (index) =>
      state.paging.goTo(Math.min(Math.max(0, index), model.pageCount() - 1)),
    pageSize: () => state.paging.pageSize() ?? 0,
    setPageSize: (size) => state.paging.configure(size === 0 ? null : size),
    pageCount: () => model.pageCount(),
    totalCount: () => model.totalCount(),
    getVisibleRows: () =>
      model
        .flatNodes()
        .flatMap((node) => (node.kind === 'data' ? [node.data] : [])),
    getRowByKey: (key) => dataNodeByKey(key)?.data,
    getSelectedRowsData: () => {
      const selectedNow = model.selectionDeferred()
        ? model.deferredSelectedKeys()
        : state.selection.selected();
      return model
        .flatNodes()
        .filter(
          (node): node is DataRowNode<T> =>
            node.kind === 'data' && selectedNow.has(node.key),
        )
        .map((node) => node.data);
    },
    selectAll,
    clearSelection,
    deselectAll: clearSelection,
    isRowSelected,
    state: () => model.persistedSnapshot(),
    applyState: (snapshot) => model.applyState(snapshot),
    getExportData,
    getCsv,
    exportCsv,
    copyToClipboard,
    addRow: () => {
      if (model.editing.canAdd()) createNewRow();
    },
    editRow: (key) => {
      if (!model.editing.canUpdate()) return;
      const node = dataNodeByKey(key);
      if (node) model.editing.startRowEdit(node);
    },
    deleteRow: (key) => {
      if (!model.editing.canDelete()) return;
      const node = dataNodeByKey(key);
      if (node) model.editing.deleteRow(node);
    },
    saveChanges,
    discardChanges: () => model.editing.cancelEditing(),
    hasChanges: () => state.editing.hasPending(),
  }));

  // --- event handlers ------------------------------------------------------
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
    const { shiftKey, ctrlKey } = event.nativeEvent as
      MouseEvent | KeyboardEvent;
    if ('key' in event.nativeEvent) event.preventDefault();
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

  // --- group panel & column drag/drop ---
  function headerDraggable(column: ResolvedColumn<T>): boolean {
    return (
      column.field !== undefined &&
      (model.groupPanel() || model.columnReorder())
    );
  }

  function onHeaderDragStart(
    column: ResolvedColumn<T>,
    event: React.DragEvent,
  ): void {
    if (!headerDraggable(column)) {
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

  function onGroupPanelDrop(event: React.DragEvent): void {
    const sourceId = event.dataTransfer.getData(COLUMN_DRAG_TYPE);
    if (!sourceId) return;
    event.preventDefault();
    const column = model.resolvedColumns().find((c) => c.id === sourceId);
    if (column?.field) state.grouping.groupBy(column.field);
  }

  // --- row drag reordering ---
  const draggedRowKey = useRef<RowKey | null>(null);

  function onRowDragEnd(): void {
    draggedRowKey.current = null;
    model.dropTargetKey.set(null);
  }

  function onRowDrop(target: DataRowNode<T>, event: React.DragEvent): void {
    const fromKey = draggedRowKey.current;
    onRowDragEnd();
    if (fromKey === null || fromKey === target.key) return;
    event.preventDefault();
    event.stopPropagation();
    const dataNodes = model
      .flatNodes()
      .filter((node): node is DataRowNode<T> => node.kind === 'data');
    const fromIndex = dataNodes.findIndex((node) => node.key === fromKey);
    const toIndex = dataNodes.findIndex((node) => node.key === target.key);
    if (fromIndex < 0 || toIndex < 0) return;
    const moved = dataNodes[fromIndex].data;
    // plain-array data: move in place so the new order survives a reload
    const source = latest.current.data;
    if (Array.isArray(source)) {
      const keyOf = model.keySelector();
      const rows = source as T[];
      const sourceFrom = rows.findIndex(
        (row, index) => keyOf(row, index) === fromKey,
      );
      const sourceTo = rows.findIndex(
        (row, index) => keyOf(row, index) === target.key,
      );
      if (sourceFrom >= 0 && sourceTo >= 0) {
        rows.splice(sourceTo, 0, ...rows.splice(sourceFrom, 1));
        data.reload();
      }
    }
    latest.current.onRowReordered?.({
      key: fromKey,
      targetKey: target.key,
      fromIndex,
      toIndex,
      row: moved,
    });
  }

  function onRowClick(node: DataRowNode<T>, event: React.MouseEvent): void {
    latest.current.onRowClick?.({ row: node.data, key: node.key, event });
    if (latest.current.focusedRowEnabled) setFocusedRowKey(node.key);
    const mode = model.selectionMode();
    if (mode === 'none') return;
    switch (rowClickSelectionIntent(mode, event)) {
      case 'range':
        state.selection.selectRange(model.dataKeys(), node.key);
        break;
      case 'toggle':
        state.selection.toggle(node.key);
        break;
      case 'selectOnly':
        state.selection.selectOnly(node.key);
        break;
      default:
        break;
    }
  }

  function onCellClick(
    node: DataRowNode<T>,
    column: ResolvedColumn<T>,
    event: React.SyntheticEvent,
    double: boolean,
  ): void {
    const payload = {
      row: node.data,
      key: node.key,
      field: column.field,
      value: column.accessor(node.data),
      event,
    };
    // ignore events bubbling out of an open editor (e.g. its own Enter commit)
    if ((event.target as HTMLElement | null)?.closest?.('.oge-editor')) return;
    if (double) latest.current.onCellDblClick?.(payload);
    else latest.current.onCellClick?.(payload);

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

  /** Renders one cell's editor — shared by the cell, row and popup surfaces. */
  function renderCellEditor(
    node: DataRowNode<T>,
    column: ResolvedColumn<T>,
    surface: 'cell' | 'form' | 'popup',
  ): ReactNode {
    const field = column.field as string;
    const entry = model.editing.editorAt(node, column);
    if (!entry) return null;
    const setValue = (next: unknown) =>
      model.editing.setEditorValue(node.key, field, next);
    const spec = column.source as OgeGridColumnProps<T> | undefined;
    if (spec?.renderEditor) {
      return spec.renderEditor({
        value: entry.value,
        setValue,
        row: node.data,
        key: node.key,
        column: spec,
        error: entry.touched ? entry.error : null,
        commit: () => model.editing.commitActiveCell(),
        cancel: () => model.editing.cancelActiveEditor(),
      });
    }
    const showError = entry.touched && entry.error !== null;
    return (
      <OgeCellEditor
        surface={surface}
        autoFocus={surface === 'cell'}
        value={entry.value}
        onValueChange={setValue}
        dataType={column.dataType}
        lookupItems={model.editing.lookupItemsFor(node, column)}
        label={column.caption}
        invalid={showError}
        errorTitle={showError ? entry.error : null}
        onEnterKey={() =>
          surface === 'cell'
            ? model.editing.commitActiveCell()
            : model.editing.commitActiveRow()
        }
        onEscapeKey={() => model.editing.cancelActiveEditor()}
        onTabKey={(event) =>
          surface === 'cell'
            ? model.editing.commitAndNext(node, column, event.nativeEvent)
            : undefined
        }
        onFocusLeft={() => {
          if (surface === 'cell') model.editing.onEditorBlur();
          else model.editing.touchEditor(node.key, field);
        }}
      />
    );
  }

  function onGridKeydown(event: React.KeyboardEvent): void {
    if (event.key === 'Escape' && model.operatorMenu()) {
      event.preventDefault();
      operatorPanel.close();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
      const mode = model.selectionMode();
      if (mode === 'multiple' || mode === 'checkbox') {
        event.preventDefault();
        if (!model.allSelected()) toggleSelectAll();
      }
      return;
    }
    const cell = model.keyboard.focusedCell();
    if (!cell) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
      void copyToClipboard();
      return;
    }
    if (event.key === ' ') {
      const node = model.flatNodes()[cell.row];
      if (node?.kind === 'data' && model.selectionMode() !== 'none') {
        event.preventDefault();
        if (model.selectionMode() === 'single')
          state.selection.selectOnly(node.key);
        else state.selection.toggle(node.key);
      }
      return;
    }
    if (model.keyboard.handleKey(event.nativeEvent)) {
      event.preventDefault();
      const next = model.keyboard.focusedCell();
      const node = next ? model.flatNodes()[next.row] : undefined;
      if (node?.kind === 'data') {
        if (latest.current.focusedRowEnabled) setFocusedRowKey(node.key);
        if (event.shiftKey && model.selectionMode() === 'multiple') {
          state.selection.selectRange(model.dataKeys(), node.key);
        }
      }
    }
  }

  function currentOperator(column: ResolvedColumn<T>): FilterOperator {
    return effectiveFilterOperator(
      column,
      column.field ? model.rowFilterOps().get(column.field) : undefined,
    );
  }

  const rowFilterRaw = useRef(new Map<string, string>());

  function applyRowFilter(column: ResolvedColumn<T>, raw: string): void {
    const field = column.field;
    if (!field) return;
    state.filter.setRowFilter(
      field,
      rowFilterExpr(column, raw, currentOperator(column)),
    );
  }

  function onFilterInput(column: ResolvedColumn<T>, raw: string): void {
    const field = column.field;
    if (!field) return;
    rowFilterRaw.current.set(field, raw);
    debounced(`f:${field}`, () => applyRowFilter(column, raw));
  }

  function onFilterSelect(column: ResolvedColumn<T>, raw: string): void {
    if (!column.field) return;
    rowFilterRaw.current.set(column.field, raw);
    applyRowFilter(column, raw);
  }

  function onLookupFilter(column: ResolvedColumn<T>, value: unknown): void {
    const field = column.field;
    if (!field || !column.lookupItems) return;
    state.filter.setRowFilter(
      field,
      value == null ? null : { type: 'binary', field, op: 'eq', value },
    );
  }

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

  // --- filter panel + builder ---
  const filterPanelText = (): string | null => {
    const expr = state.filter.builderFilter();
    return expr ? describeExpr(expr, model.builderFields(), msg) : null;
  };

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

  // --- context menus ---
  const contextMenuPopupRef = useRef<HTMLDivElement>(null);
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

  function onRowContextMenuOpen(
    node: DataRowNode<T>,
    event: React.MouseEvent,
  ): void {
    const handler = latest.current.onRowContextMenu;
    if (!handler) return;
    const items: OgeMenuItem[] = [];
    handler({
      row: node.data,
      key: node.key,
      clientX: event.clientX,
      clientY: event.clientY,
      items,
    });
    if (!items.length) return; // fall back to the native browser menu
    event.preventDefault();
    openContextMenu(event.clientX, event.clientY, items);
  }

  /** Built-in header context menu: sort / group / pin / hide. */
  function onHeaderContextMenu(
    column: ResolvedColumn<T>,
    event: React.MouseEvent,
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
    if (groupPanel) {
      const isGrouped = state.grouping
        .descriptors()
        .some((descriptor) => descriptor.field === field);
      items.push(
        isGrouped
          ? {
              text: msg.ungroupColumn,
              action: () => state.grouping.ungroup(field),
            }
          : {
              text: msg.groupByColumn,
              action: () => state.grouping.groupBy(field),
            },
      );
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
    items.push({
      text: msg.hideColumn,
      action: () => toggleChooserVisible(field),
    });
    // consumers may add / remove / reorder the built-in items
    latest.current.onHeaderContextMenu?.({
      field,
      caption: column.caption,
      clientX: event.clientX,
      clientY: event.clientY,
      items,
    });
    if (!items.length) return;
    event.preventDefault();
    event.stopPropagation();
    openContextMenu(event.clientX, event.clientY, items);
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

  function toggleChooserVisible(field: string | undefined): void {
    if (!field) return;
    const next = new Set(model.hiddenOverrides());
    if (next.has(field)) next.delete(field);
    else next.add(field);
    model.hiddenOverrides.set(next);
  }

  function onChooserDragEnd(): void {
    chooserDragId.current = null;
    model.chooserDropTargetId.set(null);
  }

  function onChooserDrop(targetId: string, event: React.DragEvent): void {
    const sourceId = chooserDragId.current;
    onChooserDragEnd();
    if (!sourceId || sourceId === targetId || props.columnReorder === false)
      return;
    event.preventDefault();
    state.columns.reorder(
      model.chooserEntries().map((entry) => entry.id),
      sourceId,
      targetId,
    );
  }

  // --- header filter (Excel-style distinct values) ---
  const headerFilterPopupRef = useRef<HTMLDivElement>(null);
  const headerFilterPanel = useAnchoredPanel({
    anchor: () => model.headerFilterAnchor() ?? hostRef.current,
    panel: () => headerFilterPopupRef.current,
    placement: () => 'bottom-start',
    onClosed: () => {
      model.headerFilterField.set(null);
      model.headerFilterValues.set(null);
    },
  });

  const headerSelection = (): readonly unknown[] | null => {
    const field = model.headerFilterField();
    return field == null ? null : state.filter.headerFilterOf(field);
  };

  const headerValueTextOf = (value: unknown): string => {
    const field = model.headerFilterField();
    const column = field ? model.columnsByField().get(field) : undefined;
    return headerValueText(value, {
      dataType: column?.dataType ?? 'string',
      format: column?.format,
      lookupItems: column?.lookupItems,
      messages: msg,
    });
  };

  function toggleHeaderFilter(
    column: ResolvedColumn<T>,
    event: React.MouseEvent,
  ): void {
    event.stopPropagation();
    const field = column.field;
    if (!field) return;
    if (model.headerFilterField() === field) {
      headerFilterPanel.close();
      return;
    }
    model.headerFilterAnchor.set(event.currentTarget as HTMLElement);
    model.headerFilterField.set(field);
    model.headerFilterValues.set(null);
    model.headerFilterSearch.set('');
    headerFilterPanel.open();
    headerFilterPanel.updatePosition();
    void data
      .source()
      ?.distinct?.(field)
      .then((values) => {
        if (model.headerFilterField() === field) {
          model.headerFilterValues.set(
            values.slice(0, model.effHeaderFilterLimit()),
          );
        }
      });
  }

  function toggleHeaderValue(value: unknown): void {
    const field = model.headerFilterField();
    const all = model.headerFilterValues();
    if (field == null || all == null) return;
    state.filter.setHeaderFilter(
      field,
      toggleHeaderValueSelection(all, headerSelection(), value),
    );
  }

  function toggleHeaderGroup(group: { values: readonly unknown[] }): void {
    const field = model.headerFilterField();
    const all = model.headerFilterValues();
    if (field == null || all == null) return;
    state.filter.setHeaderFilter(
      field,
      toggleHeaderGroupSelection(all, headerSelection(), group.values),
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

  function operatorItems(column: ResolvedColumn<T>): OgeMenuItem[] {
    const current = currentOperator(column);
    const items: OgeMenuItem[] = filterRowOperatorChoices(column.dataType).map(
      (op) => ({
        text: msg.operators[op],
        value: op,
        checked: op === current ? true : undefined,
      }),
    );
    items.push({ text: '', separator: true });
    items.push({ text: msg.resetOperator });
    return items;
  }

  function chooseOperator(op: FilterOperator | null): void {
    const menu = model.operatorMenu();
    operatorPanel.close();
    const field = menu?.column.field;
    if (!menu || !field) return;
    const next = new Map(model.rowFilterOps());
    if (op) next.set(field, op);
    else next.delete(field);
    model.rowFilterOps.set(next);
    const raw = rowFilterRaw.current.get(field);
    if (raw) applyRowFilter(menu.column, raw);
  }

  // --- render ---------------------------------------------------------------
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
  const autoRowHeight = props.autoRowHeight ?? false;
  const effRowHeight = model.effRowHeight();
  const selectionMode = model.selectionMode();
  const hasCheckboxColumn = model.hasCheckboxColumn();
  const hasExpander = model.hasExpander();
  const rowDragging = model.rowDragging();
  const groupPanel = model.groupPanel();
  const leadingCellCount = model.leadingCellCount();
  const hasCommandColumn = model.hasCommandColumn();
  const headerFilterAvailable = model.headerFilterAvailable();
  const bandRow = model.bandRow();
  const headerFilterField = model.headerFilterField();
  const headerFilterRawValues = model.headerFilterValues();
  const headerFilterColumn = headerFilterField
    ? model.columnsByField().get(headerFilterField)
    : undefined;
  /** Date columns present their values grouped by year; everything else is flat. */
  const headerValueGroups =
    headerFilterColumn?.dataType === 'date' && headerFilterRawValues
      ? groupHeaderValuesByYear(
          headerFilterRawValues,
          model.headerFilterSearch(),
          (value) => headerValueTextOf(value),
          (value) => headerYearLabel(value, msg.blankValue),
        )
      : null;
  const visibleHeaderValues = headerFilterRawValues
    ? filterHeaderValues(
        headerFilterRawValues,
        model.headerFilterSearch(),
        (value) => headerValueTextOf(value),
      )
    : null;
  const totalCount = model.totalCount();
  const pagingOptions = model.pagingOptions();
  const sortMode = model.sortMode();
  const multiSorted = state.sort.descriptors().length > 1;
  const loading = data.loading();
  const customLoading = model.customLoadingMessage();
  const rtl = model.rtl();
  const focusedRowEnabled = props.focusedRowEnabled ?? false;
  const operatorMenu = model.operatorMenu();
  const popupEditNode =
    model.editing.editMode() === 'popup' ? model.editFormNode() : null;
  const groupDescriptors = state.grouping.descriptors();
  const grouped = groupDescriptors.length > 0;
  const totalSummaryByColumn = model.totalSummaryByColumn();
  const hasTotalRow = totalSummaryByColumn.size > 0;
  const headerDropTargetId = model.headerDropTargetId();
  const dropTargetKey = model.dropTargetKey();
  /** Rows expand/collapse when grouped or with master-detail → `treegrid`, else `grid`. */
  const gridRole = grouped || hasExpander ? 'treegrid' : 'grid';
  const colSpan = resolvedColumns.length + leadingCellCount;

  const pinnedStyle = (column: ResolvedColumn<T>): React.CSSProperties => ({
    insetInlineStart: model.layout.pinnedLeftOf(column) ?? undefined,
    insetInlineEnd: model.layout.pinnedRightOf(column) ?? undefined,
  });

  /** 0 = no flash; 1/2 alternate per push batch (see `updatedCells`). */
  const cellFlashPhase = (key: RowKey, field: string | undefined): number => {
    if (field == null || !props.highlightChanges) return 0;
    const cells = model.updatedCells();
    if (!cells.size) return 0; // fast path: no per-cell key allocation while idle
    const batch = cells.get(`${String(key)}::${field}`);
    return batch === undefined ? 0 : (batch % 2) + 1;
  };

  const cellText = (
    node: DataRowNode<T>,
    column: ResolvedColumn<T>,
  ): string => {
    // pending (batch) edits and staged new-row values show through, so a
    // dirty cell reads what will be saved rather than what is stored
    const value = model.editing.displayValue(node, column);
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

  const classes = ['oge-grid'];
  if (virtualized) classes.push('oge-virtual');
  if (loading || customLoading !== null) classes.push('oge-loading');
  if (props.wordWrap) classes.push('oge-wrap');
  if (rtl) classes.push('oge-rtl');
  if (props.className) classes.push(props.className);

  const sortIndicator = (column: ResolvedColumn<T>): ReactNode => {
    const sort = column.field ? state.sort.stateOf(column.field) : null;
    if (!sort) return null;
    return (
      <span className="oge-sort-indicator" aria-hidden="true">
        {chevron(
          sort.dir === 'asc'
            ? 'm3.5 10 4.5-4.5L12.5 10'
            : 'm3.5 6 4.5 4.5L12.5 6',
          11,
        )}
        {multiSorted ? <sub>{sort.index}</sub> : null}
      </span>
    );
  };

  const ariaSortOf = (column: ResolvedColumn<T>) => {
    const sort = column.field ? state.sort.stateOf(column.field) : null;
    if (!sort)
      return column.sortable && sortMode !== 'none' ? 'none' : undefined;
    return sort.dir === 'asc' ? 'ascending' : 'descending';
  };

  const filterEditor = (column: ResolvedColumn<T>): ReactNode => {
    if (!column.filterable) return null;
    const label = `${msg.filterPrefix} ${column.caption}`;
    const common = {
      className: 'oge-filter-input',
      size: 'sm' as const,
      labelMode: 'hidden' as const,
      subscriptSizing: 'none' as const,
      fluid: true,
      label,
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

  /** Empty leading cells (drag / expander / checkbox) for utility rows. */
  const leadingBlanks = (className: string, role = 'gridcell') => (
    <>
      {rowDragging ? <div className={className} role={role} /> : null}
      {hasExpander ? <div className={className} role={role} /> : null}
      {hasCheckboxColumn ? <div className={className} role={role} /> : null}
    </>
  );

  const noData = () => {
    if (loading) return null;
    const custom = latest.current.renderNoData;
    return (
      <div className="oge-no-data">
        {custom ? custom({ messages: msg }) : msg.noData}
      </div>
    );
  };

  const canAddRow = model.editing.canAdd();
  const batchPending =
    model.editing.editMode() === 'batch' && state.editing.hasPending();
  const toolbarVisible =
    model.searchPanelVisible() ||
    groupPanel ||
    canAddRow ||
    batchPending ||
    props.columnChooser === true;
  const toolButton = (label: string, icon: ReactNode, onClick: () => void) => (
    <button
      type="button"
      className="oge-tool-btn"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {icon}
    </button>
  );

  const renderDataRow = (node: DataRowNode<T>, rowIndex: number): ReactNode => {
    const rowSelected = selectionMode !== 'none' && isRowSelected(node.key);
    const rowHeightStyle =
      virtualized && !autoRowHeight ? effRowHeight : undefined;
    // `form` mode replaces the whole row with the edit form
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
            aria-colspan={model.resolvedColumns().length + leadingCellCount}
            style={{ maxWidth: model.hostWidth() || undefined }}
          >
            {renderEditForm(node)}
            {editFormActions}
          </div>
        </div>
      );
    }
    const renderRow = latest.current.renderRow;
    if (renderRow) {
      const customClasses = ['oge-row', 'oge-custom-row'];
      if (rowSelected) customClasses.push('oge-row-selected');
      if (focusedRowEnabled && focusedRowKey === node.key)
        customClasses.push('oge-row-focused');
      return (
        <div
          key={node.key}
          className={customClasses.join(' ')}
          role="row"
          aria-selected={selectionMode === 'none' ? undefined : rowSelected}
          aria-rowindex={rowIndex + 2}
          data-rowindex={rowIndex}
          style={{ height: rowHeightStyle }}
          onContextMenu={(event) => onRowContextMenuOpen(node, event)}
          onClick={(event) => onRowClick(node, event)}
          onDoubleClick={(event) =>
            latest.current.onRowDblClick?.({
              row: node.data,
              key: node.key,
              event,
            })
          }
        >
          <div role="gridcell" aria-colspan={colSpan}>
            {renderRow({ row: node.data, index: rowIndex, key: node.key })}
          </div>
        </div>
      );
    }
    const rowClasses = ['oge-row'];
    if (props.rowAlternation && rowIndex % 2 === 1)
      rowClasses.push('oge-row-alt');
    if (focusedRowEnabled && focusedRowKey === node.key)
      rowClasses.push('oge-row-focused');
    if (rowSelected) rowClasses.push('oge-row-selected');
    if (dropTargetKey === node.key) rowClasses.push('oge-drop-target');
    const detailExpanded = hasExpander
      ? state.expansion.isDetailExpanded(node.key)
      : false;
    return (
      // Row click is a pointer convenience; the keyboard path goes through the focusable cells.
      <div
        key={node.key}
        className={rowClasses.join(' ')}
        role="row"
        aria-selected={selectionMode === 'none' ? undefined : rowSelected}
        aria-rowindex={rowIndex + 2}
        data-rowindex={rowIndex}
        style={{ height: rowHeightStyle, gridTemplateColumns }}
        onClick={(event) => onRowClick(node, event)}
        onDoubleClick={(event) =>
          latest.current.onRowDblClick?.({
            row: node.data,
            key: node.key,
            event,
          })
        }
        onDragOver={
          rowDragging
            ? (event) => {
                if (draggedRowKey.current === null) return;
                event.preventDefault();
                if (model.dropTargetKey() !== node.key)
                  model.dropTargetKey.set(node.key);
              }
            : undefined
        }
        onDrop={rowDragging ? (event) => onRowDrop(node, event) : undefined}
      >
        {rowDragging ? (
          <div className="oge-cell oge-drag-cell" role="gridcell">
            <span
              className="oge-drag-handle"
              draggable
              aria-label="Reorder row"
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
        {hasExpander ? (
          <div className="oge-cell oge-expander-cell" role="gridcell">
            <button
              type="button"
              className={
                detailExpanded
                  ? 'oge-expander-btn oge-expanded'
                  : 'oge-expander-btn'
              }
              aria-expanded={detailExpanded}
              aria-label={msg.toggleDetail}
              onClick={(event) => {
                event.stopPropagation();
                state.expansion.toggleDetail(node.key);
              }}
            >
              {chevron('m6 3.5 4.5 4.5L6 12.5')}
            </button>
          </div>
        ) : null}
        {hasCheckboxColumn ? (
          <div className="oge-cell oge-checkbox-cell" role="gridcell">
            <input
              type="checkbox"
              checked={isRowSelected(node.key)}
              aria-label={msg.selectRow}
              onClick={(event) => event.stopPropagation()}
              onChange={() =>
                model.selectionDeferred()
                  ? deferredToggle(node.key)
                  : state.selection.toggle(node.key)
              }
            />
          </div>
        ) : null}
        {spacer('left', 'oge-cell')}
        {renderColumns.map((column) => {
          const cellClasses = ['oge-cell'];
          if (column.dataType === 'number') cellClasses.push('oge-cell-number');
          if (column.pinned !== false) cellClasses.push('oge-pinned');
          const cellEditorOpen = model.editing.isCellEditorOpen(node, column);
          if (model.editing.isCellDirty(node, column))
            cellClasses.push('oge-cell-dirty');
          if (cellEditorOpen) cellClasses.push('oge-cell-editing');
          const flash = cellFlashPhase(node.key, column.field);
          if (flash)
            cellClasses.push(`oge-cell-flash-${flash === 1 ? 'a' : 'b'}`);
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
              onClick={(event) => onCellClick(node, column, event, false)}
              onDoubleClick={(event) => onCellClick(node, column, event, true)}
            >
              {cellEditorOpen
                ? renderCellEditor(node, column, 'cell')
                : column.cellTemplate
                  ? column.cellTemplate({
                      value: column.accessor(node.data),
                      row: node.data,
                      rowIndex: node.sourceIndex,
                      key: node.key,
                      column: column.source as OgeGridColumnProps<T>,
                    })
                  : cellText(node, column)}
            </div>
          );
        })}
        {spacer('right', 'oge-cell')}
        {hasCommandColumn ? renderCommandCell(node) : null}
      </div>
    );
  };

  /**
   * The edit form shared by the `form` and `popup` modes.
   *
   * Angular hands `<oge-form>` a `FormGroup` built from the same controls the
   * cell editors use; React has no forms engine, so the draft map is handed
   * over as `formData` and every change written straight back to it. Same
   * fields, same layout, same single source of truth for the row's draft.
   */
  const renderEditForm = (node: DataRowNode<T>): ReactNode => {
    const items = model.editFormItems();
    const formData: Record<string, unknown> = {};
    for (const item of items) {
      const field = item.column.field as string;
      formData[field] = model.editing.editorAt(node, item.column)?.value;
    }
    return (
      <OgeForm
        className="oge-edit-form-fields"
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
        items={items.map((item) => {
          const field = item.column.field as string;
          const lookupItems = model.editing.lookupItemsFor(node, item.column);
          const rules = item.column.source?.validators ?? [];
          return {
            field,
            label: item.label,
            colSpan: item.colSpan,
            dataType: item.column.dataType,
            isRequired: item.column.source?.required,
            editorType: lookupItems ? ('selectBox' as const) : undefined,
            editorOptions: lookupItems
              ? {
                  items: lookupItems,
                  displayExpr: 'text',
                  valueExpr: 'value',
                }
              : undefined,
            // the column's own rules, run by the form rather than mirrored:
            // one evaluation, and the message lands on the right field
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

  /** The trailing command cell: save/cancel while editing, the buttons otherwise. */
  const renderCommandCell = (node: DataRowNode<T>): ReactNode => {
    const editingRow =
      model.editing.isRowEditing(node.key) ||
      (model.editing.editMode() === 'popup' &&
        state.editing.editRowKey() === node.key);
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
            {commandIcon('m3 8.5 3.5 3.5L13 5')}
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
            {commandIcon('m4 4 8 8M12 4l-8 8')}
          </button>
        </div>
      );
    }
    const removed = state.editing.isRemoved(node.key);
    return (
      <div className="oge-cell oge-command-cell" role="gridcell">
        {model
          .effCommandButtons()
          .filter((button) =>
            button.visible ? button.visible(node.data) : true,
          )
          .map((button, index) => {
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
                  {commandIcon('M10.5 2.5 13.5 5.5 5.5 13.5H2.5v-3z', 1.6)}
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
                        'M3 7c1-2.5 3-4 5.5-4A5.5 5.5 0 1 1 3.5 10M3 3v4h4',
                        1.6,
                      )
                    : commandIcon(
                        'M2.5 4.5h11M5.5 4.5V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1.5M4 4.5l.7 8.2a1 1 0 0 0 1 .8h4.6a1 1 0 0 0 1-.8l.7-8.2',
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
                  button.onClick?.({
                    row: node.data,
                    key: node.key,
                    event,
                  });
                  event.stopPropagation();
                }}
              >
                {button.text}
              </button>
            );
          })}
      </div>
    );
  };

  const renderNode = (node: RowNode<T>, nodeIndex: number): ReactNode => {
    const rowIndex = viewStart + nodeIndex;
    const fixedHeight =
      virtualized && !autoRowHeight ? effRowHeight : undefined;
    switch (node.kind) {
      case 'data':
        return renderDataRow(node, rowIndex);
      case 'group': {
        const expanded = node.expanded;
        return (
          <div
            key={node.key}
            className="oge-group-row"
            role="row"
            tabIndex={0}
            aria-expanded={expanded}
            data-rowindex={rowIndex}
            style={{ height: fixedHeight, paddingLeft: 12 + node.level * 20 }}
            onClick={() => state.expansion.toggleGroup(node.key)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                state.expansion.toggleGroup(node.key);
              }
            }}
          >
            <div
              className="oge-group-cell"
              role="gridcell"
              aria-colspan={colSpan}
            >
              <span
                className={
                  expanded ? 'oge-group-arrow oge-expanded' : 'oge-group-arrow'
                }
                aria-hidden="true"
              >
                {chevron('m6 3.5 4.5 4.5L6 12.5')}
              </span>
              <span className="oge-group-label">
                {groupCaption(node.groupField) + ': '}
                <strong>{groupValueText(node)}</strong>
                <span className="oge-group-count">{` (${node.childCount})`}</span>
              </span>
              {node.summaries.length ? (
                <span className="oge-group-summaries">
                  {' ' + groupSummaryText(node)}
                </span>
              ) : null}
            </div>
          </div>
        );
      }
      case 'summary':
        return (
          <div
            key={node.key}
            className="oge-group-footer-row"
            role="row"
            data-rowindex={rowIndex}
            style={{ height: fixedHeight, gridTemplateColumns }}
          >
            {leadingBlanks('oge-group-footer-cell')}
            {spacer('left', 'oge-group-footer-cell')}
            {renderColumns.map((column) => (
              <div
                key={column.id}
                className={[
                  'oge-group-footer-cell',
                  column.dataType === 'number' ? 'oge-cell-number' : '',
                  column.pinned !== false ? 'oge-pinned' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                role="gridcell"
                style={pinnedStyle(column)}
              >
                {groupFooterText(node, column)}
              </div>
            ))}
            {spacer('right', 'oge-group-footer-cell')}
          </div>
        );
      case 'detail':
        return (
          <div
            key={node.key}
            className="oge-detail-row"
            role="row"
            data-rowindex={rowIndex}
            style={{
              height:
                virtualized && !autoRowHeight
                  ? model.effDetailRowHeight()
                  : undefined,
            }}
          >
            <div
              className="oge-detail-cell"
              role="gridcell"
              aria-colspan={colSpan}
              style={{ maxWidth: model.hostWidth() || undefined }}
            >
              {latest.current.renderDetail?.({
                row: node.data,
                key: node.parentKey,
              })}
            </div>
          </div>
        );
      case 'filler':
        return (
          <div
            key={node.key}
            className="oge-row oge-filler-row"
            role="row"
            aria-rowindex={rowIndex + 2}
            style={{ height: effRowHeight, gridTemplateColumns }}
          >
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
      default:
        return null;
    }
  };

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
          className="oge-grid-toolbar"
          stylingMode="flat"
          ariaLabel={msg.toolbar}
          messages={{ overflowMenu: msg.moreCommands }}
          before={
            groupPanel ? (
              <div
                className="oge-group-panel"
                onDragOver={(event) => {
                  if (event.dataTransfer.types.includes(COLUMN_DRAG_TYPE))
                    event.preventDefault();
                }}
                onDrop={onGroupPanelDrop}
              >
                {groupDescriptors.length ? (
                  groupDescriptors.map((descriptor) => (
                    <span key={descriptor.field} className="oge-group-chip">
                      {groupCaption(descriptor.field)}
                      <button
                        type="button"
                        className="oge-group-chip-remove"
                        aria-label={`${msg.ungroupPrefix} ${groupCaption(descriptor.field)}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          state.grouping.ungroup(descriptor.field);
                        }}
                      >
                        {chevron('m4 4 8 8M12 4l-8 8', 10)}
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="oge-group-panel-hint">
                    {msg.groupPanelHint}
                  </span>
                )}
              </div>
            ) : undefined
          }
          after={
            <>
              {canAddRow ? (
                <button
                  type="button"
                  className="oge-tool-btn oge-tool-text-btn"
                  onClick={createNewRow}
                >
                  <svg
                    viewBox="0 0 16 16"
                    width="12"
                    height="12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d="M8 3v10M3 8h10" />
                  </svg>
                  {msg.addRow}
                </button>
              ) : null}
              {batchPending ? (
                <span className="oge-toolbar-cluster">
                  <button
                    type="button"
                    className="oge-tool-btn oge-tool-text-btn oge-btn-accent"
                    onClick={() => model.editing.saveAllChanges()}
                  >
                    {msg.saveChanges}
                  </button>
                  <button
                    type="button"
                    className="oge-tool-btn oge-tool-text-btn"
                    onClick={() => model.editing.discardAllChanges()}
                  >
                    {msg.discardChanges}
                  </button>
                </span>
              ) : null}
              {props.columnChooser ? (
                <button
                  type="button"
                  className="oge-tool-btn"
                  aria-label={msg.columnChooserTitle}
                  onClick={toggleChooser}
                >
                  <svg
                    viewBox="0 0 16 16"
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.6}
                    aria-hidden="true"
                  >
                    <rect x="2" y="2.5" width="12" height="11" rx="1.5" />
                    <path d="M6.5 2.5v11M10 2.5v11" />
                  </svg>
                </button>
              ) : null}
              {grouped ? (
                <span className="oge-toolbar-cluster">
                  {toolButton(
                    msg.expandAllGroups,
                    chevron('m4 3.5 4 3.5 4-3.5M4 9l4 3.5L12 9', 14, 1.6),
                    expandAllGroups,
                  )}
                  {toolButton(
                    msg.collapseAllGroups,
                    chevron('m4 7 4-3.5L12 7M4 12.5 8 9l4 3.5', 14, 1.6),
                    collapseAllGroups,
                  )}
                </span>
              ) : null}
              {model.searchPanelVisible() ? (
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
              ) : null}
            </>
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
            {filterPanelText() ?? msg.createFilter}
          </button>
          {filterPanelText() ? (
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
      {/* Delegated keyboard handler: focus lives on the grid cells inside (roving tabindex). */}
      <div
        ref={viewportRef}
        className="oge-viewport"
        role={gridRole}
        aria-label={props.ariaLabel}
        aria-rowcount={totalCount + 1}
        aria-colcount={colSpan}
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
        onKeyDown={onGridKeydown}
      >
        <div className="oge-header" role="rowgroup">
          {bandRow ? (
            <div
              className="oge-band-row"
              role="row"
              style={{ gridTemplateColumns }}
            >
              {model.rowDragging() ? (
                <div className="oge-band-cell" role="columnheader" />
              ) : null}
              {model.hasExpander() ? (
                <div className="oge-band-cell" role="columnheader" />
              ) : null}
              {model.hasCheckboxColumn() ? (
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
              {hasCommandColumn ? (
                <div className="oge-band-cell" role="columnheader" />
              ) : null}
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
                aria-label="Reorder"
              />
            ) : null}
            {hasExpander ? (
              <div
                className="oge-header-cell oge-expander-cell"
                role="columnheader"
                aria-label="Detail"
              />
            ) : null}
            {hasCheckboxColumn ? (
              <div
                className="oge-header-cell oge-checkbox-cell"
                role="columnheader"
                aria-label="Select all"
              >
                <OgeCheckBox
                  value={model.someSelected() ? null : model.allSelected()}
                  label={msg.selectAllRows}
                  onValueCommitted={() => toggleSelectAll()}
                />
              </div>
            ) : null}
            {spacer('left', 'oge-header-cell')}
            {renderColumns.map((column) => {
              const sortable = column.sortable && sortMode !== 'none';
              const draggable = headerDraggable(column);
              const headerClasses = ['oge-header-cell'];
              if (sortable) headerClasses.push('oge-header-sortable');
              if (column.pinned !== false) headerClasses.push('oge-pinned');
              if (headerDropTargetId === column.id)
                headerClasses.push('oge-col-drop-target');
              return (
                <div
                  key={column.id}
                  className={headerClasses.join(' ')}
                  role="columnheader"
                  style={pinnedStyle(column)}
                  onContextMenu={(event) => onHeaderContextMenu(column, event)}
                  aria-sort={ariaSortOf(column)}
                  tabIndex={sortable || draggable ? 0 : undefined}
                  draggable={draggable || undefined}
                  onDragStart={(event) => onHeaderDragStart(column, event)}
                  onDragOver={(event) => onHeaderDragOver(column, event)}
                  onDragEnd={() => model.headerDropTargetId.set(null)}
                  onDrop={(event) => onHeaderDrop(column, event)}
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
                  {sortIndicator(column)}
                  {headerFilterAvailable && column.filterable ? (
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
              {leadingBlanks('oge-filter-cell')}
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
                <div
                  className="oge-filter-cell oge-command-cell"
                  role="gridcell"
                />
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
        {hasTotalRow ? (
          <div
            className="oge-total-row"
            role="row"
            style={{ gridTemplateColumns }}
          >
            {leadingBlanks('oge-total-cell')}
            {spacer('left', 'oge-total-cell')}
            {renderColumns.map((column) => (
              <div
                key={column.id}
                className={[
                  'oge-total-cell',
                  column.dataType === 'number' ? 'oge-cell-number' : '',
                  column.pinned !== false ? 'oge-pinned' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                role="gridcell"
                style={pinnedStyle(column)}
              >
                {totalSummaryByColumn.get(column.id) ?? ''}
              </div>
            ))}
            {spacer('right', 'oge-total-cell')}
          </div>
        ) : null}
      </div>
      {customLoading !== null || (props.loadPanel && loading) ? (
        <div className="oge-load-panel" role="status">
          <span className="oge-spinner" aria-hidden="true" />
          {customLoading ?? msg.loading}
        </div>
      ) : null}
      {pagingOptions ? (
        <OgePager
          pageIndex={state.paging.pageIndex()}
          pageCount={model.pageCount()}
          totalCount={totalCount}
          pageSize={state.paging.pageSize() ?? 0}
          pageSizes={pagingOptions.pageSizes ?? null}
          showInfo={pagingOptions.showInfo !== false}
          displayMode={pagingOptions.displayMode ?? 'full'}
          messages={msg}
          onPageChange={(page) => state.paging.goTo(page)}
          onPageSizeChange={(size) =>
            state.paging.configure(size === 0 ? null : size)
          }
        />
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
          <div className="oge-fb-preview">
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
      {model.contextMenu() ? (
        <OgePopup
          ref={contextMenuPopupRef}
          panel={contextMenuPanel}
          className="oge-grid-context-menu"
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
                draggable={props.columnReorder !== false}
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
                {props.columnReorder !== false ? (
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
                    entry.field
                      ? !model.hiddenOverrides().has(entry.field)
                      : true
                  }
                  disabled={!entry.field}
                  onValueCommitted={() => toggleChooserVisible(entry.field)}
                />
                <span>{entry.caption}</span>
              </label>
            ))}
          </div>
        </OgePopup>
      ) : null}
      {headerFilterField !== null ? (
        <OgePopup ref={headerFilterPopupRef} panel={headerFilterPanel}>
          <div className="oge-header-filter-popup" role="listbox">
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
            {headerValueGroups ? (
              <>
                <label className="oge-hf-item oge-hf-all">
                  <OgeCheckBox
                    value={everyHeaderValueSelected(headerSelection())}
                    onValueCommitted={() =>
                      state.filter.setHeaderFilter(
                        headerFilterField,
                        toggleAllHeaderValueSelection(headerSelection()),
                      )
                    }
                  />
                  <span>{msg.selectAllValues}</span>
                </label>
                {headerValueGroups.map((group) => (
                  <Fragment key={group.label}>
                    <label className="oge-hf-item oge-hf-group">
                      <OgeCheckBox
                        value={
                          headerGroupState(headerSelection(), group.values) ===
                          'some'
                            ? null
                            : headerGroupState(
                                headerSelection(),
                                group.values,
                              ) === 'all'
                        }
                        onValueCommitted={() => toggleHeaderGroup(group)}
                      />
                      <span>{group.label}</span>
                    </label>
                    {group.values.map((value, index) => (
                      <label key={index} className="oge-hf-item oge-hf-leaf">
                        <OgeCheckBox
                          value={headerValueIsSelected(
                            headerSelection(),
                            value,
                          )}
                          onValueCommitted={() => toggleHeaderValue(value)}
                        />
                        <span>{headerValueTextOf(value)}</span>
                      </label>
                    ))}
                  </Fragment>
                ))}
              </>
            ) : visibleHeaderValues ? (
              <>
                <label className="oge-hf-item oge-hf-all">
                  <OgeCheckBox
                    value={everyHeaderValueSelected(headerSelection())}
                    onValueCommitted={() =>
                      state.filter.setHeaderFilter(
                        headerFilterField,
                        toggleAllHeaderValueSelection(headerSelection()),
                      )
                    }
                  />
                  <span>{msg.selectAllValues}</span>
                </label>
                {visibleHeaderValues.map((value, index) => (
                  <label key={index} className="oge-hf-item">
                    <OgeCheckBox
                      value={headerValueIsSelected(headerSelection(), value)}
                      onValueCommitted={() => toggleHeaderValue(value)}
                    />
                    <span>{headerValueTextOf(value)}</span>
                  </label>
                ))}
              </>
            ) : (
              <div className="oge-hf-loading">{msg.loading}</div>
            )}
          </div>
        </OgePopup>
      ) : null}
      {popupEditNode ? (
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
          <div className="oge-popup-fields">
            {renderEditForm(popupEditNode)}
          </div>
        </OgeModal>
      ) : null}
    </div>
  );
}

/**
 * The data grid — the React render of Angular's `<oge-grid>`, on the same
 * framework-free engine: the state slices, the data core, the column
 * resolver, the row/column virtualizers, the deferred-children loader and
 * the keyboard machine all come from `@oge-ui/behavior`, and the markup is
 * the same `.oge-grid` structure the Angular stylesheet styles.
 *
 * ```tsx
 * <OgeGrid
 *   data={orders}
 *   keyField="id"
 *   columns={[
 *     { field: 'id', caption: '#', width: 60, dataType: 'number' },
 *     { field: 'total', dataType: 'number', format: money, totalSummary: 'sum' },
 *   ]}
 *   groupBy={['customer']}
 *   paging={{ pageSize: 10 }}
 * />
 * ```
 */
export const OgeGrid = forwardRef(OgeGridInner) as <
  T extends object = Record<string, unknown>,
>(
  props: OgeGridProps<T> & { ref?: Ref<OgeGridHandle<T>> },
) => ReactElement;
