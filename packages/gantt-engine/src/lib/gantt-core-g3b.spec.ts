import type {
  OgeFormItemDataBase,
  OgeReactiveCell,
  OgeReactivityAdapter,
} from '@oge-ui/behavior';
import type { RowKey } from '@oge-ui/core';
import {
  OgeGanttCore,
  trimGanttDialogChange,
  type OgeGanttCoreEvents,
  type OgeGanttCoreInputs,
} from './gantt-core';
import { OGE_DEFAULT_GANTT_CONFIG, fillGanttMessages } from './gantt-config';
import type { GanttEditorModel } from './gantt-view';
import type { OgeGanttScaleType } from './gantt-types';

/** A plain-closure adapter: no memoization, so nothing relies on caching. */
const plain: OgeReactivityAdapter = {
  cell<T>(initial: T): OgeReactiveCell<T> {
    let value = initial;
    const cell = (() => value) as OgeReactiveCell<T>;
    cell.set = (next) => {
      value = next;
    };
    return cell;
  },
  derived: (compute) => compute,
};

interface Task {
  id: string;
  parentId?: string | null;
  title: string;
  start: Date;
  end: Date;
  progress?: number;
  resourceId?: unknown;
  units?: unknown;
  effort?: number;
  deadline?: Date;
  constraintType?: string;
  constraintDate?: Date;
  manuallyScheduled?: boolean;
  segments?: { start: Date; end: Date }[];
  baselines?: { start: Date; end: Date }[];
  owner?: string;
}
interface Link {
  id: string;
  predecessorId: string;
  successorId: string;
  type?: string;
  lag?: number;
  lagUnit?: string;
}

const d = (day: number) => new Date(2026, 0, day);

const TASKS: Task[] = [
  { id: 'p', title: 'Phase', start: d(5), end: d(5) },
  {
    id: 'a',
    parentId: 'p',
    title: 'Design',
    start: d(5),
    end: d(9),
    progress: 50,
  },
  { id: 'b', parentId: 'p', title: 'Build', start: d(12), end: d(16) },
  { id: 'm', parentId: 'p', title: 'Release', start: d(16), end: d(16) },
  { id: 'z', title: 'Zebra docs', start: d(6), end: d(8), owner: 'Ana' },
];
const LINKS: Link[] = [{ id: 'l1', predecessorId: 'a', successorId: 'b' }];

interface Harness {
  core: OgeGanttCore<Task, Link>;
  props: Record<string, unknown>;
  calls: Record<string, unknown[]>;
  dialogs: { model: GanttEditorModel; items: readonly OgeFormItemDataBase[] }[];
  selected: () => RowKey | null;
  selectedKeys: () => readonly RowKey[];
  hostEl: HTMLElement;
  tasks: () => readonly Task[];
}

function setup(overrides: Record<string, unknown> = {}): Harness {
  const props: Record<string, unknown> = {
    tasks: TASKS,
    dependencies: LINKS,
    keyExpr: 'id',
    parentKeyExpr: 'parentId',
    titleExpr: 'title',
    startExpr: 'start',
    endExpr: 'end',
    progressExpr: 'progress',
    colorExpr: 'color',
    baselineStartExpr: 'baselineStart',
    baselineEndExpr: 'baselineEnd',
    dependencyKeyExpr: 'id',
    predecessorKeyExpr: 'predecessorId',
    successorKeyExpr: 'successorId',
    dependencyTypeExpr: 'type',
    resources: [],
    resourceIdExpr: 'resourceId',
    firstDayOfWeek: 1,
    taskListWidth: 360,
    columns: [{ field: 'title' }, { field: 'start' }, { field: 'duration' }],
    taskTitlePosition: 'inside',
    showDependencies: true,
    showCriticalPath: false,
    weekendsHighlighted: true,
    weekendDays: undefined,
    holidays: [],
    workCalendar: null,
    showResourceWorkload: false,
    stripLines: [],
    autoScheduling: false,
    locale: 'en-US',
    messages: {},
    editingEnabled: true,
    allowTaskAdding: true,
    allowTaskUpdating: true,
    allowTaskDeleting: true,
    allowDependencyAdding: true,
    allowDependencyDeleting: true,
    readOnly: false,
    ...overrides,
  };
  let scaleType: OgeGanttScaleType = 'days';
  let selected: RowKey | null = null;
  let selectedKeys: readonly RowKey[] = [];
  const calls: Record<string, unknown[]> = {};
  const record =
    (name: string) =>
    (event: unknown): void => {
      (calls[name] ??= []).push(event);
    };
  const events: OgeGanttCoreEvents<Task, Link> = {
    taskUpdated: record('taskUpdated'),
    taskDeleted: record('taskDeleted'),
    dependencyInserted: record('dependencyInserted'),
    dependencyUpdated: record('dependencyUpdated'),
    dependencyDeleted: record('dependencyDeleted'),
    selectionChanged: record('selectionChanged'),
    schedulingConflict: record('schedulingConflict'),
    sortChanged: record('sortChanged'),
    columnResized: record('columnResized'),
    columnReordered: record('columnReordered'),
    scaleTypeChange: (type) => {
      scaleType = type;
    },
    selectedTaskKeyChange: (key) => {
      selected = key;
    },
    selectedTaskKeysChange: (keys) => {
      selectedKeys = keys;
    },
    baselineIndexChange: (index) => {
      props['baselineIndex'] = index;
    },
    viewModeChange: (mode) => {
      props['viewMode'] = mode;
    },
  };
  const inputs = new Proxy({} as OgeGanttCoreInputs<Task, Link>, {
    get: (_target, key: string) => {
      if (key === 'scaleType') return () => scaleType;
      if (key === 'selectedTaskKey') return () => selected;
      if (key === 'selectedTaskKeys') return () => selectedKeys;
      if (key === 'config') return () => OGE_DEFAULT_GANTT_CONFIG;
      return () => props[key];
    },
  });
  const hostEl = document.createElement('div');
  document.body.append(hostEl);
  const dialogs: Harness['dialogs'] = [];
  const core = new OgeGanttCore<Task, Link>(
    {
      inputs,
      events,
      openDialog: (model, _isNew, items) => dialogs.push({ model, items }),
      hostElement: () => hostEl,
      bodyElement: () => null,
      chartScrollElement: () => null,
      canvasElement: () => null,
    },
    plain,
  );
  return {
    core,
    props,
    calls,
    dialogs,
    selected: () => selected,
    selectedKeys: () => selectedKeys,
    hostEl,
    tasks: () => core.allTasks().map((task) => task.source),
  };
}

const key = (
  name: string,
  extra: Partial<{ ctrlKey: boolean; shiftKey: boolean; altKey: boolean }> = {},
) => ({
  key: name,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  preventDefault: vi.fn(),
  stopPropagation: vi.fn(),
  ...extra,
});

const click = (extra: Partial<MouseEvent> = {}) =>
  ({
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    ...extra,
  }) as MouseEvent;

const task = (h: Harness, id: string) =>
  h.core.visibleTasks().find((entry) => entry.key === id)!;

describe('OgeGanttCore — scheduling depth (G3b)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('auto-schedules with lag and pulls successors earlier', () => {
    const h = setup({ autoScheduling: true });
    // Build starts on the 12th although Design ends on the 9th
    h.core.updateTask(task(h, 'a').source, {
      title: 'Design!',
    } as Partial<Task>);
    expect(task(h, 'b').start).toEqual(d(9));
    // FS+2 days pushes it to the 11th; one undo step reverts both
    h.core.updateDependency(h.core.ganttDependencies()[0].source, {
      lag: 2,
    } as Partial<Link>);
    expect(task(h, 'b').start).toEqual(d(11));
    expect(h.calls['dependencyUpdated']).toHaveLength(1);
    h.core.undo();
    expect(task(h, 'b').start).toEqual(d(9));
  });

  it('labels lag on the arrow and shows it in the predecessor column', () => {
    const h = setup({
      dependencies: [{ ...LINKS[0], type: 'SS', lag: -1, lagUnit: 'hours' }],
      columns: [{ field: 'title' }, { field: 'predecessors' }],
    });
    expect(h.core.windowArrows()[0].label).toBe('-1h');
    const column = h.core.resolvedColumns()[1];
    expect(h.core.cellText(task(h, 'b'), column)).toBe('aSS-1h');
  });

  it('reports constraint, deadline and dependency conflicts with an event', () => {
    const h = setup({
      tasks: [
        ...TASKS.slice(0, 2),
        { ...TASKS[2], start: d(7) }, // starts before Design ends
        { ...TASKS[3], deadline: d(10) },
        { ...TASKS[4], constraintType: 'MSO', constraintDate: d(9) },
      ],
    });
    h.core.syncConflicts();
    const event = h.calls['schedulingConflict']?.[0] as {
      conflicts: { key: string; kind: string; message: string }[];
    };
    expect(event.conflicts.map((c) => `${c.key}:${c.kind}`).sort()).toEqual([
      'b:dependency',
      'm:deadline',
      'z:constraint',
    ]);
    expect(event.conflicts.find((c) => c.key === 'z')?.message).toBe(
      'Zebra docs breaks its constraint: Must start on Jan 9, 2026',
    );
    // unchanged set: no second event
    h.core.syncConflicts();
    expect(h.calls['schedulingConflict']).toHaveLength(1);
    const bars = new Map(h.core.windowBars().map((bar) => [bar.task.key, bar]));
    expect(bars.get('b')?.conflict).toBe(true);
    expect(bars.get('m')?.overdue).toBe(true);
    expect(bars.get('m')?.deadlinePx).not.toBeNull();
    expect(bars.get('z')?.constraintPx).not.toBeNull();
    expect(h.core.taskAriaLabel(task(h, 'b'))).toContain(
      'starts before its Finish-to-start link allows',
    );
  });

  it('exposes total / free slack per task and as columns', () => {
    const h = setup({
      columns: [
        { field: 'title' },
        { field: 'totalSlack' },
        { field: 'freeSlack' },
      ],
    });
    expect(h.core.getTaskSlack('a')).toEqual({ totalSlack: 3, freeSlack: 3 });
    expect(h.core.getTaskSlack('z')).toEqual({ totalSlack: 8, freeSlack: 8 });
    const [, total] = h.core.resolvedColumns();
    expect(h.core.cellText(task(h, 'b'), total)).toBe('0d');
  });

  it('runs scheduleProject on demand as one undo step', () => {
    const h = setup({
      tasks: [...TASKS.slice(0, 2), { ...TASKS[2], start: d(6) }],
    });
    h.core.scheduleProject();
    expect(task(h, 'b').start).toEqual(d(9));
    expect(h.core.announcement()).toBe('Schedule recalculated');
    h.core.undo();
    expect(task(h, 'b').start).toEqual(d(6));
  });
});

describe('OgeGanttCore — task list (G3b)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('numbers WBS, sorts by header and filters with ancestors kept', () => {
    const h = setup({
      allowSorting: true,
      columns: [{ field: 'wbs' }, { field: 'title' }, { field: 'owner' }],
    });
    expect(h.core.visibleTasks().map((t) => t.wbs)).toEqual([
      '1',
      '1.1',
      '1.2',
      '1.3',
      '2',
    ]);
    const title = h.core.resolvedColumns()[1];
    h.core.onHeaderClick(title, 1);
    h.core.onHeaderClick(h.core.resolvedColumns()[1], 1);
    expect(h.core.resolvedColumns()[1].sortDirection).toBe('descending');
    expect(h.core.visibleTasks().map((t) => t.key)).toEqual([
      'z',
      'p',
      'm',
      'a',
      'b',
    ]);
    expect(h.calls['sortChanged']).toEqual([
      { field: 'title', direction: 'asc' },
      { field: 'title', direction: 'desc' },
    ]);
    h.core.sortBy(null);
    h.core.setFilter('title', 'BUILD');
    expect(h.core.visibleTasks().map((t) => t.key)).toEqual(['p', 'b']);
    h.core.clearFilters();
    h.core.setSearchText('ana');
    expect(h.core.visibleTasks().map((t) => t.key)).toEqual(['z']);
  });

  it('edits cells inline: title, start (moves), duration, invalid values', () => {
    const h = setup({ inlineEditing: true });
    const design = task(h, 'a');
    expect(h.core.beginCellEdit(design)).toBe(true);
    expect(h.core.editingCell()).toMatchObject({
      field: 'title',
      value: 'Design',
    });
    h.core.cellEditInput('Design v2');
    h.core.onCellEditorKeydown(key('Tab'));
    expect(task(h, 'a').title).toBe('Design v2');
    // Tab moved on to the start column
    expect(h.core.editingCell()).toMatchObject({
      field: 'start',
      value: '2026-01-05',
    });
    h.core.cellEditInput('2026-01-07');
    h.core.onCellEditorKeydown(key('Tab'));
    expect(task(h, 'a').start).toEqual(d(7));
    expect(task(h, 'a').end).toEqual(d(11)); // moved, duration kept
    h.core.cellEditInput('2');
    h.core.onCellEditorKeydown(key('Enter'));
    expect(task(h, 'a').end).toEqual(d(9));
    // an invalid value announces and writes nothing
    h.core.beginCellEdit(task(h, 'a'), 'duration');
    h.core.cellEditInput('soon');
    h.core.commitCellEdit();
    expect(h.core.announcement()).toBe('Duration: the value was not valid');
    // Escape cancels; summaries keep their rolled-up dates read-only
    h.core.beginCellEdit(task(h, 'a'), 'title');
    h.core.cellEditInput('nope');
    h.core.onCellEditorKeydown(key('Escape'));
    expect(task(h, 'a').title).toBe('Design v2');
    expect(h.core.beginCellEdit(task(h, 'p'), 'start')).toBe(false);
  });

  it('edits predecessors as text — one undo step for the link diff', () => {
    const h = setup({
      inlineEditing: true,
      columns: [{ field: 'title' }, { field: 'predecessors' }],
    });
    h.core.beginCellEdit(task(h, 'm'), 'predecessors');
    h.core.cellEditInput('b, zSS+1d');
    h.core.commitCellEdit();
    const links = h.core
      .ganttDependencies()
      .filter((dep) => dep.successorKey === 'm');
    expect(links.map((dep) => [dep.predecessorKey, dep.type, dep.lag])).toEqual(
      [
        ['b', 'FS', 0],
        ['z', 'SS', 1],
      ],
    );
    h.core.undo();
    expect(
      h.core.ganttDependencies().filter((dep) => dep.successorKey === 'm'),
    ).toEqual([]);
    // unknown keys are rejected
    h.core.beginCellEdit(task(h, 'm'), 'predecessors');
    h.core.cellEditInput('nobody');
    h.core.commitCellEdit();
    expect(h.core.announcement()).toBe('Predecessors: the value was not valid');
  });

  it('multi-selects with Ctrl / Shift and deletes in bulk as one undo step', () => {
    const h = setup({ selectionMode: 'multiple' });
    h.core.onRowClick(task(h, 'a'), click());
    h.core.onRowClick(task(h, 'm'), click({ shiftKey: true }));
    expect(h.selectedKeys()).toEqual(['a', 'b', 'm']);
    h.core.onRowClick(task(h, 'b'), click({ ctrlKey: true }));
    expect(h.selectedKeys()).toEqual(['a', 'm']);
    expect(h.core.isSelected(task(h, 'm'))).toBe(true);
    h.core.onRowKeydown(task(h, 'm'), key('Delete'));
    expect(h.tasks().map((t) => t.id)).toEqual(['p', 'b', 'z']);
    expect(h.core.announcement()).toBe('2 tasks deleted');
    h.core.undo();
    expect(h.tasks()).toHaveLength(5);
    // Ctrl+A selects every visible row
    h.core.onRowKeydown(task(h, 'p'), key('a', { ctrlKey: true }));
    expect(h.selectedKeys()).toHaveLength(5);
  });

  it('indents a selection in bulk (Alt+Shift+Right)', () => {
    const h = setup({
      selectionMode: 'multiple',
      tasks: [
        { id: 'x', title: 'X', start: d(5), end: d(6) },
        { id: 'y', title: 'Y', start: d(5), end: d(6) },
        { id: 'w', title: 'W', start: d(5), end: d(6) },
      ],
      dependencies: [],
    });
    h.core.onRowClick(task(h, 'y'), click());
    h.core.onRowClick(task(h, 'w'), click({ shiftKey: true }));
    h.core.onRowKeydown(
      task(h, 'y'),
      key('ArrowRight', { altKey: true, shiftKey: true }),
    );
    expect(h.tasks().map((t) => t.parentId ?? null)).toEqual([null, 'x', 'x']);
    expect(h.core.announcement()).toBe('2 tasks indented');
    h.core.undo();
    expect(h.tasks().map((t) => t.parentId ?? null)).toEqual([
      null,
      null,
      null,
    ]);
  });

  it('resizes, reorders and freezes columns (pointer-free paths)', () => {
    const h = setup({
      allowColumnResizing: true,
      allowColumnReordering: true,
      columns: [
        { field: 'title' },
        { field: 'start' },
        { field: 'wbs', frozen: true, widthPx: 50 },
      ],
    });
    expect(
      h.core.resolvedColumns().map((c) => [c.field, c.frozenOffsetPx]),
    ).toEqual([
      ['wbs', 0],
      ['title', 50],
      ['start', 50],
    ]);
    h.core.onHeaderKeydown(1, key('ArrowRight', { altKey: true }));
    expect(h.core.resolvedColumns()[1].widthPx).toBe(190);
    expect(h.calls['columnResized']).toEqual([
      { field: 'title', widthPx: 190 },
    ]);
    h.core.onHeaderKeydown(
      1,
      key('ArrowRight', { ctrlKey: true, shiftKey: true }),
    );
    expect(h.core.resolvedColumns().map((c) => c.field)).toEqual([
      'wbs',
      'start',
      'title',
    ]);
    expect(h.calls['columnReordered']).toEqual([
      { field: 'title', fromIndex: 1, toIndex: 2 },
    ]);
    expect(h.core.announcement()).toBe('Task moved to position 3');
  });
});

describe('OgeGanttCore — scales, baselines, split tasks (G3b)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('labels quarter / year scales and applies zoom presets', () => {
    const h = setup();
    expect(h.core.zoomOptions().map((o) => o.label)).toEqual([
      'Hours',
      'Days',
      'Weeks',
      'Months',
      'Quarters',
      'Years',
    ]);
    h.core.applyZoomPreset(4);
    expect(h.core.scale().type).toBe('quarters');
    expect(h.core.minorLabel(new Date(2026, 4, 1))).toBe('Q2');
    expect(h.core.activeZoomIndex()).toBe(4);
    const custom = setup({
      zoomPresets: [{ scaleType: 'days', tickWidth: 20, label: 'Compact' }],
    });
    custom.core.applyZoomPreset(0);
    expect(custom.core.scale().ticks[0].widthPx).toBe(20);
    expect(custom.core.activeZoomIndex()).toBe(0);
  });

  it('chooses among several baselines and saves the current dates as one', () => {
    const h = setup({
      tasks: [
        {
          ...TASKS[1],
          parentId: null,
          baselines: [
            { start: d(1), end: d(3) },
            { start: d(2), end: d(6) },
          ],
        },
      ],
      dependencies: [],
    });
    expect(h.core.baselineCount()).toBe(2);
    const first = h.core.windowBars()[0].baselineLeftPx;
    h.props['baselineIndex'] = 1;
    expect(h.core.windowBars()[0].baselineLeftPx).not.toBe(first);
    h.props['baselineIndex'] = -1;
    expect(h.core.windowBars()[0].baselineLeftPx).toBeNull();
    h.core.setBaseline(2);
    expect(h.tasks()[0].baselines?.[2]).toEqual({ start: d(5), end: d(9) });
    expect(h.core.announcement()).toBe('Baseline 3 saved');
  });

  it('renders split tasks and moves every piece together', () => {
    const h = setup({
      tasks: [
        {
          id: 's',
          title: 'Split',
          start: d(5),
          end: d(12),
          progress: 50,
          segments: [
            { start: d(5), end: d(7) },
            { start: d(9), end: d(12) },
          ],
        },
      ],
      dependencies: [],
    });
    const bar = h.core.windowBars()[0];
    expect(bar.segments).toHaveLength(2);
    expect(bar.segments[0].offsetPx).toBe(0);
    expect(bar.segments[1].offsetPx).toBe(160); // 4 day ticks of 40px
    expect(bar.segments[0].fillPx).toBe(80); // fully done
    h.core.onRowKeydown(task(h, 's'), key('ArrowRight', { ctrlKey: true }));
    expect(h.tasks()[0].segments).toEqual([
      { start: d(6), end: d(8) },
      { start: d(10), end: d(13) },
    ]);
  });

  it('draws the progress line and rolls child milestones onto summaries', () => {
    const h = setup({
      showProgressLine: true,
      statusDate: d(8),
      showRollups: true,
    });
    const line = h.core.progressLine();
    expect(line?.path.startsWith(`M ${line.statusPx} 0`)).toBe(true);
    const summary = h.core.windowBars().find((bar) => bar.task.key === 'p');
    expect(summary?.rollups.map((rollup) => rollup.key)).toEqual(['m']);
  });
});

describe('OgeGanttCore — resources (G3b)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  const RESOURCES = [
    { id: 'ann', text: 'Ann' },
    { id: 'bo', text: 'Bo', capacity: 50 },
  ];

  it('recomputes the finish from work and units when effort-driven', () => {
    const h = setup({
      effortDriven: true,
      resources: RESOURCES,
      tasks: [{ id: 'w', title: 'Work', start: d(5), end: d(6), effort: 32 }],
      dependencies: [],
    });
    h.core.updateTask(h.tasks()[0], { resourceId: ['ann'] } as Partial<Task>);
    expect(task(h, 'w').end).toEqual(d(9)); // 32h / 8h a day
    h.core.updateTask(h.tasks()[0], {
      resourceId: ['ann', 'bo'],
    } as Partial<Task>);
    expect(task(h, 'w').end).toEqual(d(7)); // two full-time people
  });

  it('builds histogram rows with an accessible summary', () => {
    const h = setup({
      showResourceHistogram: true,
      resources: RESOURCES,
      tasks: [
        { id: '1', title: 'A', start: d(5), end: d(7), resourceId: 'bo' },
      ],
      dependencies: [],
    });
    const [ann, bo] = h.core.histogramRows();
    expect(ann.cells).toEqual([]);
    expect(bo.cells.every((cell) => cell.over)).toBe(true);
    expect(bo.label).toBe('Bo: peak 100%, over capacity in 2 periods');
    expect(ann.label).toBe('Ann: peak 0%, never over capacity');
  });

  it('switches to the resource view with guarded group rows', () => {
    const h = setup({
      resources: RESOURCES,
      tasks: TASKS.map((t) => (t.id === 'a' ? { ...t, resourceId: 'ann' } : t)),
    });
    h.core.toggleViewMode();
    expect(h.props['viewMode']).toBe('resources');
    const rows = h.core.visibleTasks();
    expect(rows.map((row) => row.title)).toEqual([
      'Ann',
      'Design',
      'Bo',
      'Unassigned',
      'Build',
      'Release',
      'Zebra docs',
    ]);
    expect(h.core.windowArrows()).toEqual([]);
    expect(h.core.isGroupRow(rows[0])).toBe(true);
    expect(h.core.realKeyOf(rows[1])).toBe('a');
    // selecting an assignment row selects the real task
    h.core.onRowClick(rows[1], click());
    expect(h.selected()).toBe('a');
    // group rows never open the dialog or delete
    h.core.onRowKeydown(rows[0], key('Delete'));
    h.core.onRowDblClick(rows[0], click());
    expect(h.tasks()).toHaveLength(5);
    expect(h.dialogs).toHaveLength(0);
    expect(h.core.rowCount()).toBe(rows.length);
  });
});

describe('OgeGanttCore — dependency editor, dialog, messages (G3b)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('edits a link type and lag from the dependency editor', () => {
    const h = setup();
    const dep = h.core.ganttDependencies()[0];
    h.core.onArrowDblClick(dep, {
      clientX: 10,
      clientY: 10,
      stopPropagation: vi.fn(),
    });
    expect(h.core.dependencyEditor()).toMatchObject({ type: 'FS', lag: 0 });
    h.core.dependencyEditorChange({ type: 'SS', lag: 3, lagUnit: 'hours' });
    h.core.saveDependencyEditor();
    expect(h.core.dependencyEditor()).toBeNull();
    expect(h.core.ganttDependencies()[0]).toMatchObject({
      type: 'SS',
      lag: 3,
      lagUnit: 'hours',
    });
    // Enter on a clicked arrow opens it from the keyboard
    h.core.onArrowClick(h.core.ganttDependencies()[0], {
      stopPropagation: vi.fn(),
    });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(h.core.dependencyEditor()).not.toBeNull();
    h.core.onDependencyEditorKeydown(key('Escape'));
    expect(h.core.dependencyEditor()).toBeNull();
  });

  it('adds scheduling fields to the dialog and trims unchanged extras', () => {
    const h = setup({
      autoScheduling: true,
      resources: [{ id: 'ann', text: 'Ann' }],
    });
    h.core.onRowKeydown(task(h, 'a'), key('Enter'));
    const fields = h.dialogs[0].items.map((item) => item.field);
    expect(fields).toContain('constraintType');
    expect(fields).toContain('units');
    expect(h.dialogs[0].model).toMatchObject({
      constraintType: 'ASAP',
      manuallyScheduled: false,
      units: 100,
    });
    expect(
      trimGanttDialogChange(h.dialogs[0].model, task(h, 'a')),
    ).not.toHaveProperty('units');
    h.core.onDialogSaved({
      model: {
        ...h.dialogs[0].model,
        constraintType: 'SNET',
        constraintDate: d(6),
      },
      isNew: false,
    });
    const saved = h.tasks().find((t) => t.id === 'a');
    expect(saved?.constraintType).toBe('SNET');
    expect(saved).not.toHaveProperty('units');
    // auto-scheduling honoured the new constraint
    expect(task(h, 'a').start).toEqual(d(6));
  });

  it('fills partial and older catalogs from English', () => {
    const filled = fillGanttMessages(OGE_DEFAULT_GANTT_CONFIG.messages, {
      toolbar: { today: 'Heute' } as never,
      scheduling: { constraintTypes: { ASAP: 'So früh wie möglich' } } as never,
    });
    expect(filled.toolbar.today).toBe('Heute');
    expect(filled.toolbar.scale).toBe('Timeline scale');
    expect(filled.scheduling.constraintTypes.ASAP).toBe('So früh wie möglich');
    expect(filled.scheduling.constraintTypes.MFO).toBe('Must finish on');
  });
});
