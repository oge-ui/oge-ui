/**
 * Demo data of the scheduler "Time zones" and "Remote data" pages and their
 * React twins — one data set, so both framework views show the same content.
 * Every date is an instant (`Date.UTC`): the zone a demo shows decides the
 * wall clock. Plain data only: no Angular or React imports.
 */
import { ogeDateTimeFormat } from '@oge-ui/core';
import type {
  OgeSchedulerDataSource,
  OgeSchedulerLoadOptions,
} from '@oge-ui/scheduler-engine';

export type ZoneAppt = Record<string, unknown>;

/** The zones the switcher offers (`''` = the browser's own zone). */
export const DEMO_ZONES: readonly { value: string; text: string }[] = [
  { value: '', text: 'Browser zone' },
  { value: 'America/New_York', text: 'New York (UTC−5 / −4)' },
  { value: 'Europe/Istanbul', text: 'Istanbul (UTC+3)' },
  { value: 'Asia/Kathmandu', text: 'Kathmandu (UTC+5:45)' },
  { value: 'Australia/Lord_Howe', text: 'Lord Howe (UTC+10:30 / +11)' },
];

/** The week the zone switcher opens on (Monday 2 March 2026). */
export const ZONE_DATE = new Date(Date.UTC(2026, 2, 4, 12));

const utc = (day: number, hour: number, minute = 0): Date =>
  new Date(Date.UTC(2026, 2, day, hour, minute));

/** A distributed team: each meeting is pinned to its owner's zone. */
export function zoneAppointments(): ZoneAppt[] {
  return [
    {
      id: 1,
      text: 'New York standup',
      // 09:00 in New York (EST, UTC−5)
      startDate: utc(2, 14),
      endDate: utc(2, 14, 30),
      recurrenceRule: 'FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR',
      startTimeZone: 'America/New_York',
      color: '#2563eb',
    },
    {
      id: 2,
      text: 'Istanbul design review',
      // 14:00 in Istanbul (UTC+3)
      startDate: utc(3, 11),
      endDate: utc(3, 12, 30),
      startTimeZone: 'Europe/Istanbul',
      color: '#16a34a',
    },
    {
      id: 3,
      text: 'Kathmandu support sync',
      // 18:00 in Kathmandu (UTC+5:45)
      startDate: utc(4, 12, 15),
      endDate: utc(4, 13, 15),
      startTimeZone: 'Asia/Kathmandu',
      color: '#ea580c',
    },
    {
      id: 4,
      text: 'Sydney office hours',
      // 08:00 on Lord Howe Island (UTC+11 in March)
      startDate: utc(4, 21),
      endDate: utc(4, 22),
      startTimeZone: 'Australia/Lord_Howe',
      color: '#9333ea',
    },
  ];
}

/** New York's spring-forward day (02:00 → 03:00 on Sunday 8 March 2026). */
export const DST_DATE = new Date(Date.UTC(2026, 2, 8, 17));

/** Appointments around the skipped hour of `DST_DATE`. */
export function dstAppointments(): ZoneAppt[] {
  return [
    {
      id: 1,
      text: 'Night shift (1½ real hours)',
      // 01:00 EST → 03:30 EDT
      startDate: utc(8, 6),
      endDate: utc(8, 7, 30),
      color: '#0891b2',
    },
    {
      id: 2,
      text: 'Brunch',
      // 11:00 EDT
      startDate: utc(8, 15),
      endDate: utc(8, 16, 30),
      color: '#16a34a',
    },
    {
      id: 3,
      text: 'Daily check-in',
      // 09:00 New York every day — before and after the switch
      startDate: utc(6, 14),
      endDate: utc(6, 14, 30),
      recurrenceRule: 'FREQ=DAILY;COUNT=5',
      startTimeZone: 'America/New_York',
      color: '#2563eb',
    },
  ];
}

/* ---------- remote range loading ---------- */

/** One line of the demo's request log. */
export interface RangeLogEntry {
  readonly id: number;
  readonly text: string;
  readonly state: 'loading' | 'loaded' | 'aborted';
}

const TOPICS = ['Planning', 'Review', '1:1', 'Customer call', 'Workshop'];

/** The fake server's appointments of one day: deterministic per date. */
function serverDay(day: Date): ZoneAppt[] {
  const seed =
    day.getUTCFullYear() * 400 + day.getUTCMonth() * 31 + day.getUTCDate();
  const count = 1 + (seed % 3);
  const items: ZoneAppt[] = [];
  for (let index = 0; index < count; index++) {
    const hour = 9 + ((seed + index * 3) % 8);
    const start = new Date(day.getTime() + hour * 3_600_000);
    items.push({
      id: `${day.getTime()}-${index}`,
      text: TOPICS[(seed + index) % TOPICS.length],
      startDate: start,
      endDate: new Date(start.getTime() + 3_600_000),
    });
  }
  return items;
}

/**
 * A range source over a fake server (400 ms latency): `load` returns every
 * appointment of `[startDate, endDate)`, honours `signal`, and reports each
 * request through `log`. Writes go into an overlay the next load applies.
 */
export function createDemoRangeSource(
  log: (entry: RangeLogEntry) => void,
): OgeSchedulerDataSource<ZoneAppt> {
  let next = 0;
  const added: ZoneAppt[] = [];
  const changed = new Map<unknown, Partial<ZoneAppt>>();
  const removed = new Set<unknown>();
  const format = ogeDateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  });
  return {
    debounce: 200,
    load(options: OgeSchedulerLoadOptions) {
      const id = ++next;
      const text = `${format.format(options.startDate)} – ${format.format(
        new Date(options.endDate.getTime() - 1),
      )}`;
      log({ id, text, state: 'loading' });
      return new Promise<ZoneAppt[]>((resolve, reject) => {
        const timer = setTimeout(() => {
          const items: ZoneAppt[] = [];
          for (
            let day = Date.UTC(
              options.startDate.getUTCFullYear(),
              options.startDate.getUTCMonth(),
              options.startDate.getUTCDate(),
            );
            day < options.endDate.getTime();
            day += 86_400_000
          ) {
            items.push(...serverDay(new Date(day)));
          }
          const inRange = (item: ZoneAppt): boolean =>
            (item['startDate'] as Date) < options.endDate &&
            (item['endDate'] as Date) > options.startDate;
          const result = [...items, ...added]
            .filter((item) => !removed.has(item['id']))
            .map((item) => ({ ...item, ...changed.get(item['id']) }))
            .filter(inRange);
          log({ id, text, state: 'loaded' });
          resolve(result);
        }, 400);
        options.signal.addEventListener('abort', () => {
          clearTimeout(timer);
          log({ id, text, state: 'aborted' });
          reject(new DOMException('aborted', 'AbortError'));
        });
      });
    },
    insert(item) {
      const stored = { ...item, id: item['id'] ?? `new-${++next}` };
      added.push(stored);
      return Promise.resolve(stored);
    },
    update(key, patch) {
      changed.set(key, { ...changed.get(key), ...patch });
      return Promise.resolve(patch);
    },
    remove(key) {
      removed.add(key);
      return Promise.resolve();
    },
  };
}
