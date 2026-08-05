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
  { id: 3, parentId: null, title: 'Root B' },
];

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function pressKey(el: HTMLElement, key: string): void {
  el.querySelector('.oge-viewport')?.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true })
  );
}

function focusFirstCell(el: HTMLElement): void {
  const cell = el.querySelector<HTMLElement>('.oge-row .oge-cell');
  cell?.dispatchEvent(new FocusEvent('focus'));
}

function rowTitles(el: HTMLElement): string[] {
  return Array.from(el.querySelectorAll('.oge-row')).map(
    (row) => row.querySelector('.oge-tree-cell-text')?.textContent?.trim() ?? ''
  );
}

@Component({
  imports: [OgeTreeList, OgeColumn],
  template: `
    <oge-tree-list
      [data]="data"
      keyExpr="id"
      parentIdExpr="parentId"
      [(expandedRowKeys)]="expandedRowKeys"
    >
      <oge-column field="title" />
      <oge-column field="id" dataType="number" />
    </oge-tree-list>
  `,
})
class Host {
  data: Task[] = TASKS.map((task) => ({ ...task }));
  expandedRowKeys: readonly RowKey[] = [];
}

describe('OgeTreeList keyboard navigation', () => {
  async function render() {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    return { fixture, host: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
  }

  it('ArrowRight expands a collapsed expandable row', async () => {
    const { fixture, host, el } = await render();
    focusFirstCell(el);
    await settle(fixture);
    pressKey(el, 'ArrowRight');
    await settle(fixture);
    expect(host.expandedRowKeys).toEqual([1]);
    expect(rowTitles(el)).toEqual(['Root A', 'Child A1', 'Root B']);
  });

  it('ArrowRight on an expanded row moves focus to the first child', async () => {
    const { fixture, el } = await render();
    focusFirstCell(el);
    await settle(fixture);
    pressKey(el, 'ArrowRight'); // expand
    await settle(fixture);
    pressKey(el, 'ArrowRight'); // jump to child
    await settle(fixture);
    const focused = el.querySelector<HTMLElement>('.oge-cell[tabindex="0"]');
    expect(focused?.closest('.oge-row')?.textContent).toContain('Child A1');
  });

  it('ArrowLeft collapses an expanded row, then jumps to the parent from a child', async () => {
    const { fixture, host, el } = await render();
    focusFirstCell(el);
    await settle(fixture);
    pressKey(el, 'ArrowRight'); // expand Root A
    pressKey(el, 'ArrowRight'); // focus Child A1
    await settle(fixture);
    pressKey(el, 'ArrowLeft'); // child (leaf) → jump to parent
    await settle(fixture);
    const focused = el.querySelector<HTMLElement>('.oge-cell[tabindex="0"]');
    expect(focused?.closest('.oge-row')?.textContent).toContain('Root A');
    pressKey(el, 'ArrowLeft'); // parent expanded → collapse
    await settle(fixture);
    expect(host.expandedRowKeys).toEqual([]);
    expect(rowTitles(el)).toEqual(['Root A', 'Root B']);
  });

  it('ArrowDown / ArrowUp move across rows', async () => {
    const { fixture, el } = await render();
    focusFirstCell(el);
    await settle(fixture);
    pressKey(el, 'ArrowDown');
    await settle(fixture);
    const focused = el.querySelector<HTMLElement>('.oge-cell[tabindex="0"]');
    expect(focused?.closest('.oge-row')?.textContent).toContain('Root B');
  });
});
