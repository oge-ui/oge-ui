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
  hireDate: string;
}

declare const employees: Employee[];`;

/**
 * Demo sources for the React export page — mirror of
 * `../data-grid/export-snippets.ts`. Pure data, no React imports.
 */
export const GRID_EXPORT_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Rich Excel export',
    source: reactDemoSource({
      react: ['useRef'],
      use: { '@oge-ui/react-grid': ['OgeGrid'] },
      types: {
        '@oge-ui/react-grid': [
          'OgeExportCellStyleArgs',
          'OgeGridColumnProps',
          'OgeGridHandle',
        ],
      },
      name: 'ExcelExport',
      before: `${EMPLOYEE}

const columns: OgeGridColumnProps<Employee>[] = [
  { field: 'id', caption: 'Id', width: 70, dataType: 'number', pinned: 'left' },
  // a band becomes a merged two-row header in Excel and PDF
  { field: 'firstName', caption: 'First Name', width: 140, bandCaption: 'Employee' },
  { field: 'lastName', caption: 'Last Name', width: 140, bandCaption: 'Employee' },
  { field: 'city', caption: 'City' },
  { field: 'hireDate', caption: 'Hired', dataType: 'date' },
  { field: 'salary', caption: 'Salary', dataType: 'number',
    groupSummary: 'sum', groupSummaryPosition: 'footer', totalSummary: 'sum' },
];

// conditional formatting: one value-level hook styles Excel and PDF alike
const cellStyle = ({ column, value, kind }: OgeExportCellStyleArgs<Employee>) =>
  kind === 'data' && column.field === 'salary' && Number(value) > 8000
    ? { background: '#fff4ce', color: '#7a4b00', bold: true }
    : undefined;`,
      body: `const grid = useRef<OgeGridHandle<Employee>>(null);

// the lazy entry keeps exceljs out of the main bundle
const excel = async (selectedRowsOnly = false) => {
  const { exportGridToExcel } = await import('@oge-ui/react-grid/export-excel');
  if (!grid.current) return;
  await exportGridToExcel(grid.current, {
    filename: 'employees.xlsx',
    selectedRowsOnly,
    summaryFormulas: true, // group footers + total as SUBTOTAL formulas
    columnFormats: { salary: '#,##0 "€"' },
    cellStyle,
  });
};`,
      jsx: `<>
  <button type="button" onClick={() => void excel()}>Excel</button>
  <button type="button" onClick={() => void excel(true)}>Selected rows</button>
  <OgeGrid
    ref={grid}
    data={employees}
    keyField="id"
    columns={columns}
    selectionMode="multiple"
    groupBy={['department']}
  />
</>`,
    }),
  },
  {
    title: 'PDF page chrome',
    source: reactDemoSource({
      react: ['useRef'],
      use: { '@oge-ui/react-grid': ['OgeGrid'] },
      types: { '@oge-ui/react-grid': ['OgeGridColumnProps', 'OgeGridHandle'] },
      name: 'PdfExport',
      before: `${EMPLOYEE}

const columns: OgeGridColumnProps<Employee>[] = [
  { field: 'firstName', caption: 'First Name' },
  { field: 'lastName', caption: 'Last Name' },
  { field: 'city', caption: 'City' },
  { field: 'salary', caption: 'Salary', dataType: 'number', totalSummary: 'sum' },
];`,
      body: `const grid = useRef<OgeGridHandle<Employee>>(null);

const pdf = async () => {
  const { exportGridToPdf } = await import('@oge-ui/react-grid/export-pdf');
  if (!grid.current) return;
  await exportGridToPdf(grid.current, {
    filename: 'employees.pdf',
    title: 'Employees by department',
    orientation: 'portrait',
    // the header repeats on every page; widths follow the grid, fitted to the page
    pageHeader: () => 'OGE UI · HR report',
    pageFooter: ({ pageNumber, pageCount }) => \`Page \${pageNumber} of \${pageCount}\`,
  });
};`,
      jsx: `<>
  <button type="button" onClick={() => void pdf()}>PDF</button>
  <OgeGrid ref={grid} data={employees} keyField="id" columns={columns} groupBy={['department']} />
</>`,
    }),
  },
];
