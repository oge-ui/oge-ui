import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ArrayDataSource } from '@oge-ui/core';
import { OgeScheduler } from './scheduler';

interface Meeting {
  key: number;
  subject: string;
  begin: string;
  finish: string;
  shade?: string;
}

@Component({
  imports: [OgeScheduler],
  template: `
    <oge-scheduler
      [dataSource]="data()"
      keyExpr="key"
      textExpr="subject"
      startDateExpr="begin"
      endDateExpr="finish"
      colorExpr="shade"
      [currentDate]="date"
      currentView="week"
      [firstDayOfWeek]="1"
      [showCurrentTimeIndicator]="false"
    />
  `,
})
class ExprHost {
  readonly data = signal<Meeting[]>([
    {
      key: 1,
      subject: 'Review',
      begin: '2026-08-06T09:00',
      finish: '2026-08-06T10:00',
      shade: '#16a34a',
    },
  ]);
  readonly date = new Date(2026, 7, 6);
}

@Component({
  imports: [OgeScheduler],
  template: `
    <oge-scheduler
      [dataSource]="source"
      [currentDate]="date"
      currentView="week"
      [firstDayOfWeek]="1"
      [showCurrentTimeIndicator]="false"
    />
  `,
})
class DataSourceHost {
  readonly items: Record<string, unknown>[] = [
    {
      id: 1,
      text: 'Loaded',
      startDate: new Date(2026, 7, 6, 11),
      endDate: new Date(2026, 7, 6, 12),
    },
    {
      id: 2,
      text: 'Elsewhere',
      startDate: new Date(2026, 9, 1, 11),
      endDate: new Date(2026, 9, 1, 12),
    },
  ];
  readonly source = new ArrayDataSource(this.items);
  readonly date = new Date(2026, 7, 6);
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

describe('<oge-scheduler> data binding', () => {
  it('maps custom exprs onto the appointment model', async () => {
    const fixture = TestBed.createComponent(ExprHost);
    await settle(fixture);
    const host = fixture.nativeElement as HTMLElement;
    const chip = host.querySelector<HTMLElement>('.oge-scheduler-chip');
    expect(chip?.textContent).toContain('Review');
    expect(chip?.style.backgroundColor).not.toBe('');
  });

  it('reacts to array replacement (live update)', async () => {
    const fixture = TestBed.createComponent(ExprHost);
    await settle(fixture);
    fixture.componentInstance.data.set([
      ...fixture.componentInstance.data(),
      {
        key: 2,
        subject: 'Retro',
        begin: '2026-08-07T14:00',
        finish: '2026-08-07T15:00',
      },
    ]);
    await settle(fixture);
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('.oge-scheduler-chip-box').length).toBe(2);
  });

  it('filters appointments to the visible period', async () => {
    const fixture = TestBed.createComponent(DataSourceHost);
    await settle(fixture);
    const host = fixture.nativeElement as HTMLElement;
    const chips = host.querySelectorAll('.oge-scheduler-chip-text');
    expect(chips.length).toBe(1);
    expect(chips[0].textContent).toBe('Loaded'); // October item filtered out
  });

  it('loads from a core DataSource', async () => {
    const fixture = TestBed.createComponent(DataSourceHost);
    await settle(fixture);
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.oge-scheduler-chip-text')?.textContent).toBe(
      'Loaded',
    );
  });
});
