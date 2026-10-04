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

declare const employees: Employee[];`;

/**
 * Demo source for the React conditional-formatting page — mirror of
 * `../data-grid/conditional-formatting-snippets.ts`. Pure data.
 */
export const GRID_FORMAT_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Class hooks & formatting rules',
    source: reactDemoSource({
      use: { '@oge-ui/react-grid': ['OgeGrid'] },
      types: { '@oge-ui/react-grid': ['OgeGridColumnProps'] },
      name: 'FormattedGrid',
      before: `${EMPLOYEE}

const columns: OgeGridColumnProps<Employee>[] = [
  { field: 'firstName', caption: 'Name' },
  { field: 'department', caption: 'Department' },
  {
    field: 'salary',
    caption: 'Salary',
    dataType: 'number',
    // token-only formats: rule classes, a data bar
    conditionalFormats: [
      { when: { operator: 'ge', value: 100000 }, style: { tone: 'success', bold: true } },
      { when: (value) => (value as number) < 45000, style: { background: 'danger' } },
      { type: 'dataBar' },
    ],
  },
  {
    field: 'id',
    caption: 'Score',
    dataType: 'number',
    conditionalFormats: [{ type: 'colorScale' }, { type: 'iconSet' }],
  },
];`,
      jsx: `<OgeGrid
  data={employees}
  keyField="id"
  columns={columns}
  rowClass={(row) => ({ 'is-engineering': row.department === 'Engineering' })}
  cellClass={(row, column) =>
    column.field === 'firstName' && row.salary > 100000 ? 'is-top-earner' : null
  }
  onCellPrepared={(event) => {
    // the imperative escape hatch: decorate the element itself
    if (event.field === 'salary') event.element.title = String(event.value);
  }}
/>`,
    }),
  },
  {
    title: 'Merged cells, spans, auto-fit & hints',
    source: reactDemoSource({
      use: { '@oge-ui/react-grid': ['OgeGrid'] },
      name: 'SpannedGrid',
      before: EMPLOYEE,
      jsx: `<OgeGrid
  data={employees}
  keyField="id"
  // equal adjacent values merge (aria-rowspan); cellSpan spans columns
  columns={[
    { field: 'department', caption: 'Department', mergeCells: true },
    { field: 'city', caption: 'City' },
    { field: 'firstName', caption: 'First name', width: 90 },
    { field: 'lastName', caption: 'Last name' },
  ]}
  cellSpan={(row, column) =>
    column.field === 'firstName' && row.id === 1 ? { colSpan: 2 } : null
  }
  cellHintEnabled
  columnAutoWidth
/>`,
    }),
  },
];
