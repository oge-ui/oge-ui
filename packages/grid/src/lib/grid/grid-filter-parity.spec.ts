import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { FilterExpr } from '@oge-ui/core';
import {
  builderToExpr,
  describeExpr,
  exprToBuilder,
  type BuilderGroup,
  type FilterBuilderField,
} from '../filter-builder/filter-builder';
import { OGE_DEFAULT_MESSAGES } from '../config';
import { OgeColumn } from '../columns/column';
import { OgeGrid } from './grid';

interface Person {
  id: number;
  name: string;
  city: string;
  age: number;
}

const PEOPLE: Person[] = [
  { id: 1, name: 'Ali Kaya', age: 30, city: 'Ankara' },
  { id: 2, name: 'Ayşe Demir', age: 40, city: 'İzmir' },
  { id: 3, name: 'Ali Çelik', age: 50, city: 'Ankara' },
];

const FIELDS: FilterBuilderField[] = [
  { field: 'name', caption: 'Name', dataType: 'string' },
  { field: 'age', caption: 'Age', dataType: 'number' },
];

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function names(el: HTMLElement): string[] {
  return Array.from(el.querySelectorAll('.oge-row')).map(
    (row) => row.querySelectorAll('.oge-cell')[1]?.textContent?.trim() ?? ''
  );
}

describe('filter builder converters', () => {
  it('round-trips a nested expression', () => {
    const expr: FilterExpr = {
      type: 'or',
      operands: [
        { type: 'binary', field: 'name', op: 'startswith', value: 'a' },
        {
          type: 'and',
          operands: [
            { type: 'binary', field: 'age', op: 'ge', value: 30 },
            { type: 'binary', field: 'age', op: 'le', value: 50 },
          ],
        },
      ],
    };
    const tree = exprToBuilder(expr, FIELDS);
    expect(tree.logic).toBe('or');
    expect(tree.items).toHaveLength(2);
    const back = builderToExpr(tree, FIELDS);
    expect(back).toEqual(expr);
  });

  it('drops empty conditions and typed-parses number values', () => {
    const tree: BuilderGroup = {
      kind: 'group',
      logic: 'and',
      items: [
        { kind: 'condition', field: 'age', op: 'gt', value: '35' },
        { kind: 'condition', field: 'name', op: 'contains', value: '   ' },
      ],
    };
    expect(builderToExpr(tree, FIELDS)).toEqual({
      type: 'binary',
      field: 'age',
      op: 'gt',
      value: 35,
    });
  });

  it('describes expressions with captions and operator labels', () => {
    const text = describeExpr(
      {
        type: 'and',
        operands: [
          { type: 'binary', field: 'name', op: 'contains', value: 'ali' },
          { type: 'binary', field: 'age', op: 'gt', value: 30 },
        ],
      },
      FIELDS,
      OGE_DEFAULT_MESSAGES
    );
    expect(text).toBe("[Name] Contains 'ali' And [Age] Greater than '30'");
  });
});

@Component({
  imports: [OgeGrid, OgeColumn],
  template: `
    <oge-grid
      [data]="data"
      keyField="id"
      [filterRow]="true"
      [filterDebounce]="0"
      [filterPanel]="true"
      [searchPanel]="true"
      [headerFilter]="true"
      [filterValue]="filterValue()"
      (filterValueChange)="filterValue.set($event)"
    >
      <oge-column field="id" dataType="number" [width]="60" [filterable]="false" />
      <oge-column field="name" />
      <oge-column field="city" />
      <oge-column field="age" dataType="number" />
    </oge-grid>
  `,
})
class FilterParityHost {
  readonly data = PEOPLE;
  readonly filterValue = signal<FilterExpr | null>(null);
}

async function render() {
  const fixture = TestBed.createComponent(FilterParityHost);
  await settle(fixture);
  return { fixture, host: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
}

describe('filter-row operator menu', () => {
  it('switches the operator and re-applies the current value', async () => {
    const { fixture, el } = await render();
    const nameFilter = el.querySelector('[aria-label="Filter Name"]') as HTMLInputElement;
    nameFilter.value = 'ali';
    nameFilter.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(fixture);
    expect(names(el)).toEqual(['Ali Kaya', 'Ali Çelik']); // contains (default)

    // open the operator menu of the Name column (first visible op button)
    (el.querySelectorAll('.oge-filter-op-btn')[0] as HTMLButtonElement).click();
    await settle(fixture);
    const items = Array.from(el.querySelectorAll('.oge-operator-menu .oge-menu-item'));
    expect(items.map((i) => i.textContent?.trim())).toContain('Ends with');
    (items.find((i) => i.textContent?.includes('Ends with')) as HTMLButtonElement).click();
    await settle(fixture);
    expect(names(el)).toEqual([]); // nothing ends with 'ali'

    (el.querySelectorAll('.oge-filter-op-btn')[0] as HTMLButtonElement).click();
    await settle(fixture);
    (
      Array.from(el.querySelectorAll('.oge-operator-menu .oge-menu-item')).find((i) =>
        i.textContent?.includes('Starts with')
      ) as HTMLButtonElement
    ).click();
    await settle(fixture);
    expect(names(el)).toEqual(['Ali Kaya', 'Ali Çelik']);
  });
});

describe('filter panel + [filterValue]', () => {
  it('applies a programmatic filterValue and shows it in the panel', async () => {
    const { fixture, host, el } = await render();
    host.filterValue.set({ type: 'binary', field: 'age', op: 'gt', value: 35 });
    await settle(fixture);
    expect(names(el)).toEqual(['Ayşe Demir', 'Ali Çelik']);
    expect(el.querySelector('.oge-filter-panel-text')?.textContent).toContain(
      "[Age] Greater than '35'"
    );

    // clear via the panel × and expect the model to sync back to null
    (el.querySelector('.oge-filter-panel-clear') as HTMLButtonElement).click();
    await settle(fixture);
    expect(host.filterValue()).toBeNull();
    expect(names(el)).toHaveLength(3);
  });

  it('builds a filter through the builder dialog', async () => {
    const { fixture, host, el } = await render();
    (el.querySelector('.oge-filter-panel-text') as HTMLButtonElement).click();
    await settle(fixture);
    const popup = el.querySelector('.oge-builder-popup') as HTMLElement;
    expect(popup).toBeTruthy();

    // default first condition targets Name; set value and apply
    const valueInput = popup.querySelector('input.oge-fb-input') as HTMLInputElement;
    valueInput.value = 'ayşe';
    valueInput.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(fixture);
    (
      Array.from(popup.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Apply')
      ) as HTMLButtonElement
    ).click();
    await settle(fixture);

    expect(el.querySelector('.oge-builder-popup')).toBeFalsy();
    expect(names(el)).toEqual(['Ayşe Demir']);
    expect(host.filterValue()).toEqual({
      type: 'binary',
      field: 'name',
      op: 'contains',
      value: 'ayşe',
    });
  });
});

describe('search highlighting + header filter search', () => {
  it('wraps search matches in <mark>', async () => {
    const { fixture, el } = await render();
    const search = el.querySelector('.oge-search-input') as HTMLInputElement;
    search.value = 'ali';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(fixture);
    const marks = el.querySelectorAll('mark.oge-highlight');
    expect(marks.length).toBe(2);
    expect(marks[0].textContent).toBe('Ali');
  });

  it('filters the header-filter value list with its search box', async () => {
    const { fixture, el } = await render();
    // open header filter on City column
    (el.querySelectorAll('.oge-header-filter-btn')[1] as HTMLButtonElement).click();
    await settle(fixture);
    const itemsBefore = el.querySelectorAll('.oge-hf-item:not(.oge-hf-all)');
    expect(itemsBefore.length).toBe(2);

    const hfSearch = el.querySelector('.oge-hf-search') as HTMLInputElement;
    hfSearch.value = 'izm';
    hfSearch.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(fixture);
    const items = Array.from(el.querySelectorAll('.oge-hf-item:not(.oge-hf-all) span')).map((s) =>
      s.textContent?.trim()
    );
    expect(items).toEqual(['İzmir']);
  });
});

interface Order {
  id: number;
  name: string;
  shipped: string;
}

@Component({
  imports: [OgeGrid, OgeColumn],
  template: `
    <oge-grid [data]="data" keyField="id" [headerFilter]="true">
      <oge-column field="name" caption="Name" />
      <oge-column field="shipped" caption="Shipped" dataType="date" />
    </oge-grid>
  `,
})
class DateHeaderFilterHost {
  readonly data: Order[] = [
    { id: 1, name: 'A', shipped: '2024-01-10' },
    { id: 2, name: 'B', shipped: '2024-06-05' },
    { id: 3, name: 'C', shipped: '2025-02-20' },
  ];
}

describe('header filter grouped date values', () => {
  async function renderDates() {
    const fixture = TestBed.createComponent(DateHeaderFilterHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    (el.querySelectorAll('.oge-header-filter-btn')[1] as HTMLButtonElement).click();
    await settle(fixture);
    return { fixture, el };
  }

  it('groups values by year with leaves underneath', async () => {
    const { el } = await renderDates();
    const groups = Array.from(el.querySelectorAll('.oge-hf-group span')).map((s) =>
      s.textContent?.trim()
    );
    expect(groups).toEqual(['2024', '2025']);
    expect(el.querySelectorAll('.oge-hf-leaf').length).toBe(3);
  });

  it('search matches year labels and individual dates', async () => {
    const { fixture, el } = await renderDates();
    const hfSearch = el.querySelector('.oge-hf-search') as HTMLInputElement;

    hfSearch.value = '2025';
    hfSearch.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(fixture);
    expect(el.querySelectorAll('.oge-hf-group').length).toBe(1);
    expect(el.querySelectorAll('.oge-hf-leaf').length).toBe(1);

    hfSearch.value = '06-05';
    hfSearch.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(fixture);
    const leaves = Array.from(el.querySelectorAll('.oge-hf-leaf span')).map((s) =>
      s.textContent?.trim()
    );
    expect(leaves).toEqual(['2024-06-05']);
  });

  it('year checkbox toggles all its dates and filters the rows', async () => {
    const { fixture, el } = await renderDates();
    // uncheck the whole 2024 group → only the 2025 row remains
    (el.querySelectorAll('.oge-hf-group input')[0] as HTMLInputElement).click();
    await settle(fixture);
    const rows = Array.from(el.querySelectorAll('.oge-row .oge-cell:first-child')).map((c) =>
      c.textContent?.trim()
    );
    expect(rows).toEqual(['C']);
    // group checkbox reflects the cleared state
    expect((el.querySelectorAll('.oge-hf-group input')[0] as HTMLInputElement).checked).toBe(false);
  });
});
