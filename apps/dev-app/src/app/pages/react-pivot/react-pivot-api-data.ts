// Hand-compiled from packages/react/pivot/src/lib/** — keep in sync with the
// source TSDoc.
//
// Mirrors `pages/pivot-grid/pivot-grid-api-data.ts` group for group, so the
// two views read as one page across the switch. What differs is the idiom —
// `on`-prefixed callbacks instead of outputs, a `ref` handle instead of public
// methods, a `fields` array of plain objects instead of `<oge-pivot-field>`
// children, a context provider instead of a DI token.
import type { ApiSections } from '../../shared/api-reference';

export const OGE_REACT_PIVOT_GRID_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'data',
          type: 'readonly T[] | OgePivotStore&lt;T&gt;',
          default: '[]',
          description:
            'Local rows, or any <code>OgePivotStore</code> for remote (pre-aggregated) data.',
        },
        {
          name: 'fields',
          type: 'readonly OgePivotFieldDef&lt;T&gt;[]',
          default: '[]',
          description:
            'The declared fields — plain objects with the members and defaults of Angular’s <code>&lt;oge-pivot-field&gt;</code> (see <code>OgePivotFieldDef</code> below).',
        },
        {
          name: 'virtualScrolling',
          type: 'boolean',
          default: 'false',
          description: 'Two-axis fixed-track windowing.',
        },
        {
          name: 'showRowTotals / showColumnTotals',
          type: 'boolean',
          default: 'true',
          description: 'Sub-total lines per axis.',
        },
        {
          name: 'showRowGrandTotals / showColumnGrandTotals',
          type: 'boolean',
          default: 'true',
          description: 'Grand-total lines per axis.',
        },
        {
          name: 'fieldPanel',
          type: 'boolean',
          default: 'true',
          description:
            'Collapsible drag &amp; drop field panel. Chips move with a pointer drag (mouse, pen, touch after a ~300 ms long press); dropping on a chip inserts in front of it, Escape cancels.',
        },
        {
          name: 'fieldChooser',
          type: 'OgePivotFieldChooserOptions',
          default: '{}',
          description: 'Field-chooser dialog behavior.',
        },
        {
          name: 'customizeCell',
          type: '(cell: OgePivotCellPrepared) =&gt; void',
          description:
            'Appearance hook: mutate <code>text</code> / <code>cssClass</code> per cell (the reference <code>cellPrepared</code> equivalent).',
        },
        {
          name: 'calculatedFields',
          type: 'readonly OgePivotCalculatedField[]',
          default: '[]',
          description:
            'Measures computed from the other measures of each cell — <code>{ name, caption, expression: (values) =&gt; number | null, format, displayMode, runningTotal }</code>. Evaluated on every cell, subtotals and grand totals included, so a ratio stays a ratio of the totals. <code>displayMode</code> takes the measure display modes (percent of row / column / grand total, <code>absoluteVariation</code> = difference from the previous column, <code>percentVariation</code>); <code>runningTotal</code> accumulates along an axis. They follow the regular measures in cells, exports and chart data.',
        },
        {
          name: 'rowHeaderLayout',
          type: "'compact' | 'outline' | 'tabular'",
          default: "'compact'",
          description:
            '<code>compact</code> indents every level in one column; <code>outline</code> gives each row field its own label column (a label only in its field’s column); <code>tabular</code> repeats the ancestors on every line so each reads on its own. The row header stays one <code>rowheader</code> cell per line, so the keyboard model does not change; the corner shows the row field captions.',
        },
        {
          name: 'renderCell',
          type: '(cell: OgePivotCellTemplateContext) =&gt; ReactNode',
          description:
            'Custom content of each value cell (one call per measure) — the prepared cell (<code>text</code> after formats, display modes and <code>customizeCell</code>, <code>value</code>, paths, totals flags) plus <code>rowIndex</code> / <code>columnIndex</code> / <code>measureIndex</code>. Angular’s <code>*ogePivotCellTemplate</code>.',
        },
        {
          name: 'renderRowHeader',
          type: '(line: OgePivotAxisLine, context: { rowIndex; segments }) =&gt; ReactNode',
          description:
            'Custom row-header label; the expander and keyboard behaviour stay the grid’s. Angular’s <code>*ogePivotRowHeaderTemplate</code>.',
        },
        {
          name: 'renderColumnHeader',
          type: '(cell: OgePivotHeaderCell) =&gt; ReactNode',
          description:
            'Custom column-header content. Angular’s <code>*ogePivotColumnHeaderTemplate</code>.',
        },
        {
          name: 'stateKey',
          type: 'string | undefined',
          description:
            'Persists the field layout + expansion through the nearest <code>&lt;OgeGridStateStorageProvider&gt;</code> (localStorage without one).',
        },
        {
          name: 'stateStorage',
          type: 'OgeStateStorage | undefined',
          description:
            'Per-grid storage backend for <code>stateKey</code>; overrides the provider.',
        },
        {
          name: 'messages',
          type: 'Partial&lt;OgePivotMessages&gt;',
          default: '{}',
          description:
            'Per-instance overrides of the UI strings, over <code>&lt;OgePivotMessagesProvider&gt;</code>.',
        },
        {
          name: 'className / style',
          type: 'string / CSSProperties',
          description:
            'Host styling — e.g. a <code>maxHeight</code> in <code>style</code> bounds the scroll viewport.',
        },
      ],
    },
  ],
  methods: [
    {
      title: 'Handle (ref)',
      entries: [
        {
          name: 'getResult(): PivotResult',
          type: 'PivotResult',
          description:
            'The materialized pivot exactly as rendered — for custom export integrations.',
        },
        {
          name: 'getChartData(options?): OgePivotChartData',
          type: 'OgePivotChartData',
          description:
            'The current view as chart data — <code>{ dataSource, series }</code> for <code>&lt;oge-chart&gt;</code> / <code>&lt;OgeChart&gt;</code>: one argument per visible row line (the deepest expanded level), one series per column line × measure. Options: <code>argumentAxis</code>, <code>measures</code>, <code>includeTotals</code>, <code>includeGrandTotals</code>, <code>argumentIndexes</code> / <code>seriesIndexes</code> (a selection), <code>type</code>. The pivot does not depend on the charts package — the app binds the two.',
        },
        {
          name: 'getPreparedCell(rowIndex, columnIndex, measureIndex): OgePivotCellPrepared',
          type: 'OgePivotCellPrepared',
          description:
            'A value cell exactly as rendered: text after formats, display modes and <code>customizeCell</code>.',
        },
        {
          name: 'getRowFieldCaptions() / getRowHeaderLayout()',
          type: "readonly string[] / 'compact' | 'outline' | 'tabular'",
          description:
            'The row field captions in layout order and the effective row-header layout — what the PDF export writes its row header from.',
        },
        {
          name: 'drillDown(args: PivotDrillDownArgs): T[]',
          type: 'T[]',
          description: 'Raw rows behind a cell (local data only).',
        },
        {
          name: "expandAll(area: 'row' | 'column') / collapseAll(area)",
          type: 'void',
          description:
            'Axis-wide expansion; remote mode expands only what is loaded.',
        },
        {
          name: 'getFieldLayout(): readonly PivotFieldConfig[]',
          type: 'readonly PivotFieldConfig[]',
          description: 'Declared fields merged with user overrides.',
        },
        {
          name: 'showFieldChooser(): void',
          type: 'void',
          description: 'Opens the field-chooser dialog.',
        },
        {
          name: 'state() / applyState(snapshot)',
          type: 'PivotGridStateSnapshot / void',
          description:
            'Field layout + expansion snapshot. <code>applyState</code> validates the snapshot first (<code>sanitize*StateSnapshot</code>): unknown keys are dropped, prototype keys rejected, wrong types skipped — invalid input is ignored, never thrown.',
        },
        {
          name: 'getCsv(options?) / exportCsv(filename?)',
          type: 'string / void',
          description:
            'CSV of exactly what is on screen (multi-level headers flattened). Cells a spreadsheet would evaluate as a formula are apostrophe-prefixed (CSV formula injection); <code>formulaGuard: false</code> opts out.',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'onCellClick / onCellDblClick',
          type: '(event: OgePivotCellClickEvent) =&gt; void',
          description:
            '<code>{ rowPath, columnPath, measureIndex, value, event }</code>.',
        },
        {
          name: 'onFieldLayoutChange',
          type: '(fields: readonly PivotFieldConfig[]) =&gt; void',
          description: 'The field layout changed (drag, chooser, menus).',
        },
        {
          name: 'onResultChange',
          type: '(result: PivotResult) =&gt; void',
          description:
            'The materialized view changed (data, layout, expansion, filters, calculated fields) — the hook a linked chart re-reads <code>getChartData()</code> from.',
        },
        {
          name: 'onStateChange',
          type: '(snapshot: PivotGridStateSnapshot) =&gt; void',
          description: 'Debounced — the persistable state changed.',
        },
      ],
    },
  ],
  types: [
    {
      title: 'Cell & axis types',
      entries: [
        {
          name: 'OgePivotCellPrepared',
          type: '{ rowPath, columnPath, measureId, isTotal, isGrandTotal, value; mutable text, cssClass? }',
          description: 'Args of the <code>customizeCell</code> hook.',
        },
        {
          name: 'OgePivotCellClickEvent',
          type: '{ rowPath, columnPath, measureIndex, value, event: MouseEvent }',
          description:
            'Payload of <code>onCellClick</code> / <code>onCellDblClick</code>.',
        },
        {
          name: 'OgePivotAxisLine',
          type: '{ text, path, level, expanded, hasChildren, isTotal, isGrandTotal }',
          description: 'One visible axis line, in matrix order.',
        },
        {
          name: 'OgePivotHeaderCell',
          type: 'OgePivotAxisLine &amp; { rowStart, rowEnd, columnStart, span }',
          description: 'Header cell with 1-based matrix coordinates.',
        },
        {
          name: 'OgePivotFieldChooserOptions',
          type: "{ applyChangesMode?: 'instantly' | 'onDemand' }",
          description:
            "Field-chooser behavior; <code>'onDemand'</code> edits a draft that applies on Apply.",
        },
        {
          name: 'OgePivotMenuItem',
          type: '{ text, disabled?, active?, action? }',
          description: 'One item of the header / field context menus.',
        },
        {
          name: 'OGE_PIVOT_FIELD_DRAG_TYPE',
          type: "'application/x-oge-pivot-field'",
          description:
            'Deprecated — field chips no longer use HTML5 drag and drop (pointer drag, touch included); kept so existing imports compile.',
        },
        {
          name: 'OgePivotFieldDropTarget',
          type: '{ area: PivotArea | null, beforeId: string | null }',
          description:
            'Where a dragged field chip would land: the area (<code>null</code> = the chooser list) and the chip it is inserted in front of (<code>null</code> = the end).',
        },
        {
          name: 'OgePivotFieldPointerInput',
          type: '{ button, clientX, clientY, pointerId, pointerType?, target, preventDefault() }',
          description:
            'The <code>pointerdown</code> facts the engine core reads to start a chip drag — the native or the React synthetic event.',
        },
      ],
    },
    {
      title: 'Keyboard (WAI-ARIA APG grid + field chips)',
      entries: [
        {
          name: 'Tab',
          type: 'grid',
          description:
            'The matrix is one APG grid with a single tab stop shared by column headers, row headers and value cells (the first value cell until something is focused).',
        },
        {
          name: 'Arrow keys',
          type: 'grid',
          description:
            'Move between headers and value cells; a spanning column header is one stop, and Down out of it keeps the column you came from. Left/Right are mirrored in RTL.',
        },
        {
          name: 'Home / End · Ctrl+Home / Ctrl+End',
          type: 'grid',
          description:
            'First / last cell of the row · first column header / last value cell of the grid.',
        },
        {
          name: 'Enter / Space (header)',
          type: 'grid',
          description:
            'Expands or collapses an expandable row or column header.',
        },
        {
          name: 'Shift+F10 / ContextMenu (header)',
          type: 'grid',
          description:
            'Opens the header menu (sort, sort by summary, filter, remove, expand/collapse all, field chooser) — the keyboard right-click.',
        },
        {
          name: 'Enter / Space / Shift+F10 (field chip)',
          type: 'field panel + chooser',
          description:
            'Every field chip is a focusable <code>role="button"</code> with <code>aria-haspopup="menu"</code>; these keys (and right-click) open its field menu: Move left / Move right, Move to Filters / Rows / Columns / Values, Remove field, and on a measure the summary-type and display-mode items. The single-pointer alternative to dragging (WCAG 2.5.7).',
        },
        {
          name: 'Ctrl+Left / Ctrl+Right (field chip)',
          type: 'field panel + chooser',
          description:
            'Reorders the field within its area (mirrored in RTL); the new position is announced in a polite live region.',
        },
        {
          name: 'Ctrl+Up / Ctrl+Down (field chip)',
          type: 'field panel + chooser',
          description:
            'Moves the field to the end of the previous / next area in panel order (Filters, Rows, Columns, Values).',
        },
        {
          name: 'Delete (field chip)',
          type: 'field panel + chooser',
          description:
            'Removes the field from the layout. In the chooser’s <code>onDemand</code> mode every move edits the draft until Apply.',
        },
        {
          name: 'Up / Down / Home / End / Escape / Tab (menu)',
          type: 'menu',
          description:
            'APG menu keys over the enabled items; Escape and Tab close it and return focus to the chip or header that opened it (a moved chip is re-focused in its new area).',
        },
      ],
    },
    {
      title: 'Accessibility messages',
      entries: [
        {
          name: 'moveToAreaPattern',
          type: 'string',
          default: "'Move to {0}'",
          description: 'Field-menu item; <code>{0}</code> is the area label.',
        },
        {
          name: 'moveFieldLeft / moveFieldRight',
          type: 'string',
          default: "'Move left' / 'Move right'",
          description: 'Field-menu items reordering a field within its area.',
        },
        {
          name: 'fieldMenuLabelPattern',
          type: 'string',
          default: "'{0} field actions'",
          description:
            'Accessible name of the field menu; <code>{0}</code> is the caption.',
        },
        {
          name: 'fieldMovedPattern',
          type: 'string',
          default: "'{0} moved to {1}, position {2} of {3}'",
          description:
            'Live announcement after a move: field, area label, 1-based position, fields in the area.',
        },
        {
          name: 'fieldRemovedPattern',
          type: 'string',
          default: "'{0} removed from the layout'",
          description: 'Live announcement after a field left the layout.',
        },
      ],
    },
    {
      title: 'Configuration & engine',
      entries: [
        {
          name: 'OgePivotGrid',
          type: 'component',
          description:
            'The pivot grid; generic over the row type (<code>&lt;OgePivotGrid&lt;Sale&gt; … /&gt;</code> infers it from <code>data</code>).',
        },
        {
          name: 'OgePivotGridProps / OgePivotGridHandle',
          type: 'interfaces',
          description:
            'The props above, and the <code>ref</code> handle (<code>useRef&lt;OgePivotGridHandle&lt;T&gt;&gt;(null)</code>).',
        },
        {
          name: 'OgePivotMessagesProvider',
          type: '({ messages, children }) =&gt; JSX.Element',
          description:
            'Subtree-scoped overrides of <code>OgePivotMessages</code> (41 keys — areas, menus, chooser, export, field-move menu and announcements…); nested providers merge key by key, and a new <code>messages</code> object re-resolves the subtree. The counterpart of <code>provideOgePivotMessages()</code>.',
        },
        {
          name: 'useOgePivotMessages()',
          type: 'OgePivotMessages',
          description: 'The resolved messages for the current subtree.',
        },
        {
          name: 'PivotFieldConfig / PivotResult / PivotLoadOptions / OgePivotStore…',
          type: 'from @oge-ui/core',
          description:
            'The serializable engine contract lives in <code>&#64;oge-ui/core</code>; the shared pivot machine in <code>&#64;oge-ui/pivot-engine</code>.',
        },
        {
          name: 'OgePivotCalculatedField / OgePivotCalculatedCell',
          type: '{ name; caption?; expression(values, cell); format?; displayMode?; runningTotal? }',
          description:
            'A calculated measure; <code>expression</code> receives the cell’s measure values keyed by measure id (as displayed) and where it is evaluated (<code>rowPath</code>, <code>columnPath</code>, <code>isTotal</code>, <code>isGrandTotal</code>). Non-finite results and throws become an empty cell.',
        },
        {
          name: 'OgePivotChartData / OgePivotChartOptions / OgePivotChartPoint / OgePivotChartSeries',
          type: 'interfaces',
          description:
            "What <code>getChartData()</code> / <code>toChartSeries()</code> return and take; each series is <code>{ type, name, argumentField: 'argument', valueField, measureId, path }</code> — assignable to the charts’ series input.",
        },
        {
          name: 'toChartSeries(result, options?)',
          type: 'from @oge-ui/pivot-engine',
          description:
            'The pure adapter behind <code>getChartData()</code>, for a <code>PivotResult</code> you hold yourself.',
        },
        {
          name: 'OgePivotLabelFilter / OgePivotValueFilter / OgePivotTopNFilter',
          type: 'interfaces',
          description: 'The member filters of a row or column field.',
        },
        {
          name: 'OgePivotLabelFilterOperator / OgePivotValueFilterOperator / OgePivotRowHeaderLayout',
          type: 'string unions',
          description: 'The filter operators and the row-header layouts.',
        },
        {
          name: 'OgePivotCellTemplateContext',
          type: 'OgePivotCellPrepared &amp; { rowIndex; columnIndex; measureIndex }',
          description: 'What a value-cell <code>renderCell</code> receives.',
        },
        {
          name: 'exportPivotToPdf(handle, options?)',
          type: '@oge-ui/react-pivot/export-pdf',
          description:
            'Lazy PDF export (optional <code>jspdf</code> + <code>jspdf-autotable</code> peers): the multi-level column headers repeated on every page, the grid’s own cell text, its row-header layout and field captions, bold totals, <code>title</code>, <code>pageHeader</code> / <code>pageFooter</code>, <code>pageNumbers</code>, <code>customizeCell</code>. <code>buildPivotPdfDocument(result, options)</code> for custom pipelines.',
        },
        {
          name: 'OgePivotPdfExportOptions / OgePivotPdfCell / OgePdfPageInfo',
          type: 'interfaces',
          description:
            'The PDF helper’s options, the mutable value cell its <code>customizeCell</code> receives (<code>text</code>, <code>style</code>) and what a page callback is told.',
        },
        {
          name: 'exportPivotToExcel(handle, options?)',
          type: '@oge-ui/react-pivot/export-excel',
          description:
            'Lazy Excel export with merged multi-level headers; <code>buildPivotWorkbook(result)</code> for custom pipelines.',
        },
      ],
    },
  ],
};

export const OGE_REACT_PIVOT_FIELD_API: ApiSections = {
  properties: [
    {
      title: 'Placement',
      entries: [
        {
          name: 'dataField',
          type: 'string (required)',
          description: 'Source field; dotted paths supported.',
        },
        {
          name: 'id',
          type: 'string | undefined',
          description: 'Stable field id (defaults to <code>dataField</code>).',
        },
        {
          name: 'caption',
          type: 'string | undefined',
          description: 'Chip/header label.',
        },
        {
          name: 'area',
          type: 'PivotArea | null',
          default: 'null',
          description:
            'row | column | data | filter; <code>null</code> keeps the field available in the chooser only.',
        },
        {
          name: 'areaIndex',
          type: 'number | undefined',
          description: 'Order within the area.',
        },
        {
          name: 'dataType',
          type: "'string' | 'number' | 'date' | 'boolean' | undefined",
          description: 'Drives group intervals and formatting.',
        },
        {
          name: 'groupInterval',
          type: 'PivotGroupInterval | undefined',
          description:
            'year/quarter/month/day/dayOfWeek or a numeric bucket size.',
        },
      ],
    },
    {
      title: 'Measures (area: "data")',
      entries: [
        {
          name: 'summaryType',
          type: 'SummaryType',
          default: "'sum'",
          description: 'sum/avg/min/max/count/custom.',
        },
        {
          name: 'summaryName',
          type: 'string | undefined',
          description: 'Registered custom-summary name.',
        },
        {
          name: 'summaryDisplayMode',
          type: 'PivotSummaryDisplayMode',
          default: "'none'",
          description: 'percent-of/running-total/variation post-processing.',
        },
        {
          name: 'runningTotal',
          type: 'PivotRunningTotal | undefined',
          description: 'Running totals with per-group reset.',
        },
        {
          name: 'calculateCustomSummary',
          type: 'CustomSummaryFn&lt;T&gt; | undefined',
          description: 'Out-of-band custom reducer.',
        },
      ],
    },
    {
      title: 'Row/column fields',
      entries: [
        {
          name: 'sortOrder',
          type: 'SortDirection | undefined',
          description: 'Label sort.',
        },
        {
          name: 'sortBySummaryField / sortBySummaryPath',
          type: 'string / PivotPath',
          description: 'Sort by a summary value at an opposite-axis path.',
        },
        {
          name: 'filterValues / filterType',
          type: "readonly unknown[] / 'include' | 'exclude'",
          description: 'Field filter.',
        },
        {
          name: 'showTotals',
          type: 'boolean',
          default: 'true',
          description: 'Sub-totals for this field.',
        },
        {
          name: 'selector / format / customizeText',
          type: 'functions',
          description:
            'Out-of-band value selector, display formatter and text hook.',
        },
        {
          name: 'labelFilter',
          type: 'OgePivotLabelFilter | undefined',
          description:
            "Keeps the members whose label matches — <code>{ operator: 'contains' | 'notContains' | 'beginsWith' | 'endsWith' | 'equals' | 'notEquals', value }</code>, case- and accent-insensitive.",
        },
        {
          name: 'valueFilter',
          type: 'OgePivotValueFilter | undefined',
          description:
            "Keeps the members whose total of a measure passes — <code>{ measure, operator: 'greaterThan' | 'greaterThanOrEqual' | 'lessThan' | 'lessThanOrEqual' | 'equals' | 'notEquals' | 'between' | 'notBetween', value, value2? }</code> (<code>measure</code> is a data field id).",
        },
        {
          name: 'topN',
          type: 'OgePivotTopNFilter | undefined',
          description:
            "Keeps the <code>count</code> members with the highest (<code>direction: 'top'</code>, default) or lowest total of <code>measure</code>. Member filters run before aggregation — totals follow — in area order; value and Top-N filters compare a member’s grand total (local data only).",
        },
      ],
    },
  ],
};
