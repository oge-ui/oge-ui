import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeCalendar } from '@oge-ui/inputs/calendar';
import { OgeDateBox } from './date-box';

const utc = (y: number, m: number, d: number, h = 0) =>
  new Date(Date.UTC(y, m - 1, d, h));

@Component({
  imports: [OgeDateBox, OgeCalendar],
  template: `
    <oge-date-box
      label="Due"
      locale="en-US"
      [timeZone]="zone()"
      [(value)]="value"
    />
    <oge-calendar
      locale="en-US"
      [timeZone]="zone()"
      [(value)]="day"
      [(range)]="range"
      [selectionMode]="mode()"
    />
  `,
})
class Host {
  readonly zone = signal<string | undefined>('America/New_York');
  readonly value = signal<Date | null>(utc(2026, 3, 5, 2)); // 4 Mar 21:00 NY
  readonly day = signal<Date | null>(utc(2026, 3, 10, 12));
  readonly range = signal<readonly [Date | null, Date | null]>([null, null]);
  readonly mode = signal<'single' | 'range'>('single');
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

const input = (fixture: ComponentFixture<Host>) =>
  fixture.nativeElement.querySelector('.oge-input-native') as HTMLInputElement;
const dayCell = (fixture: ComponentFixture<Host>, text: string) =>
  Array.from(
    fixture.nativeElement.querySelectorAll(
      '.oge-calendar-cell',
    ) as NodeListOf<HTMLButtonElement>,
  ).find(
    (cell) =>
      cell.textContent?.trim() === text &&
      !cell.classList.contains('oge-calendar-cell-other'),
  );

describe('date editors with a timeZone', () => {
  it("shows the zone's day and commits the zone's midnight", async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    expect(input(fixture).value).toBe('3/4/26');
    const el = input(fixture);
    el.value = '3/20/2026';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new FocusEvent('blur'));
    await settle(fixture);
    // midnight in New York (EDT, UTC-4)
    expect(fixture.componentInstance.value()?.toISOString()).toBe(
      '2026-03-20T04:00:00.000Z',
    );
    fixture.componentInstance.zone.set('UTC');
    await settle(fixture);
    expect(input(fixture).value).toBe('3/20/26');
  });

  it("calendar: the selection and picks are the zone's days", async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.zone.set('Asia/Tokyo');
    await settle(fixture);
    expect(
      fixture.nativeElement
        .querySelector('.oge-calendar-cell-selected')
        ?.textContent?.trim(),
    ).toBe('10'); // 21:00 in Tokyo
    dayCell(fixture, '12')?.click();
    await settle(fixture);
    expect(fixture.componentInstance.day()?.toISOString()).toBe(
      '2026-03-11T15:00:00.000Z', // 12 Mar 00:00 JST
    );
    fixture.componentInstance.mode.set('range');
    await settle(fixture);
    dayCell(fixture, '14')?.click();
    dayCell(fixture, '16')?.click();
    await settle(fixture);
    expect(
      fixture.componentInstance.range().map((d) => d?.toISOString()),
    ).toEqual(['2026-03-13T15:00:00.000Z', '2026-03-15T15:00:00.000Z']);
  });
});
