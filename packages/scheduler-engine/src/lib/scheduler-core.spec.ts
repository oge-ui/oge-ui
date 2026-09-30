import type { OgeReactiveCell, OgeReactivityAdapter } from '@oge-ui/behavior';
import { ArrayDataSource } from '@oge-ui/core';
import { OGE_DEFAULT_SCHEDULER_CONFIG } from './config';
import { buildSchedulerEditorItems } from './editor';
import {
  OgeSchedulerCore,
  type OgeSchedulerCoreEvents,
  type OgeSchedulerCoreInputs,
} from './scheduler-core';
import type { SchedulerAppointment } from './scheduler-model';
import type { OgeSchedulerView } from './scheduler-types';

/**
 * A plain-closure adapter with no memoization — proves the machine does not
 * depend on either framework's caching (the behavior-package rule).
 */
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
  id: number;
  text: string;
  startDate: Date;
  endDate: Date;
  recurrenceRule?: string;
  recurrenceException?: string;
  ownerId?: string;
  reminder?: number;
}

function setup(
  overrides: Partial<OgeSchedulerCoreInputs<Appt>> = {},
  data: readonly Appt[] = [
    {
      id: 1,
      text: 'Standup',
      startDate: new Date(2026, 7, 6, 9),
      endDate: new Date(2026, 7, 6, 9, 30),
    },
  ],
) {
  let date = new Date(2026, 7, 6);
  let view: OgeSchedulerView = 'week';
  const log: { name: string; event: unknown }[] = [];
  const popups: SchedulerAppointment<Appt>[] = [];
  const editors: { isNew: boolean; model: unknown }[] = [];
  let cancelNext: string | null = null;
  const record =
    (name: keyof OgeSchedulerCoreEvents<Appt, unknown>) => (event: unknown) => {
      if (cancelNext === name) {
        (event as { cancel: boolean }).cancel = true;
        cancelNext = null;
      }
      log.push({ name, event });
    };
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
    views: () => ['day', 'week', 'month'],
    firstDayOfWeek: () => 1,
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
    recurrenceEditMode: () => 'dialog',
    min: () => undefined,
    max: () => undefined,
    dateNavigatorText: () => undefined,
    ...overrides,
  };
  const core = new OgeSchedulerCore<Appt, unknown>({
    rx: PLAIN,
    inputs,
    config: () => OGE_DEFAULT_SCHEDULER_CONFIG,
    setCurrentDate: (next) => (date = next),
    setCurrentView: (next) => (view = next),
    events: {
      appointmentAdding: record('appointmentAdding'),
      appointmentAdded: record('appointmentAdded'),
      appointmentUpdating: record('appointmentUpdating'),
      appointmentUpdated: record('appointmentUpdated'),
      appointmentDeleting: record('appointmentDeleting'),
      appointmentDeleted: record('appointmentDeleted'),
      appointmentClick: record('appointmentClick'),
      appointmentDblClick: record('appointmentDblClick'),
      cellClick: record('cellClick'),
      cellDblClick: record('cellDblClick'),
      editorShowing: record('editorShowing'),
      rangeSelected: record('rangeSelected'),
      appointmentContextMenu: record('appointmentContextMenu'),
      cellContextMenu: record('cellContextMenu'),
      reminderTriggered: record('reminderTriggered'),
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
      hostRect: () => ({ left: 10, top: 20 }),
      focusMenu: () => undefined,
    },
  });
  core.bindSource(inputs.dataSource());
  return {
    core,
    log,
    popups,
    editors,
    date: () => date,
    view: () => view,
    cancel: (name: string) => (cancelNext = name),
    names: () => log.map((entry) => entry.name),
  };
}

describe('OgeSchedulerCore', () => {
  it('copies an array source and never mutates it', () => {
    const data: Appt[] = [
      {
        id: 1,
        text: 'A',
        startDate: new Date(2026, 7, 6, 9),
        endDate: new Date(2026, 7, 6, 10),
      },
    ];
    const { core } = setup({ dataSource: () => data }, data);
    core.addAppointment({
      id: 2,
      text: 'B',
      startDate: new Date(2026, 7, 6, 11),
      endDate: new Date(2026, 7, 6, 12),
    });
    expect(core.store()).toHaveLength(2);
    expect(data).toHaveLength(1);
  });

  it('rebinding the same source is a no-op; destroy() lets it rebind', () => {
    const { core } = setup();
    core.addAppointment({
      id: 2,
      text: 'B',
      startDate: new Date(2026, 7, 6, 11),
      endDate: new Date(2026, 7, 6, 12),
    });
    const source = core['inputs'].dataSource();
    core.bindSource(source);
    expect(core.store()).toHaveLength(2);
    core.destroy();
    core.bindSource(source);
    expect(core.store()).toHaveLength(1);
  });

  it('runs the cancelable add pipeline and announces', () => {
    const { core, names, cancel } = setup();
    cancel('appointmentAdding');
    core.addAppointment({
      id: 9,
      text: 'Vetoed',
      startDate: new Date(2026, 7, 6, 11),
      endDate: new Date(2026, 7, 6, 12),
    });
    expect(core.store()).toHaveLength(1);
    expect(names()).toEqual(['appointmentAdding']);
    core.addAppointment({
      id: 10,
      text: 'Kept',
      startDate: new Date(2026, 7, 6, 11),
      endDate: new Date(2026, 7, 6, 12),
    });
    expect(core.store()).toHaveLength(2);
    expect(names().slice(-2)).toEqual([
      'appointmentAdding',
      'appointmentAdded',
    ]);
    expect(core.announcement()).toBe('Kept created');
  });

  it('updates and deletes through the guarded pipelines', () => {
    const { core, names, log } = setup();
    const item = core.store()[0];
    core.updateAppointment(item, { text: 'Renamed' });
    expect(core.store()[0].text).toBe('Renamed');
    expect(
      (log.at(-1)?.event as { appointmentData: Appt }).appointmentData.text,
    ).toBe('Renamed');
    core.deleteAppointment(core.store()[0]);
    expect(core.store()).toHaveLength(0);
    expect(names().slice(-2)).toEqual([
      'appointmentDeleting',
      'appointmentDeleted',
    ]);
  });

  it('readOnly blocks every write', () => {
    const { core } = setup({ readOnly: () => true });
    core.deleteAppointment(core.store()[0]);
    core.addAppointment({
      id: 2,
      text: 'B',
      startDate: new Date(2026, 7, 6, 11),
      endDate: new Date(2026, 7, 6, 12),
    });
    expect(core.store()).toHaveLength(1);
    expect(core.canAdd()).toBe(false);
    expect(core.canDrag()).toBe(false);
  });

  it('writes through a DataSource and reloads', async () => {
    const source = new ArrayDataSource<Appt>(
      [
        {
          id: 1,
          text: 'Remote',
          startDate: new Date(2026, 7, 6, 9),
          endDate: new Date(2026, 7, 6, 10),
        },
      ],
      { key: 'id' },
    );
    const { core } = setup({ dataSource: () => source });
    core.bindSource(source);
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(core.store()).toHaveLength(1);
    core.addAppointment({
      id: 2,
      text: 'Inserted',
      startDate: new Date(2026, 7, 6, 11),
      endDate: new Date(2026, 7, 6, 12),
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(core.store()).toHaveLength(2);
  });

  it('navigates by period, clamps to min/max and drills into days', () => {
    const { core, date, view } = setup({
      max: () => new Date(2026, 7, 10),
    });
    core.navigate(1);
    expect(date()).toEqual(new Date(2026, 7, 10));
    expect(core.canNavigate(1)).toBe(false);
    core.drillIntoDay(new Date(2026, 7, 4));
    expect(view()).toBe('day');
    expect(date()).toEqual(new Date(2026, 7, 4));
  });

  it('reports the visible period and filters the window', () => {
    const { core } = setup();
    expect(core.getStartViewDate()).toEqual(new Date(2026, 7, 3));
    expect(core.getEndViewDate()).toEqual(new Date(2026, 7, 10));
    expect(core.visibleAppointments()).toHaveLength(1);
    expect(core.periodTitle()).toContain('2026');
  });

  it('opens the create editor on a cell double click, prefilled', () => {
    const { core, editors, names } = setup();
    core.onCellDblClicked({
      cellDate: new Date(2026, 7, 6, 14),
      allDay: false,
      event: new MouseEvent('dblclick'),
    });
    expect(names()).toEqual(['cellDblClick', 'editorShowing']);
    expect(editors[0].isNew).toBe(true);
    expect((editors[0].model as { endDate: Date }).endDate).toEqual(
      new Date(2026, 7, 6, 14, 30),
    );
    core.onEditorSaved({
      isNew: true,
      model: {
        ...(editors[0].model as object),
        text: 'Planning',
      } as never,
    });
    expect(core.store()).toHaveLength(2);
  });

  it('a cancelled editorShowing keeps the editor closed', () => {
    const { core, editors, cancel } = setup();
    cancel('editorShowing');
    core.showAppointmentPopup(undefined, true);
    expect(editors).toHaveLength(0);
  });

  it('routes recurring occurrences through the scope dialog', () => {
    const { core } = setup({}, [
      {
        id: 1,
        text: 'Daily',
        startDate: new Date(2026, 7, 3, 9),
        endDate: new Date(2026, 7, 3, 9, 30),
        recurrenceRule: 'FREQ=DAILY',
      },
    ]);
    const occurrence = core
      .visibleAppointments()
      .find((entry) => entry.startDate.getDate() === 5);
    expect(occurrence?.seriesKey).not.toBeNull();
    core.onDeleteRequested(occurrence!);
    expect(core.scopePending()?.action).toBe('delete');
    expect(core.scopeText(core.scopePending()!)).toContain('deletion');
    core.resolveScope('occurrence');
    expect(core.scopePending()).toBeNull();
    expect(core.store()[0].recurrenceException).toContain('20260805T090000');
  });

  it("recurrenceEditMode 'series' shifts the whole series on a move", () => {
    const { core } = setup({ recurrenceEditMode: () => 'series' }, [
      {
        id: 1,
        text: 'Daily',
        startDate: new Date(2026, 7, 3, 9),
        endDate: new Date(2026, 7, 3, 9, 30),
        recurrenceRule: 'FREQ=DAILY',
      },
    ]);
    const occurrence = core
      .visibleAppointments()
      .find((entry) => entry.startDate.getDate() === 5)!;
    core.onGroupedMoveCommitted({
      appointment: occurrence,
      proposal: {
        startDate: new Date(2026, 7, 5, 10),
        endDate: new Date(2026, 7, 5, 10, 30),
        allDay: false,
      },
    });
    expect(core.store()[0].startDate).toEqual(new Date(2026, 7, 3, 10));
  });

  it('patches the grouping resource on a cross-row move', () => {
    const resources = [
      {
        fieldExpr: 'ownerId',
        items: [
          { id: 'a', text: 'A' },
          { id: 'b', text: 'B' },
        ],
      },
    ];
    const { core } = setup(
      { resources: () => resources, groups: () => ['ownerId'] },
      [
        {
          id: 1,
          text: 'Owned',
          startDate: new Date(2026, 7, 6, 9),
          endDate: new Date(2026, 7, 6, 10),
          ownerId: 'a',
        },
      ],
    );
    const appointment = core.visibleAppointments()[0];
    core.onGroupedMoveCommitted({
      appointment,
      proposal: {
        startDate: appointment.startDate,
        endDate: appointment.endDate,
        allDay: false,
      },
      resourceId: 'b',
    });
    expect(core.store()[0].ownerId).toBe('b');
    expect(core.announcement()).toContain('Owned moved to');
  });

  it('opens the built-in context menu host-relative and runs its actions', () => {
    const { core, editors } = setup();
    const event = new MouseEvent('contextmenu', {
      clientX: 110,
      clientY: 220,
      cancelable: true,
    });
    core.onCellContextMenu({
      cellDate: new Date(2026, 7, 6, 15),
      allDay: false,
      event,
    });
    expect(event.defaultPrevented).toBe(true);
    expect(core.contextMenu()).toMatchObject({ x: 100, y: 200 });
    core.menuCreate();
    expect(core.contextMenu()).toBeNull();
    expect(editors).toHaveLength(1);
  });

  it('keeps the native menu when no action is available', () => {
    const { core } = setup({ allowAdding: () => false });
    const event = new MouseEvent('contextmenu', { cancelable: true });
    core.onCellContextMenu({
      cellDate: new Date(2026, 7, 6, 15),
      allDay: false,
      event,
    });
    expect(event.defaultPrevented).toBe(false);
    expect(core.contextMenu()).toBeNull();
  });

  it('fires each reminder once when its lead time is reached', () => {
    const { core, names } = setup({}, [
      {
        id: 1,
        text: 'Soon',
        startDate: new Date(2026, 7, 6, 9, 10),
        endDate: new Date(2026, 7, 6, 9, 30),
        reminder: 15,
      },
    ]);
    core.checkReminders(new Date(2026, 7, 6, 8, 50));
    expect(names()).toEqual([]);
    core.checkReminders(new Date(2026, 7, 6, 9, 0));
    core.checkReminders(new Date(2026, 7, 6, 9, 1));
    expect(names()).toEqual(['reminderTriggered']);
  });

  it('chip clicks emit and open the popup; activation only opens it', () => {
    const { core, popups, names } = setup();
    const appointment = core.visibleAppointments()[0];
    const rect = new DOMRect(0, 0, 10, 10);
    core.onChipClicked({ appointment, event: new MouseEvent('click'), rect });
    core.onChipActivated({
      appointment,
      event: new KeyboardEvent('keydown'),
      rect,
    });
    expect(popups).toHaveLength(2);
    expect(names()).toEqual(['appointmentClick']);
  });
});
