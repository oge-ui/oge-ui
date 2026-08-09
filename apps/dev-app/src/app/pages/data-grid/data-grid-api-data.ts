import type { ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/grid/src/lib/** — keep in sync with the source
 * TSDoc when the public API changes.
 */

export const OGE_GRID_API: ApiSections = {
  properties: [
    {
      title: 'Data & columns',
      entries: [
        {
          name: 'data',
          type: 'readonly T[] | DataSource&lt;T&gt;',
          default: '[]',
          description:
            'Rows to render: a static array or any DataSource implementation (remote, OData…).',
        },
        {
          name: 'columns',
          type: 'readonly (string | OgeColumnDef)[] | undefined',
          description:
            'Programmatic columns; used only when no declarative <code>&lt;oge-column&gt;</code> children exist. When both are absent, columns derive from the first row.',
        },
        {
          name: 'keyField',
          type: 'keyof T | ((row: T) =&gt; RowKey) | undefined',
          description:
            'Field (or selector) producing a stable row key; falls back to the row index.',
        },
      ],
    },
    {
      title: 'Sorting, filtering & search',
      entries: [
        {
          name: 'sortable',
          type: "boolean | 'single' | 'multi'",
          default: "'multi'",
          description:
            "<code>false</code> disables sorting; <code>'single'</code> restricts to one column.",
        },
        {
          name: 'sorting',
          type: 'OgeSortingOptions | undefined',
          description:
            'Sorting options; overrides the <code>sortable</code> shorthand.',
        },
        {
          name: 'filterRow',
          type: 'boolean | OgeFilterRowOptions',
          default: 'false',
          description: 'Per-column filter editors below the header.',
        },
        {
          name: 'headerFilter',
          type: 'boolean | OgeHeaderFilterOptions',
          default: 'false',
          description: 'Excel-style distinct-value filter button in headers.',
        },
        {
          name: 'searchPanel',
          type: 'boolean | OgeSearchPanelOptions',
          default: 'false',
          description: 'Global search box above the grid.',
        },
        {
          name: 'filterPanel',
          type: 'boolean',
          default: 'false',
          description: 'Filter panel bar with the filter-builder entry point.',
        },
        {
          name: 'filterValue',
          type: 'model&lt;FilterExpr | null&gt;',
          default: 'null',
          description:
            'Two-way binding of the builder/programmatic filter expression.',
        },
        {
          name: 'filterDebounce',
          type: 'number | undefined',
          description:
            'Debounce for text filter inputs, in ms. Set to <code>0</code> in tests.',
        },
      ],
    },
    {
      title: 'Paging & scrolling',
      entries: [
        {
          name: 'paging',
          type: 'false | OgePagingOptions',
          default: 'false',
          description: 'Client/server paging with the built-in pager.',
        },
        {
          name: 'virtualScroll',
          type: 'boolean',
          default: 'false',
          description:
            'Renders only the rows inside the scroll viewport (plus overscan). Needs a bounded height.',
        },
        {
          name: 'scrolling',
          type: 'OgeScrollingOptions | undefined',
          description:
            'Scrolling options (<code>standard/virtual/infinite</code>, remote windowing, column virtualization); overrides the shorthand.',
        },
        {
          name: 'rowHeight',
          type: 'number | undefined',
          description:
            'Fixed row height in px used by the virtualizer. Defaults from global config.',
        },
        {
          name: 'autoRowHeight',
          type: 'boolean',
          default: 'false',
          description:
            'Measures real row heights with scroll anchoring. Virtual mode only.',
        },
        {
          name: 'detailRowHeight',
          type: 'number | undefined',
          description:
            'Height assumed for expanded master-detail rows in virtual mode.',
        },
        {
          name: 'overscan',
          type: 'number | undefined',
          description: 'Extra rows rendered above/below the virtual window.',
        },
      ],
    },
    {
      title: 'Grouping',
      entries: [
        {
          name: 'groupPanel',
          type: 'boolean',
          default: 'false',
          description: 'Drop area for drag-and-drop row grouping.',
        },
        {
          name: 'groupBy',
          type: 'readonly string[] | undefined',
          description: 'Initial/programmatic grouping by field names.',
        },
        {
          name: 'grouping',
          type: 'OgeGroupingOptions | undefined',
          description:
            '<code>autoExpandAll: false</code> starts collapsed and enables deferred child loading.',
        },
      ],
    },
    {
      title: 'Selection & focus',
      entries: [
        {
          name: 'selectionMode',
          type: 'OgeSelectionMode',
          default: "'none'",
          description:
            'Row selection: none | single | multiple (ctrl/shift) | checkbox column.',
        },
        {
          name: 'selectedKeys',
          type: 'model&lt;RowKey[]&gt;',
          default: '[]',
          description: 'Two-way binding of the selected row keys.',
        },
        {
          name: 'selectAllMode',
          type: "'allPages' | 'page'",
          default: "'allPages'",
          description: 'Header select-all scope.',
        },
        {
          name: 'selectionDeferred',
          type: 'boolean',
          default: 'false',
          description:
            'Selection tracked as a serializable <code>selectionFilter</code> expression — no key set. Requires a string <code>keyField</code>.',
        },
        {
          name: 'selectionFilter',
          type: 'model&lt;FilterExpr | null&gt;',
          default: 'null',
          description: 'Two-way selection expression (deferred mode).',
        },
        {
          name: 'focusedRowEnabled',
          type: 'boolean',
          default: 'false',
          description: 'Highlights and tracks a single focused row.',
        },
        {
          name: 'focusedRowKey',
          type: 'model&lt;RowKey | null&gt;',
          default: 'null',
          description: "Two-way binding of the focused row's key.",
        },
      ],
    },
    {
      title: 'Editing & rows',
      entries: [
        {
          name: 'editing',
          type: 'false | OgeEditingOptions',
          default: 'false',
          description:
            "Enables editing: <code>{ mode: 'cell' | 'row' | 'batch' | 'popup' | 'form', allow… }</code>.",
        },
        {
          name: 'commandButtons',
          type: 'readonly OgeCommandButton&lt;T&gt;[] | undefined',
          description:
            "Customizes the trailing command column: built-in 'edit'/'delete' plus custom buttons with per-row <code>visible</code>.",
        },
        {
          name: 'rowDragging',
          type: 'boolean',
          default: 'false',
          description:
            'Drag-handle column for reordering rows. Arrays mutate in place; DataSources handle <code>rowReordered</code>.',
        },
      ],
    },
    {
      title: 'Columns UX',
      entries: [
        {
          name: 'columnChooser',
          type: 'boolean',
          default: 'false',
          description: 'Column visibility chooser button.',
        },
        {
          name: 'columnResize',
          type: 'boolean',
          default: 'true',
          description: 'Drag-resize handles on header edges.',
        },
        {
          name: 'columnReorder',
          type: 'boolean',
          default: 'true',
          description: 'Drag-and-drop column reordering.',
        },
        {
          name: 'columnMinWidth',
          type: 'number | undefined',
          description: 'Track minimum for columns without an explicit width.',
        },
      ],
    },
    {
      title: 'Appearance & misc',
      entries: [
        {
          name: 'stateKey',
          type: 'string | undefined',
          description:
            'Persists user state (sort, filters, grouping, layout) via <code>OGE_STATE_STORAGE</code>.',
        },
        {
          name: 'messages',
          type: 'Partial&lt;OgeGridMessages&gt; | undefined',
          description: 'Per-grid overrides of the UI strings.',
        },
        {
          name: 'loadPanel',
          type: 'boolean',
          default: 'false',
          description: 'Spinner overlay while a load is in flight.',
        },
        {
          name: 'wordWrap',
          type: 'boolean',
          default: 'false',
          description: 'Cells wrap instead of truncating.',
        },
        {
          name: 'rowAlternation',
          type: 'boolean',
          default: 'false',
          description: 'Zebra striping, stable under virtualization.',
        },
        {
          name: 'highlightChanges',
          type: 'boolean',
          default: 'false',
          description: 'Briefly flashes cells patched by push updates.',
        },
        {
          name: 'rtlEnabled',
          type: 'boolean | undefined',
          description:
            '<code>undefined</code> auto-detects the inherited CSS <code>direction</code>.',
        },
      ],
    },
  ],
  methods: [
    {
      title: 'Data & view',
      entries: [
        {
          name: 'refresh(): void',
          type: 'void',
          description: 'Re-runs the current load against the DataSource.',
        },
        {
          name: 'getVisibleRows(): readonly T[]',
          type: 'readonly T[]',
          description:
            'Data rows of the currently rendered page, in display order.',
        },
        {
          name: 'getRowByKey(key: RowKey): T | undefined',
          type: 'T | undefined',
          description:
            'The loaded row carrying <code>key</code>, if currently rendered.',
        },
        {
          name: 'totalCount(): number',
          type: 'Signal&lt;number&gt;',
          description:
            'Data row count of the current filtered set, across all pages.',
        },
      ],
    },
    {
      title: 'Navigation & expansion',
      entries: [
        {
          name: 'scrollToRow(target: number | RowKey): void',
          type: 'void',
          description: 'Scrolls a row into the viewport by flat index or key.',
        },
        {
          name: 'navigateToRow(key: RowKey): void',
          type: 'void',
          description:
            'Scrolls to the row and focuses it when <code>focusedRowEnabled</code>.',
        },
        {
          name: 'expandRow(key) / collapseRow(key)',
          type: 'void',
          description:
            'Expands/collapses a group row (group node key) or master-detail row.',
        },
        {
          name: 'isRowExpanded(key): boolean',
          type: 'boolean',
          description: 'Expansion state of a group or master-detail row.',
        },
        {
          name: 'expandAllGroups() / collapseAllGroups()',
          type: 'void',
          description: 'Expands/collapses every group row (all levels).',
        },
      ],
    },
    {
      title: 'Selection',
      entries: [
        {
          name: 'selectAll(): void',
          type: 'void',
          description:
            'Selects the current filtered set; honors <code>selectAllMode</code> and deferred mode.',
        },
        {
          name: 'deselectAll() / clearSelection()',
          type: 'void',
          description:
            'Clears the selection (deferred mode: resets <code>selectionFilter</code>).',
        },
        {
          name: 'isRowSelected(key): boolean',
          type: 'boolean',
          description: 'Whether the row is currently selected.',
        },
        {
          name: 'getSelectedRowsData(): T[]',
          type: 'T[]',
          description: 'Data of the selected rows among the loaded rows.',
        },
        {
          name: 'copyToClipboard(): Promise&lt;void&gt;',
          type: 'Promise&lt;void&gt;',
          description:
            'Copies the selected rows (or the focused cell) as tab-separated values.',
        },
      ],
    },
    {
      title: 'Editing',
      entries: [
        {
          name: 'addRow(): void',
          type: 'void',
          description:
            'Adds a new (unsaved) row and opens its editors; <code>initNewRow</code> can prefill. Requires <code>allowAdding</code>.',
        },
        {
          name: 'editRow(key: RowKey): void',
          type: 'void',
          description:
            'Opens the row editor (row/form/popup modes). Requires <code>allowUpdating</code>.',
        },
        {
          name: 'deleteRow(key: RowKey): void',
          type: 'void',
          description:
            'Deletes the row: staged in batch mode (toggle = undelete), saved immediately otherwise. Requires <code>allowDeleting</code>.',
        },
        {
          name: 'saveChanges(): void',
          type: 'void',
          description:
            'Commits the open editor and (batch) saves the staged change set. <code>savingChanges</code> can cancel.',
        },
        {
          name: 'discardChanges(): void',
          type: 'void',
          description:
            'Discards pending changes and closes any open editor; emits <code>editCanceled</code>.',
        },
        {
          name: 'hasChanges(): boolean',
          type: 'boolean',
          description: 'Whether unsaved edits exist.',
        },
      ],
    },
    {
      title: 'Paging',
      entries: [
        {
          name: 'pageIndex(): number / setPageIndex(index)',
          type: 'number / void',
          description: 'Zero-based page getter / clamped setter.',
        },
        {
          name: 'pageSize(): number / setPageSize(size)',
          type: 'number / void',
          description:
            'Page size getter / setter; <code>0</code> turns paging off.',
        },
        {
          name: 'pageCount(): number',
          type: 'Signal&lt;number&gt;',
          description: 'Number of pages; <code>1</code> when paging is off.',
        },
      ],
    },
    {
      title: 'Loading, state & export',
      entries: [
        {
          name: 'beginCustomLoading(message?) / endCustomLoading()',
          type: 'void',
          description:
            'Shows/hides the load panel with an optional message — independent of data activity.',
        },
        {
          name: 'state(): GridStateSnapshot / applyState(snapshot)',
          type: 'GridStateSnapshot / void',
          description: 'Captures / applies the persistable UI state.',
        },
        {
          name: 'clearFilters() / clearSorting()',
          type: 'void',
          description:
            'Clears every filter (row, header, builder, search) / the sort order.',
        },
        {
          name: 'getExportData(options?): Promise&lt;OgeExportData&lt;T&gt;&gt;',
          type: 'Promise',
          description:
            "Rows + column metadata of the current view; <code>scope: 'all' | 'page' | 'selection'</code>.",
        },
        {
          name: 'getCsv(options?): Promise&lt;string&gt;',
          type: 'Promise&lt;string&gt;',
          description: 'CSV of the current view.',
        },
        {
          name: "exportCsv(filename = 'grid.csv'): Promise&lt;void&gt;",
          type: 'Promise&lt;void&gt;',
          description:
            'Downloads the current view as CSV; fires the cancelable <code>exporting</code> event first.',
        },
      ],
    },
  ],
  events: [
    {
      title: 'Interaction',
      entries: [
        {
          name: 'rowClick / rowDblClick',
          type: 'OgeRowClickEvent&lt;T&gt;',
          description: '<code>{ row, key, event }</code>.',
        },
        {
          name: 'cellClick / cellDblClick',
          type: 'OgeCellClickEvent&lt;T&gt;',
          description: '<code>{ row, key, field, value, event }</code>.',
        },
        {
          name: 'rowContextMenu',
          type: 'OgeContextMenuEvent&lt;T&gt;',
          description:
            'Row right-click; push into <code>items</code> to open the built-in menu.',
        },
        {
          name: 'headerContextMenu',
          type: 'OgeHeaderContextMenuEvent',
          description:
            'Prebuilt, mutable header menu items (sort/group/pin/hide).',
        },
        {
          name: 'rowReordered',
          type: 'OgeRowReorderedEvent&lt;T&gt;',
          description:
            'A row was dropped in a new position (<code>rowDragging</code>).',
        },
      ],
    },
    {
      title: 'Selection & focus',
      entries: [
        {
          name: 'selectionChanged',
          type: 'OgeSelectionChangedEvent',
          description:
            '<code>{ selectedKeys, addedKeys, removedKeys }</code> after every selection change.',
        },
        {
          name: 'focusedRowChanged',
          type: 'OgeFocusedRowChangedEvent&lt;T&gt;',
          description:
            '<code>{ key, row }</code> after the focused row changed.',
        },
        {
          name: 'selectedKeysChange / focusedRowKeyChange / filterValueChange / selectionFilterChange',
          type: 'model outputs',
          description: 'Implicit outputs of the two-way models.',
        },
      ],
    },
    {
      title: 'Editing lifecycle',
      entries: [
        {
          name: 'editingStart',
          type: 'OgeEditingStartEvent&lt;T&gt;',
          description: 'Cancelable — before a cell or row editor opens.',
        },
        {
          name: 'initNewRow',
          type: 'OgeInitNewRowEvent',
          description:
            'Write into <code>values</code> to prefill rows created by <code>addRow()</code>.',
        },
        {
          name: 'rowInserting / rowInserted',
          type: 'OgeRowInserting/-edEvent',
          description:
            'Around each DataSource insert; <code>rowInserting</code> cancelable.',
        },
        {
          name: 'rowUpdating / rowUpdated',
          type: 'OgeRowUpdating/-edEvent',
          description:
            'Around each DataSource update; <code>rowUpdating</code> cancelable (carries <code>row</code> + <code>values</code>).',
        },
        {
          name: 'rowRemoving / rowRemoved',
          type: 'OgeRowRemoving/-edEvent',
          description:
            'Around each DataSource remove; <code>rowRemoving</code> cancelable.',
        },
        {
          name: 'savingChanges / savedChanges',
          type: 'OgeSaving/-edChangesEvent&lt;T&gt;',
          description: 'Whole batch before (cancelable) / after the save.',
        },
        {
          name: 'editCanceled',
          type: 'void',
          description: 'An edit session ended without saving.',
        },
      ],
    },
    {
      title: 'Lifecycle & errors',
      entries: [
        {
          name: 'contentReady',
          type: 'void',
          description:
            'A new result set finished rendering (post-render notification).',
        },
        {
          name: 'stateChange',
          type: 'GridStateSnapshot',
          description: 'Debounced — the persistable UI state changed.',
        },
        {
          name: 'exporting',
          type: 'OgeExportingEvent',
          description:
            'Cancelable, mutable <code>fileName</code> — before a CSV export.',
        },
        {
          name: 'dataErrorOccurred',
          type: 'OgeDataErrorEvent',
          description:
            '<code>{ error }</code> — a DataSource load or save failed.',
        },
      ],
    },
  ],
};

export const OGE_COLUMN_API: ApiSections = {
  properties: [
    {
      title: 'Companion directives',
      entries: [
        {
          name: 'OgeColumnGroup',
          type: 'oge-column-group — input: caption (required)',
          description:
            'Banded header: wraps sibling <code>&lt;oge-column&gt;</code> elements under one shared caption. Re-exported by <code>&#64;oge-ui/tree-list</code>.',
        },
        {
          name: 'OgeGridToolbarItem',
          type: 'directive — [ogeToolbar]',
          description:
            'Marks projected content as a toolbar item. The toolbar appears as soon as one item exists, alongside the built-in controls. Named <code>OgeGridToolbarItem</code> so it cannot collide with <code>&#64;oge-ui/layout</code>&rsquo;s <code>OgeToolbarItem</code>; the selector is unchanged.',
        },
      ],
    },
    {
      title: 'Basics',
      entries: [
        {
          name: 'field',
          type: 'string | undefined',
          description: 'Data field (dot paths supported via accessors).',
        },
        {
          name: 'caption',
          type: 'string | undefined',
          description:
            'Header text; humanized from <code>field</code> when omitted.',
        },
        {
          name: 'dataType',
          type: 'OgeDataType',
          default: "'string'",
          description:
            "'string' | 'number' | 'date' | 'boolean' — drives editors, filters and alignment.",
        },
        {
          name: 'width / minWidth',
          type: 'number | string / number',
          description: 'Track size; <code>minWidth</code> guards resizing.',
        },
        {
          name: 'visible',
          type: 'model&lt;boolean&gt;',
          default: 'true',
          description: 'Two-way visibility (column chooser writes it).',
        },
        {
          name: 'format',
          type: '(value: unknown) =&gt; string | undefined',
          description: 'Display formatter for cells, group rows, export.',
        },
        {
          name: 'pinned',
          type: "false | 'left' | 'right'",
          default: 'false',
          description: 'Pins the column to an edge.',
        },
        {
          name: 'hidingPriority',
          type: 'number | undefined',
          description:
            'Adaptive hiding order when width runs out (higher survives longer).',
        },
        {
          name: 'lookup',
          type: 'OgeColumnLookup | undefined',
          description:
            'Display + dropdown editor from a value list; cascading via function dataSource.',
        },
      ],
    },
    {
      title: 'Sort, filter & group',
      entries: [
        {
          name: 'sortable / filterable',
          type: 'boolean',
          default: 'true',
          description: 'Per-column opt-outs.',
        },
        {
          name: 'sortOrder / sortIndex',
          type: "'asc' | 'desc' / number",
          description: 'Initial sort (stateKey/user wins).',
        },
        {
          name: 'groupIndex',
          type: 'number | undefined',
          description: 'Initial grouping position.',
        },
        {
          name: 'filterOperator',
          type: 'FilterOperator | undefined',
          description: 'Initial operator of the filter-row cell.',
        },
        {
          name: 'calculateCellValue',
          type: '(row: T) =&gt; unknown',
          description: 'Calculated column value.',
        },
        {
          name: 'calculateSortValue',
          type: '(row: T) =&gt; unknown',
          description: 'Custom sort key.',
        },
        {
          name: 'calculateFilterExpression',
          type: '(value, operator) =&gt; FilterExpr | null',
          description: 'Custom filter expression builder.',
        },
      ],
    },
    {
      title: 'Summaries & editing',
      entries: [
        {
          name: 'groupSummary / totalSummary',
          type: 'SummaryType | readonly SummaryType[]',
          description: 'sum/avg/min/max/count/custom aggregates per column.',
        },
        {
          name: 'groupSummaryPosition',
          type: "'row' | 'footer'",
          default: "'row'",
          description: 'Group aggregates inline or in a footer row.',
        },
        {
          name: 'calculateCustomSummary',
          type: '(rows: readonly T[]) =&gt; unknown',
          description: "Reducer for <code>type: 'custom'</code>.",
        },
        {
          name: 'editable',
          type: 'boolean',
          default: 'true',
          description: 'Per-column editing opt-out.',
        },
        {
          name: 'required / validators',
          type: 'boolean / readonly ValidatorFn[]',
          description: 'Editor validation.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: '&lt;oge-column-group caption="…"&gt;',
          type: 'component',
          description:
            'Banded (multi-row) headers — wraps child <code>&lt;oge-column&gt;</code>s.',
        },
        {
          name: '*ogeCellTemplate',
          type: 'OgeCellTemplateContext&lt;T&gt;',
          description:
            '<code>{ $implicit: value, row, rowIndex, column }</code>.',
        },
        {
          name: '*ogeHeaderTemplate',
          type: 'OgeHeaderTemplateContext&lt;T&gt;',
          description: '<code>{ $implicit: column }</code>.',
        },
        {
          name: '*ogeEditTemplate',
          type: 'OgeEditTemplateContext&lt;T&gt;',
          description: '<code>{ $implicit: FormControl, row, column }</code>.',
        },
        {
          name: '*ogeDetailTemplate',
          type: 'OgeDetailTemplateContext&lt;T&gt;',
          description:
            'Master-detail content; <code>{ $implicit: row }</code>.',
        },
        {
          name: '*ogeRowTemplate',
          type: 'OgeRowTemplateContext&lt;T&gt;',
          description:
            'Full-row replacement; <code>{ $implicit: row, index, key }</code>.',
        },
        {
          name: '*ogeNoDataTemplate',
          type: 'TemplateRef',
          description: 'Custom empty state.',
        },
        {
          name: '[ogeToolbar]',
          type: 'marker directive',
          description: 'Projects custom controls into the grid toolbar.',
        },
      ],
    },
  ],
};

export const OGE_GRID_TYPES_API: ApiSections = {
  types: [
    {
      title: 'Standalone building blocks',
      entries: [
        {
          name: 'OgeCellEditor',
          type: 'oge-cell-editor — inputs: control (required), dataType, lookupItems, label, surface, invalid, errorTitle; outputs: enterKey, escapeKey, tabKey',
          description:
            'The editor the grid renders in a cell: picks the <code>dataType</code>-matched <code>oge-*-box</code> from <code>&#64;oge-ui/inputs</code> and binds it to a reactive <code>FormControl</code>. Usable on its own to get grid-identical editing in a form.',
        },
        {
          name: 'OgePager',
          type: 'oge-pager — inputs: pageIndex, pageCount, totalCount (required), pageSize, pageSizes, showInfo, displayMode, messages; outputs: pageChange, pageSizeChange',
          description:
            "The grid's pager as a standalone component — reuse it under a list or a card grid so paging looks identical everywhere.",
        },
        {
          name: 'OgeFilterBuilderGroup',
          type: 'oge-filter-builder-group',
          description:
            'Recursive node of the filter builder (a group of conditions plus nested groups). Exported so a custom filter UI can reuse the same tree editor.',
        },
        {
          name: 'formatCellValue(value, dataType, format?)',
          type: '(value: unknown, dataType: OgeDataType, format?: (value: unknown) =&gt; string) =&gt; string',
          description:
            'The exact formatting the grid applies to a cell. Use it to keep exports, tooltips or custom templates byte-identical with the rendered grid.',
        },
      ],
    },
    {
      title: 'Internals — not a supported API',
      entries: [
        {
          name: 'GridStateStore',
          type: 'component-scoped service',
          description:
            'Composes the state slices; <code>loadOptions</code> is the single choke point through which every data-affecting change triggers exactly one load. Injected by the grid, not by applications — use <code>state()</code> / <code>applyState()</code> instead.',
        },
        {
          name: 'GridDataAdapter',
          type: 'component-scoped service',
          description:
            'Bridges the reactive state to the pull-based <code>DataSource</code> contract with switchMap semantics, so a stale response can never win over a newer one.',
        },
        {
          name: 'SortSlice / FilterSlice / GroupingSlice / PagingSlice / ColumnsSlice / SelectionSlice / ExpansionSlice / OgeEditingSlice',
          type: 'state slices',
          description:
            "Read-only signals plus intent methods behind <code>GridStateStore</code>. Exported for the suite's own packages (tree-list, pivot) — treat them as internal: they may change in any release.",
        },
      ],
    },
    {
      title: 'Option objects (boolean shorthands stay valid)',
      entries: [
        {
          name: 'OgePagingOptions',
          type: "{ pageSize: number; pageSizes?: readonly (number | 'all')[]; showInfo?; displayMode?: 'full' | 'compact' | 'adaptive' }",
          description: 'Pager configuration.',
        },
        {
          name: 'OgeSortingOptions',
          type: "{ mode?: 'none' | 'single' | 'multi'; allowUnsorting?: boolean }",
          description: 'Sorting behavior.',
        },
        {
          name: 'OgeFilterRowOptions',
          type: '{ visible?: boolean; debounce?: number }',
          description: 'Filter row.',
        },
        {
          name: 'OgeHeaderFilterOptions',
          type: '{ visible?: boolean; valueLimit?: number }',
          description: 'Header filter.',
        },
        {
          name: 'OgeSearchPanelOptions',
          type: '{ visible?: boolean; placeholder?: string; width?: number }',
          description: 'Search panel.',
        },
        {
          name: 'OgeScrollingOptions',
          type: "{ mode?: 'standard' | 'virtual' | 'infinite'; remote?: boolean; columnRenderingMode?: 'standard' | 'virtual' }",
          description: 'Scrolling engine.',
        },
        {
          name: 'OgeGroupingOptions',
          type: '{ autoExpandAll?: boolean }',
          description:
            '<code>false</code> starts collapsed and defers child loading.',
        },
        {
          name: 'OgeEditingOptions',
          type: '{ mode: OgeEditMode; allowUpdating?; allowAdding?; allowDeleting?; confirmDelete?; formItems?; formColCount? }',
          description:
            'Editing configuration; <code>OgeEditMode</code> = cell | row | batch | popup | form.',
        },
        {
          name: 'OgeCommandButton&lt;T&gt;',
          type: "{ name?: 'edit' | 'delete'; text?; onClick?(row, key); visible?(row) }",
          description: 'Command column entries.',
        },
        {
          name: 'OgeColumnLookup',
          type: '{ dataSource: readonly unknown[] | ((row) =&gt; readonly unknown[]); valueExpr?; displayExpr? }',
          description: 'Lookup source.',
        },
      ],
    },
    {
      title: 'Export',
      entries: [
        {
          name: 'OgeExportOptions&lt;T&gt;',
          type: "{ scope?: 'all' | 'page' | 'selection'; customizeCell?(args) }",
          description: 'Shared by CSV/Excel/PDF.',
        },
        {
          name: 'OgeExportData&lt;T&gt; / OgeExportColumn&lt;T&gt; / OgeExportCellArgs&lt;T&gt;',
          type: 'interfaces',
          description: 'Rows + resolved column metadata handed to exporters.',
        },
        {
          name: 'exportGridToExcel(grid, options?)',
          type: '@oge-ui/grid/export-excel',
          description:
            'Lazy Excel export (exceljs peer); <code>buildExcelWorkbook(data)</code> for custom pipelines.',
        },
        {
          name: 'exportGridToPdf(grid, options?)',
          type: '@oge-ui/grid/export-pdf',
          description:
            'Lazy PDF export (jspdf peer); <code>buildPdfDocument(data)</code> for custom pipelines.',
        },
      ],
    },
    {
      title: 'Configuration',
      entries: [
        {
          name: 'provideOgeGridConfig(config)',
          type: 'Provider',
          description:
            'App/component-scoped defaults; deep-merges <code>messages</code>.',
        },
        {
          name: 'OgeGridConfig',
          type: '{ rowHeight: 36; detailRowHeight: 200; filterDebounce: 300; overscan: 6; columnMinWidth: 120; pinnedDefaultWidth: 150; headerFilterValueLimit: 200; allowUnsorting: true; messages }',
          description: 'Defaults shown inline.',
        },
        {
          name: 'OgeGridMessages',
          type: '60+ string keys',
          description:
            'Every user-facing string, incl. aria labels, filter operators, summary patterns — see <code>OGE_DEFAULT_MESSAGES</code> in the source.',
        },
        {
          name: 'OGE_STATE_STORAGE / OgeStateStorage',
          type: 'InjectionToken',
          description:
            'Pluggable sync/async persistence backend for <code>stateKey</code>.',
        },
      ],
    },
    {
      title: 'Filter builder',
      entries: [
        {
          name: 'builderToExpr / exprToBuilder / describeExpr / operatorsFor',
          type: 'functions',
          description:
            'Convert between builder trees and <code>FilterExpr</code>; humanize expressions.',
        },
        {
          name: 'OgeBuilderGroup / OgeBuilderCondition / OgeFilterBuilderField',
          type: 'interfaces',
          description: 'Filter-builder data model.',
        },
      ],
    },
  ],
};
