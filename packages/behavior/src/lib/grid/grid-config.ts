import type { FilterOperator, SummaryType } from '@oge-ui/core';

/**
 * Every user-facing string of the grid family — the one catalog both render
 * layers read (ADR 0001). Angular overrides it app-wide through
 * `provideOgeGridConfig({ messages })`, React through
 * `<OgeGridConfigProvider>`; both accept per-grid `messages` overrides.
 */
export interface OgeGridMessages {
  noData: string;
  loading: string;
  search: string;
  selectAllValues: string;
  blankValue: string;
  columnChooser: string;
  columnChooserTitle: string;
  /** Accessible name of the grid's `role="toolbar"` command bar. */
  toolbar: string;
  /** Accessible name of the toolbar's overflow button. */
  moreCommands: string;
  groupPanelHint: string;
  ungroupPrefix: string;
  expandAllGroups: string;
  collapseAllGroups: string;
  filterPrefix: string;
  filterValues: string;
  selectAllRows: string;
  selectRow: string;
  toggleDetail: string;
  /** Accessible name of the row-drag handle column's header cell. */
  reorderColumnHeader: string;
  /** Accessible name of the master-detail expander column's header cell. */
  detailColumnHeader: string;
  /** Accessible name of the selection checkbox column's header cell. */
  selectAllColumnHeader: string;
  /** Accessible name of a row's drag handle (grid row reordering). */
  reorderRow: string;
  /** Accessible name of the drag handle column's header cell (tree-list reparenting). */
  reparentColumnHeader: string;
  /** Accessible name of a row's drag handle (tree-list reparenting). */
  reparentRow: string;
  /**
   * Accessible name of a column's resize separator; `{column}` is the
   * caption. The separator is `role="separator"` with the width in px as its
   * value.
   */
  resizeColumn: string;
  /**
   * Live announcement after a keyboard column resize (Alt+Arrow on a header);
   * placeholders `{column}` `{width}`.
   */
  columnResized: string;
  /**
   * Live announcement after a keyboard column move (Ctrl+Shift+Arrow on a
   * header, Ctrl+Arrow in the column chooser); placeholders `{column}`
   * `{position}` `{total}`.
   */
  columnMoved: string;
  /**
   * Live announcement after a keyboard row move (Ctrl+ArrowUp/Down);
   * placeholders `{position}` `{total}`.
   */
  rowMoved: string;
  /**
   * Live announcement after a keyboard tree-row move, indent or outdent
   * (tree-list); placeholders `{level}` `{position}` `{total}` — position
   * among the row's new siblings.
   */
  treeRowMoved: string;
  /**
   * Live announcement after a group-panel chip is reordered (Ctrl+Arrow);
   * placeholders `{column}` `{position}` `{total}`.
   */
  groupMoved: string;
  /** Live announcement after a grouping is removed from the keyboard; `{column}`. */
  groupRemoved: string;
  /** Aria label of a collapsed tree row's expander (tree-list). */
  expandRow: string;
  /** Aria label of an expanded tree row's expander (tree-list). */
  collapseRow: string;
  previousPage: string;
  nextPage: string;
  rowsSuffix: string;
  pageSizeLabel: string;
  allRows: string;
  confirmDelete: string;
  /** Visible text of a `true` boolean cell (also the CSV / filter-list text). */
  booleanTrue: string;
  /** Visible text of a `false` boolean cell (also the CSV / filter-list text). */
  booleanFalse: string;
  /**
   * Screen-reader text of a `true` boolean cell — the visible `booleanTrue`
   * glyph is rendered `aria-hidden`, this is rendered visually hidden.
   */
  booleanTrueLabel: string;
  /** Screen-reader text of a `false` boolean cell (see `booleanTrueLabel`). */
  booleanFalseLabel: string;
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
  /** Operator labels for the filter-row operator menu and the filter builder. */
  operators: Record<FilterOperator, string>;
  resetOperator: string;
  filterBuilderTitle: string;
  createFilter: string;
  clearFilter: string;
  addCondition: string;
  addGroup: string;
  removeItem: string;
  logicAnd: string;
  logicOr: string;
  apply: string;
  filterValuePlaceholder: string;
  summaryLabels: Record<SummaryType, string>;
  /** Pattern for group-row summaries; placeholders: {label} {column} {value} */
  groupSummaryPattern: string;
  /** Pattern for the total row; placeholders: {label} {value} */
  totalSummaryPattern: string;
}

export const OGE_DEFAULT_GRID_MESSAGES: OgeGridMessages = {
  noData: 'No data',
  loading: 'Loading…',
  search: 'Search…',
  selectAllValues: '(All)',
  blankValue: '(Blank)',
  columnChooser: 'Column chooser',
  columnChooserTitle: 'Columns',
  toolbar: 'Grid toolbar',
  moreCommands: 'More commands',
  groupPanelHint: 'Drag a column header here to group',
  ungroupPrefix: 'Ungroup',
  expandAllGroups: 'Expand all groups',
  collapseAllGroups: 'Collapse all groups',
  filterPrefix: 'Filter',
  filterValues: 'Filter values',
  selectAllRows: 'Select all rows',
  selectRow: 'Select row',
  toggleDetail: 'Toggle detail',
  reorderColumnHeader: 'Reorder',
  detailColumnHeader: 'Detail',
  selectAllColumnHeader: 'Select all',
  reorderRow: 'Reorder row',
  reparentColumnHeader: 'Reparent',
  reparentRow: 'Reparent row',
  resizeColumn: 'Resize {column}',
  columnResized: '{column} width {width} pixels',
  columnMoved: '{column} moved to position {position} of {total}',
  rowMoved: 'Row moved to position {position} of {total}',
  treeRowMoved: 'Row moved to level {level}, position {position} of {total}',
  groupMoved: 'Grouping by {column} moved to position {position} of {total}',
  groupRemoved: 'Grouping by {column} removed',
  expandRow: 'Expand row',
  collapseRow: 'Collapse row',
  previousPage: 'Previous page',
  nextPage: 'Next page',
  rowsSuffix: 'rows',
  pageSizeLabel: 'Rows per page',
  allRows: 'All',
  confirmDelete: 'Delete this row?',
  booleanTrue: '✓',
  booleanFalse: '✗',
  booleanTrueLabel: 'Yes',
  booleanFalseLabel: 'No',
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
  operators: {
    eq: 'Equals',
    ne: 'Does not equal',
    gt: 'Greater than',
    ge: 'Greater than or equal',
    lt: 'Less than',
    le: 'Less than or equal',
    contains: 'Contains',
    notcontains: 'Does not contain',
    startswith: 'Starts with',
    endswith: 'Ends with',
    in: 'Is any of',
    between: 'Between',
    isnull: 'Is blank',
    isnotnull: 'Is not blank',
  },
  resetOperator: 'Reset',
  filterBuilderTitle: 'Filter Builder',
  createFilter: 'Create filter',
  clearFilter: 'Clear',
  addCondition: 'Add condition',
  addGroup: 'Add group',
  removeItem: 'Remove',
  logicAnd: 'And',
  logicOr: 'Or',
  apply: 'Apply',
  filterValuePlaceholder: 'Value',
  summaryLabels: {
    sum: 'Sum',
    avg: 'Avg',
    min: 'Min',
    max: 'Max',
    count: 'Count',
    custom: 'Custom',
  },
  groupSummaryPattern: '{label} of {column}: {value}',
  totalSummaryPattern: '{label}: {value}',
};

/** Application-wide grid defaults, overridable per grid via the matching props. */
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
  messages: OGE_DEFAULT_GRID_MESSAGES,
};

/** What `provideOgeGridConfig()` / `<OgeGridConfigProvider>` accept. */
export type OgeGridConfigInput = Partial<Omit<OgeGridConfig, 'messages'>> & {
  messages?: Partial<OgeGridMessages>;
};

/** Merges an override onto a base config, messages key by key. */
export function resolveGridConfig(
  input: OgeGridConfigInput | undefined,
  base: OgeGridConfig = OGE_DEFAULT_GRID_CONFIG,
): OgeGridConfig {
  if (!input) return base;
  const { messages, ...rest } = input;
  return {
    ...base,
    ...rest,
    messages: { ...base.messages, ...messages },
  };
}
