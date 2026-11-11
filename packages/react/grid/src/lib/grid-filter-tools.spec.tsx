import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { createRef, useState } from 'react';
import { ArrayDataSource } from '@oge-ui/core';
import { OgeGrid } from './grid';
import type { OgeGridColumnProps, OgeGridHandle } from './grid-types';

interface Order {
  id: number;
  customer: string;
  status: string;
  qty: number;
  placed: Date;
}

const today = new Date();
const daysAgo = (n: number) =>
  new Date(today.getFullYear(), today.getMonth(), today.getDate() - n, 10);

const ORDERS: Order[] = Array.from({ length: 24 }, (_, i) => ({
  id: i + 1,
  customer: `Customer ${i + 1}`,
  status: ['open', 'shipped', 'closed'][i % 3],
  qty: i * 5,
  placed: daysAgo(i * 3),
}));

const columns: OgeGridColumnProps<Order>[] = [
  { field: 'customer' },
  {
    field: 'status',
    renderFilterCell: ({ value, setValue }) => (
      <select
        className="status-filter"
        value={(value as string) ?? ''}
        onChange={(event) => setValue(event.target.value)}
      >
        <option value="">Any</option>
        <option value="open">Open</option>
        <option value="closed">Closed</option>
      </select>
    ),
  },
  {
    field: 'qty',
    dataType: 'number',
    headerFilter: false,
    filterRange: { min: 0, max: 115, step: 5 },
  },
  { field: 'placed', dataType: 'date', headerFilter: true },
];

const rows = () => document.querySelectorAll('.oge-rows .oge-row');

function setup(initialMode: 'auto' | 'manual' = 'auto') {
  const ref = createRef<OgeGridHandle<Order>>();
  const store = new Map<string, string>();
  let setMode: (mode: 'auto' | 'manual') => void = () => undefined;
  function Host() {
    const [mode, set] = useState(initialMode);
    setMode = set;
    return (
      <OgeGrid
        ref={ref}
        data={new ArrayDataSource(ORDERS, { key: 'id' })}
        keyField="id"
        columns={columns}
        stateKey="orders"
        stateStorage={{
          get: (key) => store.get(key) ?? null,
          set: (key, value) => {
            store.set(key, value);
          },
        }}
        filterRow
        filterDebounce={0}
        headerFilter={{ auto: true }}
        dateFilterPresets={['today', 'last30Days']}
        savedViews
        filterApplyMode={mode}
      />
    );
  }
  render(<Host />);
  return {
    ref,
    store,
    setMode: (m: 'auto' | 'manual') => act(() => setMode(m)),
  };
}

const choose = (value: string) =>
  fireEvent.change(document.querySelector('.status-filter')!, {
    target: { value },
  });

describe('<OgeGrid> filter tools', () => {
  it('shows funnels on repetitive columns and where a column asks', async () => {
    setup();
    await waitFor(() => expect(rows().length).toBe(24));
    const funnels = Array.from(document.querySelectorAll('.oge-header-cell'))
      .filter((cell) => cell.querySelector('.oge-header-filter-btn'))
      .map((cell) => cell.getAttribute('data-colid'));
    expect(funnels).toEqual(['status', 'placed']);
  });

  it('filters through a custom cell and offers a range slider', async () => {
    setup();
    await waitFor(() => expect(rows().length).toBe(24));
    choose('open');
    await waitFor(() => expect(rows().length).toBe(8));
    const slider = document.querySelector('.oge-filter-range');
    expect(slider?.querySelectorAll('[role="slider"]')).toHaveLength(2);
  });

  it('applies a date preset from the header menu', async () => {
    setup();
    await waitFor(() => expect(rows().length).toBe(24));
    fireEvent.click(
      document.querySelector(
        '.oge-header-cell[data-colid="placed"] .oge-header-filter-btn',
      )!,
    );
    await waitFor(() =>
      expect(document.querySelectorAll('.oge-hf-preset')).toHaveLength(2),
    );
    const presets = Array.from(document.querySelectorAll('.oge-hf-preset'));
    expect(presets.map((b) => b.textContent)).toEqual([
      'Today',
      'Last 30 days',
    ]);
    fireEvent.click(presets[1]);
    await waitFor(() => expect(rows().length).toBe(10));
  });

  it('holds edits in manual mode until applied', async () => {
    setup('manual');
    await waitFor(() => expect(rows().length).toBe(24));
    choose('closed');
    await waitFor(() =>
      expect(
        document.querySelector('.oge-filter-apply-note')?.textContent,
      ).toBe('Filter changes are not applied yet'),
    );
    expect(rows().length).toBe(24);
    fireEvent.click(document.querySelector('.oge-filter-apply-btn')!);
    await waitFor(() => expect(rows().length).toBe(8));
  });

  it('saves, opens and deletes named views', async () => {
    const { ref, store } = setup();
    await waitFor(() => expect(rows().length).toBe(24));
    choose('open');
    await waitFor(() => expect(rows().length).toBe(8));
    act(() => ref.current?.saveCurrentView('Open orders'));
    expect(JSON.parse(store.get('oge-grid-views:orders')!)[0].name).toBe(
      'Open orders',
    );
    act(() => ref.current?.clearFilters());
    await waitFor(() => expect(rows().length).toBe(24));
    fireEvent.click(document.querySelector('.oge-views-button')!);
    await waitFor(() =>
      expect(document.querySelector('.oge-views-open')?.textContent).toBe(
        'Open orders',
      ),
    );
    fireEvent.click(document.querySelector('.oge-views-open')!);
    await waitFor(() => expect(rows().length).toBe(8));
    act(() => ref.current?.deleteView('open orders'));
    expect(ref.current?.savedViewList()).toEqual([]);
  });
});
