import { Component, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OGE_STATE_STORAGE } from '@oge-ui/grid/foundation';
import type { LoadOptions, OgeStateMigration } from '@oge-ui/core';
import { CustomDataSource } from '@oge-ui/core';
import type { OgeRowDragStartEvent } from '@oge-ui/behavior';
import { OgeColumn } from '../columns/column';
import { OgeGrid } from './grid';

interface Person {
  id: number;
  first: string;
  last: string;
  status: number;
  city: string;
}

const STATUS = [
  { value: 0, text: 'Active' },
  { value: 1, text: 'On leave' },
  { value: 2, text: 'Former' },
];

const PEOPLE: Person[] = [
  { id: 1, first: 'Ada', last: 'Kaya', status: 2, city: 'İzmir' },
  { id: 2, first: 'Can', last: 'Öz', status: 0, city: 'Ilgın' },
  { id: 3, first: 'Ece', last: 'Işık', status: 1, city: 'ırmak' },
  { id: 4, first: 'Ali', last: 'Kaya', status: 0, city: 'irmik' },
];

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  imports: [OgeGrid, OgeColumn],
  template: `
    <oge-grid
      #grid
      [data]="people"
      keyField="id"
      stateKey="people"
      [searchPanel]="true"
      [sorting]="{ locale: 'tr' }"
      [stateMigrations]="migrations"
      [rowDragging]="true"
      [rowDragExternal]="true"
      selectionMode="multiple"
      (rowDragStart)="drags.push($event)"
    >
      <oge-column field="first" />
      <oge-column
        field="name"
        caption="Name"
        [calculateCellValue]="fullName"
        [calculateFilterValue]="fullName"
      />
      <oge-column
        field="status"
        [lookup]="{
          dataSource: status,
          valueExpr: 'value',
          displayExpr: 'text',
        }"
      />
      <oge-column field="city" />
    </oge-grid>
  `,
})
class Host {
  readonly people = PEOPLE;
  readonly status = STATUS;
  readonly fullName = (row: Person) => `${row.first} ${row.last}`;
  // v0 → v1: the "town" column became "city"
  readonly migrations: OgeStateMigration[] = [
    (state) => JSON.parse(JSON.stringify(state).replaceAll('"town"', '"city"')),
  ];
  readonly drags: OgeRowDragStartEvent<Person>[] = [];
  readonly grid = viewChild.required<OgeGrid<Person>>('grid');
}

describe('OgeGrid display values', () => {
  let fixture: ComponentFixture<Host>;
  let el: HTMLElement;
  let store: Map<string, string>;
  const firstNames = () =>
    Array.from(el.querySelectorAll('.oge-row')).map((row) =>
      row
        .querySelectorAll('.oge-cell:not(.oge-drag-cell)')[0]
        ?.textContent?.trim(),
    );

  async function create(stored?: unknown): Promise<void> {
    store = new Map();
    if (stored) store.set('oge-grid:people', JSON.stringify(stored));
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
  }

  async function search(text: string): Promise<void> {
    const input = el.querySelector('.oge-search-input') as HTMLInputElement;
    input.value = text;
    input.dispatchEvent(new Event('input'));
    await new Promise((resolve) => setTimeout(resolve, 350));
    await settle(fixture);
  }

  it('searches lookup labels and calculated filter values', async () => {
    await create();
    await search('leave');
    expect(firstNames()).toEqual(['Ece']);
    await search('ali kaya');
    expect(firstNames()).toEqual(['Ali']);
  });

  it('filters a calculated column through its filter value', async () => {
    await create();
    fixture.componentInstance.grid().applyState({
      filter: {
        row: [
          [
            'name',
            { type: 'binary', field: 'name', op: 'contains', value: 'kaya' },
          ],
        ],
      },
    });
    await settle(fixture);
    expect(firstNames()).toEqual(['Ada', 'Ali']);
  });

  it('sorts text in the sorting locale', async () => {
    await create();
    fixture.componentInstance
      .grid()
      .applyState({ sort: [{ field: 'city', dir: 'asc' }] });
    await settle(fixture);
    // Turkish: I is the capital of ı, which sorts before i (and İ)
    expect(firstNames()).toEqual(['Can', 'Ece', 'Ali', 'Ada']);
  });

  it('upgrades a stored state and keeps its widths', async () => {
    await create({
      sort: [{ field: 'town', dir: 'desc' }],
      columns: { widths: [['town', 222]] },
    });
    const state = fixture.componentInstance.grid().state();
    expect(state.version).toBe(1);
    expect(state.sort).toEqual([{ field: 'city', dir: 'desc' }]);
    expect(state.columns?.widths).toEqual([['city', 222]]);
  });

  it('exports the rows the active filters and search leave', async () => {
    await create();
    const grid = fixture.componentInstance.grid();
    grid.applyState({
      filter: {
        header: [['status', [0]]],
        searchText: 'kaya',
      },
    });
    await settle(fixture);
    const exported = await grid.getExportData();
    expect(exported.rows.map((row) => row.first)).toEqual(['Ali']);
  });

  it('drags rows out with the browser drag data', async () => {
    await create();
    const grid = fixture.componentInstance.grid();
    grid.selectedKeys.set([1, 4]);
    await settle(fixture);
    const handle = el.querySelector('.oge-row .oge-drag-handle') as HTMLElement;
    expect(handle.getAttribute('draggable')).toBe('true');
    const data = new Map<string, string>();
    const event = new Event('dragstart', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'dataTransfer', {
      value: {
        effectAllowed: 'all',
        setData: (type: string, value: string) => data.set(type, value),
        setDragImage: () => undefined,
      },
    });
    handle.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    const lines = data.get('text/plain')!.split('\r\n');
    expect(lines[0]).toBe('First\tName\tStatus\tCity');
    expect(lines.slice(1)).toEqual([
      'Ada\tAda Kaya\tFormer\tİzmir',
      'Ali\tAli Kaya\tActive\tirmik',
    ]);
    expect(
      JSON.parse(data.get('application/json')!).map((r: Person) => r.id),
    ).toEqual([1, 4]);
    const [drag] = fixture.componentInstance.drags;
    expect(drag.rows?.map((row) => row.id)).toEqual([1, 4]);
    expect(drag.dataTransfer).toBeDefined();
  });
});

describe('OgeGrid filterField on a server source', () => {
  it('sends filters and value lists under the server field', async () => {
    const loads: LoadOptions[] = [];
    const distinct: string[] = [];
    const source = new CustomDataSource<Person>({
      key: 'id',
      load: async (options) => {
        loads.push(options);
        return { data: PEOPLE, totalCount: PEOPLE.length };
      },
      distinct: async (field) => {
        distinct.push(field);
        return [];
      },
    });
    @Component({
      imports: [OgeGrid, OgeColumn],
      template: `
        <oge-grid #grid [data]="source" keyField="id" [headerFilter]="true">
          <oge-column field="name" filterField="lastName" />
          <oge-column field="city" />
        </oge-grid>
      `,
    })
    class ServerHost {
      readonly source = source;
      readonly grid = viewChild.required<OgeGrid<Person>>('grid');
    }
    const fixture = TestBed.createComponent(ServerHost);
    await settle(fixture);
    fixture.componentInstance.grid().applyState({
      filter: {
        row: [
          [
            'name',
            { type: 'binary', field: 'name', op: 'startswith', value: 'K' },
          ],
        ],
      },
    });
    await settle(fixture);
    expect(loads.at(-1)?.filter).toEqual({
      type: 'binary',
      field: 'lastName',
      op: 'startswith',
      value: 'K',
    });
    // the state keeps the column field
    expect(fixture.componentInstance.grid().state().filter?.row?.[0][0]).toBe(
      'name',
    );
    (
      fixture.nativeElement.querySelector(
        '.oge-header-cell[data-colid="name"] .oge-header-filter-btn',
      ) as HTMLButtonElement
    ).click();
    await settle(fixture);
    expect(distinct).toEqual(['lastName']);
  });
});
