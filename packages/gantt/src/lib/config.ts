import { InjectionToken, type Provider } from '@angular/core';

/** Toolbar labels. */
export interface OgeGanttToolbarMessages {
  readonly label: string;
  readonly today: string;
  readonly zoomIn: string;
  readonly zoomOut: string;
  readonly zoomToFit: string;
  readonly expandAll: string;
  readonly collapseAll: string;
  readonly addTask: string;
  readonly undo: string;
  readonly redo: string;
}

/** Default column headers of the task list pane. */
export interface OgeGanttColumnMessages {
  readonly title: string;
  readonly start: string;
  readonly end: string;
  readonly duration: string;
  readonly progress: string;
  /** Duration cell text; `{days}` is the day count. */
  readonly durationDays: string;
}

/** Task dialog labels. */
export interface OgeGanttDialogMessages {
  readonly titleNew: string;
  readonly titleEdit: string;
  readonly titleLabel: string;
  readonly titlePlaceholder: string;
  readonly startLabel: string;
  readonly endLabel: string;
  readonly progressLabel: string;
  readonly colorLabel: string;
  readonly save: string;
  readonly cancel: string;
  readonly deleteTask: string;
  /** Validation message when the end date precedes the start date. */
  readonly endBeforeStart: string;
  /** Label of the resource multi-assignment editor. */
  readonly resourcesLabel: string;
}

/** Built-in context-menu labels. */
export interface OgeGanttMenuMessages {
  readonly newTask: string;
  readonly newSubtask: string;
  readonly editTask: string;
  readonly deleteTask: string;
  readonly indent: string;
  readonly outdent: string;
}

/** Grid/chart aria strings; `{token}` placeholders formatted at render. */
export interface OgeGanttGridMessages {
  /** Accessible name of the task tree pane. */
  readonly treeLabel: string;
  /** Task row aria label; `{title}`, `{start}`, `{end}`, `{progress}`. */
  readonly taskLabel: string;
  /** Dependency aria label; `{from}`, `{to}`, `{type}`. */
  readonly dependencyLabel: string;
  /** Hint appended for keyboard users. */
  readonly treeHint: string;
  /** The today marker's title. */
  readonly todayLabel: string;
  /** Accessible name of the scrollable chart region. */
  readonly chartLabel: string;
  /** Empty-state heading. */
  readonly noTasks: string;
  /** Empty-state hint under the heading. */
  readonly noTasksHint: string;
}

/** Live-region announcement templates. */
export interface OgeGanttAnnouncementMessages {
  readonly taskCreated: string;
  readonly taskUpdated: string;
  readonly taskDeleted: string;
  readonly taskMoved: string;
  readonly taskResized: string;
  readonly progressChanged: string;
  readonly dependencyCreated: string;
  readonly dependencyDeleted: string;
  readonly dependencyRejected: string;
  /** `{title}` indented under `{parent}`. */
  readonly indented: string;
  readonly outdented: string;
  readonly cancelled: string;
  readonly undone: string;
  readonly redone: string;
}

/** Every user-facing string of the Gantt (house i18n rule). */
export interface OgeGanttMessages {
  readonly toolbar: OgeGanttToolbarMessages;
  readonly menu: OgeGanttMenuMessages;
  readonly columns: OgeGanttColumnMessages;
  readonly dialog: OgeGanttDialogMessages;
  readonly grid: OgeGanttGridMessages;
  readonly announcements: OgeGanttAnnouncementMessages;
}

export const OGE_DEFAULT_GANTT_MESSAGES: OgeGanttMessages = {
  toolbar: {
    label: 'Gantt toolbar',
    today: 'Today',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    zoomToFit: 'Zoom to fit',
    expandAll: 'Expand all',
    collapseAll: 'Collapse all',
    addTask: 'New task',
    undo: 'Undo',
    redo: 'Redo',
  },
  menu: {
    newTask: 'New task',
    newSubtask: 'New subtask',
    editTask: 'Edit',
    deleteTask: 'Delete',
    indent: 'Indent (make subtask)',
    outdent: 'Outdent',
  },
  columns: {
    title: 'Task',
    start: 'Start',
    end: 'End',
    duration: 'Duration',
    progress: 'Progress',
    durationDays: '{days}d',
  },
  dialog: {
    titleNew: 'New task',
    titleEdit: 'Edit task',
    titleLabel: 'Title',
    titlePlaceholder: 'Add a title',
    startLabel: 'Start',
    endLabel: 'End',
    progressLabel: 'Progress (%)',
    colorLabel: 'Color',
    save: 'Save',
    cancel: 'Cancel',
    deleteTask: 'Delete',
    endBeforeStart: 'The end date must not precede the start date',
    resourcesLabel: 'Assigned to',
  },
  grid: {
    treeLabel: 'Gantt tasks',
    taskLabel: '{title}, {start} to {end}, {progress}%',
    dependencyLabel: '{type} link from {from} to {to}',
    treeHint: 'Press Escape then Tab to leave the Gantt',
    todayLabel: 'Today',
    chartLabel: 'Gantt chart',
    noTasks: 'No tasks yet',
    noTasksHint: 'Create your first task to get started',
  },
  announcements: {
    taskCreated: '{title} created',
    taskUpdated: '{title} updated',
    taskDeleted: '{title} deleted',
    taskMoved: '{title} moved to {start}',
    taskResized: '{title} now runs from {start} to {end}',
    progressChanged: '{title} progress {progress}%',
    dependencyCreated: 'Link from {from} to {to} created',
    dependencyDeleted: 'Link from {from} to {to} deleted',
    dependencyRejected: 'Link rejected — it would create a cycle',
    indented: '{title} indented under {parent}',
    outdented: '{title} outdented',
    cancelled: 'Cancelled',
    undone: 'Undone',
    redone: 'Redone',
  },
};

/** DI-level configuration of every Gantt in the injector's scope. */
export interface OgeGanttConfig {
  readonly messages: OgeGanttMessages;
  /** BCP 47 locale for every `Intl` format; unset = the browser locale. */
  readonly locale?: string;
  /** Row height in px (fixed — enables row virtualization). */
  readonly rowHeight?: number;
  /** Undo history depth. */
  readonly undoLimit?: number;
}

export const OGE_DEFAULT_GANTT_CONFIG: OgeGanttConfig = {
  messages: OGE_DEFAULT_GANTT_MESSAGES,
  rowHeight: 36,
  undoLimit: 50,
};

export const OGE_GANTT_CONFIG = new InjectionToken<OgeGanttConfig>(
  'OGE_GANTT_CONFIG',
  { factory: () => OGE_DEFAULT_GANTT_CONFIG },
);

export type OgeGanttConfigInput = Partial<Omit<OgeGanttConfig, 'messages'>> & {
  messages?: Partial<OgeGanttMessages>;
};

/**
 * Configures every `<oge-gantt>` below the provider; shallow merge per
 * top-level key (a partial `messages` replaces whole nested blocks).
 */
export function provideOgeGanttConfig(config: OgeGanttConfigInput): Provider {
  const { messages, ...rest } = config;
  return {
    provide: OGE_GANTT_CONFIG,
    useValue: {
      ...OGE_DEFAULT_GANTT_CONFIG,
      ...rest,
      messages: { ...OGE_DEFAULT_GANTT_MESSAGES, ...messages },
    } satisfies OgeGanttConfig,
  };
}
