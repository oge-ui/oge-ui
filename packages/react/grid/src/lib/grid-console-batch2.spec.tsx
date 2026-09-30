import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import { OgeGrid } from './grid';
import type { OgeGridColumnProps, OgeGridHandle } from './grid-types';

/**
 * Mirror of the Angular grid's second console batch: date group intervals,
 * a bound `groupBy` surviving a stored state, grouping from the header menu,
 * the anchored chooser, `exportCsv` options, the `between` date filter and
 * toolbar placement.
 */

interface Visit {
  id: number;
  who: string;
  at: Date;
}

const VISITS: Visit[] = [
  { id: 1, who: 'Ada', at: new Date(2026, 8, 1, 9, 30) },
  { id: 2, who: 'Grace', at: new Date(2026, 8, 1, 17, 5) },
  { id: 3, who: 'Linus', at: new Date(2026, 8, 3, 11, 0) },
];

const COLUMNS: OgeGridColumnProps<Visit>[] = [
  { field: 'who', caption: 'Who' },
  { field: 'at', caption: 'At', dataType: 'date' },
];

const groupRows = () =>
  [...document.querySelectorAll('.oge-group-row')] as HTMLElement[];
const dataRows = () => document.querySelectorAll('.oge-rows .oge-row');

describe('OgeGrid (React) — console batch 2', () => {
  afterEach(() => (document.body.innerHTML = ''));

  it('date columns group by calendar day by default', async () => {
    render(
      <OgeGrid
        data={VISITS}
        keyField="id"
        columns={COLUMNS}
        groupBy={['at']}
      />,
    );
    await waitFor(() => expect(groupRows()).toHaveLength(2));
  });

  it('groupInterval: month folds the days together', async () => {
    render(
      <OgeGrid
        data={VISITS}
        keyField="id"
        columns={[COLUMNS[0], { ...COLUMNS[1], groupInterval: 'month' }]}
        groupBy={['at']}
      />,
    );
    await waitFor(() => expect(groupRows()).toHaveLength(1));
  });

  it('a stored grouping does not override a bound groupBy', async () => {
    const storage = {
      get: () =>
        JSON.stringify({
          sort: [{ field: 'who', dir: 'desc' }],
          group: [{ field: 'who', dir: 'asc' }],
        }),
      set: () => undefined,
    };
    const ref = createRef<OgeGridHandle<Visit>>();
    render(
      <OgeGrid
        ref={ref}
        data={VISITS}
        keyField="id"
        columns={COLUMNS}
        groupBy={[]}
        stateKey="visits"
        stateStorage={storage}
      />,
    );
    await waitFor(() =>
      expect(ref.current?.state().sort).toEqual([
        { field: 'who', dir: 'desc' },
      ]),
    );
    expect(groupRows()).toHaveLength(0);
    expect(dataRows()).toHaveLength(3);
  });

  it('grouping.contextMenuEnabled offers group-by in the header menu without the panel', async () => {
    const itemsFor = async (grouping?: { contextMenuEnabled?: boolean }) => {
      let texts: string[] = [];
      const view = render(
        <OgeGrid
          data={VISITS}
          keyField="id"
          columns={COLUMNS}
          grouping={grouping}
          onHeaderContextMenu={(e) => {
            texts = e.items.map((item) => item.text);
          }}
        />,
      );
      await waitFor(() => expect(dataRows()).toHaveLength(3));
      fireEvent.contextMenu(
        document.querySelector(
          '.oge-header-cell[data-colid="who"]',
        ) as HTMLElement,
        { button: 2 },
      );
      view.unmount();
      return texts;
    };
    expect(await itemsFor()).not.toContain('Group by this column');
    expect(await itemsFor({ contextMenuEnabled: true })).toContain(
      'Group by this column',
    );
  });

  it('showColumnChooser(anchor) opens below the given element', async () => {
    const ref = createRef<OgeGridHandle<Visit>>();
    render(<OgeGrid ref={ref} data={VISITS} keyField="id" columns={COLUMNS} />);
    await waitFor(() => expect(dataRows()).toHaveLength(3));
    const anchor = document.createElement('button');
    document.body.appendChild(anchor);
    act(() => ref.current?.showColumnChooser(anchor));
    await waitFor(() =>
      expect(document.querySelector('.oge-chooser-popup')).not.toBeNull(),
    );
  });

  it('exportCsv forwards its options to getCsv and still fires onExporting', async () => {
    const original = {
      create: URL.createObjectURL,
      revoke: URL.revokeObjectURL,
    };
    let blob: Blob | null = null;
    URL.createObjectURL = (b: Blob) => {
      blob = b;
      return 'blob:x';
    };
    URL.revokeObjectURL = () => undefined;
    // jsdom does not navigate; the download anchor's click is a no-op here
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    const onExporting = vi.fn();
    const ref = createRef<OgeGridHandle<Visit>>();
    try {
      render(
        <OgeGrid
          ref={ref}
          data={VISITS}
          keyField="id"
          columns={COLUMNS}
          onExporting={onExporting}
        />,
      );
      await waitFor(() => expect(dataRows()).toHaveLength(3));
      await act(async () => {
        await ref.current?.exportCsv('v.csv', {
          separator: ';',
          customizeCell: ({ value, field }) =>
            field === 'who' ? String(value).toUpperCase() : value,
        });
      });
      expect(onExporting).toHaveBeenCalledWith(
        expect.objectContaining({ fileName: 'v.csv' }),
      );
      const text = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.readAsText(blob as unknown as Blob);
      });
      expect(text.split(/\r?\n/)[1]).toMatch(/^ADA;/);
    } finally {
      URL.createObjectURL = original.create;
      URL.revokeObjectURL = original.revoke;
      click.mockRestore();
    }
  });

  it("the 'between' operator swaps the date filter to a range box and clears the old filter", async () => {
    const ref = createRef<OgeGridHandle<Visit>>();
    render(
      <OgeGrid
        ref={ref}
        data={VISITS}
        keyField="id"
        columns={COLUMNS}
        filterRow
      />,
    );
    await waitFor(() => expect(dataRows()).toHaveLength(3));
    const opButtons = () =>
      [...document.querySelectorAll('.oge-filter-op-btn')] as HTMLElement[];
    fireEvent.click(opButtons()[1]);
    const between = await waitFor(() => {
      const item = [
        ...document.querySelectorAll(
          '[role="menuitemradio"], [role="menuitem"]',
        ),
      ].find((el) => el.textContent?.trim() === 'Between');
      expect(item).toBeTruthy();
      return item as HTMLElement;
    });
    fireEvent.click(between);
    await waitFor(() =>
      expect(
        document.querySelector('.oge-filter-row .oge-date-range-box'),
      ).not.toBeNull(),
    );
    expect(ref.current?.state().filter?.row ?? []).toEqual([]);
  });

  it('toolbarBefore / toolbarCenter / toolbarAfter place content in the toolbar groups', async () => {
    render(
      <OgeGrid
        data={VISITS}
        keyField="id"
        columns={COLUMNS}
        columnChooser
        toolbarBefore={<button data-testid="before">New</button>}
        toolbarCenter={<span data-testid="center">Title</span>}
        toolbarAfter={<button data-testid="after">Export</button>}
      />,
    );
    await waitFor(() => expect(dataRows()).toHaveLength(3));
    const toolbar = document.querySelector('.oge-grid-toolbar') as HTMLElement;
    const order = [
      ...toolbar.querySelectorAll('[data-testid], .oge-chooser-button'),
    ].map((el) => el.getAttribute('data-testid') ?? 'chooser');
    expect(order).toEqual(['before', 'center', 'after', 'chooser']);
  });

  it('the toolbar renders for toolbar content alone', async () => {
    render(
      <OgeGrid
        data={VISITS}
        keyField="id"
        columns={COLUMNS}
        toolbarAfter={<button>Export</button>}
      />,
    );
    await waitFor(() => expect(dataRows()).toHaveLength(3));
    expect(document.querySelector('.oge-grid-toolbar')).not.toBeNull();
  });
});
