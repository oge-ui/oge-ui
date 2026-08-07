import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeColumn } from '../columns/column';
import { OgeGrid } from './grid';

interface Person {
  id: number;
  name: string;
  age: number;
  city: string;
  active: boolean;
}

const PEOPLE: Person[] = [
  { id: 1, name: 'Ali Kaya', age: 30, city: 'Ankara', active: true },
  { id: 2, name: 'Ayşe Demir', age: 40, city: 'İzmir', active: false },
  { id: 3, name: 'Ali Çelik', age: 50, city: 'Ankara', active: true },
];

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function names(el: HTMLElement): string[] {
  return Array.from(el.querySelectorAll('.oge-row')).map(
    (row) => row.querySelectorAll('.oge-cell')[1]?.textContent?.trim() ?? '',
  );
}

async function render(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(OgeGrid<Person>);
  fixture.componentRef.setInput('data', PEOPLE);
  fixture.componentRef.setInput('columns', [
    'id',
    'name',
    'age',
    'city',
    'active',
  ]);
  fixture.componentRef.setInput('keyField', 'id');
  fixture.componentRef.setInput('filterDebounce', 0);
  for (const [key, value] of Object.entries(inputs))
    fixture.componentRef.setInput(key, value);
  await settle(fixture);
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

function setInput(
  el: HTMLElement,
  selector: string,
  value: string,
  eventName = 'input',
): void {
  const input = el.querySelector(selector) as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event(eventName, { bubbles: true }));
}

@Component({
  imports: [OgeGrid, OgeColumn],
  template: `
    <oge-grid
      [data]="data"
      keyField="id"
      [filterRow]="true"
      [filterDebounce]="0"
    >
      <oge-column field="name" />
      <oge-column field="age" dataType="number" />
      <oge-column field="active" dataType="boolean" />
    </oge-grid>
  `,
})
class TypedFilterHost {
  readonly data = PEOPLE;
}

describe('OgeGrid filter row', () => {
  it('renders dataType-specific editors', async () => {
    const fixture = TestBed.createComponent(TypedFilterHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const cells = el.querySelectorAll('.oge-filter-cell');
    expect(cells.length).toBe(3);
    expect(
      cells[0].querySelector('oge-text-box.oge-filter-input'),
    ).toBeTruthy();
    expect(
      cells[1].querySelector('oge-number-box.oge-filter-input'),
    ).toBeTruthy();
    expect(
      cells[2].querySelector('oge-select-box.oge-filter-input'),
    ).toBeTruthy();
  });

  it('filters with contains on text columns', async () => {
    const { fixture, el } = await render({ filterRow: true });
    setInput(el, '[aria-label="Filter Name"]', 'ali');
    await settle(fixture);
    expect(names(el)).toEqual(['Ali Kaya', 'Ali Çelik']);
  });

  it('combines multiple column filters with AND', async () => {
    const { fixture, el } = await render({ filterRow: true });
    setInput(el, '[aria-label="Filter Name"]', 'ali');
    setInput(el, '[aria-label="Filter Age"]', '50');
    await settle(fixture);
    expect(names(el)).toEqual(['Ali Çelik']);
  });

  it('clearing the input restores all rows', async () => {
    const { fixture, el } = await render({ filterRow: true });
    setInput(el, '[aria-label="Filter Name"]', 'ali');
    await settle(fixture);
    setInput(el, '[aria-label="Filter Name"]', '');
    await settle(fixture);
    expect(names(el).length).toBe(3);
  });

  it('resets the page index when the filter changes', async () => {
    const { fixture, el } = await render({
      filterRow: true,
      paging: { pageSize: 2 },
    });
    (el.querySelector('[aria-label="Next page"]') as HTMLButtonElement).click();
    await settle(fixture);
    expect(names(el)).toEqual(['Ali Çelik']); // page 2
    setInput(el, '[aria-label="Filter Name"]', 'a');
    await settle(fixture);
    // back on page 1 with the filter applied
    expect(names(el)).toEqual(['Ali Kaya', 'Ayşe Demir']);
  });
});

describe('OgeGrid search panel', () => {
  it('searches across all fields', async () => {
    const { fixture, el } = await render({ searchPanel: true });
    setInput(el, '.oge-search-input', 'izmir');
    await settle(fixture);
    expect(names(el)).toEqual(['Ayşe Demir']);
  });
});

describe('OgeGrid header filter', () => {
  it('opens the popup with distinct values and filters via selection', async () => {
    const { fixture, el } = await render({ headerFilter: true });
    const buttons = el.querySelectorAll('.oge-header-filter-btn');
    expect(buttons.length).toBe(5);

    (buttons[3] as HTMLButtonElement).click(); // city column
    await settle(fixture);
    const items = Array.from(
      el.querySelectorAll('.oge-hf-item:not(.oge-hf-all) > span'),
    ).map((s) => s.textContent?.trim());
    expect(items).toEqual(['Ankara', 'İzmir']);

    // uncheck 'Ankara' → only İzmir rows remain
    const ankaraCheckbox = el
      .querySelectorAll('.oge-hf-item:not(.oge-hf-all)')[0]
      .querySelector('input') as HTMLInputElement;
    ankaraCheckbox.click();
    await settle(fixture);
    expect(names(el)).toEqual(['Ayşe Demir']);
  });

  it('closes on outside click', async () => {
    const { fixture, el } = await render({ headerFilter: true });
    (
      el.querySelectorAll('.oge-header-filter-btn')[3] as HTMLButtonElement
    ).click();
    await settle(fixture);
    expect(el.querySelector('.oge-header-filter-popup')).toBeTruthy();
    // the anchored panel closes on document pointerdown outside anchor+panel
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    await settle(fixture);
    expect(el.querySelector('.oge-header-filter-popup')).toBeFalsy();
  });
});
