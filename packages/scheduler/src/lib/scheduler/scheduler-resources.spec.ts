import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeScheduler } from './scheduler';
import type {
  OgeSchedulerReminderEvent,
  OgeSchedulerResource,
  OgeSchedulerView,
} from '../scheduler-types';

interface Appt {
  id: number;
  text: string;
  startDate: Date;
  endDate: Date;
  ownerId?: string;
  color?: string;
  reminder?: number;
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
      [views]="['week', 'timelineDay', 'timelineWeek']"
      [resources]="resources"
      [groups]="['ownerId']"
      [firstDayOfWeek]="1"
      [dayStartHour]="8"
      [dayEndHour]="18"
      [showCurrentTimeIndicator]="false"
      locale="en-US"
      (reminderTriggered)="reminders.push($event)"
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
      text: 'Handover',
      startDate: new Date(2026, 7, 6, 9, 30),
      endDate: new Date(2026, 7, 6, 11),
      ownerId: 'grace',
      color: '#dc2626',
    },
    {
      id: 3,
      text: 'Floating',
      startDate: new Date(2026, 7, 6, 13),
      endDate: new Date(2026, 7, 6, 14),
    },
  ]);
  readonly date = new Date(2026, 7, 6);
  readonly view = signal<OgeSchedulerView>('week');
  readonly resources = RESOURCES;
  readonly reminders: OgeSchedulerReminderEvent<Appt>[] = [];
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

describe('<oge-scheduler> resources, timeline and reminders', () => {
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

  it('colors uncolored appointments from the color-default resource', () => {
    const chips = Array.from(
      host.querySelectorAll<HTMLElement>('.oge-scheduler-chip'),
    );
    const kickoff = chips.find((chip) => chip.textContent?.includes('Kickoff'));
    const handover = chips.find((chip) =>
      chip.textContent?.includes('Handover'),
    );
    expect(kickoff?.style.backgroundColor).toBe('rgb(124, 58, 237)'); // Ada
    expect(handover?.style.backgroundColor).toBe('rgb(220, 38, 38)'); // own color wins
  });

  it('timelineDay renders one row per resource plus Unassigned', async () => {
    fixture.componentInstance.view.set('timelineDay');
    await settle(fixture);
    const rows = host.querySelectorAll('.oge-scheduler-timeline-row');
    expect(rows.length).toBe(3); // Ada, Grace, Unassigned
    expect(rows[0].textContent).toContain('Ada');
    expect(rows[0].textContent).toContain('Kickoff');
    expect(rows[2].textContent).toContain('Unassigned');
    expect(rows[2].textContent).toContain('Floating');
  });

  it('timelineWeek positions bars horizontally and clicking opens the popup', async () => {
    fixture.componentInstance.view.set('timelineWeek');
    await settle(fixture);
    const bar = Array.from(
      host.querySelectorAll<HTMLElement>('.oge-scheduler-timeline-bar'),
    ).find((el) => el.textContent?.includes('Kickoff'));
    expect(bar).toBeTruthy();
    // Thursday of a Monday-first week → left ≥ 3/7 of the axis
    expect(parseFloat(bar?.style.insetInlineStart ?? '0')).toBeGreaterThan(40);
    bar?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle(fixture);
    expect(host.querySelector('.oge-scheduler-popup')).toBeTruthy();
  });

  it('fires reminderTriggered once when the lead time is reached', () => {
    fixture.destroy();
    vi.useFakeTimers();
    try {
      // the ticker starts in the constructor — create under fake timers
      const timed = TestBed.createComponent(Host);
      const soon = new Date(Date.now() + 10 * 60_000);
      timed.componentInstance.data.set([
        {
          id: 9,
          text: 'Ping',
          startDate: soon,
          endDate: new Date(soon.getTime() + 30 * 60_000),
          reminder: 15,
        },
      ]);
      timed.detectChanges();
      vi.advanceTimersByTime(31_000);
      expect(timed.componentInstance.reminders.length).toBe(1);
      expect(timed.componentInstance.reminders[0].appointmentData.id).toBe(9);
      vi.advanceTimersByTime(31_000);
      expect(timed.componentInstance.reminders.length).toBe(1); // once
      timed.destroy();
    } finally {
      vi.useRealTimers();
    }
  });
});
