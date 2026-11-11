import type { FilterOperator, SummaryType } from '@oge-ui/core';
import type { OgeGridColumnHidingMode } from './grid-columns';

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
  /**
   * Aria label / title of a row's adaptive-detail toggle — the button that
   * reveals the columns responsive hiding took out (`columnHidingMode: 'detail'`).
   */
  toggleAdaptiveDetail: string;
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
  /**
   * @deprecated Use `pagerInfo` — a suffix cannot inflect. A catalog that
   * still sets it keeps the old `"<count> <suffix>"` pager text (with a
   * dev-mode warning) until the next minor.
   */
  rowsSuffix?: string;
  /**
   * The pager's row-count text — an ICU plural over `{count}`
   * (`ogeFormatMessage`): `'{count, plural, one {# row} other {# rows}}'`.
   */
  pagerInfo: string;
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
  /** Header menu entry of the column summary picker (`summaryMenu`). */
  summaryMenu: string;
  /** Summary picker choice that hides the column's totals. */
  summaryNone: string;
  /** Summary picker choice that returns to the column's declared totals. */
  summaryDefault: string;
  /** Accessible name of the active-filter chip bar (`filterChips`). */
  filterChipsLabel: string;
  /** The chip bar's button removing every filter. */
  clearAllFilters: string;
  /** Accessible name of a chip's remove button; placeholder: {filter}. */
  removeFilter: string;
  /** Chip label of the global search text. */
  searchChip: string;
  /** Chip label of the filter builder's expression. */
  builderChip: string;
  /** Note under a value list cut at `valueLimit`; placeholder: {count}. */
  headerFilterTruncated: string;
  /** Group name of the date presets in a date column’s header menu. */
  datePresetsLabel: string;
  /** Date preset. */
  datePresetToday: string;
  /** Date preset. */
  datePresetYesterday: string;
  /** Date preset (from the locale’s first day of the week). */
  datePresetThisWeek: string;
  /** Date preset. */
  datePresetThisMonth: string;
  /** Date preset (ending today). */
  datePresetLast30Days: string;
  /** Date preset. */
  datePresetThisYear: string;
  /** Button of `filterApplyMode: 'manual'`. */
  applyFilters: string;
  /** Note shown while manual mode holds edits. */
  pendingFilters: string;
  /** Toolbar button opening the saved views (`savedViews`). */
  savedViews: string;
  /** Button saving the current state as a view. */
  saveView: string;
  /** Label of the view name box. */
  viewName: string;
  /** Accessible name of a view’s delete button; placeholder: {name}. */
  deleteView: string;
  /** Shown when there are no saved views. */
  noSavedViews: string;
  /** Live announcement after an ascending sort; placeholder: {column}. */
  sortAscendingAnnouncement: string;
  /** Live announcement after a descending sort; placeholder: {column}. */
  sortDescendingAnnouncement: string;
  /** Live announcement after the sort was removed; placeholder: {column}. */
  sortClearedAnnouncement: string;
  /**
   * Live result count after a filter or search change — an ICU plural over
   * `{count}` (`ogeFormatMessage`), so every language's plural forms fit in
   * one key: `'{count, plural, one {# row} other {# rows}}'`.
   */
  rowCountAnnouncement: string;
  /**
   * @deprecated Put the singular into `rowCountAnnouncement` as an ICU plural
   * branch. Still honoured for exactly one row (with a dev-mode warning)
   * until the next minor.
   */
  rowCountOneAnnouncement?: string;
  /** Live announcement after a page change; placeholders: {n} {total}. */
  pageAnnouncement: string;
  /** Live announcement when a group row expands; placeholder: {value}. */
  groupExpandedAnnouncement: string;
  /** Live announcement when a group row collapses; placeholder: {value}. */
  groupCollapsedAnnouncement: string;
  /** Live announcement when a tree row expands (tree-list); placeholder: {value}. */
  rowExpandedAnnouncement: string;
  /** Live announcement when a tree row collapses (tree-list); placeholder: {value}. */
  rowCollapsedAnnouncement: string;
  /** Live announcement after select-all / clear-all; ICU plural over {count}. */
  selectionCountAnnouncement: string;
  /** Assertive announcement when a save is blocked by an invalid editor; placeholders: {column} {error}. */
  validationErrorAnnouncement: string;
  /**
   * Live announcement after a cell range grew past one cell
   * (`selectionMode: 'cell'`); placeholders: {rows} {columns} {cells}.
   */
  rangeSelectedAnnouncement: string;
  /** Live announcement after a paste wrote cells; ICU plural over {count}. */
  cellsPastedAnnouncement: string;
  /** Live announcement after a fill (handle drag, Ctrl+D / Ctrl+R) wrote cells; ICU plural over {count}. */
  cellsFilledAnnouncement: string;
  /** Live announcement after Ctrl+Z reverted cells; ICU plural over {count}. */
  undoAnnouncement: string;
  /** Live announcement after Ctrl+Y re-applied cells; ICU plural over {count}. */
  redoAnnouncement: string;
  /** Tooltip of the range's fill handle (the drag affordance at its corner). */
  fillHandle: string;
  /** Visually hidden text of an editor whose async validation is running. */
  validationPending: string;
  /** Header context-menu item that sizes the column to its content. */
  autoFitColumn: string;
  /** Heading of the header filter's condition section. */
  filterByCondition: string;
  /** Heading of the header filter's value list (`headerFilter.mode: 'both'`). */
  filterByValues: string;
  /** Accessible name of the first condition's operator / value pair. */
  firstCondition: string;
  /** Accessible name of the second condition's operator / value pair. */
  secondCondition: string;
  /** Pager button: first page. */
  firstPage: string;
  /** Pager button: last page. */
  lastPage: string;
  /** Label of the pager's go-to-page input. */
  goToPage: string;
  /** Text after the go-to-page input; placeholder: {count}. */
  pageOfCount: string;
  /** Group caption of a `groupInterval: 'week'` bucket; placeholder: {date}. */
  groupWeekPattern: string;
  /** Group caption of a `groupInterval: 'quarter'` bucket; placeholders: {quarter} {year}. */
  groupQuarterPattern: string;
  /** Group caption of a numeric `groupInterval` bucket; placeholders: {from} {to}. */
  groupRangePattern: string;
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
  toggleAdaptiveDetail: 'Show hidden columns',
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
  pagerInfo: '{count, plural, one {# row} other {# rows}}',
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
    notin: 'Is none of',
    between: 'Between',
    isnull: 'Is blank',
    isnotnull: 'Is not blank',
    isblank: 'Is blank',
    isnotblank: 'Is not blank',
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
  summaryMenu: 'Summary',
  summaryNone: 'None',
  summaryDefault: 'Column default',
  filterChipsLabel: 'Active filters',
  clearAllFilters: 'Clear all',
  removeFilter: 'Remove filter: {filter}',
  searchChip: 'Search',
  builderChip: 'Custom filter',
  headerFilterTruncated:
    'Showing the first {count} values — type to narrow the list.',
  datePresetsLabel: 'Quick dates',
  datePresetToday: 'Today',
  datePresetYesterday: 'Yesterday',
  datePresetThisWeek: 'This week',
  datePresetThisMonth: 'This month',
  datePresetLast30Days: 'Last 30 days',
  datePresetThisYear: 'This year',
  applyFilters: 'Apply filters',
  pendingFilters: 'Filter changes are not applied yet',
  savedViews: 'Views',
  saveView: 'Save view',
  viewName: 'View name',
  deleteView: 'Delete view {name}',
  noSavedViews: 'No saved views yet',
  sortAscendingAnnouncement: 'Sorted by {column}, ascending',
  sortDescendingAnnouncement: 'Sorted by {column}, descending',
  sortClearedAnnouncement: 'Sort cleared',
  rowCountAnnouncement: '{count, plural, one {# row} other {# rows}}',
  pageAnnouncement: 'Page {n} of {total}',
  groupExpandedAnnouncement: 'Group {value} expanded',
  groupCollapsedAnnouncement: 'Group {value} collapsed',
  rowExpandedAnnouncement: '{value} expanded',
  rowCollapsedAnnouncement: '{value} collapsed',
  selectionCountAnnouncement:
    '{count, plural, one {# row selected} other {# rows selected}}',
  validationErrorAnnouncement: '{column}: {error}',
  rangeSelectedAnnouncement: '{rows} by {columns} cells selected',
  cellsPastedAnnouncement:
    '{count, plural, one {# cell pasted} other {# cells pasted}}',
  cellsFilledAnnouncement:
    '{count, plural, one {# cell filled} other {# cells filled}}',
  undoAnnouncement:
    'Undo: {count, plural, one {# cell restored} other {# cells restored}}',
  redoAnnouncement:
    'Redo: {count, plural, one {# cell changed} other {# cells changed}}',
  fillHandle: 'Drag to fill',
  validationPending: 'Checking…',
  autoFitColumn: 'Size to fit',
  filterByCondition: 'Filter by condition',
  filterByValues: 'Filter by values',
  firstCondition: 'First condition',
  secondCondition: 'Second condition',
  firstPage: 'First page',
  lastPage: 'Last page',
  goToPage: 'Page',
  pageOfCount: 'of {count}',
  groupWeekPattern: 'Week of {date}',
  groupQuarterPattern: 'Q{quarter} {year}',
  groupRangePattern: '{from} – {to}',
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
  /**
   * Default `columnHidingMode`: `'detail'` keeps the data of columns hidden
   * by `hidingPriority` reachable through a per-row expand button;
   * `'hide'` drops it.
   */
  columnHidingMode: OgeGridColumnHidingMode;
  /**
   * Whether sort, filter result, paging, group expansion, select-all and
   * validation changes are spoken through the shared live announcer.
   */
  announcements: boolean;
  /**
   * BCP 47 locale of every grid and tree list: default date cells, declarative
   * column `format`s, summaries, group captions, header-filter values, the
   * filter row's number parsing and exported text. `undefined` = the app
   * locale (Angular `LOCALE_ID`; `navigator.language` in React). A
   * component's own `locale` input / prop wins.
   */
  locale: string | undefined;
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
  columnHidingMode: 'detail',
  announcements: true,
  locale: undefined,
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
