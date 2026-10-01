import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/** Every switch of the playground, as the React page hands it over. */
export interface GridPlaygroundOptions {
  readonly rowCount: number;
  readonly pageSize: number;
  readonly sortable: boolean;
  readonly filterRow: boolean;
  readonly headerFilter: boolean;
  readonly searchPanel: boolean;
  readonly paging: boolean;
  readonly virtualScroll: boolean;
  readonly selection: boolean;
  readonly grouping: boolean;
  readonly columnChooser: boolean;
  readonly editing: boolean;
  readonly rowAlternation: boolean;
  readonly focusedRow: boolean;
  readonly rowDragging: boolean;
  readonly rtl: boolean;
}

/** The playground's starting switches — the same defaults as the Angular page. */
export const GRID_PLAYGROUND_DEFAULTS: GridPlaygroundOptions = {
  rowCount: 1000,
  pageSize: 15,
  sortable: true,
  filterRow: true,
  headerFilter: false,
  searchPanel: true,
  paging: true,
  virtualScroll: false,
  selection: false,
  grouping: false,
  columnChooser: false,
  editing: false,
  rowAlternation: false,
  focusedRow: false,
  rowDragging: false,
  rtl: false,
};

/**
 * The `<OgeGrid>` props the current switches amount to, as JSX attribute
 * lines — the React mirror of the Angular playground's attribute list.
 */
function playgroundProps(options: GridPlaygroundOptions): string[] {
  const props = ['data={employees}', 'keyField="id"', 'columns={columns}'];
  if (options.virtualScroll)
    props.push('virtualScroll', 'style={{ height: 520 }}');
  if (options.paging) props.push(`paging={{ pageSize: ${options.pageSize} }}`);
  if (options.filterRow) props.push('filterRow');
  if (options.headerFilter) props.push('headerFilter');
  if (options.searchPanel) props.push('searchPanel');
  if (!options.sortable) props.push('sortable={false}');
  if (options.selection) props.push('selectionMode="checkbox"');
  if (options.grouping) props.push('groupPanel', "groupBy={['department']}");
  if (options.columnChooser) props.push('columnChooser');
  if (options.editing)
    props.push(
      "editing={{ mode: 'batch', allowUpdating: true, allowAdding: true, allowDeleting: true }}",
    );
  if (options.rowAlternation) props.push('rowAlternation');
  if (options.focusedRow) props.push('focusedRowEnabled');
  if (options.rowDragging) props.push('rowDragging');
  if (options.rtl) props.push('rtlEnabled');
  return props;
}

/**
 * Builds the playground's **Code** view for the given switches: one complete,
 * compilable component, regenerated on every toggle.
 */
export function gridPlaygroundSource(options: GridPlaygroundOptions): string {
  return reactDemoSource({
    use: { '@oge-ui/react-grid': ['OgeGrid'] },
    name: 'EmployeeGrid',
    before: `interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  department: string;
  city: string;
  salary: number;
  hireDate: string;
}

declare const employees: Employee[];

const columns = [
  { field: 'id', caption: 'Id', width: 80, dataType: 'number' as const },
  { field: 'firstName', caption: 'First Name' },
  { field: 'lastName', caption: 'Last Name' },
  { field: 'department', caption: 'Department' },
  { field: 'city', caption: 'City' },
  { field: 'salary', caption: 'Salary', dataType: 'number' as const },
];`,
    jsx: `<OgeGrid\n  ${playgroundProps(options).join('\n  ')}\n/>`,
  });
}

/**
 * The playground with every switch on, so the compile gate and `llms.txt`
 * see each prop the page can emit. (The page itself starts from
 * `GRID_PLAYGROUND_DEFAULTS`.)
 */
export const GRID_PLAYGROUND_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Playground — every feature on',
    source: gridPlaygroundSource({
      ...GRID_PLAYGROUND_DEFAULTS,
      headerFilter: true,
      virtualScroll: true,
      selection: true,
      grouping: true,
      columnChooser: true,
      editing: true,
      rowAlternation: true,
      focusedRow: true,
      rowDragging: true,
      rtl: true,
    }),
  },
];
