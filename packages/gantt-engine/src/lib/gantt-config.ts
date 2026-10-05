/**
 * The Gantt's message catalog, config shape and defaults — single-sourced
 * here so the Angular `provideOgeGanttConfig()` and the React
 * `<OgeGanttConfigProvider>` resolve exactly the same values.
 */

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
  /** Accessible name of the zoom-preset chooser. */
  readonly scale?: string;
  /** The resource-view toggle button. */
  readonly resourceView?: string;
  /** Accessible name of the baseline chooser. */
  readonly baseline?: string;
  /** Placeholder / accessible name of the search box. */
  readonly search?: string;
}

/** Zoom-preset names and the coarse-scale header labels. */
export interface OgeGanttScaleMessages {
  readonly hours: string;
  readonly days: string;
  readonly weeks: string;
  readonly months: string;
  readonly quarters: string;
  readonly years: string;
  /** Quarter cell label; `{quarter}` is 1–4. */
  readonly quarterLabel: string;
  /** Decade header label; `{start}`, `{end}` years. */
  readonly decadeLabel: string;
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
  readonly wbs?: string;
  readonly predecessors?: string;
  readonly totalSlack?: string;
  readonly freeSlack?: string;
  readonly constraint?: string;
  readonly deadline?: string;
  readonly resources?: string;
  readonly units?: string;
  readonly effort?: string;
  /** Slack cell text; `{days}` (may be fractional or negative). */
  readonly slackDays?: string;
  /** Work cell text; `{hours}`. */
  readonly effortHours?: string;
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
  readonly manualLabel?: string;
  readonly constraintTypeLabel?: string;
  readonly constraintDateLabel?: string;
  readonly deadlineLabel?: string;
  /** Assignment units (%) — applies to every assigned resource. */
  readonly unitsLabel?: string;
  /** Work in hours (effort-driven scheduling). */
  readonly effortLabel?: string;
}

/** Scheduling vocabulary: constraint names, conflicts, lag suffixes. */
export interface OgeGanttSchedulingMessages {
  readonly constraintTypes: Readonly<
    Record<
      'ASAP' | 'ALAP' | 'SNET' | 'SNLT' | 'FNET' | 'FNLT' | 'MSO' | 'MFO',
      string
    >
  >;
  /** Dependency type names (`FS` …). */
  readonly dependencyTypes: Readonly<Record<'FS' | 'SS' | 'FF' | 'SF', string>>;
  /** Lag suffixes: `{value}` is the amount. */
  readonly lagDays: string;
  readonly lagHours: string;
  /** Deadline marker title; `{date}`. */
  readonly deadline: string;
  /** Appended to an overdue task's label. */
  readonly overdue: string;
  /** Appended to a manually scheduled task's label. */
  readonly manual: string;
  /** Conflict texts; `{title}`, `{type}`, `{constraint}`, `{date}`. */
  readonly conflictDependency: string;
  readonly conflictConstraint: string;
  readonly conflictDeadline: string;
  /** Plural count of conflicts (ICU). */
  readonly conflictCount: string;
  /** Status-date marker title. */
  readonly statusDate: string;
}

/** The dependency editor (double-click an arrow, or Enter on a selected one). */
export interface OgeGanttDependencyEditorMessages {
  readonly title: string;
  readonly typeLabel: string;
  readonly lagLabel: string;
  readonly unitLabel: string;
  readonly days: string;
  readonly hours: string;
  readonly save: string;
  readonly cancel: string;
  readonly delete: string;
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
  /** Filter-row cell name; `{column}`. */
  readonly filterLabel?: string;
  /** Keyboard hint on the column headers. */
  readonly headerHint?: string;
  /** Inline cell editor name; `{column}`, `{title}`. */
  readonly cellEditorLabel?: string;
  /** Accessible name of the utilization histogram. */
  readonly histogramLabel?: string;
  /** One histogram row; `{resource}`, `{peak}`, `{count}` (ICU plural). */
  readonly histogramRow?: string;
  /** Resource-view group of tasks without a resource. */
  readonly unassigned?: string;
  /** Baseline chooser: the "hide" option and `{index}` options. */
  readonly baselineNone?: string;
  readonly baselineOption?: string;
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
  /** ICU plurals over `{count}`. */
  readonly tasksDeleted?: string;
  readonly tasksIndented?: string;
  readonly tasksOutdented?: string;
  readonly selectionCount?: string;
  readonly filtered?: string;
  /** `{column}`, `{direction}`. */
  readonly sorted?: string;
  readonly sortAscending?: string;
  readonly sortDescending?: string;
  readonly sortCleared?: string;
  /** `{column}`, `{width}`. */
  readonly columnResized?: string;
  /** `{column}`, `{position}`. */
  readonly columnMoved?: string;
  /** `{column}`. */
  readonly cellInvalid?: string;
  /** `{from}`, `{to}`. */
  readonly dependencyUpdated?: string;
  /** `{index}`. */
  readonly baselineSaved?: string;
  readonly scheduled?: string;
}

/** Every user-facing string of the Gantt (house i18n rule). */
export interface OgeGanttMessages {
  readonly toolbar: OgeGanttToolbarMessages;
  readonly menu: OgeGanttMenuMessages;
  readonly columns: OgeGanttColumnMessages;
  readonly dialog: OgeGanttDialogMessages;
  readonly grid: OgeGanttGridMessages;
  readonly announcements: OgeGanttAnnouncementMessages;
  readonly scales?: Partial<OgeGanttScaleMessages>;
  readonly scheduling?: Partial<OgeGanttSchedulingMessages>;
  readonly dependencyEditor?: Partial<OgeGanttDependencyEditorMessages>;
}

/**
 * The fully populated catalog the core reads: every key added after 1.1 is
 * optional in `OgeGanttMessages` (so a locale pack or a consumer's block that
 * predates it keeps type-checking) and filled from English here.
 */
export interface OgeGanttResolvedMessages {
  readonly toolbar: Required<OgeGanttToolbarMessages>;
  readonly menu: OgeGanttMenuMessages;
  readonly columns: Required<OgeGanttColumnMessages>;
  readonly dialog: Required<OgeGanttDialogMessages>;
  readonly grid: Required<OgeGanttGridMessages>;
  readonly announcements: Required<OgeGanttAnnouncementMessages>;
  readonly scales: OgeGanttScaleMessages;
  readonly scheduling: OgeGanttSchedulingMessages;
  readonly dependencyEditor: OgeGanttDependencyEditorMessages;
}

export const OGE_DEFAULT_GANTT_MESSAGES: OgeGanttResolvedMessages = {
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
    scale: 'Timeline scale',
    resourceView: 'Resource view',
    baseline: 'Baseline',
    search: 'Search tasks',
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
    wbs: 'WBS',
    predecessors: 'Predecessors',
    totalSlack: 'Total slack',
    freeSlack: 'Free slack',
    constraint: 'Constraint',
    deadline: 'Deadline',
    resources: 'Resources',
    units: 'Units',
    effort: 'Work',
    slackDays: '{days}d',
    effortHours: '{hours}h',
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
    manualLabel: 'Manually scheduled',
    constraintTypeLabel: 'Constraint',
    constraintDateLabel: 'Constraint date',
    deadlineLabel: 'Deadline',
    unitsLabel: 'Units (%)',
    effortLabel: 'Work (hours)',
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
    filterLabel: 'Filter {column}',
    headerHint:
      'Enter sorts, Alt+Left or Alt+Right resizes, Ctrl+Shift+Left or Ctrl+Shift+Right moves the column',
    cellEditorLabel: '{column} of {title}',
    histogramLabel: 'Resource utilization',
    histogramRow:
      '{resource}: peak {peak}%, {count, plural, =0 {never over capacity} one {over capacity in # period} other {over capacity in # periods}}',
    unassigned: 'Unassigned',
    baselineNone: 'No baseline',
    baselineOption: 'Baseline {index}',
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
    tasksDeleted:
      '{count, plural, one {# task deleted} other {# tasks deleted}}',
    tasksIndented:
      '{count, plural, one {# task indented} other {# tasks indented}}',
    tasksOutdented:
      '{count, plural, one {# task outdented} other {# tasks outdented}}',
    selectionCount:
      '{count, plural, =0 {No tasks selected} one {# task selected} other {# tasks selected}}',
    filtered: '{count, plural, one {# task shown} other {# tasks shown}}',
    sorted: 'Sorted by {column}, {direction}',
    sortAscending: 'ascending',
    sortDescending: 'descending',
    sortCleared: 'Sort cleared',
    columnResized: '{column} is {width} pixels wide',
    columnMoved: '{column} moved to position {position}',
    cellInvalid: '{column}: the value was not valid',
    dependencyUpdated: 'Link from {from} to {to} updated',
    baselineSaved: 'Baseline {index} saved',
    scheduled: 'Schedule recalculated',
  },
  scales: {
    hours: 'Hours',
    days: 'Days',
    weeks: 'Weeks',
    months: 'Months',
    quarters: 'Quarters',
    years: 'Years',
    quarterLabel: 'Q{quarter}',
    decadeLabel: '{start}–{end}',
  },
  scheduling: {
    constraintTypes: {
      ASAP: 'As soon as possible',
      ALAP: 'As late as possible',
      SNET: 'Start no earlier than',
      SNLT: 'Start no later than',
      FNET: 'Finish no earlier than',
      FNLT: 'Finish no later than',
      MSO: 'Must start on',
      MFO: 'Must finish on',
    },
    dependencyTypes: {
      FS: 'Finish-to-start',
      SS: 'Start-to-start',
      FF: 'Finish-to-finish',
      SF: 'Start-to-finish',
    },
    lagDays: '{value}d',
    lagHours: '{value}h',
    deadline: 'Deadline {date}',
    overdue: 'overdue',
    manual: 'manually scheduled',
    conflictDependency: '{title} starts before its {type} link allows',
    conflictConstraint: '{title} breaks its constraint: {constraint} {date}',
    conflictDeadline: '{title} finishes after its deadline {date}',
    conflictCount:
      '{count, plural, =0 {No scheduling conflicts} one {# scheduling conflict} other {# scheduling conflicts}}',
    statusDate: 'Status date',
  },
  dependencyEditor: {
    title: 'Edit dependency',
    typeLabel: 'Type',
    lagLabel: 'Lag (negative = lead)',
    unitLabel: 'Unit',
    days: 'Days',
    hours: 'Hours',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete link',
  },
};

function defined<T extends object>(value: T | undefined): Partial<T> {
  const result: Partial<T> = {};
  for (const [key, entry] of Object.entries(value ?? {})) {
    if (entry !== undefined) (result as Record<string, unknown>)[key] = entry;
  }
  return result;
}

/**
 * Deep-fills a (possibly partial, possibly older) catalog from the English
 * defaults: every block, every optional key, and the nested constraint /
 * dependency type maps.
 */
export function fillGanttMessages(
  ...layers: readonly (Partial<OgeGanttMessages> | undefined)[]
): OgeGanttResolvedMessages {
  const d = OGE_DEFAULT_GANTT_MESSAGES;
  const pick = <K extends keyof OgeGanttMessages>(key: K) =>
    layers.map((layer) => defined(layer?.[key] as object | undefined));
  const merge = <T extends object>(base: T, parts: Partial<T>[]): T =>
    Object.assign({}, base, ...parts) as T;
  const scheduling = merge(
    d.scheduling,
    pick('scheduling') as Partial<OgeGanttSchedulingMessages>[],
  );
  return {
    toolbar: merge(d.toolbar, pick('toolbar')),
    menu: merge(d.menu, pick('menu')),
    columns: merge(d.columns, pick('columns')),
    dialog: merge(d.dialog, pick('dialog')),
    grid: merge(d.grid, pick('grid')),
    announcements: merge(d.announcements, pick('announcements')),
    scales: merge(d.scales, pick('scales')),
    scheduling: {
      ...scheduling,
      constraintTypes: merge(
        d.scheduling.constraintTypes,
        layers.map((layer) => defined(layer?.scheduling?.constraintTypes)),
      ),
      dependencyTypes: merge(
        d.scheduling.dependencyTypes,
        layers.map((layer) => defined(layer?.scheduling?.dependencyTypes)),
      ),
    },
    dependencyEditor: merge(d.dependencyEditor, pick('dependencyEditor')),
  };
}

/** Configuration of every Gantt in a provider's scope. */
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

/** A partial config: any key may be omitted, `messages` per block. */
export type OgeGanttConfigInput = Partial<Omit<OgeGanttConfig, 'messages'>> & {
  messages?: Partial<OgeGanttMessages>;
};

/**
 * Merges an input over `base` (the defaults, or an enclosing provider's
 * resolved config): shallow merge per top-level key, `messages` merged one
 * level deep — a partial `messages` replaces whole nested blocks.
 */
export function resolveGanttConfig(
  input: OgeGanttConfigInput | undefined,
  base: OgeGanttConfig = OGE_DEFAULT_GANTT_CONFIG,
): OgeGanttConfig {
  if (!input) return base;
  const { messages, ...rest } = input;
  return {
    ...base,
    ...rest,
    messages: { ...base.messages, ...messages },
  };
}
