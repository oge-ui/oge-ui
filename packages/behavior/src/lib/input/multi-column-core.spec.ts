import { describe, expect, it } from 'vitest';
import {
  ogeComboCellText,
  ogeComboColumnCaption,
  ogeComboColumnTarget,
  ogeComboFixedWidth,
  ogeComboGridTemplate,
  ogeComboSearchStrings,
  type OgeComboBoxColumnBase,
} from './multi-column-core';

interface Product {
  sku: string;
  name: string;
  price: number;
  added: Date;
  vendor: { name: string };
}

const item: Product = {
  sku: 'A-100',
  name: 'Desk lamp',
  price: 1234.5,
  added: new Date(2026, 0, 15),
  vendor: { name: 'Lumen' },
};

describe('multi-column combo box columns', () => {
  it('captions default to a title-cased field', () => {
    expect(ogeComboColumnCaption({ field: 'unitPrice' })).toBe('Unit price');
    expect(ogeComboColumnCaption({ field: 'sku', caption: 'SKU' })).toBe('SKU');
  });

  it('formats numbers and dates through Intl, and reads dot paths', () => {
    const price: OgeComboBoxColumnBase<Product> = {
      field: 'price',
      format: { style: 'currency', currency: 'EUR' },
    };
    expect(ogeComboCellText(price, item, 'en-US')).toBe('€1,234.50');
    const added: OgeComboBoxColumnBase<Product> = {
      field: 'added',
      format: { year: 'numeric', month: '2-digit', day: '2-digit' },
    };
    expect(ogeComboCellText(added, item, 'en-US')).toBe('01/15/2026');
    expect(ogeComboCellText({ field: 'vendor.name' }, item)).toBe('Lumen');
    expect(ogeComboCellText({ field: 'missing' }, item)).toBe('');
  });

  it('a function format sees the raw value and the item', () => {
    const column: OgeComboBoxColumnBase<Product> = {
      field: 'sku',
      format: (value, row) => `${String(value)} · ${row.name}`,
    };
    expect(ogeComboCellText(column, item)).toBe('A-100 · Desk lamp');
  });

  it('search strings skip unsearchable columns', () => {
    const columns: OgeComboBoxColumnBase<Product>[] = [
      { field: 'sku' },
      { field: 'name' },
      { field: 'price', searchable: false },
    ];
    expect(ogeComboSearchStrings(columns, item)).toEqual([
      'A-100',
      'Desk lamp',
    ]);
  });

  it('builds one grid template for header and rows', () => {
    expect(
      ogeComboGridTemplate<Product>([
        { field: 'sku', width: 90 },
        { field: 'name' },
        { field: 'price', width: '8rem' },
      ]),
    ).toBe('90px minmax(6rem, 1fr) 8rem');
    expect(ogeComboFixedWidth<Product>([{ field: 'sku', width: 90 }])).toBe(90);
    expect(ogeComboFixedWidth<Product>([{ field: 'sku' }])).toBeUndefined();
  });

  it('moves the active column, mirrored in RTL', () => {
    expect(ogeComboColumnTarget(0, 'ArrowRight', 3)).toBe(1);
    expect(ogeComboColumnTarget(2, 'ArrowRight', 3)).toBe(2);
    expect(ogeComboColumnTarget(0, 'ArrowLeft', 3)).toBe(0);
    expect(ogeComboColumnTarget(1, 'ArrowRight', 3, true)).toBe(0);
    expect(ogeComboColumnTarget(1, 'End', 3)).toBe(2);
    expect(ogeComboColumnTarget(-1, 'Home', 3)).toBe(0);
    expect(ogeComboColumnTarget(0, 'Home', 0)).toBe(-1);
  });
});
