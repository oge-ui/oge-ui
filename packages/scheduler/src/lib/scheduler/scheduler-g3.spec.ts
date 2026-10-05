import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeScheduler } from './scheduler';
import { OgeSchedulerDraggable } from './scheduler-draggable';
import { OgeResourceHeaderTemplate } from './scheduler-templates';
import { exportToICalendar, importICalendar } from '../../../export-ical/src/index';
import type {
  OgeSchedulerAppointmentAddedEvent,
  OgeSchedulerAppointmentDroppedEvent,
  OgeSchedulerDisabledSlots,
  OgeSchedulerGroupOrientation,
  OgeSchedulerMoreMode,
  OgeSchedulerResource,
  OgeSchedulerView,
  OgeSchedulerViewOptions,
} from '../scheduler-types';

interface Appt {
  id?: number;
  text: string;
  startDate: Date;
  endDate: Date;
  allDay?: boolean;
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

@Component({
  imports: [OgeScheduler, OgeSchedulerDraggable, OgeResourceHeaderTemplate],
  template: `
    <div class="palette">
      <span
        [ogeSchedulerDraggable]="draggable"
        [ogeSchedulerDraggableDuration]="45"
        >Walk-in</span
      >
    </div>
    <oge-scheduler
      [dataSource]="data()"
      [currentDate]="date()"
      [(currentView)]="view"
      [views]="views()"
      [resources]="resources"
      [groups]="groups()"
      [groupOrientation]="orientation()"
      [groupByDate]="groupByDate()"
      [firstDayOfWeek]="1"
      [dayStartHour]="8"
      [dayEndHour]="18"
      [cellDuration]="60"
      [showCurrentTimeIndicator]="false"
      [showWeekNumbers]="weekNumbers()"
      [disabledSlots]="disabled()"
      [allowOverlap]="allowOverlap()"
      [moreMode]="moreMode()"
      [maxAppointmentsPerCell]="1"
      [(selectedAppointments)]="selection"
      recurrenceEditMode="series"
      locale="en-US"
      (appointmentAdded)="added.push($event)"
      (appointmentDropped)="dropped.push($event)"
    >
      @if (headerTemplate()) {
        <ng-template ogeResourceHeaderTemplate let-item let-level="level">
          <b class="custom-head">{{ level }}:{{ item.text }}</b>
        </ng-template>
      }
    </oge-scheduler>
  `,
})
class Host {
  readonly data = signal<Appt[]>([
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
  ]);
  readonly date = signal(new Date(2026, 7, 6));
  readonly view = signal<OgeSchedulerView>('day');
  readonly views = signal<readonly (OgeSchedulerView | OgeSchedulerViewOptions)[]>([
    'day',
    { type: 'day', intervalCount: 3, name: '3 days' },
    'week',
    'month',
    'timelineWorkWeek',
    'timelineMonth',
    'timelineYear',
  ]);
  readonly resources = RESOURCES;
  readonly groups = signal<readonly string[]>([]);
  readonly orientation = signal<OgeSchedulerGroupOrientation | undefined>(undefined);
  readonly groupByDate = signal(true);
  readonly weekNumbers = signal(false);
  readonly disabled = signal<OgeSchedulerDisabledSlots | null>(null);
  readonly allowOverlap = signal(true);
  readonly moreMode = signal<OgeSchedulerMoreMode>('popup');
  readonly headerTemplate = signal(false);
  selection: readonly Appt[] = [];
  readonly draggable = { text: 'Walk-in', room: 'b' };
  readonly added: OgeSchedulerAppointmentAddedEvent<Appt>[] = [];
  readonly dropped: OgeSchedulerAppointmentDroppedEvent<Appt>[] = [];
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

function schedulerOf(fixture: ComponentFixture<Host>): OgeScheduler<Appt> {
  return fixture.debugElement.query(
    (el) => el.componentInstance instanceof OgeScheduler,
  ).componentInstance as OgeScheduler<Appt>;
}

const key = (target: Element, init: KeyboardEventInit) =>
  target.dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }),
  );

describe('<oge-scheduler> G3 — views', () => {
  let fixture: ComponentFixture<Host>;
  let host: HTMLElement;

  beforeEach(async () => {
    vi.stubGlobal(
      'requestAnimationFrame',
      (cb: FrameRequestCallback) =>
        setTimeout(() => cb(performance.now()), 0) as unknown as number,
    );
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
    fixture = TestBed.createComponent(Host);
    await settle(fixture);
    host = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => vi.unstubAllGlobals());

  it('tells same-type switcher entries apart and renders a 3-day view', async () => {
    const buttons = Array.from(
      host.querySelectorAll<HTMLButtonElement>('.oge-scheduler-view-btn'),
    );
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
    buttons[1].click();
    await settle(fixture);
    expect(buttons[0].getAttribute('aria-pressed')).toBe('false');
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('.oge-scheduler-row')?.children.length).toBe(3);
    expect(host.querySelector('.oge-scheduler-title')?.textContent).toMatch(
      /Aug 6\s*–\s*8, 2026/,
    );
  });

  it('shows week numbers in the header corner and the month rows', async () => {
    fixture.componentInstance.weekNumbers.set(true);
    fixture.componentInstance.view.set('week');
    await settle(fixture);
    expect(host.querySelector('.oge-scheduler-week-number')?.textContent).toBe(
      'W32',
    );
    expect(host.querySelector('.oge-scheduler-grid')?.getAttribute('aria-label')).toContain(
      'Week 32',
    );
    fixture.componentInstance.view.set('month');
    await settle(fixture);
    expect(host.querySelectorAll('.oge-scheduler-month-cell .oge-scheduler-week-number')).toHaveLength(6);
  });

  it('renders the work-week, month and year timelines', async () => {
    fixture.componentInstance.view.set('timelineWorkWeek');
    await settle(fixture);
    expect(host.querySelectorAll('.oge-scheduler-timeline-dayhead')).toHaveLength(5);
    fixture.componentInstance.view.set('timelineMonth');
    await settle(fixture);
    expect(host.querySelectorAll('.oge-scheduler-timeline-dayhead')).toHaveLength(31);
    expect(host.querySelector('.oge-scheduler-timeline-day-scale')).toBeTruthy();
    const bar = host.querySelector<HTMLElement>('.oge-scheduler-timeline-bar');
    expect(parseFloat(bar?.style.width ?? '0')).toBeCloseTo(100 / 31, 3);
    fixture.componentInstance.view.set('timelineYear');
    await settle(fixture);
    expect(host.querySelectorAll('.oge-scheduler-timeline-dayhead')).toHaveLength(12);
  });
});

describe('<oge-scheduler> G3 — grouping', () => {
  let fixture: ComponentFixture<Host>;
  let host: HTMLElement;

  beforeEach(async () => {
    vi.stubGlobal(
      'requestAnimationFrame',
      (cb: FrameRequestCallback) =>
        setTimeout(() => cb(performance.now()), 0) as unknown as number,
    );
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
    fixture = TestBed.createComponent(Host);
    fixture.componentInstance.groups.set(['room', 'owner']);
    await settle(fixture);
    host = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => vi.unstubAllGlobals());

  it('nests two levels of column headers', () => {
    expect(host.querySelector('.oge-scheduler-row')?.children.length).toBe(4);
    const groupRows = host.querySelectorAll('.oge-scheduler-resource-row');
    expect(groupRows).toHaveLength(2);
    expect(
      Array.from(groupRows[0].querySelectorAll('.oge-scheduler-resource-head')).map(
        (el) => el.textContent?.trim(),
      ),
    ).toEqual(['Atlas', 'Borealis']);
    expect(groupRows[1].querySelectorAll('.oge-scheduler-resource-head')).toHaveLength(4);
    // Pairing is Borealis · Grace → the last column
    const chips = host.querySelectorAll<HTMLElement>('.oge-scheduler-chip-box');
    const pairing = Array.from(chips).find((chip) =>
      chip.textContent?.includes('Pairing'),
    );
    expect(parseFloat(pairing?.style.insetInlineStart ?? '0')).toBeCloseTo(75, 1);
  });

  it('stacks the leaves as row blocks under vertical orientation', async () => {
    fixture.componentInstance.orientation.set('vertical');
    await settle(fixture);
    expect(host.querySelector('.oge-scheduler-day-week-vertical')).toBeTruthy();
    expect(host.querySelectorAll('.oge-scheduler-group-label')).toHaveLength(4);
    expect(host.querySelectorAll('.oge-scheduler-rows .oge-scheduler-row')).toHaveLength(40);
    const pairing = Array.from(
      host.querySelectorAll<HTMLElement>('.oge-scheduler-chip-box'),
    ).find((chip) => chip.textContent?.includes('Pairing'));
    // block 3 of 4, 13:00 is 50% into the 8–18 window
    expect(parseFloat(pairing?.style.top ?? '0')).toBeCloseTo(((3 + 0.5) / 4) * 100, 1);
    const cell = host.querySelectorAll('.oge-scheduler-rows .oge-scheduler-cell')[35];
    expect(cell.getAttribute('aria-label')).toContain('Borealis, Grace');
  });

  it('groups the timeline rows with group header rows and a header template', async () => {
    fixture.componentInstance.headerTemplate.set(true);
    fixture.componentInstance.view.set('timelineWorkWeek');
    await settle(fixture);
    expect(host.querySelectorAll('.oge-scheduler-timeline-group-row')).toHaveLength(2);
    const heads = Array.from(host.querySelectorAll('.custom-head')).map(
      (el) => el.textContent,
    );
    expect(heads).toEqual(['0:Atlas', '1:Ada', '1:Grace', '0:Borealis', '1:Ada', '1:Grace']);
  });

  it('per-resource working hours shade the leaf columns', () => {
    // Atlas works 9–12; 08:00 of an Atlas column is off-hours, Borealis is not
    const firstRow = host.querySelector('.oge-scheduler-rows .oge-scheduler-row');
    const cells = firstRow?.querySelectorAll('.oge-scheduler-cell') ?? [];
    expect(cells[0].classList.contains('oge-scheduler-cell-off-hours')).toBe(true);
    expect(cells[2].classList.contains('oge-scheduler-cell-off-hours')).toBe(false);
  });
});

describe('<oge-scheduler> G3 — editing', () => {
  let fixture: ComponentFixture<Host>;
  let host: HTMLElement;

  beforeEach(async () => {
    vi.stubGlobal(
      'requestAnimationFrame',
      (cb: FrameRequestCallback) =>
        setTimeout(() => cb(performance.now()), 0) as unknown as number,
    );
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
    fixture = TestBed.createComponent(Host);
    await settle(fixture);
    host = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => vi.unstubAllGlobals());

  const chip = (text: string) =>
    Array.from(host.querySelectorAll<HTMLElement>('.oge-scheduler-chip-box')).find(
      (el) => el.textContent?.includes(text),
    ) as HTMLElement;
  const cellAt = (hour: number) =>
    host.querySelectorAll<HTMLElement>('.oge-scheduler-rows .oge-scheduler-row')[
      hour - 8
    ].querySelector<HTMLElement>('.oge-scheduler-cell') as HTMLElement;

  it('hatches blocked slots and refuses to create there', async () => {
    fixture.componentInstance.disabled.set([
      {
        startDate: new Date(2026, 7, 6, 12),
        endDate: new Date(2026, 7, 6, 13),
        text: 'Lunch',
      },
    ]);
    await settle(fixture);
    const lunch = cellAt(12);
    expect(lunch.classList.contains('oge-scheduler-cell-disabled')).toBe(true);
    expect(lunch.getAttribute('aria-disabled')).toBe('true');
    expect(lunch.getAttribute('aria-label')).toContain('unavailable');
    lunch.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await settle(fixture);
    expect(host.querySelector('.oge-scheduler-editor-form')).toBeNull();
    expect(host.querySelector('.oge-scheduler-notice')?.textContent).toContain(
      'unavailable',
    );
  });

  it('refuses an overlapping keyboard move with allowOverlap false', async () => {
    fixture.componentInstance.allowOverlap.set(false);
    await settle(fixture);
    const review = chip('Review');
    // three hours down lands on Pairing (13:00)
    key(review, { key: 'ArrowDown', ctrlKey: true });
    await settle(fixture);
    key(chip('Review'), { key: 'ArrowDown', ctrlKey: true });
    await settle(fixture);
    key(chip('Review'), { key: 'ArrowDown', ctrlKey: true });
    await settle(fixture);
    const data = schedulerOf(fixture).getExportData().appointments;
    const moved = data.find((entry) => entry.text === 'Review');
    expect(moved?.startDate).toEqual(new Date(2026, 7, 6, 12));
    expect(host.querySelector('.oge-scheduler-live')?.textContent).toContain(
      'overlaps',
    );
  });

  it('selects with Ctrl-click (two-way model) and Ctrl+Space', async () => {
    chip('Review').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle(fixture);
    chip('Pairing').dispatchEvent(
      new MouseEvent('click', { bubbles: true, ctrlKey: true }),
    );
    await settle(fixture);
    expect(fixture.componentInstance.selection.map((item) => item.text)).toEqual([
      'Review',
      'Pairing',
    ]);
    expect(chip('Pairing').classList.contains('oge-scheduler-chip-selected')).toBe(true);
    expect(chip('Pairing').getAttribute('aria-label')).toContain('selected');
    key(chip('Pairing'), { key: ' ', ctrlKey: true });
    await settle(fixture);
    expect(fixture.componentInstance.selection.map((item) => item.text)).toEqual([
      'Review',
    ]);
  });

  it('copies with Ctrl+C, pastes with Ctrl+V and undoes with Ctrl+Z', async () => {
    key(chip('Review'), { key: 'c', ctrlKey: true });
    await settle(fixture);
    key(cellAt(15), { key: 'v', ctrlKey: true });
    await settle(fixture);
    expect(fixture.componentInstance.added).toHaveLength(1);
    expect(fixture.componentInstance.added[0].appointmentData).toMatchObject({
      text: 'Review',
      startDate: new Date(2026, 7, 6, 15),
    });
    expect(host.querySelectorAll('.oge-scheduler-chip-box')).toHaveLength(3);
    const scheduler = schedulerOf(fixture);
    expect(scheduler.canUndo()).toBe(true);
    key(host.querySelector('.oge-scheduler') as Element, { key: 'z', ctrlKey: true });
    await settle(fixture);
    expect(host.querySelectorAll('.oge-scheduler-chip-box')).toHaveLength(2);
    expect(scheduler.redo()).toBe(true);
    await settle(fixture);
    expect(host.querySelectorAll('.oge-scheduler-chip-box')).toHaveLength(3);
  });

  it('the draggable’s keyboard twin drops onto the activated cell', async () => {
    const draggable = host.querySelector<HTMLElement>('.oge-scheduler-draggable');
    expect(draggable?.getAttribute('role')).toBe('button');
    key(draggable as HTMLElement, { key: 'Enter' });
    await settle(fixture);
    expect(draggable?.getAttribute('aria-pressed')).toBe('true');
    key(cellAt(16), { key: 'Enter' });
    await settle(fixture);
    expect(fixture.componentInstance.dropped).toHaveLength(1);
    expect(fixture.componentInstance.dropped[0]).toMatchObject({
      added: true,
      startDate: new Date(2026, 7, 6, 16),
      endDate: new Date(2026, 7, 6, 16, 45),
    });
    expect(fixture.componentInstance.dropped[0].appointmentData).toMatchObject({
      text: 'Walk-in',
      room: 'b',
    });
    expect(draggable?.getAttribute('aria-pressed')).toBe('false');
  });
});

@Component({
  imports: [OgeScheduler],
  template: `
    <oge-scheduler
      [dataSource]="data"
      [currentDate]="date"
      currentView="timelineDay"
      [views]="['timelineDay']"
      [resources]="resources"
      [groups]="['owner']"
      [virtualScrolling]="virtual()"
      [showCurrentTimeIndicator]="false"
      locale="en-US"
    />
  `,
})
class ManyResourcesHost {
  readonly resources: OgeSchedulerResource[] = [
    {
      fieldExpr: 'owner',
      items: Array.from({ length: 120 }, (_, index) => ({
        id: String(index),
        text: `Agent ${index}`,
      })),
    },
  ];
  readonly data: Appt[] = [
    {
      id: 1,
      text: 'Call',
      startDate: new Date(2026, 7, 6, 9),
      endDate: new Date(2026, 7, 6, 10),
      owner: '3',
    },
  ];
  readonly date = new Date(2026, 7, 6);
  readonly virtual = signal<boolean | 'auto'>('auto');
}

describe('<oge-scheduler> G3 — timeline virtualization', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('renders a window of the rows plus spacers; false renders them all', async () => {
    vi.stubGlobal(
      'requestAnimationFrame',
      (cb: FrameRequestCallback) =>
        setTimeout(() => cb(performance.now()), 0) as unknown as number,
    );
    const fixture = TestBed.createComponent(ManyResourcesHost);
    await settle(fixture);
    const host = fixture.nativeElement as HTMLElement;
    // jsdom has no layout: the unmeasured window renders the first 40 rows
    expect(host.querySelectorAll('.oge-scheduler-timeline-row')).toHaveLength(40);
    const spacer = host.querySelector<HTMLElement>('.oge-scheduler-timeline-spacer');
    expect(parseFloat(spacer?.style.height ?? '0')).toBe(80 * 35);
    fixture.componentInstance.virtual.set(false);
    await settle(fixture);
    expect(host.querySelectorAll('.oge-scheduler-timeline-row')).toHaveLength(120);
  });
});

describe('<oge-scheduler> G3 — "+N more", recurrence editor, export', () => {
  let fixture: ComponentFixture<Host>;
  let host: HTMLElement;

  beforeEach(async () => {
    vi.stubGlobal(
      'requestAnimationFrame',
      (cb: FrameRequestCallback) =>
        setTimeout(() => cb(performance.now()), 0) as unknown as number,
    );
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
    fixture = TestBed.createComponent(Host);
    fixture.componentInstance.view.set('month');
    await settle(fixture);
    host = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => vi.unstubAllGlobals());

  it('"+N more" opens the day list; an entry opens the appointment popup', async () => {
    const more = host.querySelector<HTMLButtonElement>('.oge-scheduler-month-more');
    expect(more?.tabIndex).toBe(0);
    expect(more?.getAttribute('aria-label')).toBe(
      '1 more appointment on Thursday, August 6, 2026',
    );
    more?.click();
    await settle(fixture);
    const popup = host.querySelector('.oge-scheduler-more-popup');
    expect(popup?.getAttribute('aria-label')).toBe(
      'Appointments on Thursday, August 6, 2026',
    );
    const items = popup?.querySelectorAll<HTMLButtonElement>('.oge-scheduler-more-item');
    expect(items).toHaveLength(2);
    expect(document.activeElement).toBe(items?.[0]);
    key(items?.[0] as HTMLElement, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items?.[1]);
    items?.[1].click();
    await settle(fixture);
    expect(host.querySelector('.oge-scheduler-more-popup')).toBeNull();
    expect(host.querySelector('.oge-scheduler-popup-title')?.textContent).toBe('Pairing');
  });

  it('moreMode drill keeps the old drill-into-day behaviour', async () => {
    fixture.componentInstance.moreMode.set('drill');
    await settle(fixture);
    host.querySelector<HTMLButtonElement>('.oge-scheduler-month-more')?.click();
    await settle(fixture);
    expect(fixture.componentInstance.view()).toBe('day');
  });

  it('shows a live recurrence summary in the editor', async () => {
    fixture.componentInstance.data.set([
      {
        id: 7,
        text: 'Board',
        startDate: new Date(2026, 7, 11, 9),
        endDate: new Date(2026, 7, 11, 10),
        recurrenceRule: 'FREQ=MONTHLY;BYDAY=2TU;COUNT=6',
      },
    ]);
    await settle(fixture);
    const bar = host.querySelector<HTMLElement>('.oge-scheduler-month-bar');
    bar?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await settle(fixture);
    expect(host.querySelector('.oge-scheduler-recurrence-summary')?.textContent?.trim()).toBe(
      'Every month on the second Tuesday, 6 times',
    );
  });

  it('exports and imports iCalendar through the entry functions', async () => {
    const scheduler = schedulerOf(fixture);
    const text = exportToICalendar(scheduler, { download: false });
    expect(text).toContain('BEGIN:VEVENT');
    expect(text).toContain('SUMMARY:Review');
    const items = importICalendar(scheduler, text);
    await settle(fixture);
    expect(items).toHaveLength(2);
    expect(fixture.componentInstance.added).toHaveLength(2);
  });

  it('prints through a hidden frame', async () => {
    const scheduler = schedulerOf(fixture);
    const done = scheduler.print();
    expect(document.querySelector('iframe[aria-hidden="true"]')).toBeTruthy();
    await done;
  });
});
