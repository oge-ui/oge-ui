import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { OgeCalendarRange } from '../calendar/calendar-types';
import { OgeDateRangeBox } from './date-range-box';

@Component({
  imports: [OgeDateRangeBox],
  template: `
    <oge-date-range-box label="Period" locale="en-US" [(value)]="value" />
  `,
})
class Host {
  readonly value = signal<OgeCalendarRange>([null, null]);
}

@Component({
  imports: [OgeDateRangeBox],
  template: `
    <oge-date-range-box
      label="Window"
      locale="en-US"
      type="datetime"
      [interval]="60"
      [(value)]="value"
    />
  `,
})
class DateTimeHost {
  readonly value = signal<OgeCalendarRange>([null, null]);
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

function inputs(fixture: ComponentFixture<unknown>): HTMLInputElement[] {
  return Array.from(
    fixture.nativeElement.querySelectorAll('.oge-date-range-input'),
  );
}

describe('OgeDateRangeBox', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'requestAnimationFrame',
      (cb: FrameRequestCallback) =>
        setTimeout(() => cb(performance.now()), 0) as unknown as number,
    );
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('formats both ends of the bound tuple', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.value.set([
      new Date(2026, 7, 10),
      new Date(2026, 7, 20),
    ]);
    await settle(fixture);
    const [start, end] = inputs(fixture);
    expect(start.value).toBe('8/10/26');
    expect(end.value).toBe('8/20/26');
  });

  it('typed sides commit ordered on blur; bad text reverts', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const [start, end] = inputs(fixture);
    // reversed pair typed → reordered on commit
    start.value = '8/20/2026';
    start.dispatchEvent(new Event('input', { bubbles: true }));
    end.value = '8/10/2026';
    end.dispatchEvent(new Event('input', { bubbles: true }));
    start.dispatchEvent(new FocusEvent('blur'));
    await settle(fixture);
    const [a, b] = fixture.componentInstance.value();
    expect(a).toEqual(new Date(2026, 7, 10));
    expect(b).toEqual(new Date(2026, 7, 20));
    // garbage on one side keeps the committed value
    end.value = 'nope';
    end.dispatchEvent(new Event('input', { bubbles: true }));
    end.dispatchEvent(new FocusEvent('blur'));
    await settle(fixture);
    expect(fixture.componentInstance.value()[1]).toEqual(new Date(2026, 7, 20));
  });

  it('the popup hosts a two-view range calendar; completing the range commits and closes', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.value.set([new Date(2026, 7, 15), null]);
    await settle(fixture);
    fixture.nativeElement.querySelector('.oge-input-dropdown').click();
    await settle(fixture);
    const views = fixture.nativeElement.querySelectorAll('.oge-calendar-view');
    expect(views.length).toBe(2);
    const day20 = Array.from(
      views[0].querySelectorAll<HTMLButtonElement>('.oge-calendar-cell'),
    ).find(
      (cell) =>
        cell.textContent?.trim() === '20' &&
        !cell.classList.contains('oge-calendar-cell-other'),
    );
    day20?.click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toEqual([
      new Date(2026, 7, 15),
      new Date(2026, 7, 20),
    ]);
    expect(
      fixture.nativeElement.querySelector('.oge-date-box-panel'),
    ).toBeNull(); // closed after the range completed
  });

  describe('type: datetime', () => {
    function open(fixture: ComponentFixture<unknown>): void {
      fixture.nativeElement.querySelector('.oge-input-dropdown').click();
    }

    function timeLists(fixture: ComponentFixture<unknown>): HTMLElement[] {
      return Array.from(
        fixture.nativeElement.querySelectorAll(
          '.oge-date-range-time-col .oge-date-box-times',
        ),
      );
    }

    it('renders time-of-day and parses typed datetimes', async () => {
      const fixture = TestBed.createComponent(DateTimeHost);
      fixture.componentInstance.value.set([
        new Date(2026, 7, 10, 9, 30),
        new Date(2026, 7, 20, 17, 0),
      ]);
      await settle(fixture);
      const [start, end] = inputs(fixture);
      expect(start.value).toBe('8/10/26, 9:30 AM');
      expect(end.value).toBe('8/20/26, 5:00 PM');
      start.value = '8/12/2026 8:15 AM';
      start.dispatchEvent(new Event('input', { bubbles: true }));
      start.dispatchEvent(new FocusEvent('blur'));
      await settle(fixture);
      expect(fixture.componentInstance.value()[0]).toEqual(
        new Date(2026, 7, 12, 8, 15),
      );
    });

    it('day picks keep the popup open (commit happens via OK)', async () => {
      const fixture = TestBed.createComponent(DateTimeHost);
      fixture.componentInstance.value.set([new Date(2026, 7, 15, 9, 30), null]);
      await settle(fixture);
      open(fixture);
      await settle(fixture);
      const view = fixture.nativeElement.querySelector('.oge-calendar-view');
      const day20 = Array.from(
        view.querySelectorAll<HTMLButtonElement>('.oge-calendar-cell'),
      ).find(
        (cell) =>
          cell.textContent?.trim() === '20' &&
          !cell.classList.contains('oge-calendar-cell-other'),
      );
      day20?.click();
      await settle(fixture);
      // still open, nothing committed yet
      expect(
        fixture.nativeElement.querySelector('.oge-date-box-panel'),
      ).not.toBeNull();
      expect(fixture.componentInstance.value()[1]).toBeNull();
      expect(timeLists(fixture).length).toBe(2);
    });

    it('side time picks + OK commit the range with times, ordered', async () => {
      const fixture = TestBed.createComponent(DateTimeHost);
      fixture.componentInstance.value.set([
        new Date(2026, 7, 10, 9, 30),
        new Date(2026, 7, 20, 17, 0),
      ]);
      await settle(fixture);
      open(fixture);
      await settle(fixture);
      const [startList, endList] = timeLists(fixture);
      // 60-min interval → slot index = hour
      const pick = (list: HTMLElement, text: string) =>
        Array.from(
          list.querySelectorAll<HTMLButtonElement>('.oge-date-box-time'),
        )
          .find((slot) => slot.textContent?.trim() === text)
          ?.click();
      pick(startList, '11:00 AM');
      await settle(fixture);
      // draft only — value untouched until OK
      expect(fixture.componentInstance.value()[0]).toEqual(
        new Date(2026, 7, 10, 9, 30),
      );
      expect(
        startList.querySelector('.oge-date-box-time-selected')?.textContent,
      ).toContain('11:00 AM');
      pick(endList, '3:00 PM');
      await settle(fixture);
      fixture.nativeElement.querySelector('.oge-date-box-ok').click();
      await settle(fixture);
      expect(fixture.componentInstance.value()).toEqual([
        new Date(2026, 7, 10, 11, 0),
        new Date(2026, 7, 20, 15, 0),
      ]);
      expect(
        fixture.nativeElement.querySelector('.oge-date-box-panel'),
      ).toBeNull();
    });

    it('picking a day keeps the time-of-day of that side', async () => {
      const fixture = TestBed.createComponent(DateTimeHost);
      fixture.componentInstance.value.set([
        new Date(2026, 7, 10, 9, 30),
        new Date(2026, 7, 20, 17, 0),
      ]);
      await settle(fixture);
      open(fixture);
      await settle(fixture);
      const view = fixture.nativeElement.querySelector('.oge-calendar-view');
      const day12 = Array.from(
        view.querySelectorAll<HTMLButtonElement>('.oge-calendar-cell'),
      ).find(
        (cell) =>
          cell.textContent?.trim() === '12' &&
          !cell.classList.contains('oge-calendar-cell-other'),
      );
      day12?.click(); // range restarts at the 12th → start side keeps 9:30
      await settle(fixture);
      fixture.nativeElement.querySelector('.oge-date-box-ok').click();
      await settle(fixture);
      expect(fixture.componentInstance.value()[0]).toEqual(
        new Date(2026, 7, 12, 9, 30),
      );
    });
  });

  it('clear empties both ends', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.value.set([
      new Date(2026, 7, 10),
      new Date(2026, 7, 20),
    ]);
    await settle(fixture);
    const box = fixture.debugElement.children[0]
      .componentInstance as OgeDateRangeBox;
    box.clear();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toEqual([null, null]);
    expect(inputs(fixture)[0].value).toBe('');
  });
});
