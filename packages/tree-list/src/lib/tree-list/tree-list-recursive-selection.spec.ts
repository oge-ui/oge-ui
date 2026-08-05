import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { RowKey } from '@oge-ui/core';
import { OgeColumn } from '@oge-ui/grid';
import { OgeTreeList } from './tree-list';

interface Task {
  id: number;
  parentId: number | null;
  title: string;
}

const TASKS: Task[] = [
  { id: 1, parentId: null, title: 'Root A' },
  { id: 2, parentId: 1, title: 'Child A1' },
  { id: 3, parentId: 1, title: 'Child A2' },
  { id: 4, parentId: 2, title: 'Grand A1a' },
  { id: 5, parentId: null, title: 'Root B' },
];

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function checkboxOf(el: HTMLElement, title: string): HTMLInputElement | null {
  const row = Array.from(el.querySelectorAll<HTMLElement>('.oge-row')).find((entry) =>
    (entry.textContent ?? '').includes(title)
  );
  return row?.querySelector<HTMLInputElement>('.oge-checkbox-cell input') ?? null;
}

@Component({
  imports: [OgeTreeList, OgeColumn],
  template: `
    <oge-tree-list
      [data]="data"
      keyExpr="id"
      parentIdExpr="parentId"
      [autoExpandAll]="true"
      selectionMode="checkbox"
      [selectionRecursive]="true"
      [(selectedKeys)]="selectedKeys"
    >
      <oge-column field="title" />
    </oge-tree-list>
  `,
})
class Host {
  readonly data = TASKS.map((task) => ({ ...task }));
  selectedKeys: RowKey[] = [];
}

describe('OgeTreeList recursive selection', () => {
  async function render() {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    return { fixture, host: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
  }

  it('checking a parent cascades to all descendants', async () => {
    const { fixture, host, el } = await render();
    checkboxOf(el, 'Root A')?.click();
    await settle(fixture);
    expect([...host.selectedKeys].sort()).toEqual([1, 2, 3, 4]);
    expect(checkboxOf(el, 'Grand A1a')?.checked).toBe(true);
  });

  it('unchecking one child turns the ancestors indeterminate', async () => {
    const { fixture, host, el } = await render();
    checkboxOf(el, 'Root A')?.click();
    await settle(fixture);
    checkboxOf(el, 'Child A2')?.click();
    await settle(fixture);
    expect([...host.selectedKeys].sort()).toEqual([2, 4]);
    expect(checkboxOf(el, 'Root A')?.indeterminate).toBe(true);
    expect(checkboxOf(el, 'Child A1')?.checked).toBe(true);
  });

  it('checking every child completes the parent', async () => {
    const { fixture, host, el } = await render();
    checkboxOf(el, 'Child A1')?.click();
    await settle(fixture);
    checkboxOf(el, 'Child A2')?.click();
    await settle(fixture);
    expect(checkboxOf(el, 'Root A')?.checked).toBe(true);
    expect([...host.selectedKeys].sort()).toEqual([1, 2, 3, 4]);
  });

  it('getSelectedRowKeys narrows by mode', async () => {
    const { fixture, el } = await render();
    checkboxOf(el, 'Root A')?.click();
    await settle(fixture);
    const grid = fixture.debugElement.children[0].componentInstance as OgeTreeList<Task>;
    expect(grid.getSelectedRowKeys('all').sort()).toEqual([1, 2, 3, 4]);
    expect(grid.getSelectedRowKeys('leavesOnly').sort()).toEqual([3, 4]);
    expect(grid.getSelectedRowKeys('excludeRecursive')).toEqual([1]);
  });
});
