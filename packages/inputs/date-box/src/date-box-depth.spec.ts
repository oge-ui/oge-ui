import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ogeDateRangePresets, type OgeDateRangePreset } from '@oge-ui/behavior';
import type { OgeCalendarRange } from '../../calendar/src/calendar-types';
import { OgeDateBox } from './date-box';
import { OgeDateRangeBox } from './date-range-box';
import type { OgeDateBoxType } from './date-box-types';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

const q = <T extends HTMLElement = HTMLElement>(
  fixture: ComponentFixture<unknown>,
  selector: string,
) => fixture.nativeElement.querySelector(selector) as T | null;

const qa = <T extends HTMLElement = HTMLElement>(
  root: ComponentFixture<unknown> | HTMLElement,
  selector: string,
) =>
  Array.from(
    (root instanceof HTMLElement
      ? root
      : (root.nativeElement as HTMLElement)
    ).querySelectorAll(selector),
  ) as T[];

const open = async (fixture: ComponentFixture<unknown>) => {
  q(fixture, '.oge-input-dropdown')?.click();
  await settle(fixture);
};

const byText = (els: HTMLElement[], text: string) =>
  els.find((el) => el.textContent?.trim() === text);

beforeEach(() => {
  vi.stubGlobal(
    'requestAnimationFrame',
    (cb: FrameRequestCallback) =>
      setTimeout(() => cb(performance.now()), 0) as unknown as number,
  );
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

@Component({
  imports: [OgeDateBox],
  template: `
    <oge-date-box
      label="At"
      locale="en-US"
      [type]="type()"
      timeView="columns"
      [hour12]="hour12()"
      [showSeconds]="showSeconds()"
      [showTodayButton]="true"
      [showNowButton]="true"
      [interval]="15"
      [(value)]="value"
    />
  `,
})
class TimeHost {
  readonly value = signal<Date | null>(new Date(2026, 7, 6, 9, 0, 0));
  readonly type = signal<OgeDateBoxType>('time');
  readonly hour12 = signal<boolean | undefined>(true);
  readonly showSeconds = signal(true);
}

describe('OgeDateBox time depth', () => {
  it('renders hour / minute / second / AM-PM columns in 12-hour mode', async () => {
    const fixture = TestBed.createComponent(TimeHost);
    await settle(fixture);
    await open(fixture);
    const cols = qa(fixture, '.oge-date-box-col');
    expect(cols.map((c) => c.getAttribute('aria-label'))).toEqual([
      'Hours',
      'Minutes',
      'Seconds',
      'AM/PM',
    ]);
    expect(cols[0].querySelectorAll('.oge-date-box-time')).toHaveLength(12);
    expect(cols[2].querySelectorAll('.oge-date-box-time')).toHaveLength(60);

    byText(qa(cols[3], '.oge-date-box-time'), 'PM')?.click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toEqual(
      new Date(2026, 7, 6, 21, 0, 0),
    );
    byText(qa(cols[2], '.oge-date-box-time'), ':30')?.click();
    await settle(fixture);
    expect(fixture.componentInstance.value()?.getSeconds()).toBe(30);
    // the display text carries the seconds
    expect(q<HTMLInputElement>(fixture, '.oge-input-native')?.value).toMatch(
      /9:00:30/,
    );
  });

  it('Now commits the current time; Today is hidden for a time-only box', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 2, 4, 17, 25, 41));
    const fixture = TestBed.createComponent(TimeHost);
    await settle(fixture);
    await open(fixture);
    expect(q(fixture, '.oge-date-box-today')).toBeNull();
    q(fixture, '.oge-date-box-now')?.click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toEqual(
      new Date(2026, 2, 4, 17, 25, 41),
    );
    expect(q(fixture, '.oge-date-box-panel')).toBeNull();
  });

  it('Today keeps the time-of-day of a datetime value', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 2, 4, 8, 0));
    const fixture = TestBed.createComponent(TimeHost);
    fixture.componentInstance.type.set('datetime');
    await settle(fixture);
    await open(fixture);
    q(fixture, '.oge-date-box-today')?.click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toEqual(
      new Date(2026, 2, 4, 9, 0, 0),
    );
  });
});

@Component({
  imports: [OgeDateBox],
  template: `
    <oge-date-box
      label="Due"
      locale="de-DE"
      [useMaskBehavior]="true"
      [(value)]="value"
    />
  `,
})
class MaskHost {
  readonly value = signal<Date | null>(null);
}

describe('OgeDateBox useMaskBehavior', () => {
  const key = (
    el: HTMLInputElement,
    k: string,
    init: KeyboardEventInit = {},
  ) => {
    const event = new KeyboardEvent('keydown', {
      key: k,
      bubbles: true,
      cancelable: true,
      ...init,
    });
    el.dispatchEvent(event);
    return event;
  };

  it('fills locale-ordered segments from digits and commits on blur', async () => {
    const fixture = TestBed.createComponent(MaskHost);
    await settle(fixture);
    const el = q<HTMLInputElement>(fixture, '.oge-input-native')!;
    expect(el.value).toBe('');
    el.dispatchEvent(new FocusEvent('focus'));
    await settle(fixture);
    expect(el.value).toBe('dd.mm.yyyy');
    expect([el.selectionStart, el.selectionEnd]).toEqual([0, 2]);
    for (const k of '24032026') expect(key(el, k).defaultPrevented).toBe(true);
    await settle(fixture);
    expect(el.value).toBe('24.03.2026');
    expect(fixture.componentInstance.value()).toBeNull(); // not before blur
    el.dispatchEvent(new FocusEvent('blur'));
    await settle(fixture);
    expect(fixture.componentInstance.value()).toEqual(new Date(2026, 2, 24));
  });

  it('steps the active segment with arrows and opens on Alt+ArrowDown', async () => {
    const fixture = TestBed.createComponent(MaskHost);
    fixture.componentInstance.value.set(new Date(2026, 0, 31));
    await settle(fixture);
    const el = q<HTMLInputElement>(fixture, '.oge-input-native')!;
    el.dispatchEvent(new FocusEvent('focus'));
    key(el, 'ArrowRight'); // → month
    key(el, 'ArrowUp');
    await settle(fixture);
    expect(el.value).toBe('31.02.2026');
    // Feb 31 does not exist: invalid while typing, reverted on blur
    expect(el.getAttribute('aria-invalid')).toBe('true');
    expect(key(el, 'ArrowDown', { altKey: true }).defaultPrevented).toBe(true);
    await settle(fixture);
    expect(q(fixture, '.oge-date-box-panel')).toBeTruthy();
  });

  it('reverts incomplete segments on blur and pastes whole dates', async () => {
    const fixture = TestBed.createComponent(MaskHost);
    fixture.componentInstance.value.set(new Date(2026, 4, 1));
    await settle(fixture);
    const el = q<HTMLInputElement>(fixture, '.oge-input-native')!;
    el.dispatchEvent(new FocusEvent('focus'));
    key(el, 'Backspace');
    await settle(fixture);
    expect(el.value).toBe('dd.05.2026');
    el.dispatchEvent(new FocusEvent('blur'));
    await settle(fixture);
    expect(el.value).toBe('01.05.2026');
    expect(fixture.componentInstance.value()).toEqual(new Date(2026, 4, 1));

    el.dispatchEvent(new FocusEvent('focus'));
    const paste = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(paste, 'clipboardData', {
      value: { getData: () => '7.11.2027' },
    });
    el.dispatchEvent(paste);
    await settle(fixture);
    expect(el.value).toBe('07.11.2027');
    key(el, 'Enter');
    await settle(fixture);
    expect(fixture.componentInstance.value()).toEqual(new Date(2027, 10, 7));
  });
});

@Component({
  imports: [OgeDateRangeBox],
  template: `
    <oge-date-range-box
      label="Period"
      locale="en-US"
      [type]="type()"
      [presets]="presets"
      [interval]="60"
      [(value)]="value"
    />
  `,
})
class RangeHost {
  readonly value = signal<OgeCalendarRange>([null, null]);
  readonly type = signal<'date' | 'time' | 'datetime'>('date');
  readonly presets: OgeDateRangePreset[] = [
    ogeDateRangePresets.last7Days(),
    ogeDateRangePresets.thisMonth(),
    { label: 'Q1', range: () => [new Date(2026, 0, 1), new Date(2026, 2, 31)] },
  ];
}

describe('OgeDateRangeBox presets and time ranges', () => {
  it('lists presets beside the calendar; a pick commits and closes', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 2, 18, 12));
    const fixture = TestBed.createComponent(RangeHost);
    await settle(fixture);
    await open(fixture);
    const presets = qa(fixture, '.oge-date-range-preset');
    expect(presets.map((p) => p.textContent?.trim())).toEqual([
      'Last 7 days',
      'This month',
      'Q1',
    ]);
    expect(
      q(fixture, '.oge-date-range-presets')?.getAttribute('aria-label'),
    ).toBe('Quick ranges');
    presets[0].click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toEqual([
      new Date(2026, 2, 12),
      new Date(2026, 2, 18),
    ]);
    expect(q(fixture, '.oge-date-box-panel')).toBeNull();
    await open(fixture);
    expect(
      qa(fixture, '.oge-date-range-preset')[0].getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('type time drops the calendar and commits both times via OK', async () => {
    const fixture = TestBed.createComponent(RangeHost);
    fixture.componentInstance.type.set('time');
    await settle(fixture);
    await open(fixture);
    expect(q(fixture, '.oge-calendar')).toBeNull();
    const lists = qa(fixture, '.oge-date-range-time-col .oge-date-box-times');
    expect(lists).toHaveLength(2);
    qa(lists[0], '.oge-date-box-time')[9].click(); // 9:00
    qa(lists[1], '.oge-date-box-time')[17].click(); // 17:00
    await settle(fixture);
    q(fixture, '.oge-date-box-ok')?.click();
    await settle(fixture);
    const [start, end] = fixture.componentInstance.value();
    expect([start?.getHours(), end?.getHours()]).toEqual([9, 17]);
    expect(q<HTMLInputElement>(fixture, '.oge-date-range-input')?.value).toBe(
      '9:00 AM',
    );
  });
});
