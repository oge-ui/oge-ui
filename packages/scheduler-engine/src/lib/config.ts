/**
 * The scheduler's message catalog, config shape and defaults — single-sourced
 * here so the Angular (`provideOgeSchedulerConfig()`) and the React
 * (`<OgeSchedulerConfigProvider>`) layers cannot drift (ADR 0003).
 */

/** Labels of the header toolbar (navigation + view switcher). */
export interface OgeSchedulerToolbarMessages {
  /** Accessible name of the header toolbar. */
  readonly label: string;
  /** "Today" button. */
  readonly today: string;
  /** Previous-period button aria label. */
  readonly previous: string;
  /** Next-period button aria label. */
  readonly next: string;
  /** Accessible name of the view-switcher group. */
  readonly viewSwitcherLabel: string;
  /** Aria label of the date-navigator button (opens the calendar). */
  readonly dateNavigatorLabel: string;
  /** The "new appointment" toolbar button. */
  readonly newAppointment: string;
  /**
   * Display names of the built-in views. The three newer timeline views
   * are optional so a catalog written before them still type-checks; a
   * missing name falls back to the English default.
   */
  readonly viewNames: Readonly<
    Record<
      | 'day'
      | 'week'
      | 'workWeek'
      | 'month'
      | 'agenda'
      | 'timelineDay'
      | 'timelineWeek'
      | 'year',
      string
    >
  > &
    Readonly<
      Partial<
        Record<'timelineWorkWeek' | 'timelineMonth' | 'timelineYear', string>
      >
    >;
}

/** Labels of the appointment popup (click on a chip). */
export interface OgeSchedulerPopupMessages {
  /** "Edit" action. */
  readonly edit: string;
  /** "Delete" action. */
  readonly deleteAppointment: string;
  /** "Close" action aria label. */
  readonly close: string;
}

/** Labels of the appointment editor dialog. */
export interface OgeSchedulerEditorMessages {
  /** Dialog title when creating a new appointment. */
  readonly titleNew: string;
  /** Dialog title when editing an existing appointment. */
  readonly titleEdit: string;
  readonly subjectLabel: string;
  /** Placeholder of the subject field. */
  readonly subjectPlaceholder: string;
  readonly locationLabel: string;
  readonly locationPlaceholder: string;
  readonly allDayLabel: string;
  readonly startDateLabel: string;
  readonly endDateLabel: string;
  readonly colorLabel: string;
  readonly descriptionLabel: string;
  readonly descriptionPlaceholder: string;
  readonly save: string;
  readonly cancel: string;
  /** Validation message when the end date is not after the start date. */
  readonly endBeforeStart: string;
  /** Recurrence section labels. */
  readonly repeatLabel: string;
  readonly repeatOptions: Readonly<
    Record<'never' | 'daily' | 'weekly' | 'monthly' | 'yearly', string>
  >;
  readonly intervalLabel: string;
  /** Weekday picker label of the weekly recurrence. */
  readonly repeatOnLabel: string;
  readonly endLabel: string;
  readonly endOptions: Readonly<Record<'never' | 'count' | 'until', string>>;
  readonly countLabel: string;
  readonly untilLabel: string;
  /** Reminder picker labels. */
  readonly reminderLabel: string;
  readonly reminderNone: string;
  readonly reminderAtStart: string;
  /** `{minutes}` is replaced with the lead time. */
  readonly reminderBefore: string;
  /*
   * Recurrence editor depth (optional — a catalog written before them still
   * type-checks; every missing key falls back to the English default).
   */
  /** Label of the monthly/yearly "repeat by" choice. */
  readonly repeatByLabel?: string;
  /** The two monthly/yearly modes: a day of the month, or an nth weekday. */
  readonly repeatByOptions?: Readonly<Record<'day' | 'weekday', string>>;
  /** Label of the day-of-month picker (several days allowed). */
  readonly monthDaysLabel?: string;
  /** The "last day of the month" choice of the day-of-month picker. */
  readonly lastDayOfMonth?: string;
  /** Label of the ordinal ("second", "last") picker. */
  readonly setPosLabel?: string;
  /** Ordinal words for the nth-weekday mode. */
  readonly ordinals?: Readonly<
    Record<'first' | 'second' | 'third' | 'fourth' | 'last', string>
  >;
  /** Label of the weekday picker of the nth-weekday mode. */
  readonly weekdayKindLabel?: string;
  /** The day kinds besides a single weekday ("last weekday"). */
  readonly dayKinds?: Readonly<
    Record<'day' | 'weekday' | 'weekendDay', string>
  >;
  /** Label of the month picker of the yearly rule. */
  readonly yearMonthLabel?: string;
  /** Label of the skipped-occurrences (EXDATE) picker of a series. */
  readonly exceptionsLabel?: string;
  /** Accessible name of the live recurrence summary line. */
  readonly summaryLabel?: string;
  /**
   * The live recurrence summary ("Every 2 weeks on Monday, 10 times"). ICU
   * plurals rendered with `ogeFormatMessage`: `{interval}` and `{count}` are
   * numbers, `{days}`, `{ordinal}`, `{day}`, `{month}` and `{date}` text.
   */
  readonly summary?: Readonly<{
    daily: string;
    weekly: string;
    weeklyOn: string;
    monthlyDay: string;
    monthlyWeekday: string;
    yearlyDay: string;
    yearlyWeekday: string;
    /** `{summary}` is the rule part, `{count}` the occurrence count. */
    count: string;
    /** `{summary}` is the rule part, `{date}` the formatted end date. */
    until: string;
  }>;
}

/** Strings of the occurrence-vs-series scope dialog. */
export interface OgeSchedulerRecurrenceScopeMessages {
  /** Dialog title. */
  readonly title: string;
  /** Body text; `{action}` is the localized action name. */
  readonly text: string;
  readonly editAction: string;
  readonly deleteAction: string;
  readonly moveAction: string;
  /** "Only this appointment" button. */
  readonly occurrence: string;
  /** "The entire series" button. */
  readonly series: string;
  readonly cancel: string;
}

/**
 * Grid-surface strings: aria templates use `{token}` placeholders replaced
 * with `Intl`-formatted values at render time.
 */
/** Built-in context-menu labels. */
export interface OgeSchedulerMenuMessages {
  readonly newAppointment: string;
  readonly edit: string;
  readonly deleteAppointment: string;
}

export interface OgeSchedulerGridMessages {
  /** Accessible name of the scheduler grid; `{period}` is the visible period. */
  readonly gridLabel: string;
  /** Row header of the all-day strip. */
  readonly allDayLabel: string;
  /** Cell aria label; `{date}` full date, `{time}` slot start time. */
  readonly cellLabel: string;
  /** All-day / month cell aria label; `{date}` is the full date. */
  readonly dayCellLabel: string;
  /** Chip aria label; `{text}`, `{start}` and `{end}` are formatted values. */
  readonly appointmentLabel: string;
  /** The "+N more" overflow button; `{count}` is the hidden count. */
  readonly moreLabel: string;
  /** Hint appended to the grid label for keyboard users. */
  readonly gridHint: string;
  /** Empty state of the agenda view. */
  readonly agendaNoData: string;
  /** Timeline row label for appointments without a resource. */
  readonly unassignedLabel: string;
  /*
   * G3 additions (optional — a missing key falls back to the English
   * default, so a catalog written before them still type-checks).
   */
  /** Visual week-number badge; `{week}` is the number (`W32`). */
  readonly weekNumber?: string;
  /** Accessible week-number text; `{week}` is the number. */
  readonly weekNumberLabel?: string;
  /** Appended to the label of a blocked (non-bookable) cell. */
  readonly unavailableLabel?: string;
  /** Appended to the label of a selected appointment chip. */
  readonly selectedLabel?: string;
  /**
   * Accessible name of a month "+N more" button — an ICU plural over
   * `{count}`, `{date}` is the full date.
   */
  readonly moreAppointmentsLabel?: string;
  /** Accessible name of the "+N more" popup; `{date}` is the full date. */
  readonly morePopupLabel?: string;
  /** The "+N more" popup's drill-into-day action. */
  readonly goToDay?: string;
  /** Close button of the "+N more" popup. */
  readonly closeLabel?: string;
}

/** Templates written to the polite live region after actions. */
export interface OgeSchedulerAnnouncementMessages {
  /** After creating; `{text}` is the appointment subject. */
  readonly created: string;
  /** After an update (move/resize/edit); `{text}` is the subject. */
  readonly updated: string;
  /** After a deletion; `{text}` is the subject. */
  readonly deleted: string;
  /** After a keyboard/pointer move lands; `{text}`, `{start}` formatted. */
  readonly moved: string;
  /** After a resize lands; `{text}`, `{start}`, `{end}` formatted. */
  readonly resized: string;
  /** After a gesture is cancelled with Escape. */
  readonly cancelled: string;
  /*
   * G3 additions (optional — a missing key falls back to the English
   * default). Plural keys are ICU messages rendered with `ogeFormatMessage`.
   */
  /** A create/move/resize/drop hit a blocked slot and was refused. */
  readonly slotUnavailable?: string;
  /** A change was refused for overlapping another appointment; `{text}`. */
  readonly conflict?: string;
  /** ICU plural over `{count}`: appointments put on the clipboard. */
  readonly copied?: string;
  /** ICU plural over `{count}`: appointments pasted. */
  readonly pasted?: string;
  /** ICU plural over `{count}`: the selection size after a change. */
  readonly selected?: string;
  /** After Ctrl+Z. */
  readonly undone?: string;
  /** After Ctrl+Y / Ctrl+Shift+Z. */
  readonly redone?: string;
  /** An external item was dropped in; `{text}` is the subject. */
  readonly dropped?: string;
  /**
   * An external item was picked up from the keyboard (or a click) — the
   * single-pointer / keyboard twin of drag-in; `{text}` is its label.
   */
  readonly pickedUp?: string;
}

/** Column headers and words of the PDF / Excel list exports. */
export interface OgeSchedulerExportMessages {
  readonly subject: string;
  readonly start: string;
  readonly end: string;
  readonly allDay: string;
  readonly location: string;
  readonly description: string;
  readonly recurring: string;
  readonly yes: string;
  readonly no: string;
  /** Worksheet name of the Excel export. */
  readonly sheetName: string;
  /** Shown by the PDF export when the period holds no appointment. */
  readonly noData: string;
}

/** Every user-facing string of the scheduler (house i18n rule). */
export interface OgeSchedulerMessages {
  readonly toolbar: OgeSchedulerToolbarMessages;
  readonly popup: OgeSchedulerPopupMessages;
  readonly editor: OgeSchedulerEditorMessages;
  readonly recurrenceScope: OgeSchedulerRecurrenceScopeMessages;
  readonly grid: OgeSchedulerGridMessages;
  readonly menu: OgeSchedulerMenuMessages;
  readonly announcements: OgeSchedulerAnnouncementMessages;
  /** Export headers (optional; English defaults fill a missing block). */
  readonly export?: OgeSchedulerExportMessages;
}

/**
 * The messages as the components read them: every block present and every
 * optional key filled from the English defaults (`mergeSchedulerMessages`).
 */
export interface OgeSchedulerResolvedMessages {
  readonly toolbar: OgeSchedulerToolbarMessages & {
    readonly viewNames: Readonly<
      Record<
        | 'day'
        | 'week'
        | 'workWeek'
        | 'month'
        | 'agenda'
        | 'timelineDay'
        | 'timelineWeek'
        | 'timelineWorkWeek'
        | 'timelineMonth'
        | 'timelineYear'
        | 'year',
        string
      >
    >;
  };
  readonly popup: OgeSchedulerPopupMessages;
  readonly editor: Required<OgeSchedulerEditorMessages>;
  readonly recurrenceScope: OgeSchedulerRecurrenceScopeMessages;
  readonly grid: Required<OgeSchedulerGridMessages>;
  readonly menu: OgeSchedulerMenuMessages;
  readonly announcements: Required<OgeSchedulerAnnouncementMessages>;
  readonly export: OgeSchedulerExportMessages;
}

export const OGE_DEFAULT_SCHEDULER_MESSAGES: OgeSchedulerResolvedMessages = {
  toolbar: {
    label: 'Scheduler toolbar',
    today: 'Today',
    previous: 'Previous period',
    next: 'Next period',
    viewSwitcherLabel: 'Views',
    dateNavigatorLabel: 'Choose a date',
    newAppointment: 'New',
    viewNames: {
      day: 'Day',
      week: 'Week',
      workWeek: 'Work Week',
      month: 'Month',
      agenda: 'Agenda',
      timelineDay: 'Timeline Day',
      timelineWeek: 'Timeline Week',
      timelineWorkWeek: 'Timeline Work Week',
      timelineMonth: 'Timeline Month',
      timelineYear: 'Timeline Year',
      year: 'Year',
    },
  },
  popup: {
    edit: 'Edit',
    deleteAppointment: 'Delete',
    close: 'Close',
  },
  editor: {
    titleNew: 'New appointment',
    titleEdit: 'Edit appointment',
    subjectLabel: 'Subject',
    subjectPlaceholder: 'Add a title',
    locationLabel: 'Location',
    locationPlaceholder: 'Add a location',
    allDayLabel: 'All day',
    startDateLabel: 'Start',
    endDateLabel: 'End',
    colorLabel: 'Color',
    descriptionLabel: 'Description',
    descriptionPlaceholder: 'Add notes',
    save: 'Save',
    cancel: 'Cancel',
    endBeforeStart: 'The end date must be after the start date',
    repeatLabel: 'Repeat',
    repeatOptions: {
      never: 'Never',
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      yearly: 'Yearly',
    },
    intervalLabel: 'Every',
    repeatOnLabel: 'Repeat on',
    endLabel: 'Ends',
    endOptions: { never: 'Never', count: 'After', until: 'On date' },
    countLabel: 'Occurrences',
    untilLabel: 'End date',
    reminderLabel: 'Reminder',
    reminderNone: 'None',
    reminderAtStart: 'At start',
    reminderBefore: '{minutes} minutes before',
    repeatByLabel: 'Repeat by',
    repeatByOptions: { day: 'Day of the month', weekday: 'Day of the week' },
    monthDaysLabel: 'On days',
    lastDayOfMonth: 'Last day',
    setPosLabel: 'On the',
    ordinals: {
      first: 'first',
      second: 'second',
      third: 'third',
      fourth: 'fourth',
      last: 'last',
    },
    weekdayKindLabel: 'Day',
    dayKinds: { day: 'day', weekday: 'weekday', weekendDay: 'weekend day' },
    yearMonthLabel: 'Month',
    exceptionsLabel: 'Skipped occurrences',
    summaryLabel: 'Recurrence summary',
    summary: {
      daily: '{interval, plural, one {Every day} other {Every # days}}',
      weekly: '{interval, plural, one {Every week} other {Every # weeks}}',
      weeklyOn:
        '{interval, plural, one {Every week} other {Every # weeks}} on {days}',
      monthlyDay:
        '{interval, plural, one {Every month} other {Every # months}} on day {days}',
      monthlyWeekday:
        '{interval, plural, one {Every month} other {Every # months}} on the {ordinal} {day}',
      yearlyDay:
        '{interval, plural, one {Every year} other {Every # years}} on {month} {days}',
      yearlyWeekday:
        '{interval, plural, one {Every year} other {Every # years}} on the {ordinal} {day} of {month}',
      count: '{summary}, {count, plural, one {once} other {# times}}',
      until: '{summary}, until {date}',
    },
  },
  recurrenceScope: {
    title: 'Recurring appointment',
    text: 'Apply the {action} to this appointment only, or to the entire series?',
    editAction: 'change',
    deleteAction: 'deletion',
    moveAction: 'move',
    occurrence: 'Only this appointment',
    series: 'The entire series',
    cancel: 'Cancel',
  },
  menu: {
    newAppointment: 'New appointment',
    edit: 'Edit',
    deleteAppointment: 'Delete',
  },
  grid: {
    gridLabel: 'Scheduler, {period}',
    allDayLabel: 'All day',
    cellLabel: '{date}, {time}',
    dayCellLabel: '{date}',
    appointmentLabel: '{text}, {start} to {end}',
    moreLabel: '+{count} more',
    gridHint: 'Press Escape then Tab to leave the scheduler',
    agendaNoData: 'No appointments in this period',
    unassignedLabel: 'Unassigned',
    weekNumber: 'W{week}',
    weekNumberLabel: 'Week {week}',
    unavailableLabel: 'unavailable',
    selectedLabel: 'selected',
    moreAppointmentsLabel:
      '{count, plural, one {# more appointment} other {# more appointments}} on {date}',
    morePopupLabel: 'Appointments on {date}',
    goToDay: 'Go to day',
    closeLabel: 'Close',
  },
  announcements: {
    created: '{text} created',
    updated: '{text} updated',
    deleted: '{text} deleted',
    moved: '{text} moved to {start}',
    resized: '{text} now lasts from {start} to {end}',
    cancelled: 'Cancelled',
    slotUnavailable: 'That time is unavailable',
    conflict: '{text} overlaps another appointment',
    copied:
      '{count, plural, one {# appointment copied} other {# appointments copied}}',
    pasted:
      '{count, plural, one {# appointment pasted} other {# appointments pasted}}',
    selected:
      '{count, plural, =0 {Selection cleared} one {# appointment selected} other {# appointments selected}}',
    undone: 'Undone',
    redone: 'Redone',
    dropped: '{text} added',
    pickedUp:
      'Picked up {text}. Focus a scheduler cell and press Enter to place it, or Escape to cancel.',
  },
  export: {
    subject: 'Subject',
    start: 'Start',
    end: 'End',
    allDay: 'All day',
    location: 'Location',
    description: 'Description',
    recurring: 'Recurring',
    yes: 'Yes',
    no: 'No',
    sheetName: 'Appointments',
    noData: 'No appointments in this period',
  },
};

/**
 * Fills every optional key a catalog may omit from the English defaults —
 * the newer view names, the recurrence-editor strings, the G3 grid and
 * announcement keys and the export block — so the components can read
 * `messages.grid.unavailableLabel` without a fallback at each use. Blocks a
 * catalog supplies keep its own strings; only the gaps are filled.
 */
export function fillSchedulerMessages(
  messages: OgeSchedulerMessages,
): OgeSchedulerResolvedMessages {
  const defaults = OGE_DEFAULT_SCHEDULER_MESSAGES;
  return {
    toolbar: {
      ...defaults.toolbar,
      ...messages.toolbar,
      viewNames: {
        ...defaults.toolbar.viewNames,
        ...messages.toolbar.viewNames,
      },
    },
    popup: messages.popup,
    editor: {
      ...defaults.editor,
      ...stripUndefined(messages.editor),
    } as Required<OgeSchedulerEditorMessages>,
    recurrenceScope: messages.recurrenceScope,
    grid: {
      ...defaults.grid,
      ...stripUndefined(messages.grid),
    } as Required<OgeSchedulerGridMessages>,
    menu: messages.menu,
    announcements: {
      ...defaults.announcements,
      ...stripUndefined(messages.announcements),
    } as Required<OgeSchedulerAnnouncementMessages>,
    export: { ...defaults.export, ...stripUndefined(messages.export ?? {}) },
  };
}

function stripUndefined<T extends object>(value: T): Partial<T> {
  const result: Partial<T> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry !== undefined) (result as Record<string, unknown>)[key] = entry;
  }
  return result;
}

/** DI-level configuration of every scheduler in the injector's scope. */
export interface OgeSchedulerConfig {
  readonly messages: OgeSchedulerMessages;
  /** BCP 47 locale for every `Intl` format; unset = the browser locale. */
  readonly locale?: string;
  /** Minimum rendered height of a chip, in minutes of the slot raster. */
  readonly minAppointmentMinutes?: number;
}

export const OGE_DEFAULT_SCHEDULER_CONFIG: OgeSchedulerConfig = {
  messages: OGE_DEFAULT_SCHEDULER_MESSAGES,
  minAppointmentMinutes: 15,
};

export type OgeSchedulerConfigInput = Partial<
  Omit<OgeSchedulerConfig, 'messages'>
> & {
  messages?: Partial<OgeSchedulerMessages>;
};

/**
 * Merges a config input over `base` (the defaults, or an enclosing
 * provider's resolved config). The merge is shallow per top-level key: a
 * partial `messages` replaces whole nested blocks (`toolbar`, `editor`, …),
 * not individual strings.
 */
export function resolveOgeSchedulerConfig(
  config: OgeSchedulerConfigInput | undefined,
  base: OgeSchedulerConfig = OGE_DEFAULT_SCHEDULER_CONFIG,
): OgeSchedulerConfig {
  const { messages, ...rest } = config ?? {};
  return {
    ...base,
    ...rest,
    messages: { ...base.messages, ...messages },
  };
}
