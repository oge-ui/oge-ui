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
          type: "{ applyChangesMode?: 'instantly' | 'onDemand' }",
          default: '{}',
          description: 'Field-chooser dialog behavior.',
        },
        {
          name: 'customizeCell',
          type: '(cell: OgePivotCellPrepared) =&gt; void',
          description:
            'Appearance hook: mutate <code>text</code> / <code>cssClass</code> per cell (the DevExtreme <code>cellPrepared</code> equivalent).',
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
          description: 'Field layout + expansion snapshot.',
        },
        {
          name: 'getCsv(options?) / exportCsv(filename?)',
          type: 'string / void',
          description:
            'CSV of exactly what is on screen (multi-level headers flattened).',
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
          name: 'PivotAxisLine',
          type: '{ text, path, level, expanded, hasChildren, isTotal, isGrandTotal }',
          description: 'One visible axis line, in matrix order.',
        },
        {
          name: 'PivotHeaderCell',
          type: 'PivotAxisLine &amp; { rowStart, rowEnd, columnStart, span }',
          description: 'Header cell with 1-based matrix coordinates.',
        },
        {
          name: 'PIVOT_FIELD_DRAG_TYPE',
          type: "'application/x-oge-pivot-field'",
          description: 'DataTransfer type of field chips.',
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
            'App-scoped overrides of <code>OgePivotMessages</code> (39 keys — areas, menus, chooser, export…).',
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
