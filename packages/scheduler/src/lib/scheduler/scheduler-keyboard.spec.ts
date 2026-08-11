import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeScheduler } from './scheduler';
import type { OgeSchedulerView } from '../scheduler-types';

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
      [firstDayOfWeek]="1"
      [dayStartHour]="8"
      [dayEndHour]="18"
      [showCurrentTimeIndicator]="false"
      locale="en-US"
    />
  `,
})
class Host {
  readonly data: Appt[] = [
    {
      id: 1,
      text: 'Early',
      startDate: new Date(2026, 7, 4, 9),
      endDate: new Date(2026, 7, 4, 10),
    },
    {
      id: 2,
      text: 'Late',
      startDate: new Date(2026, 7, 6, 14),
      endDate: new Date(2026, 7, 6, 15),
    },
  ];
  readonly date = new Date(2026, 7, 6);
  readonly view = signal<OgeSchedulerView>('week');
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

function key(element: HTMLElement, keyName: string): void {
  element.dispatchEvent(
    new KeyboardEvent('keydown', { key: keyName, bubbles: true }),
  );
}

describe('<oge-scheduler> keyboard model', () => {
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

  function focusTarget(): HTMLElement {
    const target = host.querySelector<HTMLElement>('[data-focus-target]');
    if (target === null) throw new Error('no roving focus target');
    return target;
  }

  it('exposes a role=grid with exactly one roving tabindex cell', () => {
    const grid = host.querySelector('.oge-scheduler-grid');
    expect(grid?.getAttribute('role')).toBe('grid');
    expect(grid?.getAttribute('aria-label')).toContain('Scheduler');
    const stops = host.querySelectorAll(
      '.oge-scheduler-rows .oge-scheduler-cell[tabindex="0"]',
    );
    expect(stops.length).toBe(1);
    expect(focusTarget().getAttribute('aria-label')).toBeTruthy();
  });

  it('moves the roving focus with arrows, Home and End', async () => {
    const first = focusTarget();
    key(first, 'ArrowRight');
    await settle(fixture);
    const second = focusTarget();
    expect(second).not.toBe(first);
    expect(second.getAttribute('aria-label')).not.toBe(
      first.getAttribute('aria-label'),
    );

    key(second, 'ArrowDown');
    await settle(fixture);
    const third = focusTarget();
    key(third, 'Home');
    await settle(fixture);
    const home = focusTarget();
    expect(home.getAttribute('aria-label')).toContain('Monday');
    key(home, 'End');
    await settle(fixture);
    expect(focusTarget().getAttribute('aria-label')).toContain('Sunday');
  });

  it('Enter on a cell opens the create editor', async () => {
    key(focusTarget(), 'Enter');
    await settle(fixture);
    expect(host.querySelector('.oge-scheduler-editor-form')).toBeTruthy();
  });

  it('chips form a second tab stop with chronological arrow cycling', async () => {
    const chips = host.querySelectorAll<HTMLElement>(
      '.oge-scheduler-chip-box[role="button"]',
    );
    expect(chips.length).toBe(2);
    const tabStops = Array.from(chips).filter((chip) => chip.tabIndex === 0);
    expect(tabStops.length).toBe(1);
    expect(tabStops[0].getAttribute('aria-label')).toContain('Early');

    key(tabStops[0], 'ArrowRight');
    await settle(fixture);
    const active = host.querySelector<HTMLElement>(
      '.oge-scheduler-chip-box[tabindex="0"]',
    );
    expect(active?.getAttribute('aria-label')).toContain('Late');
  });

  it('Enter on a chip opens the popup, Delete removes the appointment', async () => {
    const chip = host.querySelector<HTMLElement>(
      '.oge-scheduler-chip-box[tabindex="0"]',
    );
    key(chip!, 'Enter');
    await settle(fixture);
    expect(host.querySelector('.oge-scheduler-popup')).toBeTruthy();
    // Escape closes through the overlay stack
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await settle(fixture);
    expect(host.querySelector('.oge-scheduler-popup')).toBeNull();

    key(chip!, 'Delete');
    await settle(fixture);
    expect(
      host.querySelectorAll('.oge-scheduler-chip-box[role="button"]').length,
    ).toBe(1);
  });

  it('announces deletions through the polite live region', async () => {
    const chip = host.querySelector<HTMLElement>(
      '.oge-scheduler-chip-box[tabindex="0"]',
    );
    key(chip!, 'Delete');
    await settle(fixture);
    expect(host.querySelector('.oge-scheduler-live')?.textContent?.trim()).toBe(
      'Early deleted',
    );
  });

  it('month view exposes a role=grid with roving day cells', async () => {
    fixture.componentInstance.view.set('month');
    await settle(fixture);
    const grid = host.querySelector('.oge-scheduler-month-grid');
    expect(grid?.getAttribute('role')).toBe('grid');
    const target = focusTarget();
    key(target, 'ArrowDown');
    await settle(fixture);
    expect(focusTarget()).not.toBe(target);
  });
});
