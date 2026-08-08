import { demoSource } from '../../shared/demo-source';

const EMPLOYEE_INTERFACE = `interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  department: string;
  city: string;
  salary: number;
  hireDate: string;
}`;

export const ROW_MENU_SNIPPET = demoSource({
  use: { '@oge-ui/grid': ['OgeColumn', 'OgeGrid'] },
  types: { '@oge-ui/grid': ['OgeContextMenuEvent'] },
  dataset: 'employees',
  before: EMPLOYEE_INTERFACE,
  template: `<oge-grid [data]="employees" keyField="id"
          (rowContextMenu)="onRowMenu($event)">
  <oge-column field="firstName" />
  <oge-column field="department" />
</oge-grid>`,
  body: `protected onRowMenu(event: OgeContextMenuEvent<Employee>): void {
  // push items to open the built-in menu at the cursor;
  // leave the array empty to fall back to the native browser menu
  event.items.push(
    { text: \`Open \${event.row.firstName}\`, action: () => this.open(event.row) },
    { text: 'Duplicate', action: () => this.duplicate(event.key) },
    { text: 'Delete (no permission)', disabled: true },
  );
}

private open(row: Employee): void {
  console.log('open', row.id);
}

private duplicate(key: unknown): void {
  console.log('duplicate', key);
}`,
});

export const HEADER_MENU_SNIPPET = demoSource({
  use: { '@oge-ui/grid': ['OgeColumn', 'OgeGrid'] },
  types: { '@oge-ui/grid': ['OgeHeaderContextMenuEvent'] },
  dataset: 'employees',
  template: `<oge-grid [data]="employees" keyField="id" [groupPanel]="true"
          (headerContextMenu)="onHeaderMenu($event)">
  <oge-column field="department" />
  <oge-column field="salary" dataType="number" />
</oge-grid>`,
  body: `protected onHeaderMenu(event: OgeHeaderContextMenuEvent): void {
  // the built-in items (sort / group / pin / hide) arrive prebuilt —
  // extend, filter or replace them before the menu opens
  event.items.push({
    text: \`Reset \${event.caption} filter\`,
    action: () => this.clearFilterFor(event.field),
  });
  if (event.field === 'salary') {
    event.items = event.items.filter((item) => !item.text.startsWith('Pin'));
  }
}

private clearFilterFor(field: string | undefined): void {
  console.log('clear filter for', field);
}`,
});
