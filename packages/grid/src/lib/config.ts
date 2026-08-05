import { InjectionToken, type Provider } from '@angular/core';
import type { SummaryType } from '@oge-ui/core';

/**
 * Every user-facing string in the grid — override globally via
 * `provideOgeGridConfig({ messages: {...} })` or per grid via `[messages]`.
 */
export interface OgeGridMessages {
  noData: string;
  loading: string;
  search: string;
  selectAllValues: string;
  blankValue: string;
  columnChooser: string;
  columnChooserTitle: string;
  groupPanelHint: string;
  ungroupPrefix: string;
  filterPrefix: string;
  filterValues: string;
  selectAllRows: string;
  selectRow: string;
  toggleDetail: string;
  previousPage: string;
  nextPage: string;
  rowsSuffix: string;
  pageSizeLabel: string;
  booleanTrue: string;
  booleanFalse: string;
  editRow: string;
  deleteRow: string;
  undeleteRow: string;
  saveRow: string;
  cancelEdit: string;
  addRow: string;
  saveChanges: string;
  discardChanges: string;
  requiredError: string;
  invalidError: string;
  sortAscending: string;
  sortDescending: string;
  clearSort: string;
  groupByColumn: string;
  ungroupColumn: string;
  pinLeft: string;
  pinRight: string;
  unpin: string;
  hideColumn: string;
  exportCsv: string;
  summaryLabels: Record<SummaryType, string>;
  /** Pattern for group-row summaries; placeholders: {label} {column} {value} */
  groupSummaryPattern: string;
  /** Pattern for the total row; placeholders: {label} {value} */
  totalSummaryPattern: string;
}

export const OGE_DEFAULT_MESSAGES: OgeGridMessages = {
  noData: 'No data',
  loading: 'Loading…',
  search: 'Search…',
  selectAllValues: '(All)',
  blankValue: '(Blank)',
  columnChooser: 'Column chooser',
  columnChooserTitle: 'Columns',
  groupPanelHint: 'Drag a column header here to group',
  ungroupPrefix: 'Ungroup',
  filterPrefix: 'Filter',
  filterValues: 'Filter values',
  selectAllRows: 'Select all rows',
  selectRow: 'Select row',
  toggleDetail: 'Toggle detail',
  previousPage: 'Previous page',
  nextPage: 'Next page',
  rowsSuffix: 'rows',
  pageSizeLabel: 'Rows per page',
  booleanTrue: '✓',
  booleanFalse: '✗',
  editRow: 'Edit',
  deleteRow: 'Delete',
  undeleteRow: 'Undo delete',
  saveRow: 'Save',
  cancelEdit: 'Cancel',
  addRow: 'Add',
  saveChanges: 'Save changes',
  discardChanges: 'Discard changes',
  requiredError: 'This field is required',
  invalidError: 'Invalid value',
  sortAscending: 'Sort ascending',
  sortDescending: 'Sort descending',
  clearSort: 'Clear sort',
  groupByColumn: 'Group by this column',
  ungroupColumn: 'Ungroup',
  pinLeft: 'Pin left',
  pinRight: 'Pin right',
  unpin: 'Unpin',
  hideColumn: 'Hide column',
  exportCsv: 'Export CSV',
  summaryLabels: { sum: 'Sum', avg: 'Avg', min: 'Min', max: 'Max', count: 'Count' },
  groupSummaryPattern: '{label} of {column}: {value}',
  totalSummaryPattern: '{label}: {value}',
};

/** Application-wide defaults, overridable per grid via the matching inputs. */
export interface OgeGridConfig {
  rowHeight: number;
  detailRowHeight: number;
  filterDebounce: number;
  /** Extra rows rendered above/below the virtual window. */
  overscan: number;
  /** Track minimum for columns without an explicit width. */
  columnMinWidth: number;
  /** Width assumed for pinned columns without a numeric width. */
  pinnedDefaultWidth: number;
  /** Maximum distinct values listed in the header filter popup. */
  headerFilterValueLimit: number;
  /** Whether a third header click clears the sort. */
  allowUnsorting: boolean;
  messages: OgeGridMessages;
}

export const OGE_DEFAULT_GRID_CONFIG: OgeGridConfig = {
  rowHeight: 36,
  detailRowHeight: 200,
  filterDebounce: 300,
  overscan: 6,
  columnMinWidth: 120,
  pinnedDefaultWidth: 150,
  headerFilterValueLimit: 200,
  allowUnsorting: true,
  messages: OGE_DEFAULT_MESSAGES,
};

export const OGE_GRID_CONFIG = new InjectionToken<OgeGridConfig>('OGE_GRID_CONFIG', {
  factory: () => OGE_DEFAULT_GRID_CONFIG,
});

export type OgeGridConfigInput = Partial<Omit<OgeGridConfig, 'messages'>> & {
  messages?: Partial<OgeGridMessages>;
};

/**
 * Application- or component-scoped grid defaults (DevExtreme-style global config):
 *
 * ```ts
 * providers: [
 *   provideOgeGridConfig({
 *     rowHeight: 32,
 *     messages: { noData: 'Veri yok', search: 'Ara…' },
 *   }),
 * ]
 * ```
 */
export function provideOgeGridConfig(config: OgeGridConfigInput): Provider {
  const { messages, ...rest } = config;
  return {
    provide: OGE_GRID_CONFIG,
    useValue: {
      ...OGE_DEFAULT_GRID_CONFIG,
      ...rest,
      messages: { ...OGE_DEFAULT_MESSAGES, ...messages },
    } satisfies OgeGridConfig,
  };
}

export function formatPattern(pattern: string, values: Record<string, string>): string {
  return pattern.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}
