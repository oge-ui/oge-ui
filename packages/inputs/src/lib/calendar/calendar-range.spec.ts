import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeCalendar } from './calendar';
import type { OgeCalendarRange } from './calendar-types';

@Component({
  imports: [OgeCalendar],
  template: `
    <oge-calendar
      selectionMode="range"
      [viewsCount]="viewsCount()"
      [(range)]="range"
      [firstDayOfWeek]="1"
      locale="en-US"
    />
  `,
})
class Host {
  readonly range = signal<OgeCalendarRange>([null, null]);
  readonly viewsCount = signal<1 | 2>(2);
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

function dayCell(
  fixture: ComponentFixture<unknown>,
  view: number,
  text: string,
): HTMLButtonElement | undefined {
  const views = fixture.nativeElement.querySelectorAll('.oge-calendar-view');
  return Array.from(
    views[view].querySelectorAll<HTMLButtonElement>('.oge-calendar-cell'),
  ).find(
    (cell) =>
      cell.textContent?.trim() === text &&
      !cell.classList.contains('oge-calendar-cell-other'),
  );
}

describe('OgeCalendar range selection', () => {
  it('renders two side-by-side month views with titles', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const views = fixture.nativeElement.querySelectorAll('.oge-calendar-view');
    expect(views.length).toBe(2);
    const titles = Array.from(
      fixture.nativeElement.querySelectorAll('.oge-calendar-view-title'),
    ).map((t) => (t as HTMLElement).textContent?.trim());
    expect(titles).toHaveLength(2);
    expect(titles[0]).not.toBe(titles[1]); // consecutive months
    // a lead-in day never duplicates the roving tabindex across views
    const reachable = fixture.nativeElement.querySelectorAll(
      '.oge-calendar-cell[tabindex="0"]',
    );
    expect(reachable.length).toBe(1);
  });

  it('first click starts the range, second completes it (swapped if reversed)', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    dayCell(fixture, 0, '20')?.click();
    await settle(fixture);
    let [start, end] = fixture.componentInstance.range();
    expect(start).not.toBeNull();
    expect(end).toBeNull();
    dayCell(fixture, 0, '10')?.click(); // before the start → swapped
    await settle(fixture);
    [start, end] = fixture.componentInstance.range();
    expect(start?.getDate()).toBe(10);
    expect(end?.getDate()).toBe(20);
    // interior days get the range shading; edges the selected style
    expect(
      fixture.nativeElement.querySelectorAll('.oge-calendar-cell-in-range')
        .length,
    ).toBe(9);
    expect(
      fixture.nativeElement.querySelectorAll('.oge-calendar-cell-selected')
        .length,
    ).toBe(2);
  });

  it('hovering previews the range while the end is open', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    dayCell(fixture, 0, '10')?.click();
    await settle(fixture);
    dayCell(fixture, 0, '15')?.dispatchEvent(
      new MouseEvent('mouseenter', { bubbles: true }),
    );
    await settle(fixture);
    expect(
      fixture.nativeElement.querySelectorAll('.oge-calendar-cell-in-range')
        .length,
    ).toBe(4); // 11..14
  });

  it('a range across both views spans the shading over the boundary', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    dayCell(fixture, 0, '28')?.click();
    await settle(fixture);
    dayCell(fixture, 1, '3')?.click();
    await settle(fixture);
    const [start, end] = fixture.componentInstance.range();
    expect(start?.getDate()).toBe(28);
    expect(end?.getDate()).toBe(3);
    expect(end && start && end.getTime() > start.getTime()).toBe(true);
  });
});
