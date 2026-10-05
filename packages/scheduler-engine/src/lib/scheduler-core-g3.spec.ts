import type { OgeReactiveCell, OgeReactivityAdapter } from '@oge-ui/behavior';
import { OGE_DEFAULT_SCHEDULER_CONFIG } from './config';
import { buildSchedulerEditorItems, draftEditorModel } from './editor';
import {
  armOgeSchedulerPayload,
  registerOgeSchedulerDropTarget,
} from './external-drag';
import {
  OgeSchedulerCore,
  type OgeSchedulerCoreInputs,
} from './scheduler-core';
import type { SchedulerAppointment } from './scheduler-model';
import type {
  OgeSchedulerAppointmentDroppedEvent,
  OgeSchedulerDragOutEvent,
  OgeSchedulerView,
} from './scheduler-types';

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

interface Appt {
  id?: number;
  text: string;
  startDate: Date;
  endDate: Date;
  allDay?: boolean;
  room?: string;
  recurrenceRule?: string;
  recurrenceException?: string;
}

const ROOMS = [
  {
    fieldExpr: 'room',
    items: [
      { id: 'a', text: 'Atlas', workHours: { start: 9, end: 17 } },
      { id: 'b', text: 'Borealis' },
    ],
  },
];

function setup(
  overrides: Partial<OgeSchedulerCoreInputs<Appt>> = {},
  data: readonly Appt[] = [
    {
      id: 1,
      text: 'Review',
      startDate: new Date(2026, 7, 6, 10),
      endDate: new Date(2026, 7, 6, 11),
      room: 'a',
    },
    {
      id: 2,
      text: 'Standup',
      startDate: new Date(2026, 7, 3, 9),
      endDate: new Date(2026, 7, 3, 9, 30),
      recurrenceRule: 'FREQ=DAILY',
      room: 'b',
    },
  ],
) {
  let date = new Date(2026, 7, 6);
  let view: OgeSchedulerView = 'week';
  let selection: readonly Appt[] = [];
  const events: { name: string; event: unknown }[] = [];
  const editors: { isNew: boolean; model: unknown }[] = [];
  const popups: SchedulerAppointment<Appt>[] = [];
  const host = document.createElement('div');
  const log = (name: string) => (event: unknown) => events.push({ name, event });
  const inputs: OgeSchedulerCoreInputs<Appt> = {
    dataSource: () => data,
    keyExpr: () => undefined,
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
    views: () => [
      'day',
      { type: 'day', intervalCount: 3, name: '3 days' },
      'week',
      'month',
    ],
    firstDayOfWeek: () => 1,
    weekendDays: () => undefined,
    dayStartHour: () => 8,
    dayEndHour: () => 18,
    cellDuration: () => 30,
    agendaDuration: () => 7,
    resources: () => ROOMS,
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
    selectedAppointments: () => selection,
    ...overrides,
  };
  const core = new OgeSchedulerCore<Appt, unknown>({
    rx: PLAIN,
    inputs,
    config: () => OGE_DEFAULT_SCHEDULER_CONFIG,
    setCurrentDate: (next) => (date = next),
    setCurrentView: (next) => (view = next),
    setSelectedAppointments: (next) => (selection = next),
    events: {
      appointmentAdding: log('appointmentAdding'),
      appointmentAdded: log('appointmentAdded'),
      appointmentUpdating: log('appointmentUpdating'),
      appointmentUpdated: log('appointmentUpdated'),
      appointmentDeleting: log('appointmentDeleting'),
      appointmentDeleted: log('appointmentDeleted'),
      appointmentClick: log('appointmentClick'),
      appointmentDblClick: log('appointmentDblClick'),
      cellClick: log('cellClick'),
      cellDblClick: log('cellDblClick'),
      editorShowing: log('editorShowing'),
      rangeSelected: log('rangeSelected'),
      appointmentContextMenu: log('appointmentContextMenu'),
      cellContextMenu: log('cellContextMenu'),
      reminderTriggered: log('reminderTriggered'),
      appointmentDropped: log('appointmentDropped'),
      dragOut: log('dragOut'),
    },
    surfaces: {
      openPopup: (appointment) => popups.push(appointment),
      closePopup: () => undefined,
      editorItems: (model) =>
        buildSchedulerEditorItems(
          OGE_DEFAULT_SCHEDULER_CONFIG.messages.editor,
          [],
          model,
          'en-US',
        ),
      openEditor: (model, isNew) => editors.push({ model, isNew }),
      closeEditor: () => undefined,
      hostRect: () => ({ left: 0, top: 0 }),
      focusMenu: () => undefined,
      hostElement: () => host,
    },
  });
  core.bindSource(inputs.dataSource());
  return {
    core,
    events,
    editors,
    popups,
    host,
    names: () => events.map((entry) => entry.name),
    selection: () => selection,
    setView: (next: OgeSchedulerView) => (view = next),
  };
}

const visible = (core: OgeSchedulerCore<Appt, unknown>, text: string) =>
  core.visibleAppointments().find((entry) => entry.text === text)!;

describe('OgeSchedulerCore — views', () => {
  it('tells same-type switcher entries apart and steps by the interval', () => {
    const { core } = setup();
    core.setView('day', 1);
    expect(core.activeView().name).toBe('3 days');
    expect(core.getEndViewDate()).toEqual(new Date(2026, 7, 9));
    expect(core.isViewActive(core.resolvedViews()[1])).toBe(true);
    expect(core.isViewActive(core.resolvedViews()[0])).toBe(false);
    core.navigate(1);
    expect(core.getStartViewDate()).toEqual(new Date(2026, 7, 9));
    // drilling prefers the single-day entry
    core.drillIntoDay(new Date(2026, 7, 20));
    expect(core.activeView().intervalCount).toBe(1);
  });

  it('"+N more" opens the popup list by default, drills with moreMode drill', () => {
    const popup = setup();
    popup.core.onMoreRequested(new Date(2026, 7, 6, 15));
    expect(popup.core.moreDay()).toEqual(new Date(2026, 7, 6));
    expect(popup.core.moreAppointments().map((entry) => entry.text)).toEqual([
      'Standup',
      'Review',
    ]);
    popup.core.closeMore();
    expect(popup.core.moreAppointments()).toEqual([]);
    const drill = setup({ moreMode: () => 'drill' });
    drill.core.onMoreRequested(new Date(2026, 7, 6));
    expect(drill.core.moreDay()).toBeNull();
    expect(drill.core.activeView().type).toBe('day');
  });
});

describe('OgeSchedulerCore — selection, clipboard, undo', () => {
  it('Ctrl/Shift clicks select without opening the popup; plain click replaces', () => {
    const { core, popups, selection } = setup();
    const review = visible(core, 'Review');
    const standup = visible(core, 'Standup');
    const order = [standup, review];
    const click = (init: MouseEventInit) => new MouseEvent('click', init);
    core.onChipClicked({ appointment: review, event: click({}), rect: new DOMRect(), order });
    expect(selection()).toEqual([review.source]);
    expect(popups).toHaveLength(1);
    core.onChipClicked({
      appointment: standup,
      event: click({ ctrlKey: true }),
      rect: new DOMRect(),
      order,
    });
    expect(selection()).toEqual([review.source, standup.source]);
    expect(popups).toHaveLength(1);
    expect(core.announcement()).toBe('2 appointments selected');
    expect(core.isSelected(standup)).toBe(true);
    core.clearSelection();
    expect(selection()).toEqual([]);
  });

  it('copies the selection and pastes it into a slot as one undo step', () => {
    const { core, names } = setup();
    const review = visible(core, 'Review');
    core.selectAppointment(review, 'replace', []);
    expect(core.copyAppointments(review)).toBe(1);
    expect(core.announcement()).toBe('1 appointment copied');
    expect(core.canPaste()).toBe(true);
    const pasted = core.paste({
      date: new Date(2026, 7, 7, 14),
      allDay: false,
      values: { room: 'b' },
    });
    expect(pasted).toBe(1);
    expect(core.announcement()).toBe('1 appointment pasted');
    const copy = core.store().at(-1)!;
    expect(copy).toMatchObject({ text: 'Review', room: 'b' });
    expect(copy.id).toBeUndefined();
    expect(copy.startDate).toEqual(new Date(2026, 7, 7, 14));
    expect(names()).toContain('appointmentAdding');
    expect(core.canUndo()).toBe(true);
    core.undo();
    expect(core.store()).toHaveLength(2);
    expect(core.announcement()).toBe('Undone');
    core.redo();
    expect(core.store()).toHaveLength(3);
  });

  it('undoes a move and keeps the selection on the moved item', () => {
    const { core, selection } = setup();
    const review = visible(core, 'Review');
    core.selectAppointment(review, 'replace', []);
    core.onMoveCommitted({
      appointment: review,
      proposal: {
        startDate: new Date(2026, 7, 6, 12),
        endDate: new Date(2026, 7, 6, 13),
        allDay: false,
      },
    });
    const moved = core.store()[0];
    expect(moved.startDate).toEqual(new Date(2026, 7, 6, 12));
    expect(selection()).toEqual([moved]);
    expect(core.undo()).toBe(true);
    expect(core.store()[0].startDate).toEqual(new Date(2026, 7, 6, 10));
    expect(core.redo()).toBe(true);
    expect(core.store()[0].startDate).toEqual(new Date(2026, 7, 6, 12));
    expect(core.undo()).toBe(true);
    expect(core.undo()).toBe(false);
    // rebinding the data forgets the log
    core.redo();
    core.bindSource([]);
    expect(core.canUndo() || core.canRedo()).toBe(false);
  });

  it('undo of a delete re-inserts the same item', () => {
    const { core } = setup();
    const review = core.store()[0];
    core.deleteBySource(review);
    expect(core.store()).not.toContain(review);
    core.undo();
    expect(core.store()).toContain(review);
  });
});

describe('OgeSchedulerCore — availability and conflicts', () => {
  const lunch = [
    {
      startDate: new Date(2026, 7, 3, 12),
      endDate: new Date(2026, 7, 3, 13),
      recurrenceRule: 'FREQ=DAILY',
    },
  ];

  it('refuses a move into a blocked slot (announced + noticed)', () => {
    const { core } = setup({ disabledSlots: () => lunch });
    const review = visible(core, 'Review');
    core.onMoveCommitted({
      appointment: review,
      proposal: {
        startDate: new Date(2026, 7, 6, 12, 30),
        endDate: new Date(2026, 7, 6, 13, 30),
        allDay: false,
      },
    });
    expect(core.store()[0].startDate).toEqual(new Date(2026, 7, 6, 10));
    expect(core.announcement()).toBe('That time is unavailable');
    expect(core.notice()).toBe('That time is unavailable');
  });

  it('refuses to open the create editor on a blocked cell', () => {
    const { core, editors } = setup({ disabledSlots: () => lunch });
    core.openCreateEditor(new Date(2026, 7, 6, 12), false);
    expect(editors).toHaveLength(0);
    core.openCreateEditor(new Date(2026, 7, 6, 14), false);
    expect(editors).toHaveLength(1);
  });

  it('allowOverlap: false refuses overlaps; conflictCheck decides when given', () => {
    const blocked = setup({ allowOverlap: () => false });
    const review = visible(blocked.core, 'Review');
    const onto = {
      startDate: new Date(2026, 7, 7, 9, 15),
      endDate: new Date(2026, 7, 7, 10, 15),
      allDay: false,
    };
    // Review is in room a, Standup in room b: overlap counts ungrouped
    blocked.core.onMoveCommitted({ appointment: review, proposal: onto });
    expect(blocked.core.store()[0].startDate).toEqual(new Date(2026, 7, 6, 10));
    expect(blocked.core.announcement()).toBe('Review overlaps another appointment');
    // grouped by room, the rooms differ → no conflict
    const grouped = setup({ allowOverlap: () => false, groups: () => ['room'] });
    grouped.core.onMoveCommitted({
      appointment: visible(grouped.core, 'Review'),
      proposal: onto,
    });
    expect(grouped.core.store()[0].startDate).toEqual(onto.startDate);
    const seen: number[] = [];
    const checked = setup({
      conflictCheck: () => (_item, conflicts) => {
        seen.push(conflicts.length);
        return true;
      },
      allowOverlap: () => false,
    });
    checked.core.onMoveCommitted({
      appointment: visible(checked.core, 'Review'),
      proposal: onto,
    });
    expect(seen).toEqual([1]);
    expect(checked.core.store()[0].startDate).toEqual(onto.startDate);
  });

  it('snapToWorkHours clamps a move into the resource’s hours', () => {
    const { core } = setup({ snapToWorkHours: () => true });
    core.onMoveCommitted({
      appointment: visible(core, 'Review'),
      proposal: {
        startDate: new Date(2026, 7, 6, 7),
        endDate: new Date(2026, 7, 6, 8),
        allDay: false,
      },
    });
    expect(core.store()[0].startDate).toEqual(new Date(2026, 7, 6, 9));
    // ungrouped: the assigned resource item's own hours
    expect(core.workHoursFor({ room: 'a' })).toEqual({ start: 9, end: 17 });
    expect(core.workHoursFor({ room: 'b' })).toBeNull();
    const grouped = setup({
      groups: () => ['room'],
      workHours: () => ({ start: 8, end: 12 }),
    });
    expect(grouped.core.workHoursFor({ room: 'a' })).toEqual({ start: 9, end: 17 });
    expect(grouped.core.workHoursFor({ room: 'b' })).toEqual({ start: 8, end: 12 });
  });
});

describe('OgeSchedulerCore — external drops and drag out', () => {
  it('builds an item from a dropped payload and emits appointmentDropped', () => {
    const { core, events } = setup({ groups: () => ['room'] });
    const added = core.onExternalDrop(
      { data: { text: 'Walk-in', priority: 2 }, durationMinutes: 45 },
      {
        startDate: new Date(2026, 7, 6, 15),
        allDay: false,
        resources: { room: 'b' },
      },
    );
    expect(added).toBe(true);
    const item = core.store().at(-1)!;
    expect(item).toMatchObject({
      text: 'Walk-in',
      priority: 2,
      room: 'b',
      startDate: new Date(2026, 7, 6, 15),
      endDate: new Date(2026, 7, 6, 15, 45),
    });
    const dropped = events.find((entry) => entry.name === 'appointmentDropped')
      ?.event as OgeSchedulerAppointmentDroppedEvent<Appt>;
    expect(dropped).toMatchObject({ added: true, resources: { room: 'b' } });
    expect(core.announcement()).toBe('Walk-in added');
  });

  it('the keyboard twin: an armed payload lands on the activated cell', () => {
    const { core, editors } = setup();
    armOgeSchedulerPayload({ data: { text: 'Picked' }, durationMinutes: 30 });
    core.onCellActivated({
      cellDate: new Date(2026, 7, 6, 16),
      allDay: false,
      event: new KeyboardEvent('keydown', { key: 'Enter' }),
    });
    expect(editors).toHaveLength(0);
    expect(core.store().at(-1)).toMatchObject({
      text: 'Picked',
      startDate: new Date(2026, 7, 6, 16),
    });
  });

  it('drag out hands the appointment to another scheduler under the pointer', () => {
    const { core, events } = setup();
    const other = document.createElement('section');
    document.body.appendChild(other);
    const drops: unknown[] = [];
    const unregister = registerOgeSchedulerDropTarget({
      element: other,
      resolve: () => ({
        startDate: new Date(2026, 7, 10, 9),
        allDay: false,
        resources: {},
      }),
      over: () => undefined,
      drop: (payload) => {
        drops.push(payload.data);
        return true;
      },
    });
    const original = document.elementFromPoint;
    document.elementFromPoint = () => other;
    try {
      core.onDragOut(visible(core, 'Review'), 500, 500);
    } finally {
      document.elementFromPoint = original;
      unregister();
      other.remove();
    }
    expect(drops).toHaveLength(1);
    const out = events.find((entry) => entry.name === 'dragOut')
      ?.event as OgeSchedulerDragOutEvent<Appt>;
    expect(out.droppedOnScheduler).toBe(true);
    expect(out.appointmentData.text).toBe('Review');
  });

  it('builds the export model of the visible period', () => {
    const { core } = setup();
    const data = core.getExportData();
    expect(data.rangeStart).toEqual(new Date(2026, 7, 3));
    expect(data.rows.filter((row) => row.text === 'Standup')).toHaveLength(7);
    expect(data.messages.subject).toBe('Subject');
    expect(
      core.getExportData({
        startDate: new Date(2026, 7, 6),
        endDate: new Date(2026, 7, 7),
      }).rows,
    ).toHaveLength(2);
  });

  it('a recurring occurrence detach is one undo step', () => {
    const { core } = setup({ recurrenceEditMode: () => 'occurrence' });
    const standup = core
      .visibleAppointments()
      .filter((entry) => entry.text === 'Standup')[2];
    core.onMoveCommitted({
      appointment: standup,
      proposal: {
        startDate: new Date(2026, 7, 5, 15),
        endDate: new Date(2026, 7, 5, 15, 30),
        allDay: false,
      },
    });
    expect(core.store()).toHaveLength(3);
    expect(core.store()[1].recurrenceException).toBe('20260805T090000');
    core.undo();
    expect(core.store()).toHaveLength(2);
    expect(core.store()[1].recurrenceException).toBeUndefined();
    void draftEditorModel;
  });
});
