import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeScheduler } from './scheduler';
import type {
  OgeSchedulerAppointmentUpdatedEvent,
  OgeSchedulerAppointmentDeletedEvent,
  OgeSchedulerAppointmentAddedEvent,
} from '../scheduler-types';

interface Appt {
  id: number;
  text: string;
  startDate: Date;
  endDate: Date;
  recurrenceRule?: string;
  recurrenceException?: string;
}

@Component({
  imports: [OgeScheduler],
  template: `
    <oge-scheduler
      [dataSource]="data()"
      [currentDate]="date"
      currentView="week"
      [firstDayOfWeek]="1"
      [dayStartHour]="8"
      [dayEndHour]="18"
      [showCurrentTimeIndicator]="false"
      [recurrenceEditMode]="mode()"
      locale="en-US"
      (appointmentAdded)="added.push($event)"
      (appointmentUpdated)="updated.push($event)"
      (appointmentDeleted)="deleted.push($event)"
    />
  `,
})
class Host {
  readonly data = signal<Appt[]>([
    {
      id: 1,
      text: 'Standup',
      startDate: new Date(2026, 7, 3, 9), // Monday
      endDate: new Date(2026, 7, 3, 9, 30),
      recurrenceRule: 'FREQ=DAILY',
    },
  ]);
  readonly date = new Date(2026, 7, 6);
  readonly mode = signal<'dialog' | 'occurrence' | 'series'>('dialog');
  readonly added: OgeSchedulerAppointmentAddedEvent<Appt>[] = [];
  readonly updated: OgeSchedulerAppointmentUpdatedEvent<Appt>[] = [];
  readonly deleted: OgeSchedulerAppointmentDeletedEvent<Appt>[] = [];
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

describe('<oge-scheduler> recurrence', () => {
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

  function chips(): HTMLElement[] {
    return Array.from(
      host.querySelectorAll<HTMLElement>('.oge-scheduler-chip-box'),
    );
  }

  it('expands a daily series into one occurrence per visible day', () => {
    expect(chips().length).toBe(7);
    expect(
      host.querySelectorAll('.oge-scheduler-chip-recur').length,
    ).toBe(7);
  });

  it('honors COUNT and exceptions in the view window', async () => {
    fixture.componentInstance.data.set([
      {
        id: 1,
        text: 'Standup',
        startDate: new Date(2026, 7, 3, 9),
        endDate: new Date(2026, 7, 3, 9, 30),
        recurrenceRule: 'FREQ=DAILY;COUNT=4',
        recurrenceException: '20260804T090000',
      },
    ]);
    await settle(fixture);
    expect(chips().length).toBe(3); // Aug 3,5,6 (4th excluded, count ends Aug 6)
  });

  it('deleting with Delete opens the scope dialog; occurrence adds an EXDATE', async () => {
    const chip = chips()[2];
    chip.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }),
    );
    await settle(fixture);
    const scope = host.querySelector('.oge-scheduler-scope');
    expect(scope).toBeTruthy();
    const occurrenceBtn = Array.from(
      scope?.querySelectorAll<HTMLButtonElement>('button') ?? [],
    ).find((btn) => btn.textContent?.includes('Only this appointment'));
    occurrenceBtn?.click();
    await settle(fixture);
    expect(chips().length).toBe(6);
    const updated = fixture.componentInstance.updated.at(-1)?.appointmentData;
    expect(updated?.recurrenceException).toBe('20260805T090000');
    expect(fixture.componentInstance.deleted.length).toBe(0); // series intact
  });

  it('recurrenceEditMode=series deletes the whole series without asking', async () => {
    fixture.componentInstance.mode.set('series');
    await settle(fixture);
    chips()[0].dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }),
    );
    await settle(fixture);
    expect(host.querySelector('.oge-scheduler-scope')).toBeNull();
    expect(fixture.componentInstance.deleted.length).toBe(1);
    expect(chips().length).toBe(0);
  });

  it('occurrence-scope move detaches: EXDATE + standalone copy', async () => {
    fixture.componentInstance.mode.set('occurrence');
    await settle(fixture);
    const scheduler = fixture.debugElement.children[0]
      .componentInstance as OgeScheduler<Appt>;
    scheduler.currentView.set('week');
    await settle(fixture);
    // keyboard move of the Wednesday occurrence one day right
    const target = chips()[2];
    target.focus();
    target.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        ctrlKey: true,
        bubbles: true,
      }),
    );
    await settle(fixture);
    // EXDATE landed on the series and a detached copy was inserted
    expect(
      fixture.componentInstance.updated.at(-1)?.appointmentData
        .recurrenceException,
    ).toContain('20260805T090000');
    const inserted = fixture.componentInstance.added.at(-1)?.appointmentData;
    expect(inserted?.startDate).toEqual(new Date(2026, 7, 6, 9));
    expect(inserted?.recurrenceRule).toBeUndefined();
  });

  it('saving the editor with a weekly rule writes the serialized RRULE', async () => {
    fixture.componentInstance.data.set([
      {
        id: 2,
        text: 'One-off',
        startDate: new Date(2026, 7, 6, 11),
        endDate: new Date(2026, 7, 6, 12),
      },
    ]);
    await settle(fixture);
    const scheduler = fixture.debugElement.children[0]
      .componentInstance as OgeScheduler<Appt>;
    scheduler.showAppointmentPopup(fixture.componentInstance.data()[0]);
    await settle(fixture);
    // drive the editor model directly (form plumbing is covered elsewhere)
    const dialog = fixture.debugElement
      .query((el) => el.name === 'oge-scheduler-appointment-dialog')
      ?.componentInstance as {
      model: { set(value: unknown): void; (): unknown };
      save(): void;
    } & Record<string, unknown>;
    const current = (
      dialog as unknown as { model: () => Record<string, unknown> }
    ).model();
    (dialog as unknown as { model: { set(v: unknown): void } }).model.set({
      ...current,
      repeat: 'weekly',
      interval: 2,
      byDays: [1, 4],
      endMode: 'count',
      count: 8,
    });
    (dialog as unknown as { save(): void }).save();
    await settle(fixture);
    const updated = fixture.componentInstance.updated.at(-1)?.appointmentData;
    expect(updated?.recurrenceRule).toBe(
      'FREQ=WEEKLY;INTERVAL=2;COUNT=8;BYDAY=MO,TH',
    );
  });
});
