import { Component, LOCALE_ID, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { OgeValueFormat } from '@oge-ui/core';
import { OgeColumn } from '../columns/column';
import { provideOgeGridConfig } from '../config';
import { OgeGrid } from './grid';

interface Order {
  id: number;
  placed: Date;
  amount: number;
  share: number;
}

const ORDERS: Order[] = [
  { id: 1, placed: new Date(2024, 0, 5), amount: 1234.5, share: 0.25 },
  { id: 2, placed: new Date(2024, 11, 24), amount: 99, share: 0.5 },
];

const EUR: OgeValueFormat = { type: 'currency', currency: 'EUR' };
const PERCENT: OgeValueFormat = { type: 'percent' };

@Component({
  imports: [OgeGrid, OgeColumn],
  template: `
    <oge-grid
      [data]="rows"
      keyExpr="id"
      [locale]="locale()"
      [filterRow]="true"
      [filterDebounce]="0"
    >
      <oge-column field="id" dataType="number" />
      <oge-column field="placed" dataType="date" />
      <oge-column
        field="amount"
        dataType="number"
        [format]="eur"
        totalSummary="sum"
      />
      <oge-column field="share" dataType="number" [format]="percent" />
    </oge-grid>
  `,
})
class Host {
  readonly rows = ORDERS;
  readonly eur = EUR;
  readonly percent = PERCENT;
  readonly locale = signal<string | undefined>('en-US');
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve));
  await fixture.whenStable();
  fixture.detectChanges();
}

function rowTexts(el: HTMLElement, row: number): string[] {
  return Array.from(
    el.querySelectorAll('.oge-row')[row]?.querySelectorAll('.oge-cell') ?? [],
  ).map((cell) => cell.textContent?.trim() ?? '');
}

function intl(
  locale: string,
  options: Intl.NumberFormatOptions,
  value: number,
) {
  return new Intl.NumberFormat(locale, options).format(value);
}

describe('OgeGrid locale', () => {
  it('formats dates and declarative formats in the locale input, live', async () => {
    TestBed.configureTestingModule({});
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(rowTexts(el, 0)).toEqual(['1', '1/5/2024', '€1,234.50', '25%']);

    fixture.componentInstance.locale.set('de-DE');
    await settle(fixture);
    const de = rowTexts(el, 0);
    expect(de[1]).toBe('5.1.2024');
    expect(de[2]).toBe(
      intl('de-DE', { style: 'currency', currency: 'EUR' }, 1234.5),
    );
    expect(de[3]).toBe(intl('de-DE', { style: 'percent' }, 0.25));

    fixture.componentInstance.locale.set('ar-EG');
    await settle(fixture);
    expect(rowTexts(el, 0)[2]).toBe(
      intl('ar-EG', { style: 'currency', currency: 'EUR' }, 1234.5),
    );
  });

  it('formats the total summary in the locale', async () => {
    TestBed.configureTestingModule({});
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.locale.set('tr-TR');
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const total = Array.from(el.querySelectorAll('.oge-total-cell'))
      .map((cell) => cell.textContent?.trim() ?? '')
      .find((text) => text.length > 0);
    expect(total).toContain(
      intl('tr-TR', { style: 'currency', currency: 'EUR' }, 1333.5),
    );
  });

  it('parses the filter row in the locale', async () => {
    TestBed.configureTestingModule({});
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.locale.set('de-DE');
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const input = el.querySelector(
      '[aria-label="Filter Amount"]',
    ) as HTMLInputElement;
    input.value = '1234,5';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(fixture);
    expect(el.querySelectorAll('.oge-row').length).toBe(1);
    expect(rowTexts(el, 0)[0]).toBe('1');
  });

  it('falls back to the config locale, then LOCALE_ID', async () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: LOCALE_ID, useValue: 'de-DE' },
        provideOgeGridConfig({ locale: 'tr-TR' }),
      ],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.locale.set(undefined);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(rowTexts(el, 0)[3]).toBe(intl('tr-TR', { style: 'percent' }, 0.25));
  });

  it('uses LOCALE_ID when neither input nor config sets one', async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: LOCALE_ID, useValue: 'de-DE' }],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.locale.set(undefined);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(rowTexts(el, 0)[1]).toBe('5.1.2024');
  });

  it('follows a live config locale', async () => {
    const locale = signal('en-US');
    TestBed.configureTestingModule({
      providers: [provideOgeGridConfig(() => ({ locale: locale() }))],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.locale.set(undefined);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(rowTexts(el, 0)[1]).toBe('1/5/2024');
    locale.set('de-DE');
    await settle(fixture);
    expect(rowTexts(el, 0)[1]).toBe('5.1.2024');
  });
});
