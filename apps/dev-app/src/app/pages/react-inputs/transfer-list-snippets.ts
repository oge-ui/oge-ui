import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

const PERMISSIONS = `interface Permission {
  id: string;
  name: string;
  area: string;
  locked?: boolean;
}

const permissions: Permission[] = [
  { id: 'orders.read', name: 'View orders', area: 'Orders' },
  { id: 'orders.write', name: 'Edit orders', area: 'Orders' },
  { id: 'orders.refund', name: 'Issue refunds', area: 'Orders' },
  { id: 'users.read', name: 'View users', area: 'Users' },
  { id: 'users.invite', name: 'Invite users', area: 'Users' },
  { id: 'users.admin', name: 'Manage roles', area: 'Users', locked: true },
  { id: 'reports.read', name: 'View reports', area: 'Reports' },
  { id: 'reports.export', name: 'Export reports', area: 'Reports' },
];`;

/**
 * Demo sources for the React transfer list page. Pure data — the generator
 * and the compile gate load it in plain Node. Section-for-section mirror of
 * `../inputs/transfer-list.ts`.
 */
export const INPUTS_TRANSFER_LIST_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Getting started',
    description:
      'The value is the target side in arrival order. Buttons, Ctrl+→ / Ctrl+← on a focused list (Shift: everything) and a drag between the lists run the same move; the locked item stays.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeTransferList'] },
      name: 'TransferListDemo',
      before: PERMISSIONS,
      body: `const [granted, setGranted] = useState<readonly unknown[]>(['orders.read']);`,
      jsx: `<>
  <OgeTransferList
    label="Role permissions"
    items={permissions}
    displayExpr="name"
    valueExpr="id"
    disabledExpr="locked"
    targetTitle="Granted"
    height={240}
    value={granted}
    onValueChange={setGranted}
  />
  <p className="mt-3 text-sm">
    Value: <code>{JSON.stringify(granted)}</code>
  </p>
</>`,
    }),
  },
  {
    title: 'Search and check boxes',
    description:
      'A search field per list; the move-all buttons move what the list shows.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeTransferList'] },
      name: 'TransferListSearchDemo',
      before: PERMISSIONS,
      body: `const [granted, setGranted] = useState<readonly unknown[]>([]);`,
      jsx: `<OgeTransferList
  items={permissions}
  displayExpr="name"
  valueExpr="id"
  searchEnabled
  showCheckBoxes
  height={220}
  value={granted}
  onValueChange={setGranted}
/>`,
    }),
  },
  {
    title: 'Groups and templates',
    description: 'groupBy, renderItem and renderGroup apply to both lists.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeTransferList'] },
      name: 'TransferListTemplatesDemo',
      before: PERMISSIONS,
      body: `const [granted, setGranted] = useState<readonly unknown[]>(['reports.read']);`,
      jsx: `<OgeTransferList
  items={permissions}
  displayExpr="name"
  valueExpr="id"
  groupBy="area"
  height={280}
  value={granted}
  onValueChange={setGranted}
  renderItem={(permission) => (
    <span className="inline-flex w-full items-center justify-between gap-2">
      <span>{permission.name}</span>
      <code className="text-xs text-(--oge-muted-color)">{permission.id}</code>
    </span>
  )}
/>`,
    }),
  },
  {
    title: 'Cancelable moves',
    description:
      'onMoving fires before every move with its cause — set cancel to veto it; onMoved reports what changed. The target side holds at most three items here.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeTransferList'] },
      name: 'TransferListCancelDemo',
      before: PERMISSIONS,
      body: `const [granted, setGranted] = useState<readonly unknown[]>([]);
const [log, setLog] = useState('');`,
      jsx: `<>
  <OgeTransferList
    items={permissions}
    displayExpr="name"
    valueExpr="id"
    targetTitle="Granted (max 3)"
    height={240}
    value={granted}
    onValueChange={setGranted}
    onMoving={(event) => {
      if (event.to === 'target' && granted.length + event.values.length > 3) {
        event.cancel = true;
        setLog('Vetoed: at most 3 permissions');
      }
    }}
    onMoved={(event) => setLog(\`\${event.values.length} moved by \${event.cause}\`)}
  />
  <p className="mt-3 text-sm">
    Log: <code>{log || '—'}</code>
  </p>
</>`,
    }),
  },
  {
    title: 'Inside a form',
    description:
      'The controlled pair is the integration point; pass required, errors and touched from your form layer.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeTransferList'] },
      name: 'TransferListFormDemo',
      before: PERMISSIONS,
      body: `const [granted, setGranted] = useState<readonly unknown[]>([]);
const [touched, setTouched] = useState(false);`,
      jsx: `<OgeTransferList
  label="Granted permissions"
  hint="Grant at least one"
  items={permissions}
  displayExpr="name"
  valueExpr="id"
  height={200}
  required
  value={granted}
  onValueChange={setGranted}
  touched={touched}
  onBlur={() => setTouched(true)}
  errors={granted.length === 0 ? [{ kind: 'required' }] : []}
/>`,
    }),
  },
  {
    title: 'Reordering',
    description:
      "allowReordering opens one or both lists to reordering — 'target' here, so the granted permissions can be put in priority order. Alt+↑/↓ moves the active option; one drag reorders when dropped inside its own list and still moves when dropped on the other. The target's order is the value's order, so a reorder commits a new value.",
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeTransferList'] },
      name: 'TransferReorderDemo',
      before: PERMISSIONS,
      body: `const [priority, setPriority] = useState<readonly unknown[]>([
  'orders.refund',
  'users.invite',
  'reports.export',
]);`,
      jsx: `<OgeTransferList
  label="Escalation order"
  items={permissions}
  displayExpr="name"
  valueExpr="id"
  targetTitle="Priority"
  allowReordering="target"
  height={240}
  value={priority}
  onValueChange={setPriority}
/>`,
    }),
  },
];
