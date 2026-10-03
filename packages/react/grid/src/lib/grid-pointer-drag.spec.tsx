import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  { field: 'city', caption: 'City' },
  { field: 'age', caption: 'Age' },
];

/**
 * Pointer events as jsdom builds them (no PointerEvent constructor, no
 * elementFromPoint): the move's own target stands in for the hit-test.
 */
function pointer(
  type: string,
  target: Element,
  x: number,
  y: number,
  pointerType = 'mouse',
): void {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    clientX: x,
    clientY: y,
  });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  Object.defineProperty(event, 'pointerType', { value: pointerType });
  act(() => {
    target.dispatchEvent(event);
  });
}

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
  await waitFor(() => expect(dataRows()).toHaveLength(3));
  return { ...result, rows, ref, events };
}

describe('<OgeGrid> pointer drags (no HTML5 drag and drop)', () => {
  it('reorders columns by dropping a header onto another', async () => {
    const { container } = await renderGrid({ columnReorder: true });
    expect(container.querySelector('[draggable]')).toBeNull();
    pointer('pointerdown', header(container, 'age'), 300, 10);
    pointer('pointermove', header(container, 'name'), 20, 10);
    expect(header(container, 'name')).toHaveClass('oge-col-drop-target');
    pointer('pointerup', header(container, 'name'), 20, 10);
    await waitFor(() =>
      expect(headers(container).map((cell) => cell.dataset['colid'])).toEqual([
        'age',
        'name',
        'city',
      ]),
    );
    expect(header(container, 'name')).not.toHaveClass('oge-col-drop-target');
  });

  it('the click a header drag ends with does not sort', async () => {
    const { container } = await renderGrid({ columnReorder: true });
    pointer('pointerdown', header(container, 'age'), 300, 10);
    pointer('pointermove', header(container, 'name'), 20, 10);
    pointer('pointerup', header(container, 'name'), 20, 10);
    fireEvent.click(header(container, 'name'));
    expect(container.querySelector('[aria-sort="ascending"]')).toBeNull();
  });

  it('Escape mid-drag cancels a header drag', async () => {
    const { container } = await renderGrid({ columnReorder: true });
    pointer('pointerdown', header(container, 'age'), 300, 10);
    pointer('pointermove', header(container, 'name'), 20, 10);
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
    });
    pointer('pointerup', header(container, 'name'), 20, 10);
    expect(headers(container).map((cell) => cell.dataset['colid'])).toEqual([
      'name',
      'city',
      'age',
    ]);
    expect(container.querySelector('.oge-col-drop-target')).toBeNull();
    expect(document.querySelector('.oge-drag-ghost')).toBeNull();
  });

  it('a touch swipe on a header scrolls; a long press groups by it', async () => {
    const { container, ref } = await renderGrid({ groupPanel: true });
    const panel = container.querySelector('.oge-group-panel')!;
    pointer('pointerdown', header(container, 'city'), 150, 40, 'touch');
    pointer('pointermove', panel, 150, 5, 'touch');
    pointer('pointerup', panel, 150, 5, 'touch');
    expect(ref.current?.state().group ?? []).toEqual([]);

    pointer('pointerdown', header(container, 'city'), 150, 40, 'touch');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 340));
    });
    pointer('pointermove', panel, 150, 5, 'touch');
    pointer('pointerup', panel, 150, 5, 'touch');
    expect(ref.current?.state().group?.map((d) => d.field)).toEqual(['city']);
  });

  it('reorders group chips by dragging, like Ctrl+Arrow on a chip', async () => {
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
      container.querySelector(`.oge-group-chip[data-group-chip="${field}"]`) as HTMLElement;
    await waitFor(() => expect(chip('age')).not.toBeNull());
    pointer('pointerdown', chip('age'), 120, 5);
    pointer('pointermove', chip('city'), 20, 5);
    expect(chip('city')).toHaveClass('oge-group-chip-drop-target');
    pointer('pointerup', chip('city'), 20, 5);
    expect(ref.current?.state().group?.map((d) => d.field)).toEqual(['age', 'city']);
  });

  it('a row-handle drop and Ctrl+ArrowUp emit the identical event', async () => {
    const pointerRun = await renderGrid({ rowDragging: true });
    const handles = pointerRun.container.querySelectorAll('.oge-drag-handle');
    pointer('pointerdown', handles[1], 5, 50, 'touch'); // handles drag at once
    pointer('pointermove', dataRows()[0], 5, 10, 'touch');
    pointer('pointerup', dataRows()[0], 5, 10, 'touch');
    expect(pointerRun.rows.map((row) => row.name)).toEqual(['Grace', 'Ada', 'Erin']);
    pointerRun.unmount();

    const keyboardRun = await renderGrid({ rowDragging: true });
    const cell = keyboardRun.container.querySelector('[data-cell="1-0"]') as HTMLElement;
    act(() => cell.focus());
    fireEvent.focus(cell);
    fireEvent.keyDown(cell, { key: 'ArrowUp', ctrlKey: true });
    expect(keyboardRun.events).toHaveLength(1);
    expect(pointerRun.events).toEqual(keyboardRun.events);
  });

  it('reorders columns by dragging chooser rows', async () => {
    const { container } = await renderGrid({ columnChooser: true });
    fireEvent.click(container.querySelector('.oge-chooser-button')!);
    const item = (id: string) =>
      Array.from(document.querySelectorAll<HTMLElement>('.oge-chooser-item')).find(
        (element) => element.dataset['chooserId'] === id,
      )!;
    await waitFor(() => expect(item('age')).toBeDefined());
    pointer('pointerdown', item('age'), 5, 60);
    pointer('pointermove', item('name'), 5, 10);
    expect(item('name')).toHaveClass('oge-chooser-drop-target');
    pointer('pointerup', item('name'), 5, 10);
    await waitFor(() =>
      expect(headers(container).map((cell) => cell.dataset['colid'])).toEqual([
        'age',
        'name',
        'city',
      ]),
    );
  });
});
