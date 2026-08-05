import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { TreeFilterMode } from '@oge-ui/core';
import { OgeColumn } from '@oge-ui/grid';
import { OgeTreeList } from './tree-list';

interface Task {
  id: number;
  parentId: number | null;
  title: string;
}

const TASKS: Task[] = [
  { id: 1, parentId: null, title: 'Alpha' },
  { id: 2, parentId: 1, title: 'Beta' },
  { id: 3, parentId: 2, title: 'Gamma' },
  { id: 4, parentId: 1, title: 'Delta' },
  { id: 5, parentId: null, title: 'Epsilon' },
];

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function rowTitles(el: HTMLElement): string[] {
  return Array.from(el.querySelectorAll('.oge-row')).map(
    (row) => row.querySelector('.oge-tree-cell-text')?.textContent?.trim() ?? ''
  );
}

async function typeFilter(
  fixture: ComponentFixture<unknown>,
  el: HTMLElement,
  text: string
): Promise<void> {
  const input = el.querySelector<HTMLInputElement>('.oge-filter-input');
  if (!input) throw new Error('filter input not found');
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await settle(fixture);
}

@Component({
  imports: [OgeTreeList, OgeColumn],
  template: `
    <oge-tree-list
      [data]="data"
      keyExpr="id"
      parentIdExpr="parentId"
      [autoExpandAll]="true"
      [filterRow]="true"
      [filterDebounce]="0"
      [filterMode]="filterMode"
      [searchPanel]="true"
    >
      <oge-column field="title" />
    </oge-tree-list>
  `,
})
class Host {
  data: Task[] = TASKS.map((task) => ({ ...task }));
  filterMode: TreeFilterMode = 'withAncestors';
}

describe('OgeTreeList filtering', () => {
  async function render(configure?: (host: Host) => void) {
    const fixture = TestBed.createComponent(Host);
    configure?.(fixture.componentInstance);
    await settle(fixture);
    return { fixture, host: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
  }

  it('withAncestors keeps the ancestor chain of matches visible', async () => {
    const { fixture, el } = await render();
    await typeFilter(fixture, el, 'Gamma');
    expect(rowTitles(el)).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('fullBranch also keeps the descendants of matches', async () => {
    const { fixture, el } = await render((host) => (host.filterMode = 'fullBranch'));
    await typeFilter(fixture, el, 'Beta');
    expect(rowTitles(el)).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('clearing the filter restores every row', async () => {
    const { fixture, el } = await render();
    await typeFilter(fixture, el, 'Gamma');
    await typeFilter(fixture, el, '');
    expect(rowTitles(el)).toEqual(['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon']);
  });

  it('the search panel matches any visible column and keeps ancestors', async () => {
    const { fixture, el } = await render();
    const search = el.querySelector<HTMLInputElement>('.oge-search-input');
    expect(search).toBeTruthy();
    if (!search) return;
    search.value = 'delta';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(fixture);
    expect(rowTitles(el)).toEqual(['Alpha', 'Delta']);
  });

  it('no match renders the no-data block', async () => {
    const { fixture, el } = await render();
    await typeFilter(fixture, el, 'Zeta');
    expect(rowTitles(el)).toEqual([]);
    expect(el.querySelector('.oge-no-data')).toBeTruthy();
  });
});
