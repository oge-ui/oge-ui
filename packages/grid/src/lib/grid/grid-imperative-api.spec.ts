import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeGrid } from './grid';

interface Row {
  id: number;
  name: string;
  department: string;
}

const ROWS: Row[] = [
  { id: 1, name: 'Ada', department: 'Eng' },
  { id: 2, name: 'Grace', department: 'Eng' },
  { id: 3, name: 'Erin', department: 'Sales' },
];

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve));
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('OgeGrid imperative API (DevExtreme methods parity)', () => {
  async function render(inputs: Record<string, unknown> = {}): Promise<{
    fixture: ComponentFixture<OgeGrid<Row>>;
    el: HTMLElement;
    grid: OgeGrid<Row>;
  }> {
    const fixture = TestBed.createComponent(OgeGrid<Row>);
    fixture.componentRef.setInput(
      'data',
      ROWS.map((row) => ({ ...row })),
    );
    fixture.componentRef.setInput('columns', ['name', 'department']);
    fixture.componentRef.setInput('keyField', 'id');
    for (const [key, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(key, value);
    }
    fixture.detectChanges();
    await settle(fixture);
    return {
      fixture,
      el: fixture.nativeElement as HTMLElement,
      grid: fixture.componentInstance,
    };
  }

  it('exposes paging getters and setters', async () => {
    const { fixture, el, grid } = await render({ paging: { pageSize: 2 } });
    expect(grid.pageIndex()).toBe(0);
    expect(grid.pageSize()).toBe(2);
    expect(grid.pageCount()).toBe(2);
    expect(grid.totalCount()).toBe(3);
    grid.setPageIndex(5); // clamped to the last page
    await settle(fixture);
    expect(grid.pageIndex()).toBe(1);
    expect(el.querySelectorAll('.oge-row').length).toBe(1);
    grid.setPageSize(0); // paging off
    await settle(fixture);
    expect(grid.pageSize()).toBe(0);
    expect(el.querySelectorAll('.oge-row').length).toBe(3);
  });

  it('selectAll / clearSelection / isRowSelected / getSelectedRowsData', async () => {
    const { fixture, grid } = await render({
      paging: { pageSize: 2 },
      selectionMode: 'multiple',
    });
    grid.selectAll(); // default allPages scope loads every page
    await settle(fixture);
    expect(grid.getSelectedRowsData().map((row) => row.name)).toEqual([
      'Ada',
      'Grace',
    ]); // loaded rows of the current page
    expect(grid.isRowSelected(3)).toBe(true);
    expect(grid.selectedKeys()).toHaveLength(3);
    grid.deselectAll();
    await settle(fixture);
    expect(grid.isRowSelected(1)).toBe(false);
    expect(grid.getSelectedRowsData()).toEqual([]);
  });

  it('getVisibleRows and getRowByKey read the rendered view', async () => {
    const { grid } = await render({ paging: { pageSize: 2 } });
    expect(grid.getVisibleRows().map((row) => row.name)).toEqual([
      'Ada',
      'Grace',
    ]);
    expect(grid.getRowByKey(2)?.name).toBe('Grace');
    expect(grid.getRowByKey(999)).toBeUndefined();
  });

  it('expandRow / collapseRow / isRowExpanded work on group rows', async () => {
    const { fixture, el, grid } = await render({ groupBy: ['department'] });
    const groupKeys = [
      ...(
        grid as unknown as { collectGroupKeys(): Set<unknown> }
      ).collectGroupKeys(),
    ];
    expect(groupKeys.length).toBe(2);
    const key = groupKeys[0] as string | number;
    expect(grid.isRowExpanded(key)).toBe(true);
    grid.collapseRow(key);
    await settle(fixture);
    expect(grid.isRowExpanded(key)).toBe(false);
    expect(el.querySelectorAll('.oge-row').length).toBe(1); // Sales only
    grid.expandRow(key);
    await settle(fixture);
    expect(grid.isRowExpanded(key)).toBe(true);
    expect(el.querySelectorAll('.oge-row').length).toBe(3);
  });

  it('navigateToRow scrolls and focuses the row when focusedRowEnabled', async () => {
    const { fixture, grid } = await render({ focusedRowEnabled: true });
    grid.navigateToRow(3);
    await settle(fixture);
    expect(grid.focusedRowKey()).toBe(3);
  });

  it('beginCustomLoading shows the load panel regardless of loadPanel', async () => {
    const { fixture, el, grid } = await render();
    expect(el.querySelector('.oge-load-panel')).toBeNull();
    grid.beginCustomLoading('Crunching…');
    await settle(fixture);
    expect(el.querySelector('.oge-load-panel')?.textContent).toContain(
      'Crunching…',
    );
    expect(el.classList.contains('oge-loading')).toBe(true);
    grid.endCustomLoading();
    await settle(fixture);
    expect(el.querySelector('.oge-load-panel')).toBeNull();
  });

  it('deleteRow stages in batch mode; saveChanges persists; discardChanges reverts', async () => {
    const { fixture, el, grid } = await render({
      editing: { mode: 'batch', allowUpdating: true, allowDeleting: true },
    });
    expect(grid.hasChanges()).toBe(false);
    grid.deleteRow(2);
    await settle(fixture);
    expect(grid.hasChanges()).toBe(true);
    grid.discardChanges();
    await settle(fixture);
    expect(grid.hasChanges()).toBe(false);
    expect(el.querySelectorAll('.oge-row').length).toBe(3);
    grid.deleteRow(2);
    grid.saveChanges();
    await settle(fixture);
    expect(grid.hasChanges()).toBe(false);
    expect(el.querySelectorAll('.oge-row').length).toBe(2);
  });

  it('addRow and editRow open editors and honor the allow flags', async () => {
    const { fixture, grid } = await render({
      editing: { mode: 'row', allowUpdating: true, allowAdding: true },
    });
    const editing = (
      grid as unknown as {
        store: { editing: { editRowKey(): unknown } };
      }
    ).store.editing;
    grid.editRow(2);
    await settle(fixture);
    expect(editing.editRowKey()).toBe(2);
    grid.discardChanges();
    await settle(fixture);
    expect(editing.editRowKey()).toBeNull();
    grid.addRow();
    await settle(fixture);
    expect(grid.hasChanges()).toBe(true);
    grid.discardChanges();
    // allowDeleting is off → deleteRow must be a guarded no-op
    grid.deleteRow(1);
    await settle(fixture);
    expect(grid.hasChanges()).toBe(false);
  });
});
