import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { DataSource, LoadOptions, LoadResult } from '@oge-ui/core';
import { OgeCellTemplate } from '../templates/cell-template';
import { OgeHeaderTemplate } from '../templates/header-template';
import { OgeColumn } from '../columns/column';
import { OgeGrid } from './grid';

interface Person {
  id: number;
  fullName: string;
  age: number;
  active: boolean;
}

const PEOPLE: Person[] = [
  { id: 1, fullName: 'Ada Lovelace', age: 36, active: true },
  { id: 2, fullName: 'Grace Hopper', age: 85, active: false },
];

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function headerTexts(el: HTMLElement): (string | undefined)[] {
  return Array.from(el.querySelectorAll('.oge-header-cell')).map((h) =>
    h.querySelector('.oge-header-caption')?.textContent?.trim(),
  );
}

function columnTexts(
  el: HTMLElement,
  columnIndex: number,
): (string | undefined)[] {
  return Array.from(el.querySelectorAll('.oge-row')).map((row) =>
    row.querySelectorAll('.oge-cell')[columnIndex]?.textContent?.trim(),
  );
}

function rowCellTexts(
  el: HTMLElement,
  rowIndex: number,
): (string | undefined)[] {
  return Array.from(
    el.querySelectorAll('.oge-row')[rowIndex].querySelectorAll('.oge-cell'),
  ).map((c) => c.textContent?.trim());
}

function clickHeader(
  el: HTMLElement,
  index: number,
  init?: MouseEventInit,
): void {
  el.querySelectorAll('.oge-header-cell')[index].dispatchEvent(
    new MouseEvent('click', { bubbles: true, ...init }),
  );
}

describe('OgeGrid (auto/programmatic columns)', () => {
  async function render(
    inputs: Partial<{ data: readonly Person[]; columns: readonly string[] }>,
  ) {
    const fixture = TestBed.createComponent(OgeGrid<Person>);
    if (inputs.data) fixture.componentRef.setInput('data', inputs.data);
    if (inputs.columns)
      fixture.componentRef.setInput('columns', inputs.columns);
    await settle(fixture);
    return fixture.nativeElement as HTMLElement;
  }

  it('derives columns from the first row when none are given', async () => {
    const el = await render({ data: PEOPLE });
    expect(headerTexts(el)).toEqual(['Id', 'Full Name', 'Age', 'Active']);
  });

  it('renders one row per data item with cell values', async () => {
    const el = await render({ data: PEOPLE });
    expect(el.querySelectorAll('.oge-row').length).toBe(2);
    expect(rowCellTexts(el, 0)).toEqual(['1', 'Ada Lovelace', '36', 'true']);
  });

  it('respects an explicit column list and order', async () => {
    const el = await render({ data: PEOPLE, columns: ['fullName', 'id'] });
    expect(headerTexts(el)).toEqual(['Full Name', 'Id']);
  });

  it('shows an empty state without data', async () => {
    const el = await render({ data: [] });
    expect(el.querySelector('.oge-no-data')?.textContent).toContain('No data');
  });
});

@Component({
  imports: [OgeGrid, OgeColumn, OgeCellTemplate, OgeHeaderTemplate],
  template: `
    <oge-grid [data]="data" keyField="id">
      <oge-column field="fullName" caption="Name" [width]="200" />
      <oge-column field="age" dataType="number">
        <span *ogeCellTemplate="let value; row as person"
          >{{ value }}y ({{ person.fullName }})</span
        >
      </oge-column>
      <oge-column field="active" dataType="boolean" [visible]="activeVisible()">
        <em *ogeHeaderTemplate="let column">{{ column.field() }}!</em>
      </oge-column>
    </oge-grid>
  `,
})
class DeclarativeHost {
  readonly data = PEOPLE;
  readonly activeVisible = signal(true);
}

describe('OgeGrid (declarative columns)', () => {
  async function render() {
    const fixture = TestBed.createComponent(DeclarativeHost);
    await settle(fixture);
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('renders declared columns in order with caption fallback', async () => {
    const { el } = await render();
    expect(headerTexts(el)).toEqual(['Name', 'Age', 'active!']);
  });

  it('applies pixel widths to the grid template', async () => {
    const { el } = await render();
    const headerRow = el.querySelector('.oge-header-row') as HTMLElement;
    expect(headerRow.style.gridTemplateColumns).toBe(
      '200px minmax(120px, 1fr) minmax(120px, 1fr)',
    );
  });

  it('renders cell templates with value and row context', async () => {
    const { el } = await render();
    expect(rowCellTexts(el, 0)[1]).toBe('36y (Ada Lovelace)');
  });

  it('formats boolean cells with the default formatter', async () => {
    const { el } = await render();
    expect(rowCellTexts(el, 0)[2]).toBe('✓');
    expect(rowCellTexts(el, 1)[2]).toBe('✗');
  });

  it('reacts to visibility changes', async () => {
    const { fixture, el } = await render();
    fixture.componentInstance.activeVisible.set(false);
    await settle(fixture);
    expect(headerTexts(el)).toEqual(['Name', 'Age']);
  });
});

const SORT_ROWS: Person[] = [
  { id: 1, fullName: 'Cem', age: 30, active: true },
  { id: 2, fullName: 'Ali', age: 40, active: true },
  { id: 3, fullName: 'Ayşe', age: 40, active: false },
];

describe('OgeGrid sorting', () => {
  async function render() {
    const fixture = TestBed.createComponent(OgeGrid<Person>);
    fixture.componentRef.setInput('data', SORT_ROWS);
    fixture.componentRef.setInput('columns', ['fullName', 'age']);
    fixture.componentRef.setInput('keyField', 'id');
    await settle(fixture);
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('sorts ascending, then descending, then clears on header clicks', async () => {
    const { fixture, el } = await render();
    clickHeader(el, 0);
    await settle(fixture);
    expect(columnTexts(el, 0)).toEqual(['Ali', 'Ayşe', 'Cem']);
    expect(
      el.querySelectorAll('.oge-header-cell')[0].getAttribute('aria-sort'),
    ).toBe('ascending');

    clickHeader(el, 0);
    await settle(fixture);
    expect(columnTexts(el, 0)).toEqual(['Cem', 'Ayşe', 'Ali']);

    clickHeader(el, 0);
    await settle(fixture);
    expect(columnTexts(el, 0)).toEqual(['Cem', 'Ali', 'Ayşe']); // original order
  });

  it('builds a multi-sort chain with shift+click', async () => {
    const { fixture, el } = await render();
    clickHeader(el, 1); // age asc
    clickHeader(el, 0, { shiftKey: true }); // then name asc
    await settle(fixture);
    expect(columnTexts(el, 0)).toEqual(['Cem', 'Ali', 'Ayşe']);
  });

  it('single mode replaces instead of chaining', async () => {
    const { fixture, el } = await render();
    fixture.componentRef.setInput('sortable', 'single');
    clickHeader(el, 1);
    clickHeader(el, 0, { shiftKey: true });
    await settle(fixture);
    expect(columnTexts(el, 0)).toEqual(['Ali', 'Ayşe', 'Cem']); // only name asc
  });
});

describe('OgeGrid paging', () => {
  async function render() {
    const fixture = TestBed.createComponent(OgeGrid<Person>);
    fixture.componentRef.setInput('data', SORT_ROWS);
    fixture.componentRef.setInput('columns', ['fullName']);
    fixture.componentRef.setInput('paging', { pageSize: 2 });
    await settle(fixture);
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('renders only the current page and navigates', async () => {
    const { fixture, el } = await render();
    expect(columnTexts(el, 0)).toEqual(['Cem', 'Ali']);
    expect(el.querySelector('.oge-pager')).toBeTruthy();

    (el.querySelector('[aria-label="Next page"]') as HTMLButtonElement).click();
    await settle(fixture);
    expect(columnTexts(el, 0)).toEqual(['Ayşe']);
  });
});

interface Deferred {
  options: LoadOptions;
  resolve: (result: LoadResult<Person>) => void;
}

class DeferredSource implements DataSource<Person> {
  readonly capabilities = {
    sort: true,
    filter: true,
    group: true,
    paging: true,
    summary: true,
  };
  readonly calls: Deferred[] = [];
  load(options: LoadOptions): Promise<LoadResult<Person>> {
    return new Promise((resolve) => this.calls.push({ options, resolve }));
  }
  keyOf(item: Person): number {
    return item.id;
  }
}

describe('OgeGrid stale-load cancellation', () => {
  it('ignores a slow first response once a newer load has been issued', async () => {
    const source = new DeferredSource();
    const fixture = TestBed.createComponent(OgeGrid<Person>);
    fixture.componentRef.setInput('data', source);
    fixture.componentRef.setInput('columns', ['fullName']);
    await settle(fixture);
    expect(source.calls.length).toBe(1);

    const el = fixture.nativeElement as HTMLElement;
    clickHeader(el, 0); // triggers load #2 and aborts load #1
    await settle(fixture);
    expect(source.calls.length).toBe(2);
    expect(source.calls[0].options.signal?.aborted).toBe(true);

    // newer response arrives first…
    source.calls[1].resolve({ data: [SORT_ROWS[1]], totalCount: 1 });
    await settle(fixture);
    expect(columnTexts(el, 0)).toEqual(['Ali']);

    // …and the stale one afterwards must NOT overwrite it
    source.calls[0].resolve({ data: SORT_ROWS, totalCount: 3 });
    await settle(fixture);
    expect(columnTexts(el, 0)).toEqual(['Ali']);
  });
});
