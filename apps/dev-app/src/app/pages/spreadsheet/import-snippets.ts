import { demoSource } from '../../shared/demo-source';

export const IMPORT_GETTING_STARTED_SNIPPET = demoSource({
  use: { '@oge-ui/spreadsheet/import': ['OgeImportWizard'] },
  types: {
    '@oge-ui/spreadsheet/import': ['OgeImportEvent', 'OgeImportField'],
  },
  before: `interface Employee {
  name: string;
  email: string;
  department: string;
  startDate: Date;
  salary: number;
  active: boolean;
}`,
  body: `readonly fields: OgeImportField<Employee>[] = [
  { field: 'name', label: 'Full name', required: true },
  {
    field: 'email',
    label: 'Email',
    required: true,
    validate: (value) =>
      String(value).includes('@') ? null : 'Not an email address',
  },
  { field: 'department', label: 'Department', aliases: ['Team'] },
  { field: 'startDate', label: 'Start date', type: 'date' },
  { field: 'salary', label: 'Salary', type: 'number' },
  { field: 'active', label: 'Active', type: 'boolean' },
];
readonly saved = signal<readonly Employee[]>([]);

save(event: OgeImportEvent<Employee>): void {
  // event.records are typed and checked; send them to your API here
  this.saved.set(event.records);
}`,
  template: `<!-- Drop /demo/import/contacts.csv or contacts.xlsx: columns match by
     header text (keys, labels, aliases), every row is converted and checked,
     and only the valid records reach (imported). Nothing is uploaded. -->
<oge-import-wizard [fields]="fields" (imported)="save($event)" />
<p>{{ saved().length }} records saved</p>`,
});

export const IMPORT_PARSING_SNIPPET = demoSource({
  use: { '@oge-ui/spreadsheet/import': ['OgeImportWizard'] },
  types: { '@oge-ui/spreadsheet/import': ['OgeImportField'] },
  body: `readonly fields: OgeImportField[] = [
  { field: 'sku', label: 'SKU', required: true, aliases: ['Stok kodu'] },
  { field: 'price', label: 'Price', type: 'number', aliases: ['Fiyat'] },
  { field: 'since', label: 'Listed on', type: 'date', aliases: ['Tarih'] },
  { field: 'onSale', label: 'On sale', type: 'boolean', aliases: ['İndirimde'] },
];`,
  template: `<!-- parse sets how text cells read: "1.234,50" with a decimal comma,
     "04.03.2026" day first, and extra words for yes and no. -->
<oge-import-wizard
  [fields]="fields"
  [parse]="{
    decimalSeparator: ',',
    dateOrder: 'dmy',
    booleanWords: { true: ['aktif'], false: ['pasif'] },
  }"
/>`,
});
