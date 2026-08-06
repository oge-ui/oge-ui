import type { ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/tree-list/src/lib/** — keep in sync with the
 * source TSDoc. Column definitions, templates and grid-shared options are
 * documented on the Data Grid API page; this page focuses on the tree surface.
 */

export const OGE_TREE_LIST_API: ApiSections = {
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
            'Row key: field path or selector (grid uses <code>keyField</code>).',
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
          type: 'string | ((row: T) =&gt; readonly T[] | undefined) | undefined',
          description:
            'Nested payloads: rows carry children inline (plain arrays only; <code>parentIdExpr</code> ignored).',
        },
        {
          name: 'hasItemsExpr',
          type: 'string | ((row: T) =&gt; boolean) | undefined',
          description: 'Expandability hint for lazily loaded children.',
        },
        {
          name: 'loadMode',
          type: "'full' | 'lazy' | undefined",
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
          name: 'expandedRowKeys',
          type: 'model&lt;readonly RowKey[]&gt;',
          default: '[]',
          description: 'Two-way binding of the expanded row keys.',
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
          type: 'model&lt;RowKey | null&gt;',
          default: 'null',
          description: "Two-way binding of the focused row's key.",
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
          type: 'SelectionMode',
          default: "'none'",
          description: 'none | single | multiple | checkbox.',
        },
        {
          name: 'selectedKeys',
          type: 'model&lt;RowKey[]&gt;',
          default: '[]',
          description: 'Two-way binding of the selected row keys.',
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
          name: 'filterValue',
          type: 'model&lt;FilterExpr | null&gt;',
          default: 'null',
          description: 'Two-way filter expression (builder).',
        },
        {
          name: 'filterDebounce',
          type: 'number | undefined',
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
          type: 'readonly (string | ColumnDefLike)[] | undefined',
          description:
            'Programmatic columns (or declarative <code>&lt;oge-column&gt;</code>).',
        },
        {
          name: 'virtualScroll / columnRenderingMode / rowHeight / overscan / columnMinWidth',
          type: 'various',
          description:
            'Virtualization knobs; <code>columnRenderingMode</code> is a top-level input here.',
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
          description: 'cell/row/batch/form/popup via the shared EditingModel.',
        },
        {
          name: 'commandButtons / rowDragging / rowAlternation / wordWrap / loadPanel / rtlEnabled / messages / stateKey',
          type: 'various',
          description: 'Same semantics as the grid.',
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
            'Per-row expansion (imperative API bypasses the cancelable events).',
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
            'New unsaved row; parent pre-staged with a string <code>parentIdExpr</code>; <code>initNewRow</code> can prefill.',
        },
        {
          name: 'editRow(key) / deleteRow(key) / saveChanges() / discardChanges() / hasChanges()',
          type: 'void / boolean',
          description: 'Same semantics as the grid.',
        },
        {
          name: 'pageIndex / setPageIndex(i) / pageSize() / setPageSize(n) / pageCount() / totalCount()',
          type: 'signal / methods',
          description:
            '<code>pageIndex</code> is a writable signal; <code>totalCount()</code> spans all pages.',
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
            '<strong>Synchronous</strong> (grid: async); CSV indents the first column 2 spaces per level; Excel entry sets real outline levels.',
        },
      ],
    },
  ],
  events: [
    {
      title: 'Tree-specific',
      entries: [
        {
          name: 'rowExpanding / rowCollapsing',
          type: 'OgeTreeRowTogglingEvent&lt;T&gt;',
          description:
            'Cancelable — UI-driven toggles only (the imperative API stays silent).',
        },
        {
          name: 'rowExpanded / rowCollapsed',
          type: 'OgeTreeRowToggleEvent&lt;T&gt;',
          description: '<code>{ key, row }</code> after a toggle.',
        },
        {
          name: 'rowReparented',
          type: 'OgeTreeRowReparentEvent&lt;T&gt;',
          description:
            "Drag &amp; drop: <code>{ key, row, fromParentKey, toParentKey, position: 'inside' | 'before' | 'after' }</code>.",
        },
        {
          name: 'initNewRow',
          type: 'OgeTreeInitNewRowEvent',
          description: '<code>{ key, parentKey, values }</code> prefill hook.',
        },
      ],
    },
    {
      title: 'Shared with the grid',
      entries: [
        {
          name: 'rowClick / rowDblClick / cellClick / cellDblClick',
          type: 'OgeRowClickEvent / OgeCellClickEvent',
          description: 'Flat payloads with the originating DOM event.',
        },
        {
          name: 'rowContextMenu / headerContextMenu',
          type: 'context-menu events',
          description: 'Mutable <code>items</code>.',
        },
        {
          name: 'selectionChanged / focusedRowChanged',
          type: 'diff / focus events',
          description: 'Same payloads as the grid.',
        },
        {
          name: 'editingStart / rowInserting‑ed / rowUpdating‑ed / rowRemoving‑ed / savingChanges / savedChanges / editCanceled',
          type: 'editing lifecycle',
          description:
            'Same shared EditingModel pipeline as the grid; <code>-ing</code> events cancelable.',
        },
        {
          name: 'exporting / dataErrorOccurred / contentReady / stateChange',
          type: 'misc',
          description:
            'Same semantics as the grid (<code>stateChange</code> carries a <code>TreeListStateSnapshot</code>).',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
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
          name: 'exportOgeTreeListToExcel(treeList, options?)',
          type: '@oge-ui/tree-list/export-excel',
          description: 'Lazy Excel export with native outline grouping.',
        },
        {
          name: 'Re-exports',
          type: 'from @oge-ui/grid',
          description:
            '<code>OgeColumn</code>, templates, config/messages and the shared event payload types are re-exported so tree-only consumers have a single import source.',
        },
      ],
    },
  ],
};
