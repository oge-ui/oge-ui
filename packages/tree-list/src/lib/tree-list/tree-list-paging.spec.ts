import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeColumn } from '@oge-ui/grid';
import { OgeTreeList } from './tree-list';

interface Task {
  id: number;
  parentId: number | null;
  title: string;
}

/** 6 roots, each with 2 children = 18 rows. */
function makeTasks(): Task[] {
  const rows: Task[] = [];
  let id = 1;
  for (let root = 0; root < 6; root++) {
    const rootId = id;
    id += 1;
    rows.push({ id: rootId, parentId: null, title: `Root ${root + 1}` });
    for (let child = 0; child < 2; child++) {
      rows.push({ id, parentId: rootId, title: `Node ${rootId}.${child + 1}` });
      id += 1;
    }
  }
  return rows;
}

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
      [paging]="{ pageSize: 5, pageSizes: [5, 10, 'all'] }"
    >
      <oge-column field="title" />
    </oge-tree-list>
  `,
})
class Host {
  readonly data = makeTasks();
}

describe('OgeTreeList paging', () => {
  async function render() {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('renders one page of the flattened rows plus the pager', async () => {
    const { el } = await render();
    expect(rowTitles(el)).toEqual([
      'Root 1',
      'Node 1.1',
      'Node 1.2',
      'Root 2',
      'Node 4.1',
    ]);
    expect(el.querySelector('.oge-pager')).toBeTruthy();
    // 18 visible rows / 5 per page = 4 pages
    const pages = Array.from(el.querySelectorAll('.oge-pager-btn')).map(
      (button) => button.textContent?.trim(),
    );
    expect(pages).toContain('4');
  });

  it('navigating pages shows the next slice', async () => {
    const { fixture, el } = await render();
    const next = Array.from(
      el.querySelectorAll<HTMLButtonElement>('.oge-pager-btn'),
    ).find((button) => button.textContent?.trim() === '2');
    next?.click();
    await settle(fixture);
    expect(rowTitles(el)[0]).toBe('Node 4.2');
  });

  it('a filter change jumps back to the first page', async () => {
    const { fixture, el } = await render();
    Array.from(el.querySelectorAll<HTMLButtonElement>('.oge-pager-btn'))
      .find((button) => button.textContent?.trim() === '2')
      ?.click();
    await settle(fixture);
    const filter = el.querySelector<HTMLInputElement>('.oge-filter-input');
    if (!filter) throw new Error('filter input missing');
    filter.value = 'Root';
    filter.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(fixture);
    // matches (6 roots) fit page 1; page reset happened
    expect(rowTitles(el)[0]).toBe('Root 1');
  });

  it('the "all" page size switches paging off', async () => {
    const { fixture, el } = await render();
    const select = el.querySelector<HTMLSelectElement>(
      '.oge-pager-sizes select',
    );
    if (!select) throw new Error('page size select missing');
    select.value = 'all';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await settle(fixture);
    expect(rowTitles(el).length).toBe(18);
  });
});
