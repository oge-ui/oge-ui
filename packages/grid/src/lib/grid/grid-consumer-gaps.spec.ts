import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  OGE_STATE_STORAGE,
  type OgeStateStorage,
} from '@oge-ui/grid/foundation';
import { OgeColumn } from '../columns/column';
import { OgeGridToolbarItem } from '../templates/toolbar-item';
import { OgeGrid, type OgeHeaderContextMenuEvent } from './grid';

/** Gaps a second production app wrote down (toolbar, grouping, dates, state). */

interface Order {
  id: number;
  city: string;
  placed: Date;
}

const ORDERS: Order[] = [
  { id: 1, city: 'Izmir', placed: new Date(2026, 8, 1, 9, 0) },
  { id: 2, city: 'Izmir', placed: new Date(2026, 8, 1, 17, 30) },
  { id: 3, city: 'Ankara', placed: new Date(2026, 8, 2, 8, 0) },
];

class MemoryStorage implements OgeStateStorage {
  readonly map = new Map<string, string>();
  get(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  set(key: string, value: string): void {
    this.map.set(key, value);
  }
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve));
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  imports: [OgeGrid, OgeColumn, OgeGridToolbarItem],
  template: `
    <oge-grid
      [data]="data"
      keyField="id"
      [filterRow]="true"
      [groupBy]="groupBy()"
      [grouping]="{ contextMenuEnabled: true }"
      [stateKey]="stateKey()"
      (headerContextMenu)="menus.push($event)"
    >
      <button ogeToolbar="before" type="button" class="t-before">New</button>
      <button ogeToolbar="center" type="button" class="t-center">Mid</button>
      <button ogeToolbar type="button" class="t-after">Export</button>
      <oge-column field="city" />
      <oge-column field="placed" dataType="date" />
    </oge-grid>
  `,
})
class Host {
  readonly grid = viewChild.required(OgeGrid<Order>);
  readonly data = ORDERS;
  readonly groupBy = signal<string[] | undefined>(undefined);
  readonly stateKey = signal<string | undefined>(undefined);
  readonly menus: OgeHeaderContextMenuEvent[] = [];
}

async function render(setup: (h: Host) => void = () => undefined) {
  const fixture = TestBed.createComponent(Host);
  setup(fixture.componentInstance);
  await settle(fixture);
  return {
    fixture,
    host: fixture.componentInstance,
    el: fixture.nativeElement as HTMLElement,
  };
}

describe('OgeGrid — consumer gap list', () => {
  it('[ogeToolbar] places items into the before / center / after groups', async () => {
    const { el } = await render();
    const groupOf = (selector: string) =>
      el.querySelector(selector)?.closest('[class*="oge-toolbar-"]')?.className;
    expect(groupOf('.t-before')).toMatch(/before/);
    expect(groupOf('.t-center')).toMatch(/center/);
    expect(groupOf('.t-after')).toMatch(/after/);
  });

  it('grouping.contextMenuEnabled offers "group by" without the group panel', async () => {
    const { fixture, host, el } = await render();
    el.querySelector('.oge-header-cell[data-colid="city"]')?.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        button: 2,
      }),
    );
    await settle(fixture);
    expect(el.querySelector('.oge-group-panel')).toBeNull();
    const group = host.menus[0].items.find((i) => /group/i.test(i.text));
    expect(group).toBeDefined();
    (group?.action as () => void)();
    await settle(fixture);
    expect(el.querySelectorAll('.oge-group-row')).toHaveLength(2);
  });

  it('date columns group by calendar day, whatever the time', async () => {
    const { el } = await render((h) => h.groupBy.set(['placed']));
    const groups = el.querySelectorAll('.oge-group-row');
    expect(groups).toHaveLength(2);
    expect(groups[0].textContent).toContain('(2)');
  });

  it('a bound [groupBy] wins over a grouping restored from stateKey', async () => {
    const storage = new MemoryStorage();
    TestBed.configureTestingModule({
      providers: [{ provide: OGE_STATE_STORAGE, useValue: storage }],
    });
    storage.set(
      'oge-grid:orders',
      JSON.stringify({ group: [{ field: 'placed', dir: 'asc' }] }),
    );
    const { host } = await render((h) => {
      h.stateKey.set('orders');
      h.groupBy.set(['city']);
    });
    expect(host.grid().state().group).toEqual([{ field: 'city', dir: 'asc' }]);
  });

  it('the filter row offers "between" on date columns and filters whole days', async () => {
    const { fixture, host } = await render();
    const grid = host.grid() as unknown as {
      operatorChoices(column: { dataType: string }): string[];
      resolvedColumns(): { field?: string; dataType: string }[];
      onDateRangeFilter(
        column: unknown,
        range: [Date | null, Date | null],
      ): void;
      getVisibleRows(): readonly Order[];
    };
    const placed = grid.resolvedColumns().find((c) => c.field === 'placed');
    expect(grid.operatorChoices(placed as { dataType: string })).toContain(
      'between',
    );
    grid.onDateRangeFilter(placed, [
      new Date(2026, 8, 1),
      new Date(2026, 8, 1),
    ]);
    await settle(fixture);
    expect(grid.getVisibleRows().map((r) => r.id)).toEqual([1, 2]);
    grid.onDateRangeFilter(placed, [new Date(2026, 8, 2), null]);
    await settle(fixture);
    expect(grid.getVisibleRows().map((r) => r.id)).toEqual([3]);
  });
});
