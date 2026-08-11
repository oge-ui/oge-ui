import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeScheduler } from './scheduler';

interface Appt {
  id: number;
  text: string;
  startDate: Date;
  endDate: Date;
  allDay?: boolean;
  location?: string;
  recurrenceRule?: string;
}

@Component({
  imports: [OgeScheduler],
  template: `
    <oge-scheduler
      [dataSource]="data()"
      [currentDate]="date"
      currentView="agenda"
      [views]="['agenda', 'week']"
      [agendaDuration]="7"
      [firstDayOfWeek]="1"
      [showCurrentTimeIndicator]="false"
      locale="en-US"
    />
  `,
})
class Host {
  readonly data = signal<Appt[]>([
    {
      id: 1,
      text: 'Standup',
      startDate: new Date(2026, 7, 6, 9),
      endDate: new Date(2026, 7, 6, 9, 30),
      location: 'Room 2',
    },
    {
      id: 2,
      text: 'Offsite',
      startDate: new Date(2026, 7, 7),
      endDate: new Date(2026, 7, 9),
      allDay: true,
    },
  ]);
  readonly date = new Date(2026, 7, 6);
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

describe('<oge-scheduler> agenda view', () => {
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

  it('groups appointments by day and skips empty days', () => {
    const days = host.querySelectorAll('.oge-scheduler-agenda-day');
    // Aug 6 (Standup) + Aug 7 & 8 (Offsite spans; ends midnight Aug 9)
    expect(days.length).toBe(3);
    const firstDay = days[0];
    expect(firstDay.textContent).toContain('Standup');
    expect(firstDay.textContent).toContain('Room 2');
    // the all-day span renders the all-day label as its time
    expect(days[1].textContent).toContain('All day');
  });

  it('title shows the agenda range and navigation steps by duration', async () => {
    const title = host.querySelector('.oge-scheduler-title');
    expect(title?.textContent).toContain('Aug');
    const [, next] = Array.from(
      host.querySelectorAll<HTMLButtonElement>('.oge-scheduler-btn-icon'),
    );
    next.click();
    await settle(fixture);
    const scheduler = fixture.debugElement.children[0]
      .componentInstance as OgeScheduler<Appt>;
    expect(scheduler.currentDate().getDate()).toBe(13); // +7 days
  });

  it('renders the empty state when no appointments fall in the period', async () => {
    fixture.componentInstance.data.set([]);
    await settle(fixture);
    expect(
      host.querySelector('.oge-scheduler-agenda-empty')?.textContent?.trim(),
    ).toBe('No appointments in this period');
  });

  it('click opens the popup; recurring series expand into the list', async () => {
    fixture.componentInstance.data.set([
      {
        id: 3,
        text: 'Daily sync',
        startDate: new Date(2026, 7, 6, 10),
        endDate: new Date(2026, 7, 6, 10, 15),
        recurrenceRule: 'FREQ=DAILY;COUNT=3',
      },
    ]);
    await settle(fixture);
    expect(host.querySelectorAll('.oge-scheduler-agenda-item').length).toBe(3);
    host
      .querySelector<HTMLElement>('.oge-scheduler-agenda-item')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle(fixture);
    expect(host.querySelector('.oge-scheduler-popup')).toBeTruthy();
  });
});
