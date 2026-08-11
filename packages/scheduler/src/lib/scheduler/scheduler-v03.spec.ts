import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeScheduler } from './scheduler';
import type {
  OgeSchedulerAppointmentUpdatedEvent,
  OgeSchedulerResource,
  OgeSchedulerView,
} from '../scheduler-types';

interface Appt {
  id: number;
  text: string;
  startDate: Date;
  endDate: Date;
  ownerId?: string;
}

const RESOURCES: OgeSchedulerResource[] = [
  {
    fieldExpr: 'ownerId',
    label: 'Owner',
    useColorAsDefault: true,
    items: [
      { id: 'ada', text: 'Ada', color: '#7c3aed' },
      { id: 'grace', text: 'Grace', color: '#0891b2' },
    ],
  },
];

@Component({
  imports: [OgeScheduler],
  template: `
    <oge-scheduler
      [dataSource]="data()"
      [currentDate]="date"
      [(currentView)]="view"
      [views]="['day', 'week', 'timelineDay', 'year']"
      [resources]="resources"
      [groups]="groups()"
      [firstDayOfWeek]="1"
      [dayStartHour]="8"
      [dayEndHour]="18"
      [showCurrentTimeIndicator]="false"
      locale="en-US"
      (appointmentUpdated)="updated.push($event)"
    />
  `,
})
class Host {
  readonly data = signal<Appt[]>([
    {
      id: 1,
      text: 'Kickoff',
      startDate: new Date(2026, 7, 6, 9),
      endDate: new Date(2026, 7, 6, 10),
      ownerId: 'ada',
    },
    {
      id: 2,
      text: 'Christmas prep',
      startDate: new Date(2026, 11, 20, 9),
      endDate: new Date(2026, 11, 20, 10),
      ownerId: 'grace',
    },
  ]);
  readonly date = new Date(2026, 7, 6);
  readonly view = signal<OgeSchedulerView>('week');
  readonly groups = signal<readonly string[]>(['ownerId']);
  readonly resources = RESOURCES;
  readonly updated: OgeSchedulerAppointmentUpdatedEvent<Appt>[] = [];
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

describe('<oge-scheduler> v0.3 — grouping, timeline drag, year', () => {
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

  it('grouped week renders day × resource columns with a sub-header', () => {
    const firstRow = host.querySelector('.oge-scheduler-row');
    expect(firstRow?.children.length).toBe(14); // 7 days × 2 resources
    const heads = host.querySelectorAll('.oge-scheduler-resource-head');
    expect(heads.length).toBe(14);
    expect(heads[0].textContent?.trim()).toBe('Ada');
    expect(heads[1].textContent?.trim()).toBe('Grace');
    // chip sits in Ada's Thursday subcolumn (col 6 of 14)
    const chip = host.querySelector<HTMLElement>('.oge-scheduler-chip-box');
    expect(parseFloat(chip?.style.left ?? '0')).toBeCloseTo((6 / 14) * 100, 1);
    expect(parseFloat(chip?.style.width ?? '0')).toBeCloseTo(100 / 14, 1);
  });

  it('grouped cell aria labels carry the resource name', () => {
    const cell = host.querySelector('.oge-scheduler-rows .oge-scheduler-cell');
    expect(cell?.getAttribute('aria-label')).toContain('Ada');
  });

  it('ungrouped week keeps 7 plain columns', async () => {
    fixture.componentInstance.groups.set([]);
    await settle(fixture);
    expect(host.querySelector('.oge-scheduler-resource-row')).toBeNull();
    expect(host.querySelector('.oge-scheduler-row')?.children.length).toBe(7);
  });

  it('grouped drag across a subcolumn reassigns the resource', async () => {
    const rows = host.querySelector<HTMLElement>('.oge-scheduler-rows');
    rows!.getBoundingClientRect = () =>
      ({
        top: 0,
        left: 0,
        width: 1400, // 14 columns × 100px
        height: 600,
        right: 1400,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
    const chip = host.querySelector<HTMLElement>('.oge-scheduler-chip-box');
    chip?.dispatchEvent(
      pointer('pointerdown', { clientX: 650, clientY: 90, button: 0 }),
    );
    // one subcolumn right: Ada → Grace, same day, same time
    document.dispatchEvent(
      pointer('pointermove', { clientX: 752, clientY: 90 }),
    );
    document.dispatchEvent(pointer('pointerup', {}));
    await settle(fixture);
    const updated = fixture.componentInstance.updated.at(-1)?.appointmentData;
    expect(updated?.ownerId).toBe('grace');
    expect(updated?.startDate).toEqual(new Date(2026, 7, 6, 9)); // time kept
  });

  it('timelineDay bar drag shifts the time (Escape still cancels)', async () => {
    fixture.componentInstance.view.set('timelineDay');
    await settle(fixture);
    const track = host.querySelector<HTMLElement>(
      '.oge-scheduler-timeline-track',
    );
    track!.getBoundingClientRect = () =>
      ({
        top: 0,
        left: 0,
        width: 600, // 600min window → 1px per minute
        height: 60,
        right: 600,
        bottom: 60,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
    const bar = host.querySelector<HTMLElement>('.oge-scheduler-timeline-bar');
    bar?.dispatchEvent(
      pointer('pointerdown', { clientX: 100, clientY: 30, button: 0 }),
    );
    document.dispatchEvent(
      pointer('pointermove', { clientX: 162, clientY: 30 }),
    );
    await settle(fixture);
    expect(host.querySelector('.oge-scheduler-timeline-preview')).toBeTruthy();
    document.dispatchEvent(pointer('pointerup', {}));
    await settle(fixture);
    const updated = fixture.componentInstance.updated.at(-1)?.appointmentData;
    expect(updated?.startDate).toEqual(new Date(2026, 7, 6, 10)); // +60min
  });

  it('timeline Ctrl+ArrowDown moves the bar to the next resource row', async () => {
    fixture.componentInstance.view.set('timelineDay');
    await settle(fixture);
    const bar = host.querySelector<HTMLElement>('.oge-scheduler-timeline-bar');
    bar?.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        ctrlKey: true,
        bubbles: true,
      }),
    );
    await settle(fixture);
    expect(
      fixture.componentInstance.updated.at(-1)?.appointmentData.ownerId,
    ).toBe('grace');
  });

  it('year view renders 12 mini months with busy dots; clicking drills in', async () => {
    fixture.componentInstance.view.set('year');
    await settle(fixture);
    expect(host.querySelectorAll('.oge-scheduler-year-month').length).toBe(12);
    expect(host.querySelectorAll('.oge-scheduler-year-dot').length).toBe(2); // Aug 6 + Dec 20
    expect(host.querySelector('.oge-scheduler-title')?.textContent).toContain(
      '2026',
    );
    const busy = host.querySelector<HTMLElement>('.oge-scheduler-year-busy');
    busy?.click();
    await settle(fixture);
    const scheduler = fixture.debugElement.children[0]
      .componentInstance as OgeScheduler<Appt>;
    expect(scheduler.currentView()).toBe('day');
    expect(scheduler.currentDate().getMonth()).toBe(7);
  });
});
