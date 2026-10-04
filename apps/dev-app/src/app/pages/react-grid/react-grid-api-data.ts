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
        {
          name: 'announcements',
          type: 'boolean',
          default: 'config.announcements (true)',
          description:
            'Speaks sort, filter/search result count (debounced, once the new result arrived), page, group expansion, select-all and blocked-save validation changes through the shared <code>useOgeLiveAnnouncer</code> regions — texts from the <code>*Announcement</code> messages. <code>false</code> opts out.',
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
            'Shows the drop area for drag-and-drop row grouping; each group renders as a removable chip. Keyboard: the header context menu (<kbd>Shift+F10</kbd>) offers <code>groupByColumn</code> / <code>ungroupColumn</code>; on a chip’s remove button <kbd>Ctrl+←/→</kbd> reorders the grouping and <kbd>Delete</kbd> removes it (<code>messages.groupMoved</code> / <code>groupRemoved</code>).',
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
            '<code>autoExpandAll: false</code> starts every group collapsed and enables deferred loading (<code>items: null</code> payloads fetched on expand); <code>contextMenuEnabled: true</code> offers group/ungroup in the header menu without the group panel.',
        },
      ],
    },
    {
      title: 'Selection & focus',
      entries: [
        {
          name: 'selectionMode',
          type: "'none' | 'single' | 'multiple' | 'checkbox' | 'cell'",
          default: "'none'",
          description:
            "Row selection: single, multiple (ctrl/shift ranges, Ctrl+A) or a checkbox column with a select-all header — or <code>'cell'</code>: rectangular cell ranges with TSV copy / paste and the fill handle (editing then starts on double-click, F2 or Enter).",
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
          name: 'columnHidingMode',
          type: "'hide' | 'detail' | undefined",
          default: "config: 'detail'",
          description:
            "What happens to columns responsive hiding (<code>hidingPriority</code>) takes out on a narrow grid: <code>'detail'</code> gives every row a toggle (a real button with <code>aria-expanded</code> / <code>aria-controls</code>, labelled by <code>toggleAdaptiveDetail</code>) that reveals the hidden columns' caption / value pairs on a second line of the row, rendered like the cells — format, lookups, boolean words and <code>renderCell</code>; <code>'hide'</code> drops them with no way back. The hiding pass counts the toggle's 32px track once a column is hidden.",
        },
        {
          name: 'columnResize',
          type: 'boolean',
          default: 'true',
          description:
            'Enables drag-resize handles on header edges. Keyboard: <kbd>Alt+←/→</kbd> on a focused header resizes by 10px (<kbd>Shift</kbd> for 1px); the handle is a focusable <code>role="separator"</code> (<code>aria-valuenow/min/max</code> = width in px, named by <code>messages.resizeColumn</code>) taking <kbd>←/→</kbd>, <kbd>Home</kbd>/<kbd>End</kbd> (min / max) and <kbd>Enter</kbd>/<kbd>Esc</kbd> (back to the header). RTL-aware; clamped to <code>minWidth</code> / <code>maxWidth</code>.',
        },
        {
          name: 'columnReorder',
          type: 'boolean',
          default: 'true',
          description:
            'Enables drag-and-drop column reordering (headers dropped onto each other). Keyboard: <kbd>Ctrl+Shift+←/→</kbd> on a focused header moves the column one step, never across a pinned group or out of its band (an unbanded column steps over a band as a whole), announced via <code>messages.columnMoved</code>.',
        },
        {
          name: 'columnChooser',
          type: 'boolean',
          default: 'false',
          description:
            'Toolbar button opening the show/hide column list; with <code>columnReorder</code> its rows also drag to reorder. Keyboard: <kbd>Space</kbd> toggles an item; with <code>columnReorder</code>, <kbd>Ctrl+↑/↓</kbd> moves it. Hiding is also in the header context menu.',
        },
        {
          name: 'toolbarBefore / toolbarCenter / toolbarAfter',
          type: 'ReactNode',
          default: 'undefined',
          description:
            'Your own toolbar content by group — the React form of Angular’s <code>[ogeToolbar]</code> placement: <code>toolbarBefore</code> at the start edge ahead of the group panel (filters, primary actions), <code>toolbarCenter</code> in the middle, <code>toolbarAfter</code> ahead of the built-in tools. Any of them makes the toolbar render.',
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
            "Enables editing: <code>{ mode: 'cell' | 'row' | 'batch' | 'popup' | 'form', allowUpdating, allowAdding, allowDeleting, confirmDelete, formItems, formColCount }</code>. <code>form</code> replaces the row with an inline <code>&lt;OgeForm&gt;</code>; <code>popup</code> opens the same form in a modal. An invalid cell editor sets <code>aria-invalid</code> on its control and points <code>aria-errormessage</code> / <code>aria-describedby</code> at a rendered, visually hidden error text (also the cell’s tooltip); the <code>form</code>/<code>popup</code> fields wire the same through <code>&lt;OgeForm&gt;</code>.",
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
            'Drag-handle column for reordering rows. With plain-array data the array is mutated in place; DataSource consumers handle <code>onRowReordered</code> instead. Keyboard: <kbd>Ctrl+↑/↓</kbd> on a focused cell moves the row onto its neighbour through the same drop path (same event), announced via <code>messages.rowMoved</code>.',
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
    {
      title: 'Cells, ranges & clipboard',
      entries: [
        {
          name: 'rangeSelection',
          type: 'OgeRangeSelectionOptions',
          description:
            '<code>{ copyHeaders, fillHandle, pasteAddsRows, multipleRanges }</code>.',
        },
        {
          name: 'selectedRanges / defaultSelectedRanges',
          type: 'readonly OgeGridCellRange[]',
          description:
            'The selected ranges — controlled with <code>selectedRanges</code> + <code>onSelectedRangesChange</code>, or seeded once. A sort, filter, page or grouping change clears them.',
        },
        {
          name: 'pinnedTopRows',
          type: 'readonly (T | RowKey)[]',
          description:
            'Rows pinned in a sticky section under the header: data objects, or keys of loaded rows (which then leave the body). Display rows; virtual scrolling compatible.',
        },
        {
          name: 'pinnedBottomRows',
          type: 'readonly (T | RowKey)[]',
          description: 'Rows pinned in the sticky footer, above the total row.',
        },
        {
          name: 'stickyGroupRows',
          type: 'boolean',
          default: 'false',
          description:
            'Keeps the enclosing group rows under the header while scrolling — a visual aid; a click scrolls to the group.',
        },
        {
          name: 'cellSpan',
          type: '(row: T, column: OgeGridColumnInfo) =&gt; OgeGridCellSpan | null | undefined',
          description:
            'Row / column spans per cell, with <code>aria-rowspan</code> / <code>aria-colspan</code> and span-aware arrows. Ignored while virtualized.',
        },
        {
          name: 'columnAutoWidth',
          type: 'boolean',
          default: 'false',
          description:
            'Sizes every column to its content once the first result set rendered.',
        },
        {
          name: 'cellHintEnabled',
          type: 'boolean',
          default: 'false',
          description:
            'Shows truncated cell text in the overlay tooltip on hover and on keyboard focus.',
        },
      ],
    },
    {
      title: 'Styling & drag groups',
      entries: [
        {
          name: 'rowClass',
          type: '(row: T, key: RowKey) =&gt; OgeClassValue',
          description:
            'Classes for a data row — string, array or <code>{ class: condition }</code> record.',
        },
        {
          name: 'cellClass',
          type: '(row: T, column: OgeGridColumnInfo) =&gt; OgeClassValue',
          description: 'Classes for a data cell, per row and column.',
        },
        {
          name: 'rowDragGroup',
          type: 'string',
          description:
            'Grids sharing a group name accept each other’s dragged rows; the target’s <code>onRowDrop</code> carries the source row. The source needs <code>rowDragging</code>.',
        },
        {
          name: 'allowDropInsideRow',
          type: 'boolean',
          default: 'false',
          description:
            "A drop on the middle half of a row reports <code>position: 'inside'</code>.",
        },
        {
          name: 'renderPagerInfo',
          type: '(context: OgePagerInfoContext) =&gt; ReactNode',
          description:
            'Renders the pager’s info text — the React form of <code>*ogePagerInfoTemplate</code>.',
        },
        {
          name: 'id',
          type: 'string',
          description:
            'Host element id — also the component id the row-drag events report.',
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
      title: 'Columns & summaries',
      entries: [
        {
          name: 'showColumnChooser(anchor?) / hideColumnChooser()',
          type: 'handle',
          description:
            'Opens the column chooser below <code>anchor</code> — e.g. a button in your own header bar, with <code>columnChooser</code> off — or, without one, below its toolbar button (or the grid’s start edge) / closes it.',
        },
        {
          name: 'getTotalSummaryValue(field, type?)',
          type: 'handle',
          description:
            'Raw value of a <code>totalSummary</code> by field (and type, when a column has several); <code>undefined</code> when none is configured or data has not loaded.',
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
            'Reads or applies the persistable UI state: sort, filters, column layout, page size. <code>applyState</code> validates the snapshot first (<code>sanitize*StateSnapshot</code>): unknown keys are dropped, prototype keys rejected, wrong types skipped — invalid input is ignored, never thrown.',
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
          name: "exportCsv(filename = 'grid.csv', options?): Promise&lt;void&gt;",
          type: 'handle',
          description:
            'Downloads the current view as a CSV file. Fires the cancelable <code>onExporting</code> first. <code>options</code> are <code>getCsv()</code>’s (<code>scope</code>, <code>customizeCell</code>, <code>separator</code>…); formula-leading cells are always neutralized.',
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
    {
      title: 'Ranges, clipboard & undo',
      entries: [
        {
          name: 'selectRange(range, add?)',
          type: '(range: OgeGridCellRange, add?: boolean) =&gt; void',
          description:
            'Selects a rectangular cell range; <code>add</code> keeps the existing ones.',
        },
        {
          name: 'clearRangeSelection()',
          type: '() =&gt; void',
          description: 'Clears every cell range.',
        },
        {
          name: 'getSelectedRangeData()',
          type: '() =&gt; unknown[][]',
          description:
            'The selected cells’ values as a rows × columns matrix (the lattice Ctrl+C copies).',
        },
        {
          name: 'pasteText(text)',
          type: '(text: string) =&gt; Promise&lt;number&gt;',
          description:
            'Pastes a TSV block into the editable cells from the focused cell (or fills the selected range with a single value): parsed with the column data type and lookup, validated, written as one undoable batch through the regular edit events. Resolves with the cells written.',
        },
        {
          name: 'fillDown() / fillRight()',
          type: '() =&gt; Promise&lt;number&gt;',
          description:
            'Ctrl+D / Ctrl+R: copies the range’s first row (column) into the rest — a single row copies the row above it.',
        },
        {
          name: 'undo() / redo()',
          type: '() =&gt; Promise&lt;void&gt;',
          description:
            'Ctrl+Z / Ctrl+Y: reverts or re-applies the last committed edit, paste or fill (staged in batch mode, saved otherwise).',
        },
        {
          name: 'canUndo() / canRedo()',
          type: '() =&gt; boolean',
          description: 'Whether the history has a step to revert / re-apply.',
        },
        {
          name: 'autoFitColumn(field) / autoFitColumns()',
          type: '(field: string) =&gt; void',
          description:
            'Sizes a column (or every column) to its header and rendered cells — what a double-click on the resize handle and the header menu’s “Size to fit” run.',
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
            "Right-click on a data row — and the Menu key / Shift+F10 in a focused cell. Push entries into <code>items</code> to open the grid’s own menu; leave it empty and the browser’s native menu is left alone. <code>source</code> is <code>'pointer'</code> or <code>'keyboard'</code> (then <code>clientX/Y</code> is the cell’s start/bottom corner); <code>event</code> is the originating React event.",
        },
        {
          name: 'onHeaderContextMenu',
          type: '(event: OgeHeaderContextMenuEvent) =&gt; void',
          description:
            'Right-click on a header — or the Menu key / Shift+F10 on a focused header — with the built-in items (sort / group / pin / hide) prebuilt: add, remove or reorder them before the menu opens. Carries <code>source</code> and <code>event</code> like <code>onRowContextMenu</code>.',
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
          name: 'onFocusedCellChanged',
          type: '(event: OgeFocusedCellChangedEvent&lt;T&gt;) =&gt; void',
          description:
            '<code>{ rowIndex, columnIndex, key, row, field }</code> after keyboard/pointer focus moved to another cell; <code>key</code>/<code>row</code> are <code>undefined</code> on group rows.',
        },
        {
          name: 'onSortChanged',
          type: '(event: OgeSortChangedEvent) =&gt; void',
          description:
            '<code>{ sort, previousSort }</code> as soon as the sort changed (header, menu, handle) — no debounce, unlike <code>onStateChange</code>. The initial sort is not a change.',
        },
        {
          name: 'onPageChanged',
          type: '(event: OgePageChangedEvent) =&gt; void',
          description:
            '<code>{ pageIndex, pageSize, previousPageIndex, previousPageSize }</code> after the page index or size changed.',
        },
        {
          name: 'onRowExpanding',
          type: '(event: OgeGridRowTogglingEvent&lt;T&gt;) =&gt; void',
          description:
            'Before a group or master-detail row expands (pointer, keyboard or <code>expandRow()</code>); <code>{ key, kind, row, cancel }</code> — set <code>cancel</code> to veto. Not fired per row by <code>expandAllGroups()</code>.',
        },
        {
          name: 'onRowExpanded',
          type: '(event: OgeGridRowToggleEvent&lt;T&gt;) =&gt; void',
          description:
            "<code>{ key, kind: 'group' | 'detail', row }</code> after the row expanded.",
        },
        {
          name: 'onRowCollapsing',
          type: '(event: OgeGridRowTogglingEvent&lt;T&gt;) =&gt; void',
          description:
            'Before a group or master-detail row collapses; cancelable.',
        },
        {
          name: 'onRowCollapsed',
          type: '(event: OgeGridRowToggleEvent&lt;T&gt;) =&gt; void',
          description: 'After a group or master-detail row collapsed.',
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
    {
      title: 'Ranges, preparation & drag',
      entries: [
        {
          name: 'onRangeSelectionChanged',
          type: '(event: OgeRangeSelectionChangedEvent) =&gt; void',
          description:
            'The selected ranges changed: <code>{ ranges, rowCount, columnCount, cellCount }</code>.',
        },
        {
          name: 'onRowPrepared',
          type: '(event: OgeRowPreparedEvent&lt;T&gt;) =&gt; void',
          description:
            'A data row element rendered a row for the first time — <code>{ row, key, rowIndex, element }</code>.',
        },
        {
          name: 'onCellPrepared',
          type: '(event: OgeCellPreparedEvent&lt;T&gt;) =&gt; void',
          description: 'Every data cell of a prepared row.',
        },
        {
          name: 'onRowDragStart',
          type: '(event: OgeRowDragStartEvent&lt;T&gt;) =&gt; void',
          description: 'Cancelable: a row drag is about to start.',
        },
        {
          name: 'onRowDragOver',
          type: '(event: OgeRowDragOverEvent) =&gt; void',
          description:
            'Cancelable, on the grid under the pointer; set <code>cancel</code> to refuse the spot.',
        },
        {
          name: 'onRowDrop',
          type: '(event: OgeRowDropEvent) =&gt; void',
          description:
            'A row was dropped on this grid — its own or another component’s (<code>sameComponent: false</code>); move the data in the handler.',
        },
        {
          name: 'onRowDragEnd',
          type: '(event: OgeRowDragEndEvent&lt;T&gt;) =&gt; void',
          description: 'The source side of a drag ended.',
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
          type: "'string' | 'number' | 'date' | 'datetime' | 'boolean'",
          default: "'string'",
          description:
            "Drives the default formatting, the filter-row editor, the operator set and the default alignment. <code>'datetime'</code> keeps the time of day.",
        },
        {
          name: 'alignment',
          type: "'start' | 'center' | 'end'",
          default: 'undefined',
          description:
            "Alignment of the cells, header and summaries (logical — <code>'end'</code> is the right edge in LTR). Unset, numbers align to the end and everything else to the start.",
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
          name: 'maxWidth',
          type: 'number | undefined',
          default: 'undefined',
          description:
            'Upper bound in px for user resizing — pointer drag and the <kbd>Alt+←/→</kbd> / separator keys; also the separator’s <code>aria-valuemax</code>.',
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
            'Responsive hiding: lower priorities hide first when the grid runs out of width; the hidden values stay reachable through the row toggle unless <code>columnHidingMode</code> is <code>&#39;hide&#39;</code>.',
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
        {
          name: 'groupInterval',
          type: "'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year' | number",
          default: 'undefined',
          description:
            "Bucket when grouping by this column — calendar units for dates (<code>'day'</code> by default for <code>date</code> / <code>datetime</code>; <code>'week'</code> starts on the locale’s first day) or a positive width for numbers. Sent as <code>LoadOptions.group[].interval</code>.",
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
    {
      title: 'Formatting, merging & async validation',
      entries: [
        {
          name: 'conditionalFormats',
          type: 'readonly OgeConditionalFormat&lt;T&gt;[]',
          description:
            'Declarative formats: rules, data bars, colour scales and icon sets — token classes and CSS custom properties only.',
        },
        {
          name: 'mergeCells',
          type: 'boolean',
          default: 'false',
          description:
            'Merges vertically adjacent equal values into one cell (<code>aria-rowspan</code>).',
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
          type: '{ autoExpandAll?: boolean; contextMenuEnabled?: boolean }',
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
        {
          name: 'exportGridToExcel(grid, options?)',
          type: '@oge-ui/react-grid/export-excel',
          description:
            'Downloads the current view as <code>.xlsx</code>. Takes the grid’s handle where the Angular signature takes the component. <code>exceljs</code> is an optional peer, imported only by this entry point; <code>buildExcelWorkbook</code> is exported alongside for a workbook you assemble yourself — the same builder the Angular package calls.',
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
        {
          name: 'messages.reorderColumnHeader / messages.detailColumnHeader / messages.selectAllColumnHeader / messages.reorderRow',
          type: 'string',
          description:
            'Accessible names of the row-drag, master-detail and selection header cells and of a row’s drag handle. Defaults: <code>Reorder</code>, <code>Detail</code>, <code>Select all</code>, <code>Reorder row</code>. The tree list reads <code>reparentColumnHeader</code> / <code>reparentRow</code> (<code>Reparent</code>, <code>Reparent row</code>) for its reparenting handle.',
        },
        {
          name: 'messages.resizeColumn / messages.columnResized / messages.columnMoved / messages.rowMoved / messages.treeRowMoved / messages.groupMoved / messages.groupRemoved',
          type: 'string',
          description:
            'The keyboard alternatives to dragging (WCAG 2.1.1 / 2.5.7): the resize separator’s name (<code>Resize {column}</code>) and the polite live-region announcements after a keyboard resize (<code>{column} width {width} pixels</code>), column move (<code>{column} moved to position {position} of {total}</code>), row move (<code>Row moved to position {position} of {total}</code>), tree-row move (<code>Row moved to level {level}, position {position} of {total}</code>) and group-chip reorder / removal (<code>Grouping by {column} moved to position {position} of {total}</code>, <code>Grouping by {column} removed</code>).',
        },
        {
          name: 'messages.booleanTrueLabel / messages.booleanFalseLabel',
          type: 'string',
          description:
            'Screen-reader text of a default-rendered boolean cell (<code>Yes</code> / <code>No</code>). The visible <code>booleanTrue</code> / <code>booleanFalse</code> glyph (<code>✓</code> / <code>✗</code>, also the CSV text) is rendered <code>aria-hidden</code>; the label is rendered visually hidden beside it. Columns with a custom <code>format</code>, a lookup or a cell template render their own text. Localizing <code>booleanTrue</code> / <code>booleanFalse</code> to words? Set the labels too — they are announced, the glyph text is not.',
        },
        {
          name: 'messages.sortAscendingAnnouncement / messages.sortDescendingAnnouncement / messages.sortClearedAnnouncement / messages.rowCountAnnouncement / messages.rowCountOneAnnouncement / messages.pageAnnouncement / messages.groupExpandedAnnouncement / messages.groupCollapsedAnnouncement / messages.rowExpandedAnnouncement / messages.rowCollapsedAnnouncement / messages.selectionCountAnnouncement / messages.validationErrorAnnouncement',
          type: 'string',
          description:
            'Live-announcement patterns, <code>{placeholder}</code>-interpolated. Defaults: <code>Sorted by {column}, ascending</code> / <code>descending</code>, <code>Sort cleared</code>, <code>{count} rows</code> / <code>{count} row</code>, <code>Page {n} of {total}</code>, <code>Group {value} expanded</code> / <code>collapsed</code>, <code>{value} expanded</code> / <code>collapsed</code> (tree list), <code>{count} rows selected</code> and <code>{column}: {error}</code> (spoken assertively when a save is blocked by an invalid editor).',
        },
      ],
    },
    {
      title: 'Ranges, formats, spans & drag',
      entries: [
        {
          name: 'OgeGridCellRange / OgeGridCellCoord',
          type: 'interfaces',
          description:
            '<code>{ anchor, focus }</code> of <code>{ row, col }</code> — flat row index and visible column index, the keyboard machine’s coordinates.',
        },
        {
          name: 'OgeRangeSelectionOptions',
          type: 'interface',
          description:
            '<code>{ copyHeaders?, fillHandle?, pasteAddsRows?, multipleRanges? }</code>.',
        },
        {
          name: 'OgeRangeSelectionChangedEvent',
          type: 'interface',
          description:
            '<code>{ ranges, rowCount, columnCount, cellCount }</code>.',
        },
        {
          name: 'OgeClassValue',
          type: 'type',
          description:
            'What class hooks return: <code>string | string[] | Record&lt;string, boolean&gt; | null</code>.',
        },
        {
          name: 'OgeGridColumnInfo',
          type: 'interface',
          description:
            '<code>{ field, caption, dataType, index }</code> — what <code>cellClass</code> / <code>cellSpan</code> learn about a column.',
        },
        {
          name: 'OgeConditionalFormat',
          type: 'type',
          description:
            'A rule or a data bar / colour scale / icon set (see <code>conditionalFormats</code>).',
        },
        {
          name: 'OgeGridCellSpan',
          type: 'interface',
          description: '<code>{ rowSpan?, colSpan? }</code>.',
        },
        {
          name: 'OgeRowPreparedEvent / OgeCellPreparedEvent',
          type: 'interfaces',
          description:
            'Payloads of <code>rowPrepared</code> / <code>cellPrepared</code>.',
        },
        {
          name: 'OgeRowDragStartEvent / OgeRowDragOverEvent / OgeRowDropEvent / OgeRowDragEndEvent / OgeRowDropPosition',
          type: 'interfaces',
          description:
            "Cross-component row drag payloads; <code>position</code> is <code>'before' | 'after' | 'inside'</code>.",
        },
        {
          name: 'OgeHeaderFilterMode',
          type: 'type',
          description:
            "<code>headerFilter.mode</code>: <code>'list'</code> (default) the value checklist, <code>'conditions'</code> two operator + value conditions joined by And / Or, <code>'both'</code> the Excel-style menu (conditions above the list). Date columns list their values as a year → month → day tree.",
        },
        {
          name: 'OgePagerInfoContext',
          type: 'interface',
          description:
            'What <code>renderPagerInfo</code> / <code>&lt;OgePager renderInfo&gt;</code> receive: <code>{ pageIndex, pageCount, totalCount, pageSize, firstRow, lastRow, text }</code>. <code>paging.showFirstLastButtons</code> / <code>paging.showPageInput</code> (and the pager’s <code>showFirstLast</code> / <code>showPageInput</code>) add first/last buttons and a go-to-page input.',
        },
        {
          name: 'messages.rangeSelectedAnnouncement / messages.cellsPastedAnnouncement / messages.cellsFilledAnnouncement / messages.undoAnnouncement / messages.redoAnnouncement / messages.fillHandle / messages.validationPending / messages.autoFitColumn',
          type: 'string',
          description:
            'Range, paste, fill and undo announcements (<code>{rows} by {columns} cells selected</code>, <code>{count} cells pasted</code>…), the fill handle’s tooltip, the busy editor’s status text and the “Size to fit” header-menu item.',
        },
        {
          name: 'messages.filterByCondition / messages.filterByValues / messages.firstCondition / messages.secondCondition / messages.firstPage / messages.lastPage / messages.goToPage / messages.pageOfCount / messages.groupWeekPattern / messages.groupQuarterPattern / messages.groupRangePattern',
          type: 'string',
          description:
            'Header filter menu sections and condition names, pager first/last/go-to-page labels (<code>of {count}</code>) and the interval group captions (<code>Week of {date}</code>, <code>Q{quarter} {year}</code>, <code>{from} – {to}</code>).',
        },
      ],
    },
  ],
};
