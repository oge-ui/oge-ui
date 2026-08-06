import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  createFilterPredicate,
  type DataSource,
  type DataSourceCapabilities,
  type FilterExpr,
  type LoadOptions,
  type LoadResult,
  type RowKey,
} from '@oge-ui/core';
import { OgeColumn } from '@oge-ui/grid';
import { OgeTreeList } from './tree-list';

interface Node {
  id: number;
  parentId: number | null;
  title: string;
  hasChildren: boolean;
}

/** Root A → Child A1 → Grand A1a; Root B is a leaf. */
const ROWS: Node[] = [
  { id: 1, parentId: null, title: 'Root A', hasChildren: true },
  { id: 2, parentId: null, title: 'Root B', hasChildren: false },
  { id: 3, parentId: 1, title: 'Child A1', hasChildren: true },
  { id: 4, parentId: 3, title: 'Grand A1a', hasChildren: false },
  { id: 5, parentId: 1, title: 'Child A2', hasChildren: false },
];

/**
 * Serves the full lazy contract: `parentId eq X` (children), `parentId in
 * [...]` (bulk subtrees), `id in [...]` (ancestor lookups) and arbitrary
 * filter/search discovery via the core predicate.
 */
class AdvancedLazySource implements DataSource<Node> {
  readonly capabilities: DataSourceCapabilities = {
    sort: true,
    filter: true,
    group: false,
    paging: false,
    summary: false,
  };
  readonly log: LoadOptions[] = [];

  keyOf(item: Node): RowKey {
    return item.id;
  }

  async load(options: LoadOptions): Promise<LoadResult<Node>> {
    this.log.push(options);
    const filter = options.filter as
      | { type: string; field?: string; op?: string; value?: unknown }
      | undefined;
    if (
      filter?.type === 'binary' &&
      filter.op === 'eq' &&
      filter.field === 'parentId'
    ) {
      const parent = (filter.value ?? null) as number | null;
      return { data: ROWS.filter((row) => row.parentId === parent) };
    }
    if (
      filter?.type === 'binary' &&
      filter.op === 'in' &&
      filter.field === 'parentId'
    ) {
      const parents = filter.value as readonly number[];
      return {
        data: ROWS.filter(
          (row) => row.parentId !== null && parents.includes(row.parentId),
        ),
      };
    }
    if (
      filter?.type === 'binary' &&
      filter.op === 'in' &&
      filter.field === 'id'
    ) {
      const ids = filter.value as readonly number[];
      return { data: ROWS.filter((row) => ids.includes(row.id)) };
    }
    // match discovery: arbitrary filter and/or search over the whole set
    let rows: readonly Node[] = ROWS;
    if (options.filter) {
      const predicate = createFilterPredicate<Node>(
        options.filter as FilterExpr,
      );
      rows = rows.filter(predicate);
    }
    if (options.searchText) {
      const needle = options.searchText.toLowerCase();
      rows = rows.filter((row) => row.title.toLowerCase().includes(needle));
    }
    return { data: rows };
  }
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

const flush = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve));

function rowTitles(el: HTMLElement): string[] {
  return Array.from(el.querySelectorAll('.oge-row:not(.oge-filler-row)')).map(
    (row) =>
      row.querySelector('.oge-tree-cell-text')?.textContent?.trim() ?? '',
  );
}

@Component({
  imports: [OgeTreeList, OgeColumn],
  template: `
    <oge-tree-list
      [data]="source"
      keyExpr="id"
      parentIdExpr="parentId"
      hasItemsExpr="hasChildren"
      [filterRow]="true"
      [filterDebounce]="0"
      selectionMode="checkbox"
      [selectionRecursive]="true"
      [(selectedKeys)]="selectedKeys"
    >
      <oge-column field="title" caption="Title" />
    </oge-tree-list>
  `,
})
class Host {
  readonly source = new AdvancedLazySource();
  readonly selectedKeys = signal<RowKey[]>([]);
}

describe('OgeTreeList lazy remote filtering & recursive cascade', () => {
  async function render() {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    return {
      fixture,
      host: fixture.componentInstance,
      el: fixture.nativeElement as HTMLElement,
    };
  }

  async function settleAsync(
    fixture: ComponentFixture<unknown>,
  ): Promise<void> {
    // discovery runs multi-request async chains; give each hop a macrotask
    for (let i = 0; i < 4; i++) {
      await settle(fixture);
      await flush();
    }
    await settle(fixture);
  }

  it('filtering finds matches buried under never-expanded branches', async () => {
    const { fixture, el } = await render();
    // only the roots are loaded; Grand A1a lives two unloaded levels deep
    expect(rowTitles(el)).toEqual(['Root A', 'Root B']);
    const filter = el.querySelector<HTMLInputElement>('.oge-filter-input');
    if (!filter) throw new Error('filter input missing');
    filter.value = 'Grand';
    filter.dispatchEvent(new Event('input', { bubbles: true }));
    await settleAsync(fixture);
    // the match plus its remotely fetched ancestor chain, auto-expanded
    expect(rowTitles(el)).toEqual(['Root A', 'Child A1', 'Grand A1a']);
    // clearing restores the lazily loaded view
    filter.value = '';
    filter.dispatchEvent(new Event('input', { bubbles: true }));
    await settleAsync(fixture);
    expect(rowTitles(el)).toEqual(['Root A', 'Root B']);
  });

  it('recursive checkbox on an unexpanded parent selects the whole (fetched) subtree', async () => {
    const { fixture, host, el } = await render();
    const rootA = Array.from(el.querySelectorAll<HTMLElement>('.oge-row')).find(
      (row) => (row.textContent ?? '').includes('Root A'),
    );
    rootA?.querySelector<HTMLInputElement>('.oge-checkbox-cell input')?.click();
    await settleAsync(fixture);
    // subtree bulk-fetched (parentId in [...]) and cascaded: 1,3,4,5
    expect([...host.selectedKeys()].sort()).toEqual([1, 3, 4, 5]);
    // rows were fetched for selection, not expansion: the tree stays collapsed
    expect(rowTitles(el)).toEqual(['Root A', 'Root B']);
  });
});
