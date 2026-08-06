import { InjectionToken, type Provider } from '@angular/core';

/** Every user-facing string of the pivot grid. */
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
};

export const OGE_PIVOT_MESSAGES = new InjectionToken<OgePivotMessages>(
  'OGE_PIVOT_MESSAGES',
  {
    factory: () => OGE_DEFAULT_PIVOT_MESSAGES,
  },
);

/** Application- or component-scoped pivot message overrides (i18n). */
export function provideOgePivotMessages(
  messages: Partial<OgePivotMessages>,
): Provider {
  return {
    provide: OGE_PIVOT_MESSAGES,
    useValue: { ...OGE_DEFAULT_PIVOT_MESSAGES, ...messages },
  };
}
