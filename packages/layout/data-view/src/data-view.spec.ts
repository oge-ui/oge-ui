import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeDataView } from './data-view';
import { provideOgeDataViewConfig } from './config';
import {
  OgeDataViewEmptyTemplate,
  OgeDataViewItemTemplate,
  OgeDataViewListItemTemplate,
} from './templates';
import type {
  OgeDataViewItemClickEvent,
  OgeDataViewKey,
  OgeDataViewLayout,
  OgeDataViewOptionsChangedEvent,
  OgeDataViewPageChangedEvent,
  OgeDataViewSelectionChangedEvent,
  OgeDataViewSelectionMode,
  OgeDataViewSort,
} from './data-view-types';

interface Product {
  id: number;
  name: string;
  price: number;
}

const PRODUCTS: Product[] = [
  { id: 1, name: 'Desk', price: 300 },
  { id: 2, name: 'Chair', price: 120 },
  { id: 3, name: 'Lamp', price: 40 },
  { id: 4, name: 'Shelf', price: 90 },
  { id: 5, name: 'Rug', price: 150 },
];

@Component({
  imports: [
    OgeDataView,
    OgeDataViewItemTemplate,
    OgeDataViewListItemTemplate,
    OgeDataViewEmptyTemplate,
  ],
  template: `
    <oge-data-view
      [items]="items()"
      [pageSize]="pageSize()"
      [(pageIndex)]="page"
      [(layout)]="layout"
      [showLayoutSwitch]="true"
      [searchEnabled]="search()"
      [(searchValue)]="query"
      searchExpr="name"
      [sortOptions]="sortOptions"
      [(sort)]="sort"
      [selectionMode]="mode()"
      [(selectedKeys)]="selected"
      [remoteOperations]="remote()"
      [itemCount]="itemCount()"
      [filter]="filter()"
      [columns]="columns()"
      locale="en"
      ariaLabel="Products"
      (pageChanged)="pages.push($event)"
      (selectionChanged)="selections.push($event)"
      (itemClick)="clicks.push($event)"
      (optionsChanged)="options.push($event)"
    >
      <button ogeDataViewToolbar type="button">Export</button>
      <ng-template ogeDataViewItemTemplate let-item let-selected="selected">
        <span class="name">{{ item.name }}</span>
        @if (selected) {
          <span class="sel">on</span>
        }
      </ng-template>
      <ng-template ogeDataViewListItemTemplate let-item>
        <span class="row">{{ item.name }} {{ item.price }}</span>
      </ng-template>
      <ng-template ogeDataViewEmptyTemplate let-filtered let-text="text">
        <span class="empty">{{ filtered ? 'F' : 'E' }} {{ text }}</span>
      </ng-template>
    </oge-data-view>
  `,
})
class Host {
  readonly items = signal<Product[]>([...PRODUCTS]);
  readonly pageSize = signal(2);
  readonly page = signal(0);
  readonly layout = signal<OgeDataViewLayout>('grid');
  readonly search = signal(true);
  readonly query = signal('');
  readonly sort = signal<OgeDataViewSort | null>(null);
  readonly mode = signal<OgeDataViewSelectionMode>('none');
  readonly selected = signal<readonly OgeDataViewKey[]>([]);
  readonly remote = signal(false);
  readonly itemCount = signal<number | undefined>(undefined);
  readonly filter = signal<((p: Product) => boolean) | null>(null);
  readonly columns = signal<number | undefined>(undefined);
  readonly sortOptions = [
    { field: 'name', label: 'Name' },
    { field: 'price', label: 'Price' },
  ];
  readonly view = viewChild.required(OgeDataView);
  readonly pages: OgeDataViewPageChangedEvent[] = [];
  readonly selections: OgeDataViewSelectionChangedEvent[] = [];
  readonly clicks: OgeDataViewItemClickEvent[] = [];
  readonly options: OgeDataViewOptionsChangedEvent[] = [];
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function names(el: HTMLElement): string[] {
  return Array.from(el.querySelectorAll('.oge-data-view-item')).map(
    (n) => n.textContent?.trim().split(/\s+/)[0] ?? '',
  );
}

describe('OgeDataView', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;
  let el: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [Host] });
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    el = fixture.nativeElement;
    await settle(fixture);
  });

  it('renders a list of listitems with templates, the toolbar and a pager', () => {
    const list = el.querySelector('[role="list"]')!;
    expect(list.getAttribute('aria-label')).toBe('Products');
    expect(list.querySelectorAll('[role="listitem"]')).toHaveLength(2);
    expect(names(el)).toEqual(['Desk', 'Chair']);
    expect(el.querySelector('[ogeDataViewToolbar]')?.textContent).toBe(
      'Export',
    );
    const pager = el.querySelector('.oge-data-view-pager')!;
    expect(pager.getAttribute('role')).toBe('group');
    expect(
      pager.querySelector('[aria-current="page"]')?.textContent?.trim(),
    ).toBe('1');
    expect(el.querySelector('.oge-data-view-info')?.textContent).toBe(
      '1–2 of 5',
    );
    expect(el.querySelector('oge-data-view')!.classList).toContain(
      'oge-data-view-layout-grid',
    );
    expect(
      el
        .querySelector<HTMLElement>('oge-data-view')!
        .style.getPropertyValue('--oge-data-view-min-item-width'),
    ).toBe('240px');
  });

  it('pages through the pager and announces nothing visible', async () => {
    const next = el.querySelector<HTMLButtonElement>(
      '[data-oge-data-view-pager="next"]',
    )!;
    expect(
      el.querySelector<HTMLButtonElement>('[data-oge-data-view-pager="prev"]')!
        .disabled,
    ).toBe(true);
    next.click();
    await settle(fixture);
    expect(host.page()).toBe(1);
    expect(names(el)).toEqual(['Lamp', 'Shelf']);
    expect(host.pages.at(-1)).toMatchObject({
      pageIndex: 1,
      previousPageIndex: 0,
      pageSize: 2,
    });
    el.querySelector<HTMLButtonElement>(
      '[data-oge-data-view-page="2"]',
    )!.click();
    await settle(fixture);
    expect(names(el)).toEqual(['Rug']);
    expect(next.disabled).toBe(true);
    host.view().goToPage(0);
    await settle(fixture);
    expect(names(el)).toEqual(['Desk', 'Chair']);
  });

  it('switches the layout and uses the list template there', async () => {
    const [grid, list] = Array.from(
      el.querySelectorAll<HTMLButtonElement>(
        '.oge-data-view-layout-switch button',
      ),
    );
    expect(grid.getAttribute('aria-pressed')).toBe('true');
    list.click();
    await settle(fixture);
    expect(host.layout()).toBe('list');
    expect(list.getAttribute('aria-pressed')).toBe('true');
    expect(el.querySelector('.row')?.textContent).toBe('Desk 300');
    expect(el.querySelector('oge-data-view')!.classList).toContain(
      'oge-data-view-layout-list',
    );
  });

  it('searches, sorts and resets the page', async () => {
    host.page.set(2);
    await settle(fixture);
    const input = el.querySelector<HTMLInputElement>('.oge-data-view-search')!;
    expect(input.getAttribute('aria-label')).toBe('Search');
    input.value = 'l';
    input.dispatchEvent(new Event('input'));
    await settle(fixture);
    expect(host.query()).toBe('l');
    expect(host.page()).toBe(0);
    expect(names(el)).toEqual(['Lamp', 'Shelf']);

    const select = el.querySelector<HTMLSelectElement>(
      '.oge-data-view-sort-select',
    )!;
    select.value = 'name';
    select.dispatchEvent(new Event('change'));
    await settle(fixture);
    expect(host.sort()).toEqual({ field: 'name', direction: 'asc' });
    expect(names(el)).toEqual(['Lamp', 'Shelf']);
    el.querySelector<HTMLButtonElement>('.oge-data-view-direction')!.click();
    await settle(fixture);
    expect(host.sort()).toEqual({ field: 'name', direction: 'desc' });
    expect(names(el)).toEqual(['Shelf', 'Lamp']);
    expect(host.options.at(-1)).toMatchObject({
      sort: { field: 'name', direction: 'desc' },
      searchValue: 'l',
      pageIndex: 0,
    });
  });

  it('renders the empty template for no data and for no results', async () => {
    host.query.set('zzz');
    await settle(fixture);
    expect(el.querySelector('.empty')?.textContent).toBe('F No matching items');
    host.items.set([]);
    await settle(fixture);
    expect(el.querySelector('.empty')?.textContent).toBe(
      'E No items to display',
    );
    expect(el.querySelector('[role="list"]')).toBeNull();
  });

  it('applies the filter hook', async () => {
    host.filter.set((p) => p.price > 100);
    host.pageSize.set(0);
    await settle(fixture);
    expect(names(el)).toEqual(['Desk', 'Chair', 'Rug']);
    expect(el.querySelector('.oge-data-view-pager')).toBeNull();
  });

  it('does not process remote items; it emits options instead', async () => {
    host.remote.set(true);
    host.items.set(PRODUCTS.slice(2, 4));
    host.itemCount.set(40);
    await settle(fixture);
    expect(names(el)).toEqual(['Lamp', 'Shelf']);
    expect(el.querySelector('.oge-data-view-info')?.textContent).toBe(
      '1–2 of 40',
    );
    const input = el.querySelector<HTMLInputElement>('.oge-data-view-search')!;
    input.value = 'zzz';
    input.dispatchEvent(new Event('input'));
    await settle(fixture);
    expect(names(el)).toEqual(['Lamp', 'Shelf']);
    expect(host.options.at(-1)?.searchValue).toBe('zzz');
  });

  describe('selection', () => {
    beforeEach(async () => {
      host.mode.set('multiple');
      host.pageSize.set(0);
      await settle(fixture);
    });

    it('is a multiselectable listbox with one tab stop', () => {
      const listbox = el.querySelector('[role="listbox"]')!;
      expect(listbox.getAttribute('aria-multiselectable')).toBe('true');
      const options = listbox.querySelectorAll<HTMLElement>('[role="option"]');
      expect(options).toHaveLength(5);
      expect(options[0].tabIndex).toBe(0);
      expect(options[1].tabIndex).toBe(-1);
      expect(options[0].getAttribute('aria-selected')).toBe('false');
    });

    it('toggles with click and Space, moves with arrows, Ctrl+A selects all', async () => {
      const options = () => el.querySelectorAll<HTMLElement>('[role="option"]');
      options()[1].click();
      await settle(fixture);
      expect(host.selected()).toEqual([2]);
      expect(host.clicks.at(-1)).toMatchObject({ index: 1, key: 2 });
      expect(options()[1].getAttribute('aria-selected')).toBe('true');
      expect(options()[1].querySelector('.sel')).not.toBeNull();

      options()[1].focus();
      options()[1].dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
      );
      await settle(fixture);
      expect(document.activeElement).toBe(options()[2]);
      // unmeasured columns (jsdom) → Down is a single step
      options()[2].dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
      );
      await settle(fixture);
      expect(document.activeElement).toBe(options()[3]);
      options()[3].dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true }),
      );
      await settle(fixture);
      expect(host.selected()).toEqual([2, 4]);
      expect(options()[3].tabIndex).toBe(0);

      options()[3].dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'a',
          ctrlKey: true,
          bubbles: true,
        }),
      );
      await settle(fixture);
      expect(host.selected()).toEqual([1, 2, 3, 4, 5]);
      host.view().clearSelection();
      await settle(fixture);
      expect(host.selected()).toEqual([]);
      expect(host.selections).toHaveLength(4);
    });

    it('single selection replaces; PageDown turns the page', async () => {
      host.mode.set('single');
      host.pageSize.set(2);
      await settle(fixture);
      const options = () => el.querySelectorAll<HTMLElement>('[role="option"]');
      expect(
        el
          .querySelector('[role="listbox"]')!
          .getAttribute('aria-multiselectable'),
      ).toBeNull();
      options()[0].click();
      options()[1].click();
      await settle(fixture);
      expect(host.selected()).toEqual([2]);
      options()[1].focus();
      options()[1].dispatchEvent(
        new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true }),
      );
      await settle(fixture);
      expect(host.page()).toBe(1);
      expect(document.activeElement?.textContent).toContain('Shelf');
    });
  });
});

describe('OgeDataView config', () => {
  @Component({
    imports: [OgeDataView],
    template: `<oge-data-view [items]="items" displayExpr="name" />`,
  })
  class Plain {
    readonly items = PRODUCTS;
  }

  it('reads layout, page size and messages from the config', async () => {
    TestBed.configureTestingModule({
      imports: [Plain],
      providers: [
        provideOgeDataViewConfig({
          layout: 'list',
          pageSize: 3,
          minItemWidth: 180,
          messages: { nextPage: 'Sonraki' },
        }),
      ],
    });
    const fixture = TestBed.createComponent(Plain);
    await settle(fixture);
    const el: HTMLElement = fixture.nativeElement;
    const view = el.querySelector<HTMLElement>('oge-data-view')!;
    expect(view.classList).toContain('oge-data-view-layout-list');
    expect(view.style.getPropertyValue('--oge-data-view-min-item-width')).toBe(
      '180px',
    );
    expect(el.querySelectorAll('.oge-data-view-item')).toHaveLength(3);
    expect(el.querySelector('.oge-data-view-text')?.textContent).toBe('Desk');
    expect(
      el
        .querySelector('[data-oge-data-view-pager="next"]')
        ?.getAttribute('aria-label'),
    ).toBe('Sonraki');
    expect(el.querySelector('.oge-data-view-header')?.children).toHaveLength(0);
  });
});
