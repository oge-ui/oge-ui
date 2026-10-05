import {
  buildLayoutAllDayStrip,
  chipHeightPercent,
  chipTopPercent,
  dayWeekLayoutDragMove,
  dayWeekLayoutPreviewBox,
  dayWeekSelectionBox,
  layoutGroupedDayWeekSegments,
} from './day-week-vm';
import {
  buildColumnHeaderRows,
  buildDayWeekGroupLayout,
  buildGroupLeaves,
  buildRowHeaderBlocks,
  dayWeekCellLeaf,
  dayWeekCellValues,
  dayWeekPlacement,
  groupLeafMatcher,
  leafWorkHours,
  resolveGroupLevels,
  resourceValuesOfItem,
} from './grouping';
import {
  normalizeAppointment,
  resolveSchedulerFields,
  type SchedulerAppointment,
} from './scheduler-model';
import type { OgeSchedulerResource } from './scheduler-types';
import { buildTimeGrid } from './view-model';

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

const RESOURCES: OgeSchedulerResource[] = [
  {
    fieldExpr: 'room',
    label: 'Room',
    items: [
      {
        id: 'a',
        text: 'Room A',
        color: '#111111',
        workHours: { start: 7, end: 15 },
      },
      { id: 'b', text: 'Room B' },
    ],
  },
  {
    fieldExpr: 'owner',
    label: 'Owner',
    items: [
      { id: 'ada', text: 'Ada', color: '#7c3aed', workDays: [1, 2, 3] },
      { id: 'grace', text: 'Grace' },
    ],
  },
  { fieldExpr: 'empty', items: [] },
];

const levels = resolveGroupLevels(RESOURCES, [
  'room',
  'owner',
  'empty',
  'room',
]);
const leaves = buildGroupLeaves(levels);
const days = [new Date(2026, 7, 3), new Date(2026, 7, 4)];
const grid = buildTimeGrid({
  anchorDate: new Date(2026, 7, 3),
  view: 'day',
  firstDayOfWeek: 1,
  dayStartHour: 8,
  dayEndHour: 18,
  cellDuration: 30,
  intervalCount: 2,
});

describe('grouping levels and leaves', () => {
  it('keeps resource fields with items, in groups order, once', () => {
    expect(levels.map((level) => level.fieldExpr)).toEqual(['room', 'owner']);
  });

  it('multiplies levels into leaves with values, labels and colors', () => {
    expect(leaves.map((leaf) => leaf.label)).toEqual([
      'Room A, Ada',
      'Room A, Grace',
      'Room B, Ada',
      'Room B, Grace',
    ]);
    expect(leaves[1].values).toEqual({ room: 'a', owner: 'grace' });
    expect(leaves[1].color).toBe('#111111'); // inner level has none
    expect(leaves[0].color).toBe('#7c3aed'); // innermost wins
    expect(buildGroupLeaves([])).toEqual([]);
  });

  it('matches items to leaves exactly (-1 when unassigned)', () => {
    const leafOf = groupLeafMatcher<Item>(levels, leaves);
    expect(leafOf({ room: 'b', owner: 'ada' } as Item)).toBe(2);
    expect(leafOf({ room: 'b' } as Item)).toBe(-1);
    expect(groupLeafMatcher<Item>([], [])({} as Item)).toBe(0);
    expect(resourceValuesOfItem({ room: 'a', other: 1 }, RESOURCES)).toEqual({
      room: 'a',
    });
  });

  it('resolves per-leaf work hours innermost-first over the global ones', () => {
    const global = { start: 9, end: 17 };
    expect(leafWorkHours(leaves[0], global)).toEqual({
      start: 7,
      end: 15,
      days: [1, 2, 3],
    });
    expect(leafWorkHours(leaves[3], global)).toBe(global);
    expect(leafWorkHours(null, null)).toBeNull();
  });
});

describe('day/week group layouts', () => {
  it('resource-major columns (groupByDate: false)', () => {
    const layout = buildDayWeekGroupLayout(days, leaves, {
      groupByDate: false,
    });
    expect(layout.colCount).toBe(8);
    expect(
      layout.columns.map((col) => `${col.resIndex}/${col.dayIndex}`),
    ).toEqual(['0/0', '0/1', '1/0', '1/1', '2/0', '2/1', '3/0', '3/1']);
    expect(dayWeekPlacement(layout, 1, 2)).toEqual({ col: 5, block: 0 });
    expect(dayWeekCellValues(layout, 5, 0)).toEqual({
      room: 'b',
      owner: 'ada',
    });
  });

  it('date-major columns (the default)', () => {
    const layout = buildDayWeekGroupLayout(days, leaves);
    expect(layout.groupByDate).toBe(true);
    expect(dayWeekPlacement(layout, 1, 2)).toEqual({ col: 6, block: 0 });
    expect(layout.columns[6].resourceId).toBe('b');
  });

  it('vertical blocks', () => {
    const layout = buildDayWeekGroupLayout(days, leaves, { vertical: true });
    expect(layout.colCount).toBe(2);
    expect(layout.blockCount).toBe(4);
    expect(dayWeekPlacement(layout, 1, 3)).toEqual({ col: 1, block: 3 });
    expect(dayWeekCellLeaf(layout, 1, 3)).toBe(3);
    expect(dayWeekCellValues(layout, 0, 2)).toEqual({
      room: 'b',
      owner: 'ada',
    });
  });

  it('ungrouped', () => {
    const layout = buildDayWeekGroupLayout(days, [], { vertical: true });
    expect(layout.vertical).toBe(false);
    expect(layout.colCount).toBe(2);
    expect(dayWeekCellLeaf(layout, 1, 0)).toBe(-1);
  });

  it('nested header rows, resource-major and date-major', () => {
    const text = (day: Date) => String(day.getDate());
    const resourceMajor = buildColumnHeaderRows(
      days,
      levels,
      leaves,
      false,
      text,
    );
    expect(
      resourceMajor.map((row) =>
        row.map((cell) => `${cell.text}@${cell.start}+${cell.span}`),
      ),
    ).toEqual([
      ['Room A@0+4', 'Room B@4+4'],
      ['Ada@0+2', 'Grace@2+2', 'Ada@4+2', 'Grace@6+2'],
      ['3@0+1', '4@1+1', '3@2+1', '4@3+1', '3@4+1', '4@5+1', '3@6+1', '4@7+1'],
    ]);
    const dateMajor = buildColumnHeaderRows(days, levels, leaves, true, text);
    expect(
      dateMajor[0].map((cell) => `${cell.text}@${cell.start}+${cell.span}`),
    ).toEqual(['3@0+4', '4@4+4']);
    expect(dateMajor[1].map((cell) => cell.span)).toEqual([2, 2, 2, 2]);
    expect(dateMajor[2]).toHaveLength(8);
    expect(buildColumnHeaderRows(days, [], [], true, text)).toHaveLength(1);
  });

  it('row header blocks for stacked groups', () => {
    const blocks = buildRowHeaderBlocks(levels, leaves);
    expect(blocks[0].map((cell) => `${cell.text}+${cell.span}`)).toEqual([
      'Room A+2',
      'Ada+1',
    ]);
    expect(blocks[1].map((cell) => cell.text)).toEqual(['Grace']);
  });

  it('places segments, previews and drags by the layout', () => {
    const layout = buildDayWeekGroupLayout(grid.days, leaves, {
      vertical: true,
    });
    const item = appt({
      id: 1,
      text: 'Sync',
      startDate: new Date(2026, 7, 4, 9),
      endDate: new Date(2026, 7, 4, 10),
      room: 'b',
      owner: 'grace',
    });
    const leafOf = groupLeafMatcher<Item>(levels, leaves);
    const [segment] = layoutGroupedDayWeekSegments(
      [item],
      grid,
      layout,
      leafOf,
      15,
    );
    expect(segment.colIndex).toBe(1);
    expect(segment.block).toBe(3);
    // 09:00 is 10% into the 8–18 window, in block 3 of 4
    expect(chipTopPercent(segment, 4)).toBeCloseTo(((3 + 0.1) / 4) * 100, 5);
    expect(chipHeightPercent(segment, 4)).toBeCloseTo(2.5, 5);
    const box = dayWeekLayoutPreviewBox(
      { startDate: item.startDate, endDate: item.endDate, allDay: false },
      1,
      grid,
      15,
      layout,
    );
    expect(box).toMatchObject({ left: 50, width: 50 });
    expect(box?.top).toBeCloseTo(((1 + 0.1) / 4) * 100, 5);
    // a drag one block up (rect 800px tall → 200px blocks) lands on leaf 2
    const move = dayWeekLayoutDragMove(
      item,
      0,
      -200,
      400,
      800,
      grid,
      layout,
      1,
      3,
      9 * 60,
      30,
    );
    expect(move.leafIndex).toBe(2);
    expect(move.proposal.startDate).toEqual(new Date(2026, 7, 4, 9));
    const selection = dayWeekSelectionBox(
      { dayIndex: 0, startMinutes: 8 * 60, endMinutes: 9 * 60, block: 2 },
      grid,
      2,
      4,
    );
    expect(selection?.top).toBe(50);
  });

  it('packs the all-day strip per leaf for resource-major columns', () => {
    const layout = buildDayWeekGroupLayout(grid.days, leaves, {
      groupByDate: false,
    });
    const leafOf = groupLeafMatcher<Item>(levels, leaves);
    const strip = buildLayoutAllDayStrip(
      [
        appt({
          id: 9,
          text: 'Offsite',
          startDate: new Date(2026, 7, 3),
          endDate: new Date(2026, 7, 5),
          allDay: true,
          room: 'a',
          owner: 'grace',
        }),
      ],
      grid,
      layout,
      leafOf,
    );
    expect(strip.columnCount).toBe(8);
    expect(strip.bars[0]).toMatchObject({ colStart: 3, colEnd: 5 });
    expect(strip.cells[3].values).toEqual({ room: 'a', owner: 'grace' });
    const dateMajor = buildLayoutAllDayStrip(
      [],
      grid,
      buildDayWeekGroupLayout(grid.days, leaves),
      leafOf,
    );
    expect(dateMajor.columnCount).toBe(2);
  });
});
