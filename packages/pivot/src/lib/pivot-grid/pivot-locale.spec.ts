import { Component, LOCALE_ID, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideOgePivotConfig } from './pivot-config';
import { OgePivotField } from './pivot-field';
import { OgePivotGrid } from './pivot-grid';

interface Sale {
  region: string;
  amount: number;
}

const SALES: Sale[] = [
  { region: 'EU', amount: 100 },
  { region: 'US', amount: 200 },
];

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  imports: [OgePivotGrid, OgePivotField],
  template: `
    <oge-pivot-grid [data]="data" [locale]="locale()">
      <oge-pivot-field dataField="region" area="row" />
      <oge-pivot-field
        dataField="amount"
        area="data"
        summaryDisplayMode="percentOfGrandTotal"
      />
      <oge-pivot-field
        id="money"
        dataField="amount"
        area="data"
        [format]="{ type: 'currency', currency: 'EUR' }"
      />
    </oge-pivot-grid>
  `,
})
class Host {
  readonly data = SALES;
  readonly locale = signal<string | undefined>('en-US');
}

@Component({
  imports: [OgePivotGrid, OgePivotField],
  template: `
    <oge-pivot-grid [data]="orders" [locale]="locale()">
      <oge-pivot-field
        dataField="day"
        area="row"
        dataType="date"
        groupInterval="month"
        [headerFormat]="{ type: 'date', pattern: 'MMMM' }"
      />
      <oge-pivot-field dataField="amount" area="data" />
    </oge-pivot-grid>
  `,
})
class HeaderFormatHost {
  readonly orders = [
    { day: new Date(2026, 0, 5), amount: 10 },
    { day: new Date(2026, 1, 9), amount: 20 },
  ];
  readonly locale = signal('en-US');
}

const rowHeaders = (el: HTMLElement) =>
  Array.from(el.querySelectorAll('.oge-pivot-row-header')).map(
    (cell) => cell.textContent?.trim() ?? '',
  );

const cells = (el: HTMLElement) =>
  Array.from(el.querySelectorAll('.oge-pivot-cell > span')).map(
    (cell) => cell.textContent?.trim() ?? '',
  );

const percent = (locale: string, value: number) =>
  new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);

describe('OgePivotGrid locale', () => {
  it('renders percent display modes and declarative formats in the locale, live', async () => {
    TestBed.configureTestingModule({});
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(cells(el).slice(0, 2)).toEqual(['33.3%', '€100.00']);

    fixture.componentInstance.locale.set('tr-TR');
    await settle(fixture);
    expect(cells(el)[0]).toBe(percent('tr-TR', 1 / 3));
    expect(cells(el)[1]).toBe(
      new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'EUR',
      }).format(100),
    );
  });

  it('renders member headers through headerFormat, live with the locale', async () => {
    TestBed.configureTestingModule({});
    const fixture = TestBed.createComponent(HeaderFormatHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(rowHeaders(el).slice(0, 2)).toEqual(['January', 'February']);
    fixture.componentInstance.locale.set('tr-TR');
    await settle(fixture);
    expect(rowHeaders(el).slice(0, 2)).toEqual(['Ocak', 'Şubat']);
  });

  it('falls back to provideOgePivotConfig, then LOCALE_ID', async () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: LOCALE_ID, useValue: 'en-US' },
        provideOgePivotConfig({ locale: 'de-DE' }),
      ],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.locale.set(undefined);
    await settle(fixture);
    expect(cells(fixture.nativeElement as HTMLElement)[0]).toBe(
      percent('de-DE', 1 / 3),
    );
  });

  it('uses LOCALE_ID without input or config', async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: LOCALE_ID, useValue: 'ar-EG' }],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.locale.set(undefined);
    await settle(fixture);
    expect(cells(fixture.nativeElement as HTMLElement)[0]).toBe(
      percent('ar-EG', 1 / 3),
    );
  });
});
