import { fireEvent, render, waitFor } from '@testing-library/react';
import { OgeGrid } from './grid';
import type { OgeGridColumnProps } from './grid-types';

interface Order {
  id: number;
  phone: string;
  email: string;
  amount: number;
}

const ORDERS: Order[] = [
  { id: 1, phone: '555-1', email: 'a@x.com', amount: 10 },
  { id: 2, phone: '555-2', email: 'b@x.com', amount: 1234.5 },
];

const COLUMNS: OgeGridColumnProps<Order>[] = [
  { field: 'id', dataType: 'number', width: 100 },
  { field: 'phone', width: 200 },
  {
    field: 'email',
    caption: 'E-mail',
    width: 200,
    hidingPriority: 0,
    renderCell: ({ value }) => (
      <a className="mail" href={`mailto:${String(value)}`}>
        {String(value)}
      </a>
    ),
  },
  {
    field: 'amount',
    dataType: 'number',
    width: 200,
    hidingPriority: 1,
    format: (value) => `$${Number(value).toFixed(2)}`,
  },
];

/** jsdom has no layout: every element reports this client width. */
function stubWidth(width: number): void {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(width);
}

const captions = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('.oge-header-caption')).map((h) =>
    h.textContent?.trim(),
  );

afterEach(() => vi.restoreAllMocks());

const rowsReady = (container: HTMLElement) =>
  waitFor(() =>
    expect(container.querySelectorAll('.oge-row').length).toBe(ORDERS.length),
  );

describe('<OgeGrid> adaptive detail (columnHidingMode)', () => {
  it('shows no toggle while everything fits', () => {
    stubWidth(710);
    const { container } = render(
      <OgeGrid data={ORDERS} keyField="id" columns={COLUMNS} />,
    );
    expect(captions(container)).toEqual(['Id', 'Phone', 'E-mail', 'Amount']);
    expect(container.querySelector('.oge-adaptive-toggle')).toBeNull();
  });

  it('counts the toggle width once a column is hidden', async () => {
    // 570: e-mail goes (532 + the 32px toggle = 564 fits)
    stubWidth(570);
    const { container } = render(
      <OgeGrid data={ORDERS} keyField="id" columns={COLUMNS} />,
    );
    expect(captions(container)).toEqual(['Id', 'Phone', 'Amount']);
    await rowsReady(container);
    expect(
      container.querySelectorAll('.oge-row .oge-adaptive-toggle').length,
    ).toBe(2);
  });

  it('reveals the hidden caption / value pairs with renderCell and format', async () => {
    stubWidth(300);
    const { container } = render(
      <OgeGrid data={ORDERS} keyField="id" columns={COLUMNS} />,
    );
    expect(captions(container)).toEqual(['Id', 'Phone']);
    await rowsReady(container);
    const row = container.querySelectorAll<HTMLElement>('.oge-row')[1];
    const toggle = row.querySelector<HTMLButtonElement>(
      '.oge-adaptive-toggle',
    )!;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.getAttribute('aria-label')).toBe('Show hidden columns');
    fireEvent.click(toggle);

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const detail = row.querySelector<HTMLElement>('.oge-adaptive-detail')!;
    expect(detail.getAttribute('role')).toBe('gridcell');
    expect(toggle.getAttribute('aria-controls')).toBe(detail.id);
    const pairs = Array.from(
      detail.querySelectorAll('.oge-adaptive-detail-item'),
    ).map((item) => [
      item.querySelector('dt')?.textContent,
      item.querySelector('dd')?.textContent,
    ]);
    expect(pairs).toEqual([
      ['E-mail', 'b@x.com'],
      ['Amount', '$1234.50'],
    ]);
    expect(detail.querySelector('a.mail')?.getAttribute('href')).toBe(
      'mailto:b@x.com',
    );
    fireEvent.click(toggle);
    expect(row.querySelector('.oge-adaptive-detail')).toBeNull();
  });

  it("drops hidden data with columnHidingMode 'hide'", () => {
    stubWidth(300);
    const { container } = render(
      <OgeGrid
        data={ORDERS}
        keyField="id"
        columns={COLUMNS}
        columnHidingMode="hide"
      />,
    );
    expect(captions(container)).toEqual(['Id', 'Phone']);
    expect(container.querySelector('.oge-adaptive-toggle')).toBeNull();
  });
});
