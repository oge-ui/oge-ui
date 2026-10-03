import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeScheduler } from './scheduler';
import type { OgeSchedulerView } from '../scheduler-types';

@Component({
  imports: [OgeScheduler],
  template: `
    <oge-scheduler
      [dataSource]="[]"
      [currentDate]="date"
      [(currentView)]="view"
      [views]="['week', 'month']"
      [firstDayOfWeek]="1"
      [dayStartHour]="8"
      [dayEndHour]="10"
      [showCurrentTimeIndicator]="false"
      [readOnly]="readOnly()"
      locale="en-US"
    />
  `,
})
class Host {
  readonly date = new Date(2026, 7, 6);
  readonly view = signal<OgeSchedulerView>('week');
  readonly readOnly = signal(false);
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

describe('OgeScheduler grid semantics', () => {
  let fixture: ComponentFixture<Host>;
  let host: HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    host = fixture.nativeElement as HTMLElement;
    await settle(fixture);
  });

  const grid = (): HTMLElement =>
    host.querySelector<HTMLElement>('[role="grid"]') as HTMLElement;

  it('renders a columnheader row inside the week grid', () => {
    const rows = grid().querySelectorAll(':scope > [role="row"]');
    // header row + 4 half-hour slot rows
    expect(rows.length).toBe(5);
    const headers = rows[0].querySelectorAll('[role="columnheader"]');
    expect(headers.length).toBe(7);
    expect(headers[0].textContent?.trim()).toBe('Monday, August 3, 2026');
    // the visual header no longer duplicates the names
    expect(
      host
        .querySelector('.oge-scheduler-header-row')
        ?.getAttribute('aria-hidden'),
    ).toBe('true');
  });

  it('marks the roving current cell aria-selected and follows clicks', async () => {
    const cells = Array.from(
      grid().querySelectorAll<HTMLElement>('[role="gridcell"]'),
    );
    expect(cells.every((cell) => cell.hasAttribute('aria-selected'))).toBe(
      true,
    );
    const selected = () =>
      cells.filter((cell) => cell.getAttribute('aria-selected') === 'true');
    expect(selected()).toEqual([cells[0]]);
    cells[9].click();
    await settle(fixture);
    expect(selected()).toEqual([cells[9]]);
  });

  it('sets aria-readonly only when the scheduler is read-only', async () => {
    expect(grid().hasAttribute('aria-readonly')).toBe(false);
    fixture.componentInstance.readOnly.set(true);
    await settle(fixture);
    expect(grid().getAttribute('aria-readonly')).toBe('true');
  });

  it('gives the month grid weekday columnheaders, selection and read-only', async () => {
    fixture.componentInstance.view.set('month');
    fixture.componentInstance.readOnly.set(true);
    await settle(fixture);
    const rows = grid().querySelectorAll(':scope > [role="row"]');
    expect(rows.length).toBe(7);
    const headers = rows[0].querySelectorAll('[role="columnheader"]');
    expect(Array.from(headers, (h) => h.textContent?.trim())).toEqual([
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ]);
    expect(
      grid().querySelectorAll('[role="gridcell"][aria-selected="true"]'),
    ).toHaveLength(1);
    expect(grid().getAttribute('aria-readonly')).toBe('true');
  });
});
