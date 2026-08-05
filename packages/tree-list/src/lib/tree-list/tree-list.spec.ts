import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { RowKey } from '@oge-ui/core';
import { OgeColumn } from '@oge-ui/grid';
import { OgeTreeList } from './tree-list';

interface Task {
  id: number;
  parentId: number | null;
  title: string;
  order: number;
}

const TASKS: Task[] = [
  { id: 1, parentId: null, title: 'Root A', order: 2 },
  { id: 2, parentId: 1, title: 'Child A1', order: 2 },
  { id: 3, parentId: 2, title: 'Grand A1a', order: 1 },
  { id: 4, parentId: 1, title: 'Child A2', order: 1 },
  { id: 5, parentId: null, title: 'Root B', order: 1 },
];

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function rowTitles(el: HTMLElement): string[] {
  return Array.from(el.querySelectorAll('.oge-row')).map(
    (row) =>
      row.querySelector('.oge-tree-cell-text')?.textContent?.trim() ?? '',
  );
}

function rowByTitle(el: HTMLElement, title: string): HTMLElement | undefined {
  return Array.from(el.querySelectorAll<HTMLElement>('.oge-row')).find((row) =>
    (row.querySelector('.oge-tree-cell-text')?.textContent ?? '').includes(
      title,
    ),
  );
}

@Component({
  imports: [OgeTreeList, OgeColumn],
  template: `
    <oge-tree-list
      [data]="data"
      keyExpr="id"
      parentIdExpr="parentId"
      [autoExpandAll]="autoExpandAll"
      [(expandedRowKeys)]="expandedRowKeys"
    >
      <oge-column field="title" />
      <oge-column field="order" dataType="number" />
    </oge-tree-list>
  `,
})
class Host {
  data: Task[] = TASKS.map((task) => ({ ...task }));
  autoExpandAll = false;
  expandedRowKeys: readonly RowKey[] = [];
}

describe('OgeTreeList', () => {
  async function render(configure?: (host: Host) => void) {
    const fixture = TestBed.createComponent(Host);
    configure?.(fixture.componentInstance);
    await settle(fixture);
    return {
      fixture,
      host: fixture.componentInstance,
      el: fixture.nativeElement as HTMLElement,
    };
  }

  it('renders only the roots when collapsed by default', async () => {
    const { el } = await render();
    expect(rowTitles(el)).toEqual(['Root A', 'Root B']);
    expect(el.querySelector('.oge-viewport')?.getAttribute('role')).toBe(
      'treegrid',
    );
  });

  it('shows an expander only on rows with children', async () => {
    const { el } = await render();
    const rootA = rowByTitle(el, 'Root A');
    const rootB = rowByTitle(el, 'Root B');
    expect(rootA?.querySelector('.oge-tree-expander')).toBeTruthy();
    expect(rootB?.querySelector('.oge-tree-expander')).toBeNull();
    expect(rootB?.querySelector('.oge-tree-expander-spacer')).toBeTruthy();
  });

  it('expands and collapses via the expander and updates expandedRowKeys', async () => {
    const { fixture, host, el } = await render();
    rowByTitle(el, 'Root A')
      ?.querySelector<HTMLButtonElement>('.oge-tree-expander')
      ?.click();
    await settle(fixture);
    expect(rowTitles(el)).toEqual(['Root A', 'Child A1', 'Child A2', 'Root B']);
    expect(host.expandedRowKeys).toEqual([1]);
    rowByTitle(el, 'Root A')
      ?.querySelector<HTMLButtonElement>('.oge-tree-expander')
      ?.click();
    await settle(fixture);
    expect(rowTitles(el)).toEqual(['Root A', 'Root B']);
    expect(host.expandedRowKeys).toEqual([]);
  });

  it('autoExpandAll renders the whole hierarchy', async () => {
    const { el } = await render((host) => (host.autoExpandAll = true));
    expect(rowTitles(el)).toEqual([
      'Root A',
      'Child A1',
      'Grand A1a',
      'Child A2',
      'Root B',
    ]);
  });

  it('preset expandedRowKeys expand the matching rows', async () => {
    const { el } = await render((host) => (host.expandedRowKeys = [1, 2]));
    expect(rowTitles(el)).toEqual([
      'Root A',
      'Child A1',
      'Grand A1a',
      'Child A2',
      'Root B',
    ]);
  });

  it('indents by level and exposes treegrid ARIA attributes', async () => {
    const { el } = await render((host) => (host.autoExpandAll = true));
    const grand = rowByTitle(el, 'Grand A1a');
    expect(grand?.getAttribute('aria-level')).toBe('3');
    expect(grand?.getAttribute('aria-posinset')).toBe('1');
    expect(grand?.getAttribute('aria-setsize')).toBe('1');
    const indent = grand?.querySelector<HTMLElement>('.oge-tree-indent');
    expect(indent?.style.inlineSize).toBe('40px');
    const rootA = rowByTitle(el, 'Root A');
    expect(rootA?.getAttribute('aria-level')).toBe('1');
    expect(rootA?.getAttribute('aria-expanded')).toBe('true');
    expect(rowByTitle(el, 'Root B')?.getAttribute('aria-expanded')).toBeNull();
  });

  it('sorts siblings within their parent, preserving the hierarchy', async () => {
    const { fixture, el } = await render((host) => (host.autoExpandAll = true));
    const orderHeader = Array.from(
      el.querySelectorAll<HTMLElement>('.oge-header-cell'),
    ).find((cell) => cell.textContent?.includes('Order'));
    orderHeader?.click();
    await settle(fixture);
    // asc by "order": Root B (1) before Root A (2); Child A2 (1) before Child A1 (2)
    expect(rowTitles(el)).toEqual([
      'Root B',
      'Root A',
      'Child A2',
      'Child A1',
      'Grand A1a',
    ]);
    expect(orderHeader?.getAttribute('aria-sort')).toBe('ascending');
  });

  it('discards orphan rows by default', async () => {
    const { el } = await render((host) => {
      host.data = [
        ...TASKS.map((task) => ({ ...task })),
        { id: 9, parentId: 99, title: 'Orphan', order: 1 },
      ];
      host.autoExpandAll = true;
    });
    expect(rowTitles(el)).not.toContain('Orphan');
  });

  it('shows the no-data block for an empty tree', async () => {
    const { el } = await render((host) => (host.data = []));
    expect(el.querySelector('.oge-no-data')).toBeTruthy();
  });
});
