import { act, fireEvent, render } from '@testing-library/react';
import { StrictMode, createRef, useState, type ReactElement } from 'react';
import type {
  OgeSchedulerAppointmentAddedEvent,
  OgeSchedulerAppointmentDroppedEvent,
  OgeSchedulerResource,
  OgeSchedulerView,
  OgeSchedulerViewOptions,
} from '@oge-ui/scheduler-engine';
import { exportToICalendar, importICalendar } from '../export-ical';
import { OgeScheduler } from './scheduler';
import type { OgeSchedulerHandle, OgeSchedulerProps } from './scheduler-types';
import { useOgeSchedulerDraggable } from './use-scheduler-draggable';

interface Appt {
  id?: number;
  text: string;
  startDate: Date;
  endDate: Date;
  room?: string;
  owner?: string;
  recurrenceRule?: string;
}

const RESOURCES: OgeSchedulerResource[] = [
  {
    fieldExpr: 'room',
    label: 'Room',
    items: [
      { id: 'a', text: 'Atlas', workHours: { start: 9, end: 12 } },
      { id: 'b', text: 'Borealis' },
    ],
  },
  {
    fieldExpr: 'owner',
    label: 'Owner',
    items: [
      { id: 'ada', text: 'Ada' },
      { id: 'grace', text: 'Grace' },
    ],
  },
];

const VIEWS: readonly (OgeSchedulerView | OgeSchedulerViewOptions)[] = [
  'day',
  { type: 'day', intervalCount: 3, name: '3 days' },
  'week',
  'month',
  'timelineWorkWeek',
  'timelineMonth',
  'timelineYear',
];

const data = (): Appt[] => [
  {
    id: 1,
    text: 'Review',
    startDate: new Date(2026, 7, 6, 10),
    endDate: new Date(2026, 7, 6, 11),
    room: 'a',
    owner: 'ada',
  },
  {
    id: 2,
    text: 'Pairing',
    startDate: new Date(2026, 7, 6, 13),
    endDate: new Date(2026, 7, 6, 14),
    room: 'b',
    owner: 'grace',
  },
];

function renderScheduler(props: Partial<OgeSchedulerProps<Appt>> = {}) {
  const ref = createRef<OgeSchedulerHandle<Appt>>();
  const utils = render(
    <StrictMode>
      <OgeScheduler<Appt>
        ref={ref}
        dataSource={props.dataSource ?? data()}
        defaultCurrentDate={new Date(2026, 7, 6)}
        defaultCurrentView="day"
        views={VIEWS}
        resources={RESOURCES}
        firstDayOfWeek={1}
        dayStartHour={8}
        dayEndHour={18}
        cellDuration={60}
        maxAppointmentsPerCell={1}
        recurrenceEditMode="series"
        showCurrentTimeIndicator={false}
        locale="en-US"
        {...props}
      />
    </StrictMode>,
  );
  return { ...utils, ref, host: utils.container };
}

const qa = (host: Element, selector: string) =>
  Array.from(host.querySelectorAll<HTMLElement>(selector));
function must<E>(value: E | null | undefined): E {
  if (value === null || value === undefined) throw new Error('missing');
  return value;
}
const chip = (host: Element, label: string) =>
  must(
    qa(host, '.oge-scheduler-chip-box').find((el) =>
      el.textContent?.includes(label),
    ),
  );
const cellAt = (host: Element, hour: number) =>
  must(
    qa(host, '.oge-scheduler-rows .oge-scheduler-row')[hour - 8].querySelector<HTMLElement>(
      '.oge-scheduler-cell',
    ),
  );
const flush = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

beforeEach(() => {
  vi.stubGlobal(
    'requestAnimationFrame',
    (cb: FrameRequestCallback) =>
      setTimeout(() => cb(performance.now()), 0) as unknown as number,
  );
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
});

afterEach(() => vi.unstubAllGlobals());

describe('<OgeScheduler> G3 — views', () => {
  it('tells same-type switcher entries apart and renders a 3-day view', () => {
    const { host } = renderScheduler();
    const buttons = qa(host, '.oge-scheduler-view-btn');
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(buttons[1]);
    expect(buttons[0].getAttribute('aria-pressed')).toBe('false');
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
    expect(must(host.querySelector('.oge-scheduler-row')).children).toHaveLength(3);
  });

  it('shows week numbers in the header corner and the month rows', () => {
    const { host, rerender, ref } = renderScheduler({
      showWeekNumbers: true,
      defaultCurrentView: 'week',
    });
    void rerender;
    void ref;
    expect(host.querySelector('.oge-scheduler-week-number')?.textContent).toBe('W32');
    fireEvent.click(qa(host, '.oge-scheduler-view-btn')[3]);
    expect(
      qa(host, '.oge-scheduler-month-cell .oge-scheduler-week-number'),
    ).toHaveLength(6);
  });

  it('renders the work-week, month and year timelines', () => {
    const { host } = renderScheduler();
    const views = qa(host, '.oge-scheduler-view-btn');
    fireEvent.click(views[4]);
    expect(qa(host, '.oge-scheduler-timeline-dayhead')).toHaveLength(5);
    fireEvent.click(views[5]);
    expect(qa(host, '.oge-scheduler-timeline-dayhead')).toHaveLength(31);
    fireEvent.click(views[6]);
    expect(qa(host, '.oge-scheduler-timeline-dayhead')).toHaveLength(12);
  });
});

describe('<OgeScheduler> G3 — grouping', () => {
  it('nests two levels of column headers', () => {
    const { host } = renderScheduler({ groups: ['room', 'owner'] });
    expect(must(host.querySelector('.oge-scheduler-row')).children).toHaveLength(4);
    const groupRows = qa(host, '.oge-scheduler-resource-row');
    expect(groupRows).toHaveLength(2);
    expect(
      qa(groupRows[0], '.oge-scheduler-resource-head').map((el) =>
        el.textContent?.trim(),
      ),
    ).toEqual(['Atlas', 'Borealis']);
    expect(parseFloat(chip(host, 'Pairing').style.insetInlineStart)).toBeCloseTo(75, 1);
  });

  it('stacks row blocks under vertical orientation, with render props', () => {
    const { host } = renderScheduler({
      groups: ['room', 'owner'],
      groupOrientation: 'vertical',
      renderResourceHeader: ({ item, level }) => (
        <b className="custom-head">
          {level}:{item.text}
        </b>
      ),
    });
    expect(qa(host, '.oge-scheduler-group-label')).toHaveLength(4);
    expect(qa(host, '.oge-scheduler-rows .oge-scheduler-row')).toHaveLength(40);
    expect(parseFloat(chip(host, 'Pairing').style.top)).toBeCloseTo(
      ((3 + 0.5) / 4) * 100,
      1,
    );
    expect(qa(host, '.custom-head').map((el) => el.textContent)).toEqual([
      '1:Ada',
      '1:Grace',
      '1:Ada',
      '1:Grace',
    ]);
  });

  it('groups the timeline rows with group header rows', () => {
    const { host } = renderScheduler({
      groups: ['room', 'owner'],
      defaultCurrentView: 'timelineWorkWeek',
    });
    expect(qa(host, '.oge-scheduler-timeline-group-row')).toHaveLength(2);
    expect(qa(host, '.oge-scheduler-timeline-rowhead').map((el) => el.textContent?.trim())).toEqual([
      'Atlas',
      'Ada',
      'Grace',
      'Borealis',
      'Ada',
      'Grace',
    ]);
  });

  it('virtualizes many timeline rows', () => {
    const many: OgeSchedulerResource[] = [
      {
        fieldExpr: 'owner',
        items: Array.from({ length: 120 }, (_, index) => ({
          id: String(index),
          text: `Agent ${index}`,
        })),
      },
    ];
    const { host } = renderScheduler({
      resources: many,
      groups: ['owner'],
      dataSource: [],
      defaultCurrentView: 'timelineWorkWeek',
    });
    expect(qa(host, '.oge-scheduler-timeline-row')).toHaveLength(40);
    expect(
      parseFloat(must(host.querySelector<HTMLElement>('.oge-scheduler-timeline-spacer')).style.height),
    ).toBe(80 * 35);
  });
});

describe('<OgeScheduler> G3 — editing', () => {
  it('hatches blocked slots and refuses to create there', () => {
    const { host } = renderScheduler({
      disabledSlots: [
        { startDate: new Date(2026, 7, 6, 12), endDate: new Date(2026, 7, 6, 13) },
      ],
    });
    const lunch = cellAt(host, 12);
    expect(lunch.classList.contains('oge-scheduler-cell-disabled')).toBe(true);
    expect(lunch.getAttribute('aria-disabled')).toBe('true');
    fireEvent.doubleClick(lunch);
    expect(host.querySelector('.oge-scheduler-editor-form')).toBeNull();
    expect(host.querySelector('.oge-scheduler-notice')?.textContent).toContain(
      'unavailable',
    );
  });

  it('refuses an overlapping keyboard move with allowOverlap false', () => {
    const { host, ref } = renderScheduler({ allowOverlap: false });
    for (let step = 0; step < 3; step++) {
      fireEvent.keyDown(chip(host, 'Review'), { key: 'ArrowDown', ctrlKey: true });
    }
    const moved = must(ref.current)
      .getExportData()
      .appointments.find((entry) => entry.text === 'Review');
    expect(moved?.startDate).toEqual(new Date(2026, 7, 6, 12));
    expect(host.querySelector('.oge-scheduler-live')?.textContent).toContain('overlaps');
  });

  it('selects with Ctrl-click (controlled) and Ctrl+Space', () => {
    const changes: (readonly Appt[])[] = [];
    function Controlled(): ReactElement {
      const [selected, setSelected] = useState<readonly Appt[]>([]);
      return (
        <OgeScheduler<Appt>
          dataSource={rows}
          defaultCurrentDate={new Date(2026, 7, 6)}
          defaultCurrentView="day"
          dayStartHour={8}
          dayEndHour={18}
          showCurrentTimeIndicator={false}
          locale="en-US"
          selectedAppointments={selected}
          onSelectedAppointmentsChange={(next) => {
            changes.push(next);
            setSelected(next);
          }}
        />
      );
    }
    const rows = data();
    const { container: host } = render(<Controlled />);
    fireEvent.click(chip(host, 'Review'));
    fireEvent.click(chip(host, 'Pairing'), { ctrlKey: true });
    expect(changes.at(-1)?.map((item) => item.text)).toEqual(['Review', 'Pairing']);
    expect(chip(host, 'Pairing').classList.contains('oge-scheduler-chip-selected')).toBe(true);
    fireEvent.keyDown(chip(host, 'Pairing'), { key: ' ', ctrlKey: true });
    expect(changes.at(-1)?.map((item) => item.text)).toEqual(['Review']);
  });

  it('copies with Ctrl+C, pastes with Ctrl+V and undoes with Ctrl+Z', () => {
    const added: OgeSchedulerAppointmentAddedEvent<Appt>[] = [];
    const { host, ref } = renderScheduler({
      onAppointmentAdded: (event) => added.push(event),
    });
    fireEvent.keyDown(chip(host, 'Review'), { key: 'c', ctrlKey: true });
    fireEvent.keyDown(cellAt(host, 15), { key: 'v', ctrlKey: true });
    expect(added).toHaveLength(1);
    expect(added[0].appointmentData).toMatchObject({
      text: 'Review',
      startDate: new Date(2026, 7, 6, 15),
    });
    expect(qa(host, '.oge-scheduler-chip-box')).toHaveLength(3);
    fireEvent.keyDown(must(host.querySelector('.oge-scheduler')), {
      key: 'z',
      ctrlKey: true,
    });
    expect(qa(host, '.oge-scheduler-chip-box')).toHaveLength(2);
    act(() => {
      must(ref.current).redo();
    });
    expect(qa(host, '.oge-scheduler-chip-box')).toHaveLength(3);
  });

  it('the draggable hook’s keyboard twin drops onto the activated cell', () => {
    const dropped: OgeSchedulerAppointmentDroppedEvent<Appt>[] = [];
    function Palette(): ReactElement {
      const drag = useOgeSchedulerDraggable({
        data: { text: 'Walk-in', room: 'b' },
        duration: 45,
      });
      return <span {...drag}>Walk-in</span>;
    }
    const { container } = render(
      <>
        <Palette />
        <OgeScheduler<Appt>
          dataSource={data()}
          defaultCurrentDate={new Date(2026, 7, 6)}
          defaultCurrentView="day"
          dayStartHour={8}
          dayEndHour={18}
          cellDuration={60}
          showCurrentTimeIndicator={false}
          locale="en-US"
          onAppointmentDropped={(event) => dropped.push(event)}
        />
      </>,
    );
    const draggable = must(container.querySelector<HTMLElement>('.oge-scheduler-draggable'));
    fireEvent.keyDown(draggable, { key: 'Enter' });
    expect(draggable.getAttribute('aria-pressed')).toBe('true');
    fireEvent.keyDown(cellAt(container, 16), { key: 'Enter' });
    expect(dropped).toHaveLength(1);
    expect(dropped[0]).toMatchObject({
      added: true,
      startDate: new Date(2026, 7, 6, 16),
      endDate: new Date(2026, 7, 6, 16, 45),
    });
    expect(draggable.getAttribute('aria-pressed')).toBe('false');
  });
});

describe('<OgeScheduler> G3 — "+N more", recurrence editor, export', () => {
  it('"+N more" opens the day list; an entry opens the appointment popup', async () => {
    const { host } = renderScheduler({ defaultCurrentView: 'month' });
    const more = must(host.querySelector<HTMLButtonElement>('.oge-scheduler-month-more'));
    expect(more.tabIndex).toBe(0);
    expect(more.getAttribute('aria-label')).toBe(
      '1 more appointment on Thursday, August 6, 2026',
    );
    fireEvent.click(more);
    await flush();
    const popup = must(document.querySelector('.oge-scheduler-more-popup'));
    const items = qa(popup, '.oge-scheduler-more-item');
    expect(items).toHaveLength(2);
    expect(document.activeElement).toBe(items[0]);
    fireEvent.keyDown(items[0], { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[1]);
    fireEvent.click(items[1]);
    await flush();
    expect(document.querySelector('.oge-scheduler-more-popup')).toBeNull();
    expect(document.querySelector('.oge-scheduler-popup-title')?.textContent).toBe(
      'Pairing',
    );
  });

  it('moreMode drill keeps the old drill-into-day behaviour', () => {
    const onCurrentViewChange = vi.fn();
    const { host } = renderScheduler({
      defaultCurrentView: 'month',
      moreMode: 'drill',
      onCurrentViewChange,
    });
    fireEvent.click(must(host.querySelector('.oge-scheduler-month-more')));
    expect(onCurrentViewChange).toHaveBeenCalledWith('day');
  });

  it('shows a live recurrence summary in the editor', async () => {
    const { host } = renderScheduler({
      defaultCurrentView: 'month',
      dataSource: [
        {
          id: 7,
          text: 'Board',
          startDate: new Date(2026, 7, 11, 9),
          endDate: new Date(2026, 7, 11, 10),
          recurrenceRule: 'FREQ=MONTHLY;BYDAY=2TU;COUNT=6',
        },
      ],
    });
    fireEvent.doubleClick(must(host.querySelector('.oge-scheduler-month-bar')));
    await flush();
    expect(
      document.querySelector('.oge-scheduler-recurrence-summary')?.textContent?.trim(),
    ).toBe('Every month on the second Tuesday, 6 times');
  });

  it('exports and imports iCalendar through the entry functions', () => {
    const added: OgeSchedulerAppointmentAddedEvent<Appt>[] = [];
    const { ref } = renderScheduler({
      onAppointmentAdded: (event) => added.push(event),
    });
    const handle = must(ref.current);
    const text = exportToICalendar(handle, { download: false });
    expect(text).toContain('SUMMARY:Review');
    act(() => {
      importICalendar(handle, text);
    });
    expect(added).toHaveLength(2);
  });
});
