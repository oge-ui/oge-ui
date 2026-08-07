import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeCalendar } from './calendar';

@Component({
  imports: [OgeCalendar],
  template: `
    <oge-calendar
      [(value)]="value"
      [(focusedDate)]="focused"
      [firstDayOfWeek]="1"
      locale="en-US"
    />
  `,
})
class Host {
  readonly value = signal<Date | null>(new Date(2026, 7, 15));
  readonly focused = signal<Date | null>(null);
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  // roving focus lands via setTimeout
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

function press(
  fixture: ComponentFixture<unknown>,
  key: string,
  init: KeyboardEventInit = {},
): void {
  fixture.nativeElement.querySelector('.oge-calendar-grid').dispatchEvent(
    new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key,
      ...init,
    }),
  );
}

function focusTargetText(fixture: ComponentFixture<unknown>): string {
  return (
    fixture.nativeElement
      .querySelector('[data-focus-target]')
      ?.textContent?.trim() ?? ''
  );
}

function headerLabel(fixture: ComponentFixture<unknown>): string {
  return (
    fixture.nativeElement
      .querySelector('.oge-calendar-view-label')
      ?.textContent?.trim() ?? ''
  );
}

describe('OgeCalendar keyboard', () => {
  it('arrows move the roving focus by day and week', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    expect(focusTargetText(fixture)).toBe('15');
    press(fixture, 'ArrowRight');
    await settle(fixture);
    expect(focusTargetText(fixture)).toBe('16');
    expect(fixture.componentInstance.focused()).toEqual(new Date(2026, 7, 16));
    press(fixture, 'ArrowDown');
    await settle(fixture);
    expect(focusTargetText(fixture)).toBe('23');
    press(fixture, 'ArrowUp');
    press(fixture, 'ArrowLeft');
    await settle(fixture);
    expect(focusTargetText(fixture)).toBe('15');
  });

  it('crossing a month boundary swaps the visible month', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.value.set(new Date(2026, 7, 31));
    await settle(fixture);
    press(fixture, 'ArrowRight');
    await settle(fixture);
    expect(headerLabel(fixture)).toBe('September 2026');
    expect(focusTargetText(fixture)).toBe('1');
  });

  it('PgUp/PgDn move by month, with Shift by year', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    press(fixture, 'PageDown');
    await settle(fixture);
    expect(headerLabel(fixture)).toBe('September 2026');
    press(fixture, 'PageUp');
    await settle(fixture);
    expect(headerLabel(fixture)).toBe('August 2026');
    press(fixture, 'PageDown', { shiftKey: true });
    await settle(fixture);
    expect(headerLabel(fixture)).toBe('August 2027');
  });

  it('Home/End jump to the week edges (Monday-first)', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    // Aug 15 2026 is a Saturday; Monday-first week: Mon 10 … Sun 16
    press(fixture, 'Home');
    await settle(fixture);
    expect(focusTargetText(fixture)).toBe('10');
    press(fixture, 'End');
    await settle(fixture);
    expect(focusTargetText(fixture)).toBe('16');
  });
});
