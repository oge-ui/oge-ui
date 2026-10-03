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
      [views]="['week', 'workWeek', 'month']"
      [firstDayOfWeek]="1"
      [dayStartHour]="8"
      [dayEndHour]="18"
      [showCurrentTimeIndicator]="false"
      [weekendDays]="weekendDays()"
      [locale]="locale()"
    />
  `,
})
class Host {
  readonly date = new Date(2026, 7, 6);
  readonly view = signal<OgeSchedulerView>('week');
  readonly weekendDays = signal<readonly number[] | undefined>(undefined);
  readonly locale = signal('en-US');
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

describe('OgeScheduler weekendDays', () => {
  let fixture: ComponentFixture<Host>;
  let host: HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    host = fixture.nativeElement as HTMLElement;
    await settle(fixture);
  });

  afterEach(() => vi.restoreAllMocks());

  const weekendCells = (): number =>
    host.querySelectorAll('.oge-scheduler-rows .oge-scheduler-cell-weekend')
      .length;

  it('shades an explicit weekend instead of Saturday + Sunday', async () => {
    // 20 rows (08–18, 30 min) × 2 weekend columns by default
    expect(weekendCells()).toBe(40);
    fixture.componentInstance.weekendDays.set([5]);
    await settle(fixture);
    expect(weekendCells()).toBe(20);
  });

  it('drops the configured weekend from the workWeek view', async () => {
    fixture.componentInstance.weekendDays.set([5]);
    fixture.componentInstance.view.set('workWeek');
    await settle(fixture);
    // six working days of 20 slots each, none shaded as weekend
    expect(
      host.querySelectorAll('.oge-scheduler-rows .oge-scheduler-cell').length,
    ).toBe(120);
    expect(weekendCells()).toBe(0);
  });

  it('shades the month view from the same list', async () => {
    fixture.componentInstance.weekendDays.set([5]);
    fixture.componentInstance.view.set('month');
    await settle(fixture);
    expect(
      host.querySelectorAll(
        '.oge-scheduler-month-cell.oge-scheduler-cell-weekend',
      ).length,
    ).toBe(6);
  });

  it('resolves the weekend from the locale when the input is unset', async () => {
    const FakeLocale = function (tag: string) {
      return {
        tag,
        getWeekInfo: () => ({ weekend: tag === 'he-IL' ? [5, 6] : [6, 7] }),
      };
    };
    vi.spyOn(Intl, 'Locale').mockImplementation(
      FakeLocale as unknown as typeof Intl.Locale,
    );
    fixture.componentInstance.locale.set('he-IL');
    fixture.componentInstance.view.set('workWeek');
    await settle(fixture);
    // Friday + Saturday dropped: Mon–Thu + Sun remain
    expect(
      host.querySelectorAll('.oge-scheduler-rows .oge-scheduler-cell').length,
    ).toBe(100);
  });
});
