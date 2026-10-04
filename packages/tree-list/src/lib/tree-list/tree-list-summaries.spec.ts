import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeColumn } from '@oge-ui/grid';
import {
  ArrayDataSource,
  createFilterPredicate,
  type DataSource,
  type FilterExpr,
} from '@oge-ui/core';
import type {
  OgeTreeListRemoteOperations,
  OgeTreeListSummary,
} from '@oge-ui/behavior';
import { OgeTreeList } from './tree-list';

interface Task {
  id: number;
  parentId: number | null;
  title: string;
  effort: number;
}

const TASKS: Task[] = [
  { id: 1, parentId: null, title: 'Root A', effort: 5 },
  { id: 2, parentId: 1, title: 'Child A1', effort: 3 },
  { id: 3, parentId: 2, title: 'Grand A1a', effort: 1 },
  { id: 4, parentId: null, title: 'Root B', effort: 2 },
];

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  imports: [OgeTreeList, OgeColumn],
  template: `
    <oge-tree-list
      [data]="data"
      keyExpr="id"
      parentIdExpr="parentId"
      [autoExpandAll]="true"
      [summary]="summary"
      [remoteOperations]="remoteOperations"
      [filterDebounce]="0"
      [filterValue]="filterValue"
    >
      <oge-column field="title" caption="Title" />
      <oge-column field="effort" caption="Effort" dataType="number" />
    </oge-tree-list>
  `,
})
class Host {
  data: readonly Task[] | DataSource<Task> = TASKS.map((task) => ({
    ...task,
  }));
  summary: OgeTreeListSummary<Task> | undefined = {
    totalItems: [
      { field: 'effort', type: 'sum' },
      { field: 'title', type: 'count' },
    ],
    recursiveItems: [{ field: 'effort', type: 'sum' }],
  };
  remoteOperations: OgeTreeListRemoteOperations | undefined = undefined;
  filterValue: FilterExpr | null = null;
}

async function render(configure?: (host: Host) => void) {
  const fixture = TestBed.createComponent(Host);
  configure?.(fixture.componentInstance);
  await settle(fixture);
  const tree = fixture.debugElement.children[0]
    .componentInstance as OgeTreeList<Task>;
  const el = fixture.nativeElement as HTMLElement;
  return { fixture, tree, el };
}

describe('OgeTreeList summaries', () => {
  it('renders the total footer row aligned with the columns', async () => {
    const { el } = await render();
    const footer = el.querySelector('.oge-total-row');
    expect(footer?.getAttribute('role')).toBe('row');
    const cells = [...(footer?.querySelectorAll('.oge-total-cell') ?? [])].map(
      (cell) => cell.textContent?.trim(),
    );
    expect(cells).toEqual(['Count: 4', 'Sum: 11']);
    // the footer counts as a row of the treegrid
    expect(
      el.querySelector('[role="treegrid"]')?.getAttribute('aria-rowcount'),
    ).toBe('6');
  });

  it('shows each parent its descendants’ aggregate', async () => {
    const { el } = await render();
    const summaries = [...el.querySelectorAll('.oge-tree-node-summary')].map(
      (span) => span.textContent?.trim(),
    );
    // Root A (3 + 1) and Child A1 (1); leaves and Root B carry none
    expect(summaries).toEqual(['Sum: 4', 'Sum: 1']);
  });

  it('has no footer without totalItems', async () => {
    const { el } = await render((host) => (host.summary = undefined));
    expect(el.querySelector('.oge-total-row')).toBeNull();
    expect(el.querySelector('.oge-tree-node-summary')).toBeNull();
  });

  it('exports per-parent footers and the total', async () => {
    const { tree } = await render();
    const data = tree.getExportData();
    expect(data.items?.map((item) => item.kind)).toEqual([
      'data',
      'data',
      'data',
      'groupFooter',
      'groupFooter',
      'data',
      'total',
    ]);
    const total = data.items?.at(-1);
    expect(total?.kind === 'total' && total.summaries[0].text).toBe('Sum: 11');
    expect(tree.getExportData({ summaries: false }).items).toBeUndefined();
  });
});

describe('OgeTreeList remoteOperations.filtering', () => {
  it('sends the search to the source and renders matches with ancestors', async () => {
    const calls: object[] = [];
    const local = new ArrayDataSource<Task>(TASKS, { key: 'id' });
    const source: DataSource<Task> = {
      capabilities: {
        sort: true,
        filter: true,
        group: false,
        paging: false,
        summary: false,
      },
      keyOf: (row) => row.id,
      load: async (options) => {
        calls.push(options);
        if (!options.searchText && !options.filter) return local.load({});
        const predicate = options.filter
          ? createFilterPredicate<Task>(options.filter)
          : () => true;
        // contract: matches plus their ancestors
        const hits = TASKS.filter(
          (row) =>
            predicate(row) &&
            row.title
              .toLowerCase()
              .includes((options.searchText ?? '').toLowerCase()),
        );
        const keep = new Set<number>();
        for (const hit of hits) {
          let current: Task | undefined = hit;
          while (current) {
            keep.add(current.id);
            const parent = current.parentId;
            current = TASKS.find((row) => row.id === parent);
          }
        }
        return { data: TASKS.filter((row) => keep.has(row.id)) };
      },
    };
    const { fixture, el } = await render((host) => {
      host.data = source;
      host.summary = undefined;
      host.remoteOperations = { filtering: true };
    });
    fixture.componentInstance.filterValue = {
      type: 'binary',
      field: 'title',
      op: 'contains',
      value: 'grand',
    };
    await settle(fixture);
    await settle(fixture);
    expect(calls.at(-1)).toHaveProperty('filter');
    const titles = [
      ...el.querySelectorAll('.oge-tree-cell .oge-tree-cell-text'),
    ].map((cell) => cell.textContent?.trim());
    expect(titles).toEqual(['Root A', 'Child A1', 'Grand A1a']);
  });
});
