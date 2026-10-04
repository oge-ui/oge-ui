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
          type: 'readonly (string | OgeColumnDef&lt;T&gt;)[] | undefined',
          description:
            'Programmatic columns: field names or <code>OgeColumnDef</code> objects carrying every <code>&lt;oge-column&gt;</code> option (templates as <code>TemplateRef</code>s). The way to share columns through a wrapper component — Angular content queries never see columns projected through another component. Used only when no declarative children exist; when both are absent, columns derive from the first row.',
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
        {
          name: 'announcements',
          type: 'boolean | undefined',
          default: 'config.announcements (true)',
          description:
            'Speaks sort, filter/search result count (debounced, once the new result arrived), page, group expansion, select-all and blocked-save validation changes through the shared <code>OgeLiveAnnouncer</code> regions — texts from the <code>*Announcement</code> messages. <code>false</code> opts out.',
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
          description:
            'Drop area for drag-and-drop row grouping. Keyboard: the header context menu (<kbd>Shift+F10</kbd>) offers <code>groupByColumn</code> / <code>ungroupColumn</code>; on a chip’s remove button <kbd>Ctrl+←/→</kbd> reorders the grouping and <kbd>Delete</kbd> removes it (<code>messages.groupMoved</code> / <code>groupRemoved</code>).',
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
            '<code>autoExpandAll: false</code> starts collapsed and enables deferred child loading; <code>contextMenuEnabled: true</code> offers group/ungroup in the header menu without the group panel.',
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
            "Row selection: none | single | multiple (ctrl/shift) | checkbox column — or <code>'cell'</code>: rectangular cell ranges (click, Shift+click, drag, Shift+Arrow, Ctrl+click for more ranges, Ctrl+A for all) with TSV copy / paste, the fill handle and range announcements; editing then starts on double-click, F2 or Enter.",
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
            "Enables editing: <code>{ mode: 'cell' | 'row' | 'batch' | 'popup' | 'form', allow… }</code>. An invalid cell editor sets <code>aria-invalid</code> on its control and points <code>aria-errormessage</code> / <code>aria-describedby</code> at a rendered, visually hidden error text (also the cell’s tooltip); the <code>form</code>/<code>popup</code> fields wire the same through <code>&lt;oge-form&gt;</code>.",
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
            'Drag-handle column for reordering rows. Arrays mutate in place; DataSources handle <code>rowReordered</code>. Keyboard: <kbd>Ctrl+↑/↓</kbd> on a focused cell moves the row onto its neighbour through the same drop path (same event), announced via <code>messages.rowMoved</code>.',
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
          description:
            'Column visibility chooser button. Keyboard: <kbd>Space</kbd> toggles an item; with <code>columnReorder</code>, <kbd>Ctrl+↑/↓</kbd> moves it. Hiding is also in the header context menu.',
        },
        {
          name: 'columnResize',
          type: 'boolean',
          default: 'true',
          description:
            'Drag-resize handles on header edges. Keyboard: <kbd>Alt+←/→</kbd> on a focused header resizes by 10px (<kbd>Shift</kbd> for 1px); the handle is a focusable <code>role="separator"</code> (<code>aria-valuenow/min/max</code> = width in px, named by <code>messages.resizeColumn</code>) taking <kbd>←/→</kbd>, <kbd>Home</kbd>/<kbd>End</kbd> (min / max) and <kbd>Enter</kbd>/<kbd>Esc</kbd> (back to the header). RTL-aware; clamped to <code>minWidth</code> / <code>maxWidth</code>.',
        },
        {
          name: 'columnReorder',
          type: 'boolean',
          default: 'true',
          description:
            'Drag-and-drop column reordering. Keyboard: <kbd>Ctrl+Shift+←/→</kbd> on a focused header moves the column one step, never across a pinned group or out of its band (an unbanded column steps over a band as a whole), announced via <code>messages.columnMoved</code>.',
        },
        {
          name: 'columnMinWidth',
          type: 'number | undefined',
          description: 'Track minimum for columns without an explicit width.',
        },
        {
          name: 'columnHidingMode',
          type: "'hide' | 'detail' | undefined",
          default: "config: 'detail'",
          description:
            "What happens to columns responsive hiding (<code>hidingPriority</code>) takes out on a narrow grid: <code>'detail'</code> gives every row a toggle (a real button with <code>aria-expanded</code> / <code>aria-controls</code>, labelled by <code>toggleAdaptiveDetail</code>) that reveals the hidden columns' caption / value pairs on a second line of the row, rendered like the cells — format, lookups, boolean words and cell templates; <code>'hide'</code> drops them with no way back. The hiding pass counts the toggle's 32px track once a column is hidden.",
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
    {
      title: 'Cells, ranges & clipboard',
      entries: [
        {
          name: 'rangeSelection',
          type: 'OgeRangeSelectionOptions | undefined',
          description:
            '<code>{ copyHeaders, fillHandle, pasteAddsRows, multipleRanges }</code>: Ctrl+C prepends the captions; the fill handle (on by default while editing) can be turned off; pasted lines past the last row become new rows; Ctrl+click may add ranges (default true).',
        },
        {
          name: 'selectedRanges',
          type: 'model&lt;readonly OgeGridCellRange[]&gt;',
          default: '[]',
          description:
            'Two-way binding of the selected ranges (<code>{ anchor, focus }</code> in flat-row / visible-column coordinates). A sort, filter, page or grouping change clears them.',
        },
        {
          name: 'pinnedTopRows',
          type: 'readonly (T | RowKey)[] | undefined',
          description:
            'Rows pinned in a sticky section under the header: data objects, or keys of loaded rows (which then leave the body). Display rows — not editable, selectable or part of arrow-key navigation; virtual scrolling compatible.',
        },
        {
          name: 'pinnedBottomRows',
          type: 'readonly (T | RowKey)[] | undefined',
          description: 'Rows pinned in the sticky footer, above the total row.',
        },
        {
          name: 'stickyGroupRows',
          type: 'boolean',
          default: 'false',
          description:
            'Keeps the group rows enclosing the first visible row under the header while scrolling (all levels, virtual scrolling included). A visual aid: the real group rows stay focusable; a click on a sticky row scrolls to it.',
        },
        {
          name: 'cellSpan',
          type: '((row: T, column: OgeGridColumnInfo) =&gt; OgeGridCellSpan | null | undefined) | undefined',
          description:
            'Row / column spans per cell (<code>{ rowSpan, colSpan }</code>). Spans never cross group rows; the owner cell gets <code>aria-rowspan</code> / <code>aria-colspan</code> and the arrows step over the covered area. Ignored while virtualized; row spans assume uniform row heights.',
        },
        {
          name: 'columnAutoWidth',
          type: 'boolean',
          default: 'false',
          description:
            'Sizes every column to its header and rendered cells once the first result set rendered.',
        },
        {
          name: 'cellHintEnabled',
          type: 'boolean',
          default: 'false',
          description:
            'Shows truncated cell text in the overlay tooltip on hover and immediately on keyboard focus (<code>aria-describedby</code> while shown).',
        },
      ],
    },
    {
      title: 'Styling & drag groups',
      entries: [
        {
          name: 'rowClass',
          type: '((row: T, key: RowKey) =&gt; OgeClassValue) | undefined',
          description:
            'Classes for a data row — a string, an array or a <code>{ class: condition }</code> record.',
        },
        {
          name: 'cellClass',
          type: '((row: T, column: OgeGridColumnInfo) =&gt; OgeClassValue) | undefined',
          description:
            'Classes for a data cell, per row and column (<code>{ field, caption, dataType, index }</code>).',
        },
        {
          name: 'rowDragGroup',
          type: 'string | undefined',
          description:
            'Grids (and other components) sharing a group name accept each other’s dragged rows; the target fires <code>rowDrop</code> with the source row — move the data in the handler. The source needs <code>rowDragging</code>.',
        },
        {
          name: 'allowDropInsideRow',
          type: 'boolean',
          default: 'false',
          description:
            "A drop on the middle half of a row reports <code>position: 'inside'</code> (and moves nothing by itself) instead of before / after.",
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
      title: 'Columns & summaries',
      entries: [
        {
          name: 'showColumnChooser(anchor?) / hideColumnChooser()',
          type: 'void',
          description:
            "Opens the column chooser below <code>anchor</code> (e.g. a button in your own header bar, with <code>columnChooser</code> off so no toolbar row is drawn), else below its toolbar button or the grid's start edge / closes it.",
        },
        {
          name: 'getTotalSummaryValue(field, type?)',
          type: 'unknown',
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
          type: 'void',
          description:
            'Shows/hides the load panel with an optional message — independent of data activity.',
        },
        {
          name: 'state(): GridStateSnapshot / applyState(snapshot)',
          type: 'GridStateSnapshot / void',
          description:
            'Captures / applies the persistable UI state. <code>applyState</code> validates the snapshot first (<code>sanitize*StateSnapshot</code>): unknown keys are dropped, prototype keys rejected, wrong types skipped — invalid input is ignored, never thrown.',
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
            "Rows, column metadata (width, alignment, pin side, band) and the structured lines — group rows, group footers, the total row (<code>items</code>) — of the current view. <code>scope: 'all' | 'page' | 'selection'</code> (or <code>selectedRowsOnly</code>), <code>visibleColumnsOnly: false</code> adds hidden columns, <code>groups</code> / <code>summaries: false</code> export flat.",
        },
        {
          name: 'getCsv(options?): Promise&lt;string&gt;',
          type: 'Promise&lt;string&gt;',
          description:
            'CSV of the current view. Cells a spreadsheet would evaluate as a formula (first non-whitespace character <code>=</code>, <code>+</code>, <code>-</code>, <code>@</code> or a full-width <code>＝ ＋ － ＠</code>, or a leading tab/CR) are prefixed with an apostrophe so the file cannot execute on open — CSV formula injection. Numbers are exempt, so a <code>-5</code> column stays numeric. Pass <code>formulaGuard: false</code> when the output is machine-read rather than opened in a spreadsheet.',
        },
        {
          name: "exportCsv(filename = 'grid.csv', options?): Promise&lt;void&gt;",
          type: 'Promise&lt;void&gt;',
          description:
            'Downloads the current view as CSV; fires the cancelable <code>exporting</code> event first. <code>options</code> are <code>getCsv()</code>’s (<code>scope</code>, <code>customizeCell</code>, <code>separator</code>…); formula-leading cells are always neutralized.',
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
            "Row right-click — and the Menu key / Shift+F10 in a focused cell; push into <code>items</code> to open the built-in menu. <code>source</code> is <code>'pointer'</code> or <code>'keyboard'</code> (then <code>clientX/Y</code> is the cell's start/bottom corner); <code>event</code> is the originating event.",
        },
        {
          name: 'headerContextMenu',
          type: 'OgeHeaderContextMenuEvent',
          description:
            'Prebuilt, mutable header menu items (sort/group/pin/hide); also opened by the Menu key / Shift+F10 on a focused header. Carries <code>source</code> and <code>event</code> like <code>rowContextMenu</code>.',
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
          name: 'focusedCellChanged',
          type: 'OgeFocusedCellChangedEvent&lt;T&gt;',
          description:
            '<code>{ rowIndex, columnIndex, key, row, field }</code> after keyboard/pointer focus moved to another cell; <code>key</code>/<code>row</code> are <code>undefined</code> on group rows.',
        },
        {
          name: 'sortChanged',
          type: 'OgeSortChangedEvent',
          description:
            '<code>{ sort, previousSort }</code> as soon as the sort changed (header, menu, API) — no debounce, unlike <code>stateChange</code>. The initial sort is not a change.',
        },
        {
          name: 'pageChanged',
          type: 'OgePageChangedEvent',
          description:
            '<code>{ pageIndex, pageSize, previousPageIndex, previousPageSize }</code> after the page index or size changed.',
        },
        {
          name: 'rowExpanding',
          type: 'OgeGridRowTogglingEvent&lt;T&gt;',
          description:
            'Before a group or master-detail row expands (pointer, keyboard or <code>expandRow()</code>); <code>{ key, kind, row, cancel }</code> — set <code>cancel</code> to veto. Not fired per row by <code>expandAllGroups()</code>.',
        },
        {
          name: 'rowExpanded',
          type: 'OgeGridRowToggleEvent&lt;T&gt;',
          description:
            "<code>{ key, kind: 'group' | 'detail', row }</code> after the row expanded.",
        },
        {
          name: 'rowCollapsing',
          type: 'OgeGridRowTogglingEvent&lt;T&gt;',
          description:
            'Before a group or master-detail row collapses; cancelable.',
        },
        {
          name: 'rowCollapsed',
          type: 'OgeGridRowToggleEvent&lt;T&gt;',
          description: 'After a group or master-detail row collapsed.',
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
    {
      title: 'Ranges, preparation & drag',
      entries: [
        {
          name: 'rangeSelectionChanged',
          type: 'OgeRangeSelectionChangedEvent',
          description:
            'The selected ranges changed: <code>{ ranges, rowCount, columnCount, cellCount }</code>.',
        },
        {
          name: 'rowPrepared',
          type: 'OgeRowPreparedEvent&lt;T&gt;',
          description:
            'A data row element rendered a row for the first time (scrolled in, re-keyed) — <code>{ row, key, rowIndex, element }</code>, the imperative escape hatch the declarative hooks cannot cover.',
        },
        {
          name: 'cellPrepared',
          type: 'OgeCellPreparedEvent&lt;T&gt;',
          description:
            'Every data cell of a prepared row: <code>{ row, key, field, value, rowIndex, columnIndex, element }</code>.',
        },
        {
          name: 'rowDragStart',
          type: 'OgeRowDragStartEvent&lt;T&gt;',
          description: 'Cancelable: a row drag is about to start.',
        },
        {
          name: 'rowDragOver',
          type: 'OgeRowDragOverEvent',
          description:
            'Cancelable, on the grid under the pointer: a dragged row of the group hovers it; set <code>cancel</code> to refuse the spot.',
        },
        {
          name: 'rowDrop',
          type: 'OgeRowDropEvent',
          description:
            'A row was dropped on this grid — its own (a reorder, which also fires <code>rowReordered</code>) or another component’s (<code>sameComponent: false</code>): <code>{ sourceComponentId, targetComponentId, sourceKey, sourceRow, targetKey, targetRow, position, toIndex }</code>.',
        },
        {
          name: 'rowDragEnd',
          type: 'OgeRowDragEndEvent&lt;T&gt;',
          description:
            'The source side of a drag ended: <code>{ key, row, dropped, targetComponentId }</code>.',
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
            "'string' | 'number' | 'date' | 'datetime' | 'boolean' — drives editors, filters and the default alignment. <code>'datetime'</code> keeps the time of day (date + time cells and editor; filters by calendar day).",
        },
        {
          name: 'alignment',
          type: 'OgeColumnAlignment | undefined',
          description:
            "<code>'start' | 'center' | 'end'</code> for cells, header and summaries (logical — <code>'end'</code> is the right edge in LTR). Unset, numbers align to the end and everything else to the start.",
        },
        {
          name: 'width / minWidth',
          type: 'number | string / number',
          description: 'Track size; <code>minWidth</code> guards resizing.',
        },
        {
          name: 'maxWidth',
          type: 'number | undefined',
          default: 'undefined',
          description:
            'Upper bound in px for user resizing — pointer drag and the <kbd>Alt+←/→</kbd> / separator keys; also the separator’s <code>aria-valuemax</code>.',
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
            'Adaptive hiding order when width runs out (higher survives longer); the hidden values stay reachable through the row toggle unless <code>columnHidingMode</code> is <code>&#39;hide&#39;</code>.',
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
          name: 'groupInterval',
          type: "'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year' | number | undefined",
          description:
            "Bucket when grouping by this column — calendar units for dates (<code>'day'</code> by default for <code>date</code> / <code>datetime</code>; <code>'week'</code> starts on the locale’s first day of week) or a positive width for numbers (<code>100</code> → 0–99, 100–199…). Captions read <code>Week of …</code>, <code>Q2 2026</code>, <code>100 – 200</code>. Sent as <code>LoadOptions.group[].interval</code>.",
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
    {
      title: 'Formatting, merging & async validation',
      entries: [
        {
          name: 'conditionalFormats',
          type: 'readonly OgeConditionalFormat&lt;T&gt;[] | undefined',
          description:
            "Declarative formats: rules <code>{ when: (value, row) =&gt; boolean | { operator, value }, class?, style?: { tone, background, bold } }</code>, <code>{ type: 'dataBar' }</code>, <code>{ type: 'colorScale', tones? }</code> and <code>{ type: 'iconSet', icons?, thresholds? }</code>. Token classes and CSS custom properties only — themes and forced colours keep working.",
        },
        {
          name: 'mergeCells',
          type: 'boolean',
          default: 'false',
          description:
            'Merges vertically adjacent equal values into one cell (<code>aria-rowspan</code>); not applied while virtualized.',
        },
        {
          name: 'asyncValidators',
          type: 'readonly AsyncValidatorFn[] | undefined',
          description:
            'Async Angular validators (a server uniqueness check): the editor is <code>aria-busy</code> while one runs, a commit waits for it, failures use the usual error wiring; pastes and fills run them too.',
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
          type: "marker directive — 'before' | 'center' | 'after'",
          description:
            'Projects custom controls into the grid toolbar. The static value picks the group: <code>ogeToolbar="before"</code> (start edge — filters, primary actions), <code>"center"</code>, or bare / <code>"after"</code> (next to the built-in tools).',
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
          name: 'ogeColumnFromDef(def)',
          type: '(def: OgeColumnDef&lt;T&gt;) =&gt; OgeColumn&lt;T&gt;',
          description:
            'What <code>[columns]</code> runs on: turns a column definition into the signal surface of an <code>&lt;oge-column&gt;</code>. For a custom grid-like component that accepts the same <code>OgeColumnDef</code>s.',
        },
        {
          name: 'OgeColumnDefCache',
          type: 'class { resolve(defs): OgeColumn&lt;T&gt;[] }',
          description:
            'Keeps one column — and its visibility — per definition object across change detection; field-name strings are cached by name.',
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
          type: '{ autoExpandAll?: boolean; contextMenuEnabled?: boolean }',
          description:
            '<code>autoExpandAll: false</code> starts collapsed and defers child loading; <code>contextMenuEnabled</code> puts group/ungroup in the header menu without the group panel.',
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
          type: '{ scope?; selectedRowsOnly?; visibleColumnsOnly?; groups?; summaries?; customizeCell?(args); cellStyle?(args) }',
          description:
            'Shared by CSV/Excel/PDF. <code>customizeCell</code> rewrites a data cell (return a value) and restyles it (mutate <code>style</code>); <code>cellStyle</code> is the value-level styling seam for every cell — header, group and summary lines included — so conditional formatting exports the same way it renders.',
        },
        {
          name: 'OgeExportData&lt;T&gt; / OgeExportColumn&lt;T&gt; / OgeExportCellArgs&lt;T&gt;',
          type: 'interfaces',
          description:
            'Rows + resolved column metadata handed to exporters; <code>items</code> carries the group / footer / total lines when the view is grouped or summarized.',
        },
        {
          name: 'OgeExportItem&lt;T&gt; / OgeExportSummaryCell / OgeExportRowKind',
          type: "{ kind: 'data' | 'group' | 'groupFooter' | 'total'; … }",
          description:
            'One exported line: a data row at its group depth, a group header (text, value, count, header summaries), a group footer or the total row with typed summary values.',
        },
        {
          name: 'OgeExportCellStyle / OgeExportCellStyleArgs&lt;T&gt;',
          type: '{ bold?, italic?, underline?, color?, background?, fontSize?, alignment?, verticalAlignment?, wrap?, border?, numFmt? }',
          description:
            'Cell style both file builders apply (colours as <code>#rrggbb</code>; <code>numFmt</code> is Excel-only).',
        },
        {
          name: 'exportGridToExcel(grid, options?)',
          type: '@oge-ui/grid/export-excel',
          description:
            'Lazy Excel export (exceljs peer): merged band headers, frozen header rows + left-pinned columns (<code>freezeHeader</code>, <code>freezeColumns</code>), grid or auto column widths (<code>columnWidths</code>), number/date formats (<code>numberFormat</code>, <code>dateFormat</code>, <code>dateTimeFormat</code>, <code>columnFormats</code>), group rows with collapsible outline levels (<code>outline</code>), group-footer and total rows as values or <code>SUBTOTAL</code> formulas (<code>summaryFormulas</code>), <code>headerStyle</code> / <code>groupStyle</code> / <code>summaryStyle</code>, auto-filter. <code>buildExcelWorkbook(data, options)</code> for custom pipelines.',
        },
        {
          name: 'exportGridToPdf(grid, options?)',
          type: '@oge-ui/grid/export-pdf',
          description:
            'Lazy PDF export (jspdf peer): the header block repeated on every page (<code>repeatHeader</code>), group and summary rows, grid widths fitted to the page (<code>fitToWidth</code>), <code>orientation</code>, <code>pageFormat</code>, <code>title</code>, <code>pageHeader</code> / <code>pageFooter</code> callbacks and <code>pageNumbers</code>. <code>buildPdfDocument(data, options)</code> for custom pipelines.',
        },
        {
          name: 'OgeExcelExportOptions&lt;T&gt; / OgePdfExportOptions&lt;T&gt; / OgePdfPageInfo',
          type: 'interfaces',
          description:
            'The two download helpers’ options (each extends <code>OgeExportOptions</code>) and what a PDF page callback is told (<code>pageNumber</code>, <code>pageCount</code>).',
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
          type: "{ rowHeight: 36; detailRowHeight: 200; filterDebounce: 300; overscan: 6; columnMinWidth: 120; pinnedDefaultWidth: 150; headerFilterValueLimit: 200; allowUnsorting: true; columnHidingMode: 'detail'; announcements: true; messages }",
          description: 'Defaults shown inline.',
        },
        {
          name: 'OgeGridMessages',
          type: '60+ string keys',
          description:
            'Every user-facing string, incl. aria labels, filter operators, summary patterns — see <code>OGE_DEFAULT_MESSAGES</code> in the source.',
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
          name: 'OgePagerInfoTemplate',
          type: 'directive',
          description:
            '<code>*ogePagerInfoTemplate="let info"</code> replaces the pager’s info text; <code>info</code> is <code>{ pageIndex, pageCount, totalCount, pageSize, firstRow, lastRow, text }</code>. <code>paging.showFirstLastButtons</code> / <code>paging.showPageInput</code> add first/last buttons and a go-to-page input.',
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
