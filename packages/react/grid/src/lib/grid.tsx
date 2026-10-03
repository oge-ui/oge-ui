'use client';

import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
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
  type SortDescriptor,
  sanitizeGridStateSnapshot,
} from '@oge-ui/core';
import {
  OgeContextMenuEcho,
  isOgeContextMenuKey,
  ogeContextMenuKeyTarget,
  dateRangeFilterExpr,
  type OgeContextMenuSource,
  type OgeGridRowTogglingEvent,
  type OgeGridToggleKind,
} from '@oge-ui/behavior';
import { groupKeyFilter, type GroupInterval } from '@oge-ui/core';
import { OgeDateRangeBox } from '@oge-ui/react-inputs';
import {
  OGE_GRID_WINDOW_BLOCK_SIZE,
  OgeGridAnnouncements,
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
  booleanCellLabel,
  formatCellValue,
  resizedColumnWidth,
  formatPattern,
  clampColumnWidth,
  ogeAdjacentDataRow,
  ogeChooserMoveDirection,
  ogeColumnMoveTarget,
  ogeColumnSeparatorKeyCommand,
  ogeColumnWidthBounds,
  ogeGridHeaderKeyCommand,
  ogeGridHeaderKeyShortcuts,
  ogeGroupChipKeyCommand,
  ogeListMoveTarget,
  ogeRowMoveDirection,
  ogeSeparatorTargetWidth,
  headerGroupState,
  headerValueText,
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
  resolveOgeGridAdaptiveHiddenColumns,
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
  type OgeGridInvalidEditor,
  type OgeGridMessages,
  type OgeGridResolvedColumn,
  type OgeMenuItem,
  type OgePagingOptions,
  type OgePendingChildRequest,
  type OgeSearchPanelOptions,
} from '@oge-ui/behavior';
import {
  OGE_GRID_HOST_SELECTOR,
  OGE_NO_SPANS,
  OGE_TOOLTIP_PANEL_OPTIONS,
  OgeGridRangeSelectionCore,
  OgePreparedTracker,
  OgeTooltipCore,
  buildOgeRangeTsv,
  computeOgeGridSpans,
  emptyHeaderConditionFilter,
  findOgeRowDragParticipant,
  flattenHeaderDateTree,
  groupHeaderValuesByDate,
  headerConditionExpr,
  headerConditionNeedsValue,
  headerConditionOperators,
  isOgeDateType,
  isOgeRangeExtendKey,
  ogeClassList,
  ogeColumnValueRange,
  ogeFillSeries,
  ogeFillTarget,
  ogeFirstVisibleRow,
  ogeFormatsNeedRange,
  ogeGridEditShortcut,
  ogeGroupValueText,
  ogeHeaderConditionKey,
  ogeIsTextTruncated,
  ogeKeyboardFillPlan,
  ogeMeasureAutoWidth,
  ogeOwnedClosest,
  ogeRangeAnnouncementCounts,
  ogeRangeBounds,
  ogeRangeLattice,
  ogeRowDropPosition,
  ogeStickyGroupChain,
  ogeValueFits,
  parseHeaderConditionExpr,
  parseOgeCellText,
  parseOgeTsv,
  planOgeGridPaste,
  registerOgeRowDragParticipant,
  resolveOgeConditionalFormat,
  tooltipDescribedByTarget,
  type OgeConditionalCellFormat,
  type OgeConditionalRange,
  type OgeFillPlan,
  type OgeGridCellCoord,
  type OgeGridCellRange,
  type OgeGridCellValueWrite,
  type OgeGridColumnInfo,
  type OgeGridRangeBounds,
  type OgeGridSpanLayout,
  type OgeHeaderCondition,
  type OgeHeaderConditionFilter,
  type OgeHeaderDateNode,
  type OgeHeaderFilterMode,
  type OgeRowDragOverEvent,
  type OgeRowDragSource,
  type OgeRowDragStartEvent,
  type OgeRowDragTarget,
  type OgeRowDropPosition,
} from '@oge-ui/behavior';
import {
  beginPointerDragDrop,
  isOgeDragExcludedTarget,
  ogeMoveGroupingTo,
  resolveOgeAttributeTarget,
  resolveOgeHeaderDropTarget,
  resolveOgeRowDropIndex,
  type OgeGridHeaderDropTarget,
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
  useOgeLiveAnnouncer,
  useOgeOverlayConfig,
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
  // a header is labelled by its caption alone (aria-labelledby), not by the
  // resize separator / filter button inside it; useId keeps it SSR-safe
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const viewportRef = useRef<HTMLDivElement>(null);
  const contextStorageRef = useRef(contextStorage);
  contextStorageRef.current = contextStorage;

  const msg = useMemo<OgeGridMessages>(
    () => ({ ...config.messages, ...props.messages }),
    [config.messages, props.messages],
  );
  const msgRef = useRef(msg);
  msgRef.current = msg;
  const liveAnnouncer = useOgeLiveAnnouncer();
  /** Filled in once the announcer exists; the editing core calls it later. */
  const validationFailedRef = useRef<
    (invalid: readonly OgeGridInvalidEditor[]) => void
  >(() => undefined);

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
    /** A dragged header is over the group panel. */
    const groupPanelDropActive = rx.cell(false);
    /** Chip the dragged grouping would land on (insert indicator). */
    const groupChipDropTarget = rx.cell<string | null>(null);

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
    /** Master-detail toggle in the expander column. */
    const hasDetailToggle = rx.derived(() => p().renderDetail !== undefined);
    const effColumnHidingMode = rx.derived(
      () => p().columnHidingMode ?? cfg().columnHidingMode,
    );
    /**
     * Whether an adaptive-detail toggle can appear — from the declarations
     * alone, so the hiding pass can count its width without a cycle.
     */
    const adaptiveDetailPossible = rx.derived(
      () =>
        effColumnHidingMode() === 'detail' &&
        columnSpecs().some(
          (column) => column.visible && column.hidingPriority !== undefined,
        ),
    );
    /** Adaptive-detail toggle in the expander column (some column is hidden). */
    const hasAdaptiveToggle = rx.derived(
      () => adaptiveHiddenColumns().length > 0,
    );
    /** A leading expander column: master-detail and/or adaptive detail. */
    const hasExpander = rx.derived(
      () => hasDetailToggle() || hasAdaptiveToggle(),
    );
    /** One expander track wide per toggle it holds. */
    const expanderWidth = rx.derived(
      () =>
        ((hasDetailToggle() ? 1 : 0) + (hasAdaptiveToggle() ? 1 : 0)) *
        EXPANDER_WIDTH,
    );
    /** Keys of the rows whose adaptive detail is open. */
    const adaptiveExpanded = rx.cell<ReadonlySet<RowKey>>(new Set());
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
        expanderWidth() +
        (hasCheckboxColumn() ? CHECKBOX_WIDTH : 0),
    );
    /** Leading width counted against adaptive hiding (drag handle excluded). */
    const adaptiveLeadingWidth = rx.derived(
      () =>
        (hasDetailToggle() ? EXPANDER_WIDTH : 0) +
        (hasCheckboxColumn() ? CHECKBOX_WIDTH : 0),
    );
    const leadingTracks = rx.derived<readonly string[]>(() => {
      const leading: string[] = [];
      if (rowDragging()) leading.push(`${DRAG_WIDTH}px`);
      if (hasExpander()) leading.push(`${expanderWidth()}px`);
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
        alignment: column.alignment,
        format: column.format,
        // lazy: `hiddenOverrides` is declared below and read from a closure
        visible:
          column.visible !== false &&
          !(column.field !== undefined && hiddenOverrides().has(column.field)),
        sortable: column.sortable !== false,
        filterable: column.filterable !== false,
        filterOperator: column.filterOperator,
        minWidth: column.minWidth,
        maxWidth: column.maxWidth,
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
            const pathFilters: FilterExpr[] = entry.path.map((value, i) =>
              groupKeyFilter(
                groups[i]?.field ?? '',
                value,
                groups[i]?.interval,
              ),
            );
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

    /** Keys pinned by key — taken out of the body. */
    const pinnedKeys = rx.derived<ReadonlySet<RowKey>>(() => {
      const keys = new Set<RowKey>();
      for (const entry of [
        ...(p().pinnedTopRows ?? []),
        ...(p().pinnedBottomRows ?? []),
      ]) {
        if (typeof entry === 'string' || typeof entry === 'number')
          keys.add(entry);
      }
      return keys;
    });

    /** The body rows: every flattened row except the ones pinned by key. */
    const flatNodes = rx.derived<RowNode<T>[]>(() => {
      const all = allFlatNodes();
      const pinned = pinnedKeys();
      if (!pinned.size) return all;
      return all.filter((node) => node.kind !== 'data' || !pinned.has(node.key));
    });

    const resolvePinned = (
      entries: readonly (T | RowKey)[] | undefined,
      side: 'top' | 'bottom',
    ): DataRowNode<T>[] => {
      if (!entries?.length) return [];
      const keyOf = keySelector();
      const keyed = p().keyField !== undefined;
      const loaded = allFlatNodes();
      return entries.flatMap((entry, index): DataRowNode<T>[] => {
        if (typeof entry === 'string' || typeof entry === 'number') {
          const node = loaded.find(
            (candidate): candidate is DataRowNode<T> =>
              candidate.kind === 'data' && candidate.key === entry,
          );
          return node ? [{ ...node, level: 0 }] : [];
        }
        const row = entry as T;
        return [
          {
            kind: 'data',
            key: keyed ? keyOf(row, -1) : `oge-pinned-${side}-${index}`,
            data: row,
            sourceIndex: -1,
            level: 0,
          },
        ];
      });
    };
    const pinnedTopNodes = rx.derived(() =>
      resolvePinned(p().pinnedTopRows, 'top'),
    );
    const pinnedBottomNodes = rx.derived(() =>
      resolvePinned(p().pinnedBottomRows, 'bottom'),
    );

    const allFlatNodes = rx.derived<RowNode<T>[]>(() => {
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
        expandedDetailKeys: hasDetailToggle()
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
        detailToggleWidth: adaptiveDetailPossible() ? EXPANDER_WIDTH : 0,
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

    /** The columns hidden by width, rendered in each row's adaptive detail. */
    const adaptiveHiddenColumns = rx.derived<ResolvedColumn<T>[]>(() =>
      effColumnHidingMode() === 'detail'
        ? resolveOgeGridAdaptiveHiddenColumns<
            T,
            Slot<T>,
            OgeGridColumnProps<T>
          >({
            specs: columnSpecs(),
            columnDefs: () => undefined,
            firstDataRow,
            widthOverrides: state.columns.widthOverrides(),
            pinOverrides: state.columns.pinOverrides(),
            order: state.columns.order(),
            adaptiveHiddenIds: adaptiveHiddenIds(),
          })
        : [],
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
      // public API fed from storage, URLs or the host: validate the shape first
      const safe = sanitizeGridStateSnapshot(snapshot);
      if (safe === null) return;
      state.applySnapshot(safe);
      hiddenOverrides.set(new Set(safe.columns?.hidden ?? []));
    }

    const persistence = new OgeGridStatePersistenceCore<GridStateSnapshot>({
      prefix: 'oge-grid',
      get storage() {
        return latest.current.stateStorage ?? contextStorageRef.current;
      },
      snapshot: () => persistedSnapshot(),
      stateKey: () => latest.current.stateKey,
      sanitize: sanitizeGridStateSnapshot,
      // a bound groupBy is controlled: the page decides the grouping, so a
      // stored grouping from an earlier visit must not replace it
      apply: (snapshot) =>
        applyState(
          latest.current.groupBy === undefined
            ? snapshot
            : { ...snapshot, group: undefined },
        ),
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
          validationFailed: (invalid) => validationFailedRef.current(invalid),
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

    const rangeCore = new OgeGridRangeSelectionCore(
      {
        isDataRow: (row) => flatNodes()[row]?.kind === 'data',
        multiple: () => p().rangeSelection?.multipleRanges !== false,
      },
      rx,
    );
    /** Cells a fill-handle drag would write (dashed preview). */
    const fillPreview = rx.cell<OgeGridRangeBounds | null>(null);
    const stickyGroups = rx.cell<readonly GroupRowNode[]>([]);
    const hintCell = rx.cell<HTMLElement | null>(null);
    const hintText = rx.cell('');
    const dropPosition = rx.cell<OgeRowDropPosition | null>(null);
    const headerConditionDraft = rx.cell<OgeHeaderConditionFilter | null>(null);
    const headerDateCollapsed = rx.cell<ReadonlySet<string>>(new Set());

    /** Per-column info handed to `cellClass` / `cellSpan`. */
    const columnInfos = rx.derived<ReadonlyMap<string, OgeGridColumnInfo>>(
      () =>
        new Map(
          resolvedColumns().map((column) => [
            column.id,
            {
              field: column.field,
              caption: column.caption,
              dataType: column.dataType,
              index: column.absIndex,
            },
          ]),
        ),
    );

    /** Value ranges of the columns whose formats are relative (bars, scales). */
    const formatRanges = rx.derived<
      ReadonlyMap<string, OgeConditionalRange | null>
    >(() => {
      const map = new Map<string, OgeConditionalRange | null>();
      const nodes = flatNodes();
      for (const column of resolvedColumns()) {
        if (ogeFormatsNeedRange(column.source?.conditionalFormats))
          map.set(column.id, ogeColumnValueRange(nodes, column.accessor));
      }
      return map;
    });

    const spanLayout = rx.derived<OgeGridSpanLayout>(() => {
      if (virtualized() || colVirtualized()) return OGE_NO_SPANS;
      const hook = p().cellSpan;
      const infos = columnInfos();
      return computeOgeGridSpans({
        nodes: flatNodes(),
        columns: resolvedColumns().map((column) => ({
          id: column.id,
          field: column.field,
          accessor: column.accessor,
          mergeCells: column.source?.mergeCells ?? false,
        })),
        cellSpan: hook
          ? (row, column) => {
              const info = infos.get(column.id);
              return info ? hook(row, info) : null;
            }
          : undefined,
      });
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
      groupPanelDropActive,
      groupChipDropTarget,
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
      hasDetailToggle,
      hasAdaptiveToggle,
      adaptiveHiddenColumns,
      adaptiveExpanded,
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
      pinnedTopNodes,
      pinnedBottomNodes,
      rangeCore,
      fillPreview,
      stickyGroups,
      hintCell,
      hintText,
      dropPosition,
      headerConditionDraft,
      headerDateCollapsed,
      columnInfos,
      formatRanges,
      spanLayout,
    };
  }, []);

  // every render starts a new version: props may have changed
  model.rx.invalidate();
  const { state, data } = model;

  // --- live announcements (shared rules: OgeGridAnnouncements) -------------
  const announcer = useMemo(
    () =>
      new OgeGridAnnouncements({
        announce: (message, options) =>
          liveAnnouncer.announce(message, options),
        messages: () => msgRef.current,
        enabled: () =>
          latest.current.announcements ?? configRef.current.announcements,
        caption: (field) =>
          model.columnsByField().get(field)?.caption ?? humanize(field),
      }),
    [model, liveAnnouncer],
  );
  validationFailedRef.current = (invalid) => {
    const first = invalid[0];
    if (!first) return;
    const entry = model.editing
      .activeEditors()
      .get(`${String(first.key)}::${first.field}`);
    announcer.validationFailed(
      model.columnsByField().get(first.field)?.caption ?? humanize(first.field),
      entry?.error ?? msgRef.current.invalidError,
    );
  };
  // every render may carry a state change; the tracker diffs and stays quiet
  // when nothing it speaks about moved
  useEffect(() => {
    const windowed = model.windowed();
    announcer.observe({
      sort: state.sort.descriptors(),
      filterKey: JSON.stringify([
        state.filter.combinedExpr(),
        state.filter.searchText().trim(),
      ]),
      resultToken: windowed ? data.windowRows() : data.result(),
      loading: windowed ? data.windowLoading() : data.loading(),
      rowCount: model.totalCount(),
      paging: state.paging.pageSize() != null,
      pageIndex: state.paging.pageIndex(),
      pageCount: model.pageCount(),
    });
  });

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

  // date columns group by calendar day unless they say otherwise
  const intervalJson = JSON.stringify(
    (normalizeColumns<T>(props.columns) ?? []).map((column) => [
      column.field,
      column.groupInterval ??
        (column.dataType && isOgeDateType(column.dataType) ? 'day' : null),
    ]),
  );
  useEffect(() => {
    const intervals: Record<string, GroupInterval> = {};
    for (const [field, interval] of JSON.parse(intervalJson) as [
      string | undefined,
      GroupInterval | null,
    ][]) {
      if (field && interval) intervals[field] = interval;
    }
    state.grouping.setIntervals(intervals);
  }, [state, intervalJson]);

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

  // sort → onSortChanged, synchronous with the change (no stateChange debounce)
  const sortNow = state.sort.descriptors();
  const previousSort = useRef<readonly SortDescriptor[] | undefined>(undefined);
  // the store is read live, not from this render: option effects that ran
  // earlier in the same commit (initial sort orders, the paging prop) are then
  // the baseline instead of a reported change
  useEffect(() => {
    const sort = state.sort.descriptors();
    const previous = previousSort.current;
    previousSort.current = sort;
    if (previous === undefined || sameSort(previous, sort)) return;
    latest.current.onSortChanged?.({ sort, previousSort: previous });
  }, [sortNow]);

  // paging → onPageChanged; the initial paging is not a change
  const pageIndexNow = state.paging.pageIndex();
  const pageSizeNow = state.paging.pageSize();
  const previousPage = useRef<
    { index: number; size: number | null } | undefined
  >(undefined);
  useEffect(() => {
    const index = state.paging.pageIndex();
    const size = state.paging.pageSize();
    const previous = previousPage.current;
    previousPage.current = { index, size };
    if (
      previous === undefined ||
      (previous.index === index && previous.size === size)
    )
      return;
    latest.current.onPageChanged?.({
      pageIndex: index,
      pageSize: size,
      previousPageIndex: previous.index,
      previousPageSize: previous.size,
    });
  }, [pageIndexNow, pageSizeNow]);

  // focused cell → onFocusedCellChanged; clearing the focus is not reported
  const focusedCellNow = model.keyboard.focusedCell();
  const previousCell = useRef<{ row: number; col: number } | null>(null);
  useEffect(() => {
    const cell = focusedCellNow;
    if (!cell) return;
    const previous = previousCell.current;
    previousCell.current = cell;
    if (previous && previous.row === cell.row && previous.col === cell.col)
      return;
    const node = model.flatNodes()[cell.row];
    const dataNode = node?.kind === 'data' ? node : undefined;
    latest.current.onFocusedCellChanged?.({
      rowIndex: cell.row,
      columnIndex: cell.col,
      key: dataNode?.key,
      row: dataNode?.data,
      field: model.resolvedColumns()[cell.col]?.field,
    });
  }, [focusedCellNow]);

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
  // a keyboard-moved row keeps the focus once the rows re-render
  const flatNodesNow = model.flatNodes();
  useEffect(() => {
    const pending = pendingFocusRow.current;
    if (!pending || flatNodesNow === pending.nodes) return;
    const row = flatNodesNow.findIndex(
      (node) => node.kind === 'data' && node.key === pending.key,
    );
    if (row < 0) return;
    pendingFocusRow.current = null;
    model.keyboard.focusedCell.set({ row, col: pending.col });
  });

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
    requestToggle(model.collectGroupKeys().has(key) ? 'group' : 'detail', key);
  }

  /**
   * Every single-row toggle — pointer, keyboard, `expandRow()`/`collapseRow()`
   * — runs through here, so `onRowExpanding`/`onRowCollapsing` can veto it and
   * the `-ed` callbacks report it.
   */
  function requestToggle(kind: OgeGridToggleKind, key: RowKey): void {
    const expanding =
      kind === 'group'
        ? !isRowExpanded(key)
        : !state.expansion.isDetailExpanded(key);
    const row = kind === 'detail' ? dataNodeByKey(key)?.data : undefined;
    const pending: OgeGridRowTogglingEvent<T> = {
      key,
      kind,
      row,
      cancel: false,
    };
    const current = latest.current;
    (expanding ? current.onRowExpanding : current.onRowCollapsing)?.(pending);
    if (pending.cancel) return;
    if (kind === 'group') state.expansion.toggleGroup(key);
    else state.expansion.toggleDetail(key);
    (expanding ? current.onRowExpanded : current.onRowCollapsed)?.({
      key,
      kind,
      row,
    });
    if (kind === 'group') {
      const group = model
        .flatNodes()
        .find(
          (node): node is GroupRowNode =>
            node.kind === 'group' && node.key === key,
        );
      if (group) announcer.groupToggled(groupValueText(group), expanding);
    }
  }

  function groupCaption(field: string): string {
    return model.columnsByField().get(field)?.caption ?? humanize(field);
  }

  function groupValueText(node: GroupRowNode): string {
    const column = model.columnsByField().get(node.groupField);
    return column
      ? ogeGroupValueText(
          node.groupValue,
          column,
          state.grouping.intervals()[node.groupField],
          msg,
        )
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

  /**
   * Downloads the CSV. `options` are `getCsv()`'s — `scope`, `customizeCell`,
   * `separator`… — so a customized export still goes through `onExporting` and
   * the built-in formula guard instead of a hand-rolled Blob.
   */
  async function exportCsv(
    filename = 'grid.csv',
    options?: CsvOptions & OgeExportOptions<T>,
  ): Promise<void> {
    const event: OgeExportingEvent = { fileName: filename, cancel: false };
    latest.current.onExporting?.(event);
    if (event.cancel) return;
    const csv = await getCsv(options);
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
    const range = rangeClipboardText();
    if (range !== null) return range;
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
    void runSelectAll();
  }

  /** `selectAll()`'s body; settles once the selection is in place. */
  function runSelectAll(): Promise<void> {
    if (model.selectionDeferred()) {
      const field = model.deferredKeyFieldName();
      if (!field) return Promise.resolve();
      // the selection *is* the current filter, so no keys are materialized
      const filter = state.loadOptions().filter;
      model.setSelectionFilter(
        filter ?? { type: 'binary', field, op: 'isnotnull' },
      );
      return Promise.resolve();
    }
    if ((latest.current.selectAllMode ?? 'allPages') === 'page') {
      state.selection.replace(model.dataKeys());
      return Promise.resolve();
    }
    return getExportData().then(({ rows }) => {
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
    const announce = (): void =>
      announcer.selectionCount(
        model.selectionDeferred()
          ? model.selectionFilter()
            ? model.totalCount()
            : 0
          : state.selection.count(),
      );
    if (model.allSelected()) {
      clearSelection();
      announce();
    } else {
      void runSelectAll().then(announce);
    }
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
    showColumnChooser: (anchor) => {
      if (model.chooserOpen()) return;
      openChooser(
        anchor ??
          hostRef.current?.querySelector<HTMLElement>('.oge-chooser-button') ??
          null,
      );
    },
    hideColumnChooser: () => {
      if (model.chooserOpen()) chooserPanel.close();
    },
    getTotalSummaryValue: (field, type) => {
      const values = data.result()?.summary;
      if (!values) return undefined;
      const index = state.grouping
        .totalSummary()
        .findIndex(
          (d) => d.field === field && (type === undefined || d.type === type),
        );
      return index < 0 ? undefined : values[index];
    },
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
    selectRange: (range, add) =>
      model.rangeCore.setRanges(
        add ? [...model.rangeCore.ranges(), range] : [range],
      ),
    clearRangeSelection: () => model.rangeCore.clear(),
    getSelectedRangeData: () => {
      const lattice = ogeRangeLattice(model.rangeCore.ranges(), isDataRowAt);
      const nodes = model.flatNodes();
      const columns = model.resolvedColumns();
      return lattice.rows.map((row) =>
        lattice.cols.map((col) => {
          const node = nodes[row];
          const column = columns[col];
          return node?.kind === 'data' && column && lattice.isSelected(row, col)
            ? model.editing.displayValue(node, column)
            : undefined;
        }),
      );
    },
    pasteText,
    fillDown: () => keyboardFill('down'),
    fillRight: () => keyboardFill('right'),
    undo,
    redo,
    canUndo: () => model.editing.history.canUndo(),
    canRedo: () => model.editing.history.canRedo(),
    autoFitColumn,
    autoFitColumns,
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
    const rtl = model.rtl();
    const bounds = ogeColumnWidthBounds(
      column.minWidth,
      column.maxWidth,
      Number.POSITIVE_INFINITY,
    );
    const onMove = (move: PointerEvent): void => {
      suppressHeaderClick.current = true;
      state.columns.setWidth(
        column.id,
        clampColumnWidth(
          resizedColumnWidth(startWidth, startX, move.clientX, rtl),
          bounds,
        ),
      );
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

  /**
   * Pointer drag of a header (long press under touch): onto another header
   * it reorders the columns, onto the group panel it groups by the column —
   * the `columns.reorder` / `grouping.groupBy` commands the keyboard runs.
   */
  function onHeaderPointerDown(
    column: ResolvedColumn<T>,
    event: React.PointerEvent<HTMLElement>,
  ): void {
    const reorder = model.columnReorder();
    const group = model.groupPanel();
    if (event.button !== 0 || !headerDraggable(column)) return;
    const cell = event.currentTarget;
    if (isOgeDragExcludedTarget(event.target, cell)) return;
    const host = hostRef.current;
    beginPointerDragDrop<OgeGridHeaderDropTarget>(event, {
      source: cell,
      autoScroll: viewportRef.current,
      autoScrollOptions: { axis: 'x' },
      resolve: (hit) =>
        resolveOgeHeaderDropTarget(hit, host, { reorder, group }),
      onOver: (target) => {
        const id =
          target?.kind === 'column' && target.id !== column.id
            ? target.id
            : null;
        if (model.headerDropTargetId() !== id) model.headerDropTargetId.set(id);
        model.groupPanelDropActive.set(target?.kind === 'group');
      },
      onDrop: (target) => {
        if (target.kind === 'group') {
          if (column.field) state.grouping.groupBy(column.field);
          return;
        }
        if (target.id === column.id) return;
        state.columns.reorder(
          model.resolvedColumns().map((c) => c.id),
          column.id,
          target.id,
        );
      },
      onEnd: () => {
        model.headerDropTargetId.set(null);
        model.groupPanelDropActive.set(false);
      },
    });
  }

  /** Pointer reorder of the group chips — `grouping.move`, as Ctrl+Arrow runs. */
  function onGroupChipPointerDown(
    field: string,
    event: React.PointerEvent<HTMLElement>,
  ): void {
    if (event.button !== 0) return;
    const chip = event.currentTarget;
    if (isOgeDragExcludedTarget(event.target, chip)) return;
    const panel = chip.closest('.oge-group-panel');
    beginPointerDragDrop<string>(event, {
      source: chip,
      resolve: (hit) =>
        resolveOgeAttributeTarget(hit, panel, 'data-group-chip'),
      onOver: (target) =>
        model.groupChipDropTarget.set(target === field ? null : target),
      onDrop: (target) => {
        const fields = state.grouping.descriptors().map((d) => d.field);
        const index = ogeMoveGroupingTo(
          state.grouping,
          fields,
          field,
          fields.indexOf(target),
        );
        if (index < 0) return;
        announce(
          formatPattern(msg.groupMoved, {
            column: groupCaption(field),
            position: String(index + 1),
            total: String(fields.length),
          }),
        );
      },
      onEnd: () => model.groupChipDropTarget.set(null),
    });
  }

  // --- row drag reordering ---
  /**
   * Pointer drag on a row's handle (touch drags at once — the handle is
   * `touch-action: none`): the drop runs `commitRowMove`, the same path as
   * Ctrl+ArrowUp/Down.
   */
  function onRowHandlePointerDown(
    node: DataRowNode<T>,
    event: React.PointerEvent<HTMLElement>,
  ): void {
    if (event.button !== 0) return;
    const start: OgeRowDragStartEvent<T> = {
      key: node.key,
      row: node.data,
      cancel: false,
    };
    latest.current.onRowDragStart?.(start);
    if (start.cancel) return;
    const group = latest.current.rowDragGroup;
    if (group) {
      beginGroupRowDrag(node, event, group);
      return;
    }
    const handle = event.currentTarget;
    const host = hostRef.current;
    beginPointerDragDrop<DataRowNode<T>>(event, {
      source: handle,
      ghost: handle.closest('.oge-row'),
      longPress: 0,
      autoScroll: viewportRef.current,
      autoScrollOptions: { axis: 'y' },
      resolve: (hit) => {
        const index = resolveOgeRowDropIndex(hit, host);
        const target = index === null ? undefined : model.flatNodes()[index];
        return target?.kind === 'data' ? target : null;
      },
      onOver: (target) => {
        const key = target?.key ?? null;
        if (model.dropTargetKey() !== key) model.dropTargetKey.set(key);
      },
      onDrop: (target) => {
        if (target.key !== node.key) commitRowMove(node.key, target);
      },
      onEnd: ({ dropped }) => {
        model.dropTargetKey.set(null);
        latest.current.onRowDragEnd?.({
          key: node.key,
          row: node.data,
          dropped,
          targetComponentId: dropped ? componentId() : null,
        });
      },
    });
  }

  /** Moves `fromKey` onto `target`'s position and fires `onRowReordered`. */
  function commitRowMove(
    fromKey: RowKey,
    target: { key: RowKey },
  ): { toIndex: number; total: number } | null {
    const dataNodes = model
      .flatNodes()
      .filter((node): node is DataRowNode<T> => node.kind === 'data');
    const fromIndex = dataNodes.findIndex((node) => node.key === fromKey);
    const toIndex = dataNodes.findIndex((node) => node.key === target.key);
    if (fromIndex < 0 || toIndex < 0) return null;
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
    return { toIndex, total: dataNodes.length };
  }

  // --- keyboard alternatives to the drag gestures (WCAG 2.1.1 / 2.5.7) ---
  const [liveMessage, setLiveMessage] = useState('');
  /** Announces `text`; a toggled no-break space re-announces a repeat. */
  function announce(text: string): void {
    setLiveMessage((previous) => (previous === text ? `${text}\u00A0` : text));
  }

  /** Row the focus follows once a keyboard move re-renders the rows. */
  const pendingFocusRow = useRef<{
    key: RowKey;
    col: number;
    nodes: readonly unknown[];
  } | null>(null);

  function moveRowByKeyboard(
    row: number,
    direction: 1 | -1,
    col: number,
  ): void {
    const nodes = model.flatNodes();
    const node = nodes[row];
    const targetIndex = ogeAdjacentDataRow(nodes, row, direction);
    if (node?.kind !== 'data' || targetIndex < 0) return;
    const target = nodes[targetIndex] as DataRowNode<T>;
    const moved = commitRowMove(node.key, target);
    if (!moved) return;
    pendingFocusRow.current = { key: node.key, col, nodes };
    announce(
      formatPattern(msg.rowMoved, {
        position: String(moved.toIndex + 1),
        total: String(moved.total),
      }),
    );
  }

  function headerKeyShortcuts(column: ResolvedColumn<T>): string | undefined {
    return (
      ogeGridHeaderKeyShortcuts({
        resize: props.columnResize !== false,
        move: column.field !== undefined && model.columnReorder(),
      }) ?? undefined
    );
  }

  function widthBounds(column: ResolvedColumn<T>, now = 0) {
    return ogeColumnWidthBounds(
      column.minWidth,
      column.maxWidth,
      Math.max(model.hostWidth(), now),
    );
  }

  /** The separator's `aria-valuenow/min/max`: the column width in px. */
  function separatorValue(column: ResolvedColumn<T>): {
    now: number;
    min: number;
    max: number;
  } {
    const now = Math.round(
      model.layout.colWidths()[column.absIndex] ??
        configRef.current.columnMinWidth,
    );
    const bounds = widthBounds(column, now);
    return { now: clampColumnWidth(now, bounds), ...bounds };
  }

  function headerCellOf(id: string): HTMLElement | null {
    return (
      Array.from(
        hostRef.current?.querySelectorAll<HTMLElement>(
          '.oge-header-row > .oge-header-cell[data-colid]',
        ) ?? [],
      ).find((cell) => cell.dataset['colid'] === id) ?? null
    );
  }

  function resizeColumnTo(
    column: ResolvedColumn<T>,
    width: number,
    shouldAnnounce: boolean,
  ): void {
    const next = clampColumnWidth(width, widthBounds(column, width));
    state.columns.setWidth(column.id, next);
    if (shouldAnnounce)
      announce(
        formatPattern(msg.columnResized, {
          column: column.caption,
          width: String(next),
        }),
      );
  }

  /** Alt+Arrow resizes, Ctrl+Shift+Arrow moves the focused header's column. */
  function onHeaderKeydown(
    column: ResolvedColumn<T>,
    event: React.KeyboardEvent<HTMLElement>,
  ): void {
    if (event.target !== event.currentTarget) return;
    const command = ogeGridHeaderKeyCommand(event, model.rtl());
    if (!command) return;
    if (command.kind === 'resize') {
      if (props.columnResize === false) return;
      event.preventDefault();
      event.stopPropagation();
      const current =
        event.currentTarget.offsetWidth || separatorValue(column).now;
      resizeColumnTo(column, current + command.delta, true);
      return;
    }
    if (!model.columnReorder() || column.field === undefined) return;
    event.preventDefault();
    event.stopPropagation();
    const columns = model.resolvedColumns();
    const target = ogeColumnMoveTarget(columns, column.id, command.direction);
    if (!target) return;
    state.columns.reorder(
      columns.map((c) => c.id),
      column.id,
      target.anchorId,
      target.position,
    );
    announce(
      formatPattern(msg.columnMoved, {
        column: column.caption,
        position: String(target.toIndex + 1),
        total: String(columns.length),
      }),
    );
    setTimeout(() => headerCellOf(column.id)?.focus());
  }

  /** APG window-splitter keys on the focused resize separator. */
  function onResizeHandleKeydown(
    column: ResolvedColumn<T>,
    event: React.KeyboardEvent<HTMLElement>,
  ): void {
    const command = ogeColumnSeparatorKeyCommand(event, model.rtl());
    if (!command) return;
    event.preventDefault();
    event.stopPropagation();
    const cell = event.currentTarget.closest<HTMLElement>('.oge-header-cell');
    if (command.kind === 'exit') {
      cell?.focus();
      return;
    }
    const current = cell?.offsetWidth || separatorValue(column).now;
    const width = ogeSeparatorTargetWidth(
      command,
      current,
      widthBounds(column, current),
    );
    if (width !== null) resizeColumnTo(column, width, false);
  }

  function groupChipButtonOf(field: string): HTMLElement | null {
    return (
      Array.from(
        hostRef.current?.querySelectorAll<HTMLElement>(
          '.oge-group-chip-remove',
        ) ?? [],
      ).find((button) => button.dataset['groupField'] === field) ?? null
    );
  }

  /** Ctrl+Arrow reorders the grouping, Delete / Backspace removes it. */
  function onGroupChipKeydown(
    field: string,
    event: React.KeyboardEvent<HTMLElement>,
  ): void {
    const command = ogeGroupChipKeyCommand(event, model.rtl());
    if (!command) return;
    event.preventDefault();
    event.stopPropagation();
    const caption = groupCaption(field);
    const fields = state.grouping.descriptors().map((d) => d.field);
    if (command.kind === 'remove') {
      const at = fields.indexOf(field);
      const neighbour = fields[at + 1] ?? fields[at - 1];
      state.grouping.ungroup(field);
      announce(formatPattern(msg.groupRemoved, { column: caption }));
      setTimeout(() => {
        const chip =
          neighbour === undefined ? null : groupChipButtonOf(neighbour);
        (chip ?? headerCellOf(field))?.focus();
      });
      return;
    }
    const index = state.grouping.move(field, command.direction);
    if (index < 0) return;
    announce(
      formatPattern(msg.groupMoved, {
        column: caption,
        position: String(index + 1),
        total: String(fields.length),
      }),
    );
    setTimeout(() => groupChipButtonOf(field)?.focus());
  }

  /** Ctrl+ArrowUp/Down on a column-chooser item moves that column. */
  function onChooserKeydown(
    id: string,
    event: React.KeyboardEvent<HTMLElement>,
  ): void {
    const direction = ogeChooserMoveDirection(event);
    if (direction === null || props.columnReorder === false) return;
    event.preventDefault();
    event.stopPropagation();
    const entries = model.chooserEntries();
    const ids = entries.map((entry) => entry.id);
    const target = ogeListMoveTarget(ids, id, direction);
    if (!target) return;
    state.columns.reorder(ids, id, target.anchorId, target.position);
    announce(
      formatPattern(msg.columnMoved, {
        column: entries.find((entry) => entry.id === id)?.caption ?? id,
        position: String(target.toIndex + 1),
        total: String(ids.length),
      }),
    );
    setTimeout(() => {
      const item = Array.from(
        document.querySelectorAll<HTMLElement>('.oge-chooser-item'),
      ).find((element) => element.dataset['chooserId'] === id);
      item?.querySelector<HTMLElement>('input')?.focus();
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
    // range selection owns the single click (spreadsheet style): editing
    // starts on double-click, F2 or Enter
    if (model.selectionMode() === 'cell' && !double) return;
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
        pending={entry.pending}
        pendingLabel={msg.validationPending}
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
    if (
      isOgeContextMenuKey(event) &&
      state.editing.editCell() === null &&
      state.editing.editRowKey() === null &&
      openContextMenuFromKeyboard(event)
    )
      return;
    const noEditorOpen =
      state.editing.editCell() === null && state.editing.editRowKey() === null;
    if (
      (event.ctrlKey || event.metaKey) &&
      event.key.toLowerCase() === 'a' &&
      model.selectionMode() === 'cell'
    ) {
      if (!noEditorOpen) return;
      event.preventDefault();
      const nodes = model.flatNodes();
      const last = model.resolvedColumns().length - 1;
      if (nodes.length && last >= 0)
        model.rangeCore.setRanges([
          {
            anchor: { row: 0, col: 0 },
            focus: { row: nodes.length - 1, col: last },
          },
        ]);
      return;
    }
    if (noEditorOpen && handleEditShortcut(event)) return;
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
      if (
        node?.kind === 'data' &&
        model.selectionMode() !== 'none' &&
        model.selectionMode() !== 'cell'
      ) {
        event.preventDefault();
        if (model.selectionMode() === 'single')
          state.selection.selectOnly(node.key);
        else state.selection.toggle(node.key);
      }
      return;
    }
    const rowMove = ogeRowMoveDirection(event);
    if (
      rowMove !== null &&
      latest.current.rowDragging &&
      state.editing.editCell() === null &&
      state.editing.editRowKey() === null &&
      (event.target as HTMLElement).closest?.('[data-cell]')
    ) {
      event.preventDefault();
      moveRowByKeyboard(cell.row, rowMove, cell.col);
      return;
    }
    if (model.keyboard.handleKey(event.nativeEvent)) {
      event.preventDefault();
      const next = model.keyboard.focusedCell();
      const node = next ? model.flatNodes()[next.row] : undefined;
      if (next && model.selectionMode() === 'cell') {
        if (isOgeRangeExtendKey(event)) model.rangeCore.extendTo(next);
        else model.rangeCore.selectCell(next);
      }
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

  /** The filter row's range picker (`between` on a date column). */
  function onDateRangeFilter(
    column: ResolvedColumn<T>,
    range: readonly [Date | null, Date | null] | null,
  ): void {
    const field = column.field;
    if (!field) return;
    state.filter.setRowFilter(
      field,
      dateRangeFilterExpr(field, range?.[0] ?? null, range?.[1] ?? null),
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

  function onRowContextMenuOpen(
    node: DataRowNode<T>,
    event: React.MouseEvent,
  ): void {
    if (contextMenuEcho.current.swallow(event)) return;
    openRowContextMenu(node, event.clientX, event.clientY, event, 'pointer');
  }

  function openRowContextMenu(
    node: DataRowNode<T>,
    x: number,
    y: number,
    event: React.MouseEvent | React.KeyboardEvent,
    source: OgeContextMenuSource,
  ): void {
    const handler = latest.current.onRowContextMenu;
    if (!handler) return;
    const items: OgeMenuItem[] = [];
    handler({
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

  /**
   * The Menu key / Shift+F10 open the row or header menu at the focused cell
   * (`@oge-ui/behavior`'s grid-context-menu). Returns whether it did.
   */
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
      target.rowIndex === null ? undefined : model.flatNodes()[target.rowIndex];
    if (node?.kind !== 'data') return false;
    contextMenuEcho.current.mark(event.timeStamp);
    event.preventDefault();
    openRowContextMenu(node, target.x, target.y, event, 'keyboard');
    return true;
  }

  /** Built-in header context menu: sort / group / pin / hide. */
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
    if (groupPanel || latest.current.grouping?.contextMenuEnabled) {
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
      text: msg.autoFitColumn,
      action: () => fitColumn(column),
    });
    items.push({
      text: msg.hideColumn,
      action: () => toggleChooserVisible(field),
    });
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

  function toggleChooser(event: React.MouseEvent): void {
    event.stopPropagation();
    if (model.chooserOpen()) {
      chooserPanel.close();
      return;
    }
    openChooser(event.currentTarget as HTMLElement);
  }

  function openChooser(anchor: HTMLElement | null): void {
    model.chooserAnchor.set(anchor);
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

  /**
   * Reorders columns by dragging one chooser row onto another (long press
   * under touch) — `columns.reorder`, as Ctrl+ArrowUp/Down runs. The click a
   * drag ends with is swallowed, so the checkbox keeps its state.
   */
  function onChooserPointerDown(
    id: string,
    event: React.PointerEvent<HTMLElement>,
  ): void {
    if (event.button !== 0 || props.columnReorder === false) return;
    const row = event.currentTarget;
    const list = row.closest('.oge-chooser-popup');
    beginPointerDragDrop<string>(event, {
      source: row,
      resolve: (hit) => resolveOgeAttributeTarget(hit, list, 'data-chooser-id'),
      onOver: (target) => {
        const next = target === id ? null : target;
        if (model.chooserDropTargetId() !== next)
          model.chooserDropTargetId.set(next);
      },
      onDrop: (targetId) => {
        if (targetId === id || latest.current.columnReorder === false) return;
        state.columns.reorder(
          model.chooserEntries().map((entry) => entry.id),
          id,
          targetId,
        );
      },
      onEnd: () => model.chooserDropTargetId.set(null),
    });
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
    model.headerDateCollapsed.set(new Set());
    model.headerConditionDraft.set(
      parseHeaderConditionExpr(
        state.filter.rowFilterOf(ogeHeaderConditionKey(field)),
        column.dataType,
      ),
    );
    headerFilterPanel.open();
    headerFilterPanel.updatePosition();
    if (
      typeof latest.current.headerFilter === 'object' &&
      latest.current.headerFilter.mode === 'conditions'
    )
      return;
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
    const previous = currentOperator(menu.column);
    const next = new Map(model.rowFilterOps());
    if (op) next.set(field, op);
    else next.delete(field);
    model.rowFilterOps.set(next);
    // "between" swaps the editor; the old editor's value means nothing to it
    if ((previous === 'between') !== (op === 'between')) {
      state.filter.setRowFilter(field, null);
      return;
    }
    const raw = rowFilterRaw.current.get(field);
    if (raw) applyRowFilter(menu.column, raw);
  }

  // ===========================================================================
  // Interaction depth: cell ranges, clipboard, fill, undo, styling hooks,
  // conditional formats, pinned / sticky rows, spans, auto-fit, cell hints,
  // cross-grid row drag — `@oge-ui/behavior`'s decisions, React wiring.
  // ===========================================================================
  const cellSelect = model.selectionMode() === 'cell';
  const rangeCore = model.rangeCore;

  const fillHandleEnabled = (): boolean =>
    model.selectionMode() === 'cell' &&
    latest.current.rangeSelection?.fillHandle !== false &&
    !!model.editing.editMode() &&
    model.editing.canUpdate();

  // controlled / initial ranges → the machine
  const selectedRangesJson = props.selectedRanges
    ? JSON.stringify(props.selectedRanges)
    : null;
  useEffect(() => {
    if (selectedRangesJson === null) return;
    if (selectedRangesJson !== JSON.stringify(rangeCore.ranges()))
      rangeCore.setRanges(JSON.parse(selectedRangesJson));
  }, [rangeCore, selectedRangesJson]);
  useEffect(() => {
    if (props.defaultSelectedRanges?.length)
      rangeCore.setRanges(props.defaultSelectedRanges);
  }, []);

  // the machine → callbacks + announcement; the initial state is no change
  const rangesNow = rangeCore.ranges();
  const previousRanges = useRef<readonly OgeGridCellRange[] | null>(null);
  useEffect(() => {
    const before = previousRanges.current;
    previousRanges.current = rangesNow;
    if (before === null || before === rangesNow) return;
    if (JSON.stringify(before) === JSON.stringify(rangesNow)) return;
    const stats = rangeCore.stats();
    latest.current.onSelectedRangesChange?.(rangesNow);
    latest.current.onRangeSelectionChanged?.({ ranges: rangesNow, ...stats });
    const counts = ogeRangeAnnouncementCounts(stats);
    if (counts) announcer.rangeSelected(counts.rows, counts.columns, counts.cells);
  }, [rangesNow]);

  // a new view (sort, filter, page, grouping) invalidates the coordinates
  const loadKey = JSON.stringify(state.loadOptions());
  const previousLoadKey = useRef<string | null>(null);
  useEffect(() => {
    const before = previousLoadKey.current;
    previousLoadKey.current = loadKey;
    if (before !== null && before !== loadKey) rangeCore.clear();
  }, [loadKey]);

  function isDataRowAt(row: number): boolean {
    return model.flatNodes()[row]?.kind === 'data';
  }

  function cellCoordOf(hit: Element | null): OgeGridCellCoord | null {
    const cellEl = ogeOwnedClosest(
      hit,
      '[data-cell]',
      hostRef.current,
      OGE_GRID_HOST_SELECTOR,
    );
    const [row, col] = (cellEl?.dataset['cell'] ?? '').split('-').map(Number);
    return Number.isInteger(row) && Number.isInteger(col) ? { row, col } : null;
  }

  /** Cell mode: click, Shift+click, Ctrl+click and the drag that extends. */
  function onCellPointerDown(
    rowIndex: number,
    column: ResolvedColumn<T>,
    event: React.PointerEvent<HTMLElement>,
  ): void {
    if (model.selectionMode() !== 'cell' || event.button !== 0) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest?.('.oge-editor, .oge-fill-handle')) return;
    const at = { row: rowIndex, col: column.absIndex };
    if (event.shiftKey) {
      event.preventDefault();
      rangeCore.extendTo(at);
      event.currentTarget.focus({ preventScroll: true });
      return;
    }
    if (event.ctrlKey || event.metaKey) rangeCore.addCell(at);
    else rangeCore.selectCell(at);
    beginPointerDragDrop<OgeGridCellCoord>(event, {
      source: event.currentTarget,
      ghost: false,
      autoScroll: viewportRef.current,
      resolve: (hit) => cellCoordOf(hit),
      onOver: (over) => {
        if (over) rangeCore.extendTo(over);
      },
      onDrop: () => undefined,
    });
  }

  function onFillHandlePointerDown(event: React.PointerEvent<HTMLElement>): void {
    if (event.button !== 0) return;
    event.stopPropagation();
    const active = rangeCore.ranges().at(-1);
    if (!active) return;
    const source = ogeRangeBounds(active);
    beginPointerDragDrop<OgeFillPlan>(event, {
      source: event.currentTarget,
      ghost: false,
      longPress: 0,
      preventDefault: true,
      autoScroll: viewportRef.current,
      resolve: (hit) => {
        const at = cellCoordOf(hit);
        return at ? ogeFillTarget(source, at) : null;
      },
      onOver: (plan) => model.fillPreview.set(plan?.target ?? null),
      onDrop: (plan) => void runFill(source, plan),
      onEnd: () => model.fillPreview.set(null),
    });
  }

  function dataRowsIn(top: number, bottom: number): number[] {
    const nodes = model.flatNodes();
    const rows: number[] = [];
    for (let row = Math.max(0, top); row <= bottom && row < nodes.length; row++)
      if (nodes[row].kind === 'data') rows.push(row);
    return rows;
  }

  function valueAt(row: number, col: number): unknown {
    const node = model.flatNodes()[row];
    const column = model.resolvedColumns()[col];
    if (node?.kind !== 'data' || !column) return undefined;
    return model.editing.displayValue(node, column);
  }

  function writeAt(
    row: number,
    col: number,
    value: unknown,
  ): OgeGridCellValueWrite | null {
    const node = model.flatNodes()[row];
    const column = model.resolvedColumns()[col];
    if (node?.kind !== 'data' || !column?.field || !column.editable) return null;
    if (!ogeValueFits(value, column.dataType)) return null;
    return { key: node.key, field: column.field, value };
  }

  async function runFill(
    source: OgeGridRangeBounds,
    plan: OgeFillPlan,
  ): Promise<number> {
    const writes: OgeGridCellValueWrite[] = [];
    const { target, direction } = plan;
    if (direction === 'down' || direction === 'up') {
      const sourceRows = dataRowsIn(source.top, source.bottom);
      const targetRows = dataRowsIn(target.top, target.bottom);
      if (direction === 'up') targetRows.reverse();
      for (let col = source.left; col <= source.right; col++) {
        const values = sourceRows.map((row) => valueAt(row, col));
        const series = ogeFillSeries(values, targetRows.length, direction === 'up');
        targetRows.forEach((row, i) => {
          const write = writeAt(row, col, series[i]);
          if (write) writes.push(write);
        });
      }
    } else {
      const targetCols: number[] = [];
      for (let col = target.left; col <= target.right; col++)
        targetCols.push(col);
      if (direction === 'left') targetCols.reverse();
      for (const row of dataRowsIn(source.top, source.bottom)) {
        const values: unknown[] = [];
        for (let col = source.left; col <= source.right; col++)
          values.push(valueAt(row, col));
        const series = ogeFillSeries(values, targetCols.length, direction === 'left');
        targetCols.forEach((col, i) => {
          const write = writeAt(row, col, series[i]);
          if (write) writes.push(write);
        });
      }
    }
    const count = await model.editing.applyCellValues(writes, { source: 'fill' });
    const range = plan.range;
    rangeCore.setRanges([
      {
        anchor: { row: range.top, col: range.left },
        focus: { row: range.bottom, col: range.right },
      },
    ]);
    announcer.cellsWritten('fill', count);
    return count;
  }

  async function keyboardFill(axis: 'down' | 'right'): Promise<number> {
    if (!fillHandleEnabled()) return 0;
    const active = rangeCore.ranges().at(-1);
    if (!active) return 0;
    const plan = ogeKeyboardFillPlan(ogeRangeBounds(active), axis, (row) => {
      const above = dataRowsIn(0, row - 1);
      return above.length ? above[above.length - 1] : -1;
    });
    if (!plan) return 0;
    const writes: OgeGridCellValueWrite[] = [];
    const { source, target } = plan;
    if (axis === 'down') {
      const sourceRow = dataRowsIn(source.top, source.bottom)[0];
      if (sourceRow === undefined) return 0;
      for (const row of dataRowsIn(target.top, target.bottom)) {
        if (row === sourceRow) continue;
        for (let col = target.left; col <= target.right; col++) {
          const write = writeAt(row, col, valueAt(sourceRow, col));
          if (write) writes.push(write);
        }
      }
    } else {
      for (const row of dataRowsIn(target.top, target.bottom)) {
        const value = valueAt(row, source.left);
        for (let col = target.left; col <= target.right; col++) {
          if (col === source.left) continue;
          const write = writeAt(row, col, value);
          if (write) writes.push(write);
        }
      }
    }
    const count = await model.editing.applyCellValues(writes, { source: 'fill' });
    announcer.cellsWritten('fill', count);
    return count;
  }

  function rangeClipboardText(): string | null {
    const ranges = rangeCore.ranges();
    if (model.selectionMode() !== 'cell' || !ranges.length) return null;
    const nodes = model.flatNodes();
    const columns = model.resolvedColumns();
    return buildOgeRangeTsv(
      ogeRangeLattice(ranges, (row) => nodes[row]?.kind === 'data'),
      (row, col) => {
        const node = nodes[row];
        const column = columns[col];
        return node?.kind === 'data' && column ? cellText(node, column) : '';
      },
      (col) => columns[col]?.caption ?? '',
      { headers: latest.current.rangeSelection?.copyHeaders === true },
    );
  }

  function onGridCopy(event: React.ClipboardEvent): void {
    if (state.editing.editCell() !== null || state.editing.editRowKey() !== null)
      return;
    const text = rangeClipboardText();
    if (text === null) return;
    event.clipboardData.setData('text/plain', text);
    event.preventDefault();
  }

  function onGridPaste(event: React.ClipboardEvent): void {
    if (
      state.editing.editCell() !== null ||
      state.editing.editRowKey() !== null ||
      !model.editing.editMode() ||
      !model.editing.canUpdate()
    )
      return;
    const text = event.clipboardData?.getData('text/plain');
    if (!text) return;
    event.preventDefault();
    void pasteText(text);
  }

  async function pasteText(text: string): Promise<number> {
    if (!model.editing.editMode() || !model.editing.canUpdate()) return 0;
    const nodes = model.flatNodes();
    const columns = model.resolvedColumns();
    const active =
      model.selectionMode() === 'cell' ? (rangeCore.ranges().at(-1) ?? null) : null;
    const start = model.keyboard.focusedCell() ?? active?.anchor ?? null;
    if (!start) return 0;
    const messages = msgRef.current;
    const plan = planOgeGridPaste(parseOgeTsv(text), start, {
      rowCount: nodes.length,
      columnCount: columns.length,
      isDataRow: (row) => nodes[row]?.kind === 'data',
      selection: active,
    });
    const parse = (raw: string, col: number, node?: DataRowNode<T>) => {
      const column = columns[col];
      if (!column?.field || !column.editable) return null;
      const lookupItems = node
        ? model.editing.lookupItemsFor(node, column)
        : column.lookupItems;
      const parsed = parseOgeCellText(
        raw,
        { dataType: column.dataType, lookupItems },
        messages,
      );
      return parsed.ok ? { field: column.field, value: parsed.value } : null;
    };
    const writes: OgeGridCellValueWrite[] = [];
    for (const cellWrite of plan.cells) {
      const node = nodes[cellWrite.row];
      if (node?.kind !== 'data') continue;
      const value = parse(cellWrite.value, cellWrite.col, node);
      if (value) writes.push({ key: node.key, ...value });
    }
    const newRows = latest.current.rangeSelection?.pasteAddsRows
      ? plan.extraRows.map((line) => {
          const row: Record<string, unknown> = {};
          for (const cellWrite of line) {
            const value = parse(cellWrite.value, cellWrite.col);
            if (value) row[value.field] = value.value;
          }
          return row;
        })
      : [];
    const count = await model.editing.applyCellValues(writes, {
      source: 'paste',
      newRows,
    });
    announcer.cellsWritten('paste', count);
    return count;
  }

  async function undo(): Promise<void> {
    announcer.cellsWritten('undo', await model.editing.undo());
  }

  async function redo(): Promise<void> {
    announcer.cellsWritten('redo', await model.editing.redo());
  }

  function handleEditShortcut(event: React.KeyboardEvent): boolean {
    const shortcut = ogeGridEditShortcut(event);
    if (!shortcut || !model.editing.editMode()) return false;
    if (shortcut === 'undo' || shortcut === 'redo') {
      event.preventDefault();
      void (shortcut === 'undo' ? undo() : redo());
      return true;
    }
    if (!fillHandleEnabled() || !rangeCore.ranges().length) return false;
    event.preventDefault();
    void keyboardFill(shortcut === 'fillDown' ? 'down' : 'right');
    return true;
  }

  const cellKeyShortcuts = fillHandleEnabled()
    ? 'Shift+ArrowUp Shift+ArrowDown Shift+ArrowLeft Shift+ArrowRight Control+C Control+V Control+D Control+R Control+Z Control+Y'
    : cellSelect
      ? 'Shift+ArrowUp Shift+ArrowDown Shift+ArrowLeft Shift+ArrowRight Control+C'
      : undefined;

  // --- prepared events -------------------------------------------------------
  const preparedTracker = useRef(new OgePreparedTracker());
  const lastPreparedColumns = useRef<readonly unknown[] | null>(null);
  useLayoutEffect(() => {
    const { onRowPrepared, onCellPrepared } = latest.current;
    if (!onRowPrepared && !onCellPrepared) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    const columns = model.resolvedColumns();
    if (lastPreparedColumns.current !== columns) {
      lastPreparedColumns.current = columns;
      preparedTracker.current.reset();
    }
    const flat = model.flatNodes();
    for (const element of Array.from(
      viewport.querySelectorAll<HTMLElement>(
        '.oge-rows > .oge-row[data-rowindex]:not(.oge-edit-form-row)',
      ),
    )) {
      const rowIndex = Number(element.dataset['rowindex']);
      const node = flat[rowIndex];
      if (
        node?.kind !== 'data' ||
        !preparedTracker.current.isNew(element, node.data)
      )
        continue;
      onRowPrepared?.({ row: node.data, key: node.key, rowIndex, element });
      if (!onCellPrepared) continue;
      for (const cellEl of Array.from(
        element.querySelectorAll<HTMLElement>('[data-cell]'),
      )) {
        const col = Number((cellEl.dataset['cell'] ?? '').split('-')[1]);
        const column = columns[col];
        if (!column) continue;
        onCellPrepared({
          row: node.data,
          key: node.key,
          field: column.field,
          value: column.accessor(node.data),
          rowIndex,
          columnIndex: col,
          element: cellEl,
        });
      }
    }
  });

  const rowClassesOf = (node: DataRowNode<T>): string[] => {
    const hook = latest.current.rowClass;
    return hook ? ogeClassList(hook(node.data, node.key)) : [];
  };

  const cellFormatOf = (
    node: DataRowNode<T>,
    column: ResolvedColumn<T>,
  ): OgeConditionalCellFormat | null => {
    const formats = column.source?.conditionalFormats;
    if (!formats?.length) return null;
    return resolveOgeConditionalFormat(
      formats,
      model.editing.displayValue(node, column),
      node.data,
      model.formatRanges().get(column.id) ?? null,
    );
  };

  const cellClassesOf = (
    node: DataRowNode<T>,
    column: ResolvedColumn<T>,
  ): string[] => {
    const hook = latest.current.cellClass;
    const info = model.columnInfos().get(column.id);
    const own = hook && info ? ogeClassList(hook(node.data, info)) : [];
    const format = cellFormatOf(node, column);
    return format?.classes.length ? [...own, ...format.classes] : own;
  };

  const cellVarsOf = (
    node: DataRowNode<T>,
    column: ResolvedColumn<T>,
    rowIndex?: number,
  ): Record<string, string> => {
    const vars = { ...(cellFormatOf(node, column)?.vars ?? {}) };
    const span =
      rowIndex === undefined
        ? null
        : model.spanLayout().extentOf(rowIndex, column.absIndex);
    if (span && span.rowSpan > 1) vars['--oge-span-rows'] = String(span.rowSpan);
    return vars;
  };

  const formatIcon = (format: OgeConditionalCellFormat | null): ReactNode => {
    if (!format?.icon) return null;
    let glyph: ReactNode;
    if (format.iconSet === 'circles') glyph = <circle cx="8" cy="8" r="5" />;
    else if (format.iconSet === 'flags')
      glyph = <path d="M4 2v12M4 3h8l-2 3 2 3H4" />;
    else if (format.icon === 'high') glyph = <path d="M8 3 13 10H3z" />;
    else if (format.icon === 'low') glyph = <path d="M8 13 3 6h10z" />;
    else glyph = <path d="M3 6.5h7V4l4 4-4 4V9.5H3z" />;
    return (
      <span
        className="oge-cf-icon"
        data-icon-set={format.iconSet ?? undefined}
        aria-hidden="true"
      >
        <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
          {glyph}
        </svg>
      </span>
    );
  };

  // --- sticky group rows -------------------------------------------------------
  function updateStickyGroups(): void {
    if (!latest.current.stickyGroupRows || !state.grouping.descriptors().length) {
      if (model.stickyGroups().length) model.stickyGroups.set([]);
      return;
    }
    const viewport = viewportRef.current;
    const header = viewport?.querySelector('.oge-header-row');
    if (!viewport || !header) return;
    const rows = Array.from(
      viewport.querySelectorAll<HTMLElement>('.oge-rows > [data-rowindex]'),
    );
    const first = ogeFirstVisibleRow(
      rows,
      header.getBoundingClientRect().bottom,
      (row) => Number((row as HTMLElement).dataset['rowindex']),
    );
    const chain = ogeStickyGroupChain(model.flatNodes(), first);
    const current = model.stickyGroups();
    if (
      chain.length !== current.length ||
      chain.some((node, i) => node.key !== current[i].key)
    )
      model.stickyGroups.set(chain);
  }
  useLayoutEffect(() => updateStickyGroups());

  function scrollToGroup(key: RowKey): void {
    const index = model.flatNodes().findIndex((node) => node.key === key);
    if (index < 0) return;
    const viewport = viewportRef.current;
    if (model.virtualized()) model.virtualizer.scrollRowIntoView(index);
    else
      viewport
        ?.querySelector<HTMLElement>(`.oge-rows > [data-rowindex="${index}"]`)
        ?.scrollIntoView({ block: 'center' });
    setTimeout(() =>
      viewport
        ?.querySelector<HTMLElement>(
          `.oge-rows > .oge-group-row[data-rowindex="${index}"]`,
        )
        ?.focus({ preventScroll: true }),
    );
  }

  // --- auto-fit ------------------------------------------------------------------
  function fitColumn(column: ResolvedColumn<T>): void {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const header = headerCellOf(column.id);
    const width = ogeMeasureAutoWidth(
      header,
      viewport.querySelectorAll(`.oge-rows [data-cell$="-${column.absIndex}"]`),
      header?.querySelector('.oge-header-caption') ?? null,
    );
    if (width !== null) resizeColumnTo(column, width, false);
  }

  function autoFitColumn(field: string): void {
    const column = model
      .resolvedColumns()
      .find((candidate) => candidate.field === field || candidate.id === field);
    if (column) fitColumn(column);
  }

  function autoFitColumns(): void {
    for (const column of model.resolvedColumns()) fitColumn(column);
  }

  const autoWidthDone = useRef(false);
  useLayoutEffect(() => {
    if (!props.columnAutoWidth || autoWidthDone.current || !data.result()) return;
    autoWidthDone.current = true;
    autoFitColumns();
  });

  // --- cell hints ------------------------------------------------------------------
  const overlayConfig = useOgeOverlayConfig();
  const overlayConfigRef = useRef(overlayConfig);
  overlayConfigRef.current = overlayConfig;
  const hintBubbleRef = useRef<HTMLDivElement>(null);
  const hintPanel = useAnchoredPanel({
    anchor: () => model.hintCell() ?? hostRef.current,
    panel: () => hintBubbleRef.current,
    placement: () => 'top',
    ...OGE_TOOLTIP_PANEL_OPTIONS,
    onClosed: () => hintCoreRef.current?.onPanelClosed(),
  });
  const hintPanelRef = useRef(hintPanel);
  hintPanelRef.current = hintPanel;
  const hintCoreRef = useRef<OgeTooltipCore>(undefined);
  hintCoreRef.current ??= new OgeTooltipCore({
    text: () => model.hintText(),
    showDelay: () => overlayConfigRef.current.tooltipShowDelayMs,
    hideDelay: () => overlayConfigRef.current.tooltipHideDelayMs,
    isOpen: () => hintPanelRef.current.isOpen,
    open: () => {
      hintPanelRef.current.open();
      setTimeout(() => hintPanelRef.current.updatePosition());
    },
    close: () => hintPanelRef.current.close(),
    describedByTarget: () => {
      const target = model.hintCell();
      return target ? tooltipDescribedByTarget(target) : null;
    },
    panelId: hintPanel.panelId,
  });
  const hintCore = hintCoreRef.current;
  useEffect(() => () => hintCore.destroy(), [hintCore]);

  function hintTargetOf(target: EventTarget | null): HTMLElement | null {
    if (!latest.current.cellHintEnabled) return null;
    const cellEl = ogeOwnedClosest(
      target as Element | null,
      '.oge-cell[data-cell]',
      hostRef.current,
      OGE_GRID_HOST_SELECTOR,
    );
    if (!cellEl || cellEl.querySelector('.oge-editor')) return null;
    return ogeIsTextTruncated(cellEl) ? cellEl : null;
  }

  function onHintOver(event: React.PointerEvent): void {
    const target = hintTargetOf(event.target);
    if (target === model.hintCell()) return;
    if (!target) {
      hintCore.scheduleHide();
      return;
    }
    hintCore.hide();
    model.hintCell.set(target);
    model.hintText.set((target.textContent ?? '').trim());
    hintCore.scheduleShow();
  }

  function onHintFocus(event: React.FocusEvent): void {
    const target = hintTargetOf(event.target);
    if (!target) {
      if (model.hintCell()) hintCore.hide();
      return;
    }
    hintCore.hide();
    model.hintCell.set(target);
    model.hintText.set((target.textContent ?? '').trim());
    hintCore.show();
  }

  // --- cross-grid row drag -------------------------------------------------------
  const componentId = (): string => latest.current.id || `oge-grid-${uid}`;

  function resolveRowDrop(
    hit: Element,
    clientY: number,
    source: OgeRowDragSource,
  ): OgeRowDragTarget | null {
    const host = hostRef.current;
    const nodes = model.flatNodes();
    const dataNodes = nodes.filter(
      (node): node is DataRowNode<T> => node.kind === 'data',
    );
    const rowEl = ogeOwnedClosest(
      hit,
      '.oge-row[data-rowindex]',
      host,
      OGE_GRID_HOST_SELECTOR,
    );
    let target: OgeRowDragTarget | null = null;
    if (rowEl) {
      const node = nodes[Number(rowEl.dataset['rowindex'])];
      if (node?.kind !== 'data') return null;
      const position = ogeRowDropPosition(
        rowEl.getBoundingClientRect(),
        clientY,
        latest.current.allowDropInsideRow === true,
      );
      const index = dataNodes.indexOf(node);
      target = {
        componentId: componentId(),
        key: node.key,
        row: node.data,
        position,
        index: position === 'after' ? index + 1 : index,
      };
    } else if (
      ogeOwnedClosest(hit, '.oge-body, .oge-no-data', host, OGE_GRID_HOST_SELECTOR)
    ) {
      target = {
        componentId: componentId(),
        key: null,
        row: undefined,
        position: 'after',
        index: dataNodes.length,
      };
    }
    if (!target) return null;
    const over: OgeRowDragOverEvent = {
      sourceComponentId: source.componentId,
      sourceKey: source.key,
      sourceRow: source.row,
      targetKey: target.key,
      position: target.position,
      cancel: false,
    };
    latest.current.onRowDragOver?.(over);
    return over.cancel ? null : target;
  }

  function acceptRowDrop(
    source: OgeRowDragSource,
    target: OgeRowDragTarget,
  ): void {
    const same = source.componentId === componentId();
    if (
      same &&
      target.key !== null &&
      target.key !== source.key &&
      target.position !== 'inside'
    )
      commitRowMove(source.key, { key: target.key });
    latest.current.onRowDrop?.({
      sourceComponentId: source.componentId,
      targetComponentId: componentId(),
      sameComponent: same,
      sourceKey: source.key,
      sourceRow: source.row,
      targetKey: target.key,
      targetRow: target.row,
      position: target.position,
      toIndex: target.index,
    });
  }

  const dropHandlers = useRef({ resolveRowDrop, acceptRowDrop });
  dropHandlers.current = { resolveRowDrop, acceptRowDrop };
  const dragGroup = props.rowDragGroup;
  useEffect(() => {
    if (!dragGroup) return;
    return registerOgeRowDragParticipant({
      get componentId() {
        return componentId();
      },
      group: dragGroup,
      element: () => hostRef.current,
      resolve: (hit, clientY, source) =>
        dropHandlers.current.resolveRowDrop(hit, clientY, source),
      over: (_source, target) => {
        const key = target?.key ?? null;
        if (model.dropTargetKey() !== key) model.dropTargetKey.set(key);
        model.dropPosition.set(target?.position ?? null);
      },
      drop: (source, target) => dropHandlers.current.acceptRowDrop(source, target),
    });
  }, [dragGroup]);

  function beginGroupRowDrag(
    node: DataRowNode<T>,
    event: React.PointerEvent<HTMLElement>,
    group: string,
  ): void {
    const handle = event.currentTarget;
    const source: OgeRowDragSource = {
      componentId: componentId(),
      key: node.key,
      row: node.data,
    };
    type Participant = NonNullable<ReturnType<typeof findOgeRowDragParticipant>>;
    let current: Participant | null = null;
    beginPointerDragDrop<{ participant: Participant; target: OgeRowDragTarget }>(
      event,
      {
        source: handle,
        ghost: handle.closest('.oge-row'),
        longPress: 0,
        autoScroll: viewportRef.current,
        autoScrollOptions: { axis: 'y' },
        resolve: (hit, move) => {
          const participant = findOgeRowDragParticipant(hit, group);
          const target =
            participant && hit
              ? participant.resolve(hit, move.clientY, source)
              : null;
          return participant && target ? { participant, target } : null;
        },
        onOver: (hit) => {
          if (current && current !== hit?.participant) current.over(source, null);
          current = hit?.participant ?? null;
          current?.over(source, hit?.target ?? null);
        },
        onDrop: (hit) => hit.participant.drop(source, hit.target),
        onEnd: ({ dropped }) => {
          current?.over(source, null);
          const targetId = dropped ? (current?.componentId ?? null) : null;
          current = null;
          latest.current.onRowDragEnd?.({
            key: node.key,
            row: node.data,
            dropped,
            targetComponentId: targetId,
          });
        },
      },
    );
  }

  // --- header filter: conditions + date tree --------------------------------------
  const headerFilterMode: OgeHeaderFilterMode =
    (typeof props.headerFilter === 'object' ? props.headerFilter.mode : undefined) ??
    'list';

  function setHeaderCondition(
    which: 'first' | 'second',
    patch: Partial<OgeHeaderCondition>,
  ): void {
    const draft = model.headerConditionDraft();
    if (!draft) return;
    model.headerConditionDraft.set({
      ...draft,
      [which]: { ...draft[which], ...patch },
    });
  }

  function applyHeaderConditions(): void {
    const field = model.headerFilterField();
    const column = field ? model.columnsByField().get(field) : undefined;
    const draft = model.headerConditionDraft();
    if (!column?.field || !draft) return;
    state.filter.setRowFilter(
      ogeHeaderConditionKey(column.field),
      headerConditionExpr(column.field, column.dataType, draft),
    );
  }

  function clearHeaderConditions(): void {
    const field = model.headerFilterField();
    const column = field ? model.columnsByField().get(field) : undefined;
    if (!column?.field) return;
    state.filter.setRowFilter(ogeHeaderConditionKey(column.field), null);
    model.headerConditionDraft.set(emptyHeaderConditionFilter(column.dataType));
  }

  function headerFilterActive(field: string | undefined): boolean {
    return (
      field != null &&
      (state.filter.headerFilterOf(field) != null ||
        state.filter.rowFilterOf(ogeHeaderConditionKey(field)) != null)
    );
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
  /** Date columns present their values as a year → month → day tree. */
  const headerDateRows: readonly OgeHeaderDateNode[] | null =
    headerFilterColumn &&
    isOgeDateType(headerFilterColumn.dataType) &&
    headerFilterRawValues
      ? flattenHeaderDateTree(
          groupHeaderValuesByDate(
            headerFilterRawValues,
            model.headerFilterSearch(),
            msg.blankValue,
            (value) => headerValueTextOf(value),
            headerFilterColumn.dataType === 'datetime'
              ? (date) => formatCellValue(date, 'date', undefined)
              : undefined,
          ),
          model.headerFilterSearch().trim()
            ? new Set()
            : model.headerDateCollapsed(),
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
  const gridRole = grouped || model.hasDetailToggle() ? 'treegrid' : 'grid';
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

  /** Cell content: a boolean cell's glyph is aria-hidden, its word sr-only. */
  const cellContent = (
    node: DataRowNode<T>,
    column: ResolvedColumn<T>,
  ): React.ReactNode => {
    const label =
      column.dataType === 'boolean'
        ? booleanCellLabel(
            model.editing.displayValue(node, column),
            column,
            msg,
          )
        : null;
    const icon = formatIcon(cellFormatOf(node, column));
    if (label === null)
      return icon ? (
        <>
          {icon}
          {cellText(node, column)}
        </>
      ) : (
        cellText(node, column)
      );
    return (
      <>
        {icon}
        <span aria-hidden="true">{cellText(node, column)}</span>
        <span className="oge-sr-only">{label}</span>
      </>
    );
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
        editor =
          currentOperator(column) === 'between' ? (
            <OgeDateRangeBox
              {...common}
              showClearButton
              onValueChange={(range) => onDateRangeFilter(column, range)}
            />
          ) : (
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
    props.columnChooser === true ||
    props.toolbarBefore != null ||
    props.toolbarCenter != null ||
    props.toolbarAfter != null;
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
    const adaptiveOpen =
      model.hasAdaptiveToggle() && model.adaptiveExpanded().has(node.key);
    const rowHeightStyle =
      virtualized && !autoRowHeight && !adaptiveOpen ? effRowHeight : undefined;
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
    const rowClasses = ['oge-row', ...rowClassesOf(node)];
    if (props.rowAlternation && rowIndex % 2 === 1)
      rowClasses.push('oge-row-alt');
    if (focusedRowEnabled && focusedRowKey === node.key)
      rowClasses.push('oge-row-focused');
    if (rowSelected) rowClasses.push('oge-row-selected');
    if (dropTargetKey === node.key) {
      rowClasses.push('oge-drop-target');
      const position = model.dropPosition();
      if (position === 'after') rowClasses.push('oge-drop-after');
      if (position === 'inside') rowClasses.push('oge-drop-inside');
    }
    const detailExpanded = model.hasDetailToggle()
      ? state.expansion.isDetailExpanded(node.key)
      : false;
    return (
      // Row click is a pointer convenience; the keyboard path goes through the focusable cells.
      <div
        key={node.key}
        className={rowClasses.join(' ')}
        role="row"
        aria-selected={
          selectionMode === 'none' || selectionMode === 'cell'
            ? undefined
            : rowSelected
        }
        aria-rowindex={rowIndex + 2 + pinnedTopCount}
        data-rowindex={rowIndex}
        style={{ height: rowHeightStyle, gridTemplateColumns }}
        onContextMenu={(event) => onRowContextMenuOpen(node, event)}
        aria-keyshortcuts={
          rowDragging ? 'Control+ArrowUp Control+ArrowDown' : undefined
        }
        onClick={(event) => onRowClick(node, event)}
        onDoubleClick={(event) =>
          latest.current.onRowDblClick?.({
            row: node.data,
            key: node.key,
            event,
          })
        }
      >
        {rowDragging ? (
          <div className="oge-cell oge-drag-cell" role="gridcell">
            <span
              className="oge-drag-handle"
              aria-label={msg.reorderRow}
              onPointerDown={(event) => onRowHandlePointerDown(node, event)}
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
            {model.hasDetailToggle() ? (
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
                  requestToggle('detail', node.key);
                }}
              >
                {chevron('m6 3.5 4.5 4.5L6 12.5')}
              </button>
            ) : null}
            {model.hasAdaptiveToggle()
              ? renderAdaptiveToggle(node.key, adaptiveOpen)
              : null}
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
          const spans = model.spanLayout();
          const owner = spans.empty
            ? null
            : spans.ownerOf(rowIndex, column.absIndex);
          if (owner && owner.row === rowIndex) return null;
          if (owner)
            return (
              <div
                key={column.id}
                className="oge-cell oge-cell-span-covered"
                aria-hidden="true"
              />
            );
          const span = spans.empty
            ? null
            : spans.extentOf(rowIndex, column.absIndex);
          const cellClasses = ['oge-cell', ...cellClassesOf(node, column)];
          if (span) cellClasses.push('oge-cell-spanned');
          const inRange =
            cellSelect && model.rangeCore.isSelected(rowIndex, column.absIndex);
          if (inRange) {
            cellClasses.push('oge-cell-range');
            const edges = model.rangeCore.edgesOf(rowIndex, column.absIndex);
            if (edges?.top) cellClasses.push('oge-range-top');
            if (edges?.bottom) cellClasses.push('oge-range-bottom');
            if (edges?.start) cellClasses.push('oge-range-start');
            if (edges?.end) cellClasses.push('oge-range-end');
          }
          const preview = model.fillPreview();
          if (
            preview &&
            rowIndex >= preview.top &&
            rowIndex <= preview.bottom &&
            column.absIndex >= preview.left &&
            column.absIndex <= preview.right
          )
            cellClasses.push('oge-cell-fill-preview');
          const fillCorner =
            fillHandleEnabled() &&
            model.rangeCore.isFillCorner(rowIndex, column.absIndex);
          if (column.dataType === 'number') cellClasses.push('oge-cell-number');
          if (column.alignment !== 'start')
            cellClasses.push(`oge-align-${column.alignment}`);
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
              style={{
                ...pinnedStyle(column),
                ...cellVarsOf(node, column, rowIndex),
                gridColumn: span ? `span ${span.colSpan}` : undefined,
              }}
              data-cell={`${rowIndex}-${column.absIndex}`}
              aria-colindex={leadingCellCount + column.absIndex + 1}
              aria-rowspan={span && span.rowSpan > 1 ? span.rowSpan : undefined}
              aria-colspan={span && span.colSpan > 1 ? span.colSpan : undefined}
              aria-selected={cellSelect ? inRange : undefined}
              aria-keyshortcuts={cellKeyShortcuts}
              tabIndex={tabbable ? 0 : -1}
              onFocus={() =>
                model.keyboard.onCellFocus(rowIndex, column.absIndex)
              }
              onPointerDown={(event) => onCellPointerDown(rowIndex, column, event)}
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
                  : cellContent(node, column)}
              {fillCorner ? (
                // the fill handle: a pointer affordance; Ctrl+D / Ctrl+R are
                // its keyboard twins (the cell's aria-keyshortcuts)
                <span
                  className="oge-fill-handle"
                  aria-hidden="true"
                  title={msg.fillHandle}
                  onPointerDown={onFillHandlePointerDown}
                />
              ) : null}
            </div>
          );
        })}
        {spacer('right', 'oge-cell')}
        {hasCommandColumn ? renderCommandCell(node) : null}
        {adaptiveOpen ? renderAdaptiveDetail(node) : null}
      </div>
    );
  };

  /** DOM id of a row's adaptive detail — the toggle's `aria-controls`. */
  const adaptiveDetailId = (key: RowKey): string =>
    `${uid}-ad-${String(key).replace(/[^a-zA-Z0-9_-]/g, '_')}`;

  /** The row's adaptive-detail toggle (`columnHidingMode: 'detail'`). */
  function renderAdaptiveToggle(key: RowKey, open: boolean): ReactNode {
    return (
      <button
        type="button"
        className={
          open
            ? 'oge-expander-btn oge-adaptive-toggle oge-expanded'
            : 'oge-expander-btn oge-adaptive-toggle'
        }
        aria-expanded={open}
        aria-controls={open ? adaptiveDetailId(key) : undefined}
        aria-label={msg.toggleAdaptiveDetail}
        title={msg.toggleAdaptiveDetail}
        onClick={(event) => {
          event.stopPropagation();
          const next = new Set(model.adaptiveExpanded());
          if (next.has(key)) next.delete(key);
          else next.add(key);
          model.adaptiveExpanded.set(next);
        }}
      >
        <svg
          viewBox="0 0 16 16"
          width="12"
          height="12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M8 3.5v9M3.5 8h9" />
        </svg>
      </button>
    );
  }

  /**
   * The hidden columns' caption / value pairs, spanning the row on a second
   * grid line — rendered like the cells they stand in for (`renderCell`
   * included).
   */
  function renderAdaptiveDetail(node: DataRowNode<T>): ReactNode {
    return (
      <div
        className="oge-adaptive-detail"
        role="gridcell"
        id={adaptiveDetailId(node.key)}
        aria-colspan={resolvedColumns.length + leadingCellCount}
      >
        <dl className="oge-adaptive-detail-list">
          {model.adaptiveHiddenColumns().map((column) => (
            <div key={column.id} className="oge-adaptive-detail-item">
              <dt className="oge-adaptive-detail-caption">{column.caption}</dt>
              <dd
                className={
                  column.dataType === 'number'
                    ? 'oge-adaptive-detail-value oge-cell-number'
                    : 'oge-adaptive-detail-value'
                }
              >
                {column.cellTemplate
                  ? column.cellTemplate({
                      value: column.accessor(node.data),
                      row: node.data,
                      rowIndex: node.sourceIndex,
                      key: node.key,
                      column: column.source as OgeGridColumnProps<T>,
                    })
                  : cellContent(node, column)}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    );
  }

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
              ? rules.flatMap((rule) => [
                  {
                    type: 'custom' as const,
                    validate: (context: { value: unknown }) => {
                      const result = rule(context.value, node.data);
                      return typeof result === 'string' ? result : null;
                    },
                  },
                  {
                    // a rule returning a promise runs as the form's async rule
                    type: 'async' as const,
                    validate: async (value: unknown) => {
                      const result = rule(value, node.data);
                      return result && typeof result === 'object'
                        ? await result
                        : null;
                    },
                  },
                ])
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

  const pinnedTopNodes = model.pinnedTopNodes();
  const pinnedBottomNodes = model.pinnedBottomNodes();
  const pinnedTopCount = pinnedTopNodes.length;

  /** A pinned row: display only (no editing, selection or roving focus). */
  const renderPinnedRow = (
    node: DataRowNode<T>,
    ariaRowIndex: number,
    side: 'top' | 'bottom',
  ): ReactNode => (
    <div
      key={`${side}-${String(node.key)}`}
      className={[
        'oge-row',
        'oge-pinned-row',
        `oge-pinned-row-${side}`,
        ...rowClassesOf(node),
      ].join(' ')}
      role="row"
      aria-rowindex={ariaRowIndex}
      style={{ gridTemplateColumns }}
    >
      {leadingBlanks('oge-cell')}
      {spacer('left', 'oge-cell')}
      {renderColumns.map((column) => {
        const classes = ['oge-cell', ...cellClassesOf(node, column)];
        if (column.dataType === 'number') classes.push('oge-cell-number');
        if (column.alignment !== 'start')
          classes.push(`oge-align-${column.alignment}`);
        if (column.pinned !== false) classes.push('oge-pinned');
        return (
          <div
            key={column.id}
            className={classes.join(' ')}
            role="gridcell"
            style={{ ...pinnedStyle(column), ...cellVarsOf(node, column) }}
            aria-colindex={leadingCellCount + column.absIndex + 1}
          >
            {column.cellTemplate
              ? column.cellTemplate({
                  value: column.accessor(node.data),
                  row: node.data,
                  rowIndex: node.sourceIndex,
                  key: node.key,
                  column: column.source as OgeGridColumnProps<T>,
                })
              : cellContent(node, column)}
          </div>
        );
      })}
      {spacer('right', 'oge-cell')}
      {hasCommandColumn ? (
        <div className="oge-cell oge-command-cell" role="gridcell" />
      ) : null}
    </div>
  );

  const stickyGroupRows = model.stickyGroups();

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
            onClick={() => requestToggle('group', node.key)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                requestToggle('group', node.key);
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
                  column.alignment !== 'start'
                    ? `oge-align-${column.alignment}`
                    : '',
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
      id={props.id}
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
          center={props.toolbarCenter}
          before={
            groupPanel || props.toolbarBefore != null ? (
              <>
                {props.toolbarBefore}
                {groupPanel ? (
                  <div
                    className={
                      model.groupPanelDropActive()
                        ? 'oge-group-panel oge-group-panel-drop-active'
                        : 'oge-group-panel'
                    }
                  >
                    {groupDescriptors.length ? (
                      groupDescriptors.map((descriptor) => (
                        <span
                          key={descriptor.field}
                          className={
                            model.groupChipDropTarget() === descriptor.field
                              ? 'oge-group-chip oge-group-chip-drop-target'
                              : 'oge-group-chip'
                          }
                          data-group-chip={descriptor.field}
                          onPointerDown={(event) =>
                            onGroupChipPointerDown(descriptor.field, event)
                          }
                        >
                          {groupCaption(descriptor.field)}
                          <button
                            type="button"
                            className="oge-group-chip-remove"
                            aria-keyshortcuts="Control+ArrowLeft Control+ArrowRight Delete"
                            data-group-field={descriptor.field}
                            aria-label={`${msg.ungroupPrefix} ${groupCaption(descriptor.field)}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              state.grouping.ungroup(descriptor.field);
                            }}
                            onKeyDown={(event) =>
                              onGroupChipKeydown(descriptor.field, event)
                            }
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
                ) : null}
              </>
            ) : undefined
          }
          after={
            <>
              {props.toolbarAfter}
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
                  className="oge-tool-btn oge-chooser-button"
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
        className={cellSelect ? 'oge-viewport oge-cell-select' : 'oge-viewport'}
        role={gridRole}
        aria-label={props.ariaLabel}
        aria-rowcount={
          totalCount + 1 + pinnedTopCount + pinnedBottomNodes.length
        }
        aria-colcount={colSpan}
        aria-multiselectable={
          selectionMode === 'multiple' ||
          selectionMode === 'checkbox' ||
          selectionMode === 'cell'
            ? true
            : undefined
        }
        onScroll={(event) => {
          const target = event.currentTarget;
          model.scrollTop.set(target.scrollTop);
          model.scrollLeft.set(target.scrollLeft);
          updateStickyGroups();
          if (model.hintCell()) hintCore.hide();
        }}
        onKeyDown={onGridKeydown}
        onCopy={onGridCopy}
        onPaste={onGridPaste}
        onPointerOver={onHintOver}
        onPointerLeave={() => hintCore.scheduleHide()}
        onFocus={onHintFocus}
        onBlur={() => hintCore.hide()}
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
                aria-label={msg.reorderColumnHeader}
              />
            ) : null}
            {hasExpander ? (
              <div
                className="oge-header-cell oge-expander-cell"
                role="columnheader"
                aria-label={msg.detailColumnHeader}
              >
                {/* text content too: axe's empty-table-header wants it */}
                <span className="oge-sr-only">{msg.detailColumnHeader}</span>
              </div>
            ) : null}
            {hasCheckboxColumn ? (
              <div
                className="oge-header-cell oge-checkbox-cell"
                role="columnheader"
                aria-label={msg.selectAllColumnHeader}
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
              if (column.alignment !== 'start')
                headerClasses.push(`oge-align-${column.alignment}`);
              if (headerDropTargetId === column.id)
                headerClasses.push('oge-col-drop-target');
              return (
                <div
                  key={column.id}
                  className={headerClasses.join(' ')}
                  role="columnheader"
                  data-colid={column.id}
                  style={pinnedStyle(column)}
                  onContextMenu={(event) => onHeaderContextMenu(column, event)}
                  aria-sort={ariaSortOf(column)}
                  aria-keyshortcuts={headerKeyShortcuts(column)}
                  aria-labelledby={`${uid}-h-${column.absIndex}`}
                  tabIndex={
                    sortable || draggable || props.columnResize !== false
                      ? 0
                      : undefined
                  }
                  onPointerDown={(event) => onHeaderPointerDown(column, event)}
                  onClick={(event) => onHeaderClick(column, event)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ')
                      onHeaderClick(column, event);
                    else onHeaderKeydown(column, event);
                  }}
                >
                  <span
                    className="oge-header-caption"
                    id={`${uid}-h-${column.absIndex}`}
                  >
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
                        headerFilterActive(column.field)
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
                    // APG window splitter: focusable (tabIndex -1); Alt+Arrow on
                    // the header is the primary keyboard path
                    <span
                      className="oge-resize-handle"
                      role="separator"
                      aria-orientation="vertical"
                      tabIndex={-1}
                      aria-label={formatPattern(msg.resizeColumn, {
                        column: column.caption,
                      })}
                      aria-valuenow={separatorValue(column).now}
                      aria-valuemin={separatorValue(column).min}
                      aria-valuemax={separatorValue(column).max}
                      onPointerDown={(event) => onResizeStart(column, event)}
                      onDoubleClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        fitColumn(column);
                      }}
                      onKeyDown={(event) =>
                        onResizeHandleKeydown(column, event)
                      }
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
          {pinnedTopNodes.map((node, index) =>
            renderPinnedRow(node, index + 2, 'top'),
          )}
          {stickyGroupRows.length ? (
            // a visual aid: the real group rows stay in the grid for keyboard
            // and screen-reader users; a click scrolls to the group
            <div className="oge-sticky-groups" aria-hidden="true">
              {stickyGroupRows.map((group) => (
                <div
                  key={String(group.key)}
                  className="oge-group-row oge-sticky-group-row"
                  style={{ paddingLeft: 12 + group.level * 20 }}
                  onClick={() => scrollToGroup(group.key)}
                >
                  <div className="oge-group-cell">
                    <span className="oge-group-arrow oge-expanded">
                      {chevron('m6 3.5 4.5 4.5L6 12.5')}
                    </span>
                    <span className="oge-group-label">
                      {groupCaption(group.groupField) + ': '}
                      <strong>{groupValueText(group)}</strong>
                      <span className="oge-group-count">{` (${group.childCount})`}</span>
                    </span>
                  </div>
                </div>
              ))}
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
        {hasTotalRow || pinnedBottomNodes.length ? (
          <div className="oge-footer">
            {pinnedBottomNodes.map((node, index) =>
              renderPinnedRow(
                node,
                totalCount + 2 + pinnedTopCount + index,
                'bottom',
              ),
            )}
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
                  column.alignment !== 'start'
                    ? `oge-align-${column.alignment}`
                    : '',
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
        ) : null}
      </div>
      {/* permanent live region: keyboard resize / reorder / row moves */}
      <div
        className="oge-sr-only oge-grid-announcer"
        aria-live="polite"
        aria-atomic="true"
      >
        {liveMessage}
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
          showFirstLast={pagingOptions.showFirstLastButtons === true}
          showPageInput={pagingOptions.showPageInput === true}
          renderInfo={props.renderPagerInfo}
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
                data-chooser-id={entry.id}
                aria-keyshortcuts={
                  props.columnReorder !== false
                    ? 'Control+ArrowUp Control+ArrowDown'
                    : undefined
                }
                onKeyDown={(event) => onChooserKeydown(entry.id, event)}
                onPointerDown={(event) => onChooserPointerDown(entry.id, event)}
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
          <div
            className={
              headerFilterMode === 'list'
                ? 'oge-header-filter-popup'
                : 'oge-header-filter-popup oge-header-filter-menu'
            }
            role={headerFilterMode === 'list' ? 'listbox' : 'group'}
            aria-label={headerFilterMode === 'list' ? undefined : msg.filterValues}
          >
            {headerFilterMode !== 'list' &&
            headerFilterColumn &&
            model.headerConditionDraft()
              ? (() => {
                  const draft = model.headerConditionDraft() as OgeHeaderConditionFilter;
                  const hfColumn = headerFilterColumn;
                  const operatorItems = headerConditionOperators(
                    hfColumn.dataType,
                  ).map((op) => ({ value: op, text: msg.operators[op] }));
                  const conditionRow = (which: 'first' | 'second') => {
                    const condition = draft[which];
                    const label =
                      which === 'first' ? msg.firstCondition : msg.secondCondition;
                    const valueLabel = `${label} ${msg.filterValuePlaceholder}`;
                    const common = {
                      className: 'oge-hf-condition-value',
                      size: 'sm' as const,
                      labelMode: 'hidden' as const,
                      subscriptSizing: 'none' as const,
                      fluid: true,
                      label: valueLabel,
                    };
                    let editor: ReactNode = null;
                    if (headerConditionNeedsValue(condition.operator)) {
                      if (hfColumn.dataType === 'number')
                        editor = (
                          <OgeNumberBox
                            {...common}
                            value={
                              typeof condition.value === 'number'
                                ? condition.value
                                : null
                            }
                            onValueCommitted={(event) =>
                              setHeaderCondition(which, { value: event.value })
                            }
                          />
                        );
                      else if (hfColumn.dataType === 'boolean')
                        editor = (
                          <OgeSelectBox
                            {...common}
                            items={[
                              { value: true, text: msg.booleanTrueLabel },
                              { value: false, text: msg.booleanFalseLabel },
                            ]}
                            displayExpr="text"
                            valueExpr="value"
                            value={condition.value}
                            onValueCommitted={(event) =>
                              setHeaderCondition(which, { value: event.value })
                            }
                          />
                        );
                      else if (isOgeDateType(hfColumn.dataType))
                        editor = (
                          <OgeDateBox
                            {...common}
                            value={
                              condition.value instanceof Date
                                ? condition.value
                                : null
                            }
                            onValueCommitted={(event) =>
                              setHeaderCondition(which, { value: event.value })
                            }
                          />
                        );
                      else
                        editor = (
                          <OgeTextBox
                            {...common}
                            value={
                              condition.value == null
                                ? ''
                                : String(condition.value)
                            }
                            onInputChange={(event) =>
                              setHeaderCondition(which, { value: event.text })
                            }
                          />
                        );
                    }
                    return (
                      <div
                        key={which}
                        className="oge-hf-condition"
                        role="group"
                        aria-label={label}
                      >
                        <OgeSelectBox
                          className="oge-hf-condition-op"
                          size="sm"
                          labelMode="hidden"
                          subscriptSizing="none"
                          fluid
                          label={label}
                          items={operatorItems}
                          displayExpr="text"
                          valueExpr="value"
                          value={condition.operator}
                          onValueCommitted={(event) =>
                            setHeaderCondition(which, {
                              operator: event.value as FilterOperator,
                            })
                          }
                        />
                        {editor}
                      </div>
                    );
                  };
                  return (
                    <section
                      className="oge-hf-conditions"
                      aria-label={msg.filterByCondition}
                    >
                      <div className="oge-hf-section-title">
                        {msg.filterByCondition}
                      </div>
                      {conditionRow('first')}
                      <div
                        className="oge-hf-logic"
                        role="radiogroup"
                        aria-label={msg.filterByCondition}
                      >
                        {(['and', 'or'] as const).map((logic) => (
                          <label key={logic}>
                            <input
                              type="radio"
                              name={`${uid}-hf-logic`}
                              checked={draft.logic === logic}
                              onChange={() =>
                                model.headerConditionDraft.set({
                                  ...draft,
                                  logic,
                                })
                              }
                            />
                            {logic === 'and' ? msg.logicAnd : msg.logicOr}
                          </label>
                        ))}
                      </div>
                      {conditionRow('second')}
                      <div className="oge-hf-actions">
                        <button
                          type="button"
                          className="oge-tool-btn oge-tool-text-btn oge-btn-accent oge-hf-apply"
                          onClick={applyHeaderConditions}
                        >
                          {msg.apply}
                        </button>
                        <button
                          type="button"
                          className="oge-tool-btn oge-tool-text-btn oge-hf-clear"
                          onClick={clearHeaderConditions}
                        >
                          {msg.clearFilter}
                        </button>
                      </div>
                    </section>
                  );
                })()
              : null}
            {headerFilterMode !== 'conditions' ? (
              <>
                {headerFilterMode === 'both' ? (
                  <div className="oge-hf-section-title">
                    {msg.filterByValues}
                  </div>
                ) : null}
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
                {headerDateRows ? (
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
                    {headerDateRows.map((dateNode) => {
                      const collapsed = model
                        .headerDateCollapsed()
                        .has(dateNode.key);
                      const groupState = headerGroupState(
                        headerSelection(),
                        dateNode.values,
                      );
                      const classes = ['oge-hf-item'];
                      if (dateNode.level === 0 && dateNode.children.length)
                        classes.push('oge-hf-group');
                      if (dateNode.level === 1) classes.push('oge-hf-month');
                      if (!dateNode.children.length) classes.push('oge-hf-leaf');
                      return (
                        <div
                          key={dateNode.key}
                          className="oge-hf-node"
                          style={{ paddingInlineStart: dateNode.level * 16 }}
                        >
                          {dateNode.children.length ? (
                            <button
                              type="button"
                              className={
                                collapsed
                                  ? 'oge-hf-toggle'
                                  : 'oge-hf-toggle oge-expanded'
                              }
                              aria-expanded={!collapsed}
                              aria-label={dateNode.label}
                              onClick={() => {
                                const next = new Set(model.headerDateCollapsed());
                                if (!next.delete(dateNode.key))
                                  next.add(dateNode.key);
                                model.headerDateCollapsed.set(next);
                              }}
                            >
                              {chevron('m6 3.5 4.5 4.5L6 12.5', 10)}
                            </button>
                          ) : (
                            <span
                              className="oge-hf-toggle-spacer"
                              aria-hidden="true"
                            />
                          )}
                          <label className={classes.join(' ')}>
                            <OgeCheckBox
                              value={
                                groupState === 'some'
                                  ? null
                                  : groupState === 'all'
                              }
                              onValueCommitted={() => toggleHeaderGroup(dateNode)}
                            />
                            <span>{dateNode.label}</span>
                          </label>
                        </div>
                      );
                    })}
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
              </>
            ) : null}
          </div>
        </OgePopup>
      ) : null}
      {props.cellHintEnabled && model.hintCell() && hintPanel.isOpen ? (
            // fixed-positioned: escapes the grid's clipping without a portal
            <div
              ref={hintBubbleRef}
              id={hintPanel.panelId}
              role="tooltip"
              className={[
                'oge-tooltip',
                'oge-grid-cell-hint',
                hintPanel.position && 'oge-tooltip-ready',
              ]
                .filter(Boolean)
                .join(' ')}
              data-placement={hintPanel.position?.placement ?? undefined}
              style={{
                top: hintPanel.position?.top ?? 0,
                left: hintPanel.position?.left ?? 0,
                opacity: hintPanel.position ? undefined : 0,
              }}
            >
              {model.hintText()}
            </div>
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

/** Same fields in the same order with the same directions. */
function sameSort(
  a: readonly SortDescriptor[],
  b: readonly SortDescriptor[],
): boolean {
  return (
    a.length === b.length &&
    a.every((d, i) => d.field === b[i].field && d.dir === b[i].dir)
  );
}
