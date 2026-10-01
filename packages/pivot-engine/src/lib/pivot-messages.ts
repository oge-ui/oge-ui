/**
 * Every user-facing string of the pivot grid.
 *
 * The catalog is framework-free so both render layers read one copy (ADR
 * 0003): Angular serves it through the `OGE_PIVOT_MESSAGES` token, React
 * through `<OgePivotMessagesProvider>`.
 */
export interface OgePivotMessages {
  grandTotal: string;
  /** Subtotal label pattern; `{0}` is the group's text. */
  totalPattern: string;
  blankValue: string;
  rowArea: string;
  columnArea: string;
  dataArea: string;
  filterArea: string;
  fieldPanelHint: string;
  collapseFieldPanel: string;
  expandFieldPanel: string;
  sortAscending: string;
  sortDescending: string;
  /** `{0}` is the header's text. */
  sortBySummaryPattern: string;
  clearSorting: string;
  filterField: string;
  removeField: string;
  expandAll: string;
  collapseAll: string;
  showFieldChooser: string;
  fieldChooserTitle: string;
  allFields: string;
  search: string;
  selectAllValues: string;
  includeValues: string;
  excludeValues: string;
  clearFilter: string;
  apply: string;
  cancel: string;
  summaryTypeLabels: Record<'sum' | 'avg' | 'min' | 'max' | 'count', string>;
  displayModeLabels: Record<
    | 'none'
    | 'absoluteVariation'
    | 'percentVariation'
    | 'percentOfColumnTotal'
    | 'percentOfRowTotal'
    | 'percentOfColumnGrandTotal'
    | 'percentOfRowGrandTotal'
    | 'percentOfGrandTotal',
    string
  >;
  summaryTypeMenu: string;
  displayModeMenu: string;
  exportCsv: string;
  exportExcel: string;
  loading: string;
  /** Field-menu item moving a field to another area; `{0}` is the area label. */
  moveToAreaPattern: string;
  /** Field-menu item moving a field one place earlier in its area. */
  moveFieldLeft: string;
  /** Field-menu item moving a field one place later in its area. */
  moveFieldRight: string;
  /** Accessible name of the field menu; `{0}` is the field caption. */
  fieldMenuLabelPattern: string;
  /**
   * Live announcement after a field move: `{0}` field, `{1}` area label,
   * `{2}` 1-based position, `{3}` fields in the area.
   */
  fieldMovedPattern: string;
  /** Live announcement after a field left the layout; `{0}` is the field. */
  fieldRemovedPattern: string;
}

export const OGE_DEFAULT_PIVOT_MESSAGES: OgePivotMessages = {
  grandTotal: 'Grand Total',
  totalPattern: '{0} Total',
  blankValue: '(Blank)',
  rowArea: 'Rows',
  columnArea: 'Columns',
  dataArea: 'Values',
  filterArea: 'Filters',
  fieldPanelHint: 'Drag fields between the areas',
  collapseFieldPanel: 'Collapse field panel',
  expandFieldPanel: 'Expand field panel',
  sortAscending: 'Sort A to Z',
  sortDescending: 'Sort Z to A',
  sortBySummaryPattern: 'Sort by "{0}"',
  clearSorting: 'Clear sorting',
  filterField: 'Filter values',
  removeField: 'Remove field',
  expandAll: 'Expand all',
  collapseAll: 'Collapse all',
  showFieldChooser: 'Field chooser',
  fieldChooserTitle: 'Field Chooser',
  allFields: 'All Fields',
  search: 'Search…',
  selectAllValues: '(All)',
  includeValues: 'Include',
  excludeValues: 'Exclude',
  clearFilter: 'Clear filter',
  apply: 'Apply',
  cancel: 'Cancel',
  summaryTypeLabels: {
    sum: 'Sum',
    avg: 'Avg',
    min: 'Min',
    max: 'Max',
    count: 'Count',
  },
  displayModeLabels: {
    none: 'No calculation',
    absoluteVariation: 'Difference from previous',
    percentVariation: '% difference from previous',
    percentOfColumnTotal: '% of column total',
    percentOfRowTotal: '% of row total',
    percentOfColumnGrandTotal: '% of column grand total',
    percentOfRowGrandTotal: '% of row grand total',
    percentOfGrandTotal: '% of grand total',
  },
  summaryTypeMenu: 'Summary type',
  displayModeMenu: 'Show values as',
  exportCsv: 'Export CSV',
  exportExcel: 'Export Excel',
  loading: 'Loading…',
  moveToAreaPattern: 'Move to {0}',
  moveFieldLeft: 'Move left',
  moveFieldRight: 'Move right',
  fieldMenuLabelPattern: '{0} field actions',
  fieldMovedPattern: '{0} moved to {1}, position {2} of {3}',
  fieldRemovedPattern: '{0} removed from the layout',
};

/**
 * Overlays partial overrides on a base catalog (default: the built-in one) —
 * the shallow merge both render layers' providers perform.
 */
export function resolvePivotMessages(
  overrides?: Partial<OgePivotMessages>,
  base: OgePivotMessages = OGE_DEFAULT_PIVOT_MESSAGES,
): OgePivotMessages {
  return overrides ? { ...base, ...overrides } : base;
}
