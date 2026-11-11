import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OGE_STATE_STORAGE } from '@oge-ui/grid/foundation';
import type { LoadOptions } from '@oge-ui/core';
import { CustomDataSource } from '@oge-ui/core';
import { OgeColumn } from '../columns/column';
import { OgeFilterCellTemplate } from '../templates/filter-cell-template';
import { OgeGrid } from './grid';

interface Order {
  id: number;
  customer: string;
  status: string;
  qty: number;
  placed: Date;
}

const today = new Date();
const daysAgo = (n: number) =>
  new Date(today.getFullYear(), today.getMonth(), today.getDate() - n, 10);

const ORDERS: Order[] = Array.from({ length: 24 }, (_, i) => ({
  id: i + 1,
  customer: `Customer ${i + 1}`, // unique: never an automatic list
  status: ['open', 'shipped', 'closed'][i % 3], // repeats: automatic list
  qty: i * 5,
  placed: daysAgo(i * 3),
}));

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  imports: [OgeGrid, OgeColumn, OgeFilterCellTemplate],
  template: `
    <oge-grid
      #grid
      [data]="orders"
      keyField="id"
      stateKey="orders"
      [filterRow]="true"
      [filterDebounce]="0"
      [headerFilter]="{ auto: true }"
      [dateFilterPresets]="['today', 'last30Days']"
      [savedViews]="true"
      [filterApplyMode]="mode()"
    >
      <oge-column field="customer" />
      <oge-column field="status">
        <select
          *ogeFilterCellTemplate="let value; setValue as set"
          class="status-filter"
          [value]="value ?? ''"
          (change)="set($any($event.target).value)"
        >
          <option value="">Any</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
      </oge-column>
      <oge-column
        field="qty"
        dataType="number"
        [headerFilter]="false"
        [filterRange]="{ min: 0, max: 115, step: 5 }"
      />
      <oge-column field="placed" dataType="date" [headerFilter]="true" />
    </oge-grid>
  `,
})
class Host {
  readonly orders = ORDERS;
  readonly mode = signal<'auto' | 'manual'>('auto');
  readonly grid = viewChild.required<OgeGrid<Order>>('grid');
}

describe('OgeGrid filter tools', () => {
  let fixture: ComponentFixture<Host>;
  let el: HTMLElement;
  const store = new Map<string, string>();
  const ids = () => Array.from(el.querySelectorAll('.oge-row')).length;

  beforeEach(async () => {
    store.clear();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: OGE_STATE_STORAGE,
          useValue: {
            get: (key: string) => store.get(key) ?? null,
            set: (key: string, value: string) => store.set(key, value),
          },
        },
      ],
    });
    fixture = TestBed.createComponent(Host);
    el = fixture.nativeElement as HTMLElement;
    await settle(fixture);
  });

  it('shows funnels on repetitive columns and where a column asks', () => {
    const funnels = Array.from(el.querySelectorAll('.oge-header-cell')).filter(
      (cell) => cell.querySelector('.oge-header-filter-btn'),
    );
    expect(funnels.map((cell) => cell.getAttribute('data-colid'))).toEqual([
      'status',
      'placed',
    ]);
  });

  it('filters through a custom filter cell', async () => {
    const select = el.querySelector('.status-filter') as HTMLSelectElement;
    select.value = 'open';
    select.dispatchEvent(new Event('change'));
    await settle(fixture);
    expect(fixture.componentInstance.grid().state().filter?.row).toEqual([
      [
        'status',
        { type: 'binary', field: 'status', op: 'contains', value: 'open' },
      ],
    ]);
    expect(ids()).toBe(8);
  });

  it('filters a number column with the range slider', async () => {
    const slider = el.querySelector('.oge-filter-range');
    expect(slider).not.toBeNull();
    expect(slider?.querySelectorAll('[role="slider"]')).toHaveLength(2);
  });

  it('applies a date preset from the header menu', async () => {
    const funnel = el.querySelector(
      '.oge-header-cell[data-colid="placed"] .oge-header-filter-btn',
    ) as HTMLButtonElement;
    funnel.click();
    await settle(fixture);
    const presets = Array.from(
      document.querySelectorAll('.oge-hf-preset'),
    ) as HTMLButtonElement[];
    expect(presets.map((b) => b.textContent?.trim())).toEqual([
      'Today',
      'Last 30 days',
    ]);
    presets[1].click();
    await settle(fixture);
    // days 0, 3, …, 27 ago: ten orders in the last 30 days
    expect(ids()).toBe(10);
  });

  it('holds edits in manual mode until applied', async () => {
    fixture.componentInstance.mode.set('manual');
    await settle(fixture);
    const select = el.querySelector('.status-filter') as HTMLSelectElement;
    select.value = 'closed';
    select.dispatchEvent(new Event('change'));
    await settle(fixture);
    expect(ids()).toBe(24);
    expect(
      el.querySelector('.oge-filter-apply-note')?.textContent?.trim(),
    ).toBe('Filter changes are not applied yet');
    (el.querySelector('.oge-filter-apply-btn') as HTMLButtonElement).click();
    await settle(fixture);
    expect(ids()).toBe(8);
    expect(
      el.querySelector('.oge-filter-apply-note')?.textContent?.trim(),
    ).toBe('');
  });

  it('saves, opens and deletes named views', async () => {
    const grid = fixture.componentInstance.grid();
    const select = el.querySelector('.status-filter') as HTMLSelectElement;
    select.value = 'open';
    select.dispatchEvent(new Event('change'));
    await settle(fixture);
    grid.saveCurrentView('Open orders');
    expect(JSON.parse(store.get('oge-grid-views:orders')!)[0].name).toBe(
      'Open orders',
    );
    grid.clearFilters();
    await settle(fixture);
    expect(ids()).toBe(24);

    (el.querySelector('.oge-views-button') as HTMLButtonElement).click();
    await settle(fixture);
    const open = document.querySelector('.oge-views-open') as HTMLButtonElement;
    expect(open.textContent?.trim()).toBe('Open orders');
    open.click();
    await settle(fixture);
    expect(ids()).toBe(8);
    grid.deleteView('open orders');
    expect(grid.savedViewList()).toEqual([]);
  });
});

describe('OgeGrid manual mode on a server source', () => {
  it('does not load until the edits are applied', async () => {
    const loads: LoadOptions[] = [];
    const source = new CustomDataSource<Order>({
      key: 'id',
      load: async (options) => {
        loads.push(options);
        return { data: ORDERS.slice(0, 5), totalCount: 5 };
      },
    });
    const fixture = TestBed.createComponent(OgeGrid<Order>);
    fixture.componentRef.setInput('data', source);
    fixture.componentRef.setInput('columns', ['id', 'customer']);
    fixture.componentRef.setInput('keyField', 'id');
    fixture.componentRef.setInput('searchPanel', true);
    fixture.componentRef.setInput('filterApplyMode', 'manual');
    await settle(fixture);
    const before = loads.length;
    const search = fixture.nativeElement.querySelector(
      '.oge-search-input',
    ) as HTMLInputElement;
    search.value = 'x';
    search.dispatchEvent(new Event('input'));
    await new Promise((resolve) => setTimeout(resolve, 400));
    await settle(fixture);
    expect(loads.length).toBe(before);
    fixture.componentInstance.applyFilters();
    await settle(fixture);
    expect(loads.at(-1)?.searchText).toBe('x');
  });
});
