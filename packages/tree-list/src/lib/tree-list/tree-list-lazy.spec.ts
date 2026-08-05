import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type {
  DataSource,
  DataSourceCapabilities,
  LoadOptions,
  LoadResult,
  RowKey,
} from '@oge-ui/core';
import { OgeColumn } from '@oge-ui/grid';
import { OgeTreeList } from './tree-list';

interface Node {
  id: number;
  parentId: number | null;
  title: string;
  hasChildren: boolean;
}

const ROWS: Node[] = [
  { id: 1, parentId: null, title: 'Root A', hasChildren: true },
  { id: 2, parentId: null, title: 'Root B', hasChildren: false },
  { id: 3, parentId: 1, title: 'Child A1', hasChildren: true },
  { id: 4, parentId: 3, title: 'Grand A1a', hasChildren: false },
];

/** Serves exactly the children matching the `parentId eq X` filter, logging every request. */
class StubLazySource implements DataSource<Node> {
  readonly capabilities: DataSourceCapabilities = {
    sort: true,
    filter: true,
    group: false,
    paging: false,
    summary: false,
  };
  readonly log: LoadOptions[] = [];
  /** When set, child loads stall until `release()` is called. */
  gate: Promise<void> | null = null;

  keyOf(item: Node): RowKey {
    return item.id;
  }

  async load(options: LoadOptions): Promise<LoadResult<Node>> {
    this.log.push(options);
    if (this.gate) await this.gate;
    const filter = options.filter as { field: string; op: string; value: unknown } | undefined;
    const parent = filter?.value ?? null;
    return { data: ROWS.filter((row) => row.parentId === parent) };
  }
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function rowTitles(el: HTMLElement): string[] {
  return Array.from(el.querySelectorAll('.oge-row:not(.oge-filler-row)')).map(
    (row) => row.querySelector('.oge-tree-cell-text')?.textContent?.trim() ?? ''
  );
}

function expanderOf(el: HTMLElement, title: string): HTMLButtonElement | null {
  const row = Array.from(el.querySelectorAll<HTMLElement>('.oge-row')).find((entry) =>
    (entry.textContent ?? '').includes(title)
  );
  return row?.querySelector<HTMLButtonElement>('.oge-tree-expander') ?? null;
}

@Component({
  imports: [OgeTreeList, OgeColumn],
  template: `
    <oge-tree-list
      [data]="source"
      keyExpr="id"
      parentIdExpr="parentId"
      hasItemsExpr="hasChildren"
    >
      <oge-column field="title" />
    </oge-tree-list>
  `,
})
class Host {
  readonly source = new StubLazySource();
}

describe('OgeTreeList lazy loading', () => {
  async function render() {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    return { fixture, host: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
  }

  it('loads only the roots initially, with a parentId-eq-root filter', async () => {
    const { host, el } = await render();
    expect(rowTitles(el)).toEqual(['Root A', 'Root B']);
    expect(host.source.log.length).toBe(1);
    expect(host.source.log[0].filter).toEqual({
      type: 'binary',
      field: 'parentId',
      op: 'eq',
      value: null,
    });
    // expandability comes from hasItemsExpr, not from loaded children
    expect(expanderOf(el, 'Root A')).toBeTruthy();
    expect(expanderOf(el, 'Root B')).toBeNull();
  });

  it('expanding fetches the children with a parentId-eq-key filter and caches them', async () => {
    const { fixture, host, el } = await render();
    expanderOf(el, 'Root A')?.click();
    await settle(fixture);
    await settle(fixture);
    expect(rowTitles(el)).toEqual(['Root A', 'Child A1', 'Root B']);
    expect(host.source.log.length).toBe(2);
    expect(host.source.log[1].filter).toEqual({
      type: 'binary',
      field: 'parentId',
      op: 'eq',
      value: 1,
    });
    // collapse + re-expand serves from the cache: no third request
    expanderOf(el, 'Root A')?.click();
    await settle(fixture);
    expanderOf(el, 'Root A')?.click();
    await settle(fixture);
    expect(rowTitles(el)).toEqual(['Root A', 'Child A1', 'Root B']);
    expect(host.source.log.length).toBe(2);
  });

  it('shows a skeleton filler row while children are in flight', async () => {
    const { fixture, host, el } = await render();
    let release!: () => void;
    host.source.gate = new Promise<void>((resolve) => (release = resolve));
    expanderOf(el, 'Root A')?.click();
    await settle(fixture);
    expect(el.querySelector('.oge-filler-row')).toBeTruthy();
    host.source.gate = null;
    release();
    await settle(fixture);
    await settle(fixture);
    expect(el.querySelector('.oge-filler-row')).toBeNull();
    expect(rowTitles(el)).toEqual(['Root A', 'Child A1', 'Root B']);
  });

  it('drills down across multiple lazy levels', async () => {
    const { fixture, host, el } = await render();
    expanderOf(el, 'Root A')?.click();
    await settle(fixture);
    await settle(fixture);
    expanderOf(el, 'Child A1')?.click();
    await settle(fixture);
    await settle(fixture);
    expect(rowTitles(el)).toEqual(['Root A', 'Child A1', 'Grand A1a', 'Root B']);
    expect(host.source.log.length).toBe(3);
    expect(host.source.log[2].filter).toEqual({
      type: 'binary',
      field: 'parentId',
      op: 'eq',
      value: 3,
    });
  });
});
