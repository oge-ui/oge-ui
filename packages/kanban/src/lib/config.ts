import { InjectionToken, type Provider } from '@angular/core';

/** Toolbar labels. */
export interface OgeKanbanToolbarMessages {
  readonly label: string;
  readonly addCard: string;
  readonly collapseAll: string;
  readonly expandAll: string;
  readonly searchLabel: string;
  readonly searchPlaceholder: string;
  readonly clearSearch: string;
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
  /** Column listbox aria label; `{title}`, `{count}`. */
  readonly columnLabel: string;
  /** Column listbox aria label with a WIP limit; `{title}`, `{count}`, `{limit}`. */
  readonly columnLabelWip: string;
  /** Card aria label; `{title}`, `{column}`. */
  readonly cardLabel: string;
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
}

/** Every user-facing string of the Kanban (house i18n rule). */
export interface OgeKanbanMessages {
  readonly toolbar: OgeKanbanToolbarMessages;
  readonly menu: OgeKanbanMenuMessages;
  readonly dialog: OgeKanbanDialogMessages;
  readonly board: OgeKanbanBoardMessages;
  readonly announcements: OgeKanbanAnnouncementMessages;
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
  },
  menu: {
    editCard: 'Edit',
    deleteCard: 'Delete',
    moveTo: 'Move to',
    addCard: 'New card',
    collapseColumn: 'Collapse column',
    expandColumn: 'Expand column',
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
  },
  announcements: {
    cardCreated: '{title} created',
    cardUpdated: '{title} updated',
    cardDeleted: '{title} deleted',
    cardMoved: '{title} moved to {column}, position {position} of {count}',
    columnMoved: '{title} column moved to position {position}',
    cancelled: 'Cancelled',
  },
};

/** DI-level configuration of every Kanban in the injector's scope. */
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

export const OGE_KANBAN_CONFIG = new InjectionToken<OgeKanbanConfig>(
  'OGE_KANBAN_CONFIG',
  { factory: () => OGE_DEFAULT_KANBAN_CONFIG },
);

export type OgeKanbanConfigInput = Partial<
  Omit<OgeKanbanConfig, 'messages'>
> & {
  messages?: Partial<OgeKanbanMessages>;
};

/**
 * Configures every `<oge-kanban>` below the provider; shallow merge per
 * top-level key (a partial `messages` replaces whole nested blocks).
 */
export function provideOgeKanbanConfig(config: OgeKanbanConfigInput): Provider {
  const { messages, ...rest } = config;
  return {
    provide: OGE_KANBAN_CONFIG,
    useValue: {
      ...OGE_DEFAULT_KANBAN_CONFIG,
      ...rest,
      messages: { ...OGE_DEFAULT_KANBAN_MESSAGES, ...messages },
    } satisfies OgeKanbanConfig,
  };
}
