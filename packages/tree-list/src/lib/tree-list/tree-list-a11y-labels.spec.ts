import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeTreeList } from './tree-list';

interface Task {
  id: number;
  parentId: number | null;
  title: string;
  done: boolean;
}

const TASKS: Task[] = [
  { id: 1, parentId: null, title: 'Root A', done: true },
  { id: 2, parentId: 1, title: 'Child A1', done: false },
];

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve));
  await fixture.whenStable();
  fixture.detectChanges();
}

async function render(
  inputs: Record<string, unknown> = {},
): Promise<{ fixture: ComponentFixture<OgeTreeList<Task>>; el: HTMLElement }> {
  const fixture = TestBed.createComponent(OgeTreeList<Task>);
  fixture.componentRef.setInput('data', TASKS);
  fixture.componentRef.setInput('columns', [
    { field: 'title', width: 200 },
    { field: 'done', dataType: 'boolean' },
  ]);
  fixture.componentRef.setInput('autoExpandAll', true);
  for (const [name, value] of Object.entries(inputs))
    fixture.componentRef.setInput(name, value);
  fixture.detectChanges();
  await settle(fixture);
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('OgeTreeList localized accessible names', () => {
  it('names the reparent and checkbox header cells and the drag handle from messages', async () => {
    const { el } = await render({
      rowDragging: true,
      selectionMode: 'checkbox',
    });
    expect(
      el
        .querySelector('.oge-header-cell.oge-drag-cell')
        ?.getAttribute('aria-label'),
    ).toBe('Reparent');
    expect(
      el
        .querySelector('.oge-header-cell.oge-checkbox-cell')
        ?.getAttribute('aria-label'),
    ).toBe('Select all');
    expect(
      el.querySelector('.oge-row .oge-drag-handle')?.getAttribute('aria-label'),
    ).toBe('Reparent row');
  });

  it('follows per-instance message overrides', async () => {
    const { el } = await render({
      rowDragging: true,
      messages: {
        reparentColumnHeader: 'Taşı',
        reparentRow: 'Satırı taşı',
        booleanTrueLabel: 'Evet',
        booleanFalseLabel: 'Hayır',
      },
    });
    expect(
      el
        .querySelector('.oge-header-cell.oge-drag-cell')
        ?.getAttribute('aria-label'),
    ).toBe('Taşı');
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

describe('OgeTreeList column resize direction', () => {
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

  it('adds the pointer delta in LTR', async () => {
    expect(await dragHandle(false)).toMatch(/^140px/);
  });

  it('negates the pointer delta in RTL', async () => {
    expect(await dragHandle(true)).toMatch(/^260px/);
  });
});
