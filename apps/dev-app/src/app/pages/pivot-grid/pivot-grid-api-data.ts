import type { ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/pivot/src/lib/** — keep in sync with the source
 * TSDoc when the public API changes.
 */

export const OGE_PIVOT_GRID_API: ApiSections = {
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
            'Fields as data — the programmatic twin of <code>&lt;oge-pivot-field&gt;</code> children (same members), appended after them. Use it when the grid is wrapped in another component, where content queries cannot see projected children.',
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
          description: 'Collapsible drag &amp; drop field panel.',
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
          name: 'stateKey',
          type: 'string | undefined',
          description:
            'Persists the field layout + expansion via <code>OGE_STATE_STORAGE</code>.',
        },
        {
          name: 'messages',
          type: 'Partial&lt;OgePivotMessages&gt;',
          default: '{}',
          description: 'Per-instance overrides of the UI strings.',
        },
      ],
    },
  ],
  methods: [
    {
      entries: [
        {
          name: 'getResult(): PivotResult',
          type: 'PivotResult',
          description:
            'The materialized pivot exactly as rendered — for custom export integrations.',
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
            'CSV of exactly what is on screen (multi-level headers flattened).' +
            'Cells a spreadsheet would evaluate as a formula are apostrophe-prefixed (CSV formula injection); <code>formulaGuard: false</code> opts out.',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'cellClick / cellDblClick',
          type: 'OgePivotCellClickEvent',
          description:
            '<code>{ rowPath, columnPath, measureIndex, value, event }</code>.',
        },
        {
          name: 'fieldLayoutChange',
          type: 'readonly PivotFieldConfig[]',
          description: 'The field layout changed (drag, chooser, menus).',
        },
        {
          name: 'stateChange',
          type: 'PivotGridStateSnapshot',
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
          name: 'OgePivotFieldDef',
          type: '{ dataField; id?, caption?, area?, … every &lt;oge-pivot-field&gt; input }',
          description:
            'Element type of <code>fields</code> — one declared field as data, with the directive’s defaults.',
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
          description: 'DataTransfer type of field chips.',
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
          name: 'provideOgePivotMessages(messages)',
          type: 'Provider',
          description:
            'App-scoped overrides of <code>OgePivotMessages</code> (41 keys — areas, menus, chooser, export, field-move menu and announcements…).',
        },
        {
          name: 'PivotFieldConfig / PivotResult / PivotLoadOptions / OgePivotStore…',
          type: 'from @oge-ui/core',
          description:
            'The serializable engine contract lives in <code>&#64;oge-ui/core</code>, not in this package.',
        },
        {
          name: 'exportPivotToExcel(grid, options?)',
          type: '@oge-ui/pivot/export-excel',
          description:
            'Lazy Excel export with merged multi-level headers; <code>buildPivotWorkbook(result)</code> for custom pipelines.',
        },
      ],
    },
  ],
};

export const OGE_PIVOT_FIELD_API: ApiSections = {
  properties: [
    {
      title: 'Internals — not a supported API',
      entries: [
        {
          name: 'OgePivotStateStore',
          type: 'component-scoped service',
          description:
            'UI state of a pivot grid: field-layout overrides on top of the declared <code>&lt;oge-pivot-field&gt;</code> configuration, the expansion of both axes (kept as key → path so remote contracts get real paths back) and the field-panel collapse flag. Injected by the grid — applications should use <code>stateKey</code> or <code>state()</code>/<code>applyState()</code>.',
        },
      ],
    },
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
      title: 'Measures (area="data")',
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
      ],
    },
  ],
};
