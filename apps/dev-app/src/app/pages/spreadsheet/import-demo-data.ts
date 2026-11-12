import type { OgeImportField } from '@oge-ui/spreadsheet/import';

// Demo data shared by the Angular and React views of the import wizard page.

/** A record of the employee demo. */
export interface DemoEmployee {
  name: string;
  email: string;
  department: string;
  startDate: Date;
  salary: number;
  active: boolean;
}

/** The fields of the employee demo, shared with the React view. */
export const DEMO_EMPLOYEE_FIELDS: OgeImportField<DemoEmployee>[] = [
  { field: 'name', label: 'Full name', required: true },
  {
    field: 'email',
    label: 'Email',
    required: true,
    validate: (value) =>
      /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(value))
        ? null
        : 'Not an email address',
  },
  { field: 'department', label: 'Department', aliases: ['Team'] },
  { field: 'startDate', label: 'Start date', type: 'date' },
  { field: 'salary', label: 'Salary', type: 'number' },
  { field: 'active', label: 'Active', type: 'boolean' },
];

/** The fields of the parsing demo, shared with the React view. */
export const DEMO_PRODUCT_FIELDS: OgeImportField[] = [
  { field: 'sku', label: 'SKU', required: true, aliases: ['Stok kodu'] },
  { field: 'price', label: 'Price', type: 'number', aliases: ['Fiyat'] },
  { field: 'since', label: 'Listed on', type: 'date', aliases: ['Tarih'] },
  {
    field: 'onSale',
    label: 'On sale',
    type: 'boolean',
    aliases: ['İndirimde'],
  },
];

/** How the parsing demo reads text cells. */
export const DEMO_PRODUCT_PARSE = {
  decimalSeparator: ',',
  dateOrder: 'dmy',
  booleanWords: { true: ['aktif'], false: ['pasif'] },
} as const;

/** A small Turkish-style CSV for the parsing demo. */
export const DEMO_PRODUCTS_CSV =
  'Stok kodu;Fiyat;Tarih;İndirimde\n' +
  'A-100;1.234,50;04.03.2026;aktif\n' +
  'A-101;89,90;15.11.2025;pasif\n' +
  'A-102;on iki;31.02.2026;aktif\n';

/** Fetches a sample file from the dev app's public folder. */
export async function demoSampleFile(name: string): Promise<File> {
  const response = await fetch(`/demo/import/${name}`);
  return new File([await response.blob()], name);
}
