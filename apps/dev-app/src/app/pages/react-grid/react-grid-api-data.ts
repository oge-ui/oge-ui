// Hand-compiled from packages/react/grid/src/lib/** — keep in sync with the
// source TSDoc.
//
// Mirrors `pages/data-grid/data-grid-api-data.ts` group for group for the
// members this slice ships (see docs/REACT-PARITY.md for the phase table),
// so the two views read as one page across the switch. What differs is the
// idiom — controlled props with `on…Change` callbacks instead of `model()`,
// `on`-prefixed callbacks instead of outputs, a `ref` handle instead of
// public methods, render props instead of structural directives, providers +
// hooks instead of DI tokens.
import type { ApiSections } from '../../shared/api-reference';

export const OGE_REACT_GRID_API: ApiSections = {
  properties: [
    {
      title: 'Data & columns',
      entries: [
        {
          name: 'data',
          type: 'readonly T[] | DataSource&lt;T&gt;',
          default: '[]',
          description:
            'Rows to render: a static array or any <code>DataSource</code> implementation (remote, windowed, pushing live changes).',
        },
        {
          name: 'columns',
          type: 'readonly (string | OgeColumnDef | OgeGridColumnProps&lt;T&gt;)[]',
          default: 'undefined',
          description:
            'The columns. When omitted, columns are derived from the first row’s keys; a plain string is shorthand for <code>{ field }</code>.',
        },
        {
          name: 'keyField',
          type: 'keyof T | ((row: T) =&gt; RowKey)',
          default: 'undefined',
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
            "<code>false</code> disables sorting entirely; <code>'single'</code> restricts to one column (no shift+click chains).",
        },
        {
          name: 'sorting',
          type: 'OgeSortingOptions',
          default: 'undefined',
          description:
            'Sorting options (<code>mode</code>, <code>allowUnsorting</code>); overrides the <code>sortable</code> shorthand.',
        },
        {
          name: 'filterRow',
          type: 'boolean | OgeFilterRowOptions',
          default: 'false',
          description:
            'Per-column filter editors below the header — text, number, date, boolean and lookup editors with a per-column operator menu.',
        },
        {
          name: 'headerFilter',
          type: 'boolean | OgeHeaderFilterOptions',
          default: 'false',
          description:
            'Excel-style distinct-value filter button in the headers. Needs a DataSource that implements <code>distinct()</code>; date columns list their values grouped by year.',
        },
        {
          name: 'filterPanel',
          type: 'boolean',
          default: 'false',
          description:
            'Filter summary bar above the grid; clicking it opens the visual filter builder (arbitrary and/or condition trees).',
        },
        {
          name: 'filterValue / defaultFilterValue',
          type: 'FilterExpr | null',
          default: 'null',
          description:
            'The filter-builder expression — controlled with <code>onFilterValueChange</code>. Combines with the filter row, the header filters and the search panel.',
        },
        {
          name: 'searchPanel',
          type: 'boolean | OgeSearchPanelOptions',
          default: 'false',
          description: 'Global search box above the grid.',
        },
        {
          name: 'filterDebounce',
          type: 'number',
          default: 'config.filterDebounce (300)',
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
          description:
            'Enables paging with the pager: <code>pageSize</code>, optional <code>pageSizes</code>, <code>showInfo</code> and <code>displayMode</code>.',
        },
        {
          name: 'virtualScroll',
          type: 'boolean',
          default: 'false',
          description:
            'Renders only the rows inside the scroll viewport (plus overscan). Give the grid a bounded height when enabled.',
        },
        {
          name: 'scrolling',
          type: 'OgeScrollingOptions',
          default: 'undefined',
          description:
            "<code>mode</code> (<code>'virtual'</code> / <code>'infinite'</code>), <code>remote</code> windowed block loading and <code>columnRenderingMode: 'virtual'</code>; overrides the <code>virtualScroll</code> shorthand.",
        },
        {
          name: 'rowHeight',
          type: 'number',
          default: 'config.rowHeight (36)',
          description: 'Fixed row height in px used by the virtualizer.',
        },
        {
          name: 'autoRowHeight',
          type: 'boolean',
          default: 'false',
          description:
            'Measures real row heights (wrapped text, render props) instead of forcing <code>rowHeight</code>, with scroll anchoring. Virtual mode only.',
        },
        {
          name: 'overscan',
          type: 'number',
          default: 'config.overscan (6)',
          description: 'Extra rows rendered above/below the virtual window.',
        },
        {
          name: 'detailRowHeight',
          type: 'number',
          default: 'config.detailRowHeight (200)',
          description:
            'Height assumed for expanded master-detail rows in virtual mode.',
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
          description:
            'Shows the drop area for drag-and-drop row grouping; each group renders as a removable chip.',
        },
        {
          name: 'groupBy',
          type: 'readonly string[]',
          default: 'undefined',
          description:
            'Initial/programmatic grouping by field names (also drivable via the group panel).',
        },
        {
          name: 'grouping',
          type: 'OgeGroupingOptions',
          default: 'undefined',
          description:
            '<code>autoExpandAll: false</code> starts every group collapsed and enables deferred loading (<code>items: null</code> payloads fetched on expand).',
        },
      ],
    },
    {
      title: 'Selection & focus',
      entries: [
        {
          name: 'selectionMode',
          type: "'none' | 'single' | 'multiple' | 'checkbox'",
          default: "'none'",
          description:
            'Row selection: single, multiple (ctrl/shift ranges, Ctrl+A) or a checkbox column with a select-all header.',
        },
        {
          name: 'selectedKeys / defaultSelectedKeys',
          type: 'readonly RowKey[]',
          default: '[]',
          description:
            'The selected row keys — controlled with <code>selectedKeys</code> + <code>onSelectedKeysChange</code>, or seeded once with <code>defaultSelectedKeys</code>.',
        },
        {
          name: 'selectionDeferred',
          type: 'boolean',
          default: 'false',
          description:
            'Deferred selection: the selection is an expression rather than a key set, so "select all" over a remote source never materializes keys. Requires a string <code>keyField</code>.',
        },
        {
          name: 'selectionFilter',
          type: 'FilterExpr | null',
          default: 'null',
          description:
            'The selection expression (deferred mode) — controlled with <code>onSelectionFilterChange</code>.',
        },
        {
          name: 'selectAllMode',
          type: "'allPages' | 'page'",
          default: "'allPages'",
          description:
            'Header select-all scope: the whole filtered set across pages, or only the rows on the current page.',
        },
        {
          name: 'focusedRowEnabled',
          type: 'boolean',
          default: 'false',
          description: 'Highlights and tracks a single focused row.',
        },
        {
          name: 'focusedRowKey',
          type: 'RowKey | null',
          default: 'undefined',
          description:
            'The focused row’s key — controlled when provided, with <code>onFocusedRowKeyChange</code>.',
        },
      ],
    },
    {
      title: 'Columns UX',
      entries: [
        {
          name: 'columnMinWidth',
          type: 'number',
          default: 'config.columnMinWidth (120)',
          description: 'Track minimum for columns without an explicit width.',
        },
        {
          name: 'columnResize',
          type: 'boolean',
          default: 'true',
          description: 'Enables drag-resize handles on header edges.',
        },
        {
          name: 'columnReorder',
          type: 'boolean',
          default: 'true',
          description:
            'Enables drag-and-drop column reordering (headers dropped onto each other).',
        },
        {
          name: 'columnChooser',
          type: 'boolean',
          default: 'false',
          description:
            'Toolbar button opening the show/hide column list; with <code>columnReorder</code> its rows also drag to reorder.',
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
            "Enables editing: <code>{ mode: 'cell' | 'row' | 'batch' | 'popup' | 'form', allowUpdating, allowAdding, allowDeleting, confirmDelete, formItems, formColCount }</code>. <code>form</code> replaces the row with an inline <code>&lt;OgeForm&gt;</code>; <code>popup</code> opens the same form in a modal.",
        },
        {
          name: 'commandButtons',
          type: 'readonly OgeCommandButton&lt;T&gt;[]',
          default: 'undefined',
          description:
            "Customizes the trailing command column: reorder or mix the built-in <code>'edit'</code> / <code>'delete'</code> buttons with your own. Omitted, the column shows the built-ins the <code>editing</code> permissions allow.",
        },
        {
          name: 'highlightChanges',
          type: 'boolean',
          default: 'false',
          description:
            'Briefly flashes cells whose value changed under a live-updating source; consecutive updates to one cell restart the animation.',
        },
        {
          name: 'rowDragging',
          type: 'boolean',
          default: 'false',
          description:
            'Drag-handle column for reordering rows. With plain-array data the array is mutated in place; DataSource consumers handle <code>onRowReordered</code> instead.',
        },
        {
          name: 'renderRow',
          type: '(context: OgeGridRowRenderContext&lt;T&gt;) =&gt; ReactNode',
          default: 'undefined',
          description:
            'Replaces the whole data row — the React form of <code>*ogeRowTemplate</code>. Group, detail and summary rows keep their built-in rendering.',
        },
        {
          name: 'renderDetail',
          type: '(context: OgeGridDetailRenderContext&lt;T&gt;) =&gt; ReactNode',
          default: 'undefined',
          description:
            'Master-detail content under an expanded row — the React form of <code>*ogeDetailTemplate</code>. Its presence adds the expander column and switches the role to <code>treegrid</code>.',
        },
      ],
    },
    {
      title: 'Appearance & misc',
      entries: [
        {
          name: 'stateKey',
          type: 'string',
          default: 'undefined',
          description:
            'Persists user state (sort, filters, column layout, page size) under this key via the state storage (default <code>localStorage</code>) and restores it on mount.',
        },
        {
          name: 'stateStorage',
          type: 'OgeStateStorage',
          default: 'context storage',
          description:
            'Per-grid storage backend; overrides <code>&lt;OgeGridStateStorageProvider&gt;</code>.',
        },
        {
          name: 'messages',
          type: 'Partial&lt;OgeGridMessages&gt;',
          default: 'undefined',
          description:
            'Per-grid overrides of the UI strings (see <code>&lt;OgeGridConfigProvider&gt;</code> for app-wide).',
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
          description: 'Wraps cell text instead of clipping it.',
        },
        {
          name: 'rowAlternation',
          type: 'boolean',
          default: 'false',
          description:
            'Alternating row background (zebra striping), stable under virtualization.',
        },
        {
          name: 'rtlEnabled',
          type: 'boolean',
          default: 'undefined',
          description:
            'Right-to-left layout. <code>undefined</code> auto-detects the inherited CSS <code>direction</code>; <code>true</code>/<code>false</code> force it.',
        },
        {
          name: 'renderNoData',
          type: '(context: OgeGridNoDataContext) =&gt; ReactNode',
          default: 'undefined',
          description:
            'Renders the empty state instead of the <code>noData</code> message — the React form of <code>*ogeNoDataTemplate</code>.',
        },
        {
          name: 'className / style / ariaLabel',
          type: 'string | CSSProperties',
          default: 'undefined',
          description:
            'Host class, inline style (give the grid its height here) and the accessible name of the grid.',
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
          type: 'handle',
          description: 'Re-runs the current load against the DataSource.',
        },
        {
          name: 'getVisibleRows(): readonly T[]',
          type: 'handle',
          description:
            'Data rows of the currently rendered page, in display order.',
        },
        {
          name: 'getRowByKey(key: RowKey): T | undefined',
          type: 'handle',
          description:
            'The loaded row carrying <code>key</code>, if it is currently rendered.',
        },
        {
          name: 'totalCount(): number',
          type: 'handle',
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
          type: 'handle',
          description:
            'Scrolls a row into the viewport — by flat index, or by row key.',
        },
        {
          name: 'navigateToRow(key: RowKey): void',
          type: 'handle',
          description:
            'Scrolls the row carrying <code>key</code> into view and, with <code>focusedRowEnabled</code>, makes it the focused row.',
        },
        {
          name: 'expandRow(key) / collapseRow(key)',
          type: 'handle',
          description:
            'Expands or collapses a group row (by its group node key, e.g. <code>g:Sales</code>) or a master-detail row.',
        },
        {
          name: 'isRowExpanded(key): boolean',
          type: 'handle',
          description:
            'Whether the group or master-detail row carrying <code>key</code> is expanded.',
        },
        {
          name: 'expandAllGroups() / collapseAllGroups()',
          type: 'handle',
          description: 'Expands or collapses every group row, all levels.',
        },
      ],
    },
    {
      title: 'Selection',
      entries: [
        {
          name: 'selectAll(): void',
          type: 'handle',
          description:
            'Selects every row of the current filtered set; scope via <code>selectAllMode</code>.',
        },
        {
          name: 'deselectAll() / clearSelection()',
          type: 'handle',
          description: 'Clears the selection (parity aliases).',
        },
        {
          name: 'isRowSelected(key): boolean',
          type: 'handle',
          description: 'Whether the row carrying <code>key</code> is selected.',
        },
        {
          name: 'getSelectedRowsData(): T[]',
          type: 'handle',
          description:
            'Data of the selected rows among the currently loaded rows, in display order.',
        },
        {
          name: 'copyToClipboard(): Promise&lt;void&gt;',
          type: 'handle',
          description:
            'Copies the selected rows (with a header) — or, without a selection, the focused cell’s text — as tab-separated values. Also on Ctrl+C.',
        },
      ],
    },
    {
      title: 'Paging',
      entries: [
        {
          name: 'pageIndex(): number / setPageIndex(index)',
          type: 'handle',
          description:
            'Reads or navigates to the zero-based page (clamped to the valid range).',
        },
        {
          name: 'pageSize(): number / setPageSize(size)',
          type: 'handle',
          description:
            'Reads or changes the page size; <code>0</code> turns paging off.',
        },
        {
          name: 'pageCount(): number',
          type: 'handle',
          description: 'Number of pages; <code>1</code> when paging is off.',
        },
      ],
    },
    {
      title: 'Loading, state & export',
      entries: [
        {
          name: 'beginCustomLoading(message?) / endCustomLoading()',
          type: 'handle',
          description:
            'Shows the load panel with an optional custom message, independent of data-source activity.',
        },
        {
          name: 'state(): GridStateSnapshot / applyState(snapshot)',
          type: 'handle',
          description:
            'Reads or applies the persistable UI state: sort, filters, column layout, page size.',
        },
        {
          name: 'clearFilters() / clearSorting()',
          type: 'handle',
          description:
            'Clears every filter (row filters and search) / the sort order.',
        },
        {
          name: 'getExportData(options?): Promise&lt;OgeExportData&lt;T&gt;&gt;',
          type: 'handle',
          description:
            'Rows and column metadata of the current view (filter + search + sort applied) — the shared source for exporters. <code>scope</code> narrows to the page or selection.',
        },
        {
          name: 'getCsv(options?): Promise&lt;string&gt;',
          type: 'handle',
          description:
            'Builds CSV of the current view; <code>customizeCell</code> rewrites individual cells.' +
            'Cells a spreadsheet would evaluate as a formula are apostrophe-prefixed (CSV formula injection); <code>formulaGuard: false</code> opts out.',
        },
        {
          name: "exportCsv(filename = 'grid.csv'): Promise&lt;void&gt;",
          type: 'handle',
          description:
            'Downloads the current view as a CSV file. Fires the cancelable <code>onExporting</code> first.',
        },
        {
          name: 'exportGridToExcel(grid, options?)',
          type: '@oge-ui/react-grid/export-excel',
          description:
            'Downloads the current view as <code>.xlsx</code>. Takes the grid’s handle; <code>exceljs</code> is an optional peer, imported only by this entry point. <code>buildExcelWorkbook</code> is exported alongside for a workbook you assemble yourself — the same builder the Angular package calls.',
        },
        {
          name: 'exportGridToPdf(grid, options?)',
          type: '@oge-ui/react-grid/export-pdf',
          description:
            'Downloads the current view as <code>.pdf</code> (<code>title</code>, <code>orientation</code>, <code>pageFormat</code>). <code>jspdf</code> and <code>jspdf-autotable</code> are optional peers; <code>buildPdfDocument</code> is exported alongside.',
        },
      ],
    },
    {
      title: 'Editing',
      entries: [
        {
          name: 'addRow(): void',
          type: 'handle',
          description:
            'Adds an empty draft row on top and opens its editor(s); requires <code>editing.allowAdding</code>. <code>onInitNewRow</code> prefills it.',
        },
        {
          name: 'editRow(key): void',
          type: 'handle',
          description:
            'Opens the row editor for <code>key</code> — effective in <code>row</code>, <code>form</code> and <code>popup</code> modes; requires <code>editing.allowUpdating</code>.',
        },
        {
          name: 'deleteRow(key): void',
          type: 'handle',
          description:
            'Staged in batch mode (toggles, undoable), applied immediately otherwise; requires <code>editing.allowDeleting</code>.',
        },
        {
          name: 'saveChanges(): void',
          type: 'handle',
          description:
            'Commits the open editor and, in batch mode, saves the whole staged change set. <code>onSavingChanges</code> can still cancel it.',
        },
        {
          name: 'discardChanges(): void',
          type: 'handle',
          description:
            'Drops every pending change and closes any open editor; fires <code>onEditCanceled</code> when anything was open or pending.',
        },
        {
          name: 'hasChanges(): boolean',
          type: 'handle',
          description:
            'Whether unsaved edits exist: staged changes, added or removed rows.',
        },
      ],
    },
  ],
  events: [
    {
      title: 'Interaction',
      entries: [
        {
          name: 'onRowClick / onRowDblClick',
          type: '(event: OgeRowClickEvent&lt;T&gt;) =&gt; void',
          description:
            'A data row was clicked / double-clicked: <code>{ row, key, event }</code>.',
        },
        {
          name: 'onCellClick / onCellDblClick',
          type: '(event: OgeCellClickEvent&lt;T&gt;) =&gt; void',
          description:
            'A data cell was clicked / double-clicked: <code>{ row, key, field, value, event }</code>.',
        },
        {
          name: 'onRowReordered',
          type: '(event: OgeRowReorderedEvent&lt;T&gt;) =&gt; void',
          description:
            'After a dragged row was dropped: the moved key, the target key and the from/to view positions.',
        },
        {
          name: 'onRowContextMenu',
          type: '(event: OgeContextMenuEvent&lt;T&gt;) =&gt; void',
          description:
            'Right-click on a data row. Push entries into <code>items</code> to open the gridâs own menu at the pointer; leave it empty and the browserâs native menu is left alone.',
        },
        {
          name: 'onHeaderContextMenu',
          type: '(event: OgeHeaderContextMenuEvent) =&gt; void',
          description:
            'Right-click on a header, with the built-in items (sort / group / pin / hide) prebuilt — add, remove or reorder them before the menu opens.',
        },
      ],
    },
    {
      title: 'Selection & focus',
      entries: [
        {
          name: 'onSelectionChanged',
          type: '(event: OgeSelectionChangedEvent) =&gt; void',
          description:
            'After the selection changed, with <code>addedKeys</code> / <code>removedKeys</code> diffs. The initial state is not a change.',
        },
        {
          name: 'onFocusedRowChanged',
          type: '(event: OgeFocusedRowChangedEvent&lt;T&gt;) =&gt; void',
          description:
            'After the focused row changed (<code>focusedRowEnabled</code> or key writes), with the row when it is loaded.',
        },
        {
          name: 'onSelectedKeysChange / onFocusedRowKeyChange',
          type: '(value) =&gt; void',
          description:
            'The controlled-pair callbacks of <code>selectedKeys</code> and <code>focusedRowKey</code>.',
        },
      ],
    },
    {
      title: 'Editing',
      entries: [
        {
          name: 'onEditingStart',
          type: '(event: OgeEditingStartEvent&lt;T&gt;) =&gt; void',
          description:
            'Cancelable: before a row or cell editor opens. Set <code>cancel</code> to keep it closed.',
        },
        {
          name: 'onInitNewRow',
          type: '(event: OgeInitNewRowEvent) =&gt; void',
          description:
            'After <code>addRow()</code> created a draft row — values written into <code>event.values</code> stage onto it.',
        },
        {
          name: 'onRowInserting / onRowInserted',
          type: '(event) =&gt; void',
          description:
            'Around an added row reaching the DataSource; the <code>-ing</code> half is cancelable.',
        },
        {
          name: 'onRowUpdating / onRowUpdated',
          type: '(event) =&gt; void',
          description:
            'Around an edited row reaching the DataSource; the <code>-ing</code> half is cancelable and carries the change set.',
        },
        {
          name: 'onRowRemoving / onRowRemoved',
          type: '(event) =&gt; void',
          description:
            'Around a row being removed; the <code>-ing</code> half is cancelable.',
        },
        {
          name: 'onSavingChanges / onSavedChanges',
          type: '(event) =&gt; void',
          description:
            'Around a save batch: the <code>-ing</code> half is cancelable and can rewrite the change list; the past-tense half reports what was applied.',
        },
        {
          name: 'onEditCanceled',
          type: '() =&gt; void',
          description: 'After an edit session ended without saving.',
        },
        {
          name: 'onFilterValueChange / onSelectionFilterChange',
          type: '(value: FilterExpr | null) =&gt; void',
          description:
            'The controlled halves of <code>filterValue</code> (filter builder) and <code>selectionFilter</code> (deferred selection).',
        },
      ],
    },
    {
      title: 'Lifecycle & errors',
      entries: [
        {
          name: 'onContentReady',
          type: '() =&gt; void',
          description: 'After the grid has rendered a new result set.',
        },
        {
          name: 'onStateChange',
          type: '(snapshot: GridStateSnapshot) =&gt; void',
          description:
            'Debounced notification whenever the persistable UI state changes — persist it anywhere without a storage backend.',
        },
        {
          name: 'onExporting',
          type: '(event: OgeExportingEvent) =&gt; void',
          description:
            'Cancelable: before a CSV export starts; <code>fileName</code> is mutable.',
        },
        {
          name: 'onDataErrorOccurred',
          type: '(event: OgeDataErrorEvent) =&gt; void',
          description: 'A DataSource load failed.',
        },
      ],
    },
  ],
};

export const OGE_REACT_GRID_COLUMN_API: ApiSections = {
  properties: [
    {
      title: 'Basics',
      entries: [
        {
          name: 'field',
          type: 'string',
          default: 'undefined',
          description:
            'Dotted paths are supported, e.g. <code>"customer.name"</code>.',
        },
        {
          name: 'caption',
          type: 'string',
          default: 'humanized field',
          description:
            'Header text; derived from <code>field</code> when omitted.',
        },
        {
          name: 'width',
          type: 'number | string',
          default: 'undefined',
          description:
            "Number → px; string is used verbatim (e.g. <code>'2fr'</code>, <code>'150px'</code>).",
        },
        {
          name: 'dataType',
          type: "'string' | 'number' | 'date' | 'boolean'",
          default: "'string'",
          description:
            'Drives the default formatting, the filter-row editor and the operator set.',
        },
        {
          name: 'format',
          type: '(value: unknown) =&gt; string',
          default: 'undefined',
          description:
            'Custom value formatter applied to the default (non-rendered) cell text and to exports.',
        },
        {
          name: 'visible',
          type: 'boolean',
          default: 'true',
          description: 'Hides the column without removing it.',
        },
        {
          name: 'minWidth',
          type: 'number',
          default: 'config.columnMinWidth',
          description: 'Track minimum in px for flexible-width columns.',
        },
        {
          name: 'lookup',
          type: 'OgeColumnLookup',
          default: 'undefined',
          description:
            'Maps stored values to display texts (cells, filters, exports): <code>{ dataSource, valueExpr, displayExpr }</code>.',
        },
        {
          name: 'calculateCellValue',
          type: '(row: T) =&gt; unknown',
          default: 'undefined',
          description:
            'Computes the cell value from the row (display-only columns; disables sort/filter unless <code>field</code> is set).',
        },
        {
          name: 'hidingPriority',
          type: 'number',
          default: 'undefined',
          description:
            'Responsive hiding: lower priorities hide first when the grid runs out of width.',
        },
        {
          name: 'pinned',
          type: "false | 'left' | 'right'",
          default: 'false',
          description:
            'Pins the column to an edge (requires a numeric <code>width</code>).',
        },
      ],
    },
    {
      title: 'Sort, filter & group',
      entries: [
        {
          name: 'sortable',
          type: 'boolean',
          default: 'true',
          description: 'Whether the header sorts on click.',
        },
        {
          name: 'sortOrder / sortIndex',
          type: "'asc' | 'desc' / number",
          default: 'undefined',
          description:
            'Initial sort direction applied on first render, ordered by <code>sortIndex</code> for multi-sort chains.',
        },
        {
          name: 'calculateSortValue',
          type: '(row: T) =&gt; unknown',
          default: 'undefined',
          description:
            'Custom sort key for this column (client-side array data only).',
        },
        {
          name: 'filterable',
          type: 'boolean',
          default: 'true',
          description:
            'Whether the filter row offers an editor for this column.',
        },
        {
          name: 'filterOperator',
          type: 'FilterOperator',
          default: 'by dataType',
          description:
            'Filter-row operator override (default: <code>contains</code> for text, <code>eq</code> for number/date).',
        },
        {
          name: 'calculateFilterExpression',
          type: '(value, operator) =&gt; FilterExpr | null',
          default: 'undefined',
          description:
            'Custom filter expression for filter-row input on this column.',
        },
        {
          name: 'groupIndex',
          type: 'number',
          default: 'undefined',
          description: 'Initial group level of this column (0 = first).',
        },
      ],
    },
    {
      title: 'Summaries & editing',
      entries: [
        {
          name: 'groupSummary',
          type: 'SummaryType | readonly SummaryType[]',
          default: 'undefined',
          description:
            'Aggregate(s) shown on group rows for this column’s field: <code>sum · avg · min · max · count · custom</code>.',
        },
        {
          name: 'groupSummaryPosition',
          type: "'row' | 'footer'",
          default: "'row'",
          description:
            'Inline on the group header row, or on a dedicated footer row after the group’s children.',
        },
        {
          name: 'totalSummary',
          type: 'SummaryType | readonly SummaryType[]',
          default: 'undefined',
          description: 'Aggregate(s) shown in the grid’s sticky total row.',
        },
        {
          name: 'calculateCustomSummary',
          type: '(rows: readonly T[]) =&gt; unknown',
          default: 'undefined',
          description:
            'Reducer for the <code>custom</code> summary type. Client-side data only.',
        },
        {
          name: 'editable',
          type: 'boolean',
          default: 'true',
          description:
            'Lets <code>editing</code> open an editor on this column. A column without a <code>field</code>, or one with <code>calculateCellValue</code>, is never editable.',
        },
        {
          name: 'required',
          type: 'boolean',
          default: 'false',
          description:
            'Rejects an empty value while editing; the commit is refused and the editor stays open.',
        },
        {
          name: 'validators',
          type: 'readonly OgeGridValidator&lt;T&gt;[]',
          default: 'undefined',
          description:
            'Extra cell rules: <code>(value, row) =&gt; string | null</code>, first failing message wins. A message rather than a boolean, because React has no forms engine to carry an error map.',
        },
        {
          name: 'renderEditor',
          type: '(context: OgeGridEditorRenderContext&lt;T&gt;) =&gt; ReactNode',
          default: 'undefined',
          description:
            'Renders the cell’s editor — the React form of <code>*ogeEditTemplate</code>. The context carries the draft <code>value</code>, <code>setValue</code>, the validation <code>error</code> and <code>commit</code>/<code>cancel</code>.',
        },
        {
          name: 'bandCaption',
          type: 'string',
          default: 'undefined',
          description:
            'Groups the column under a spanning band header — the React form of <code>&lt;oge-column-group caption&gt;</code>. Adjacent columns sharing a caption merge into one band cell.',
        },
      ],
    },
    {
      title: 'Render props',
      entries: [
        {
          name: 'renderCell',
          type: '(context: OgeGridCellRenderContext&lt;T&gt;) =&gt; ReactNode',
          default: 'undefined',
          description:
            'Renders the cell content from <code>{ value, row, rowIndex, key, column }</code> — the React form of <code>*ogeCellTemplate</code>.',
        },
        {
          name: 'renderHeader',
          type: '(context: OgeGridHeaderRenderContext&lt;T&gt;) =&gt; ReactNode',
          default: 'undefined',
          description:
            'Renders the header caption from <code>{ column, caption }</code> — the React form of <code>*ogeHeaderTemplate</code>.',
        },
      ],
    },
  ],
};

export const OGE_REACT_GRID_TYPES_API: ApiSections = {
  types: [
    {
      title: 'Standalone building blocks',
      entries: [
        {
          name: '&lt;OgePager&gt;',
          type: 'OgePagerProps',
          description:
            'The grid’s pager on its own: <code>pageIndex</code>, <code>pageCount</code>, <code>totalCount</code>, <code>pageSizes</code>, <code>displayMode</code>, <code>onPageChange</code>, <code>onPageSizeChange</code>.',
        },
        {
          name: 'OgeGridHandle&lt;T&gt;',
          type: 'interface',
          description:
            'The <code>ref</code> handle — every imperative method listed under Methods.',
        },
      ],
    },
    {
      title: 'Option objects (boolean shorthands stay valid)',
      entries: [
        {
          name: 'OgeSortingOptions',
          type: "{ mode?: 'none' | 'single' | 'multi'; allowUnsorting?: boolean }",
          description: 'The same object the Angular grid accepts.',
        },
        {
          name: 'OgePagingOptions',
          type: "{ pageSize: number; pageSizes?: (number | 'all')[]; showInfo?: boolean; displayMode?: 'full' | 'compact' | 'adaptive' }",
          description: 'The same object the Angular grid accepts.',
        },
        {
          name: 'OgeScrollingOptions',
          type: "{ mode?: 'standard' | 'virtual' | 'infinite'; remote?: boolean; columnRenderingMode?: 'standard' | 'virtual' }",
          description: 'The same object the Angular grid accepts.',
        },
        {
          name: 'OgeGroupingOptions',
          type: '{ autoExpandAll?: boolean }',
          description: 'The same object the Angular grid accepts.',
        },
        {
          name: 'OgeFilterRowOptions / OgeSearchPanelOptions',
          type: '{ visible?: boolean; debounce?: number } / { visible?: boolean; placeholder?: string; width?: number }',
          description: 'The same objects the Angular grid accepts.',
        },
      ],
    },
    {
      title: 'Export',
      entries: [
        {
          name: 'OgeExportOptions&lt;T&gt;',
          type: "{ scope?: 'all' | 'page' | 'selection'; customizeCell?: (cell: OgeExportCellArgs&lt;T&gt;) =&gt; unknown }",
          description: 'Narrows and rewrites what the exporters emit.',
        },
        {
          name: 'OgeExportData&lt;T&gt; / OgeExportColumn&lt;T&gt;',
          type: '{ rows, columns } / { caption, field, dataType, accessor, format? }',
          description: 'What <code>getExportData()</code> resolves to.',
        },
      ],
    },
    {
      title: 'Configuration',
      entries: [
        {
          name: '&lt;OgeGridConfigProvider config&gt;',
          type: 'OgeGridConfigInput',
          description:
            'App- or subtree-wide defaults and messages — the counterpart of <code>provideOgeGridConfig()</code>; read with <code>useOgeGridConfig()</code>.',
        },
        {
          name: '&lt;OgeGridStateStorageProvider storage&gt;',
          type: 'OgeStateStorage',
          description:
            'Where <code>stateKey</code> persistence writes — the counterpart of the <code>OGE_STATE_STORAGE</code> token; read with <code>useOgeGridStateStorage()</code>. <code>OGE_LOCAL_STATE_STORAGE</code> is the default.',
        },
        {
          name: 'OgeGridMessages / OGE_DEFAULT_GRID_MESSAGES',
          type: 'interface / const',
          description:
            'Every user-facing string, single-sourced in <code>@oge-ui/behavior</code> with the Angular grid.',
        },
      ],
    },
  ],
};
