import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeScheduler } from './scheduler';
import type {
  OgeSchedulerAppointmentAddedEvent,
  OgeSchedulerAppointmentDeletedEvent,
  OgeSchedulerAppointmentDeletingEvent,
  OgeSchedulerAppointmentUpdatedEvent,
  OgeSchedulerEditorShowingEvent,
} from '../scheduler-types';

interface Appt {
  id: number;
  text: string;
  startDate: Date | string;
  endDate: Date | string;
  allDay?: boolean;
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
      [allowDeleting]="allowDeleting()"
      (appointmentAdded)="added.push($event)"
      (appointmentUpdated)="updated.push($event)"
      (appointmentDeleting)="onDeleting($event)"
      (appointmentDeleted)="deleted.push($event)"
      (editorShowing)="showings.push($event)"
    />
  `,
})
class Host {
  readonly data = signal<Appt[]>([
    {
      id: 1,
      text: 'Standup',
      startDate: new Date(2026, 7, 6, 9),
      endDate: new Date(2026, 7, 6, 10),
    },
  ]);
  readonly date = new Date(2026, 7, 6);
  readonly allowDeleting = signal(true);
  readonly added: OgeSchedulerAppointmentAddedEvent<Appt>[] = [];
  readonly updated: OgeSchedulerAppointmentUpdatedEvent<Appt>[] = [];
  readonly deleted: OgeSchedulerAppointmentDeletedEvent<Appt>[] = [];
  readonly showings: OgeSchedulerEditorShowingEvent<Appt>[] = [];
  cancelNextDelete = false;

  onDeleting(event: OgeSchedulerAppointmentDeletingEvent<Appt>): void {
    if (this.cancelNextDelete) event.cancel = true;
  }
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

function schedulerOf(fixture: ComponentFixture<Host>): OgeScheduler<Appt> {
  return fixture.debugElement.children[0].componentInstance as OgeScheduler<Appt>;
}

describe('<oge-scheduler> editing', () => {
  let fixture: ComponentFixture<Host>;

  beforeEach(() => {
    // async stub — a synchronous rAF re-enters Angular's render scheduler
    // mid-tick and produces bogus NG0100 errors
    vi.stubGlobal(
      'requestAnimationFrame',
      (cb: FrameRequestCallback) =>
        setTimeout(() => cb(performance.now()), 0) as unknown as number,
    );
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
    fixture = TestBed.createComponent(Host);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('opens the popup on chip click and the editor from its Edit action', async () => {
    await settle(fixture);
    const host = fixture.nativeElement as HTMLElement;
    host
      .querySelector<HTMLElement>('.oge-scheduler-chip-box')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle(fixture);
    const popup = host.querySelector('.oge-scheduler-popup');
    expect(popup).toBeTruthy();
    expect(popup?.textContent).toContain('Standup');

    const edit = Array.from(
      popup?.querySelectorAll<HTMLButtonElement>('.oge-scheduler-btn') ?? [],
    ).find((btn) => btn.textContent?.trim() === 'Edit');
    edit?.click();
    await settle(fixture);
    expect(host.querySelector('.oge-scheduler-editor-form')).toBeTruthy();
    expect(fixture.componentInstance.showings.length).toBe(1);
    expect(fixture.componentInstance.showings[0].isNew).toBe(false);
  });

  it('deletes through the popup and fires deleting/deleted', async () => {
    await settle(fixture);
    const host = fixture.nativeElement as HTMLElement;
    host
      .querySelector<HTMLElement>('.oge-scheduler-chip-box')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle(fixture);
    const remove = Array.from(
      host.querySelectorAll<HTMLButtonElement>(
        '.oge-scheduler-popup .oge-scheduler-btn',
      ),
    ).find((btn) => btn.textContent?.trim() === 'Delete');
    remove?.click();
    await settle(fixture);
    expect(fixture.componentInstance.deleted.length).toBe(1);
    expect(host.querySelector('.oge-scheduler-chip-box')).toBeNull();
  });

  it('a canceled deleting event keeps the appointment', async () => {
    fixture.componentInstance.cancelNextDelete = true;
    await settle(fixture);
    const scheduler = schedulerOf(fixture);
    const item = fixture.componentInstance.data()[0];
    (scheduler as unknown as { deleteBySource(item: Appt): void }).deleteBySource(
      item,
    );
    await settle(fixture);
    expect(fixture.componentInstance.deleted.length).toBe(0);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '.oge-scheduler-chip-box',
      ),
    ).toBeTruthy();
  });

  it('allowDeleting=false hides the popup Delete action and blocks the API', async () => {
    fixture.componentInstance.allowDeleting.set(false);
    await settle(fixture);
    const host = fixture.nativeElement as HTMLElement;
    host
      .querySelector<HTMLElement>('.oge-scheduler-chip-box')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle(fixture);
    const remove = Array.from(
      host.querySelectorAll<HTMLButtonElement>(
        '.oge-scheduler-popup .oge-scheduler-btn',
      ),
    ).find((btn) => btn.textContent?.trim() === 'Delete');
    expect(remove).toBeUndefined();
  });

  it('cell double-click opens a prefilled create editor and saving inserts', async () => {
    await settle(fixture);
    const host = fixture.nativeElement as HTMLElement;
    const cells = host.querySelectorAll<HTMLElement>(
      '.oge-scheduler-rows .oge-scheduler-cell',
    );
    cells[3].dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await settle(fixture);
    expect(fixture.componentInstance.showings.at(-1)?.isNew).toBe(true);
    const form = host.querySelector('.oge-scheduler-editor-form');
    expect(form).toBeTruthy();

    // fill the required subject through the form input
    const subject = form?.querySelector<HTMLInputElement>('input');
    expect(subject).toBeTruthy();
    subject!.value = 'Planning';
    subject!.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(fixture);

    const save = Array.from(
      host.querySelectorAll<HTMLButtonElement>(
        '.oge-scheduler-editor-footer .oge-scheduler-btn',
      ),
    ).find((btn) => btn.textContent?.trim() === 'Save');
    save?.click();
    await settle(fixture);
    expect(fixture.componentInstance.added.length).toBe(1);
    expect(
      host.querySelectorAll('.oge-scheduler-chip-box').length,
    ).toBeGreaterThanOrEqual(2);
  });

  it('editing an appointment patches string-dated items in place', async () => {
    fixture.componentInstance.data.set([
      {
        id: 5,
        text: 'Review',
        startDate: '2026-08-06T13:00',
        endDate: '2026-08-06T14:00',
      },
    ]);
    await settle(fixture);
    const scheduler = schedulerOf(fixture);
    scheduler.showAppointmentPopup(fixture.componentInstance.data()[0]);
    await settle(fixture);
    const host = fixture.nativeElement as HTMLElement;
    const subject = host.querySelector<HTMLInputElement>(
      '.oge-scheduler-editor-form input',
    );
    subject!.value = 'Review 2';
    subject!.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(fixture);
    const save = Array.from(
      host.querySelectorAll<HTMLButtonElement>(
        '.oge-scheduler-editor-footer .oge-scheduler-btn',
      ),
    ).find((btn) => btn.textContent?.trim() === 'Save');
    save?.click();
    await settle(fixture);
    const updated = fixture.componentInstance.updated.at(-1)?.appointmentData;
    expect(updated?.text).toBe('Review 2');
    expect(typeof updated?.startDate).toBe('string'); // storage shape kept
  });

  it('right-click on a chip opens the built-in menu and Delete removes through the pipeline', async () => {
    await settle(fixture);
    const host = fixture.nativeElement as HTMLElement;
    host
      .querySelector<HTMLElement>('.oge-scheduler-chip-stop')
      ?.dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
      );
    await settle(fixture);
    const menu = host.querySelector('.oge-scheduler-menu');
    expect(menu).not.toBeNull();
    const remove = Array.from(
      menu?.querySelectorAll<HTMLButtonElement>('.oge-scheduler-menu-item') ??
        [],
    ).find((button) => button.textContent?.includes('Delete'));
    remove?.click();
    await settle(fixture);
    expect(host.querySelector('.oge-scheduler-menu')).toBeNull();
    expect(fixture.componentInstance.deleted).toHaveLength(1);
    expect(host.querySelector('.oge-scheduler-chip-box')).toBeNull();
  });

  it('right-click on an empty cell offers New appointment prefilled at that slot', async () => {
    await settle(fixture);
    const host = fixture.nativeElement as HTMLElement;
    const cells = host.querySelectorAll<HTMLElement>(
      '.oge-scheduler-rows .oge-scheduler-cell',
    );
    cells[3]?.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
    );
    await settle(fixture);
    const item = host.querySelector<HTMLButtonElement>(
      '.oge-scheduler-menu-item',
    );
    expect(item?.textContent).toContain('New appointment');
    item?.click();
    await settle(fixture);
    expect(host.querySelector('.oge-scheduler-menu')).toBeNull();
    expect(host.querySelector('.oge-scheduler-editor-form')).toBeTruthy();
  });

  it('the menu respects the allow flags: delete disabled when allowDeleting=false', async () => {
    fixture.componentInstance.allowDeleting.set(false);
    await settle(fixture);
    const host = fixture.nativeElement as HTMLElement;
    host
      .querySelector<HTMLElement>('.oge-scheduler-chip-stop')
      ?.dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
      );
    await settle(fixture);
    const remove = Array.from(
      host.querySelectorAll<HTMLButtonElement>('.oge-scheduler-menu-item'),
    ).find((button) => button.textContent?.includes('Delete'));
    expect(remove?.disabled).toBe(true);
  });

  it('hideAppointmentPopup closes both surfaces', async () => {
    await settle(fixture);
    const scheduler = schedulerOf(fixture);
    scheduler.showAppointmentPopup(undefined, true);
    await settle(fixture);
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.oge-scheduler-editor-form')).toBeTruthy();
    scheduler.hideAppointmentPopup();
    await settle(fixture);
    expect(host.querySelector('.oge-scheduler-editor-form')).toBeNull();
  });
});
