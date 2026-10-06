import {
  ChangeDetectionStrategy,
  Component,
  signal,
  viewChild,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { OgeTreeView } from './tree-view';
import type { OgeTreeChildPageEvent, RowKey } from './tree-view-types';
import { key, settle } from './tree-view-test-host';

interface Item {
  id: number;
  parentId: number | null;
  name: string;
}

/** Root (1) with seven children (101–107), plus a second root (2). */
const ITEMS: Item[] = [
  { id: 1, parentId: null, name: 'Root' },
  ...Array.from({ length: 7 }, (_, i) => ({
    id: 101 + i,
    parentId: 1,
    name: `Child ${i + 1}`,
  })),
  { id: 2, parentId: null, name: 'Second' },
];

@Component({
  selector: 'oge-paging-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OgeTreeView],
  template: `
    <oge-tree-view
      [items]="items"
      displayExpr="name"
      [rootValue]="null"
      [childPageSize]="pageSize()"
      [virtualScroll]="virtual()"
      height="200px"
      [(expandedKeys)]="expanded"
      (childPageShown)="pages.push($event)"
    />
  `,
})
class PagingHost {
  readonly tree = viewChild.required(OgeTreeView<Item>);
  readonly items = ITEMS;
  readonly pageSize = signal<number | undefined>(3);
  readonly virtual = signal(false);
  readonly expanded = signal<readonly RowKey[]>([1]);
  readonly pages: OgeTreeChildPageEvent<Item>[] = [];
}

async function renderPaging(setup?: (host: PagingHost) => void) {
  const fixture = TestBed.createComponent(PagingHost);
  setup?.(fixture.componentInstance);
  document.body.appendChild(fixture.nativeElement);
  await settle(fixture);
  const el: HTMLElement = fixture.nativeElement;
  const rows = () =>
    Array.from(el.querySelectorAll<HTMLElement>('.oge-tree-view-item'));
  const more = () => el.querySelector<HTMLElement>('.oge-tree-view-item-more');
  return { fixture, host: fixture.componentInstance, el, rows, more };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('OgeTreeView "Load more" paging', () => {
  it('renders the first page plus a Load more row with the real setsize', async () => {
    const { rows, more } = await renderPaging();
    expect(rows().map((r) => r.textContent?.trim())).toEqual([
      'Root',
      'Child 1',
      'Child 2',
      'Child 3',
      'Show 4 more items',
      'Second',
    ]);
    expect(rows()[1].getAttribute('aria-setsize')).toBe('7');
    const row = more() as HTMLElement;
    expect(row.getAttribute('role')).toBe('treeitem');
    expect(row.getAttribute('aria-level')).toBe('2');
    expect(row.hasAttribute('aria-setsize')).toBe(false);
    expect(row.hasAttribute('aria-selected')).toBe(false);
  });

  it('reveals the next page on click and reports childPageShown', async () => {
    const { fixture, host, rows, more } = await renderPaging();
    more()?.click();
    await settle(fixture);
    expect(
      rows().filter((r) => r.getAttribute('aria-level') === '2'),
    ).toHaveLength(7);
    expect(more()?.textContent?.trim()).toBe('Show 1 more item');
    expect(host.pages[0]).toMatchObject({
      parentKey: 1,
      parentItem: { name: 'Root' },
      shown: 6,
      total: 7,
    });
  });

  it('is reachable with the arrows and activates with Enter, focusing the first new child', async () => {
    const { fixture, rows, more } = await renderPaging();
    rows()[3].focus();
    key(rows()[3], 'ArrowDown');
    await settle(fixture);
    expect(document.activeElement).toBe(more());
    key(more() as HTMLElement, 'Enter');
    await settle(fixture);
    await settle(fixture);
    expect(document.activeElement?.textContent?.trim()).toBe('Child 4');
  });

  it('pages the root level and works with showMoreChildren()', async () => {
    const { fixture, host, more, rows } = await renderPaging((h) => {
      h.pageSize.set(1);
      h.expanded.set([]);
    });
    expect(rows().map((r) => r.textContent?.trim())).toEqual([
      'Root',
      'Show 1 more item',
    ]);
    host.tree().showMoreChildren(null);
    await settle(fixture);
    expect(more()).toBeNull();
    expect(rows().map((r) => r.textContent?.trim())).toEqual([
      'Root',
      'Second',
    ]);
  });

  it('renders every child without a page size', async () => {
    const { more } = await renderPaging((h) => h.pageSize.set(undefined));
    expect(more()).toBeNull();
  });

  it('works under virtual scrolling', async () => {
    const { more } = await renderPaging((h) => h.virtual.set(true));
    expect(more()?.textContent?.trim()).toBe('Show 4 more items');
  });
});
