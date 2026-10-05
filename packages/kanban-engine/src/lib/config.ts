/**
 * The Kanban's message catalog, its configuration shape and the defaults —
 * single-sourced here so the Angular `provideOgeKanbanConfig()` and the React
 * `<OgeKanbanConfigProvider>` resolve exactly the same object (ADR 0003).
 */

/** Toolbar labels. */
export interface OgeKanbanToolbarMessages {
  readonly label: string;
  readonly addCard: string;
  readonly collapseAll: string;
  readonly expandAll: string;
  readonly searchLabel: string;
  readonly searchPlaceholder: string;
  readonly clearSearch: string;
  /** Undo button label (added after 1.1 — optional, English fallback). */
  readonly undo?: string;
  /** Redo button label. */
  readonly redo?: string;
  /** Accessible name of the filter chip bar. */
  readonly filterLabel?: string;
  /** Caption of the tag chip group. */
  readonly tagsFilter?: string;
  /** Caption of the assignee chip group. */
  readonly assigneesFilter?: string;
  /** Caption of the priority chip group. */
  readonly priorityFilter?: string;
  /** The chip bar's reset button. */
  readonly clearFilters?: string;
}

/** Built-in context-menu labels. */
export interface OgeKanbanMenuMessages {
  readonly editCard: string;
  readonly deleteCard: string;
  /** Parent label of the column list submenu. */
  readonly moveTo: string;
  readonly addCard: string;
  readonly collapseColumn: string;
  readonly expandColumn: string;
  /** Group caption of the column menu's sort entries (optional, English fallback). */
  readonly sortBy?: string;
  /** Sort entry: the board's own order (`orderExpr` / array order). */
  readonly sortManual?: string;
  /** Sort entry: card title. */
  readonly sortTitle?: string;
  /** Sort entry: priority rank. */
  readonly sortPriority?: string;
  /** Sort entry: due date. */
  readonly sortDueDate?: string;
  /** Direction entry: ascending. */
  readonly sortAscending?: string;
  /** Direction entry: descending. */
  readonly sortDescending?: string;
  /** The header's column-menu button label; `{title}` is the column title. */
  readonly sortColumn?: string;
  /** Selects every card of the column (also Ctrl+A on a card). */
  readonly selectAll?: string;
  /** Cross-board move entry; `{board}` is the other board's `boardId`. */
  readonly moveToBoard?: string;
}

/** Card dialog labels. */
export interface OgeKanbanDialogMessages {
  readonly titleNew: string;
  readonly titleEdit: string;
  readonly titleLabel: string;
  readonly titlePlaceholder: string;
  readonly descriptionLabel: string;
  readonly columnLabel: string;
  readonly swimlaneLabel: string;
  readonly colorLabel: string;
  readonly tagsLabel: string;
  readonly assigneesLabel: string;
  readonly dueDateLabel: string;
  readonly priorityLabel: string;
  readonly save: string;
  readonly cancel: string;
  readonly deleteCard: string;
  /** Validation message when the title is empty. */
  readonly titleRequired: string;
}

/** Board/card aria strings; `{token}` placeholders formatted at render. */
export interface OgeKanbanBoardMessages {
  /** Accessible name of the whole board. */
  readonly boardLabel: string;
  /** Column list aria label; `{title}`, `{count}`. */
  readonly columnLabel: string;
  /** Column list aria label with a WIP limit; `{title}`, `{count}`, `{limit}`. */
  readonly columnLabelWip: string;
  /** Card aria label; `{title}`, `{column}`. */
  readonly cardLabel: string;
  /** `aria-roledescription` of every card (what a screen reader calls it). */
  readonly cardRoleDescription: string;
  /** The card's edit quick-action button label; `{title}`. */
  readonly editCardAction: string;
  /** The card's delete quick-action button label; `{title}`. */
  readonly deleteCardAction: string;
  /** Hint appended for keyboard users. */
  readonly boardHint: string;
  /** WIP badge title on overflow; `{count}`, `{limit}`. */
  readonly wipExceeded: string;
  /** Overdue due-date badge title; `{date}`. */
  readonly overdue: string;
  /** Empty-board heading. */
  readonly noCards: string;
  /** Empty-board hint under the heading. */
  readonly noCardsHint: string;
  /** Empty-column hint (shown inside an empty column). */
  readonly emptyColumn: string;
  /** The per-column add button's label; `{title}` is the column title. */
  readonly addCardToColumn: string;
  /** Heading shown when a search matches nothing. */
  readonly noSearchResults: string;
  /** The "+ Add column" ghost column's label. */
  readonly addColumn: string;
  /** Placeholder of the new-column name input. */
  readonly addColumnPlaceholder: string;
  /** Card aria label of a selected card; `{title}`, `{column}` (optional, English fallback). */
  readonly cardLabelSelected?: string;
  /** Accessible name of the column-footer quick-add input; `{title}`. */
  readonly quickAddLabel?: string;
  /** Placeholder of the quick-add input. */
  readonly quickAddPlaceholder?: string;
  /** Accessible name of the inline title editor; `{title}`. */
  readonly editTitleLabel?: string;
  /** Checklist badge text for screen readers (ICU plural); `{done}`, `{total}`. */
  readonly checklistProgress?: string;
  /** Count badge of a multi-card drag (ICU plural); `{count}`. */
  readonly dragCount?: string;
  /** Lane header title when the lane exceeds its WIP limit; `{count}`, `{limit}`. */
  readonly laneWipExceeded?: string;
  /** Per-lane cell badge title on overflow; `{count}`, `{limit}`. */
  readonly cellWipExceeded?: string;
  /** Heading shown when the filters match nothing. */
  readonly noFilterResults?: string;
}

/** Live-region announcement templates. */
export interface OgeKanbanAnnouncementMessages {
  readonly cardCreated: string;
  readonly cardUpdated: string;
  readonly cardDeleted: string;
  /** `{title}` moved to `{column}` at `{position}` of `{count}`. */
  readonly cardMoved: string;
  readonly columnMoved: string;
  readonly cancelled: string;
  /** Multi-card move (ICU plural); `{count}`, `{column}` (optional, English fallback). */
  readonly cardsMoved?: string;
  /** Bulk delete (ICU plural); `{count}`. */
  readonly cardsDeleted?: string;
  /** Selection size (ICU plural); `{count}`. */
  readonly selection?: string;
  /** Cross-board transfer (ICU plural); `{count}`, `{board}`, `{column}`. */
  readonly cardsTransferred?: string;
  /** Undo applied. */
  readonly undone?: string;
  /** Redo applied. */
  readonly redone?: string;
  /** Column sort changed; `{column}`, `{field}`. */
  readonly sorted?: string;
}

/** Column headers of the CSV / Excel card export. */
export interface OgeKanbanExportMessages {
  readonly sheetName: string;
  readonly key: string;
  readonly title: string;
  readonly column: string;
  readonly swimlane: string;
  readonly description: string;
  readonly tags: string;
  readonly assignees: string;
  readonly priority: string;
  readonly dueDate: string;
  readonly checklist: string;
}

/** Every user-facing string of the Kanban (house i18n rule). */
export interface OgeKanbanMessages {
  readonly toolbar: OgeKanbanToolbarMessages;
  readonly menu: OgeKanbanMenuMessages;
  readonly dialog: OgeKanbanDialogMessages;
  readonly board: OgeKanbanBoardMessages;
  readonly announcements: OgeKanbanAnnouncementMessages;
  /** Export column headers (added after 1.1 — optional, English fallback). */
  readonly export?: OgeKanbanExportMessages;
}

/**
 * The catalog with every optional key filled from the English defaults —
 * what both render layers read (see {@link fillKanbanMessages}).
 */
export interface OgeKanbanResolvedMessages {
  readonly toolbar: Required<OgeKanbanToolbarMessages>;
  readonly menu: Required<OgeKanbanMenuMessages>;
  readonly dialog: OgeKanbanDialogMessages;
  readonly board: Required<OgeKanbanBoardMessages>;
  readonly announcements: Required<OgeKanbanAnnouncementMessages>;
  readonly export: OgeKanbanExportMessages;
}

export const OGE_DEFAULT_KANBAN_MESSAGES: OgeKanbanMessages = {
  toolbar: {
    label: 'Kanban toolbar',
    addCard: 'New card',
    collapseAll: 'Collapse all',
    expandAll: 'Expand all',
    searchLabel: 'Search cards',
    searchPlaceholder: 'Search…',
    clearSearch: 'Clear search',
    undo: 'Undo',
    redo: 'Redo',
    filterLabel: 'Filters',
    tagsFilter: 'Tags',
    assigneesFilter: 'Assignees',
    priorityFilter: 'Priority',
    clearFilters: 'Clear filters',
  },
  menu: {
    editCard: 'Edit',
    deleteCard: 'Delete',
    moveTo: 'Move to',
    addCard: 'New card',
    collapseColumn: 'Collapse column',
    expandColumn: 'Expand column',
    sortBy: 'Sort by',
    sortManual: 'Manual order',
    sortTitle: 'Title',
    sortPriority: 'Priority',
    sortDueDate: 'Due date',
    sortAscending: 'Ascending',
    sortDescending: 'Descending',
    sortColumn: 'Column options: {title}',
    selectAll: 'Select all in column',
    moveToBoard: 'Move to {board}',
  },
  dialog: {
    titleNew: 'New card',
    titleEdit: 'Edit card',
    titleLabel: 'Title',
    titlePlaceholder: 'Add a title',
    descriptionLabel: 'Description',
    columnLabel: 'Column',
    swimlaneLabel: 'Swimlane',
    colorLabel: 'Color',
    tagsLabel: 'Tags',
    assigneesLabel: 'Assigned to',
    dueDateLabel: 'Due date',
    priorityLabel: 'Priority',
    save: 'Save',
    cancel: 'Cancel',
    deleteCard: 'Delete',
    titleRequired: 'A title is required',
  },
  board: {
    boardLabel: 'Kanban board',
    columnLabel: '{title}, {count} cards',
    columnLabelWip: '{title}, {count} of {limit} cards',
    cardLabel: '{title}, in {column}',
    cardRoleDescription: 'card',
    editCardAction: 'Edit {title}',
    deleteCardAction: 'Delete {title}',
    boardHint: 'Press Escape then Tab to leave the board',
    wipExceeded: '{count} cards exceed the limit of {limit}',
    overdue: 'Overdue since {date}',
    noCards: 'No cards yet',
    noCardsHint: 'Create your first card to get started',
    emptyColumn: 'No cards',
    addCardToColumn: 'Add a card to {title}',
    noSearchResults: 'No cards match your search',
    addColumn: 'Add column',
    addColumnPlaceholder: 'Column name',
    cardLabelSelected: '{title}, in {column}, selected',
    quickAddLabel: 'New card title in {title}',
    quickAddPlaceholder: 'Enter a title, then press Enter',
    editTitleLabel: 'Title of {title}',
    checklistProgress:
      '{done} of {total, plural, one {# checklist item} other {# checklist items}} done',
    dragCount: '{count, plural, one {# card} other {# cards}}',
    laneWipExceeded: '{count} cards exceed the lane limit of {limit}',
    cellWipExceeded: '{count} cards exceed the limit of {limit} in this lane',
    noFilterResults: 'No cards match the filters',
  },
  announcements: {
    cardCreated: '{title} created',
    cardUpdated: '{title} updated',
    cardDeleted: '{title} deleted',
    cardMoved: '{title} moved to {column}, position {position} of {count}',
    columnMoved: '{title} column moved to position {position}',
    cancelled: 'Cancelled',
    cardsMoved:
      '{count, plural, one {# card} other {# cards}} moved to {column}',
    cardsDeleted: '{count, plural, one {# card} other {# cards}} deleted',
    selection: '{count, plural, one {# card} other {# cards}} selected',
    cardsTransferred:
      '{count, plural, one {# card} other {# cards}} moved to {board}, {column}',
    undone: 'Undone',
    redone: 'Redone',
    sorted: '{column} sorted by {field}',
  },
  export: {
    sheetName: 'Cards',
    key: 'Key',
    title: 'Title',
    column: 'Column',
    swimlane: 'Swimlane',
    description: 'Description',
    tags: 'Tags',
    assignees: 'Assignees',
    priority: 'Priority',
    dueDate: 'Due date',
    checklist: 'Checklist',
  },
};

const DEFAULT_EXPORT_MESSAGES = OGE_DEFAULT_KANBAN_MESSAGES
  .export as OgeKanbanExportMessages;

function stripUndefined<T extends object>(value: T | undefined): Partial<T> {
  const result: Partial<T> = {};
  if (value === undefined) return result;
  for (const [key, entry] of Object.entries(value)) {
    if (entry !== undefined) (result as Record<string, unknown>)[key] = entry;
  }
  return result;
}

/**
 * Fills every optional key a catalog may omit from the English defaults —
 * the keys added after 1.1 (undo/redo, filter chips, sorting, quick add,
 * checklists, multi-select, transfers, export headers) — so the render
 * layers read `messages.board.quickAddLabel` without a fallback at each
 * use. A locale pack that predates a key keeps type-checking and falls back
 * to English; the strings it does supply win.
 */
export function fillKanbanMessages(
  messages: OgeKanbanMessages,
): OgeKanbanResolvedMessages {
  const defaults = OGE_DEFAULT_KANBAN_MESSAGES;
  return {
    toolbar: {
      ...defaults.toolbar,
      ...stripUndefined(messages.toolbar),
    } as Required<OgeKanbanToolbarMessages>,
    menu: {
      ...defaults.menu,
      ...stripUndefined(messages.menu),
    } as Required<OgeKanbanMenuMessages>,
    dialog: messages.dialog,
    board: {
      ...defaults.board,
      ...stripUndefined(messages.board),
    } as Required<OgeKanbanBoardMessages>,
    announcements: {
      ...defaults.announcements,
      ...stripUndefined(messages.announcements),
    } as Required<OgeKanbanAnnouncementMessages>,
    export: { ...DEFAULT_EXPORT_MESSAGES, ...stripUndefined(messages.export) },
  };
}

/** Configuration of every Kanban in a provider's scope (DI or React context). */
export interface OgeKanbanConfig {
  readonly messages: OgeKanbanMessages;
  /** BCP 47 locale for every `Intl` format; unset = the browser locale. */
  readonly locale?: string;
  /** Card height in px (fixed — enables per-column virtualization). */
  readonly cardHeight?: number;
}

export const OGE_DEFAULT_KANBAN_CONFIG: OgeKanbanConfig = {
  messages: OGE_DEFAULT_KANBAN_MESSAGES,
  cardHeight: 112,
};

/** What a provider accepts: every field optional, `messages` by block. */
export type OgeKanbanConfigInput = Partial<
  Omit<OgeKanbanConfig, 'messages'>
> & {
  messages?: Partial<OgeKanbanMessages>;
};

/**
 * Merges a config input over `base` (the defaults, or an enclosing React
 * provider's resolved config). `messages` merge one level deep: a partial
 * `messages` replaces whole nested blocks, exactly like the Angular provider
 * always has.
 */
export function resolveOgeKanbanConfig(
  config: OgeKanbanConfigInput | undefined,
  base: OgeKanbanConfig = OGE_DEFAULT_KANBAN_CONFIG,
): OgeKanbanConfig {
  if (config === undefined) return base;
  const { messages, ...rest } = config;
  return {
    ...base,
    ...rest,
    messages: { ...base.messages, ...messages },
  };
}

/** Per-instance messages: the resolved config overlaid by the `messages` prop/input. */
export function mergeOgeKanbanMessages(
  config: OgeKanbanConfig,
  overrides: Partial<OgeKanbanMessages> | undefined,
): OgeKanbanMessages {
  return { ...config.messages, ...overrides };
}
