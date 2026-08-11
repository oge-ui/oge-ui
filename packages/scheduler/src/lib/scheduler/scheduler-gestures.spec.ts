import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeScheduler } from './scheduler';
import type { OgeSchedulerAppointmentUpdatedEvent } from '../scheduler-types';

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
      [dataSource]="data()"
      [currentDate]="date"
      currentView="week"
      [firstDayOfWeek]="1"
      [dayStartHour]="8"
      [dayEndHour]="18"
      [showCurrentTimeIndicator]="false"
      [allowDragging]="allowDragging()"
      locale="en-US"
      (appointmentUpdated)="updated.push($event)"
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
  readonly allowDragging = signal(true);
  readonly updated: OgeSchedulerAppointmentUpdatedEvent<Appt>[] = [];
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

function pointer(
  type: string,
  init: PointerEventInit & MouseEventInit,
): PointerEvent {
  // jsdom has no PointerEvent constructor in some versions — MouseEvent works
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    ...init,
  }) as unknown as PointerEvent;
  return event;
}

/** The rows area is laid out by jsdom with zero size — stub its rect. */
function stubRowsRect(host: HTMLElement): void {
  const rows = host.querySelector<HTMLElement>('.oge-scheduler-rows');
  if (rows === null) throw new Error('rows missing');
  rows.getBoundingClientRect = () =>
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
}

describe('<oge-scheduler> gestures', () => {
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
    stubRowsRect(host);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function chip(): HTMLElement {
    const el = host.querySelector<HTMLElement>('.oge-scheduler-chip-box');
    if (el === null) throw new Error('chip missing');
    return el;
  }

  it('drag-move commits a slot-snapped move on pointerup', async () => {
    // 700px / 7 days = 100px per day; 600px / 600min window = 1px per minute
    chip().dispatchEvent(pointer('pointerdown', { clientX: 350, clientY: 90, button: 0 }));
    document.dispatchEvent(pointer('pointermove', { clientX: 452, clientY: 152 }));
    await settle(fixture);
    // preview visible during the drag
    expect(host.querySelector('.oge-scheduler-drag-preview')).toBeTruthy();
    document.dispatchEvent(pointer('pointerup', {}));
    await settle(fixture);
    const updated = fixture.componentInstance.updated.at(-1)?.appointmentData;
    expect(updated?.startDate).toEqual(new Date(2026, 7, 7, 10)); // +1 day, +60min
    expect(updated?.endDate).toEqual(new Date(2026, 7, 7, 11));
    expect(host.querySelector('.oge-scheduler-drag-preview')).toBeNull();
  });

  it('Escape mid-drag cancels and restores the committed position', async () => {
    chip().dispatchEvent(pointer('pointerdown', { clientX: 350, clientY: 90, button: 0 }));
    document.dispatchEvent(pointer('pointermove', { clientX: 452, clientY: 152 }));
    await settle(fixture);
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await settle(fixture);
    document.dispatchEvent(pointer('pointerup', {}));
    await settle(fixture);
    expect(fixture.componentInstance.updated.length).toBe(0);
    expect(fixture.componentInstance.data()[0].startDate).toEqual(
      new Date(2026, 7, 6, 9),
    );
    expect(
      host.querySelector('.oge-scheduler-live')?.textContent?.trim(),
    ).toBe('Cancelled');
  });

  it('a sub-threshold press never commits', async () => {
    chip().dispatchEvent(pointer('pointerdown', { clientX: 350, clientY: 90, button: 0 }));
    document.dispatchEvent(pointer('pointermove', { clientX: 351, clientY: 91 }));
    document.dispatchEvent(pointer('pointerup', {}));
    await settle(fixture);
    expect(fixture.componentInstance.updated.length).toBe(0);
  });

  it('resize via the end handle grows the appointment', async () => {
    const handle = host.querySelector<HTMLElement>(
      '.oge-scheduler-resize-end',
    );
    handle?.dispatchEvent(
      pointer('pointerdown', { clientX: 350, clientY: 120, button: 0 }),
    );
    document.dispatchEvent(pointer('pointermove', { clientX: 350, clientY: 180 }));
    document.dispatchEvent(pointer('pointerup', {}));
    await settle(fixture);
    const updated = fixture.componentInstance.updated.at(-1)?.appointmentData;
    expect(updated?.startDate).toEqual(new Date(2026, 7, 6, 9)); // unchanged
    expect(updated?.endDate).toEqual(new Date(2026, 7, 6, 11)); // +60min
  });

  it('keyboard move (Ctrl+Arrow) and resize (Ctrl+Shift+Down) commit directly', async () => {
    chip().dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        ctrlKey: true,
        bubbles: true,
      }),
    );
    await settle(fixture);
    expect(
      fixture.componentInstance.updated.at(-1)?.appointmentData.startDate,
    ).toEqual(new Date(2026, 7, 7, 9));
    expect(
      host.querySelector('.oge-scheduler-live')?.textContent,
    ).toContain('moved');

    stubRowsRect(host);
    host
      .querySelector<HTMLElement>('.oge-scheduler-chip-box')
      ?.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          ctrlKey: true,
          shiftKey: true,
          bubbles: true,
        }),
      );
    await settle(fixture);
    const last = fixture.componentInstance.updated.at(-1)?.appointmentData;
    expect(last?.endDate).toEqual(new Date(2026, 7, 7, 10, 30));
  });

  it('allowDragging=false ignores drag attempts', async () => {
    fixture.componentInstance.allowDragging.set(false);
    await settle(fixture);
    stubRowsRect(host);
    chip().dispatchEvent(pointer('pointerdown', { clientX: 350, clientY: 90, button: 0 }));
    document.dispatchEvent(pointer('pointermove', { clientX: 452, clientY: 152 }));
    document.dispatchEvent(pointer('pointerup', {}));
    await settle(fixture);
    expect(fixture.componentInstance.updated.length).toBe(0);
  });

  it('month-view bar drag moves by whole days, preserving the time', async () => {
    fixture.componentInstance.data.set([
      {
        id: 1,
        text: 'Standup',
        startDate: new Date(2026, 7, 6, 9),
        endDate: new Date(2026, 7, 6, 10),
      },
    ]);
    const scheduler = fixture.debugElement.children[0]
      .componentInstance as OgeScheduler<Appt>;
    scheduler.currentView.set('month');
    await settle(fixture);
    const gridEl = host.querySelector<HTMLElement>('.oge-scheduler-month-grid');
    gridEl!.getBoundingClientRect = () =>
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
    const bar = host.querySelector<HTMLElement>('.oge-scheduler-month-bar');
    // Aug 6 sits in week 1 (0-based), day 3 (Mon-first) → move to week 2, day 0
    bar?.dispatchEvent(pointer('pointerdown', { clientX: 350, clientY: 150, button: 0 }));
    document.dispatchEvent(pointer('pointermove', { clientX: 50, clientY: 250 }));
    document.dispatchEvent(pointer('pointerup', {}));
    await settle(fixture);
    const updated = fixture.componentInstance.updated.at(-1)?.appointmentData;
    expect(updated?.startDate).toEqual(new Date(2026, 7, 10, 9)); // Mon next week, 9:00 kept
  });
});
