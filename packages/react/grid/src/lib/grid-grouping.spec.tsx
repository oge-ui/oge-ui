import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { createRef } from 'react';
import { CustomDataSource } from '@oge-ui/core';
import { OgeGrid } from './grid';
import type { OgeGridHandle } from './grid-types';

interface Person {
  id: number;
  name: string;
  city: string;
  age: number;
}

const people: Person[] = [
  { id: 1, name: 'Ada', city: 'London', age: 36 },
  { id: 2, name: 'Grace', city: 'New York', age: 85 },
  { id: 3, name: 'Linus', city: 'London', age: 54 },
  { id: 4, name: 'Margaret', city: 'Boston', age: 87 },
];

const columns = [
  { field: 'name', caption: 'Name' },
  { field: 'city', caption: 'City' },
  { field: 'age', caption: 'Age', dataType: 'number' as const },
];

const groupRows = () => document.querySelectorAll('.oge-group-row');
const dataRows = () => document.querySelectorAll('.oge-rows .oge-row');

describe('OgeGrid grouping, master-detail and row render props', () => {
  it('groups by a field, renders group headers and toggles them', async () => {
    const ref = createRef<OgeGridHandle<Person>>();
    render(
      <OgeGrid
        ref={ref}
        data={people}
        keyField="id"
        columns={columns}
        groupBy={['city']}
      />,
    );
    await waitFor(() => expect(groupRows()).toHaveLength(3));
    expect(screen.getByRole('treegrid')).toBeInTheDocument();
    expect(groupRows()[0]).toHaveTextContent('City: Boston (1)');
    expect(dataRows()).toHaveLength(4);
    fireEvent.click(groupRows()[0]);
    await waitFor(() => expect(dataRows()).toHaveLength(3));
    expect(groupRows()[0]).toHaveAttribute('aria-expanded', 'false');
    expect(ref.current?.isRowExpanded('g:Boston')).toBe(false);
    act(() => ref.current?.expandRow('g:Boston'));
    await waitFor(() => expect(dataRows()).toHaveLength(4));
    act(() => ref.current?.collapseAllGroups());
    await waitFor(() => expect(dataRows()).toHaveLength(0));
    act(() => ref.current?.expandAllGroups());
    await waitFor(() => expect(dataRows()).toHaveLength(4));
  });

  it('group panel: drop a header to group, chip to ungroup, column groupIndex seeds it', async () => {
    render(
      <OgeGrid
        data={people}
        keyField="id"
        columns={[{ field: 'name' }, { field: 'city', groupIndex: 0 }]}
        groupPanel
      />,
    );
    await waitFor(() => expect(groupRows()).toHaveLength(3));
    const chip = screen.getByRole('button', { name: 'Ungroup City' });
    fireEvent.click(chip);
    await waitFor(() => expect(groupRows()).toHaveLength(0));
    expect(
      screen.getByText('Drag a column header here to group'),
    ).toBeInTheDocument();
    const header = screen.getByRole('columnheader', { name: 'City' });
    expect(header).toHaveAttribute('draggable', 'true');
    const store = new Map<string, string>();
    const dataTransfer = {
      types: ['application/x-oge-column'],
      setData: (type: string, value: string) => store.set(type, value),
      getData: (type: string) => store.get(type) ?? '',
      effectAllowed: 'move',
    };
    fireEvent.dragStart(header, { dataTransfer });
    const panel = document.querySelector('.oge-group-panel') as HTMLElement;
    fireEvent.dragOver(panel, { dataTransfer });
    fireEvent.drop(panel, { dataTransfer });
    await waitFor(() => expect(groupRows()).toHaveLength(3));
  });

  it('renders group summaries, footer summaries and the total row', async () => {
    render(
      <OgeGrid
        data={people}
        keyField="id"
        columns={[
          { field: 'name', caption: 'Name' },
          { field: 'city', caption: 'City', groupSummary: 'count' },
          {
            field: 'age',
            caption: 'Age',
            dataType: 'number',
            groupSummary: ['min', 'max'],
            groupSummaryPosition: 'footer',
            totalSummary: 'sum',
          },
        ]}
        groupBy={['city']}
      />,
    );
    await waitFor(() => expect(groupRows()).toHaveLength(3));
    const london = [...groupRows()].find((row) =>
      row.textContent?.includes('London'),
    ) as HTMLElement;
    expect(london).toHaveTextContent('Count of City: 2');
    const footers = document.querySelectorAll('.oge-group-footer-row');
    expect(footers).toHaveLength(3);
    const londonFooter = [...footers].find((row) =>
      row.textContent?.includes('36'),
    );
    expect(londonFooter).toHaveTextContent('Min: 36 · Max: 54');
    expect(document.querySelector('.oge-total-row')).toHaveTextContent(
      'Sum: 262',
    );
  });

  it('deferred groups: collapsed by default, children fetched on expand', async () => {
    const calls: unknown[] = [];
    const source = new CustomDataSource<Person>({
      key: 'id',
      load: async (options) => {
        calls.push(options);
        if (options.group?.length) {
          return {
            data: [
              { key: 'London', items: null, count: 2 },
              { key: 'Boston', items: null, count: 1 },
            ],
            totalCount: 3,
          };
        }
        const value =
          options.filter?.type === 'binary' ? options.filter.value : undefined;
        return { data: people.filter((row) => row.city === value) };
      },
    });
    render(
      <OgeGrid
        data={source}
        columns={columns}
        groupBy={['city']}
        grouping={{ autoExpandAll: false }}
      />,
    );
    await waitFor(() => expect(groupRows()).toHaveLength(2));
    expect(dataRows()).toHaveLength(0);
    expect(calls).toHaveLength(1);
    fireEvent.click(groupRows()[0]);
    await waitFor(() => expect(dataRows()).toHaveLength(2));
    expect(calls).toHaveLength(2);
    expect(calls[1]).toMatchObject({
      filter: { type: 'binary', field: 'city', op: 'eq', value: 'London' },
    });
    // collapsing and re-expanding serves the cache
    fireEvent.click(groupRows()[0]);
    await waitFor(() => expect(dataRows()).toHaveLength(0));
    fireEvent.click(groupRows()[0]);
    await waitFor(() => expect(dataRows()).toHaveLength(2));
    expect(calls).toHaveLength(2);
  });

  it('master-detail: the expander renders renderDetail under the row', async () => {
    const ref = createRef<OgeGridHandle<Person>>();
    render(
      <OgeGrid
        ref={ref}
        data={people}
        keyField="id"
        columns={columns}
        renderDetail={({ row }) => (
          <p data-testid="detail">Detail of {row.name}</p>
        )}
      />,
    );
    await waitFor(() => expect(dataRows()).toHaveLength(4));
    expect(screen.getByRole('treegrid')).toBeInTheDocument();
    const toggles = screen.getAllByRole('button', { name: 'Toggle detail' });
    expect(toggles).toHaveLength(4);
    fireEvent.click(toggles[1]);
    await waitFor(() =>
      expect(screen.getByTestId('detail')).toHaveTextContent('Detail of Grace'),
    );
    expect(toggles[1]).toHaveAttribute('aria-expanded', 'true');
    expect(ref.current?.isRowExpanded(2)).toBe(true);
    act(() => ref.current?.collapseRow(2));
    await waitFor(() => expect(screen.queryByTestId('detail')).toBeNull());
  });

  it('renderRow replaces data rows while selection still works', async () => {
    const onSelectedKeysChange = vi.fn();
    render(
      <OgeGrid
        data={people}
        keyField="id"
        columns={columns}
        selectionMode="single"
        onSelectedKeysChange={onSelectedKeysChange}
        renderRow={({ row }) => <em>{row.name.toUpperCase()}</em>}
      />,
    );
    await waitFor(() => expect(dataRows()).toHaveLength(4));
    expect(dataRows()[0]).toHaveClass('oge-custom-row');
    expect(dataRows()[0]).toHaveTextContent('ADA');
    fireEvent.click(dataRows()[2]);
    await waitFor(() => expect(onSelectedKeysChange).toHaveBeenCalledWith([3]));
  });

  it('row dragging reorders the array in place and reports the move', async () => {
    const rows = [...people];
    const onRowReordered = vi.fn();
    render(
      <OgeGrid
        data={rows}
        keyField="id"
        columns={columns}
        rowDragging
        onRowReordered={onRowReordered}
      />,
    );
    await waitFor(() => expect(dataRows()).toHaveLength(4));
    const handles = document.querySelectorAll('.oge-drag-handle');
    const dataTransfer = { setData: vi.fn(), effectAllowed: 'move' };
    fireEvent.dragStart(handles[0], { dataTransfer });
    fireEvent.dragOver(dataRows()[2], { dataTransfer });
    fireEvent.drop(dataRows()[2], { dataTransfer });
    expect(onRowReordered).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 1,
        targetKey: 3,
        fromIndex: 0,
        toIndex: 2,
      }),
    );
    expect(rows.map((row) => row.id)).toEqual([2, 3, 1, 4]);
    await waitFor(() =>
      expect(
        [...dataRows()].map(
          (row) =>
            within(row as HTMLElement).getAllByRole('gridcell')[1].textContent,
        ),
      ).toEqual(['Grace', 'Linus', 'Ada', 'Margaret']),
    );
  });
});
