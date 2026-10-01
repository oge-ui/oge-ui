import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { OgeGrid } from './grid';

interface Row {
  id: number;
  name: string;
  active: boolean;
}

const data: Row[] = [
  { id: 1, name: 'Ada', active: true },
  { id: 2, name: 'Grace', active: false },
];

const columns = [
  { field: 'name', caption: 'Name', width: 200 },
  { field: 'active', caption: 'Active', dataType: 'boolean' as const },
];

const dataRows = (): HTMLElement[] =>
  screen.getAllByRole('row').filter((row) => row.classList.contains('oge-row'));

async function settled(): Promise<void> {
  await waitFor(() => expect(dataRows().length).toBeGreaterThan(0));
}

describe('OgeGrid localized accessible names', () => {
  it('names the drag and checkbox header cells and the drag handle from messages', async () => {
    const { container } = render(
      <OgeGrid
        data={data}
        keyField="id"
        columns={columns}
        rowDragging
        selectionMode="checkbox"
      />,
    );
    await settled();
    expect(
      container
        .querySelector('.oge-header-cell.oge-drag-cell')
        ?.getAttribute('aria-label'),
    ).toBe('Reorder');
    expect(
      container
        .querySelector('.oge-header-cell.oge-checkbox-cell')
        ?.getAttribute('aria-label'),
    ).toBe('Select all');
    expect(
      container
        .querySelector('.oge-row .oge-drag-handle')
        ?.getAttribute('aria-label'),
    ).toBe('Reorder row');
  });

  it('follows per-grid message overrides', async () => {
    const { container } = render(
      <OgeGrid
        data={data}
        keyField="id"
        columns={columns}
        rowDragging
        selectionMode="checkbox"
        messages={{
          reorderColumnHeader: 'Sırala',
          selectAllColumnHeader: 'Tümünü seç',
          reorderRow: 'Satırı taşı',
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
    ).toBe('Sırala');
    expect(
      container
        .querySelector('.oge-header-cell.oge-checkbox-cell')
        ?.getAttribute('aria-label'),
    ).toBe('Tümünü seç');
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
    render(<OgeGrid data={data} keyField="id" columns={columns} />);
    await settled();
    const cell = dataRows()[0].querySelectorAll('.oge-cell')[1];
    expect(cell.querySelector('[aria-hidden="true"]')?.textContent).toBe('✓');
    expect(cell.querySelector('.oge-sr-only')?.textContent).toBe('Yes');
  });
});

describe('OgeGrid column resize direction', () => {
  async function dragHandle(rtl: boolean): Promise<string> {
    const { container } = render(
      <OgeGrid data={data} keyField="id" columns={columns} rtlEnabled={rtl} />,
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

  it('negates the pointer delta in RTL, where the handle is on the left edge', async () => {
    expect(await dragHandle(true)).toMatch(/^260px/);
  });
});
