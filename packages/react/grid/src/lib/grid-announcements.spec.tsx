import { StrictMode, createRef } from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { ArrayDataSource } from '@oge-ui/core';
import { OGE_LIVE_ANNOUNCER_ATTR, getOgeLiveAnnouncer } from '@oge-ui/behavior';
import { OgeGrid } from './grid';
import type { OgeGridHandle } from './grid-types';

interface Row {
  id: number;
  name: string;
  country: string;
}

const seed = (): Row[] => [
  { id: 1, name: 'Ada', country: 'UK' },
  { id: 2, name: 'Grace', country: 'US' },
  { id: 3, name: 'Linus', country: 'FI' },
  { id: 4, name: 'Alan', country: 'UK' },
];

const columns = [
  { field: 'name', caption: 'Name', required: true },
  { field: 'country', caption: 'Country' },
];

const live = (mode: 'polite' | 'assertive' = 'polite'): string =>
  document.querySelector(`[${OGE_LIVE_ANNOUNCER_ATTR}="${mode}"]`)
    ?.textContent ?? '';
const dataRows = () => document.querySelectorAll('.oge-rows .oge-row');
const header = (caption: string) =>
  Array.from(
    document.querySelectorAll<HTMLElement>(
      '.oge-header-cell[role="columnheader"]',
    ),
  ).find((cell) => cell.textContent?.includes(caption)) as HTMLElement;
const wait = (ms: number) =>
  act(() => new Promise<void>((resolve) => setTimeout(resolve, ms)));

afterEach(() => getOgeLiveAnnouncer().clear());

describe('<OgeGrid> live announcements', () => {
  it('announces sort changes with caption and direction (StrictMode)', async () => {
    render(
      <StrictMode>
        <OgeGrid data={seed()} keyField="id" columns={columns} />
      </StrictMode>,
    );
    await waitFor(() => expect(dataRows().length).toBe(4));
    fireEvent.click(header('Name'));
    await waitFor(() => expect(live()).toBe('Sorted by Name, ascending'));
    fireEvent.click(header('Name'));
    await waitFor(() => expect(live()).toBe('Sorted by Name, descending'));
    fireEvent.click(header('Name'));
    await waitFor(() => expect(live()).toBe('Sort cleared'));
  });

  it('announces the result count once a search settled', async () => {
    const { container } = render(
      <OgeGrid
        data={seed()}
        keyField="id"
        columns={columns}
        searchPanel
        filterDebounce={0}
      />,
    );
    await waitFor(() => expect(dataRows().length).toBe(4));
    const search = container.querySelector(
      '.oge-search-input',
    ) as HTMLInputElement;
    fireEvent.change(search, { target: { value: 'Ada' } });
    await wait(100);
    expect(live()).toBe('');
    await waitFor(() => expect(live()).toBe('1 row'));
  });

  it('announces page changes', async () => {
    const ref = createRef<OgeGridHandle<Row>>();
    render(
      <OgeGrid
        ref={ref}
        data={seed()}
        keyField="id"
        columns={columns}
        paging={{ pageSize: 2 }}
      />,
    );
    await waitFor(() => expect(dataRows().length).toBe(2));
    act(() => ref.current?.setPageIndex(1));
    await waitFor(() => expect(live()).toBe('Page 2 of 2'));
  });

  it('announces group expansion with the group value', async () => {
    render(
      <OgeGrid
        data={seed()}
        keyField="id"
        columns={columns}
        groupBy={['country']}
      />,
    );
    await waitFor(() =>
      expect(document.querySelectorAll('.oge-group-row').length).toBe(3),
    );
    const uk = () =>
      Array.from(document.querySelectorAll<HTMLElement>('.oge-group-row')).find(
        (row) => row.textContent?.includes('UK'),
      ) as HTMLElement;
    fireEvent.click(uk());
    await waitFor(() => expect(live()).toBe('Group UK collapsed'));
    fireEvent.click(uk());
    await waitFor(() => expect(live()).toBe('Group UK expanded'));
  });

  it('announces the selected count after select-all', async () => {
    render(
      <OgeGrid
        data={seed()}
        keyField="id"
        columns={columns}
        selectionMode="checkbox"
      />,
    );
    await waitFor(() => expect(dataRows().length).toBe(4));
    fireEvent.click(
      document.querySelector(
        '.oge-header-cell.oge-checkbox-cell input',
      ) as HTMLInputElement,
    );
    await waitFor(() => expect(live()).toBe('4 rows selected'));
  });

  it('stays silent with announcements={false}', async () => {
    render(
      <OgeGrid
        data={seed()}
        keyField="id"
        columns={columns}
        announcements={false}
      />,
    );
    await waitFor(() => expect(dataRows().length).toBe(4));
    fireEvent.click(header('Name'));
    await wait(200);
    expect(live()).toBe('');
  });

  it('reads catalog overrides', async () => {
    render(
      <OgeGrid
        data={seed()}
        keyField="id"
        columns={[{ field: 'name', caption: 'Ad' }]}
        messages={{ sortAscendingAnnouncement: '{column} artan sıralandı' }}
      />,
    );
    await waitFor(() => expect(dataRows().length).toBe(4));
    fireEvent.click(header('Ad'));
    await waitFor(() => expect(live()).toBe('Ad artan sıralandı'));
  });
});

describe('<OgeGrid> edit validation semantics', () => {
  it('marks an invalid cell editor and points it at its rendered error', async () => {
    const rows = seed();
    render(
      <OgeGrid
        data={new ArrayDataSource(rows, { key: 'id' })}
        keyField="id"
        columns={columns}
        editing={{ mode: 'cell', allowUpdating: true }}
      />,
    );
    await waitFor(() => expect(dataRows().length).toBe(4));
    fireEvent.click(dataRows()[0].querySelectorAll('.oge-cell')[0]);
    await wait(0);
    const input = document.querySelector(
      '.oge-editor input',
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await wait(0);

    expect(input.getAttribute('aria-invalid')).toBe('true');
    const errorId = input.getAttribute('aria-errormessage') as string;
    expect(errorId).toMatch(/^oge-cell-editor-[a-zA-Z0-9_-]+-error$/);
    expect(input.getAttribute('aria-describedby')?.split(' ')).toContain(
      errorId,
    );
    expect(document.getElementById(errorId)?.textContent).toBe(
      'This field is required',
    );
    await waitFor(() =>
      expect(live('assertive')).toBe('Name: This field is required'),
    );

    fireEvent.change(input, { target: { value: 'Ada L.' } });
    await wait(0);
    expect(input.hasAttribute('aria-errormessage')).toBe(false);
    expect(document.querySelector('.oge-cell-editor-error')).toBeNull();
  });
});
