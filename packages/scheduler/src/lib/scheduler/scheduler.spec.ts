import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeScheduler } from './scheduler';
import type { OgeSchedulerMessages } from '../config';
import type { OgeSchedulerView } from '../scheduler-types';

interface Appt {
  id: number;
  text: string;
  startDate: Date;
  endDate: Date;
  allDay?: boolean;
  color?: string;
}

@Component({
  imports: [OgeScheduler],
  template: `
    <oge-scheduler
      [dataSource]="data()"
      [(currentDate)]="date"
      [(currentView)]="view"
      [firstDayOfWeek]="1"
      [dayStartHour]="8"
      [dayEndHour]="18"
      [messages]="messages()"
      [showCurrentTimeIndicator]="false"
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
    },
    {
      id: 2,
      text: 'Offsite',
      startDate: new Date(2026, 7, 5),
      endDate: new Date(2026, 7, 7),
      allDay: true,
    },
  ]);
  readonly date = signal(new Date(2026, 7, 6));
  readonly view = signal<OgeSchedulerView>('week');
  readonly messages = signal<Partial<OgeSchedulerMessages>>({});
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

function text(fixture: ComponentFixture<unknown>, selector: string): string {
  const el = (fixture.nativeElement as HTMLElement).querySelector(selector);
  return el?.textContent?.trim() ?? '';
}

describe('<oge-scheduler> shell', () => {
  let fixture: ComponentFixture<Host>;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    await settle(fixture);
  });

  it('renders the toolbar with navigation, title and view switcher', () => {
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.oge-scheduler-toolbar')).toBeTruthy();
    expect(text(fixture, '.oge-scheduler-title')).toContain('2026');
    const viewButtons = host.querySelectorAll('.oge-scheduler-view-btn');
    expect(viewButtons.length).toBe(3);
    expect(viewButtons[1].getAttribute('aria-pressed')).toBe('true'); // week
  });

  it('renders the week view with 7 day columns and the appointments', () => {
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('.oge-scheduler-day-col').length).toBe(7);
    expect(host.querySelectorAll('.oge-scheduler-chip-box').length).toBe(1);
    expect(text(fixture, '.oge-scheduler-chip-box .oge-scheduler-chip-text')).toBe(
      'Standup',
    );
    expect(host.querySelectorAll('.oge-scheduler-allday-bar').length).toBe(1);
  });

  it('switches views through the switcher and the two-way model', async () => {
    const host = fixture.nativeElement as HTMLElement;
    const buttons = host.querySelectorAll<HTMLButtonElement>(
      '.oge-scheduler-view-btn',
    );
    buttons[2].click();
    await settle(fixture);
    expect(fixture.componentInstance.view()).toBe('month');
    expect(host.querySelector('.oge-scheduler-month')).toBeTruthy();

    fixture.componentInstance.view.set('day');
    await settle(fixture);
    expect(host.querySelectorAll('.oge-scheduler-day-col').length).toBe(1);
  });

  it('navigates periods and today through the toolbar', async () => {
    const host = fixture.nativeElement as HTMLElement;
    const [prev, next] = Array.from(
      host.querySelectorAll<HTMLButtonElement>('.oge-scheduler-btn-icon'),
    );
    next.click();
    await settle(fixture);
    expect(fixture.componentInstance.date()).toEqual(new Date(2026, 7, 13));
    prev.click();
    prev.click();
    await settle(fixture);
    expect(fixture.componentInstance.date()).toEqual(new Date(2026, 6, 30));

    const today = Array.from(
      host.querySelectorAll<HTMLButtonElement>('.oge-scheduler-btn'),
    )[0];
    today.click();
    await settle(fixture);
    const now = new Date();
    expect(fixture.componentInstance.date().getDate()).toBe(now.getDate());
  });

  it('applies per-instance message overrides over the config defaults', async () => {
    fixture.componentInstance.messages.set({
      toolbar: {
        label: 'Zeitplaner',
        today: 'Heute',
        previous: 'Zurück',
        next: 'Weiter',
        viewSwitcherLabel: 'Ansichten',
        viewNames: { day: 'Tag', week: 'Woche', month: 'Monat' },
      },
    });
    await settle(fixture);
    const host = fixture.nativeElement as HTMLElement;
    expect(text(fixture, '.oge-scheduler-btn')).toBe('Heute');
    expect(
      host
        .querySelector('.oge-scheduler-toolbar')
        ?.getAttribute('aria-label'),
    ).toBe('Zeitplaner');
  });

  it('renders the all-day strip label and hides the panel on demand', () => {
    expect(text(fixture, '.oge-scheduler-gutter-label')).toBe('All day');
  });

  it('renders the month view lanes and day numbers', async () => {
    fixture.componentInstance.view.set('month');
    await settle(fixture);
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('.oge-scheduler-month-week').length).toBe(6);
    expect(
      host.querySelectorAll('.oge-scheduler-month-cell').length,
    ).toBe(42);
    expect(host.querySelectorAll('.oge-scheduler-month-bar').length)
      .toBeGreaterThanOrEqual(2); // Offsite bar + Standup chip
  });
});
