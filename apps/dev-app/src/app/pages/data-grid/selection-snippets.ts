import { demoSource } from '../../shared/demo-source';

export const SNIPPET = demoSource({
  use: { '@oge-ui/grid': ['OgeColumn', 'OgeGrid'] },
  types: {
    '@oge-ui/core': ['RowKey'],
    '@oge-ui/grid': ['OgeContextMenuEvent'],
  },
  dataset: 'employees',
  before: `interface Employee {
  id: number;
  firstName: string;
  lastName: string;
}`,
  template: `<oge-grid [data]="employees" keyField="id"
          selectionMode="checkbox" [(selectedKeys)]="selected"
          (rowContextMenu)="onContextMenu($event)">
  <oge-column field="firstName" />
  <oge-column field="lastName" />
</oge-grid>`,
  body: `protected readonly selected = signal<RowKey[]>([]);

protected onContextMenu(event: OgeContextMenuEvent<Employee>): void {
  // push items to open the built-in menu; leave empty for the browser menu
  event.items.push({
    text: 'Copy name',
    action: () => this.copy(event.row),
  });
}

private copy(row: Employee): void {
  void navigator.clipboard.writeText(\`\${row.firstName} \${row.lastName}\`);
}`,
});

export const DEFERRED_SNIPPET = demoSource({
  use: { '@oge-ui/grid': ['OgeColumn', 'OgeGrid'] },
  types: { '@oge-ui/core': ['FilterExpr'] },
  dataset: 'employees',
  template: `<oge-grid [data]="employees" keyField="id"
          selectionMode="checkbox"
          [selectionDeferred]="true" [(selectionFilter)]="selectionFilter">
  <oge-column field="firstName" />
</oge-grid>

<!-- selectionFilter is a plain FilterExpr — POST it to your backend:
     null                                  → nothing selected
     { field: 'id', op: 'isnotnull' }      → select-all (no filter active)
     { and: [all, { not: { id eq 42 } }] } → all except #42 -->`,
  body: `protected readonly selectionFilter = signal<FilterExpr | null>(null);`,
});
