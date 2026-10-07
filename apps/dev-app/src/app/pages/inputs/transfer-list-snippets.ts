import { demoSource } from '../../shared/demo-source';

const PERMISSION_TYPE = `interface Permission {
  id: string;
  name: string;
  area: string;
  locked?: boolean;
}`;

const PERMISSION_DATA = `protected readonly permissions: Permission[] = [
  { id: 'orders.read', name: 'View orders', area: 'Orders' },
  { id: 'orders.write', name: 'Edit orders', area: 'Orders' },
  { id: 'orders.refund', name: 'Issue refunds', area: 'Orders' },
  { id: 'users.read', name: 'View users', area: 'Users' },
  { id: 'users.invite', name: 'Invite users', area: 'Users' },
  { id: 'users.admin', name: 'Manage roles', area: 'Users', locked: true },
  { id: 'reports.read', name: 'View reports', area: 'Reports' },
  { id: 'reports.export', name: 'Export reports', area: 'Reports' },
];`;

export const BASIC_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeTransferList'] },
  before: PERMISSION_TYPE,
  template: `<!-- The value is the target side: the moved values in arrival order.
     Buttons move the selection / everything shown; Ctrl+→ / Ctrl+← on a
     focused list move its selection (Shift: everything), and options drag
     between the lists. Locked items stay where they are. -->
<oge-transfer-list
  label="Role permissions"
  [items]="permissions"
  displayExpr="name"
  valueExpr="id"
  disabledExpr="locked"
  targetTitle="Granted"
  [height]="240"
  [(value)]="granted"
/>`,
  body: `${PERMISSION_DATA}
protected readonly granted = signal<readonly unknown[]>(['orders.read']);`,
});

export const SEARCH_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeTransferList'] },
  before: PERMISSION_TYPE,
  template: `<!-- A search field per list; "move all" moves what the list shows. -->
<oge-transfer-list
  [items]="permissions"
  displayExpr="name"
  valueExpr="id"
  [searchEnabled]="true"
  [showCheckBoxes]="true"
  [height]="220"
  [(value)]="granted"
/>`,
  body: `${PERMISSION_DATA}
protected readonly granted = signal<readonly unknown[]>([]);`,
});

export const TEMPLATES_SNIPPET = demoSource({
  use: {
    '@oge-ui/inputs': ['OgeTransferList', 'OgeListBoxItemTemplate'],
  },
  before: PERMISSION_TYPE,
  template: `<!-- groupBy and the list box templates apply to both lists. -->
<oge-transfer-list
  [items]="permissions"
  displayExpr="name"
  valueExpr="id"
  groupBy="area"
  [height]="280"
  [(value)]="granted"
>
  <ng-template ogeListBoxItemTemplate let-permission>
    <span>{{ permission.name }}</span>
    <code>{{ permission.id }}</code>
  </ng-template>
</oge-transfer-list>`,
  body: `${PERMISSION_DATA}
protected readonly granted = signal<readonly unknown[]>(['reports.read']);`,
});

export const CANCEL_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeTransferList'] },
  types: { '@oge-ui/inputs': ['OgeTransferListMovingEvent'] },
  before: PERMISSION_TYPE,
  template: `<!-- moving is cancelable (cancel = true vetoes the move, whatever its
     cause: button, keyboard or drag); moved reports what changed. -->
<oge-transfer-list
  [items]="permissions"
  displayExpr="name"
  valueExpr="id"
  targetTitle="Granted (max 3)"
  [height]="240"
  [(value)]="granted"
  (moving)="limit($event)"
  (moved)="log.set($event.values.length + ' moved by ' + $event.cause)"
/>
<p>{{ log() }}</p>`,
  body: `${PERMISSION_DATA}
protected readonly granted = signal<readonly unknown[]>([]);
protected readonly log = signal('');

protected limit(event: OgeTransferListMovingEvent<Permission>): void {
  if (event.to === 'target' && this.granted().length + event.values.length > 3) {
    event.cancel = true;
    this.log.set('Vetoed: at most 3 permissions');
  }
}`,
});

export const FORMS_SNIPPET = demoSource({
  use: {
    '@oge-ui/inputs': ['OgeTransferList'],
    '@angular/forms': ['ReactiveFormsModule'],
  },
  helpers: { '@angular/forms': ['FormControl', 'Validators'] },
  before: PERMISSION_TYPE,
  template: `<!-- FormValueControl + ControlValueAccessor — the control holds the
     target side's values. -->
<oge-transfer-list
  label="Granted permissions"
  hint="Grant at least one"
  [items]="permissions"
  displayExpr="name"
  valueExpr="id"
  [height]="200"
  [formControl]="granted"
/>`,
  body: `${PERMISSION_DATA}
protected readonly granted = new FormControl<string[]>([], Validators.required);`,
});

export const REORDER_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeTransferList'] },
  before: PERMISSION_TYPE,
  template: `<!-- 'target' opens only the target list: Alt+ArrowUp / Alt+ArrowDown,
     or a drag dropped inside it, reorder — and reorder the value. -->
<oge-transfer-list
  label="Escalation order"
  [items]="permissions"
  displayExpr="name"
  valueExpr="id"
  targetTitle="Priority"
  allowReordering="target"
  [height]="240"
  [(value)]="priority"
/>`,
  body: `${PERMISSION_DATA}
protected readonly priority = signal<readonly unknown[]>([
  'orders.refund',
  'users.invite',
  'reports.export',
]);`,
});
