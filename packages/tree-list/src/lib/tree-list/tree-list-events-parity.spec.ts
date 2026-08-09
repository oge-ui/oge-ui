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

describe('OgeTreeList events (reference events parity)', () => {
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

  it('rowClick / rowDblClick / cellClick fire with row and cell context', async () => {
    const { fixture, el, tree } = await render({ autoExpandAll: true });
    const log: unknown[] = [];
    tree.cellClick.subscribe((e) =>
      log.push(['cellClick', e.key, e.field, e.value]),
    );
    tree.rowClick.subscribe((e) =>
      log.push(['rowClick', e.key, e.row.name, e.event instanceof MouseEvent]),
    );
    tree.rowDblClick.subscribe((e) => log.push(['rowDblClick', e.key]));
    const cell = el
      .querySelectorAll('.oge-row')[1]
      .querySelector('.oge-cell') as HTMLElement;
    cell.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle(fixture);
    cell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await settle(fixture);
    expect(log).toEqual([
      ['cellClick', 2, 'name', 'Child A'], // cell handler runs before the row's
      ['rowClick', 2, 'Child A', true],
      ['rowDblClick', 2],
    ]);
  });

  it('rowExpanded / rowCollapsed report the toggled row; rowCollapsing can veto', async () => {
    const { fixture, el, tree } = await render();
    const log: unknown[] = [];
    let cancelCollapse = true;
    tree.rowExpanded.subscribe((e) =>
      log.push(['expanded', e.key, e.row.name]),
    );
    tree.rowCollapsing.subscribe((e) => {
      log.push(['collapsing', e.key, e.row.name]);
      e.cancel = cancelCollapse;
    });
    tree.rowCollapsed.subscribe((e) => log.push(['collapsed', e.key]));
    const expander = (): HTMLButtonElement | null =>
      el.querySelector<HTMLButtonElement>('.oge-tree-expander');
    expander()?.click();
    await settle(fixture);
    expect(log).toEqual([['expanded', 1, 'Root']]);
    expect(el.querySelectorAll('.oge-row')).toHaveLength(4);
    expander()?.click(); // canceled collapse — stays expanded, no rowCollapsed
    await settle(fixture);
    expect(log.slice(1)).toEqual([['collapsing', 1, 'Root']]);
    expect(el.querySelectorAll('.oge-row')).toHaveLength(4);
    cancelCollapse = false;
    expander()?.click();
    await settle(fixture);
    expect(log.slice(2)).toEqual([
      ['collapsing', 1, 'Root'],
      ['collapsed', 1],
    ]);
    expect(el.querySelectorAll('.oge-row')).toHaveLength(2);
  });

  it('savingChanges reports the change set and cancel blocks the save', async () => {
    const { fixture, el, tree } = await render({
      autoExpandAll: true,
      editing: { mode: 'batch', allowDeleting: true },
    });
    const events: unknown[] = [];
    const saved: number[] = [];
    let cancel = true;
    tree.savingChanges.subscribe((e) => {
      events.push(e.changes);
      e.cancel = cancel;
    });
    tree.savedChanges.subscribe((e) => saved.push(e.changes.length));
    tree.deleteRow(4);
    tree.saveChanges();
    await settle(fixture);
    await settle(fixture);
    expect(events).toEqual([[{ type: 'remove', key: 4 }]]);
    expect(saved).toEqual([]); // canceled — nothing applied
    expect(el.querySelectorAll('.oge-row')).toHaveLength(4);
    cancel = false;
    tree.saveChanges(); // the canceled change set is still pending
    await settle(fixture);
    await settle(fixture);
    expect(events[1]).toEqual([{ type: 'remove', key: 4 }]);
    expect(saved).toEqual([1]);
    expect(el.querySelectorAll('.oge-row')).toHaveLength(3);
  });

  it('contentReady fires after the initial render and again on a data swap', async () => {
    const fixture = TestBed.createComponent(OgeTreeList<Node>);
    let ready = 0;
    fixture.componentInstance.contentReady.subscribe(() => ready++);
    fixture.componentRef.setInput(
      'data',
      NODES.map((node) => ({ ...node })),
    );
    fixture.componentRef.setInput('columns', ['name']);
    fixture.detectChanges();
    await expect
      .poll(async () => {
        await settle(fixture);
        return ready;
      })
      .toBeGreaterThan(0);
    const initial = ready;
    fixture.componentRef.setInput(
      'data',
      NODES.slice(0, 1).map((node) => ({ ...node })),
    );
    await expect
      .poll(async () => {
        await settle(fixture);
        return ready;
      })
      .toBeGreaterThan(initial);
  });

  it('stateChange emits a debounced snapshot carrying the toggled expansion', async () => {
    const { fixture, el, tree } = await render();
    const snapshots: unknown[] = [];
    tree.stateChange.subscribe((snapshot) => snapshots.push(snapshot));
    el.querySelector<HTMLButtonElement>('.oge-tree-expander')?.click();
    await settle(fixture);
    // the persistence layer debounces the notification — poll instead of sleeping
    await expect.poll(() => snapshots.length).toBeGreaterThan(0);
    expect(snapshots[0]).toMatchObject({ expansion: { toggled: [1] } });
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
