import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { RowKey } from '@oge-ui/core';
import { OgeColumn, type OgeEditingOptions } from '@oge-ui/grid';
import {
  OgeTreeList,
  type OgeTreeInitNewRowEvent,
  type OgeTreeRowTogglingEvent,
} from './tree-list';

interface Task {
  id: number;
  parentId: number | null;
  title: string;
  effort: number;
}

const TASKS: Task[] = [
  { id: 1, parentId: null, title: 'Root A', effort: 5 },
  { id: 2, parentId: 1, title: 'Child A1', effort: 3 },
  { id: 3, parentId: 2, title: 'Grand A1a', effort: 1 },
  { id: 4, parentId: null, title: 'Root B', effort: 2 },
];

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function rowTitles(el: HTMLElement): string[] {
  return Array.from(el.querySelectorAll('.oge-row:not(.oge-form-row)')).map(
    (row) =>
      row.querySelector('.oge-tree-cell-text')?.textContent?.trim() ?? '',
  );
}

@Component({
  imports: [OgeTreeList, OgeColumn],
  template: `
    <oge-tree-list
      [data]="data"
      keyExpr="id"
      parentIdExpr="parentId"
      [editing]="editing"
      selectionMode="checkbox"
      [allowSelectAll]="allowSelectAll"
      [focusedRowEnabled]="true"
      [(focusedRowKey)]="focusedRowKey"
      [autoNavigateToFocusedRow]="true"
      (rowExpanding)="onExpanding($event)"
      (initNewRow)="onInitNewRow($event)"
    >
      <oge-column field="title" caption="Title" />
      <oge-column field="effort" caption="Effort" dataType="number" />
    </oge-tree-list>
  `,
})
class Host {
  readonly data = TASKS.map((task) => ({ ...task }));
  editing: false | OgeEditingOptions = false;
  allowSelectAll = true;
  readonly focusedRowKey = signal<RowKey | null>(null);
  vetoExpand = false;
  onExpanding(event: OgeTreeRowTogglingEvent<Task>): void {
    if (this.vetoExpand) event.cancel = true;
  }
  prefill: Record<string, unknown> = {};
  lastInit: OgeTreeInitNewRowEvent | null = null;
  onInitNewRow(event: OgeTreeInitNewRowEvent): void {
    this.lastInit = event;
    Object.assign(event.values, this.prefill);
  }
}

describe('OgeTreeList API & events wave', () => {
  async function render(configure?: (host: Host) => void) {
    const fixture = TestBed.createComponent(Host);
    configure?.(fixture.componentInstance);
    await settle(fixture);
    const grid = fixture.debugElement.children[0]
      .componentInstance as OgeTreeList<Task>;
    return {
      fixture,
      host: fixture.componentInstance,
      el: fixture.nativeElement as HTMLElement,
      grid,
    };
  }

  it('rowExpanding can veto a UI toggle', async () => {
    const { fixture, host, el } = await render();
    host.vetoExpand = true;
    el.querySelector<HTMLButtonElement>('.oge-tree-expander')?.click();
    await settle(fixture);
    expect(rowTitles(el)).toEqual(['Root A', 'Root B']); // still collapsed
    host.vetoExpand = false;
    el.querySelector<HTMLButtonElement>('.oge-tree-expander')?.click();
    await settle(fixture);
    expect(rowTitles(el)).toContain('Child A1');
  });

  it('autoNavigateToFocusedRow expands the ancestor chain of the focused key', async () => {
    const { fixture, host, el } = await render();
    expect(rowTitles(el)).toEqual(['Root A', 'Root B']);
    host.focusedRowKey.set(3); // Grand A1a, two collapsed levels deep
    await settle(fixture);
    expect(rowTitles(el)).toEqual([
      'Root A',
      'Child A1',
      'Grand A1a',
      'Root B',
    ]);
    expect(
      el.querySelector('.oge-row-focused .oge-tree-cell-text')?.textContent,
    ).toContain('Grand A1a');
  });

  it('allowSelectAll: false hides the header checkbox', async () => {
    const { el } = await render((host) => (host.allowSelectAll = false));
    expect(
      el.querySelector('.oge-header-cell.oge-checkbox-cell input'),
    ).toBeNull();
  });

  it('initNewRow prefills the added row before its editors open', async () => {
    const { fixture, host, el, grid } = await render((h) => {
      h.editing = { mode: 'row', allowUpdating: true, allowAdding: true };
      h.prefill = { title: 'Prefilled', effort: 9 };
    });
    grid.addRow(1);
    await settle(fixture);
    expect(host.lastInit).toMatchObject({ parentKey: 1 });
    const editors = el.querySelectorAll<HTMLInputElement>(
      '.oge-editor .oge-input-native',
    );
    expect(editors[0].value).toBe('Prefilled');
    expect(editors[1].value).toBe('9');
  });

  it('formItems narrows and labels the form fields; formColCount sets the grid', async () => {
    const { fixture, el } = await render((h) => {
      h.editing = {
        mode: 'form',
        allowUpdating: true,
        formItems: [{ field: 'effort', label: 'Effort (days)', colSpan: 2 }],
        formColCount: 2,
      };
    });
    el.querySelector<HTMLButtonElement>('.oge-command-btn')?.click();
    await settle(fixture);
    const labels = Array.from(el.querySelectorAll('.oge-form-label')).map(
      (label) => label.textContent?.trim(),
    );
    expect(labels).toEqual(['Effort (days)']);
    const fields = el.querySelector<HTMLElement>('.oge-form-fields');
    expect(fields?.style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))');
    const field = el.querySelector<HTMLElement>('.oge-form-field');
    expect(field?.style.gridColumn).toBe('span 2');
  });

  it('forEachNode visits every loaded row and getVisibleRows returns the page', async () => {
    const { grid } = await render();
    const visited: RowKey[] = [];
    grid.forEachNode((_row, key) => visited.push(key));
    expect(visited.sort()).toEqual([1, 2, 3, 4]);
    // collapsed tree: only the roots are visible
    expect(grid.getVisibleRows().map((row) => row.id)).toEqual([1, 4]);
  });
});
