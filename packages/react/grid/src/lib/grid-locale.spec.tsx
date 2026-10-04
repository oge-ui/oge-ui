import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import type { OgeValueFormat } from '@oge-ui/core';
import { OgeGrid } from './grid';
import { OgeGridConfigProvider } from './grid-config';
import { OgePager } from './pager';

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

const columns = [
  { field: 'id', caption: 'Id', dataType: 'number' as const },
  { field: 'placed', caption: 'Placed', dataType: 'date' as const },
  {
    field: 'amount',
    caption: 'Amount',
    dataType: 'number' as const,
    format: EUR,
    totalSummary: 'sum' as const,
  },
  {
    field: 'share',
    caption: 'Share',
    dataType: 'number' as const,
    format: { type: 'percent' } as OgeValueFormat,
  },
];

const rows = () =>
  screen.getAllByRole('row').filter((row) => row.classList.contains('oge-row'));
const rowTexts = (index: number) =>
  within(rows()[index])
    .getAllByRole('gridcell')
    .map((cell) => cell.textContent);

const intl = (
  locale: string,
  options: Intl.NumberFormatOptions,
  value: number,
): string => new Intl.NumberFormat(locale, options).format(value);

describe('OgeGrid locale', () => {
  it('formats dates and declarative formats in the locale prop, live', async () => {
    const { rerender } = render(
      <OgeGrid data={ORDERS} keyField="id" columns={columns} locale="en-US" />,
    );
    await waitFor(() => expect(rows().length).toBe(2));
    expect(rowTexts(0)).toEqual(['1', '1/5/2024', '€1,234.50', '25%']);

    rerender(
      <OgeGrid data={ORDERS} keyField="id" columns={columns} locale="de-DE" />,
    );
    await waitFor(() => expect(rowTexts(0)[1]).toBe('5.1.2024'));
    expect(rowTexts(0)[2]).toBe(
      intl('de-DE', { style: 'currency', currency: 'EUR' }, 1234.5),
    );
    expect(rowTexts(0)[3]).toBe(intl('de-DE', { style: 'percent' }, 0.25));

    rerender(
      <OgeGrid data={ORDERS} keyField="id" columns={columns} locale="ar-EG" />,
    );
    await waitFor(() =>
      expect(rowTexts(0)[2]).toBe(
        intl('ar-EG', { style: 'currency', currency: 'EUR' }, 1234.5),
      ),
    );
  });

  it('formats the total summary in the locale', async () => {
    const { container } = render(
      <OgeGrid data={ORDERS} keyField="id" columns={columns} locale="tr-TR" />,
    );
    await waitFor(() => expect(rows().length).toBe(2));
    const total = Array.from(container.querySelectorAll('.oge-total-cell'))
      .map((cell) => cell.textContent ?? '')
      .find((text) => text.trim().length > 0);
    expect(total).toContain(
      intl('tr-TR', { style: 'currency', currency: 'EUR' }, 1333.5),
    );
  });

  it('parses the filter row in the locale', async () => {
    render(
      <OgeGrid
        data={ORDERS}
        keyField="id"
        columns={columns}
        locale="de-DE"
        filterRow
        filterDebounce={0}
      />,
    );
    await waitFor(() => expect(rows().length).toBe(2));
    fireEvent.change(screen.getByLabelText('Filter Amount'), {
      target: { value: '1234,5' },
    });
    await waitFor(() => expect(rows().length).toBe(1));
    expect(rowTexts(0)[0]).toBe('1');
  });

  it('falls back to the provider locale', async () => {
    render(
      <OgeGridConfigProvider config={{ locale: 'tr-TR' }}>
        <OgeGrid data={ORDERS} keyField="id" columns={columns} />
      </OgeGridConfigProvider>,
    );
    await waitFor(() => expect(rows().length).toBe(2));
    expect(rowTexts(0)[3]).toBe(intl('tr-TR', { style: 'percent' }, 0.25));
  });

  it('falls back to navigator.language without prop or provider', async () => {
    const spy = vi.spyOn(navigator, 'language', 'get').mockReturnValue('de-DE');
    render(<OgeGrid data={ORDERS} keyField="id" columns={columns} />);
    await waitFor(() => expect(rows().length).toBe(2));
    expect(rowTexts(0)[1]).toBe('5.1.2024');
    spy.mockRestore();
  });
});

describe('OgePager plural info', () => {
  it('uses the plural-aware pagerInfo message', () => {
    const { rerender } = render(
      <OgePager pageIndex={0} pageCount={1} totalCount={1} locale="en" />,
    );
    expect(screen.getByText('1 row')).toBeInTheDocument();
    rerender(
      <OgePager pageIndex={0} pageCount={1} totalCount={1500} locale="de-DE" />,
    );
    expect(screen.getByText('1.500 rows')).toBeInTheDocument();
  });
});
