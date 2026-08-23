import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React form-layout page. Pure data, no React imports —
 * the `llms.txt` generator and the compile gate load this module in plain Node.
 *
 * Section-for-section mirror of `../forms/layout.ts` (`docs/REACT-PARITY.md`):
 * same eight sections, same order, same example content, React idiom — the
 * `layout` array in place of the projected children and section objects in
 * place of `<oge-form-tabs>` / `<oge-form-accordion>`.
 */
export const FORMS_LAYOUT_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Fixed columns',
    description:
      'A numeric colCount produces repeat(n, minmax(0, 1fr)). An item’s colSpan is clamped to the count in force, so a span of 4 in a 2-column form spans 2 rather than overflowing.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-forms': ['OgeForm'] },
      name: 'FixedColumnsDemo',
      body: `const [columns, setColumns] = useState(3);
const [record, setRecord] = useState({
  code: 'OGE-1',
  name: 'Form layout',
  owner: 'Ada',
  summary: '',
});`,
      jsx: `<>
  <div className="mb-3 flex items-center gap-2 text-sm">
    <span>columns:</span>
    {[1, 2, 3].map((n) => (
      <button
        key={n}
        type="button"
        className={\`rounded border px-2 py-0.5 \${columns === n ? 'font-semibold' : ''}\`}
        onClick={() => setColumns(n)}
      >
        {n}
      </button>
    ))}
  </div>
  <OgeForm
    formData={record}
    onFormDataChange={setRecord}
    colCount={columns}
    layout={[
      { field: 'code', label: 'Code' },
      { field: 'name', label: 'Name' },
      { field: 'owner', label: 'Owner' },
      { field: 'summary', label: 'Summary', colSpan: columns },
    ]}
  />
</>`,
    }),
  },
  {
    title: 'Auto-fit columns',
    description:
      'The default. repeat(auto-fit, minmax(minColWidth, 1fr)) fits as many columns as the form is wide, with no breakpoints to maintain. Resize the browser — or the card — and the count follows.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-forms': ['OgeForm'] },
      types: { '@oge-ui/react-forms': ['OgeFormItemDefinition'] },
      name: 'AutoFitDemo',
      before: `const serverFields: OgeFormItemDefinition[] = [
  { field: 'host', label: 'Host' },
  { field: 'port', label: 'Port' },
  { field: 'user', label: 'User' },
  { field: 'database', label: 'Database' },
];`,
      body: `const [server, setServer] = useState({
  host: 'db.internal',
  port: 5432,
  user: 'postgres',
  database: 'oge',
});`,
      jsx: `<OgeForm
  formData={server}
  onFormDataChange={setServer}
  items={serverFields}
  colCount="auto"
  minColWidth={260}
/>`,
    }),
  },
  {
    title: 'Responsive by container',
    description:
      'Explicit counts per breakpoint when auto-fit is not precise enough. The breakpoints are container queries on the form itself — xs under 480px, then 480 / 720 / 960 / 1200 — so the same form nested in a narrow panel behaves like a phone layout even on a wide screen.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-forms': ['OgeForm'] },
      types: { '@oge-ui/react-forms': ['OgeFormItemDefinition'] },
      name: 'BreakpointsDemo',
      before: `const serverFields: OgeFormItemDefinition[] = [
  { field: 'host', label: 'Host' },
  { field: 'port', label: 'Port' },
  { field: 'user', label: 'User' },
  { field: 'database', label: 'Database' },
];`,
      body: `const [server, setServer] = useState({
  host: 'db.internal',
  port: 5432,
  user: 'postgres',
  database: 'oge',
});`,
      jsx: `<OgeForm
  formData={server}
  onFormDataChange={setServer}
  items={serverFields}
  colCountByScreen={{ xs: 1, sm: 2, md: 3, lg: 4 }}
/>`,
    }),
  },
  {
    title: 'Nested groups',
    description:
      'Groups nest as nested fieldsets, each with its own column count. That is the structure assistive technology reads as “this block of fields belongs together”, and it is why the group is a real fieldset rather than a styled div.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-forms': ['OgeForm'] },
      name: 'NestedGroupsDemo',
      body: `const [company, setCompany] = useState({
  name: 'OGE UI',
  taxId: '',
  employees: 12,
  street: '',
  city: '',
  postalCode: '',
});`,
      jsx: `<OgeForm
  formData={company}
  onFormDataChange={setCompany}
  colCount={2}
  layout={[
    {
      caption: 'Company',
      colCount: 2,
      children: [
        { field: 'name', label: 'Name', colSpan: 2 },
        { field: 'taxId', label: 'Tax id' },
        { field: 'employees', label: 'Employees' },
        {
          caption: 'Billing address',
          colCount: 2,
          children: [
            { field: 'street', label: 'Street', colSpan: 2 },
            { field: 'city', label: 'City' },
            { field: 'postalCode', label: 'Postal code' },
          ],
        },
      ],
    },
  ]}
/>`,
    }),
  },
  {
    title: 'Tab sections',
    description:
      'A { kind: "tabs" } node turns each child group into a tab, its caption the tab text. The strip, its keyboard handling and its overflow come from @oge-ui/react-tabs — none of it is re-implemented. A tab holding invalid fields gets a count badge, and a failed submit selects that tab before focusing the field.',
    source: reactDemoSource({
      react: ['useRef', 'useState'],
      use: { '@oge-ui/react-forms': ['OgeForm'] },
      types: { '@oge-ui/react-forms': ['OgeFormHandle'] },
      name: 'TabSectionsDemo',
      body: `const [employee, setEmployee] = useState({
  firstName: 'Ada',
  lastName: 'Lovelace',
  title: '',
  salary: 120000,
});
const form = useRef<OgeFormHandle<typeof employee>>(null);`,
      jsx: `<>
  <OgeForm
    ref={form}
    formData={employee}
    onFormDataChange={setEmployee}
    showValidationSummary
    layout={[
      {
        kind: 'tabs',
        children: [
          {
            caption: 'Personal',
            colCount: 2,
            children: [
              { field: 'firstName', label: 'First name' },
              { field: 'lastName', label: 'Last name' },
            ],
          },
          {
            caption: 'Employment',
            colCount: 2,
            children: [
              { field: 'title', label: 'Title', isRequired: true },
              { field: 'salary', label: 'Salary' },
            ],
          },
        ],
      },
    ]}
  />
  <button
    type="button"
    className="mt-3 rounded border px-2 py-1 text-sm"
    onClick={() => form.current?.submit()}
  >
    Submit (Title is empty)
  </button>
</>`,
    }),
  },
  {
    title: 'Accordion sections',
    description:
      'The same idea over @oge-ui/react-layout. A panel holding an invalid field gets the accordion’s own invalid indicator — the danger rail, the dot and its screen-reader label — and a failed submit expands it.',
    source: reactDemoSource({
      react: ['useRef', 'useState'],
      use: { '@oge-ui/react-forms': ['OgeForm'] },
      types: { '@oge-ui/react-forms': ['OgeFormHandle'] },
      name: 'AccordionSectionsDemo',
      body: `const [employee, setEmployee] = useState({
  firstName: 'Ada',
  lastName: 'Lovelace',
  title: '',
  salary: 120000,
});
const form = useRef<OgeFormHandle<typeof employee>>(null);`,
      jsx: `<>
  <OgeForm
    ref={form}
    formData={employee}
    onFormDataChange={setEmployee}
    scrollToFirstInvalid={false}
    layout={[
      {
        kind: 'accordion',
        children: [
          {
            caption: 'Personal',
            children: [{ field: 'firstName', label: 'First name' }],
          },
          {
            caption: 'Employment',
            children: [{ field: 'title', label: 'Title', isRequired: true }],
          },
        ],
      },
    ]}
  />
  <button
    type="button"
    className="mt-3 rounded border px-2 py-1 text-sm"
    onClick={() => form.current?.submit()}
  >
    Submit (Title is empty)
  </button>
</>`,
    }),
  },
  {
    title: 'Read-only & disabled',
    description:
      'Form-level disabled wraps the fields in a <fieldset disabled>; readOnly forwards to every editor. Both fall through group level to item level, and an item may opt out.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-forms': ['OgeForm'] },
      name: 'ReadOnlyDemo',
      body: `const [locked, setLocked] = useState(true);
const [archived, setArchived] = useState(false);
const [invoice, setInvoice] = useState({
  number: 'INV-204',
  total: 1290,
  comment: '',
});`,
      jsx: `<>
  <div className="mb-3 flex gap-3 text-sm">
    <label className="flex items-center gap-1">
      <input
        type="checkbox"
        checked={locked}
        onChange={() => setLocked((value) => !value)}
      />
      readOnly
    </label>
    <label className="flex items-center gap-1">
      <input
        type="checkbox"
        checked={archived}
        onChange={() => setArchived((value) => !value)}
      />
      disabled
    </label>
  </div>
  <OgeForm
    formData={invoice}
    onFormDataChange={setInvoice}
    readOnly={locked}
    disabled={archived}
    colCount={2}
    layout={[
      { field: 'number', label: 'Number' },
      { field: 'total', label: 'Total' },
      { field: 'comment', label: 'Comment', readOnly: false },
    ]}
  />
</>`,
    }),
  },
  {
    title: 'Visibility & order',
    description:
      'visible drops an item from the layout entirely — no hidden input, no stale value in the DOM. visibleIndex pulls items to the front in index order; everything without one keeps its declaration order behind them.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-forms': ['OgeForm'] },
      name: 'VisibilityDemo',
      body: `const [shipment, setShipment] = useState({
  carrier: 'DHL',
  reference: 'REF-9',
  trackingNumber: '',
});`,
      jsx: `<OgeForm
  formData={shipment}
  onFormDataChange={setShipment}
  colCount={2}
  layout={[
    { field: 'carrier', label: 'Carrier', visibleIndex: 1 },
    { field: 'reference', label: 'Reference', visibleIndex: 0 },
    {
      field: 'trackingNumber',
      label: 'Tracking number',
      visible: shipment.carrier !== '',
    },
  ]}
/>`,
    }),
  },
];
