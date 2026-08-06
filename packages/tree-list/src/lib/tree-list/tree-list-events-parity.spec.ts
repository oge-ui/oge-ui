import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeTreeList } from './tree-list';

interface Node {
  id: number;
  parentId: number | null;
  name: string;
}

const NODES: Node[] = [
  { id: 1, parentId: null, name: 'Root' },
  { id: 2, parentId: 1, name: 'Child A' },
  { id: 3, parentId: 1, name: 'Child B' },
  { id: 4, parentId: null, name: 'Root 2' },
];

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve));
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('OgeTreeList events (DevExtreme events parity)', () => {
  async function render(inputs: Record<string, unknown> = {}): Promise<{
    fixture: ComponentFixture<OgeTreeList<Node>>;
    el: HTMLElement;
    tree: OgeTreeList<Node>;
  }> {
    const fixture = TestBed.createComponent(OgeTreeList<Node>);
    fixture.componentRef.setInput(
      'data',
      NODES.map((node) => ({ ...node })),
    );
    fixture.componentRef.setInput('columns', ['name']);
    for (const [key, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(key, value);
    }
    fixture.detectChanges();
    await settle(fixture);
    return {
      fixture,
      el: fixture.nativeElement as HTMLElement,
      tree: fixture.componentInstance,
    };
  }

  it('selectionChanged reports full state plus diffs', async () => {
    const { fixture, tree } = await render({ selectionMode: 'multiple' });
    const events: unknown[] = [];
    tree.selectionChanged.subscribe((e) => events.push(e));
    tree.selectAll();
    await settle(fixture);
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      selectedKeys: [1, 4],
      addedKeys: [1, 4],
      removedKeys: [],
    });
    tree.deselectAll();
    await settle(fixture);
    expect(events[1]).toMatchObject({ selectedKeys: [], removedKeys: [1, 4] });
  });

  it('focusedRowChanged fires with the row data', async () => {
    const { fixture, tree } = await render({ focusedRowEnabled: true });
    const events: unknown[] = [];
    tree.focusedRowChanged.subscribe((e) => events.push(e));
    tree.navigateToRow(3);
    await settle(fixture);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ key: 3, row: { name: 'Child B' } });
  });

  it('editingStart is cancelable and blocks the cell editor', async () => {
    const { fixture, el, tree } = await render({
      autoExpandAll: true,
      editing: { mode: 'cell', allowUpdating: true },
    });
    tree.editingStart.subscribe((e) => (e.cancel = true));
    const cell = el.querySelector('.oge-row .oge-cell') as HTMLElement;
    cell.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle(fixture);
    expect(el.querySelector('.oge-editor')).toBeNull();
  });

  it('rowRemoving / rowRemoved / savedChanges wrap a batch save', async () => {
    const { fixture, el, tree } = await render({
      autoExpandAll: true,
      editing: { mode: 'batch', allowDeleting: true },
    });
    const log: string[] = [];
    tree.rowRemoving.subscribe((e) => log.push(`removing:${String(e.key)}`));
    tree.rowRemoved.subscribe((e) => log.push(`removed:${String(e.key)}`));
    tree.savedChanges.subscribe((e) => log.push(`saved:${e.changes.length}`));
    tree.deleteRow(4);
    tree.saveChanges();
    await settle(fixture);
    expect(log).toEqual(['removing:4', 'removed:4', 'saved:1']);
    expect(el.querySelectorAll('.oge-row').length).toBe(3);
  });

  it('editCanceled fires once when discarding pending work', async () => {
    const { fixture, tree } = await render({
      autoExpandAll: true,
      editing: { mode: 'batch', allowUpdating: true, allowDeleting: true },
    });
    let canceled = 0;
    tree.editCanceled.subscribe(() => canceled++);
    tree.deleteRow(2);
    await settle(fixture);
    tree.discardChanges();
    await settle(fixture);
    expect(canceled).toBe(1);
  });

  it('cellDblClick fires with cell context', async () => {
    const { fixture, el, tree } = await render({ autoExpandAll: true });
    const events: unknown[] = [];
    tree.cellDblClick.subscribe((e) => events.push(e));
    const cell = el.querySelector('.oge-row .oge-cell') as HTMLElement;
    cell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    fixture.detectChanges();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ key: 1, field: 'name', value: 'Root' });
  });

  it('exporting can cancel the CSV download', async () => {
    const { tree } = await render();
    const created: string[] = [];
    const originalCreate = URL.createObjectURL;
    URL.createObjectURL = () => (created.push('x'), 'blob:test');
    try {
      tree.exporting.subscribe((e) => (e.cancel = true));
      tree.exportCsv();
      expect(created).toHaveLength(0);
    } finally {
      URL.createObjectURL = originalCreate;
    }
  });
});
