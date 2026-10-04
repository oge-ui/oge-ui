import { demoSource } from '../../shared/demo-source';

const EMPLOYEE = `interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  department: string;
  city: string;
  salary: number;
  hireDate: string;
}`;

export const EXCEL_SNIPPET = demoSource({
  use: { '@oge-ui/grid': ['OgeColumn', 'OgeColumnGroup', 'OgeGrid'] },
  types: { '@oge-ui/grid': ['OgeExportCellStyleArgs'] },
  dataset: 'employees',
  before: EMPLOYEE,
  template: `<oge-grid #grid [data]="employees" keyField="id"
          selectionMode="multiple" [groupBy]="['department']">
  <oge-column field="id" caption="Id" [width]="70" dataType="number" pinned="left" />
  <!-- a band becomes a merged two-row header in Excel and PDF -->
  <oge-column-group caption="Employee">
    <oge-column field="firstName" caption="First Name" [width]="140" />
    <oge-column field="lastName" caption="Last Name" [width]="140" />
  </oge-column-group>
  <oge-column field="city" caption="City" />
  <oge-column field="hireDate" caption="Hired" dataType="date" />
  <oge-column field="salary" caption="Salary" dataType="number"
              groupSummary="sum" groupSummaryPosition="footer" totalSummary="sum" />
</oge-grid>

<button type="button" (click)="excel()">Excel</button>
<button type="button" (click)="excel(true)">Selected rows</button>`,
  body: `private readonly grid = viewChild.required<OgeGrid<Employee>>('grid');

// conditional formatting: one value-level hook styles Excel and PDF alike
protected readonly cellStyle = ({ column, value, kind }: OgeExportCellStyleArgs<Employee>) =>
  kind === 'data' && column.field === 'salary' && Number(value) > 8000
    ? { background: '#fff4ce', color: '#7a4b00', bold: true }
    : undefined;

// the lazy secondary entry keeps exceljs out of the main bundle
protected async excel(selectedRowsOnly = false): Promise<void> {
  const { exportGridToExcel } = await import('@oge-ui/grid/export-excel');
  await exportGridToExcel(this.grid(), {
    filename: 'employees.xlsx',
    selectedRowsOnly,
    summaryFormulas: true, // group footers + total as SUBTOTAL formulas
    columnFormats: { salary: '#,##0 "€"' },
    cellStyle: this.cellStyle,
  });
}`,
});

export const PDF_SNIPPET = demoSource({
  use: { '@oge-ui/grid': ['OgeColumn', 'OgeGrid'] },
  dataset: 'employees',
  before: EMPLOYEE,
  template: `<oge-grid #grid [data]="employees" keyField="id" [groupBy]="['department']">
  <oge-column field="firstName" caption="First Name" />
  <oge-column field="lastName" caption="Last Name" />
  <oge-column field="city" caption="City" />
  <oge-column field="salary" caption="Salary" dataType="number" totalSummary="sum" />
</oge-grid>

<button type="button" (click)="pdf()">PDF</button>`,
  body: `private readonly grid = viewChild.required<OgeGrid<Employee>>('grid');

protected async pdf(): Promise<void> {
  const { exportGridToPdf } = await import('@oge-ui/grid/export-pdf');
  await exportGridToPdf(this.grid(), {
    filename: 'employees.pdf',
    title: 'Employees by department',
    orientation: 'portrait',
    // the header repeats on every page; widths follow the grid, fitted to the page
    pageHeader: () => 'OGE UI · HR report',
    pageFooter: ({ pageNumber, pageCount }) => \`Page \${pageNumber} of \${pageCount}\`,
    customizeCell: ({ field, style }) => {
      if (field === 'salary' && style) style.alignment = 'end';
      return undefined;
    },
  });
}`,
});
