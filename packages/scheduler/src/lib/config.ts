import { InjectionToken, type Provider } from '@angular/core';

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
  /** Display names of the built-in views. */
  readonly viewNames: Readonly<
    Record<'day' | 'week' | 'workWeek' | 'month', string>
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
  readonly allDayLabel: string;
  readonly startDateLabel: string;
  readonly endDateLabel: string;
  readonly colorLabel: string;
  readonly descriptionLabel: string;
  readonly save: string;
  readonly cancel: string;
  /** Validation message when the end date is not after the start date. */
  readonly endBeforeStart: string;
}

/**
 * Grid-surface strings: aria templates use `{token}` placeholders replaced
 * with `Intl`-formatted values at render time.
 */
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
}

/** Every user-facing string of the scheduler (house i18n rule). */
export interface OgeSchedulerMessages {
  readonly toolbar: OgeSchedulerToolbarMessages;
  readonly popup: OgeSchedulerPopupMessages;
  readonly editor: OgeSchedulerEditorMessages;
  readonly grid: OgeSchedulerGridMessages;
  readonly announcements: OgeSchedulerAnnouncementMessages;
}

export const OGE_DEFAULT_SCHEDULER_MESSAGES: OgeSchedulerMessages = {
  toolbar: {
    label: 'Scheduler toolbar',
    today: 'Today',
    previous: 'Previous period',
    next: 'Next period',
    viewSwitcherLabel: 'Views',
    dateNavigatorLabel: 'Choose a date',
    viewNames: {
      day: 'Day',
      week: 'Week',
      workWeek: 'Work Week',
      month: 'Month',
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
    allDayLabel: 'All day',
    startDateLabel: 'Start',
    endDateLabel: 'End',
    colorLabel: 'Color',
    descriptionLabel: 'Description',
    save: 'Save',
    cancel: 'Cancel',
    endBeforeStart: 'The end date must be after the start date',
  },
  grid: {
    gridLabel: 'Scheduler, {period}',
    allDayLabel: 'All day',
    cellLabel: '{date}, {time}',
    dayCellLabel: '{date}',
    appointmentLabel: '{text}, {start} to {end}',
    moreLabel: '+{count} more',
    gridHint: 'Press Escape then Tab to leave the scheduler',
  },
  announcements: {
    created: '{text} created',
    updated: '{text} updated',
    deleted: '{text} deleted',
    moved: '{text} moved to {start}',
    resized: '{text} now lasts from {start} to {end}',
    cancelled: 'Cancelled',
  },
};

/** DI-level configuration of every scheduler in the injector's scope. */
export interface OgeSchedulerConfig {
  readonly messages: OgeSchedulerMessages;
  /** Minimum rendered height of a chip, in minutes of the slot raster. */
  readonly minAppointmentMinutes?: number;
}

export const OGE_DEFAULT_SCHEDULER_CONFIG: OgeSchedulerConfig = {
  messages: OGE_DEFAULT_SCHEDULER_MESSAGES,
  minAppointmentMinutes: 15,
};

export const OGE_SCHEDULER_CONFIG = new InjectionToken<OgeSchedulerConfig>(
  'OGE_SCHEDULER_CONFIG',
  {
    factory: () => OGE_DEFAULT_SCHEDULER_CONFIG,
  },
);

export type OgeSchedulerConfigInput = Partial<
  Omit<OgeSchedulerConfig, 'messages'>
> & {
  messages?: Partial<OgeSchedulerMessages>;
};

/**
 * Configures every `<oge-scheduler>` below the provider. The merge is
 * shallow per top-level key: a partial `messages` replaces whole nested
 * blocks (`toolbar`, `editor`, …), not individual strings.
 *
 * ```ts
 * providers: [
 *   provideOgeSchedulerConfig({
 *     messages: { toolbar: { ...OGE_DEFAULT_SCHEDULER_MESSAGES.toolbar, today: 'Now' } },
 *   }),
 * ]
 * ```
 */
export function provideOgeSchedulerConfig(
  config: OgeSchedulerConfigInput,
): Provider {
  const { messages, ...rest } = config;
  return {
    provide: OGE_SCHEDULER_CONFIG,
    useValue: {
      ...OGE_DEFAULT_SCHEDULER_CONFIG,
      ...rest,
      messages: { ...OGE_DEFAULT_SCHEDULER_MESSAGES, ...messages },
    } satisfies OgeSchedulerConfig,
  };
}
