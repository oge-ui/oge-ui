import { fireEvent, render, waitFor } from '@testing-library/react';
import { OgeTreeList } from './tree-list';
import { rows, settled } from './tree-list.test-utils';

interface Task {
  id: number;
  parentId: number | null;
  title: string;
  done: boolean;
}

const data: Task[] = [
  { id: 1, parentId: null, title: 'Root A', done: true },
  { id: 2, parentId: 1, title: 'Child A1', done: false },
];

const columns = [
  { field: 'title', caption: 'Title', width: 200 },
  { field: 'done', caption: 'Done', dataType: 'boolean' as const },
];

describe('OgeTreeList localized accessible names', () => {
  it('names the reparent and checkbox header cells and the drag handle from messages', async () => {
    const { container } = render(
      <OgeTreeList
        data={data}
        columns={columns}
        autoExpandAll
        rowDragging
        selectionMode="checkbox"
      />,
    );
    await settled();
    expect(
      container
        .querySelector('.oge-header-cell.oge-drag-cell')
        ?.getAttribute('aria-label'),
    ).toBe('Reparent');
    expect(
      container
        .querySelector('.oge-header-cell.oge-checkbox-cell')
        ?.getAttribute('aria-label'),
    ).toBe('Select all');
    expect(
      container
        .querySelector('.oge-row .oge-drag-handle')
        ?.getAttribute('aria-label'),
    ).toBe('Reparent row');
  });

  it('follows per-instance message overrides', async () => {
    const { container } = render(
      <OgeTreeList
        data={data}
        columns={columns}
        autoExpandAll
        rowDragging
        messages={{
          reparentColumnHeader: 'Taşı',
          reparentRow: 'Satırı taşı',
          booleanTrueLabel: 'Evet',
          booleanFalseLabel: 'Hayır',
        }}
      />,
    );
    await settled();
    expect(
      container
        .querySelector('.oge-header-cell.oge-drag-cell')
        ?.getAttribute('aria-label'),
    ).toBe('Taşı');
    expect(
      container
        .querySelector('.oge-row .oge-drag-handle')
        ?.getAttribute('aria-label'),
    ).toBe('Satırı taşı');
    expect(
      Array.from(container.querySelectorAll('.oge-row .oge-sr-only')).map(
        (node) => node.textContent,
      ),
    ).toEqual(['Evet', 'Hayır']);
  });

  it('renders boolean glyphs aria-hidden with a visually hidden word', async () => {
    render(<OgeTreeList data={data} columns={columns} autoExpandAll />);
    await settled();
    const cell = rows()[0].querySelectorAll('.oge-cell')[1];
    expect(cell.querySelector('[aria-hidden="true"]')?.textContent).toBe('✓');
    expect(cell.querySelector('.oge-sr-only')?.textContent).toBe('Yes');
  });
});

describe('OgeTreeList column resize direction', () => {
  async function dragHandle(rtl: boolean): Promise<string> {
    const { container } = render(
      <OgeTreeList data={data} columns={columns} rtlEnabled={rtl} />,
    );
    await settled();
    const header = container.querySelectorAll(
      '.oge-header-row .oge-header-cell',
    )[0];
    Object.defineProperty(header, 'offsetWidth', { value: 200 });
    const handle = header.querySelector('.oge-resize-handle') as HTMLElement;
    // jsdom has no PointerEvent; a MouseEvent of the same type carries clientX
    fireEvent(
      handle,
      new MouseEvent('pointerdown', { bubbles: true, clientX: 500 }),
    );
    fireEvent(window, new MouseEvent('pointermove', { clientX: 440 }));
    fireEvent(window, new MouseEvent('pointerup', { clientX: 440 }));
    let template = '';
    await waitFor(() => {
      template = (container.querySelector('.oge-header-row') as HTMLElement)
        .style.gridTemplateColumns;
      expect(template).not.toMatch(/^200px/);
    });
    return template;
  }

  it('adds the pointer delta in LTR', async () => {
    expect(await dragHandle(false)).toMatch(/^140px/);
  });

  it('negates the pointer delta in RTL', async () => {
    expect(await dragHandle(true)).toMatch(/^260px/);
  });
});
