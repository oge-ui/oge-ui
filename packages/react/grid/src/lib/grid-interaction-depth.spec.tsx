import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { StrictMode, createRef } from 'react';
import {
  findOgeRowDragParticipant,
  type OgeCellPreparedEvent,
  type OgeGridCellRange,
  type OgeRangeSelectionChangedEvent,
  type OgeRowDropEvent,
} from '@oge-ui/behavior';
import { OgeGrid } from './grid';
import type { OgeGridColumnProps, OgeGridHandle } from './grid-types';
import { OgePager } from './pager';

interface Row {
  id: number;
  name: string;
  qty: number;
  region: string;
}

const rows = (): Row[] => [
  { id: 1, name: 'Ada', qty: 10, region: 'EU' },
  { id: 2, name: 'Bob', qty: 20, region: 'EU' },
  { id: 3, name: 'Cem', qty: 30, region: 'US' },
  { id: 4, name: 'Dee', qty: 40, region: 'US' },
];

const columns: OgeGridColumnProps<Row>[] = [
  { field: 'name', caption: 'Name' },
  { field: 'qty', caption: 'Qty', dataType: 'number' },
  { field: 'region', caption: 'Region', editable: false },
];

const cell = (row: number, col: number): HTMLElement =>
  document.querySelector(`[data-cell="${row}-${col}"]`) as HTMLElement;

async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve));
  });
}

function pointer(el: Element, type: string, init: MouseEventInit = {}): void {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    ...init,
  });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  Object.defineProperty(event, 'pointerType', { value: 'mouse' });
  act(() => {
    el.dispatchEvent(event);
  });
}

function clipboard(type: 'copy' | 'paste', target: Element, text = '') {
  const data = new Map<string, string>([['text/plain', text]]);
  const clipboardData = {
    getData: (format: string) => data.get(format) ?? '',
    setData: (format: string, value: string) => data.set(format, value),
  };
  if (type === 'copy') fireEvent.copy(target, { clipboardData });
  else fireEvent.paste(target, { clipboardData });
  return data;
}

describe('<OgeGrid> cell range selection', () => {
  it('click + shift-click selects a range with aria-selected and callbacks', async () => {
    const changes: OgeRangeSelectionChangedEvent[] = [];
    let ranges: readonly OgeGridCellRange[] = [];
    render(
      <StrictMode>
        <OgeGrid
          data={rows()}
          keyField="id"
          columns={columns}
          selectionMode="cell"
          onRangeSelectionChanged={(event) => changes.push(event)}
          onSelectedRangesChange={(next) => (ranges = next)}
        />
      </StrictMode>,
    );
    await waitFor(() => expect(cell(0, 0)).not.toBeNull());
    pointer(cell(0, 0), 'pointerdown');
    pointer(cell(0, 0), 'pointerup');
    pointer(cell(2, 1), 'pointerdown', { shiftKey: true });
    await settle();
    expect(cell(1, 1).getAttribute('aria-selected')).toBe('true');
    expect(cell(3, 1).getAttribute('aria-selected')).toBe('false');
    expect(cell(0, 0).classList).toContain('oge-range-top');
    expect(ranges).toEqual([
      { anchor: { row: 0, col: 0 }, focus: { row: 2, col: 1 } },
    ]);
    expect(changes.at(-1)).toMatchObject({
      rowCount: 3,
      columnCount: 2,
      cellCount: 6,
    });
  });

  it('Shift+Arrow extends; the copy event carries the range TSV with headers', async () => {
    render(
      <OgeGrid
        data={rows()}
        keyField="id"
        columns={columns}
        selectionMode="cell"
        rangeSelection={{ copyHeaders: true }}
      />,
    );
    await waitFor(() => expect(cell(0, 0)).not.toBeNull());
    act(() => cell(0, 0).focus());
    pointer(cell(0, 0), 'pointerdown');
    pointer(cell(0, 0), 'pointerup');
    await settle();
    fireEvent.keyDown(cell(0, 0), { key: 'ArrowDown', shiftKey: true });
    await settle();
    fireEvent.keyDown(cell(1, 0), { key: 'ArrowRight', shiftKey: true });
    await settle();
    const data = clipboard('copy', cell(1, 1));
    expect(data.get('text/plain')).toBe('Name\tQty\r\nAda\t10\r\nBob\t20');
  });

  it('pastes a TSV block as one undoable batch, skipping read-only cells', async () => {
    const ref = createRef<OgeGridHandle<Row>>();
    render(
      <OgeGrid
        ref={ref}
        data={rows()}
        keyField="id"
        columns={columns}
        selectionMode="cell"
        editing={{ mode: 'batch', allowUpdating: true }}
      />,
    );
    await waitFor(() => expect(cell(1, 0)).not.toBeNull());
    act(() => cell(1, 0).focus());
    await settle();
    clipboard('paste', cell(1, 0), 'Zed\t7\tXX\r\nYan\tnope\r\n');
    await settle();
    await settle();
    expect(cell(1, 0).textContent).toBe('Zed');
    expect(cell(1, 1).textContent).toBe('7');
    expect(cell(1, 2).textContent).toBe('EU');
    expect(cell(2, 0).textContent).toBe('Yan');
    expect(cell(2, 1).textContent).toBe('30');
    await act(async () => {
      await ref.current?.undo();
    });
    await settle();
    expect(cell(1, 0).textContent).toBe('Bob');
  });

  it('Ctrl+D fills down inside the range only', async () => {
    const ref = createRef<OgeGridHandle<Row>>();
    render(
      <OgeGrid
        ref={ref}
        data={rows()}
        keyField="id"
        columns={columns}
        selectionMode="cell"
        editing={{ mode: 'batch', allowUpdating: true }}
      />,
    );
    await waitFor(() => expect(cell(0, 1)).not.toBeNull());
    act(() =>
      ref.current?.selectRange({
        anchor: { row: 0, col: 1 },
        focus: { row: 2, col: 1 },
      }),
    );
    act(() => cell(0, 1).focus());
    await settle();
    expect(cell(2, 1).querySelector('.oge-fill-handle')).not.toBeNull();
    fireEvent.keyDown(cell(0, 1), { key: 'd', ctrlKey: true });
    await settle();
    await settle();
    expect([0, 1, 2, 3].map((r) => cell(r, 1).textContent)).toEqual([
      '10',
      '10',
      '10',
      '40',
    ]);
    fireEvent.keyDown(cell(0, 1), { key: 'z', ctrlKey: true });
    await settle();
    await settle();
    expect(cell(1, 1).textContent).toBe('20');
  });
});

describe('<OgeGrid> styling hooks, formats, pinned rows, merged cells', () => {
  function renderStyled(prepared: OgeCellPreparedEvent<Row>[] = []) {
    return render(
      <OgeGrid
        data={rows()}
        keyField="id"
        columns={[
          { field: 'name', caption: 'Name' },
          {
            field: 'qty',
            caption: 'Qty',
            dataType: 'number',
            conditionalFormats: [
              {
                when: { operator: 'ge', value: 40 },
                style: { tone: 'danger' },
              },
              { type: 'dataBar' },
            ],
          },
          { field: 'region', caption: 'Region', mergeCells: true },
        ]}
        rowClass={(row) => ({ 'is-big': row.qty >= 30 })}
        cellClass={(row, column) =>
          column.field === 'name' ? `name-${row.id}` : null
        }
        pinnedTopRows={[2]}
        pinnedBottomRows={[{ id: 99, name: 'Total', qty: 100, region: '' }]}
        onCellPrepared={(event) => prepared.push(event)}
      />,
    );
  }

  it('applies the hooks and token-only formats', async () => {
    const prepared: OgeCellPreparedEvent<Row>[] = [];
    renderStyled(prepared);
    await waitFor(() =>
      expect(document.querySelectorAll('.oge-rows > .oge-row')).toHaveLength(3),
    );
    const body = Array.from(document.querySelectorAll('.oge-rows > .oge-row'));
    expect(body[1].classList).toContain('is-big');
    expect(body[0].querySelector('.name-1')).not.toBeNull();
    const dee = body[2].querySelectorAll('.oge-cell')[1] as HTMLElement;
    expect(dee.classList).toContain('oge-cf-tone-danger');
    expect(dee.classList).toContain('oge-cf-databar');
    expect(dee.style.getPropertyValue('--oge-cf-bar')).toBe('1');
    expect(prepared).toHaveLength(8);
  });

  it('renders pinned rows and merges equal values with aria-rowspan', async () => {
    renderStyled();
    await waitFor(() =>
      expect(
        document.querySelector('.oge-header .oge-pinned-row'),
      ).not.toBeNull(),
    );
    const top = document.querySelector('.oge-header .oge-pinned-row');
    expect(top?.textContent).toContain('Bob');
    expect(top?.getAttribute('aria-rowindex')).toBe('2');
    expect(
      document.querySelector('.oge-footer .oge-pinned-row')?.textContent,
    ).toContain('Total');
    const owner = cell(1, 2);
    expect(owner.getAttribute('aria-rowspan')).toBe('2');
    expect(cell(2, 2)).toBeNull();
    expect(document.querySelectorAll('.oge-cell-span-covered')).toHaveLength(1);
  });
});

describe('<OgeGrid> Excel-style header filter menu', () => {
  it('shows the condition section and a date tree', async () => {
    render(
      <OgeGrid
        data={[
          { id: 1, name: 'Ada', shipped: new Date(2026, 0, 5) },
          { id: 2, name: 'Bob', shipped: new Date(2026, 1, 9) },
          { id: 3, name: 'Cem', shipped: new Date(2025, 11, 1) },
        ]}
        keyField="id"
        headerFilter={{ mode: 'both' }}
        columns={[{ field: 'name' }, { field: 'shipped', dataType: 'date' }]}
      />,
    );
    await waitFor(() =>
      expect(document.querySelectorAll('.oge-header-filter-btn')).toHaveLength(
        2,
      ),
    );
    fireEvent.click(document.querySelectorAll('.oge-header-filter-btn')[1]);
    await settle();
    await settle();
    const popup = document.querySelector(
      '.oge-header-filter-menu',
    ) as HTMLElement;
    expect(popup.querySelectorAll('.oge-hf-condition')).toHaveLength(2);
    expect(
      Array.from(popup.querySelectorAll('.oge-hf-group > span:last-child')).map(
        (s) => s.textContent,
      ),
    ).toEqual(['2025', '2026']);
    expect(popup.querySelectorAll('.oge-hf-month')).toHaveLength(3);
    fireEvent.click(popup.querySelector('.oge-hf-toggle') as HTMLElement);
    await settle();
    expect(popup.querySelectorAll('.oge-hf-leaf')).toHaveLength(2);
  });
});

describe('<OgePager> first / last / go-to-page / info', () => {
  it('navigates with the buttons and the input', () => {
    const pages: number[] = [];
    render(
      <OgePager
        pageIndex={1}
        pageCount={4}
        totalCount={40}
        pageSize={10}
        showFirstLast
        showPageInput
        renderInfo={(info) => `${info.firstRow}–${info.lastRow}`}
        onPageChange={(page) => pages.push(page)}
      />,
    );
    fireEvent.click(document.querySelector('.oge-pager-first') as HTMLElement);
    fireEvent.click(document.querySelector('.oge-pager-last') as HTMLElement);
    const input = document.querySelector(
      '.oge-pager-input-field',
    ) as HTMLInputElement;
    expect(input.value).toBe('2');
    fireEvent.change(input, { target: { value: '9' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(pages).toEqual([0, 3, 3]);
    expect(document.querySelector('.oge-pager-info')?.textContent).toBe(
      '11–20',
    );
  });
});

describe('<OgeGrid> async validators', () => {
  it('marks the editor aria-busy while a promise rule runs and commits after', async () => {
    let resolve!: (message: string | null) => void;
    render(
      <OgeGrid
        data={rows()}
        keyField="id"
        editing={{ mode: 'batch', allowUpdating: true }}
        columns={[
          {
            field: 'name',
            validators: [
              () => new Promise<string | null>((done) => (resolve = done)),
            ],
          },
        ]}
      />,
    );
    await waitFor(() => expect(cell(0, 0)).not.toBeNull());
    fireEvent.click(cell(0, 0));
    await settle();
    const input = document.querySelector(
      '.oge-editor input',
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Eve' } });
    await settle();
    const editor = document.querySelector('.oge-cell-editor') as HTMLElement;
    expect(editor.getAttribute('aria-busy')).toBe('true');
    fireEvent.keyDown(input, { key: 'Enter' });
    await settle();
    expect(document.querySelector('.oge-cell-editor')).not.toBeNull();
    await act(async () => {
      resolve(null);
      await new Promise((done) => setTimeout(done));
    });
    await settle();
    expect(document.querySelector('.oge-cell-editor')).toBeNull();
    expect(cell(0, 0).textContent).toBe('Eve');
  });
});

describe('<OgeGrid> cross-grid row drag', () => {
  it('registers grids of one group and reports drops on the target', async () => {
    const drops: OgeRowDropEvent[] = [];
    render(
      <>
        <OgeGrid
          id="left"
          data={rows().slice(0, 2)}
          keyField="id"
          columns={[{ field: 'name' }]}
          rowDragging
          rowDragGroup="people"
        />
        <OgeGrid
          id="right"
          data={rows().slice(2)}
          keyField="id"
          columns={[{ field: 'name' }]}
          rowDragGroup="people"
          onRowDrop={(event) => drops.push(event)}
        />
      </>,
    );
    await waitFor(() =>
      expect(
        document.querySelector('#right .oge-rows .oge-row'),
      ).not.toBeNull(),
    );
    const rowEl = document.querySelector(
      '#right .oge-rows .oge-row',
    ) as HTMLElement;
    const participant = findOgeRowDragParticipant(rowEl, 'people');
    expect(participant?.componentId).toBe('right');
    const source = { componentId: 'left', key: 1, row: rows()[0] };
    const target = participant?.resolve(rowEl, 0, source);
    expect(target?.key).toBe(3);
    act(() => participant?.drop(source, target!));
    expect(drops[0]).toMatchObject({
      sourceComponentId: 'left',
      targetComponentId: 'right',
      sameComponent: false,
      targetKey: 3,
    });
  });
});
