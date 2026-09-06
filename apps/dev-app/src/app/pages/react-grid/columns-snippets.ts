import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

const EMPLOYEE = `interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  department: string;
  city: string;
  salary: number;
}

declare const employees: Employee[];

const departments = [
  { code: 'Engineering', label: 'Mühendislik' },
  { code: 'Sales', label: 'Satış' },
  { code: 'HR', label: 'İnsan Kaynakları' },
  { code: 'Finance', label: 'Finans' },
  { code: 'Support', label: 'Destek' },
];`;

/**
 * Demo source for the React columns page — mirror of
 * `../data-grid/columns-snippets.ts`. Pure data, no React imports.
 */
export const GRID_COLUMNS_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Bands, lookups, calculated and adaptive columns',
    source: reactDemoSource({
      use: { '@oge-ui/react-grid': ['OgeGrid'] },
      name: 'ColumnsGrid',
      before: `${EMPLOYEE}

// \`bandCaption\` is the React form of <oge-column-group>: adjacent columns
// sharing a caption merge into one spanning band header
const columns = [
  { field: 'id', caption: 'Id', width: 70, dataType: 'number' as const,
    sortOrder: 'desc' as const, editable: false },
  { field: 'firstName', caption: 'First Name', bandCaption: 'Person' },
  { field: 'lastName', caption: 'Last Name', bandCaption: 'Person', hidingPriority: 1 },
  { field: 'department', caption: 'Department',
    lookup: { dataSource: departments, valueExpr: 'code', displayExpr: 'label' } },
  { caption: 'Yearly', dataType: 'number' as const, width: 110,
    calculateCellValue: (row: Employee) => row.salary * 12 },
  { field: 'city', caption: 'City', hidingPriority: 0 },
];`,
      jsx: `<OgeGrid
  data={employees}
  keyField="id"
  columns={columns}
  wordWrap
  editing={{ mode: 'cell' }}
  filterRow
  filterDebounce={200}
  paging={{ pageSize: 10 }}
/>`,
    }),
  },
  {
    title: 'Custom sort keys & filter expressions',
    source: reactDemoSource({
      use: { '@oge-ui/react-grid': ['OgeGrid'] },
      types: { '@oge-ui/core': ['FilterExpr'] },
      name: 'CalculatedColumns',
      before: `${EMPLOYEE}

// sort the lookup column by its display label, not the stored code
const departmentLabel = (row: Employee) =>
  departments.find((d) => d.code === row.department)?.label ?? row.department;

// '60' in the filter row means the 60k band: 60000 <= salary < 61000
const salaryBandFilter = (value: unknown): FilterExpr | null => {
  const band = Number(value);
  if (value == null || value === '' || Number.isNaN(band)) return null;
  return {
    type: 'and',
    operands: [
      { type: 'binary', field: 'salary', op: 'ge', value: band * 1000 },
      { type: 'binary', field: 'salary', op: 'lt', value: (band + 1) * 1000 },
    ],
  };
};

const columns = [
  { field: 'firstName', caption: 'First Name' },
  { field: 'department', caption: 'Department',
    lookup: { dataSource: departments, valueExpr: 'code', displayExpr: 'label' },
    calculateSortValue: departmentLabel },
  { field: 'salary', caption: 'Salary Band (k)', dataType: 'number' as const,
    format: (v: unknown) => \`\${Math.floor(Number(v) / 1000)}k\`,
    calculateFilterExpression: salaryBandFilter },
];`,
      jsx: `<OgeGrid
  data={employees}
  keyField="id"
  columns={columns}
  filterRow
  paging={{ pageSize: 8 }}
/>`,
    }),
  },
  {
    title: 'Right-to-left',
    source: reactDemoSource({
      use: { '@oge-ui/react-grid': ['OgeGrid'] },
      name: 'RtlGrid',
      before: `${EMPLOYEE}

const columns = [
  { field: 'id', caption: 'No', width: 70, dataType: 'number' as const, pinned: 'left' as const },
  { field: 'firstName', caption: 'Ad' },
  { field: 'lastName', caption: 'Soyad' },
  { field: 'city', caption: 'Şehir' },
  { field: 'salary', caption: 'Maaş', dataType: 'number' as const },
];`,
      jsx: `<OgeGrid
  data={employees}
  keyField="id"
  columns={columns}
  rtlEnabled
  paging={{ pageSize: 6, displayMode: 'compact' }}
/>`,
    }),
  },
];
