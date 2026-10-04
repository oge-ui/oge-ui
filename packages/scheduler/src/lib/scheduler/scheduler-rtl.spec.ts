import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeScheduler } from './scheduler';

interface Appt {
  id: number;
  text: string;
  startDate: Date;
  endDate: Date;
}

const DATA: Appt[] = [
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

@Component({
  imports: [OgeScheduler],
  template: `
    <oge-scheduler
      [dataSource]="data"
      [currentDate]="date"
      currentView="week"
      [firstDayOfWeek]="1"
      [dayStartHour]="8"
      [dayEndHour]="18"
      [showCurrentTimeIndicator]="false"
      [rtlEnabled]="rtl()"
      locale="en-US"
    />
  `,
})
class ExplicitHost {
  readonly data = DATA;
  readonly date = new Date(2026, 7, 6);
  readonly rtl = signal<boolean | undefined>(true);
}

@Component({
  imports: [OgeScheduler],
  template: `
    <div [attr.dir]="dir()">
      <oge-scheduler
        [dataSource]="data"
        [currentDate]="date"
        currentView="week"
        [firstDayOfWeek]="1"
        [dayStartHour]="8"
        [dayEndHour]="18"
        [showCurrentTimeIndicator]="false"
        locale="en-US"
      />
    </div>
  `,
})
class AutoHost {
  readonly data = DATA;
  readonly date = new Date(2026, 7, 6);
  readonly dir = signal<'rtl' | 'ltr'>('rtl');
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

function key(element: HTMLElement, keyName: string, ctrlKey = false): void {
  element.dispatchEvent(
    new KeyboardEvent('keydown', { key: keyName, ctrlKey, bubbles: true }),
  );
}

function focusTarget(host: HTMLElement): HTMLElement {
  const target = host.querySelector<HTMLElement>('[data-focus-target]');
  if (target === null) throw new Error('no roving focus target');
  return target;
}

/** Home, then one arrow: the weekday name the roving cell lands on. */
async function dayAfter(
  fixture: ComponentFixture<unknown>,
  host: HTMLElement,
  arrow: string,
): Promise<string> {
  key(focusTarget(host), 'Home');
  await settle(fixture);
  key(focusTarget(host), arrow);
  await settle(fixture);
  return focusTarget(host).getAttribute('aria-label') ?? '';
}

describe('<oge-scheduler> RTL', () => {
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

  it('rtlEnabled sets dir on the host and mirrors Left/Right', async () => {
    const fixture = TestBed.createComponent(ExplicitHost);
    await settle(fixture);
    const host = fixture.nativeElement as HTMLElement;
    const scheduler = host.querySelector('oge-scheduler');
    expect(scheduler?.getAttribute('dir')).toBe('rtl');
    expect(await dayAfter(fixture, host, 'ArrowLeft')).toContain('Tuesday');
    expect(await dayAfter(fixture, host, 'ArrowRight')).toContain('Monday');

    fixture.componentInstance.rtl.set(false);
    await settle(fixture);
    expect(scheduler?.getAttribute('dir')).toBe('ltr');
    expect(await dayAfter(fixture, host, 'ArrowRight')).toContain('Tuesday');

    fixture.componentInstance.rtl.set(undefined);
    await settle(fixture);
    expect(scheduler?.hasAttribute('dir')).toBe(false);
  });

  it('follows a dir="rtl" ancestor and its changes when unset', async () => {
    const fixture = TestBed.createComponent(AutoHost);
    await settle(fixture);
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('oge-scheduler')?.hasAttribute('dir')).toBe(
      false,
    );
    expect(await dayAfter(fixture, host, 'ArrowLeft')).toContain('Tuesday');

    fixture.componentInstance.dir.set('ltr');
    await settle(fixture);
    expect(await dayAfter(fixture, host, 'ArrowLeft')).toContain('Monday');
    expect(await dayAfter(fixture, host, 'ArrowRight')).toContain('Tuesday');
  });

  it('Ctrl+Left moves a chip one day later in RTL', async () => {
    const fixture = TestBed.createComponent(ExplicitHost);
    await settle(fixture);
    const host = fixture.nativeElement as HTMLElement;
    const scheduler = fixture.debugElement.children[0]
      .componentInstance as OgeScheduler<Appt>;
    const updates: Date[] = [];
    scheduler.appointmentUpdated.subscribe((event) =>
      updates.push(event.appointmentData.startDate),
    );
    const chip = host.querySelector<HTMLElement>(
      '.oge-scheduler-chip-box[role="button"]',
    );
    if (chip === null) throw new Error('no chip');
    key(chip, 'ArrowLeft', true);
    await settle(fixture);
    expect(updates[0]).toEqual(new Date(2026, 7, 5, 9));
  });
});
