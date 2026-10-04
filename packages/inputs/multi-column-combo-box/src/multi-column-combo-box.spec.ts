import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { OgeMultiColumnComboBox } from './multi-column-combo-box';
import type {
  OgeComboBoxColumn,
  OgeMultiColumnComboBoxSelectionChangedEvent,
  OgeMultiColumnComboBoxSelectionMode,
} from './multi-column-combo-box-types';

interface Product {
  id: number;
  sku: string;
  name: string;
  price: number;
  vendor: { name: string };
}

const PRODUCTS: Product[] = [
  {
    id: 1,
    sku: 'L-100',
    name: 'Desk lamp',
    price: 49,
    vendor: { name: 'Lumen' },
  },
  {
    id: 2,
    sku: 'C-200',
    name: 'Office chair',
    price: 249,
    vendor: { name: 'Sitwell' },
  },
  {
    id: 3,
    sku: 'M-300',
    name: 'Monitor arm',
    price: 89,
    vendor: { name: 'Lumen' },
  },
];

const COLUMNS: OgeComboBoxColumn<Product>[] = [
  { field: 'sku', caption: 'SKU', width: 80 },
  { field: 'name' },
  { field: 'vendor.name', caption: 'Vendor' },
  {
    field: 'price',
    format: { style: 'currency', currency: 'USD' },
    alignment: 'end',
    searchable: false,
  },
];

@Component({
  imports: [OgeMultiColumnComboBox],
  template: `
    <oge-multi-column-combo-box
      label="Product"
      [items]="items"
      [columns]="columns"
      valueExpr="id"
      displayExpr="name"
      [selectionMode]="mode()"
      [(value)]="value"
      (selectionChanged)="changes.push($event)"
    />
  `,
})
class Host {
  readonly items = PRODUCTS;
  readonly columns = COLUMNS;
  readonly mode = signal<OgeMultiColumnComboBoxSelectionMode>('single');
  readonly value = signal<unknown>(null);
  readonly changes: OgeMultiColumnComboBoxSelectionChangedEvent<Product>[] = [];
}

@Component({
  imports: [OgeMultiColumnComboBox, ReactiveFormsModule],
  template: `
    <oge-multi-column-combo-box
      label="Product"
      [items]="items"
      [columns]="columns"
      valueExpr="id"
      [formControl]="control"
    />
  `,
})
class FormHost {
  readonly items = PRODUCTS;
  readonly columns = COLUMNS;
  readonly control = new FormControl<unknown>(2);
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

function combo(
  fixture: ComponentFixture<Host>,
): OgeMultiColumnComboBox<Product> {
  return fixture.debugElement.children[0].componentInstance;
}

function inputEl(fixture: ComponentFixture<unknown>): HTMLInputElement {
  return fixture.nativeElement.querySelector('.oge-input-native');
}

function key(
  fixture: ComponentFixture<unknown>,
  name: string,
  init: KeyboardEventInit = {},
): void {
  inputEl(fixture).dispatchEvent(
    new KeyboardEvent('keydown', { key: name, bubbles: true, ...init }),
  );
}

function rows(fixture: ComponentFixture<unknown>): HTMLElement[] {
  return Array.from(
    fixture.nativeElement.querySelectorAll<HTMLElement>(
      '.oge-mccb-row.oge-select-option',
    ),
  );
}

describe('OgeMultiColumnComboBox', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'requestAnimationFrame',
      (cb: FrameRequestCallback) =>
        setTimeout(() => cb(performance.now()), 0) as unknown as number,
    );
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  });

  afterEach(() => vi.unstubAllGlobals());

  it('is a combobox with a grid popup: header, rows, gridcells', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    expect(inputEl(fixture).getAttribute('role')).toBe('combobox');
    expect(inputEl(fixture).getAttribute('aria-haspopup')).toBe('grid');
    combo(fixture).open();
    await settle(fixture);
    const grid: HTMLElement =
      fixture.nativeElement.querySelector('[role="grid"]');
    expect(inputEl(fixture).getAttribute('aria-controls')).toBe(grid.id);
    expect(grid.getAttribute('aria-rowcount')).toBe('4');
    expect(grid.getAttribute('aria-colcount')).toBe('4');
    const headers = Array.from(
      grid.querySelectorAll<HTMLElement>('[role="columnheader"]'),
    ).map((el) => el.textContent?.trim());
    expect(headers).toEqual(['SKU', 'Name', 'Vendor', 'Price']);
    const first = rows(fixture)[0];
    expect(first.getAttribute('aria-rowindex')).toBe('2');
    const cells = Array.from(
      first.querySelectorAll<HTMLElement>('[role="gridcell"]'),
    ).map((el) => el.textContent?.trim());
    // the host's ICU locale formats the currency (tr-TR on some machines)
    const price = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
    }).format(49);
    expect(cells).toEqual(['L-100', 'Desk lamp', 'Lumen', price]);
  });

  it('navigates rows with Up/Down and cells with Left/Right via aria-activedescendant', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    key(fixture, 'ArrowDown');
    await settle(fixture);
    expect(combo(fixture).opened()).toBe(true);
    key(fixture, 'ArrowDown');
    await settle(fixture);
    const active = () => inputEl(fixture).getAttribute('aria-activedescendant');
    expect(active()).toMatch(/-cell-1-0$/);
    key(fixture, 'ArrowRight');
    key(fixture, 'ArrowRight');
    await settle(fixture);
    expect(active()).toMatch(/-cell-1-2$/);
    expect(
      fixture.nativeElement.querySelector('.oge-mccb-cell-active')?.textContent,
    ).toContain('Sitwell');
    key(fixture, 'End');
    await settle(fixture);
    expect(active()).toMatch(/-cell-1-3$/);
    key(fixture, 'Enter');
    await settle(fixture);
    expect(fixture.componentInstance.value()).toBe(2);
    expect(combo(fixture).opened()).toBe(false);
    expect(inputEl(fixture).value).toBe('Office chair');
  });

  it('searches across the searchable columns, formatted', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const input = inputEl(fixture);
    input.value = 'lumen';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 300));
    await settle(fixture);
    expect(rows(fixture)).toHaveLength(2);
    // price is not searchable
    input.value = '249';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 300));
    await settle(fixture);
    expect(rows(fixture)).toHaveLength(0);
  });

  it('multiple mode renders chips, keeps the popup open and reports deltas', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.mode.set('multiple');
    fixture.componentInstance.value.set([]);
    await settle(fixture);
    combo(fixture).open();
    await settle(fixture);
    expect(
      fixture.nativeElement
        .querySelector('[role="grid"]')
        .getAttribute('aria-multiselectable'),
    ).toBe('true');
    rows(fixture)[0].click();
    await settle(fixture);
    rows(fixture)[2].click();
    await settle(fixture);
    expect(combo(fixture).opened()).toBe(true);
    expect(fixture.componentInstance.value()).toEqual([1, 3]);
    const chips = Array.from(
      fixture.nativeElement.querySelectorAll<HTMLElement>('.oge-tag-text'),
    ).map((el) => el.textContent);
    expect(chips).toEqual(['Desk lamp', 'Monitor arm']);
    expect(fixture.componentInstance.changes.at(-1)?.addedItems).toEqual([
      PRODUCTS[2],
    ]);
    key(fixture, 'Backspace');
    await settle(fixture);
    expect(fixture.componentInstance.value()).toEqual([1]);
  });

  it('works as a reactive-forms control', async () => {
    const fixture = TestBed.createComponent(FormHost);
    await settle(fixture);
    expect(inputEl(fixture).value).toBe('C-200');
    fixture.componentInstance.control.setValue(3);
    await settle(fixture);
    expect(inputEl(fixture).value).toBe('M-300');
  });
});
