import type { OgeReactiveCell, OgeReactivityAdapter } from '@oge-ui/behavior';
import { ArrayDataSource } from '@oge-ui/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OGE_DEFAULT_SCHEDULER_CONFIG } from './config';
import {
  isOgeSchedulerRangeSource,
  schedulerRangeFilter,
  schedulerRangeKey,
  SchedulerRangeLoader,
  type SchedulerLoadRange,
} from './range-loader';
import {
  OgeSchedulerCore,
  type OgeSchedulerCoreInputs,
} from './scheduler-core';
import type {
  OgeSchedulerDataSource,
  OgeSchedulerLoadOptions,
  OgeSchedulerView,
} from './scheduler-types';

interface Appt {
  id: number;
  text: string;
  startDate: Date;
  endDate: Date;
  recurrenceRule?: string;
  roomId?: string;
}

const range = (from: number, to: number): SchedulerLoadRange => ({
  startDate: new Date(2026, 0, from),
  endDate: new Date(2026, 0, to),
});

/** A manual deferred per load call. */
function manualLoads() {
  const calls: {
    options: OgeSchedulerLoadOptions;
    resolve: (items: readonly Appt[]) => void;
    reject: (error: unknown) => void;
  }[] = [];
  const load = (options: OgeSchedulerLoadOptions) =>
    new Promise<readonly Appt[]>((resolve, reject) =>
      calls.push({ options, resolve, reject }),
    );
  return { calls, load };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function loaderWith(
  load: (o: OgeSchedulerLoadOptions) => Promise<readonly Appt[]>,
  debounce = 0,
  prefetch = true,
) {
  const seen: {
    data: (readonly Appt[])[];
    loading: boolean[];
    errors: unknown[];
  } = {
    data: [],
    loading: [],
    errors: [],
  };
  const loader = new SchedulerRangeLoader<Appt>({
    load,
    data: (items) => seen.data.push(items),
    loading: (active) => seen.loading.push(active),
    error: (error) => seen.errors.push(error),
    debounce: () => debounce,
    prefetch: () => prefetch,
    cacheSize: () => 3,
  });
  return { loader, seen };
}

describe('SchedulerRangeLoader', () => {
  it('loads the visible range, then prefetches the neighbours', async () => {
    const { calls, load } = manualLoads();
    const { loader, seen } = loaderWith(load);
    loader.request(range(5, 6), [range(4, 5), range(6, 7)]);
    expect(calls).toHaveLength(1);
    expect(seen.loading).toEqual([true]);
    calls[0].resolve([
      { id: 1, text: 'a', startDate: new Date(), endDate: new Date() },
    ]);
    await flush();
    expect(seen.data).toHaveLength(1);
    expect(seen.loading).toEqual([true, false]);
    expect(calls.map((call) => call.options.startDate.getDate())).toEqual([
      5, 4, 6,
    ]);
  });

  it('answers a cached range at once and serves a running prefetch', async () => {
    const { calls, load } = manualLoads();
    const { loader, seen } = loaderWith(load);
    loader.request(range(5, 6), [range(4, 5), range(6, 7)]);
    calls[0].resolve([]);
    await flush();
    // navigate onto the neighbour while its prefetch still runs
    loader.request(range(6, 7), [range(5, 6), range(7, 8)]);
    expect(calls).toHaveLength(3); // no duplicate request
    calls[2].resolve([
      { id: 2, text: 'b', startDate: new Date(), endDate: new Date() },
    ]);
    await flush();
    expect(seen.data.at(-1)?.[0].id).toBe(2);
    // back to the first range: from the cache, no request
    const before = calls.length;
    loader.request(range(5, 6), [range(4, 5), range(6, 7)]);
    expect(seen.data.at(-1)).toEqual([]);
    // only the aborted neighbour prefetch runs again, never the range itself
    expect(
      calls.slice(before).map((call) => call.options.startDate.getDate()),
    ).toEqual([4]);
  });

  it('aborts stale requests and never writes their answers', async () => {
    const { calls, load } = manualLoads();
    const { loader, seen } = loaderWith(load, 0, false);
    loader.request(range(1, 2));
    loader.request(range(10, 11));
    expect(calls[0].options.signal.aborted).toBe(true);
    calls[0].resolve([
      { id: 9, text: 'stale', startDate: new Date(), endDate: new Date() },
    ]);
    calls[1].resolve([]);
    await flush();
    expect(seen.data).toEqual([[]]);
  });

  it('debounces navigation after the first load', async () => {
    vi.useFakeTimers();
    try {
      const { calls, load } = manualLoads();
      const { loader } = loaderWith(load, 150, false);
      loader.request(range(1, 2));
      expect(calls).toHaveLength(1);
      loader.request(range(2, 3));
      loader.request(range(3, 4));
      expect(calls).toHaveLength(1);
      vi.advanceTimersByTime(150);
      expect(calls).toHaveLength(2);
      expect(calls[1].options.startDate.getDate()).toBe(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it('reports failures and reloads on demand', async () => {
    const { calls, load } = manualLoads();
    const { loader, seen } = loaderWith(load, 0, false);
    loader.request(range(1, 2));
    calls[0].reject(new Error('offline'));
    await flush();
    expect(seen.errors.at(-1)).toBeInstanceOf(Error);
    expect(seen.loading.at(-1)).toBe(false);
    loader.reload();
    expect(calls).toHaveLength(2);
    calls[1].resolve([]);
    await flush();
    expect(seen.errors.at(-1)).toBeNull();
  });

  it('evicts the least recently used range', async () => {
    const { calls, load } = manualLoads();
    const { loader } = loaderWith(load, 0, false);
    for (const from of [1, 2, 3, 4]) {
      loader.request(range(from, from + 1));
      calls.at(-1)!.resolve([]);
      await flush();
    }
    expect(loader.cachedKeys()).toHaveLength(3);
    expect(loader.cachedKeys()).not.toContain(schedulerRangeKey(range(1, 2)));
  });

  it('tells range sources from core data sources', () => {
    expect(isOgeSchedulerRangeSource({ load: () => Promise.resolve([]) })).toBe(
      true,
    );
    expect(isOgeSchedulerRangeSource(new ArrayDataSource([]))).toBe(false);
    expect(isOgeSchedulerRangeSource([])).toBe(false);
    expect(isOgeSchedulerRangeSource(null)).toBe(false);
  });

  it('builds an overlap-or-recurring filter for core sources', () => {
    const filter = schedulerRangeFilter(
      { startDate: 'start', endDate: 'end', recurrenceRule: 'rule' },
      range(1, 2),
    );
    expect(filter?.type).toBe('or');
    expect(
      schedulerRangeFilter(
        { startDate: null, endDate: 'end', recurrenceRule: null },
        range(1, 2),
      ),
    ).toBeNull();
  });
});

/* ---------- through the core ---------- */

const PLAIN: OgeReactivityAdapter = {
  cell<V>(initial: V): OgeReactiveCell<V> {
    let value = initial;
    const cell = (() => value) as OgeReactiveCell<V>;
    cell.set = (next) => {
      value = next;
    };
    return cell;
  },
  derived: (compute) => compute,
};

function coreWith(
  source: OgeSchedulerCoreInputs<Appt>['dataSource'] extends () => infer S
    ? S
    : never,
  overrides: Partial<OgeSchedulerCoreInputs<Appt>> = {},
) {
  let date = new Date(2026, 0, 14);
  let view: OgeSchedulerView = 'week';
  const inputs: OgeSchedulerCoreInputs<Appt> = {
    dataSource: () => source,
    keyExpr: () => 'id',
    textExpr: () => 'text',
    startDateExpr: () => 'startDate',
    endDateExpr: () => 'endDate',
    allDayExpr: () => 'allDay',
    colorExpr: () => 'color',
    locationExpr: () => 'location',
    descriptionExpr: () => 'description',
    recurrenceRuleExpr: () => 'recurrenceRule',
    recurrenceExceptionExpr: () => 'recurrenceException',
    disabledExpr: () => 'disabled',
    reminderExpr: () => 'reminder',
    currentDate: () => date,
    currentView: () => view,
    views: () => ['day', 'week', 'month'],
    firstDayOfWeek: () => 1,
    weekendDays: () => undefined,
    dayStartHour: () => 8,
    dayEndHour: () => 18,
    cellDuration: () => 30,
    agendaDuration: () => 7,
    resources: () => [],
    groups: () => [],
    locale: () => 'en-US',
    messages: () => ({}),
    allowAdding: () => true,
    allowUpdating: () => true,
    allowDeleting: () => true,
    allowDragging: () => true,
    allowResizing: () => true,
    readOnly: () => false,
    recurrenceEditMode: () => 'series',
    min: () => undefined,
    max: () => undefined,
    dateNavigatorText: () => undefined,
    ...overrides,
  };
  const noop = () => undefined;
  const core = new OgeSchedulerCore<Appt, unknown>({
    rx: PLAIN,
    inputs,
    config: () => OGE_DEFAULT_SCHEDULER_CONFIG,
    setCurrentDate: (next) => (date = next),
    setCurrentView: (next) => (view = next),
    events: {
      appointmentAdding: noop,
      appointmentAdded: noop,
      appointmentUpdating: noop,
      appointmentUpdated: noop,
      appointmentDeleting: noop,
      appointmentDeleted: noop,
      appointmentClick: noop,
      appointmentDblClick: noop,
      cellClick: noop,
      cellDblClick: noop,
      editorShowing: noop,
      rangeSelected: noop,
      appointmentContextMenu: noop,
      cellContextMenu: noop,
      reminderTriggered: noop,
    },
    surfaces: {
      openPopup: noop,
      closePopup: noop,
      editorItems: () => [],
      openEditor: noop,
      closeEditor: noop,
      hostRect: () => ({ left: 0, top: 0 }),
      focusMenu: noop,
    },
  });
  core.bindSource(source);
  return { core, setView: (next: OgeSchedulerView) => (view = next) };
}

describe('OgeSchedulerCore range loading', () => {
  let calls: OgeSchedulerLoadOptions[];
  let source: OgeSchedulerDataSource<Appt>;
  let rows: Appt[];

  beforeEach(() => {
    calls = [];
    rows = [
      {
        id: 1,
        text: 'Kickoff',
        startDate: new Date(2026, 0, 13, 9),
        endDate: new Date(2026, 0, 13, 10),
      },
    ];
    source = {
      debounce: 0,
      load: (options) => {
        calls.push(options);
        return Promise.resolve({
          data: rows.filter(
            (row) =>
              row.startDate < options.endDate &&
              row.endDate > options.startDate,
          ),
        });
      },
      insert: (item) => {
        rows.push(item);
        return Promise.resolve(item);
      },
    };
  });

  afterEach(() => vi.useRealTimers());

  it('loads the visible week and the neighbouring weeks', async () => {
    const { core } = coreWith(source);
    expect(core.loading()).toBe(true);
    await flush();
    expect(core.loading()).toBe(false);
    expect(core.store().map((row) => row.id)).toEqual([1]);
    expect(calls[0].startDate.getTime()).toBe(new Date(2026, 0, 12).getTime());
    expect(calls[0].endDate.getTime()).toBe(new Date(2026, 0, 19).getTime());
    expect(calls).toHaveLength(3);
    expect(core.loadStatus()).toBe('');
  });

  it('follows navigation from the cache', async () => {
    const { core } = coreWith(source);
    await flush();
    core.navigate(1);
    core.syncRange();
    expect(core.loading()).toBe(false); // prefetched
    expect(core.store()).toEqual([]);
    expect(calls).toHaveLength(4); // only the new far neighbour
  });

  it('writes through insert and reloads the range', async () => {
    const { core } = coreWith(source);
    await flush();
    core.addAppointment({
      id: 2,
      text: 'Added',
      startDate: new Date(2026, 0, 15, 9),
      endDate: new Date(2026, 0, 15, 10),
    });
    await flush();
    await flush();
    expect(
      core
        .store()
        .map((row) => row.id)
        .sort(),
    ).toEqual([1, 2]);
  });

  it('names the grouped resources of the range', async () => {
    coreWith(source, {
      resources: () => [
        {
          fieldExpr: 'roomId',
          items: [
            { id: 'a', text: 'A' },
            { id: 'b', text: 'B' },
          ],
        },
      ],
      groups: () => ['roomId'],
    });
    await flush();
    expect(calls[0].resources).toEqual({ roomId: ['a', 'b'] });
  });

  it('reports a failed load and recovers on reload()', async () => {
    let fail = true;
    const flaky: OgeSchedulerDataSource<Appt> = {
      prefetch: false,
      load: () =>
        fail ? Promise.reject(new Error('down')) : Promise.resolve(rows),
    };
    const { core } = coreWith(flaky);
    await flush();
    expect(core.loadError()).toBe(true);
    expect(core.loadStatus()).toBe(
      OGE_DEFAULT_SCHEDULER_CONFIG.messages.grid.loadErrorLabel,
    );
    fail = false;
    core.reload();
    await flush();
    expect(core.loadError()).toBe(false);
    expect(core.store()).toHaveLength(1);
  });

  it('filters a core DataSource per range with remoteFiltering', async () => {
    const data = new ArrayDataSource<Appt>(
      [
        ...rows,
        {
          id: 5,
          text: 'Far',
          startDate: new Date(2026, 5, 1, 9),
          endDate: new Date(2026, 5, 1, 10),
        },
      ],
      { keyExpr: 'id' },
    );
    const spy = vi.spyOn(data, 'load');
    const { core } = coreWith(data, { remoteFiltering: () => true });
    await flush();
    await flush();
    expect(spy.mock.calls[0][0].filter).toBeTruthy();
    expect(core.store().map((row) => row.id)).toEqual([1]);
  });
});
