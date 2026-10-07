import type {
  OgeReactiveCell,
  OgeReactivityAdapter,
  OgeFormItemDataBase,
} from '@oge-ui/behavior';
import type { RowKey } from '@oge-ui/core';
import {
  OgeGanttCore,
  ganttMenuFocusIndex,
  ganttMenuKeyCommand,
  mirrorGanttKey,
  type OgeGanttCoreEvents,
  type OgeGanttCoreInputs,
} from './gantt-core';
import { OGE_DEFAULT_GANTT_CONFIG } from './gantt-config';
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
  start: Date | string;
  end: Date | string;
  progress?: number;
  resourceId?: unknown;
}
interface Link {
  id: string;
  predecessorId: string;
  successorId: string;
  type?: string;
}

const TASKS: Task[] = [
  {
    id: 'p',
    title: 'Phase 1',
    start: new Date(2026, 0, 5),
    end: new Date(2026, 0, 5),
  },
  {
    id: 'a',
    parentId: 'p',
    title: 'Design',
    start: new Date(2026, 0, 5),
    end: new Date(2026, 0, 9),
    progress: 60,
  },
  {
    id: 'b',
    parentId: 'p',
    title: 'Build',
    start: new Date(2026, 0, 9),
    end: new Date(2026, 0, 16),
    progress: 20,
  },
  {
    id: 'm',
    parentId: 'p',
    title: 'Release',
    start: new Date(2026, 0, 16),
    end: new Date(2026, 0, 16),
  },
];
const LINKS: Link[] = [
  { id: 'l1', predecessorId: 'a', successorId: 'b', type: 'FS' },
  { id: 'l2', predecessorId: 'b', successorId: 'm', type: 'FS' },
];

interface Harness {
  core: OgeGanttCore<Task, Link>;
  props: Record<string, unknown>;
  calls: Record<string, unknown[]>;
  dialogs: {
    model: GanttEditorModel;
    isNew: boolean;
    items: readonly OgeFormItemDataBase[];
  }[];
  scale: () => OgeGanttScaleType;
  selected: () => RowKey | null;
  hostEl: HTMLElement;
}

function setup(
  overrides: Record<string, unknown> = {},
  cancel: readonly string[] = [],
): Harness {
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
    columns: [
      { field: 'title' },
      { field: 'start' },
      { field: 'end' },
      { field: 'duration' },
    ],
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
  const calls: Record<string, unknown[]> = {};
  const record =
    (name: string) =>
    (event: unknown): void => {
      if (cancel.includes(name)) (event as { cancel: boolean }).cancel = true;
      (calls[name] ??= []).push(event);
    };
  const events: OgeGanttCoreEvents<Task, Link> = {
    taskInserting: record('taskInserting'),
    taskInserted: record('taskInserted'),
    taskUpdating: record('taskUpdating'),
    taskUpdated: record('taskUpdated'),
    taskDeleting: record('taskDeleting'),
    taskDeleted: record('taskDeleted'),
    dependencyInserting: record('dependencyInserting'),
    dependencyInserted: record('dependencyInserted'),
    dependencyDeleted: record('dependencyDeleted'),
    selectionChanged: record('selectionChanged'),
    taskEditDialogShowing: record('taskEditDialogShowing'),
    scaleTypeChange: (type) => {
      scaleType = type;
      record('scaleTypeChange')(type);
    },
    selectedTaskKeyChange: (key) => {
      selected = key;
    },
  };
  const read =
    <K extends keyof OgeGanttCoreInputs<Task, Link>>(key: K) =>
    () =>
      props[key] as ReturnType<NonNullable<OgeGanttCoreInputs<Task, Link>[K]>>;
  const inputs = new Proxy({} as OgeGanttCoreInputs<Task, Link>, {
    get: (_target, key: string) => {
      if (key === 'scaleType') return () => scaleType;
      if (key === 'selectedTaskKey') return () => selected;
      if (key === 'config') return () => OGE_DEFAULT_GANTT_CONFIG;
      return read(key as keyof OgeGanttCoreInputs<Task, Link>);
    },
  });
  const hostEl = document.createElement('div');
  document.body.append(hostEl);
  const dialogs: Harness['dialogs'] = [];
  const core = new OgeGanttCore<Task, Link>(
    {
      inputs,
      events,
      openDialog: (model, isNew, items) =>
        dialogs.push({ model, isNew, items }),
      hostElement: () => hostEl,
      bodyElement: () => null,
      chartScrollElement: () =>
        (overrides['__chartScroll'] as HTMLElement | undefined) ?? null,
      canvasElement: () =>
        (overrides['__canvas'] as HTMLElement | undefined) ?? null,
    },
    plain,
  );
  return {
    core,
    props,
    calls,
    dialogs,
    scale: () => scaleType,
    selected: () => selected,
    hostEl,
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
  ...extra,
});

describe('OgeGanttCore', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('shades the resolved weekend days — explicit, locale-derived or Sat/Sun', () => {
    const shadedDays = (h: Harness): number[] =>
      [
        ...new Set(h.core.shadedTicks().map((tick) => tick.date.getDay())),
      ].sort();
    expect(shadedDays(setup())).toEqual([0, 6]);
    expect(shadedDays(setup({ weekendDays: [5, 6] }))).toEqual([5, 6]);
    expect(
      shadedDays(setup({ weekendDays: [5, 6], weekendsHighlighted: false })),
    ).toEqual([]);
    // locale default, with the host's ICU week data stubbed out
    const FakeLocale = function (tag: string) {
      return {
        tag,
        getWeekInfo: () => ({ weekend: tag === 'ar-SA' ? [5, 6] : [6, 7] }),
      };
    };
    const spy = vi
      .spyOn(Intl, 'Locale')
      .mockImplementation(FakeLocale as unknown as typeof Intl.Locale);
    try {
      const harness = setup({ locale: 'ar-SA' });
      expect(harness.core.resolvedWeekendDays()).toEqual([5, 6]);
      expect(shadedDays(harness)).toEqual([5, 6]);
    } finally {
      spy.mockRestore();
    }
  });

  it('seeds the working set from the inputs at construction (first paint)', () => {
    const { core } = setup();
    expect(core.visibleTasks().map((task) => task.key)).toEqual([
      'p',
      'a',
      'b',
      'm',
    ]);
    expect(core.windowBars()).toHaveLength(4);
    expect(core.windowArrows()).toHaveLength(2);
    // summary rolls its dates up from the children
    expect(core.visibleTasks()[0].isSummary).toBe(true);
    expect(core.visibleTasks()[0].end).toEqual(new Date(2026, 0, 16));
  });

  it('collapse hides the subtree; expandAll / expandToTask restore it', () => {
    const { core } = setup();
    core.toggleExpanded(core.visibleTasks()[0]);
    expect(core.visibleTasks()).toHaveLength(1);
    core.expandAll();
    expect(core.visibleTasks()).toHaveLength(4);
    core.collapseAll();
    expect(core.visibleTasks()).toHaveLength(1);
    core.expandToTask('b');
    expect(core.visibleTasks()).toHaveLength(4);
    expect(core.focusKey()).toBe('b');
    core.expandAllToLevel(0);
    expect(core.visibleTasks()).toHaveLength(1);
  });

  it('rejects cycles, and every applied edit is one undo step', () => {
    const { core, calls } = setup();
    core.insertDependency('m', 'a');
    expect(calls['dependencyInserted']).toBeUndefined();
    expect(core.announcement()).toContain('cycle');
    core.insertDependency('a', 'm', 'SS');
    expect(calls['dependencyInserted']).toHaveLength(1);
    expect(core.windowArrows()).toHaveLength(3);
    expect(core.canUndo()).toBe(true);
    core.undo();
    expect(core.windowArrows()).toHaveLength(2);
    expect(core.announcement()).toBe('Undone');
    core.redo();
    expect(core.windowArrows()).toHaveLength(3);
  });

  it('runs the cancelable update pipeline and never mutates the input', () => {
    const { core, calls } = setup();
    const design = core.visibleTasks()[1];
    core.updateTask(design.source, { title: 'Design v2' });
    expect((calls['taskUpdated'][0] as { taskData: Task }).taskData.title).toBe(
      'Design v2',
    );
    expect(TASKS[1].title).toBe('Design');
  });

  it('a canceled pre-event leaves the store alone', () => {
    const vetoed = setup({}, ['taskDeleting']);
    vetoed.core.deleteTask(vetoed.core.visibleTasks()[2].source);
    expect(vetoed.calls['taskDeleted']).toBeUndefined();
    expect(vetoed.core.visibleTasks()).toHaveLength(4);
    expect(vetoed.core.canUndo()).toBe(false);

    const { core, calls } = setup();
    core.deleteTask(core.visibleTasks()[2].source);
    expect(calls['taskDeleted']).toHaveLength(1);
    // deleting 'b' removes both of its links too
    expect(core.windowArrows()).toHaveLength(0);
  });

  it('Ctrl+ArrowRight moves the focused bar one unit, string dates round-trip', () => {
    const { core, calls, props } = setup();
    core.onRowKeydown(
      core.visibleTasks()[1],
      key('ArrowRight', { ctrlKey: true }),
    );
    const moved = (calls['taskUpdated'][0] as { taskData: Task }).taskData;
    expect(moved.start).toEqual(new Date(2026, 0, 6));
    expect(moved.end).toEqual(new Date(2026, 0, 10));

    props['tasks'] = [
      { id: 's', title: 'Stringy', start: '2026-01-05', end: '2026-01-08' },
    ];
    core.resetTasks(props['tasks'] as Task[]);
    core.onRowKeydown(
      core.visibleTasks()[0],
      key('ArrowRight', { ctrlKey: true }),
    );
    const stringy = (calls['taskUpdated'][1] as { taskData: Task }).taskData;
    expect(stringy.start).toBe('2026-01-06');
    expect(stringy.end).toBe('2026-01-09');
  });

  it('Alt+Shift+Right/Left indent under the previous sibling and outdent', () => {
    const { core, calls } = setup();
    core.onRowKeydown(
      core.visibleTasks()[2],
      key('ArrowRight', { altKey: true, shiftKey: true }),
    );
    const indented = (calls['taskUpdated'][0] as { taskData: Task }).taskData;
    expect(indented.id).toBe('b');
    expect(indented.parentId).toBe('a');
    expect(core.visibleTasks().find((task) => task.key === 'b')?.level).toBe(2);
    core.outdentTask(core.visibleTasks().find((task) => task.key === 'a')!);
    const outdented = (calls['taskUpdated'][1] as { taskData: Task }).taskData;
    expect(outdented.parentId).toBeNull();
  });

  it('arrow keys move the roving row and select it', () => {
    const { core, selected, calls } = setup();
    core.onRowKeydown(core.visibleTasks()[0], key('ArrowDown'));
    expect(core.focusKey()).toBe('a');
    expect(selected()).toBe('a');
    expect(calls['selectionChanged']).toHaveLength(1);
    core.onPaneKeydown({ key: 'Escape' });
    expect(selected()).toBeNull();
  });

  it('readOnly gates every editing path', () => {
    const { core, calls, dialogs } = setup({ readOnly: true });
    core.insertTask({
      id: 'x',
      title: 'X',
      start: new Date(),
      end: new Date(),
    });
    core.deleteTask(core.visibleTasks()[1].source);
    core.insertDependency('a', 'm');
    core.showTaskDetailsDialog();
    expect(calls['taskInserted']).toBeUndefined();
    expect(calls['taskDeleted']).toBeUndefined();
    expect(calls['dependencyInserted']).toBeUndefined();
    expect(dialogs).toHaveLength(0);
  });

  it('opens the dialog through the cancelable showing event and saves', () => {
    const { core, dialogs, calls } = setup();
    core.showTaskDetailsDialog();
    expect(dialogs).toHaveLength(1);
    expect(dialogs[0].isNew).toBe(true);
    expect(dialogs[0].items.map((item) => item.field)).toEqual([
      'title',
      'start',
      'end',
      'progress',
      'color',
    ]);
    expect(calls['taskEditDialogShowing']).toHaveLength(1);
    core.onDialogSaved({
      model: { ...dialogs[0].model, title: 'Fresh' },
      isNew: true,
    });
    expect(
      (calls['taskInserted'][0] as { taskData: Task }).taskData.title,
    ).toBe('Fresh');
    expect(core.visibleTasks()).toHaveLength(5);
  });

  it('the zoom steps emit the two-way scale change', () => {
    const { core, scale } = setup();
    core.zoomOut();
    expect(scale()).toBe('weeks');
    core.zoomIn();
    core.zoomIn();
    expect(scale()).toBe('hours');
    expect(core.canZoom(-1)).toBe(false);
    core.zoomToFit();
    expect(['hours', 'days', 'weeks', 'months', 'quarters', 'years']).toContain(
      scale(),
    );
  });

  it('builds the export snapshot with pane-identical column text', () => {
    const { core } = setup();
    const data = core.getExportData();
    expect(data.tasks).toHaveLength(4);
    expect(data.columns.map((column) => column.header)).toEqual([
      'Task',
      'Start',
      'End',
      'Duration',
    ]);
    expect(data.columns[3].text(data.tasks[1])).toBe('4d');
  });

  it('derives the context-menu item states', () => {
    const { core, hostEl } = setup();
    const event = new MouseEvent('contextmenu', { clientX: 10, clientY: 10 });
    core.onRowContextMenu(core.visibleTasks()[1], event);
    expect(core.contextMenu()?.task?.key).toBe('a');
    expect(core.menuState()).toMatchObject({
      edit: true,
      indent: false, // 'a' is the first child
      outdent: true,
    });
    core.onMenuKeydown({ key: 'Escape' });
    expect(core.contextMenu()).toBeNull();
    expect(hostEl).toBeDefined();
  });

  it('destroy() cancels a running gesture', () => {
    const { core } = setup();
    const bar = core.windowBars()[1];
    const target = document.createElement('div');
    core.onBarPointerDown(bar, 'move', {
      button: 0,
      clientX: 0,
      clientY: 0,
      pointerId: 1,
      target,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    });
    expect(core.dragKey()).toBe('a');
    core.destroy();
    expect(core.dragKey()).toBeNull();
    expect(core.announcement()).toBe('Cancelled');
  });
});

describe('OgeGanttCore — right-to-left', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('dir');
  });

  const pointer = (clientX: number, clientY = 0) => ({
    button: 0,
    clientX,
    clientY,
    pointerId: 1,
    target: document.createElement('div'),
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  });
  const move = (x: number, y = 0) =>
    document.dispatchEvent(
      new MouseEvent('pointermove', { clientX: x, clientY: y }),
    );
  const up = () => document.dispatchEvent(new MouseEvent('pointerup'));

  /** A canvas whose box spans [100, 100 + width] on screen. */
  function canvas(width: number): HTMLElement {
    const el = document.createElement('div');
    el.getBoundingClientRect = () =>
      ({
        left: 100,
        right: 100 + width,
        top: 0,
        bottom: 400,
        width,
        height: 400,
        x: 100,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
    return el;
  }

  it('mirrorGanttKey swaps only the horizontal arrows, only in RTL', () => {
    expect(mirrorGanttKey(key('ArrowLeft'), true).key).toBe('ArrowRight');
    expect(mirrorGanttKey(key('ArrowRight'), true).key).toBe('ArrowLeft');
    expect(mirrorGanttKey(key('ArrowUp'), true).key).toBe('ArrowUp');
    expect(mirrorGanttKey(key('ArrowLeft'), false).key).toBe('ArrowLeft');
    const raw = key('ArrowLeft', { ctrlKey: true });
    const mirrored = mirrorGanttKey(raw, true);
    expect(mirrored.ctrlKey).toBe(true);
    mirrored.preventDefault();
    expect(raw.preventDefault).toHaveBeenCalled();
  });

  it('rtlEnabled wins; unset follows the dir around the host and its changes', async () => {
    const explicit = setup({ rtlEnabled: true });
    expect(explicit.core.rtl()).toBe(true);
    expect(explicit.core.arrowsTransform()).toBe(
      `matrix(-1 0 0 1 ${explicit.core.scale().totalPx} 0)`,
    );

    const auto = setup();
    expect(auto.core.rtl()).toBe(false);
    expect(auto.core.arrowsTransform()).toBeNull();
    document.documentElement.setAttribute('dir', 'rtl');
    auto.core.connectDirection();
    expect(auto.core.rtl()).toBe(true);
    document.documentElement.setAttribute('dir', 'ltr');
    await Promise.resolve();
    expect(auto.core.rtl()).toBe(false);
    document.documentElement.setAttribute('dir', 'rtl');
    await Promise.resolve();
    expect(auto.core.rtl()).toBe(true);
    // an explicit false still wins over the page
    auto.props['rtlEnabled'] = false;
    expect(auto.core.rtl()).toBe(false);
    auto.core.destroy();
    auto.props['rtlEnabled'] = undefined;
    document.documentElement.setAttribute('dir', 'ltr');
    await Promise.resolve();
    expect(auto.core.rtl()).toBe(true); // disconnected: no longer observed
  });

  it('mirrors the tree keys: Left expands, Right collapses, Alt+Shift+Left indents', () => {
    const { core, calls } = setup({ rtlEnabled: true });
    const phase = core.visibleTasks()[0];
    core.onRowKeydown(phase, key('ArrowRight'));
    expect(core.visibleTasks()).toHaveLength(1); // collapsed
    core.onRowKeydown(core.visibleTasks()[0], key('ArrowLeft'));
    expect(core.visibleTasks()).toHaveLength(4); // expanded again
    core.onRowKeydown(
      core.visibleTasks()[2],
      key('ArrowLeft', { altKey: true, shiftKey: true }),
    );
    const indented = (calls['taskUpdated'][0] as { taskData: Task }).taskData;
    expect(indented.id).toBe('b');
    expect(indented.parentId).toBe('a');
  });

  it('Ctrl+ArrowLeft moves a bar later in RTL', () => {
    const { core, calls } = setup({ rtlEnabled: true });
    core.onRowKeydown(
      core.visibleTasks()[1],
      key('ArrowLeft', { ctrlKey: true }),
    );
    const moved = (calls['taskUpdated'][0] as { taskData: Task }).taskData;
    expect(moved.start).toEqual(new Date(2026, 0, 6));
    expect(moved.end).toEqual(new Date(2026, 0, 10));
  });

  it('a pointer drag to the left moves a bar later in RTL (inverted deltaX)', () => {
    const { core, calls } = setup({ rtlEnabled: true, __canvas: canvas(800) });
    const bar = core.windowBars()[1];
    const tick = core.scale().ticks[0].widthPx;
    core.onBarPointerDown(bar, 'move', pointer(500));
    move(500 - tick);
    up();
    const moved = (calls['taskUpdated'][0] as { taskData: Task }).taskData;
    expect(moved.start).toEqual(new Date(2026, 0, 6));

    const ltr = setup({ __canvas: canvas(800) });
    ltr.core.onBarPointerDown(ltr.core.windowBars()[1], 'move', pointer(500));
    move(500 - tick);
    up();
    const earlier = (ltr.calls['taskUpdated'][0] as { taskData: Task })
      .taskData;
    expect(earlier.start).toEqual(new Date(2026, 0, 4));
  });

  it('pointer x is measured from the right edge in RTL (link preview, drag tip)', () => {
    const { core } = setup({ rtlEnabled: true, __canvas: canvas(800) });
    const bar = core.windowBars()[1];
    core.onLinkPointerDown(bar, true, pointer(800, 50));
    move(700, 60);
    // logical x = rect.right (900) - clientX (700) = 200
    expect(core.linkPreview()?.path).toMatch(/ L 200 60$/);
    up();

    core.onBarPointerDown(bar, 'move', pointer(600));
    move(650);
    expect(core.dragTip()?.x).toBe(900 - 650);
    up();
  });

  it('the context menu opens from the inline-start edge (towards the left in RTL)', () => {
    const rtl = setup({ rtlEnabled: true });
    rtl.hostEl.getBoundingClientRect = canvas(800).getBoundingClientRect;
    rtl.core.onRowContextMenu(
      rtl.core.visibleTasks()[1],
      new MouseEvent('contextmenu', { clientX: 850, clientY: 40 }),
    );
    // logical x = host right (900) - clientX (850)
    expect(rtl.core.contextMenu()).toMatchObject({ x: 50, y: 40 });

    const ltr = setup();
    ltr.hostEl.getBoundingClientRect = canvas(800).getBoundingClientRect;
    ltr.core.onRowContextMenu(
      ltr.core.visibleTasks()[1],
      new MouseEvent('contextmenu', { clientX: 850, clientY: 40 }),
    );
    expect(ltr.core.contextMenu()).toMatchObject({ x: 750, y: 40 });
  });

  it('ganttMenuKeyCommand mirrors the "back" arrow and keeps Up/Down/Home/End', () => {
    expect(ganttMenuKeyCommand('ArrowDown', false)).toBe('next');
    expect(ganttMenuKeyCommand('ArrowUp', true)).toBe('previous');
    expect(ganttMenuKeyCommand('Home', true)).toBe('first');
    expect(ganttMenuKeyCommand('End', false)).toBe('last');
    expect(ganttMenuKeyCommand('Escape', true)).toBe('close');
    expect(ganttMenuKeyCommand('ArrowLeft', false)).toBe('close');
    expect(ganttMenuKeyCommand('ArrowRight', false)).toBeNull();
    expect(ganttMenuKeyCommand('ArrowRight', true)).toBe('close');
    expect(ganttMenuKeyCommand('ArrowLeft', true)).toBeNull();
    expect(ganttMenuKeyCommand('a', false)).toBeNull();
  });

  it('ganttMenuFocusIndex wraps Up/Down and jumps Home/End', () => {
    expect(ganttMenuFocusIndex('next', 2, 3)).toBe(0);
    expect(ganttMenuFocusIndex('previous', 0, 3)).toBe(2);
    expect(ganttMenuFocusIndex('next', -1, 3)).toBe(0);
    expect(ganttMenuFocusIndex('previous', -1, 3)).toBe(2);
    expect(ganttMenuFocusIndex('first', 1, 3)).toBe(0);
    expect(ganttMenuFocusIndex('last', 0, 3)).toBe(2);
    expect(ganttMenuFocusIndex('next', 0, 0)).toBe(-1);
  });

  it('the menu moves focus with the arrows and closes on the mirrored back arrow', () => {
    const { core, hostEl } = setup({ rtlEnabled: true });
    core.onRowContextMenu(
      core.visibleTasks()[1],
      new MouseEvent('contextmenu', { clientX: 10, clientY: 10 }),
    );
    const menu = document.createElement('div');
    menu.className = 'oge-gantt-menu';
    const items = ['Edit', 'New', 'Delete'].map((label) => {
      const button = document.createElement('button');
      button.className = 'oge-gantt-menu-item';
      button.textContent = label;
      menu.append(button);
      return button;
    });
    hostEl.append(menu);
    items[0].focus();
    const down = key('ArrowDown');
    core.onMenuKeydown(down);
    expect(down.preventDefault).toHaveBeenCalled();
    expect(document.activeElement).toBe(items[1]);
    core.onMenuKeydown(key('End'));
    expect(document.activeElement).toBe(items[2]);
    core.onMenuKeydown(key('ArrowDown'));
    expect(document.activeElement).toBe(items[0]);
    // ArrowLeft points away from the row in RTL: nothing happens
    core.onMenuKeydown(key('ArrowLeft'));
    expect(core.contextMenu()).not.toBeNull();
    core.onMenuKeydown(key('ArrowRight'));
    expect(core.contextMenu()).toBeNull();
  });

  it('Shift+F10 / the ContextMenu key opens the menu at the row start edge', () => {
    const { core, hostEl } = setup({ rtlEnabled: true });
    hostEl.getBoundingClientRect = canvas(800).getBoundingClientRect;
    const row = document.createElement('div');
    row.setAttribute('data-focus-target', '');
    row.getBoundingClientRect = () =>
      ({
        left: 500,
        right: 900,
        top: 60,
        bottom: 90,
        width: 400,
        height: 30,
        x: 500,
        y: 60,
        toJSON: () => ({}),
      }) as DOMRect;
    hostEl.append(row);
    const shiftF10 = key('F10', { shiftKey: true });
    core.onRowKeydown(core.visibleTasks()[1], shiftF10);
    expect(shiftF10.preventDefault).toHaveBeenCalled();
    // the row's right edge, 24px in; just below the row
    expect(core.contextMenu()).toMatchObject({ x: 24, y: 90 });
    expect(core.contextMenu()?.task?.key).toBe('a');
    core.closeMenu();
    core.onRowKeydown(core.visibleTasks()[1], key('ContextMenu'));
    expect(core.contextMenu()).not.toBeNull();
  });

  it('the export snapshot carries the direction', () => {
    expect(setup({ rtlEnabled: true }).core.getExportData().rtl).toBe(true);
    expect(setup({ rtlEnabled: false }).core.getExportData().rtl).toBe(false);
  });

  it('the splitter widens the pane when dragged left in RTL', () => {
    const { core } = setup({ rtlEnabled: true });
    core.onSplitterPointerDown(pointer(300));
    move(260);
    expect(core.listWidth()).toBe(400);
    up();
  });

  it('scrollToDate uses the negative RTL scroll offset', () => {
    const scroller = document.createElement('div');
    let written = 0;
    Object.defineProperty(scroller, 'scrollLeft', {
      get: () => written,
      set: (value: number) => {
        written = value;
      },
    });
    const { core } = setup({ rtlEnabled: true, __chartScroll: scroller });
    core.scrollToDate(new Date(2026, 0, 16));
    expect(written).toBeLessThan(0);
  });
});
