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

describe('OgeGrid events (DevExtreme events parity)', () => {
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

  it('selectionChanged reports full state plus added/removed diffs', async () => {
    const { fixture, el, grid } = await render({ selectionMode: 'multiple' });
    const events: unknown[] = [];
    grid.selectionChanged.subscribe((e) => events.push(e));
    const rows = el.querySelectorAll('.oge-row');
    rows[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle(fixture);
    rows[1].dispatchEvent(
      new MouseEvent('click', { bubbles: true, ctrlKey: true }),
    );
    await settle(fixture);
    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({
      selectedKeys: [1],
      addedKeys: [1],
      removedKeys: [],
    });
    expect(events[1]).toEqual({
      selectedKeys: [1, 2],
      addedKeys: [2],
      removedKeys: [],
    });
    grid.clearSelection();
    await settle(fixture);
    expect(events[2]).toMatchObject({ selectedKeys: [], removedKeys: [1, 2] });
  });

  it('focusedRowChanged fires with the row data on focus moves', async () => {
    const { fixture, el, grid } = await render({ focusedRowEnabled: true });
    const events: unknown[] = [];
    grid.focusedRowChanged.subscribe((e) => events.push(e));
    el.querySelector('.oge-row')?.dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    await settle(fixture);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ key: 1, row: { name: 'Ada' } });
    grid.navigateToRow(3);
    await settle(fixture);
    expect(events[1]).toMatchObject({ key: 3, row: { name: 'Erin' } });
  });

  it('editingStart is cancelable and blocks the cell editor', async () => {
    const { fixture, el, grid } = await render({
      editing: { mode: 'cell', allowUpdating: true },
    });
    let cancelNext = true;
    const seen: unknown[] = [];
    grid.editingStart.subscribe((e) => {
      seen.push({ key: e.key, field: e.field });
      e.cancel = cancelNext;
    });
    const cell = el.querySelector('.oge-row .oge-cell') as HTMLElement;
    cell.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle(fixture);
    expect(seen).toEqual([{ key: 1, field: 'name' }]);
    expect(el.querySelector('.oge-editor')).toBeNull();
    cancelNext = false;
    cell.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle(fixture);
    expect(el.querySelector('.oge-editor')).not.toBeNull();
  });

  it('rowRemoving / rowRemoved / savedChanges fire around a save, and cancel skips it', async () => {
    const { fixture, el, grid } = await render({
      editing: { mode: 'batch', allowDeleting: true },
    });
    const log: string[] = [];
    let cancel = true;
    grid.rowRemoving.subscribe((e) => {
      log.push(`removing:${String(e.key)}:${(e.row as Row | undefined)?.name}`);
      e.cancel = cancel;
    });
    grid.rowRemoved.subscribe((e) => log.push(`removed:${String(e.key)}`));
    grid.savedChanges.subscribe((e) => log.push(`saved:${e.changes.length}`));
    grid.deleteRow(2);
    grid.saveChanges();
    await settle(fixture);
    expect(log).toEqual(['removing:2:Grace']); // canceled — nothing applied
    expect(el.querySelectorAll('.oge-row').length).toBe(3);
    cancel = false;
    grid.deleteRow(2);
    grid.saveChanges();
    await settle(fixture);
    expect(log.slice(1)).toEqual(['removing:2:Grace', 'removed:2', 'saved:1']);
    expect(el.querySelectorAll('.oge-row').length).toBe(2);
  });

  it('initNewRow prefills the added row and editCanceled fires on discard', async () => {
    const { fixture, grid } = await render({
      editing: { mode: 'row', allowUpdating: true, allowAdding: true },
    });
    let canceled = 0;
    grid.editCanceled.subscribe(() => canceled++);
    grid.initNewRow.subscribe((e) => (e.values['name'] = 'Prefilled'));
    grid.addRow();
    await settle(fixture);
    const editing = (
      grid as unknown as {
        store: {
          editing: {
            added(): readonly unknown[];
            changes(): ReadonlyMap<unknown, Record<string, unknown>>;
          };
        };
      }
    ).store.editing;
    const newKey = editing.added()[0];
    expect(editing.changes().get(newKey)).toMatchObject({ name: 'Prefilled' });
    grid.discardChanges();
    await settle(fixture);
    expect(canceled).toBe(1);
    expect(grid.hasChanges()).toBe(false);
  });

  it('cellDblClick fires with cell context (named output, no double-fire)', async () => {
    const { fixture, el, grid } = await render();
    const cellEvents: unknown[] = [];
    grid.cellDblClick.subscribe((e) => cellEvents.push(e));
    const cell = el.querySelector('.oge-row .oge-cell') as HTMLElement;
    cell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    fixture.detectChanges();
    expect(cellEvents).toHaveLength(1);
    expect(cellEvents[0]).toMatchObject({
      key: 1,
      field: 'name',
      value: 'Ada',
    });
  });

  it('exporting is cancelable and can rename the file', async () => {
    const { grid } = await render();
    const created: string[] = [];
    const originalCreate = URL.createObjectURL;
    URL.createObjectURL = () => (created.push('x'), 'blob:test');
    const originalRevoke = URL.revokeObjectURL;
    URL.revokeObjectURL = () => undefined;
    try {
      grid.exporting.subscribe((e) => (e.cancel = true));
      await grid.exportCsv();
      expect(created).toHaveLength(0); // canceled before any blob work
    } finally {
      URL.createObjectURL = originalCreate;
      URL.revokeObjectURL = originalRevoke;
    }
  });

  it('dataErrorOccurred surfaces DataSource load failures', async () => {
    const fixture = TestBed.createComponent(OgeGrid<Row>);
    const errors: unknown[] = [];
    fixture.componentInstance.dataErrorOccurred.subscribe((e) =>
      errors.push(e.error),
    );
    fixture.componentRef.setInput('columns', ['name']);
    fixture.componentRef.setInput('keyField', 'id');
    fixture.componentRef.setInput('data', {
      load: () => Promise.reject(new Error('boom')),
      keyOf: (row: Row) => row.id,
    });
    fixture.detectChanges();
    await settle(fixture);
    expect(errors).toHaveLength(1);
    expect((errors[0] as Error).message).toBe('boom');
  });
});
