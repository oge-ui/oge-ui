import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeCalendar } from './calendar';

@Component({
  imports: [OgeCalendar],
  template: `
    <oge-calendar
      [(value)]="value"
      [min]="min()"
      [max]="max()"
      [disabledDates]="disabledDates()"
      [firstDayOfWeek]="1"
      locale="en-US"
      [showTodayButton]="showToday()"
    />
  `,
})
class Host {
  readonly value = signal<Date | null>(new Date(2026, 7, 15));
  readonly min = signal<Date | undefined>(undefined);
  readonly max = signal<Date | undefined>(undefined);
  readonly disabledDates = signal<Date[] | undefined>(undefined);
  readonly showToday = signal(false);
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function cells(fixture: ComponentFixture<unknown>): HTMLButtonElement[] {
  return Array.from(
    fixture.nativeElement.querySelectorAll('.oge-calendar-cell'),
  );
}

function headerLabel(fixture: ComponentFixture<unknown>): string {
  return (
    fixture.nativeElement
      .querySelector('.oge-calendar-view-label')
      ?.textContent?.trim() ?? ''
  );
}

describe('OgeCalendar', () => {
  it('renders the month of the bound value with the selection marked', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    expect(headerLabel(fixture)).toBe('August 2026');
    const selected = fixture.nativeElement.querySelector(
      '.oge-calendar-cell-selected',
    );
    expect(selected?.textContent?.trim()).toBe('15');
    expect(selected?.getAttribute('aria-selected')).toBe('true');
    // Monday-first weekday header
    expect(
      fixture.nativeElement.querySelector('.oge-calendar-weekday')?.textContent,
    ).toContain('Mon');
  });

  it('clicking a day commits it as a local midnight Date', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const day20 = cells(fixture).find(
      (cell) =>
        cell.textContent?.trim() === '20' &&
        !cell.classList.contains('oge-calendar-cell-other'),
    );
    day20?.click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toEqual(new Date(2026, 7, 20));
  });

  it('cellClick reports the activated cell with date, view and DOM event', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const calendar = fixture.debugElement.children[0]
      .componentInstance as OgeCalendar;
    const events: { date: Date; view: string; event: Event }[] = [];
    calendar.cellClick.subscribe((e) => events.push(e));
    const day20 = cells(fixture).find(
      (cell) =>
        cell.textContent?.trim() === '20' &&
        !cell.classList.contains('oge-calendar-cell-other'),
    );
    day20?.click();
    await settle(fixture);
    expect(events).toHaveLength(1);
    expect(events[0].date).toEqual(new Date(2026, 7, 20));
    expect(events[0].view).toBe('month');
    expect(events[0].event).toBeInstanceOf(Event);

    // zoom out: a year-view cell reports view 'year'
    fixture.nativeElement.querySelector('.oge-calendar-view-label').click();
    await settle(fixture);
    const march = cells(fixture).find(
      (cell) => cell.textContent?.trim() === 'Mar',
    );
    march?.click();
    await settle(fixture);
    expect(events).toHaveLength(2);
    expect(events[1].view).toBe('year');
    expect(events[1].date.getMonth()).toBe(2);
  });

  it('min/max and disabledDates render disabled, unselectable cells', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.min.set(new Date(2026, 7, 10));
    fixture.componentInstance.disabledDates.set([new Date(2026, 7, 12)]);
    await settle(fixture);
    const day9 = cells(fixture).find(
      (cell) =>
        cell.textContent?.trim() === '9' &&
        !cell.classList.contains('oge-calendar-cell-other'),
    );
    const day12 = cells(fixture).find(
      (cell) =>
        cell.textContent?.trim() === '12' &&
        !cell.classList.contains('oge-calendar-cell-other'),
    );
    expect(day9?.disabled).toBe(true);
    expect(day12?.disabled).toBe(true);
    day12?.click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toEqual(new Date(2026, 7, 15));
  });

  it('navigates months and drills through year/decade views', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const [prev, , next] = Array.from(
      fixture.nativeElement.querySelectorAll<HTMLButtonElement>(
        '.oge-calendar-header button',
      ),
    );
    next.click();
    await settle(fixture);
    expect(headerLabel(fixture)).toBe('September 2026');
    prev.click();
    await settle(fixture);
    expect(headerLabel(fixture)).toBe('August 2026');

    // zoom out to the year view, pick March, land back in the month view
    fixture.nativeElement.querySelector('.oge-calendar-view-label').click();
    await settle(fixture);
    expect(headerLabel(fixture)).toBe('2026');
    const march = cells(fixture).find(
      (cell) => cell.textContent?.trim() === 'Mar',
    );
    march?.click();
    await settle(fixture);
    expect(headerLabel(fixture)).toBe('March 2026');

    // and out to the decade view
    fixture.nativeElement.querySelector('.oge-calendar-view-label').click();
    await settle(fixture);
    fixture.nativeElement.querySelector('.oge-calendar-view-label').click();
    await settle(fixture);
    expect(headerLabel(fixture)).toBe('2020–2029');
  });

  it('exactly one day cell carries the reachable tabindex (roving)', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const reachable = cells(fixture).filter((cell) => cell.tabIndex === 0);
    expect(reachable).toHaveLength(1);
    expect(reachable[0].textContent?.trim()).toBe('15'); // anchored on value
  });

  it('today button selects today and marks aria-current', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.showToday.set(true);
    await settle(fixture);
    fixture.nativeElement.querySelector('.oge-calendar-today-btn').click();
    await settle(fixture);
    const today = new Date();
    expect(fixture.componentInstance.value()).toEqual(
      new Date(today.getFullYear(), today.getMonth(), today.getDate()),
    );
    expect(
      fixture.nativeElement.querySelector('[aria-current="date"]'),
    ).toBeTruthy();
  });
});
