import {
  addDays,
  addMonths,
  resolveFirstDayOfWeek,
  startOfDay,
} from '@oge-ui/core';
import type { OgeCalendarRange } from './calendar-core';
import type { OgeInputsMessages } from './input-config';

/**
 * One entry of a date range box's preset list ("Last 7 days", "This
 * month"…). `range` is evaluated when the list renders and when the preset is
 * picked — never at construction — so a page left open past midnight still
 * offers the right "Today".
 */
export interface OgeDateRangePreset {
  /** Visible text. Built-in factories leave it unset and take it from the messages. */
  readonly label?: string;
  /** Stable key; the built-ins use it to look up their message. */
  readonly id?: string;
  readonly range: () => OgeCalendarRange;
}

/** Ids of the built-in presets (`ogeDateRangePresets.*`). */
export type OgeDateRangePresetId =
  | 'today'
  | 'yesterday'
  | 'last7Days'
  | 'last30Days'
  | 'thisWeek'
  | 'lastWeek'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisYear'
  | 'lastYear';

/** Options every built-in factory accepts. */
export interface OgeDateRangePresetOptions {
  /** Overrides the message-catalog label. */
  readonly label?: string;
  /** Clock override — tests and server-rendered "as of" pages. Default `new Date()`. */
  readonly now?: () => Date;
}

/** Week-based factories additionally take the week start. */
export interface OgeDateRangeWeekPresetOptions extends OgeDateRangePresetOptions {
  /** `0`–`6` (Sunday-first); `undefined` resolves from `locale`. */
  readonly firstDayOfWeek?: number;
  /** Locale for the week-start lookup when `firstDayOfWeek` is unset. */
  readonly locale?: string;
}

const PRESET_MESSAGE: Record<OgeDateRangePresetId, keyof OgeInputsMessages> = {
  today: 'presetToday',
  yesterday: 'presetYesterday',
  last7Days: 'presetLast7Days',
  last30Days: 'presetLast30Days',
  thisWeek: 'presetThisWeek',
  lastWeek: 'presetLastWeek',
  thisMonth: 'presetThisMonth',
  lastMonth: 'presetLastMonth',
  thisYear: 'presetThisYear',
  lastYear: 'presetLastYear',
};

function preset(
  id: OgeDateRangePresetId,
  options: OgeDateRangePresetOptions | undefined,
  compute: (today: Date) => OgeCalendarRange,
): OgeDateRangePreset {
  const now = options?.now ?? (() => new Date());
  return {
    id,
    label: options?.label,
    range: () => compute(startOfDay(now())),
  };
}

function weekStart(today: Date, options?: OgeDateRangeWeekPresetOptions): Date {
  const first = resolveFirstDayOfWeek(options?.firstDayOfWeek, options?.locale);
  const offset = (today.getDay() - first + 7) % 7;
  return addDays(today, -offset);
}

/**
 * Built-in preset factories. Each range is whole local days (midnight to
 * midnight) — a `type: 'datetime'` box keeps those times, which is what
 * "last 7 days" means in a report filter.
 *
 * ```ts
 * presets = [ogeDateRangePresets.last7Days(), ogeDateRangePresets.thisMonth(),
 *   { label: 'Q1', range: () => [new Date(2026, 0, 1), new Date(2026, 2, 31)] }];
 * ```
 */
export const ogeDateRangePresets = {
  today: (options?: OgeDateRangePresetOptions) =>
    preset('today', options, (today) => [today, today]),
  yesterday: (options?: OgeDateRangePresetOptions) =>
    preset('yesterday', options, (today) => {
      const day = addDays(today, -1);
      return [day, day];
    }),
  /** The last seven days, today included. */
  last7Days: (options?: OgeDateRangePresetOptions) =>
    preset('last7Days', options, (today) => [addDays(today, -6), today]),
  /** The last thirty days, today included. */
  last30Days: (options?: OgeDateRangePresetOptions) =>
    preset('last30Days', options, (today) => [addDays(today, -29), today]),
  thisWeek: (options?: OgeDateRangeWeekPresetOptions) =>
    preset('thisWeek', options, (today) => {
      const start = weekStart(today, options);
      return [start, addDays(start, 6)];
    }),
  lastWeek: (options?: OgeDateRangeWeekPresetOptions) =>
    preset('lastWeek', options, (today) => {
      const start = addDays(weekStart(today, options), -7);
      return [start, addDays(start, 6)];
    }),
  thisMonth: (options?: OgeDateRangePresetOptions) =>
    preset('thisMonth', options, (today) => {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return [start, addDays(addMonths(start, 1), -1)];
    }),
  lastMonth: (options?: OgeDateRangePresetOptions) =>
    preset('lastMonth', options, (today) => {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return [start, addDays(addMonths(start, 1), -1)];
    }),
  thisYear: (options?: OgeDateRangePresetOptions) =>
    preset('thisYear', options, (today) => [
      new Date(today.getFullYear(), 0, 1),
      new Date(today.getFullYear(), 11, 31),
    ]),
  lastYear: (options?: OgeDateRangePresetOptions) =>
    preset('lastYear', options, (today) => [
      new Date(today.getFullYear() - 1, 0, 1),
      new Date(today.getFullYear() - 1, 11, 31),
    ]),
} as const;

/** Visible label of a preset: its own `label`, else the built-in message, else its `id`. */
export function dateRangePresetLabel(
  item: OgeDateRangePreset,
  messages: OgeInputsMessages,
): string {
  if (item.label !== undefined) return item.label;
  const key =
    item.id !== undefined
      ? PRESET_MESSAGE[item.id as OgeDateRangePresetId]
      : undefined;
  return key ? messages[key] : (item.id ?? '');
}

/** `true` when `range` covers exactly the preset's days (drives `aria-pressed`). */
export function dateRangePresetActive(
  item: OgeDateRangePreset,
  range: OgeCalendarRange,
): boolean {
  const [start, end] = range;
  if (!start || !end) return false;
  const [a, b] = item.range();
  if (!a || !b) return false;
  const day = (date: Date) => startOfDay(date).getTime();
  return day(a) === day(start) && day(b) === day(end);
}
