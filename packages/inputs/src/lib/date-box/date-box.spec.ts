import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeDateBox } from './date-box';
import type { OgeDateBoxType } from './date-box-types';

@Component({
  imports: [OgeDateBox],
  template: `
    <oge-date-box
      label="When"
      locale="en-US"
      [type]="type()"
      [min]="min()"
      [max]="max()"
      [interval]="60"
      [(value)]="value"
    />
  `,
})
class Host {
  readonly value = signal<Date | null>(null);
  readonly type = signal<OgeDateBoxType>('date');
  readonly min = signal<Date | undefined>(undefined);
  readonly max = signal<Date | undefined>(undefined);
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

function inputEl(fixture: ComponentFixture<unknown>): HTMLInputElement {
  return fixture.nativeElement.querySelector('.oge-input-native');
}

function type(fixture: ComponentFixture<unknown>, text: string): void {
  const el = inputEl(fixture);
  el.value = text;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

function blur(fixture: ComponentFixture<unknown>): void {
  inputEl(fixture).dispatchEvent(new FocusEvent('blur'));
}

describe('OgeDateBox', () => {
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

  it('formats the bound value via Intl and shows the calendar rail icon', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.value.set(new Date(2026, 7, 6));
    await settle(fixture);
    expect(inputEl(fixture).value).toBe('8/6/26'); // en-US dateStyle: short
    expect(
      fixture.nativeElement.querySelector('.oge-input-dropdown'),
    ).toBeTruthy();
  });

  it('commits parsed text on Enter and clears on empty commit', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    type(fixture, '8/6/2026');
    inputEl(fixture).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    await settle(fixture);
    expect(fixture.componentInstance.value()).toEqual(new Date(2026, 7, 6));
    type(fixture, '');
    blur(fixture);
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBeNull();
  });

  it('marks unparseable text invalid while typing and reverts on blur', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.value.set(new Date(2026, 7, 6));
    await settle(fixture);
    type(fixture, 'garbage');
    await settle(fixture);
    expect(
      fixture.nativeElement.querySelector('.oge-input-invalid'),
    ).toBeTruthy();
    blur(fixture);
    await settle(fixture);
    expect(fixture.componentInstance.value()).toEqual(new Date(2026, 7, 6));
    expect(inputEl(fixture).value).toBe('8/6/26'); // reverted, not cleared
    expect(
      fixture.nativeElement.querySelector('.oge-input-invalid'),
    ).toBeNull();
  });

  it('out-of-range text is invalid and never clamped', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.min.set(new Date(2026, 7, 10));
    fixture.componentInstance.value.set(new Date(2026, 7, 15));
    await settle(fixture);
    type(fixture, '8/5/2026'); // before min
    await settle(fixture);
    expect(
      fixture.nativeElement.querySelector('.oge-input-invalid'),
    ).toBeTruthy();
    blur(fixture);
    await settle(fixture);
    expect(fixture.componentInstance.value()).toEqual(new Date(2026, 7, 15));
  });

  it('opens the picker and hands DOM focus to the calendar grid; a pick commits and closes', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.value.set(new Date(2026, 7, 15));
    await settle(fixture);
    fixture.nativeElement.querySelector('.oge-input-dropdown').click();
    await settle(fixture);
    const dialog = fixture.nativeElement.querySelector('.oge-date-box-panel');
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('role')).toBe('dialog');
    const focusTarget = dialog.querySelector('[data-focus-target]');
    expect(document.activeElement).toBe(focusTarget); // APG focus hand-off
    const day20 = Array.from(
      dialog.querySelectorAll<HTMLButtonElement>('.oge-calendar-cell'),
    ).find(
      (cell) =>
        cell.textContent?.trim() === '20' &&
        !cell.classList.contains('oge-calendar-cell-other'),
    );
    day20?.click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toEqual(new Date(2026, 7, 20));
    expect(
      fixture.nativeElement.querySelector('.oge-date-box-panel'),
    ).toBeNull();
    expect(document.activeElement).toBe(inputEl(fixture)); // focus restored
  });

  it('type=time shows the interval list and picking merges into the day', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.type.set('time');
    fixture.componentInstance.value.set(new Date(2026, 7, 6, 9, 0));
    await settle(fixture);
    expect(inputEl(fixture).value).toMatch(/9:00/);
    fixture.nativeElement.querySelector('.oge-input-dropdown').click();
    await settle(fixture);
    const slots = Array.from(
      fixture.nativeElement.querySelectorAll<HTMLButtonElement>(
        '.oge-date-box-time',
      ),
    );
    expect(slots).toHaveLength(24); // 60-minute interval
    const twoPm = slots.find((slot) => slot.textContent?.trim() === '2:00 PM');
    twoPm?.click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toEqual(
      new Date(2026, 7, 6, 14, 0),
    );
  });

  it('datetime keeps the popup open after a date pick and closes on time pick', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.type.set('datetime');
    fixture.componentInstance.value.set(new Date(2026, 7, 15, 9, 30));
    await settle(fixture);
    fixture.nativeElement.querySelector('.oge-input-dropdown').click();
    await settle(fixture);
    const day20 = Array.from(
      fixture.nativeElement.querySelectorAll<HTMLButtonElement>(
        '.oge-calendar-cell',
      ),
    ).find(
      (cell) =>
        cell.textContent?.trim() === '20' &&
        !cell.classList.contains('oge-calendar-cell-other'),
    );
    day20?.click();
    await settle(fixture);
    // date committed with the time-of-day preserved; popup still open
    expect(fixture.componentInstance.value()).toEqual(
      new Date(2026, 7, 20, 9, 30),
    );
    expect(
      fixture.nativeElement.querySelector('.oge-date-box-panel'),
    ).toBeTruthy();
    const slot = Array.from(
      fixture.nativeElement.querySelectorAll<HTMLButtonElement>(
        '.oge-date-box-time',
      ),
    ).find((s) => s.textContent?.trim() === '2:00 PM');
    slot?.click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toEqual(
      new Date(2026, 7, 20, 14, 0),
    );
    expect(
      fixture.nativeElement.querySelector('.oge-date-box-panel'),
    ).toBeNull();
  });

  it('useButtons collects picks in a draft and commits on OK only', async () => {
    @Component({
      imports: [OgeDateBox],
      template: `
        <oge-date-box
          locale="en-US"
          applyValueMode="useButtons"
          [(value)]="value"
        />
      `,
    })
    class ButtonsHost {
      readonly value = signal<Date | null>(new Date(2026, 7, 15));
    }
    const fixture = TestBed.createComponent(ButtonsHost);
    await settle(fixture);
    fixture.nativeElement.querySelector('.oge-input-dropdown').click();
    await settle(fixture);
    const day20 = Array.from(
      fixture.nativeElement.querySelectorAll<HTMLButtonElement>(
        '.oge-calendar-cell',
      ),
    ).find(
      (cell) =>
        cell.textContent?.trim() === '20' &&
        !cell.classList.contains('oge-calendar-cell-other'),
    );
    day20?.click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toEqual(new Date(2026, 7, 15)); // not yet
    fixture.nativeElement.querySelector('.oge-date-box-ok').click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toEqual(new Date(2026, 7, 20));
    expect(
      fixture.nativeElement.querySelector('.oge-date-box-panel'),
    ).toBeNull();
  });
});

describe('OgeDateBox timeView columns', () => {
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

  it('renders hour + minute columns and commits picks live without closing', async () => {
    @Component({
      imports: [OgeDateBox],
      template: `
        <oge-date-box
          locale="en-US"
          type="time"
          timeView="columns"
          [interval]="15"
          [(value)]="value"
        />
      `,
    })
    class ColumnsHost {
      readonly value = signal<Date | null>(new Date(2026, 7, 6, 9, 0));
    }
    const fixture = TestBed.createComponent(ColumnsHost);
    await settle(fixture);
    fixture.nativeElement.querySelector('.oge-input-dropdown').click();
    await settle(fixture);
    const cols = fixture.nativeElement.querySelectorAll('.oge-date-box-col');
    expect(cols.length).toBe(2);
    expect(cols[0].querySelectorAll('.oge-date-box-time').length).toBe(24);
    expect(cols[1].querySelectorAll('.oge-date-box-time').length).toBe(4); // 15-min steps

    const twoPm = Array.from(
      cols[0].querySelectorAll<HTMLButtonElement>('.oge-date-box-time'),
    ).find((slot) => slot.textContent?.trim() === '2 PM');
    twoPm?.click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toEqual(
      new Date(2026, 7, 6, 14, 0),
    );
    // stays open for the minute pick
    expect(
      fixture.nativeElement.querySelector('.oge-date-box-panel'),
    ).toBeTruthy();
    const m45 = Array.from(
      cols[1].querySelectorAll<HTMLButtonElement>('.oge-date-box-time'),
    ).find((slot) => slot.textContent?.trim() === ':45');
    m45?.click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toEqual(
      new Date(2026, 7, 6, 14, 45),
    );
  });
});
