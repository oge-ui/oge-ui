import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

const EMPLOYEE = `interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  department: string;
  salary: number;
}

declare const employees: Employee[];`;

/**
 * Demo source for the React context-menu page — mirror of
 * `../data-grid/context-menu-snippets.ts`. Pure data, no React imports.
 */
export const GRID_CONTEXT_MENU_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Row context menu',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-grid': ['OgeGrid'] },
      name: 'RowMenuGrid',
      before: `${EMPLOYEE}

const columns = [
  { field: 'firstName', caption: 'First Name' },
  { field: 'lastName', caption: 'Last Name' },
  { field: 'department', caption: 'Department' },
];`,
      body: `const [lastAction, setLastAction] = useState('');`,
      jsx: `<OgeGrid
  data={employees}
  keyField="id"
  columns={columns}
  paging={{ pageSize: 6 }}
  // push items to open the grid's own menu; leave the array empty and the
  // browser's native menu is left alone
  onRowContextMenu={(event) => {
    event.items.push(
      {
        text: \`Open \${event.row.firstName} \${event.row.lastName}\`,
        action: () => setLastAction(\`open #\${String(event.key)}\`),
      },
      {
        text: 'Duplicate',
        action: () => setLastAction(\`duplicate #\${String(event.key)}\`),
      },
      { text: 'Delete (no permission)', disabled: true },
    );
  }}
/>`,
    }),
  },
  {
    title: 'Header menu customization',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-grid': ['OgeGrid'] },
      name: 'HeaderMenuGrid',
      before: `${EMPLOYEE}

const columns = [
  { field: 'firstName', caption: 'First Name' },
  { field: 'department', caption: 'Department' },
  { field: 'salary', caption: 'Salary', dataType: 'number' as const },
];`,
      body: `const [lastAction, setLastAction] = useState('');`,
      jsx: `<OgeGrid
  data={employees}
  keyField="id"
  columns={columns}
  groupPanel
  paging={{ pageSize: 6 }}
  // the built-in sort / group / pin / hide items arrive prefilled — mutate
  // the array to extend, filter or replace them per column
  onHeaderContextMenu={(event) => {
    if (event.field === 'salary') {
      const pinless = event.items.filter(
        (item) => !item.text.toLowerCase().includes('pin'),
      );
      event.items.length = 0;
      event.items.push(...pinless);
    }
    event.items.push({
      text: \`Say hello to \${event.caption}\`,
      action: () => setLastAction(\`hello \${event.field}\`),
    });
  }}
/>`,
    }),
  },
];
