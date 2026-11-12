import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React import wizard. Pure data, no React imports — the
 * `llms.txt` generator and the compile gate load this module in plain Node.
 * Section-for-section mirror of `../spreadsheet/import.ts`.
 */
export const IMPORT_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Getting started',
    source: reactDemoSource({
      use: { '@oge-ui/react-spreadsheet/import': ['OgeImportWizard'] },
      types: {
        '@oge-ui/react-spreadsheet/import': [
          'OgeImportEvent',
          'OgeImportField',
        ],
      },
      react: ['useState'],
      before: `interface Employee {
  name: string;
  email: string;
  department: string;
  startDate: Date;
  salary: number;
  active: boolean;
}

const FIELDS: OgeImportField<Employee>[] = [
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
];`,
      name: 'EmployeeImport',
      body: `const [saved, setSaved] = useState<readonly Employee[]>([]);
// event.records are typed and checked; send them to your API here
const save = (event: OgeImportEvent<Employee>) => setSaved(event.records);`,
      jsx: `<>
  {/* Drop /demo/import/contacts.csv or contacts.xlsx: columns match by
      header text (keys, labels, aliases), every row is converted and
      checked, and only the valid records reach onImported. */}
  <OgeImportWizard fields={FIELDS} onImported={save} />
  <p>{saved.length} records saved</p>
</>`,
    }),
  },
  {
    title: 'Parsing options',
    source: reactDemoSource({
      use: { '@oge-ui/react-spreadsheet/import': ['OgeImportWizard'] },
      types: { '@oge-ui/react-spreadsheet/import': ['OgeImportField'] },
      before: `const FIELDS: OgeImportField[] = [
  { field: 'sku', label: 'SKU', required: true, aliases: ['Stok kodu'] },
  { field: 'price', label: 'Price', type: 'number', aliases: ['Fiyat'] },
  { field: 'since', label: 'Listed on', type: 'date', aliases: ['Tarih'] },
  { field: 'onSale', label: 'On sale', type: 'boolean', aliases: ['İndirimde'] },
];`,
      name: 'ProductImport',
      jsx: `<>
  {/* parse sets how text cells read: "1.234,50" with a decimal comma,
      "04.03.2026" day first, and extra words for yes and no. */}
  <OgeImportWizard
    fields={FIELDS}
    parse={{
      decimalSeparator: ',',
      dateOrder: 'dmy',
      booleanWords: { true: ['aktif'], false: ['pasif'] },
    }}
  />
</>`,
    }),
  },
];
