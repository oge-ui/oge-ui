import { OGE_DEFAULT_SCHEDULER_MESSAGES } from './config';
import {
  normalizeAppointment,
  resolveSchedulerFields,
  type SchedulerAppointment,
} from './scheduler-model';
import {
  resolveActiveSchedulerView,
  resolveSchedulerViews,
  schedulerPeriodTitle,
} from './shell';
import {
  OGE_SCHEDULER_TIMELINE_LANE_PX,
  buildGroupedTimelineRows,
  buildHorizontalTimelineRow,
  buildTimelineGrid,
  layoutTimelineBars,
  shouldVirtualizeTimeline,
  timelineBlockDragMove,
  timelineBlockedBoxes,
  timelineDateAt,
  timelineHeaderCells,
  timelineHourLabels,
  timelineOffHoursBoxes,
  timelineRowHeight,
  timelineRowIdReader,
  timelineVirtualWindow,
} from './timeline-vm';
import {
  buildMonthGrid,
  buildTimeGrid,
  isTimelineView,
  navigateDate,
  normalizeIntervalCount,
  viewRange,
} from './view-model';
import {
  resolveMinimalDays,
  schedulerWeekNumber,
  schedulerWeekNumberTexts,
  weekNumberOf,
  weekNumbersOfDays,
} from './week-number';
import { buildGroupLeaves, resolveGroupLevels } from './grouping';

interface Item {
  id: number;
  text: string;
  startDate: Date;
  endDate: Date;
  allDay?: boolean;
  room?: string;
  owner?: string;
}

const fields = resolveSchedulerFields<Item>({
  textExpr: 'text',
  startDateExpr: 'startDate',
  endDateExpr: 'endDate',
  allDayExpr: 'allDay',
  colorExpr: 'color',
  locationExpr: 'location',
  descriptionExpr: 'description',
  reminderExpr: 'reminder',
  recurrenceRuleExpr: 'recurrenceRule',
  recurrenceExceptionExpr: 'recurrenceException',
  disabledExpr: 'disabled',
});

const appt = (item: Item): SchedulerAppointment<Item> =>
  normalizeAppointment(item, item.id, fields) as SchedulerAppointment<Item>;

const toolbar = OGE_DEFAULT_SCHEDULER_MESSAGES.toolbar;
const defaults = { dayStartHour: 8, dayEndHour: 18, cellDuration: 30 };

describe('interval counts (custom N-day / N-week / N-month views)', () => {
  it('normalizes the interval count', () => {
    expect(normalizeIntervalCount(undefined)).toBe(1);
    expect(normalizeIntervalCount(3.7)).toBe(3);
    expect(normalizeIntervalCount(0)).toBe(1);
    expect(normalizeIntervalCount(Number.NaN)).toBe(1);
  });

  it('a 3-day day view renders three days from the anchor and steps by three', () => {
    const grid = buildTimeGrid({
      anchorDate: new Date(2026, 7, 6, 15),
      view: 'day',
      firstDayOfWeek: 1,
      dayStartHour: 8,
      dayEndHour: 18,
      cellDuration: 30,
      intervalCount: 3,
    });
    expect(grid.days.map((day) => day.getDate())).toEqual([6, 7, 8]);
    expect(grid.rangeEnd).toEqual(new Date(2026, 7, 9));
    expect(viewRange('day', new Date(2026, 7, 6), 1, 7, 3).end).toEqual(
      new Date(2026, 7, 9),
    );
    expect(navigateDate('day', new Date(2026, 7, 6), 1, 7, 3)).toEqual(
      new Date(2026, 7, 9),
    );
  });

  it('a fortnight week view renders 14 days (the work week drops 4 weekend days)', () => {
    const base = {
      anchorDate: new Date(2026, 7, 6),
      firstDayOfWeek: 1,
      dayStartHour: 8,
      dayEndHour: 18,
      cellDuration: 30,
      intervalCount: 2,
    };
    expect(buildTimeGrid({ ...base, view: 'week' }).days).toHaveLength(14);
    expect(
      buildTimeGrid({ ...base, view: 'workWeek', weekendDays: [0, 6] }).days,
    ).toHaveLength(10);
    expect(navigateDate('week', new Date(2026, 7, 6), -1, 7, 2)).toEqual(
      new Date(2026, 6, 23),
    );
  });

  it('a multi-month view spans every week touching its months', () => {
    const quarter = buildMonthGrid(new Date(2026, 7, 15), 1, 3);
    // Aug 1 2026 is a Saturday → the grid starts Mon Jul 27, ends after Oct 31
    expect(quarter.rangeStart).toEqual(new Date(2026, 6, 27));
    expect(quarter.weeks.every((week) => week.length === 7)).toBe(true);
    const last = quarter.weeks[quarter.weeks.length - 1];
    expect(last[0].getTime()).toBeLessThanOrEqual(
      new Date(2026, 9, 31).getTime(),
    );
    expect(last[6].getTime()).toBeGreaterThanOrEqual(
      new Date(2026, 9, 31).getTime(),
    );
    // a single month keeps the fixed six rows
    expect(buildMonthGrid(new Date(2026, 7, 15), 1).weeks).toHaveLength(6);
  });

  it('resolves option entries with their interval and tells same-type entries apart', () => {
    const views = resolveSchedulerViews(
      ['day', { type: 'day', intervalCount: 3, name: '3 days' }, 'week'],
      toolbar,
      defaults,
    );
    expect(views[1]).toMatchObject({
      intervalCount: 3,
      index: 1,
      name: '3 days',
    });
    // currentView alone → the first entry of the type
    expect(
      resolveActiveSchedulerView('day', views, toolbar, defaults).index,
    ).toBe(0);
    // the switcher's pick wins while the type matches
    expect(
      resolveActiveSchedulerView('day', views, toolbar, defaults, 1)
        .intervalCount,
    ).toBe(3);
    expect(
      resolveActiveSchedulerView('week', views, toolbar, defaults, 1).index,
    ).toBe(2);
  });

  it('titles multi-period views as ranges', () => {
    // ICU puts thin / narrow no-break spaces around the range dash
    const plain = (text: string) => text.replace(/\s/g, ' ');
    expect(
      plain(
        schedulerPeriodTitle(
          'day',
          new Date(2026, 7, 6),
          'en-US',
          1,
          7,
          undefined,
          3,
        ),
      ),
    ).toBe('Aug 6 – 8, 2026');
    expect(
      plain(
        schedulerPeriodTitle(
          'month',
          new Date(2026, 7, 6),
          'en-US',
          1,
          7,
          undefined,
          3,
        ),
      ),
    ).toBe('August – October 2026');
    expect(
      schedulerPeriodTitle(
        'timelineMonth',
        new Date(2026, 7, 6),
        'en-US',
        1,
        7,
      ),
    ).toBe('August 2026');
    expect(
      schedulerPeriodTitle('timelineYear', new Date(2026, 7, 6), 'en-US', 1, 7),
    ).toBe('2026');
  });
});

describe('timeline month / year / work week', () => {
  it('knows its timeline views', () => {
    expect(isTimelineView('timelineMonth')).toBe(true);
    expect(isTimelineView('month')).toBe(false);
  });

  it('builds day-scale grids for the month and year timelines', () => {
    const month = buildTimelineGrid(
      'timelineMonth',
      new Date(2026, 1, 10),
      1,
      8,
      18,
      30,
    );
    expect(month.scale).toBe('day');
    expect(month.days).toHaveLength(28); // February 2026
    expect(month.windowEndMinutes - month.windowStartMinutes).toBe(1440);
    const year = buildTimelineGrid(
      'timelineYear',
      new Date(2026, 5, 1),
      1,
      8,
      18,
      30,
    );
    expect(year.days).toHaveLength(365);
    expect(viewRange('timelineYear', new Date(2026, 5, 1), 1)).toEqual({
      start: new Date(2026, 0, 1),
      end: new Date(2027, 0, 1),
    });
    expect(navigateDate('timelineMonth', new Date(2026, 0, 31), 1)).toEqual(
      new Date(2026, 1, 1),
    );
  });

  it('the work-week timeline drops the weekend', () => {
    const grid = buildTimelineGrid(
      'timelineWorkWeek',
      new Date(2026, 7, 6),
      1,
      8,
      18,
      30,
      { weekendDays: [0, 6] },
    );
    expect(grid.scale).toBe('hour');
    expect(grid.days.map((day) => day.getDay())).toEqual([1, 2, 3, 4, 5]);
  });

  it('day-scale bars cover whole days and get one key per bar', () => {
    const grid = buildTimelineGrid(
      'timelineMonth',
      new Date(2026, 7, 1),
      1,
      8,
      18,
      30,
    );
    const { bars } = layoutTimelineBars(
      [
        appt({
          id: 1,
          text: 'Trip',
          startDate: new Date(2026, 7, 3, 14),
          endDate: new Date(2026, 7, 5, 10),
        }),
      ],
      grid,
      1440,
      'day',
    );
    expect(bars).toHaveLength(1);
    expect(bars[0].leftPct).toBeCloseTo((2 / 31) * 100, 5);
    expect(bars[0].widthPct).toBeCloseTo((3 / 31) * 100, 5);
    expect(bars[0].key).toBe('1:2');
  });

  it('year header cells are months; month sub-labels are weekday initials', () => {
    const year = buildTimelineGrid(
      'timelineYear',
      new Date(2026, 0, 1),
      1,
      0,
      24,
      30,
    );
    const cells = timelineHeaderCells(year, 'timelineYear', 'en-US');
    expect(cells).toHaveLength(12);
    expect(cells[0].text).toBe('Jan');
    expect(cells[1].widthPct).toBeCloseTo((28 / 365) * 100, 5);
    const ticks = timelineHourLabels(year, 'timelineYear', 'en-US');
    expect(ticks.map((tick) => tick.text).slice(0, 4)).toEqual([
      '1',
      '8',
      '15',
      '22',
    ]);
    const month = buildTimelineGrid(
      'timelineMonth',
      new Date(2026, 7, 1),
      1,
      0,
      24,
      30,
    );
    expect(timelineHourLabels(month, 'timelineMonth', 'en-US')[0].text).toBe(
      'S',
    );
    expect(timelineHeaderCells(month, 'timelineMonth', 'en-US')[2].text).toBe(
      '3',
    );
  });

  it('maps pointer x to a slot start and shades off hours / blocked ranges', () => {
    const grid = buildTimelineGrid(
      'timelineDay',
      new Date(2026, 7, 6),
      1,
      8,
      18,
      60,
    );
    expect(timelineDateAt(grid, 250, 1000, 60)).toEqual(
      new Date(2026, 7, 6, 10),
    );
    expect(timelineDateAt(grid, 250, 1000, 60, true)).toEqual(
      new Date(2026, 7, 6, 15),
    );
    const off = timelineOffHoursBoxes(grid, { start: 9, end: 17 });
    expect(off.map((box) => [box.leftPct, box.widthPct])).toEqual([
      [0, 10],
      [90, 10],
    ]);
    const blocked = timelineBlockedBoxes(
      grid,
      [
        {
          startDate: new Date(2026, 7, 6, 12),
          endDate: new Date(2026, 7, 6, 13),
          text: 'Lunch',
        },
      ],
      {},
      60,
    );
    expect(blocked).toHaveLength(1);
    expect(blocked[0]).toMatchObject({
      leftPct: 40,
      widthPct: 10,
      text: 'Lunch',
    });
  });
});

describe('grouped timeline rows', () => {
  const resources = [
    {
      fieldExpr: 'room',
      items: [
        { id: 'a', text: 'Room A' },
        { id: 'b', text: 'Room B' },
      ],
    },
    {
      fieldExpr: 'owner',
      items: [
        { id: 'ada', text: 'Ada' },
        { id: 'grace', text: 'Grace' },
      ],
    },
  ];
  const levels = resolveGroupLevels(resources, ['room', 'owner']);
  const leaves = buildGroupLeaves(levels);
  const grid = buildTimelineGrid(
    'timelineDay',
    new Date(2026, 7, 6),
    1,
    8,
    18,
    30,
  );
  const items = [
    appt({
      id: 1,
      text: 'Kickoff',
      startDate: new Date(2026, 7, 6, 9),
      endDate: new Date(2026, 7, 6, 10),
      room: 'b',
      owner: 'grace',
    }),
    appt({
      id: 2,
      text: 'Loose',
      startDate: new Date(2026, 7, 6, 11),
      endDate: new Date(2026, 7, 6, 12),
    }),
  ];

  it('heads each outer level with a group row, then one row per leaf', () => {
    const rows = buildGroupedTimelineRows(
      items,
      grid,
      30,
      levels,
      leaves,
      'Unassigned',
    );
    expect(rows.map((row) => `${row.kind}:${row.text}`)).toEqual([
      'group:Room A',
      'resource:Ada',
      'resource:Grace',
      'group:Room B',
      'resource:Ada',
      'resource:Grace',
      'resource:Unassigned',
    ]);
    expect(rows[5].bars).toHaveLength(1);
    expect(rows[5].values).toEqual({ room: 'b', owner: 'grace' });
    expect(rows[6].bars[0].appointment.text).toBe('Loose');
    // the ctrl-key row id reader finds the leaf object
    const idOf = timelineRowIdReader<Item>(levels, leaves);
    expect(idOf(items[0].source)).toBe(rows[5].id);
  });

  it('a single level keeps the classic rows', () => {
    const single = resolveGroupLevels(resources, ['owner']);
    const rows = buildGroupedTimelineRows(
      items,
      grid,
      30,
      single,
      buildGroupLeaves(single),
      'Unassigned',
    );
    expect(rows.map((row) => row.id)).toEqual(['ada', 'grace', null]);
  });

  it('horizontal grouping lays the leaves out as blocks of one track', () => {
    const single = resolveGroupLevels(resources, ['owner']);
    const rows = buildGroupedTimelineRows(
      items,
      grid,
      30,
      single,
      buildGroupLeaves(single),
      'Unassigned',
    );
    const { row, blocks } = buildHorizontalTimelineRow(rows, 'Unassigned');
    expect(blocks).toHaveLength(3);
    const kickoff = row.bars.find((bar) => bar.appointment.text === 'Kickoff');
    // Grace is block 1 of 3; 09:00 is 10% into an 8–18 day
    expect(kickoff?.leftPct).toBeCloseTo((100 + 10) / 3, 5);
    const move = timelineBlockDragMove(
      items[0],
      500,
      1500,
      grid,
      30,
      (100 + 10) / 3,
      3,
    );
    expect(move.block).toBe(2);
    expect(move.proposal.startDate).toEqual(new Date(2026, 7, 6, 9));
  });

  it('virtualizes on fixed row heights', () => {
    const many = Array.from({ length: 200 }, (_, index) => ({
      id: index,
      text: `R${index}`,
      color: undefined,
      bars: [],
      laneCount: index % 3 === 0 ? 2 : 1,
    }));
    expect(timelineRowHeight(many[0])).toBe(
      9 + 2 * OGE_SCHEDULER_TIMELINE_LANE_PX,
    );
    expect(timelineRowHeight({ ...many[1], kind: 'group' })).toBe(29);
    const window = timelineVirtualWindow(many, 3500, 400, 2);
    expect(window.start).toBeGreaterThan(50);
    expect(window.end - window.start).toBeLessThan(30);
    expect(window.padStart + window.padEnd).toBeLessThan(window.totalHeight);
    // unmeasured (SSR / jsdom): the first rows render
    expect(timelineVirtualWindow(many, 0, 0).end).toBe(40);
    expect(shouldVirtualizeTimeline('auto', 51)).toBe(true);
    expect(shouldVirtualizeTimeline('auto', 50)).toBe(false);
    expect(shouldVirtualizeTimeline(false, 500)).toBe(false);
  });
});

describe('week numbers', () => {
  it('numbers ISO weeks (Monday-first, the 4-day rule)', () => {
    expect(weekNumberOf(new Date(2026, 0, 1), 1, 4)).toBe(1); // Thu
    expect(weekNumberOf(new Date(2021, 0, 3), 1, 4)).toBe(53); // Sun, 2020-W53
    expect(weekNumberOf(new Date(2026, 7, 6), 1, 4)).toBe(32);
    expect(schedulerWeekNumber(new Date(2026, 7, 6), 'iso', 0, 'en-US')).toBe(
      32,
    );
  });

  it('numbers US weeks (Sunday-first, week 1 holds January 1st)', () => {
    expect(weekNumberOf(new Date(2026, 0, 1), 0, 1)).toBe(1);
    expect(weekNumberOf(new Date(2025, 11, 28), 0, 1)).toBe(1); // that week holds Jan 1
    expect(weekNumberOf(new Date(2026, 7, 6), 0, 1)).toBe(32);
  });

  it('reads minimal days from the locale and formats the texts', () => {
    expect([1, 4]).toContain(resolveMinimalDays('de-DE'));
    expect(
      schedulerWeekNumberTexts(32, OGE_DEFAULT_SCHEDULER_MESSAGES.grid),
    ).toEqual({ badge: 'W32', label: 'Week 32' });
    const fortnight = Array.from(
      { length: 14 },
      (_, index) => new Date(2026, 7, 3 + index),
    );
    expect(weekNumbersOfDays(fortnight, 'iso', 1, 'en-US')).toEqual([32, 33]);
  });
});
