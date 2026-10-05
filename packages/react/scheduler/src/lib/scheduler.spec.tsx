import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { StrictMode, createRef, useState } from 'react';
import { ArrayDataSource } from '@oge-ui/core';
import type {
  OgeSchedulerAppointmentAddedEvent,
  OgeSchedulerAppointmentDeletingEvent,
  OgeSchedulerAppointmentUpdatedEvent,
  OgeSchedulerMessages,
  OgeSchedulerView,
} from '@oge-ui/scheduler-engine';
import { OgeScheduler } from './scheduler';
import { OgeSchedulerConfigProvider } from './scheduler-config';
import type {
  OgeSchedulerEditorShowingEvent,
  OgeSchedulerHandle,
  OgeSchedulerProps,
} from './scheduler-types';

interface Appt {
  id: number;
  text: string;
  startDate: Date;
  endDate: Date;
  allDay?: boolean;
  color?: string;
  recurrenceRule?: string;
  recurrenceException?: string;
  ownerId?: string;
}

const base = (): Appt[] => [
  {
    id: 1,
    text: 'Standup',
    startDate: new Date(2026, 7, 6, 9),
    endDate: new Date(2026, 7, 6, 9, 30),
  },
  {
    id: 2,
    text: 'Offsite',
    startDate: new Date(2026, 7, 5),
    endDate: new Date(2026, 7, 7),
    allDay: true,
  },
];

function renderScheduler(
  props: Partial<OgeSchedulerProps<Appt>> = {},
  data: readonly Appt[] = base(),
) {
  const ref = createRef<OgeSchedulerHandle<Appt>>();
  const utils = render(
    <OgeScheduler<Appt>
      ref={ref}
      dataSource={data}
      defaultCurrentDate={new Date(2026, 7, 6)}
      firstDayOfWeek={1}
      dayStartHour={8}
      dayEndHour={18}
      showCurrentTimeIndicator={false}
      locale="en-US"
      {...props}
    />,
  );
  return { ...utils, ref, host: utils.container };
}

const q = (host: Element, selector: string) =>
  host.querySelector<HTMLElement>(selector);
/** A required element — throws instead of a non-null assertion. */
function must<E>(value: E | null | undefined): E {
  if (value === null || value === undefined) throw new Error('missing');
  return value;
}
const qa = (host: Element, selector: string) =>
  Array.from(host.querySelectorAll<HTMLElement>(selector));
const text = (host: Element, selector: string) =>
  host.querySelector(selector)?.textContent?.trim() ?? '';

function pointer(type: string, init: MouseEventInit): Event {
  // jsdom has no PointerEvent constructor in some versions — MouseEvent works
  return new MouseEvent(type, { bubbles: true, cancelable: true, ...init });
}

function stubRect(el: Element | null, width: number, height: number): void {
  if (el === null) throw new Error('element missing');
  (el as HTMLElement).getBoundingClientRect = () =>
    ({
      top: 0,
      left: 0,
      width,
      height,
      right: width,
      bottom: height,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect;
}

beforeEach(() => {
  vi.stubGlobal(
    'requestAnimationFrame',
    (cb: FrameRequestCallback) =>
      setTimeout(() => cb(performance.now()), 0) as unknown as number,
  );
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('<OgeScheduler> shell', () => {
  it('renders the toolbar with navigation, title and view switcher', () => {
    const { host } = renderScheduler();
    expect(q(host, '.oge-scheduler-toolbar')?.getAttribute('role')).toBe(
      'toolbar',
    );
    expect(text(host, '.oge-scheduler-title')).toContain('2026');
    const viewButtons = qa(host, '.oge-scheduler-view-btn');
    expect(viewButtons).toHaveLength(3);
    expect(viewButtons[1].getAttribute('aria-pressed')).toBe('true');
  });

  it('paints the appointments in the first render (no effect-seeded data)', () => {
    const { host } = renderScheduler();
    expect(q(host, '.oge-scheduler-row')?.children).toHaveLength(7);
    expect(qa(host, '.oge-scheduler-chip-box')).toHaveLength(1);
    expect(text(host, '.oge-scheduler-chip-box .oge-scheduler-chip-text')).toBe(
      'Standup',
    );
    expect(qa(host, '.oge-scheduler-allday-bar')).toHaveLength(1);
    expect(text(host, '.oge-scheduler-gutter-label')).toBe('All day');
  });

  it('switches views (uncontrolled) and reports them', () => {
    const onCurrentViewChange = vi.fn();
    const { host } = renderScheduler({ onCurrentViewChange });
    fireEvent.click(qa(host, '.oge-scheduler-view-btn')[2]);
    expect(onCurrentViewChange).toHaveBeenCalledWith('month');
    expect(q(host, '.oge-scheduler-month')).toBeTruthy();
    expect(qa(host, '.oge-scheduler-month-week')).toHaveLength(6);
    expect(qa(host, '.oge-scheduler-month-cell')).toHaveLength(42);
    expect(qa(host, '.oge-scheduler-month-bar').length).toBeGreaterThanOrEqual(
      2,
    );
  });

  it('honors a controlled view and date', () => {
    function Host() {
      const [view, setView] = useState<OgeSchedulerView>('day');
      const [date, setDate] = useState(new Date(2026, 7, 6));
      return (
        <>
          <OgeScheduler<Appt>
            dataSource={base()}
            currentView={view}
            onCurrentViewChange={setView}
            currentDate={date}
            onCurrentDateChange={setDate}
            firstDayOfWeek={1}
            locale="en-US"
          />
          <output data-testid="date">{date.toDateString()}</output>
        </>
      );
    }
    const { container, getByTestId } = render(<Host />);
    expect(q(container, '.oge-scheduler-row')?.children).toHaveLength(1);
    const [, next] = qa(container, '.oge-scheduler-btn-icon');
    fireEvent.click(next);
    expect(getByTestId('date').textContent).toBe(
      new Date(2026, 7, 7).toDateString(),
    );
  });

  it('navigates periods and today through the toolbar', () => {
    const onCurrentDateChange = vi.fn();
    const { host } = renderScheduler({ onCurrentDateChange });
    const [prev, next] = qa(host, '.oge-scheduler-btn-icon');
    fireEvent.click(next);
    expect(onCurrentDateChange).toHaveBeenLastCalledWith(new Date(2026, 7, 13));
    fireEvent.click(prev);
    fireEvent.click(prev);
    expect(onCurrentDateChange).toHaveBeenLastCalledWith(new Date(2026, 6, 30));
    fireEvent.click(qa(host, '.oge-scheduler-btn')[0]);
    const today = onCurrentDateChange.mock.lastCall?.[0] as Date;
    expect(today.getDate()).toBe(new Date().getDate());
  });

  it('clamps navigation to min/max and disables the buttons at the edge', () => {
    const { host } = renderScheduler({ max: new Date(2026, 7, 9) });
    const [, next] = qa(host, '.oge-scheduler-btn-icon');
    expect((next as HTMLButtonElement).disabled).toBe(true);
  });

  it('applies per-instance message overrides over the context config', () => {
    const messages: Partial<OgeSchedulerMessages> = {
      toolbar: {
        label: 'Zeitplaner',
        today: 'Heute',
        previous: 'Zurück',
        next: 'Weiter',
        viewSwitcherLabel: 'Ansichten',
        dateNavigatorLabel: 'Datum wählen',
        newAppointment: 'Neu',
        viewNames: {
          day: 'Tag',
          week: 'Woche',
          workWeek: 'Arbeitswoche',
          month: 'Monat',
          agenda: 'Agenda',
          timelineDay: 'Zeitachse Tag',
          timelineWeek: 'Zeitachse Woche',
          year: 'Jahr',
        },
      },
    };
    const { host } = renderScheduler({ messages });
    expect(text(host, '.oge-scheduler-btn')).toBe('Heute');
    expect(q(host, '.oge-scheduler-toolbar')?.getAttribute('aria-label')).toBe(
      'Zeitplaner',
    );
  });

  it('re-resolves when the config provider receives a new config', () => {
    function Host({ today }: { today: string }) {
      return (
        <OgeSchedulerConfigProvider
          config={{
            messages: {
              popup: { edit: 'E', deleteAppointment: 'D', close: 'C' },
              toolbar: {
                ...{
                  label: 'Scheduler toolbar',
                  previous: 'Previous period',
                  next: 'Next period',
                  viewSwitcherLabel: 'Views',
                  dateNavigatorLabel: 'Choose a date',
                  newAppointment: 'New',
                  viewNames: {
                    day: 'Day',
                    week: 'Week',
                    workWeek: 'Work Week',
                    month: 'Month',
                    agenda: 'Agenda',
                    timelineDay: 'Timeline Day',
                    timelineWeek: 'Timeline Week',
                    year: 'Year',
                  },
                },
                today,
              },
            },
          }}
        >
          <OgeScheduler<Appt>
            dataSource={base()}
            defaultCurrentDate={new Date(2026, 7, 6)}
          />
        </OgeSchedulerConfigProvider>
      );
    }
    const { container, rerender } = render(<Host today="Now" />);
    expect(text(container, '.oge-scheduler-btn')).toBe('Now');
    rerender(<Host today="Jetzt" />);
    expect(text(container, '.oge-scheduler-btn')).toBe('Jetzt');
  });

  it('survives a StrictMode remount (cleanup → revive) with its data', async () => {
    const source = new ArrayDataSource<Appt>(base(), { key: 'id' });
    const { container } = render(
      <StrictMode>
        <OgeScheduler<Appt>
          dataSource={source}
          defaultCurrentDate={new Date(2026, 7, 6)}
          locale="en-US"
        />
      </StrictMode>,
    );
    await waitFor(() =>
      expect(qa(container, '.oge-scheduler-chip-box')).toHaveLength(1),
    );
    // the revived core still runs the pipelines
    fireEvent.click(qa(container, '.oge-scheduler-view-btn')[2]);
    expect(q(container, '.oge-scheduler-month')).toBeTruthy();
  });
});

describe('<OgeScheduler> editing', () => {
  it('opens the popup on chip click and the editor from its Edit action', async () => {
    const onAppointmentClick = vi.fn();
    const onEditorShowing = vi.fn();
    const { host } = renderScheduler({ onAppointmentClick, onEditorShowing });
    fireEvent.click(must(q(host, '.oge-scheduler-chip-box')));
    expect(onAppointmentClick).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(document.querySelector('.oge-scheduler-popup')).toBeTruthy(),
    );
    expect(
      document.querySelector('.oge-scheduler-popup-title')?.textContent,
    ).toBe('Standup');
    fireEvent.click(
      Array.from(
        document.querySelectorAll<HTMLElement>(
          '.oge-scheduler-popup-actions .oge-scheduler-btn',
        ),
      )[0],
    );
    expect(onEditorShowing).toHaveBeenCalledTimes(1);
    const event = onEditorShowing.mock
      .lastCall?.[0] as OgeSchedulerEditorShowingEvent<Appt>;
    expect(event.isNew).toBe(false);
    expect(event.formItems.map((item) => item.field)).toContain('startDate');
    await waitFor(() =>
      expect(document.querySelector('.oge-scheduler-editor-form')).toBeTruthy(),
    );
  });

  it('deletes through the popup with a cancelable pipeline', async () => {
    let veto = true;
    const onAppointmentDeleting = vi.fn(
      (event: OgeSchedulerAppointmentDeletingEvent<Appt>) => {
        event.cancel = veto;
      },
    );
    const onAppointmentDeleted = vi.fn();
    const { host } = renderScheduler({
      onAppointmentDeleting,
      onAppointmentDeleted,
    });
    const chip = must(q(host, '.oge-scheduler-chip-box'));
    chip.focus();
    fireEvent.keyDown(chip, { key: 'Delete' });
    expect(onAppointmentDeleting).toHaveBeenCalledTimes(1);
    expect(onAppointmentDeleted).not.toHaveBeenCalled();
    expect(qa(host, '.oge-scheduler-chip-box')).toHaveLength(1);
    veto = false;
    fireEvent.keyDown(must(q(host, '.oge-scheduler-chip-box')), {
      key: 'Delete',
    });
    expect(onAppointmentDeleted).toHaveBeenCalledTimes(1);
    expect(qa(host, '.oge-scheduler-chip-box')).toHaveLength(0);
    expect(text(host, '.oge-scheduler-live')).toBe('Standup deleted');
  });

  it('cell double-click opens a prefilled create editor; saving inserts', async () => {
    const onAppointmentAdded =
      vi.fn<(event: OgeSchedulerAppointmentAddedEvent<Appt>) => void>();
    const onEditorShowing = vi.fn();
    const onCellDblClick = vi.fn();
    const { host } = renderScheduler({
      onAppointmentAdded,
      onEditorShowing,
      onCellDblClick,
    });
    const cell = qa(host, '.oge-scheduler-cell')[4 * 7 + 3]; // 10:00 Thu
    fireEvent.doubleClick(cell);
    expect(onCellDblClick).toHaveBeenCalledTimes(1);
    const showing = onEditorShowing.mock
      .lastCall?.[0] as OgeSchedulerEditorShowingEvent<Appt>;
    expect(showing.isNew).toBe(true);
    expect(showing.appointmentData.startDate).toEqual(new Date(2026, 7, 6, 10));
    const form = await waitFor(() => {
      const el = document.querySelector('.oge-scheduler-editor-form');
      expect(el).toBeTruthy();
      return el as HTMLElement;
    });
    const subject = must(form.querySelector<HTMLInputElement>('input'));
    fireEvent.change(subject, { target: { value: 'Planning' } });
    fireEvent.input(subject, { target: { value: 'Planning' } });
    const save = must(
      document.querySelector<HTMLElement>(
        '.oge-scheduler-editor-footer .oge-scheduler-btn-primary',
      ),
    );
    fireEvent.click(save);
    await waitFor(() => expect(onAppointmentAdded).toHaveBeenCalledTimes(1));
    expect(onAppointmentAdded.mock.lastCall?.[0].appointmentData.text).toBe(
      'Planning',
    );
  });

  it('a cancelled onEditorShowing keeps the editor closed', () => {
    const { host } = renderScheduler({
      onEditorShowing: (event) => {
        event.cancel = true;
      },
    });
    fireEvent.click(must(q(host, '.oge-scheduler-btn-add')));
    expect(document.querySelector('.oge-scheduler-editor-form')).toBeNull();
  });

  it('readOnly hides the add button and blocks deletes', () => {
    const onAppointmentDeleting = vi.fn();
    const { host } = renderScheduler({ readOnly: true, onAppointmentDeleting });
    expect(q(host, '.oge-scheduler-btn-add')).toBeNull();
    fireEvent.keyDown(must(q(host, '.oge-scheduler-chip-box')), {
      key: 'Delete',
    });
    expect(onAppointmentDeleting).not.toHaveBeenCalled();
  });

  it('runs the imperative handle through the same pipelines', () => {
    const onAppointmentAdded = vi.fn();
    const { ref, host } = renderScheduler({ onAppointmentAdded });
    act(() =>
      must(ref.current).addAppointment({
        id: 3,
        text: 'Added',
        startDate: new Date(2026, 7, 4, 13),
        endDate: new Date(2026, 7, 4, 14),
      }),
    );
    expect(onAppointmentAdded).toHaveBeenCalledTimes(1);
    expect(qa(host, '.oge-scheduler-chip-box')).toHaveLength(2);
    expect(must(ref.current).getStartViewDate()).toEqual(new Date(2026, 7, 3));
    expect(must(ref.current).getEndViewDate()).toEqual(new Date(2026, 7, 10));
    expect(Array.isArray(must(ref.current).getDataSource())).toBe(true);
  });

  it('opens the built-in context menu and creates from it', async () => {
    const onCellContextMenu = vi.fn();
    const onEditorShowing = vi.fn();
    const { host } = renderScheduler({ onCellContextMenu, onEditorShowing });
    fireEvent.contextMenu(qa(host, '.oge-scheduler-cell')[10]);
    expect(onCellContextMenu).toHaveBeenCalledTimes(1);
    const item = must(q(host, '.oge-scheduler-menu-item'));
    expect(item.textContent).toBe('New appointment');
    fireEvent.click(item);
    expect(q(host, '.oge-scheduler-menu')).toBeNull();
    expect(onEditorShowing).toHaveBeenCalledTimes(1);
  });
});

describe('<OgeScheduler> recurrence & resources', () => {
  const series = (): Appt[] => [
    {
      id: 1,
      text: 'Daily',
      startDate: new Date(2026, 7, 3, 9),
      endDate: new Date(2026, 7, 3, 9, 30),
      recurrenceRule: 'FREQ=DAILY',
    },
  ];

  it('expands a daily series into one occurrence per visible day', () => {
    const { host } = renderScheduler({}, series());
    expect(qa(host, '.oge-scheduler-chip-box')).toHaveLength(7);
    expect(q(host, '.oge-scheduler-chip-recur')).toBeTruthy();
  });

  it('asks "this occurrence or the series?" and detaches an occurrence', () => {
    const updated: OgeSchedulerAppointmentUpdatedEvent<Appt>[] = [];
    const { host } = renderScheduler(
      { onAppointmentUpdated: (event) => updated.push(event) },
      series(),
    );
    const chip = qa(host, '.oge-scheduler-chip-box')[2];
    fireEvent.keyDown(chip, { key: 'Delete' });
    expect(q(host, '.oge-scheduler-scope')?.textContent).toContain('deletion');
    fireEvent.click(
      qa(host, '.oge-scheduler-scope-actions .oge-scheduler-btn')[1],
    );
    expect(q(host, '.oge-scheduler-scope')).toBeNull();
    expect(updated.at(-1)?.appointmentData.recurrenceException).toContain(
      '20260805T090000',
    );
    expect(qa(host, '.oge-scheduler-chip-box')).toHaveLength(6);
  });

  it('groups timeline rows by resource and colors from it', () => {
    const { host } = renderScheduler(
      {
        defaultCurrentView: 'timelineWeek',
        views: ['week', 'timelineWeek'],
        resources: [
          {
            fieldExpr: 'ownerId',
            useColorAsDefault: true,
            items: [
              { id: 'ada', text: 'Ada', color: '#7c3aed' },
              { id: 'grace', text: 'Grace', color: '#0891b2' },
            ],
          },
        ],
        groups: ['ownerId'],
      },
      [
        {
          id: 1,
          text: 'Pairing',
          startDate: new Date(2026, 7, 5, 14),
          endDate: new Date(2026, 7, 5, 16),
          ownerId: 'grace',
        },
      ],
    );
    const heads = qa(host, '.oge-scheduler-timeline-rowhead').map((el) =>
      el.textContent?.trim(),
    );
    expect(heads).toEqual(['Ada', 'Grace']);
    const bar = must(q(host, '.oge-scheduler-timeline-bar'));
    expect(bar.style.backgroundColor).toBe('rgb(8, 145, 178)');
  });

  it('lists the agenda by day and drills from the year view', () => {
    const onCurrentViewChange = vi.fn();
    const { host } = renderScheduler({
      defaultCurrentView: 'agenda',
      views: ['agenda', 'year'],
      onCurrentViewChange,
    });
    expect(qa(host, '.oge-scheduler-agenda-day').length).toBeGreaterThan(0);
    fireEvent.click(qa(host, '.oge-scheduler-view-btn')[1]);
    expect(qa(host, '.oge-scheduler-year-month')).toHaveLength(12);
    fireEvent.click(must(q(host, '.oge-scheduler-year-busy')));
    expect(onCurrentViewChange).toHaveBeenLastCalledWith('day');
  });
});

describe('<OgeScheduler> keyboard & gestures', () => {
  it('exposes a role=grid with exactly one roving tabindex cell', () => {
    const { host } = renderScheduler();
    const grid = must(q(host, '[role="grid"]'));
    expect(grid.getAttribute('aria-label')).toContain('Scheduler,');
    expect(qa(host, '.oge-scheduler-cell[tabindex="0"]')).toHaveLength(1);
  });

  it('moves the roving focus with arrows and Home/End', async () => {
    const { host } = renderScheduler();
    const first = qa(host, '.oge-scheduler-cell')[0];
    fireEvent.keyDown(first, { key: 'ArrowDown' });
    fireEvent.keyDown(qa(host, '.oge-scheduler-cell[tabindex="0"]')[0], {
      key: 'End',
    });
    const focused = qa(host, '.oge-scheduler-cell')[1 * 7 + 6];
    expect(focused.getAttribute('tabindex')).toBe('0');
  });

  it('Ctrl+ArrowDown moves a chip one slot and announces it', () => {
    const onAppointmentUpdated = vi.fn();
    const { host } = renderScheduler({ onAppointmentUpdated });
    fireEvent.keyDown(must(q(host, '.oge-scheduler-chip-box')), {
      key: 'ArrowDown',
      ctrlKey: true,
    });
    expect(
      onAppointmentUpdated.mock.lastCall?.[0].appointmentData.startDate,
    ).toEqual(new Date(2026, 7, 6, 9, 30));
    expect(text(host, '.oge-scheduler-live')).toContain('Standup moved to');
  });

  it('drag-move commits a slot-snapped move; Escape cancels', () => {
    const onAppointmentUpdated = vi.fn();
    const { host } = renderScheduler({ onAppointmentUpdated });
    stubRect(q(host, '.oge-scheduler-rows'), 700, 600);
    // 700px / 7 days = 100px per day; 600px / 600min window = 1px per minute
    fireEvent(
      must(q(host, '.oge-scheduler-chip-box')),
      pointer('pointerdown', { clientX: 350, clientY: 90, button: 0 }),
    );
    act(() => {
      document.dispatchEvent(
        pointer('pointermove', { clientX: 452, clientY: 152 }),
      );
    });
    expect(q(host, '.oge-scheduler-drag-preview')).toBeTruthy();
    act(() => {
      document.dispatchEvent(pointer('pointerup', {}));
    });
    expect(
      onAppointmentUpdated.mock.lastCall?.[0].appointmentData.startDate,
    ).toEqual(new Date(2026, 7, 7, 10));

    fireEvent(
      must(q(host, '.oge-scheduler-chip-box')),
      pointer('pointerdown', { clientX: 450, clientY: 150, button: 0 }),
    );
    act(() => {
      document.dispatchEvent(
        pointer('pointermove', { clientX: 560, clientY: 200 }),
      );
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
    });
    expect(onAppointmentUpdated).toHaveBeenCalledTimes(1);
    expect(text(host, '.oge-scheduler-live')).toBe('Cancelled');
  });

  it('drag-to-create selects a range and opens the editor', () => {
    const onRangeSelected = vi.fn();
    const onEditorShowing = vi.fn();
    const { host } = renderScheduler({ onRangeSelected, onEditorShowing });
    stubRect(q(host, '.oge-scheduler-rows'), 700, 600);
    const cell = qa(host, '.oge-scheduler-cell')[2 * 7 + 0]; // Mon 9:00
    fireEvent(
      cell,
      pointer('pointerdown', { clientX: 50, clientY: 60, button: 0 }),
    );
    act(() => {
      document.dispatchEvent(
        pointer('pointermove', { clientX: 50, clientY: 150 }),
      );
    });
    expect(q(host, '.oge-scheduler-selection')).toBeTruthy();
    act(() => {
      document.dispatchEvent(pointer('pointerup', {}));
    });
    expect(onRangeSelected).toHaveBeenCalledWith({
      startDate: new Date(2026, 7, 3, 9),
      endDate: new Date(2026, 7, 3, 10, 30),
      resourceId: undefined,
      resources: {},
    });
    expect(onEditorShowing).toHaveBeenCalledTimes(1);
  });

  it('renders the appointment, cell and date-header render props', () => {
    const { host } = renderScheduler({
      renderAppointment: ({ appointment, view }) => (
        <b className="custom-chip">
          {appointment.text}/{view}
        </b>
      ),
      renderDateHeader: ({ date }) => (
        <i className="custom-head">{date.getDate()}</i>
      ),
      renderCell: ({ allDay }) =>
        allDay ? null : <span className="custom-cell" />,
    });
    expect(text(host, '.oge-scheduler-chip-box .custom-chip')).toBe(
      'Standup/week',
    );
    expect(qa(host, '.custom-head')).toHaveLength(7);
    expect(qa(host, '.custom-cell')).toHaveLength(20 * 7);
  });
});
