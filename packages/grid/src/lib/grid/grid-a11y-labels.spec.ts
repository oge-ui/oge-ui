import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeGrid } from './grid';

interface Row {
  id: number;
  name: string;
  active: boolean;
}

const ROWS: Row[] = [
  { id: 1, name: 'Ada', active: true },
  { id: 2, name: 'Grace', active: false },
];

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve));
  await fixture.whenStable();
  fixture.detectChanges();
}

async function render(
  inputs: Record<string, unknown> = {},
): Promise<{ fixture: ComponentFixture<OgeGrid<Row>>; el: HTMLElement }> {
  const fixture = TestBed.createComponent(OgeGrid<Row>);
  fixture.componentRef.setInput('data', ROWS);
  fixture.componentRef.setInput('columns', [
    { field: 'name', width: 200 },
    { field: 'active', dataType: 'boolean' },
  ]);
  fixture.componentRef.setInput('keyField', 'id');
  for (const [name, value] of Object.entries(inputs))
    fixture.componentRef.setInput(name, value);
  fixture.detectChanges();
  await settle(fixture);
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('OgeGrid localized accessible names', () => {
  it('names the drag and checkbox header cells and the drag handle from messages', async () => {
    const { el } = await render({
      rowDragging: true,
      selectionMode: 'checkbox',
    });
    const drag = el.querySelector('.oge-header-cell.oge-drag-cell');
    const check = el.querySelector('.oge-header-cell.oge-checkbox-cell');
    expect(drag?.getAttribute('aria-label')).toBe('Reorder');
    expect(check?.getAttribute('aria-label')).toBe('Select all');
    expect(
      el.querySelector('.oge-row .oge-drag-handle')?.getAttribute('aria-label'),
    ).toBe('Reorder row');
  });

  it('follows per-grid message overrides', async () => {
    const { el } = await render({
      rowDragging: true,
      selectionMode: 'checkbox',
      messages: {
        reorderColumnHeader: 'Sırala',
        selectAllColumnHeader: 'Tümünü seç',
        reorderRow: 'Satırı taşı',
        booleanTrueLabel: 'Evet',
        booleanFalseLabel: 'Hayır',
      },
    });
    expect(
      el
        .querySelector('.oge-header-cell.oge-drag-cell')
        ?.getAttribute('aria-label'),
    ).toBe('Sırala');
    expect(
      el
        .querySelector('.oge-header-cell.oge-checkbox-cell')
        ?.getAttribute('aria-label'),
    ).toBe('Tümünü seç');
    expect(
      el.querySelector('.oge-row .oge-drag-handle')?.getAttribute('aria-label'),
    ).toBe('Satırı taşı');
    const labels = Array.from(el.querySelectorAll('.oge-row .oge-sr-only')).map(
      (node) => node.textContent,
    );
    expect(labels).toEqual(['Evet', 'Hayır']);
  });

  it('renders boolean glyphs aria-hidden with a visually hidden word', async () => {
    const { el } = await render();
    const cell = el
      .querySelectorAll('.oge-row')[0]
      .querySelectorAll('.oge-cell')[1];
    expect(cell.querySelector('[aria-hidden="true"]')?.textContent).toBe('✓');
    expect(cell.querySelector('.oge-sr-only')?.textContent).toBe('Yes');
  });
});

describe('OgeGrid column resize direction', () => {
  async function dragHandle(rtl: boolean): Promise<string> {
    const { fixture, el } = await render({ rtlEnabled: rtl });
    const header = el.querySelectorAll('.oge-header-row .oge-header-cell')[0];
    Object.defineProperty(header, 'offsetWidth', { value: 200 });
    const handle = header.querySelector('.oge-resize-handle') as HTMLElement;
    handle.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, clientX: 500 }),
    );
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 440 }));
    window.dispatchEvent(new MouseEvent('pointerup', { clientX: 440 }));
    await settle(fixture);
    return (el.querySelector('.oge-header-row') as HTMLElement).style
      .gridTemplateColumns;
  }

  it('dragging towards the inline end widens the column in LTR', async () => {
    // pointer moved 60px left: an LTR column shrinks
    expect(await dragHandle(false)).toMatch(/^140px/);
  });

  it('negates the pointer delta in RTL, where the handle is on the left edge', async () => {
    expect(await dragHandle(true)).toMatch(/^260px/);
  });
});
