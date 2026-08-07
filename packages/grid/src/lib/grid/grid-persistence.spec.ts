import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeColumn } from '../columns/column';
import {
  OGE_STATE_STORAGE,
  type OgeStateStorage,
} from '@oge-ui/grid/foundation';
import { GridStateStore } from '../state/grid-state.store';
import { OgeGrid } from './grid';

interface Person {
  id: number;
  name: string;
  city: string;
  age: number;
}

const PEOPLE: Person[] = [
  { id: 1, name: 'Cem', city: 'İzmir', age: 30 },
  { id: 2, name: 'Ali', city: 'Ankara', age: 40 },
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
  await fixture.whenStable();
  fixture.detectChanges();
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

@Component({
  imports: [OgeGrid, OgeColumn],
  template: `
    <oge-grid
      [data]="data"
      keyField="id"
      stateKey="test-grid"
      [groupPanel]="true"
    >
      <oge-column field="id" dataType="number" [width]="60" />
      <oge-column field="name" />
      <oge-column field="city" />
      <oge-column field="age" dataType="number" />
    </oge-grid>
  `,
})
class PersistenceHost {
  readonly data = PEOPLE;
}

function gridOf(fixture: ComponentFixture<PersistenceHost>): OgeGrid<Person> {
  return fixture.debugElement.children[0].componentInstance as OgeGrid<Person>;
}

function storeOf(fixture: ComponentFixture<PersistenceHost>): GridStateStore {
  return (gridOf(fixture) as unknown as { store: GridStateStore }).store;
}

describe('OgeGrid state persistence', () => {
  it('round-trips sort, widths, pins and hidden columns through storage', async () => {
    const storage = new MemoryStorage();
    TestBed.configureTestingModule({
      providers: [{ provide: OGE_STATE_STORAGE, useValue: storage }],
    });

    // --- session 1: user changes state
    const first = TestBed.createComponent(PersistenceHost);
    await settle(first);
    const el = first.nativeElement as HTMLElement;
    (el.querySelectorAll('.oge-header-cell')[1] as HTMLElement).click(); // sort by name asc
    const store = storeOf(first);
    store.columns.setWidth('city', 234);
    store.columns.setPinned('id', 'left');
    // hide the 'age' column via its directive model
    const grid = gridOf(first) as unknown as {
      declaredColumns(): readonly {
        field(): string | undefined;
        visible: { set(v: boolean): void };
      }[];
    };
    grid
      .declaredColumns()
      .find((c) => c.field() === 'age')
      ?.visible.set(false);
    await settle(first);
    await wait(350); // > save debounce
    first.destroy();

    const saved = storage.get('oge-grid:test-grid');
    expect(saved).toBeTruthy();

    // --- session 2: fresh grid restores everything
    const second = TestBed.createComponent(PersistenceHost);
    await settle(second);
    const el2 = second.nativeElement as HTMLElement;

    const nameHeader = Array.from(
      el2.querySelectorAll('.oge-header-cell'),
    ).find((h) => h.textContent?.includes('Name'));
    expect(nameHeader?.getAttribute('aria-sort')).toBe('ascending');
    const rows = Array.from(
      el2.querySelectorAll('.oge-row .oge-cell:nth-child(2)'),
    ).map((c) => c.textContent?.trim());
    expect(rows).toEqual(['Ali', 'Cem']); // restored sort applied to data

    expect(
      (el2.querySelector('.oge-header-row') as HTMLElement).style
        .gridTemplateColumns,
    ).toContain('234px');
    const idHeader = Array.from(el2.querySelectorAll('.oge-header-cell')).find(
      (h) => h.textContent?.includes('Id'),
    ) as HTMLElement;
    expect(idHeader.classList.contains('oge-pinned')).toBe(true);
    expect(
      Array.from(el2.querySelectorAll('.oge-header-caption')).map((h) =>
        h.textContent?.trim(),
      ),
    ).not.toContain('Age');
  });
});

describe('OgeGrid async storage + imperative state API', () => {
  it('restores from a promise-returning backend (API-style)', async () => {
    const backend = new MemoryStorage();
    backend.set(
      'oge-grid:test-grid',
      JSON.stringify({ sort: [{ field: 'name', dir: 'asc' }] }),
    );
    const asyncStorage: OgeStateStorage = {
      get: async (key) => {
        await wait(20);
        return backend.get(key);
      },
      set: async (key, value) => {
        await wait(5);
        backend.set(key, value);
      },
    };
    TestBed.configureTestingModule({
      providers: [{ provide: OGE_STATE_STORAGE, useValue: asyncStorage }],
    });
    const fixture = TestBed.createComponent(PersistenceHost);
    await settle(fixture);
    await wait(40); // let the async get resolve
    await settle(fixture);
    const rows = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll(
        '.oge-row .oge-cell:nth-child(2)',
      ),
    ).map((c) => c.textContent?.trim());
    expect(rows).toEqual(['Ali', 'Cem']);
  });

  it('state() / applyState() round-trip and stateChange notifies on changes', async () => {
    const fixture = TestBed.createComponent(PersistenceHost);
    await settle(fixture);
    const grid = gridOf(fixture);
    const store = storeOf(fixture);
    const emitted: unknown[] = [];
    grid.stateChange.subscribe((snapshot) => emitted.push(snapshot));
    await wait(300); // initial debounce fire — must NOT emit
    expect(emitted.length).toBe(0);

    store.sort.set([{ field: 'age', dir: 'desc' }]);
    await settle(fixture);
    await wait(300);
    expect(emitted.length).toBe(1);

    const snapshot = grid.state();
    expect(snapshot.sort).toEqual([{ field: 'age', dir: 'desc' }]);

    store.sort.clear();
    await settle(fixture);
    expect(grid.state().sort ?? []).toEqual([]);

    grid.applyState(snapshot);
    await settle(fixture);
    const rows = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll(
        '.oge-row .oge-cell:nth-child(2)',
      ),
    ).map((c) => c.textContent?.trim());
    expect(rows).toEqual(['Ali', 'Cem']); // age desc: 40 first
  });
});

describe('OgeGrid header context menu', () => {
  async function render() {
    const fixture = TestBed.createComponent(PersistenceHost);
    await settle(fixture);
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  function openMenu(el: HTMLElement, headerIndex: number): void {
    el.querySelectorAll('.oge-header-cell')[headerIndex].dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
    );
  }

  function menuItem(el: HTMLElement, text: string): HTMLButtonElement {
    return Array.from(el.querySelectorAll('.oge-menu-item')).find((b) =>
      b.textContent?.includes(text),
    ) as HTMLButtonElement;
  }

  it('sorts, groups, pins and hides via the built-in menu', async () => {
    const { fixture, el } = await render();

    openMenu(el, 1);
    await settle(fixture);
    expect(el.querySelector('.oge-context-menu')).toBeTruthy();
    menuItem(el, 'Sort descending').click();
    await settle(fixture);
    expect(
      el.querySelectorAll('.oge-header-cell')[1].getAttribute('aria-sort'),
    ).toBe('descending');

    openMenu(el, 2); // city
    await settle(fixture);
    menuItem(el, 'Group by this column').click();
    await settle(fixture);
    expect(el.querySelectorAll('.oge-group-row').length).toBeGreaterThan(0);

    openMenu(el, 0); // id → pin left
    await settle(fixture);
    menuItem(el, 'Pin left').click();
    await settle(fixture);
    expect(
      el
        .querySelectorAll('.oge-header-cell')[0]
        .classList.contains('oge-pinned'),
    ).toBe(true);

    openMenu(el, 3); // age → hide
    await settle(fixture);
    menuItem(el, 'Hide column').click();
    await settle(fixture);
    expect(
      Array.from(el.querySelectorAll('.oge-header-caption')).map((h) =>
        h.textContent?.trim(),
      ),
    ).not.toContain('Age');
  });

  it('headerContextMenu lets consumers replace the built-in items', async () => {
    const { fixture, el } = await render();
    const grid = gridOf(fixture);
    let ran = '';
    grid.headerContextMenu.subscribe((event) => {
      event.items.length = 0; // drop the built-ins entirely
      event.items.push({
        text: `Pivot by ${event.caption}`,
        action: () => (ran = event.field),
      });
    });

    openMenu(el, 2); // city
    await settle(fixture);
    const items = Array.from(el.querySelectorAll('.oge-menu-item')).map((i) =>
      i.textContent?.trim(),
    );
    expect(items).toEqual(['Pivot by City']);
    menuItem(el, 'Pivot by City').click();
    expect(ran).toBe('city');
  });
});

describe('OgeGrid CSV export', () => {
  it('exports the filtered + sorted view with formatting', async () => {
    const fixture = TestBed.createComponent(PersistenceHost);
    await settle(fixture);
    const grid = gridOf(fixture);
    const store = storeOf(fixture);
    store.sort.set([{ field: 'name', dir: 'asc' }]);
    store.filter.setRowFilter('city', {
      type: 'binary',
      field: 'city',
      op: 'contains',
      value: 'an',
    });
    await settle(fixture);

    const csv = await grid.getCsv({ bom: false });
    expect(csv).toBe('Id,Name,City,Age\r\n2,Ali,Ankara,40');
  });

  it('customizeCell rewrites CSV cells and keeps defaults on undefined', async () => {
    // isolate from state persisted by earlier tests in this suite
    TestBed.configureTestingModule({
      providers: [
        { provide: OGE_STATE_STORAGE, useValue: new MemoryStorage() },
      ],
    });
    const fixture = TestBed.createComponent(PersistenceHost);
    await settle(fixture);
    const csv = await gridOf(fixture).getCsv({
      bom: false,
      customizeCell: ({ field, value, text }) =>
        field === 'name'
          ? text.toUpperCase()
          : field === 'age'
            ? `${String(value)} yrs`
            : undefined,
    });
    const lines = csv.split('\r\n');
    expect(lines[1]).toBe('1,CEM,İzmir,30 yrs');
  });
});
