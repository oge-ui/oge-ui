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

describe('OgeTreeList imperative API (DevExtreme methods parity)', () => {
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

  it('navigateToRow expands the ancestor path and focuses the row', async () => {
    const { fixture, el, tree } = await render({ focusedRowEnabled: true });
    expect(el.querySelectorAll('.oge-row').length).toBe(2); // collapsed roots
    tree.navigateToRow(3);
    await settle(fixture);
    expect(tree.isRowExpanded(1)).toBe(true);
    expect(tree.focusedRowKey()).toBe(3);
    expect(el.querySelectorAll('.oge-row').length).toBe(4);
  });

  it('selectAll / clearSelection / getSelectedRowsData respect visibility', async () => {
    const { fixture, tree } = await render({ selectionMode: 'multiple' });
    tree.selectAll(); // only the visible (collapsed) roots
    await settle(fixture);
    expect(tree.getSelectedRowsData().map((row) => row.name)).toEqual([
      'Root',
      'Root 2',
    ]);
    expect(tree.isRowSelected(1)).toBe(true);
    expect(tree.isRowSelected(2)).toBe(false);
    tree.deselectAll();
    await settle(fixture);
    expect(tree.getSelectedRowsData()).toEqual([]);
  });

  it('recursive selectAll cascades to descendants and modes narrow the report', async () => {
    const { fixture, tree } = await render({
      selectionMode: 'checkbox',
      selectionRecursive: true,
    });
    tree.selectAll();
    await settle(fixture);
    expect(tree.getSelectedRowKeys('all')).toHaveLength(4);
    expect(tree.getSelectedRowsData('leavesOnly').map((row) => row.id)).toEqual(
      [2, 3, 4],
    );
  });

  it('copyToClipboard writes the selected rows as TSV', async () => {
    const written: string[] = [];
    Object.assign(navigator, {
      clipboard: {
        writeText: (text: string) => (written.push(text), Promise.resolve()),
      },
    });
    const { fixture, tree } = await render({ selectionMode: 'multiple' });
    tree.selectAll();
    await settle(fixture);
    await tree.copyToClipboard();
    expect(written).toHaveLength(1);
    expect(written[0]).toContain('Root\tRoot 2'.split('\t')[0]);
    expect(written[0].split('\r\n')).toHaveLength(3); // header + 2 rows
  });

  it('exposes paging getters and setters over the visible rows', async () => {
    const { fixture, el, tree } = await render({
      autoExpandAll: true,
      paging: { pageSize: 2 },
    });
    expect(tree.pageCount()).toBe(2);
    expect(tree.pageSize()).toBe(2);
    expect(tree.totalCount()).toBe(4);
    tree.setPageIndex(9); // clamped
    await settle(fixture);
    expect(tree.pageIndex()).toBe(1);
    expect(el.querySelectorAll('.oge-row').length).toBe(2);
    tree.setPageSize(0); // "all"
    await settle(fixture);
    expect(el.querySelectorAll('.oge-row').length).toBe(4);
  });

  it('beginCustomLoading shows the load panel regardless of loadPanel', async () => {
    const { fixture, el, tree } = await render();
    expect(el.querySelector('.oge-load-panel')).toBeNull();
    tree.beginCustomLoading();
    await settle(fixture);
    expect(el.querySelector('.oge-load-panel')?.textContent).toContain(
      'Loading',
    );
    tree.endCustomLoading();
    await settle(fixture);
    expect(el.querySelector('.oge-load-panel')).toBeNull();
  });

  it('editRow / deleteRow / hasChanges / saveChanges / discardChanges', async () => {
    const { fixture, el, tree } = await render({
      autoExpandAll: true,
      editing: { mode: 'batch', allowUpdating: true, allowDeleting: true },
    });
    expect(tree.hasChanges()).toBe(false);
    tree.deleteRow(4);
    await settle(fixture);
    expect(tree.hasChanges()).toBe(true);
    tree.discardChanges();
    await settle(fixture);
    expect(tree.hasChanges()).toBe(false);
    tree.deleteRow(4);
    tree.saveChanges();
    await settle(fixture);
    expect(tree.hasChanges()).toBe(false);
    expect(el.querySelectorAll('.oge-row').length).toBe(3);
    // allowUpdating drives editRow
    const editing = (
      tree as unknown as { store: { editing: { editRowKey(): unknown } } }
    ).store.editing;
    tree.editRow(2);
    await settle(fixture);
    // batch mode has no row editor — editRow is only effective in row/form modes
    expect(editing.editRowKey()).toBe(2);
  });
});
