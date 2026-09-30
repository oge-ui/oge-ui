// Hand-compiled from packages/react/tree-list/src/lib/** — keep in sync with
// the source TSDoc.
//
// Mirrors `pages/tree-list/tree-list-api-data.ts` group for group, so the two
// views read as one page across the switch. What differs is the idiom —
// controlled props with `on…Change` callbacks instead of `model()`,
// `on`-prefixed callbacks instead of outputs, a `ref` handle instead of public
// methods, render props / slot props instead of structural directives and
// content projection.
import type { ApiSections } from '../../shared/api-reference';

export const OGE_REACT_TREE_LIST_API: ApiSections = {
  properties: [
    {
      title: 'Tree data',
      entries: [
        {
          name: 'data',
          type: 'readonly T[] | DataSource&lt;T&gt;',
          default: '[]',
          description:
            'Flat self-referencing rows: a static array or any DataSource.',
        },
        {
          name: 'keyExpr',
          type: 'string | ((row: T) =&gt; RowKey)',
          default: "'id'",
          description:
            'Row key: field path or selector (the grid uses <code>keyField</code>).',
        },
        {
          name: 'parentIdExpr',
          type: 'string | ((row: T) =&gt; unknown)',
          default: "'parentId'",
          description: 'Parent reference: field path or selector.',
        },
        {
          name: 'rootValue',
          type: 'unknown',
          default: 'null',
          description: 'Parent value marking root rows.',
        },
        {
          name: 'orphanPolicy',
          type: "'discard' | 'promoteToRoot'",
          default: "'discard'",
          description:
            'Rows whose parent key is missing: drop or render as roots.',
        },
        {
          name: 'itemsExpr',
          type: 'string | ((row: T) =&gt; readonly T[] | undefined)',
          description:
            'Nested payloads: rows carry children inline (plain arrays only; <code>parentIdExpr</code> ignored).',
        },
        {
          name: 'hasItemsExpr',
          type: 'string | ((row: T) =&gt; boolean)',
          description: 'Expandability hint for lazily loaded children.',
        },
        {
          name: 'loadMode',
          type: "'full' | 'lazy'",
          description:
            "<code>'lazy'</code> fetches children per expansion (<code>filter: [parentIdExpr,'=',key]</code>); defaults to lazy with DataSource + <code>hasItemsExpr</code>.",
        },
      ],
    },
    {
      title: 'Expansion & focus',
      entries: [
        {
          name: 'autoExpandAll',
          type: 'boolean',
          default: 'false',
          description:
            'Expands every row initially; the toggled-set polarity follows.',
        },
        {
          name: 'expandedRowKeys / defaultExpandedRowKeys',
          type: 'readonly RowKey[]',
          default: 'undefined',
          description:
            'The expanded row keys — controlled with <code>onExpandedRowKeysChange</code>, or seeded once with <code>defaultExpandedRowKeys</code>.',
        },
        {
          name: 'expandNodesOnFiltering',
          type: 'boolean',
          default: 'true',
          description:
            'Auto-expands ancestor chains of matches while a filter is active.',
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
            "The focused row's key — controlled when provided, with <code>onFocusedRowKeyChange</code>.",
        },
        {
          name: 'autoNavigateToFocusedRow',
          type: 'boolean',
          default: 'false',
          description:
            'A <code>focusedRowKey</code> change expands its ancestor path and scrolls (tree-only).',
        },
      ],
    },
    {
      title: 'Selection',
      entries: [
        {
          name: 'selectionMode',
          type: 'OgeGridSelectionMode',
          default: "'none'",
          description: 'none | single | multiple | checkbox.',
        },
        {
          name: 'selectedKeys / defaultSelectedKeys',
          type: 'readonly RowKey[]',
          default: 'undefined',
          description:
            'The selected row keys — controlled with <code>onSelectedKeysChange</code>, or seeded once with <code>defaultSelectedKeys</code>.',
        },
        {
          name: 'selectionRecursive',
          type: 'boolean',
          default: 'false',
          description: 'Tri-state cascade to descendants and ancestors.',
        },
        {
          name: 'allowSelectAll',
          type: 'boolean',
          default: 'true',
          description: 'Hides the header select-all checkbox when false.',
        },
      ],
    },
    {
      title: 'Filtering & paging',
      entries: [
        {
          name: 'filterRow / headerFilter / searchPanel / filterPanel',
          type: 'boolean | options',
          default: 'false',
          description:
            'Same options objects as the grid — all client-side over the loaded rows.',
        },
        {
          name: 'filterMode',
          type: 'TreeFilterMode',
          default: "'withAncestors'",
          description:
            "Matches keep their ancestors; <code>'fullBranch'</code> also keeps all descendants.",
        },
        {
          name: 'filterValue / defaultFilterValue',
          type: 'FilterExpr | null',
          default: 'undefined',
          description:
            'The filter expression (builder) — controlled with <code>onFilterValueChange</code>.',
        },
        {
          name: 'filterDebounce',
          type: 'number',
          description: 'Debounce for text filter inputs.',
        },
        {
          name: 'paging',
          type: 'false | OgePagingOptions',
          default: 'false',
          description:
            'Pages the visible (flattened) rows client-side; paging wins over <code>virtualScroll</code>.',
        },
        {
          name: 'sortable / sorting',
          type: "boolean | 'single' | 'multi' / OgeSortingOptions",
          default: 'true',
          description: 'Sibling-scoped, multi-column by default.',
        },
      ],
    },
    {
      title: 'Layout, editing & misc (grid-shared)',
      entries: [
        {
          name: 'columns',
          type: 'readonly (string | OgeGridColumnProps&lt;T&gt;)[]',
          description:
            'The columns — the React grid’s column props (<code>renderCell</code>, <code>renderHeader</code>, <code>renderEditor</code>, <code>bandCaption</code>, validators…), or a plain field name.',
        },
        {
          name: 'virtualScroll / columnRenderingMode / rowHeight / overscan / columnMinWidth',
          type: 'various',
          description:
            'Virtualization knobs; <code>columnRenderingMode</code> is a top-level prop here.',
        },
        {
          name: 'columnResize / columnReorder / columnChooser',
          type: 'boolean',
          description: 'Column UX (defaults: true/true/false).',
        },
        {
          name: 'editing',
          type: 'false | OgeEditingOptions',
          default: 'false',
          description: 'cell/row/batch/form/popup via the shared editing core.',
        },
        {
          name: 'commandButtons / rowDragging / rowAlternation / wordWrap / loadPanel / rtlEnabled / messages / stateKey',
          type: 'various',
          description: 'Same semantics as the grid.',
        },
        {
          name: 'stateStorage',
          type: 'OgeStateStorage',
          default: 'undefined',
          description:
            'Per-tree storage backend for <code>stateKey</code>; overrides <code>&lt;OgeGridStateStorageProvider&gt;</code>.',
        },
        {
          name: 'renderNoData',
          type: '(context: OgeGridNoDataContext) =&gt; ReactNode',
          description:
            'Renders the empty state — the React form of <code>*ogeNoDataTemplate</code>.',
        },
        {
          name: 'toolbarBefore',
          type: 'ReactNode',
          description:
            'Your own toolbar content at the start edge, ahead of the built-in tools — the React form of projected <code>[ogeToolbar]</code> items.',
        },
        {
          name: 'className / style / ariaLabel',
          type: 'string / CSSProperties / string',
          description: 'Host styling and the accessible name of the treegrid.',
        },
      ],
    },
  ],
  methods: [
    {
      title: 'Tree navigation & data',
      entries: [
        {
          name: 'expandAll() / collapseAll()',
          type: 'void',
          description: 'Polarity-aware over the expandable keys.',
        },
        {
          name: 'expandRow(key) / collapseRow(key) / isRowExpanded(key)',
          type: 'void / boolean',
          description:
            'Per-row expansion (the handle bypasses the cancelable callbacks).',
        },
        {
          name: 'focusRow(key) / navigateToRow(key)',
          type: 'void',
          description:
            'Expands the ancestor path, scrolls to the row and focuses its first cell.',
        },
        {
          name: 'scrollToRow(target: number | RowKey)',
          type: 'void',
          description: 'Scrolls a visible row into the viewport.',
        },
        {
          name: 'getNodeByKey(key): T | undefined',
          type: 'T | undefined',
          description: 'The loaded row carrying <code>key</code>.',
        },
        {
          name: 'forEachNode(callback)',
          type: 'void',
          description:
            'Runs the callback for every loaded row with <code>(row, key, parentKey)</code>.',
        },
        {
          name: 'getVisibleRows(): readonly T[]',
          type: 'readonly T[]',
          description: 'Data rows of the rendered page, in display order.',
        },
        {
          name: 'refresh(): void',
          type: 'void',
          description: 'Re-runs the load and drops lazily fetched rows.',
        },
      ],
    },
    {
      title: 'Selection',
      entries: [
        {
          name: "getSelectedRowKeys(mode = 'all')",
          type: 'RowKey[]',
          description:
            "<code>'all' | 'leavesOnly' | 'excludeRecursive'</code> narrows recursive selections.",
        },
        {
          name: "getSelectedRowsData(mode = 'all')",
          type: 'T[]',
          description: 'Row data per the same modes.',
        },
        {
          name: 'selectAll() / deselectAll() / clearSelection() / isRowSelected(key)',
          type: 'void / boolean',
          description: 'Recursive mode cascades select-all to descendants.',
        },
        {
          name: 'copyToClipboard(): Promise&lt;void&gt;',
          type: 'Promise&lt;void&gt;',
          description: 'Selected rows as tab-separated values (with header).',
        },
      ],
    },
    {
      title: 'Editing, paging, state & export',
      entries: [
        {
          name: 'addRow(parentKey?)',
          type: 'void',
          description:
            'New unsaved row; parent pre-staged with a string <code>parentIdExpr</code>; <code>onInitNewRow</code> can prefill.',
        },
        {
          name: 'editRow(key) / deleteRow(key) / saveChanges() / discardChanges() / hasChanges()',
          type: 'void / boolean',
          description: 'Same semantics as the grid.',
        },
        {
          name: 'pageIndex() / setPageIndex(i) / pageSize() / setPageSize(n) / pageCount() / totalCount()',
          type: 'methods',
          description:
            '<code>pageIndex()</code> reads the page Angular exposes as a writable signal; <code>totalCount()</code> spans all pages.',
        },
        {
          name: 'beginCustomLoading(message?) / endCustomLoading()',
          type: 'void',
          description: 'Load panel independent of data activity.',
        },
        {
          name: 'state() / applyState(snapshot)',
          type: 'TreeListStateSnapshot / void',
          description: 'Sort, filters, column layout and expansion.',
        },
        {
          name: 'clearFilters() / clearSorting()',
          type: 'void',
          description: 'Reset the view.',
        },
        {
          name: 'getExportData() / getCsv() / exportCsv()',
          type: 'sync',
          description:
            '<strong>Synchronous</strong> (grid: async); CSV indents the first column 2 spaces per level; the Excel entry sets real outline levels. ' +
            'Cells a spreadsheet would evaluate as a formula are apostrophe-prefixed (CSV formula injection); <code>formulaGuard: false</code> opts out.',
        },
      ],
    },
  ],
  events: [
    {
      title: 'Tree-specific',
      entries: [
        {
          name: 'onRowExpanding / onRowCollapsing',
          type: '(event: OgeTreeRowTogglingEvent&lt;T&gt;) =&gt; void',
          description:
            'Cancelable — UI-driven toggles only (the handle stays silent).',
        },
        {
          name: 'onRowExpanded / onRowCollapsed',
          type: '(event: OgeTreeRowToggleEvent&lt;T&gt;) =&gt; void',
          description: '<code>{ key, row }</code> after a toggle.',
        },
        {
          name: 'onRowReparented',
          type: '(event: OgeTreeRowReparentEvent&lt;T&gt;) =&gt; void',
          description:
            "Drag &amp; drop: <code>{ key, row, fromParentKey, toParentKey, position: 'inside' | 'before' | 'after' }</code>.",
        },
        {
          name: 'onInitNewRow',
          type: '(event: OgeTreeInitNewRowEvent) =&gt; void',
          description: '<code>{ key, parentKey, values }</code> prefill hook.',
        },
      ],
    },
    {
      title: 'Shared with the grid',
      entries: [
        {
          name: 'onRowClick / onRowDblClick / onCellClick / onCellDblClick',
          type: 'OgeRowClickEvent / OgeCellClickEvent',
          description: 'Flat payloads with the originating React event.',
        },
        {
          name: 'onRowContextMenu / onHeaderContextMenu',
          type: 'context-menu callbacks',
          description:
            'Mutable <code>items</code>; also opened by the Menu key / Shift+F10 on a focused cell or header (<code>source: &#39;keyboard&#39;</code>, anchored at the cell).',
        },
        {
          name: 'onSelectionChanged / onFocusedRowChanged',
          type: 'diff / focus callbacks',
          description: 'Same payloads as the grid.',
        },
        {
          name: 'onEditingStart / onRowInserting / onRowInserted / onRowUpdating / onRowUpdated / onRowRemoving / onRowRemoved / onSavingChanges / onSavedChanges / onEditCanceled',
          type: 'editing lifecycle',
          description:
            'Same shared editing pipeline as the grid; <code>-ing</code> callbacks are cancelable.',
        },
        {
          name: 'onExpandedRowKeysChange / onSelectedKeysChange / onFocusedRowKeyChange / onFilterValueChange',
          type: 'controlled-value callbacks',
          description:
            'The change halves of the controlled <code>expandedRowKeys</code>, <code>selectedKeys</code>, <code>focusedRowKey</code> and <code>filterValue</code> props.',
        },
        {
          name: 'onExporting / onDataErrorOccurred / onContentReady / onStateChange',
          type: 'misc',
          description:
            'Same semantics as the grid (<code>onStateChange</code> receives a <code>TreeListStateSnapshot</code>).',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeTreeListHandle&lt;T&gt;',
          type: 'ref handle',
          description:
            'The methods above, reached through <code>useRef&lt;OgeTreeListHandle&lt;T&gt;&gt;()</code>.',
        },
        {
          name: 'OgeTreeListProps&lt;T&gt;',
          type: 'props',
          description: 'Every prop and callback of this page.',
        },
        {
          name: 'OgeTreeContextMenuEvent&lt;T&gt; / OgeTreeHeaderContextMenuEvent',
          type: 'context-menu payloads',
          description:
            'Row / header menu payloads: <code>items</code> to push into, <code>source</code>, the originating <code>event</code>.',
        },
        {
          name: 'OgeTreeDropPosition',
          type: "'inside' | 'before' | 'after'",
          description: 'Reparent vs sibling ordering.',
        },
        {
          name: 'OgeTreeExportData&lt;T&gt;',
          type: 'OgeExportData&lt;T&gt; &amp; { levels: readonly number[] }',
          description:
            'Zero-based depth per exported row (drives spreadsheet outline levels).',
        },
        {
          name: 'TreeFilterMode',
          type: "'withAncestors' | 'fullBranch'",
          description: 'Visible set under a filter.',
        },
        {
          name: 'exportOgeTreeListToExcel(handle, options?)',
          type: '@oge-ui/react-tree-list/export-excel',
          description:
            'Lazy Excel export with native outline grouping (optional <code>exceljs</code> peer).',
        },
        {
          name: 'Re-exports',
          type: 'from @oge-ui/react-grid',
          description:
            '<code>OgeGridColumnProps</code>, the render-prop contexts, <code>&lt;OgeGridConfigProvider&gt;</code> / <code>&lt;OgeGridStateStorageProvider&gt;</code> and the shared event payload types are re-exported so tree-only consumers have a single import source.',
        },
      ],
    },
  ],
};
