import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React forms overview. Pure data, no React imports —
 * the `llms.txt` generator and the compile gate load this module in plain Node.
 *
 * Section-for-section mirror of `../forms/overview.ts`, per the parity standard
 * (`docs/REACT-PARITY.md`): same seven sections, same order, same example
 * content, React idiom — the `layout` array in place of projected children and
 * render props in place of the template slots.
 */
export const FORMS_OVERVIEW_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Declarative items',
    description:
      'Each layout entry names a model property through field. Dot-notation reaches nested objects. colSpan widens an item across the layout columns, and hint lands in the editor’s own subscript so nothing shifts when an error replaces it.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-forms': ['OgeForm'] },
      name: 'DeclarativeItemsDemo',
      body: `const [employee, setEmployee] = useState({
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: '',
  notes: '',
});`,
      jsx: `<>
  <OgeForm
    formData={employee}
    onFormDataChange={setEmployee}
    colCount={2}
    layout={[
      { field: 'firstName', label: 'First name', isRequired: true },
      { field: 'lastName', label: 'Last name' },
      { field: 'email', label: 'E-mail', hint: 'We never share it.' },
      { field: 'notes', editorType: 'textArea', colSpan: 2 },
    ]}
  />
  <p className="mt-2 text-sm opacity-70">
    formData → {employee.firstName} {employee.lastName}
  </p>
</>`,
    }),
  },
  {
    title: 'Data-driven items',
    description:
      'The same item model as an array — useful when the fields come from a server. Entries render after the layout tree, and visibleIndex reorders both sources together.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-forms': ['OgeForm'] },
      types: { '@oge-ui/react-forms': ['OgeFormItemDefinition'] },
      name: 'ItemsDemo',
      before: `const orderFields: OgeFormItemDefinition[] = [
  { field: 'reference', label: 'Reference', isRequired: true },
  { field: 'quantity', label: 'Quantity', editorOptions: { min: 1, max: 99 } },
  {
    field: 'priority',
    label: 'Priority',
    editorOptions: { items: ['low', 'normal', 'high'] },
  },
  { field: 'shipped', label: 'Shipped', dataType: 'boolean' },
];`,
      body: `const [order, setOrder] = useState({
  reference: '',
  quantity: 1,
  priority: 'normal',
  shipped: false,
});`,
      jsx: `<OgeForm
  formData={order}
  onFormDataChange={setOrder}
  items={orderFields}
  colCount={2}
/>`,
    }),
  },
  {
    title: 'Editor selection',
    description:
      'With no editorType, the editor follows dataType — and dataType itself is inferred from the current model value. An editorOptions.items list beats the inferred type (a select box), and an explicit editorType beats everything. Anything richer than the curated options belongs in a render prop, not in a reflective options bag.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-forms': ['OgeForm'] },
      name: 'EditorSelectionDemo',
      before: `const teams = ['Platform', 'Design', 'Support'];`,
      body: `const [profile, setProfile] = useState({
  name: 'Grace',
  age: 45,
  birthday: new Date(1980, 4, 12),
  active: true,
  team: 'Platform',
  bio: '',
});`,
      jsx: `<OgeForm
  formData={profile}
  onFormDataChange={setProfile}
  colCount={2}
  layout={[
    { field: 'name', label: 'Name' },
    { field: 'age', label: 'Age' },
    { field: 'birthday', label: 'Birthday' },
    { field: 'active', label: 'Active' },
    { field: 'team', label: 'Team', editorOptions: { items: teams } },
    { field: 'bio', label: 'Bio', editorType: 'textArea', colSpan: 2 },
  ]}
/>`,
    }),
  },
  {
    title: 'Groups',
    description:
      'A group renders a real <fieldset> with the caption as its <legend> — the markup screen readers expect for a labelled section — and carries its own column count. Groups nest.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-forms': ['OgeForm'] },
      name: 'GroupsDemo',
      body: `const [account, setAccount] = useState({
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  phone: '',
  address: '',
});`,
      jsx: `<OgeForm
  formData={account}
  onFormDataChange={setAccount}
  colCount={2}
  layout={[
    {
      caption: 'Identity',
      colCount: 2,
      children: [
        { field: 'firstName', label: 'First name' },
        { field: 'lastName', label: 'Last name' },
      ],
    },
    {
      caption: 'Contact',
      colCount: 2,
      children: [
        { field: 'email', label: 'E-mail' },
        { field: 'phone', label: 'Phone' },
        { field: 'address', label: 'Address', colSpan: 2 },
      ],
    },
  ]}
/>`,
    }),
  },
  {
    title: 'Label placement',
    description:
      "labelLocation: 'top' keeps each editor’s own label chrome. 'start' and 'end' hand the label to the form, which draws a real <label htmlFor> in its own column — alignItemLabels gives every row the same label width so the editors line up.",
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-forms': ['OgeForm'] },
      name: 'LabelPlacementDemo',
      body: `const [settings, setSettings] = useState({
  host: 'localhost',
  port: 5432,
  secure: true,
});`,
      jsx: `<OgeForm
  formData={settings}
  onFormDataChange={setSettings}
  labelLocation="start"
  alignItemLabels
  showColonAfterLabel
  colCount={1}
  layout={[
    { field: 'host', label: 'Host', isRequired: true },
    { field: 'port', label: 'Port' },
    { field: 'secure', label: 'Use TLS' },
  ]}
/>`,
    }),
  },
  {
    title: 'Template slots',
    description:
      'Four render props, each legal on <OgeForm> (applies to every item) or on a single item definition (applies to that one, and wins). renderEditor replaces only the control and keeps the label, required mark and error text — the context hands you editorId so your control keeps the <label htmlFor> association, and setValue so it writes back into the model. renderItem replaces the whole field, and renderGroupCaption replaces a legend’s content.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-forms': ['OgeForm'] },
      name: 'RenderPropsDemo',
      body: `const [ticket, setTicket] = useState({ title: '', rating: 3 });`,
      jsx: `<OgeForm
  formData={ticket}
  onFormDataChange={setTicket}
  labelLocation="start"
  colCount={1}
  layout={[
    { field: 'title', label: 'Title', isRequired: true },
    {
      field: 'rating',
      label: 'Rating',
      renderLabel: ({ label }) => <em>{label}</em>,
      renderEditor: ({ editorId, value, setValue }) => (
        <>
          <input
            type="range"
            min={1}
            max={5}
            id={editorId}
            value={Number(value)}
            onChange={(event) => setValue(Number(event.target.value))}
          />
          <span className="ml-2 text-sm">{Number(value)} / 5</span>
        </>
      ),
    },
  ]}
/>`,
    }),
  },
  {
    title: 'Actions & submit',
    description:
      'Pass the buttons to the actions prop. Submitting marks every field touched, runs validation, fires the cancelable onSubmitting and — only if both pass — onSubmitted. A failed submit reveals the summary and moves focus to the first invalid field.',
    source: reactDemoSource({
      react: ['useRef', 'useState'],
      use: {
        '@oge-ui/react-buttons': ['OgeButton'],
        '@oge-ui/react-forms': ['OgeForm'],
      },
      types: { '@oge-ui/react-forms': ['OgeFormHandle'] },
      name: 'ActionsDemo',
      body: `const form = useRef<OgeFormHandle<{ email: string; password: string }>>(null);
const [signup, setSignup] = useState({ email: '', password: '' });
const [saved, setSaved] = useState(false);`,
      jsx: `<>
  <OgeForm
    ref={form}
    formData={signup}
    onFormDataChange={setSignup}
    showValidationSummary
    onSubmitted={() => setSaved(true)}
    layout={[
      { field: 'email', label: 'E-mail', isRequired: true },
      { field: 'password', label: 'Password', isRequired: true },
    ]}
    actions={
      <>
        <OgeButton text="Create" stylingMode="contained" useSubmitBehavior />
        <OgeButton text="Reset" onClick={() => form.current?.reset()} />
      </>
    }
  />
  {saved && <p className="mt-2 text-sm opacity-70">submitted → account created</p>}
</>`,
    }),
  },
];
