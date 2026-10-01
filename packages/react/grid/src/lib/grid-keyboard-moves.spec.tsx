import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { StrictMode, createRef } from 'react';
import { OgeGrid } from './grid';
import type { OgeGridHandle, OgeRowReorderedEvent } from './grid-types';

interface Row {
  id: number;
  name: string;
  city: string;
  age: number;
}

const ROWS: Row[] = [
  { id: 1, name: 'Ada', city: 'London', age: 36 },
  { id: 2, name: 'Grace', city: 'New York', age: 45 },
  { id: 3, name: 'Erin', city: 'Paris', age: 29 },
];

const columns = [
  { field: 'name', caption: 'Name' },
  { field: 'city', caption: 'City', maxWidth: 180 },
  { field: 'age', caption: 'Age' },
];

const dataRows = (): HTMLElement[] =>
  screen.getAllByRole('row').filter((row) => row.classList.contains('oge-row'));

const headers = (container: HTMLElement): HTMLElement[] =>
  Array.from(
    container.querySelectorAll<HTMLElement>(
      '.oge-header-row > .oge-header-cell[data-colid]',
    ),
  );

const header = (container: HTMLElement, id: string): HTMLElement =>
  headers(container).find((cell) => cell.dataset['colid'] === id)!;

const announcer = (container: HTMLElement): string =>
  container.querySelector('.oge-grid-announcer')?.textContent?.trim() ?? '';

async function renderGrid(props: Record<string, unknown> = {}) {
  const rows = ROWS.map((row) => ({ ...row }));
  const ref = createRef<OgeGridHandle<Row>>();
  const events: OgeRowReorderedEvent<Row>[] = [];
  const result = render(
    <StrictMode>
      <OgeGrid
        ref={ref}
        data={rows}
        keyField="id"
        columns={columns}
        onRowReordered={(event) => events.push(event)}
        {...props}
      />
    </StrictMode>,
  );
  await waitFor(() => expect(dataRows().length).toBe(3));
  return { ...result, rows, ref, events };
}

describe('OgeGrid (React) keyboard alternatives to dragging', () => {
  it('renders the resize handle as a labelled vertical separator', async () => {
    const { container } = await renderGrid();
    const handle = header(container, 'city').querySelector(
      '.oge-resize-handle',
    ) as HTMLElement;
    expect(handle.getAttribute('role')).toBe('separator');
    expect(handle.getAttribute('aria-orientation')).toBe('vertical');
    expect(handle.getAttribute('tabindex')).toBe('-1');
    expect(handle.getAttribute('aria-label')).toBe('Resize City');
    expect(handle.getAttribute('aria-valuemax')).toBe('180');
    expect(header(container, 'name').getAttribute('aria-keyshortcuts')).toBe(
      'Alt+ArrowLeft Alt+ArrowRight Control+Shift+ArrowLeft Control+Shift+ArrowRight',
    );
  });

  it('resizes with Alt+Arrow and the separator keys, clamped to maxWidth', async () => {
    const { container, ref } = await renderGrid();
    const width = () =>
      new Map(ref.current?.state().columns?.widths ?? []).get('city');
    fireEvent.keyDown(header(container, 'city'), {
      key: 'ArrowRight',
      altKey: true,
    });
    expect(width()).toBe(130);
    await waitFor(() =>
      expect(announcer(container)).toBe('City width 130 pixels'),
    );
    const handle = header(container, 'city').querySelector(
      '.oge-resize-handle',
    ) as HTMLElement;
    fireEvent.keyDown(handle, { key: 'End' });
    expect(width()).toBe(180);
    await waitFor(() =>
      expect(handle.getAttribute('aria-valuenow')).toBe('180'),
    );
    fireEvent.keyDown(handle, { key: 'ArrowLeft', shiftKey: true });
    expect(width()).toBe(179);
  });

  it('moves a column with Ctrl+Shift+Arrow and announces it', async () => {
    const { container } = await renderGrid();
    fireEvent.keyDown(header(container, 'name'), {
      key: 'ArrowRight',
      ctrlKey: true,
      shiftKey: true,
    });
    await waitFor(() =>
      expect(headers(container).map((cell) => cell.dataset['colid'])).toEqual([
        'city',
        'name',
        'age',
      ]),
    );
    expect(announcer(container)).toBe('Name moved to position 2 of 3');
  });

  it('moves the focused row with Ctrl+ArrowDown through the drop path', async () => {
    const { container, rows, events } = await renderGrid({
      rowDragging: true,
    });
    const cell = container.querySelector('[data-cell="0-0"]') as HTMLElement;
    act(() => cell.focus());
    fireEvent.focus(cell);
    fireEvent.keyDown(cell, { key: 'ArrowDown', ctrlKey: true });
    expect(rows.map((row) => row.name)).toEqual(['Grace', 'Ada', 'Erin']);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      key: 1,
      targetKey: 2,
      fromIndex: 0,
      toIndex: 1,
    });
    await waitFor(() =>
      expect(announcer(container)).toBe('Row moved to position 2 of 3'),
    );
  });

  it('reorders and removes groupings from the chips', async () => {
    const { container, ref } = await renderGrid({ groupPanel: true });
    act(() =>
      ref.current?.applyState({
        group: [
          { field: 'city', dir: 'asc' },
          { field: 'age', dir: 'asc' },
        ],
      }),
    );
    const chip = (field: string) =>
      container.querySelector(
        `.oge-group-chip-remove[data-group-field="${field}"]`,
      ) as HTMLElement;
    await waitFor(() => expect(chip('city')).not.toBeNull());
    fireEvent.keyDown(chip('city'), { key: 'ArrowRight', ctrlKey: true });
    expect(ref.current?.state().group?.map((d) => d.field)).toEqual([
      'age',
      'city',
    ]);
    await waitFor(() =>
      expect(announcer(container)).toBe(
        'Grouping by City moved to position 2 of 2',
      ),
    );
    fireEvent.keyDown(chip('age'), { key: 'Delete' });
    expect(ref.current?.state().group?.map((d) => d.field)).toEqual(['city']);
  });

  it('moves a column from the chooser with Ctrl+ArrowDown', async () => {
    const { container } = await renderGrid({ columnChooser: true });
    fireEvent.click(container.querySelector('.oge-chooser-button')!);
    const item = (id: string) =>
      Array.from(
        document.querySelectorAll<HTMLElement>('.oge-chooser-item'),
      ).find((element) => element.dataset['chooserId'] === id)!;
    await waitFor(() => expect(item('name')).toBeDefined());
    fireEvent.keyDown(item('name'), { key: 'ArrowDown', ctrlKey: true });
    await waitFor(() =>
      expect(headers(container).map((cell) => cell.dataset['colid'])).toEqual([
        'city',
        'name',
        'age',
      ]),
    );
  });
});
