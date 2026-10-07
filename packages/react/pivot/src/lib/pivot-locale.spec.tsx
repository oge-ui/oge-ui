import { render } from '@testing-library/react';
import type { OgePivotFieldDef } from '@oge-ui/pivot-engine';
import { OgePivotGrid } from './pivot-grid';
import { OgePivotConfigProvider } from './pivot-config';

interface Sale {
  region: string;
  amount: number;
}

const SALES: Sale[] = [
  { region: 'EU', amount: 100 },
  { region: 'US', amount: 200 },
];

const FIELDS: OgePivotFieldDef<Sale>[] = [
  { dataField: 'region', area: 'row' },
  {
    dataField: 'amount',
    area: 'data',
    summaryDisplayMode: 'percentOfGrandTotal',
  },
  {
    id: 'money',
    dataField: 'amount',
    area: 'data',
    format: { type: 'currency', currency: 'EUR' },
  },
];

const cells = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('.oge-pivot-cell > span')).map(
    (cell) => cell.textContent?.trim() ?? '',
  );

const percent = (locale: string, value: number) =>
  new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);

describe('OgePivotGrid locale', () => {
  it('renders percent display modes and declarative formats in the locale prop, live', () => {
    const { container, rerender } = render(
      <OgePivotGrid data={SALES} fields={FIELDS} locale="en-US" />,
    );
    expect(cells(container).slice(0, 2)).toEqual(['33.3%', '€100.00']);
    rerender(<OgePivotGrid data={SALES} fields={FIELDS} locale="tr-TR" />);
    expect(cells(container)[0]).toBe(percent('tr-TR', 1 / 3));
    expect(cells(container)[1]).toBe(
      new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'EUR',
      }).format(100),
    );
  });

  it('renders member headers through headerFormat, live with the locale', () => {
    interface Order {
      day: Date;
      amount: number;
    }
    const orders: Order[] = [
      { day: new Date(2026, 0, 5), amount: 10 },
      { day: new Date(2026, 1, 9), amount: 20 },
    ];
    const fields: OgePivotFieldDef<Order>[] = [
      {
        dataField: 'day',
        area: 'row',
        dataType: 'date',
        groupInterval: 'month',
        headerFormat: { type: 'date', pattern: 'MMMM' },
      },
      { dataField: 'amount', area: 'data' },
    ];
    const headers = (container: HTMLElement) =>
      Array.from(container.querySelectorAll('.oge-pivot-row-header'))
        .map((cell) => cell.textContent?.trim() ?? '')
        .slice(0, 2);
    const { container, rerender } = render(
      <OgePivotGrid data={orders} fields={fields} locale="en-US" />,
    );
    expect(headers(container)).toEqual(['January', 'February']);
    rerender(<OgePivotGrid data={orders} fields={fields} locale="tr-TR" />);
    expect(headers(container)).toEqual(['Ocak', 'Şubat']);
  });

  it('falls back to the provider locale', () => {
    const { container } = render(
      <OgePivotConfigProvider config={{ locale: 'de-DE' }}>
        <OgePivotGrid data={SALES} fields={FIELDS} />
      </OgePivotConfigProvider>,
    );
    expect(cells(container)[0]).toBe(percent('de-DE', 1 / 3));
  });

  it('falls back to navigator.language', () => {
    const spy = vi.spyOn(navigator, 'language', 'get').mockReturnValue('ar-EG');
    const { container } = render(<OgePivotGrid data={SALES} fields={FIELDS} />);
    expect(cells(container)[0]).toBe(percent('ar-EG', 1 / 3));
    spy.mockRestore();
  });
});
