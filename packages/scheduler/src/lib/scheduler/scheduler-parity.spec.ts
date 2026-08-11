import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeScheduler } from './scheduler';
import type {
  OgeSchedulerRangeSelectedEvent,
  OgeSchedulerView,
  OgeSchedulerWorkHours,
} from '../scheduler-types';

interface Appt {
  id: number;
  text: string;
  startDate: Date;
  endDate: Date;
}

@Component({
  imports: [OgeScheduler],
  template: `
    <oge-scheduler
      [dataSource]="data"
      [currentDate]="date"
      [(currentView)]="view"
      [views]="['day', 'week', 'workWeek', 'month']"
      [firstDayOfWeek]="1"
      [dayStartHour]="8"
      [dayEndHour]="18"
      [showCurrentTimeIndicator]="false"
      [min]="min()"
      [max]="max()"
      [readOnly]="readOnly()"
      [workHours]="workHours()"
      locale="en-US"
      (rangeSelected)="ranges.push($event)"
    />
  `,
})
class Host {
  readonly data: Appt[] = [
    {
      id: 1,
      text: 'Standup',
      startDate: new Date(2026, 7, 6, 9),
      endDate: new Date(2026, 7, 6, 10),
    },
  ];
  readonly date = new Date(2026, 7, 6);
  readonly view = signal<OgeSchedulerView>('week');
  readonly min = signal<Date | undefined>(undefined);
  readonly max = signal<Date | undefined>(undefined);
  readonly readOnly = signal(false);
  readonly workHours = signal<OgeSchedulerWorkHours | null>(null);
  readonly ranges: OgeSchedulerRangeSelectedEvent[] = [];
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

function pointer(type: string, init: MouseEventInit): PointerEvent {
  return new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    ...init,
  }) as unknown as PointerEvent;
}

describe('<oge-scheduler> reference parity (close-now batch)', () => {
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

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('workWeek view renders five weekday columns', async () => {
    fixture.componentInstance.view.set('workWeek');
    await settle(fixture);
    const firstRow = host.querySelector('.oge-scheduler-row');
    expect(firstRow?.children.length).toBe(5);
    // the switcher shows all four views
    expect(host.querySelectorAll('.oge-scheduler-view-btn').length).toBe(4);
  });

  it('min/max disable navigation beyond the bounds', async () => {
    fixture.componentInstance.min.set(new Date(2026, 7, 3));
    fixture.componentInstance.max.set(new Date(2026, 7, 9));
    await settle(fixture);
    const [prev, next] = Array.from(
      host.querySelectorAll<HTMLButtonElement>('.oge-scheduler-btn-icon'),
    );
    expect(prev.disabled).toBe(true);
    expect(next.disabled).toBe(true);
  });

  it('the Today button disables while today is visible', async () => {
    const scheduler = fixture.debugElement.children[0]
      .componentInstance as OgeScheduler<Appt>;
    scheduler.currentDate.set(new Date());
    await settle(fixture);
    const today = host.querySelector<HTMLButtonElement>('.oge-scheduler-btn');
    expect(today?.disabled).toBe(true);
  });

  it('readOnly suppresses editing affordances end to end', async () => {
    fixture.componentInstance.readOnly.set(true);
    await settle(fixture);
    // no resize handles
    expect(host.querySelector('.oge-scheduler-resize-handle')).toBeNull();
    // dblclick on a cell must not open the editor
    host
      .querySelector<HTMLElement>('.oge-scheduler-rows .oge-scheduler-cell')
      ?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await settle(fixture);
    expect(host.querySelector('.oge-scheduler-editor-form')).toBeNull();
  });

  it('workHours shades off-hours cells', async () => {
    fixture.componentInstance.workHours.set({ start: 9, end: 17 });
    await settle(fixture);
    const offHours = host.querySelectorAll('.oge-scheduler-cell-off-hours');
    expect(offHours.length).toBeGreaterThan(0);
    // 08:00 row is off-hours, 09:00 row is not
    const firstRowCell = host.querySelector(
      '.oge-scheduler-row .oge-scheduler-cell',
    );
    expect(
      firstRowCell?.classList.contains('oge-scheduler-cell-off-hours'),
    ).toBe(true);
  });

  it('weekend columns carry the weekend shading class', () => {
    const weekend = host.querySelectorAll(
      '.oge-scheduler-rows .oge-scheduler-cell-weekend',
    );
    // Monday-first week → 2 weekend columns × 20 rows
    expect(weekend.length).toBe(40);
  });

  it('drag-to-create selects a range and opens the prefilled editor', async () => {
    const rows = host.querySelector<HTMLElement>('.oge-scheduler-rows');
    rows!.getBoundingClientRect = () =>
      ({
        top: 0,
        left: 0,
        width: 700,
        height: 600,
        right: 700,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
    const cells = host.querySelectorAll<HTMLElement>(
      '.oge-scheduler-rows .oge-scheduler-cell',
    );
    // first row = 08:00; drag down 120px = +2h
    cells[0].dispatchEvent(
      pointer('pointerdown', { clientX: 50, clientY: 5, button: 0 }),
    );
    document.dispatchEvent(
      pointer('pointermove', { clientX: 50, clientY: 125 }),
    );
    await settle(fixture);
    expect(host.querySelector('.oge-scheduler-selection')).toBeTruthy();
    document.dispatchEvent(pointer('pointerup', {}));
    await settle(fixture);
    expect(fixture.componentInstance.ranges).toHaveLength(1);
    expect(fixture.componentInstance.ranges[0].startDate).toEqual(
      new Date(2026, 7, 3, 8, 0),
    );
    expect(fixture.componentInstance.ranges[0].endDate).toEqual(
      new Date(2026, 7, 3, 10, 0),
    );
    expect(host.querySelector('.oge-scheduler-editor-form')).toBeTruthy();
  });

  it('the toolbar title opens the date-navigator calendar', async () => {
    host.querySelector<HTMLElement>('.oge-scheduler-title')?.click();
    await settle(fixture);
    expect(
      host.querySelector('.oge-scheduler-navigator oge-calendar'),
    ).toBeTruthy();
  });

  it('the toolbar add button opens the create editor (no double-click needed)', async () => {
    const add = Array.from(
      host.querySelectorAll<HTMLButtonElement>('.oge-scheduler-btn-add'),
    )[0];
    expect(add?.textContent).toContain('New');
    add.click();
    await settle(fixture);
    expect(host.querySelector('.oge-scheduler-editor-form')).toBeTruthy();
    // readOnly hides the affordance entirely
    fixture.componentInstance.readOnly.set(true);
    await settle(fixture);
    expect(host.querySelector('.oge-scheduler-btn-add')).toBeNull();
  });

  it('location flows from the item to the chip and the popup', async () => {
    const scheduler = fixture.debugElement.children[0]
      .componentInstance as OgeScheduler<
      Appt & { location?: string; description?: string }
    >;
    scheduler.addAppointment({
      id: 3,
      text: 'Onsite',
      location: 'Room 4B',
      startDate: new Date(2026, 7, 5, 13),
      endDate: new Date(2026, 7, 5, 14),
    });
    await settle(fixture);
    expect(
      host.querySelector('.oge-scheduler-chip-location')?.textContent,
    ).toBe('Room 4B');
    host
      .querySelectorAll<HTMLElement>('.oge-scheduler-chip-box')
      .forEach((chip) => {
        if (chip.textContent?.includes('Onsite')) {
          chip.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }
      });
    await settle(fixture);
    expect(
      host.querySelector('.oge-scheduler-popup-location')?.textContent?.trim(),
    ).toBe('Room 4B');
  });

  it('programmatic CRUD methods run the guarded pipelines', async () => {
    const scheduler = fixture.debugElement.children[0]
      .componentInstance as OgeScheduler<Appt>;
    scheduler.addAppointment({
      id: 9,
      text: 'Injected',
      startDate: new Date(2026, 7, 5, 11),
      endDate: new Date(2026, 7, 5, 12),
    });
    await settle(fixture);
    expect(host.textContent).toContain('Injected');
    expect(scheduler.getStartViewDate()).toEqual(new Date(2026, 7, 3));
    expect(scheduler.getEndViewDate()).toEqual(new Date(2026, 7, 10));
  });
});
