import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React check box group page. Pure data — the generator
 * and the compile gate load it in plain Node. Section-for-section mirror of
 * `../inputs/check-box-group.ts`.
 */
export const INPUTS_CHECK_BOX_GROUP_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Getting started',
    description:
      'displayExpr / valueExpr / disabledExpr are the select box vocabulary. The value is the array of checked valueExpr results in items order, whatever order the user clicked in; disabled items keep their state.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeCheckBoxGroup'] },
      name: 'CheckBoxGroupDemo',
      before: `const channels = [
  { id: 'mail', name: 'E-mail' },
  { id: 'sms', name: 'SMS' },
  { id: 'push', name: 'Push (always on)', locked: true },
  { id: 'call', name: 'Phone call' },
];`,
      body: `const [notify, setNotify] = useState<readonly unknown[]>(['mail', 'push']);`,
      jsx: `<>
  <OgeCheckBoxGroup
    label="Notify me by"
    hint="We never share your details."
    items={channels}
    displayExpr="name"
    valueExpr="id"
    disabledExpr="locked"
    value={notify}
    onValueChange={setNotify}
  />
  <p className="mt-3 text-sm">
    Value: <code>{JSON.stringify(notify)}</code>
  </p>
</>`,
    }),
  },
  {
    title: 'Select all',
    description:
      'showSelectAll adds a tri-state box over the enabled items — checked, mixed or unchecked; from mixed it selects all. The handle’s selectAll() / unselectAll() do the same from code.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeCheckBoxGroup'] },
      name: 'CheckBoxGroupSelectAllDemo',
      before: `const columns = ['Name', 'E-mail', 'City', 'Country', 'Phone'];`,
      body: `const [picked, setPicked] = useState<readonly unknown[]>(['Name', 'City']);`,
      jsx: `<OgeCheckBoxGroup
  label="Columns to export"
  items={columns}
  showSelectAll
  value={picked}
  onValueChange={setPicked}
/>`,
    }),
  },
  {
    title: 'Layouts',
    description:
      "layout: 'vertical' | 'horizontal' | 'columns' — a column, a wrapping row, or a CSS grid of columns columns.",
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeCheckBoxGroup'] },
      name: 'CheckBoxGroupLayoutDemo',
      before: `const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const toppings = ['Basil', 'Olives', 'Mushrooms', 'Peppers', 'Onion', 'Ham'];`,
      body: `const [workDays, setWorkDays] = useState<readonly unknown[]>([
  'Mon', 'Tue', 'Wed', 'Thu', 'Fri',
]);
const [pizza, setPizza] = useState<readonly unknown[]>(['Basil']);`,
      jsx: `<div className="flex flex-col gap-6">
  <OgeCheckBoxGroup
    label="Days"
    layout="horizontal"
    items={days}
    value={workDays}
    onValueChange={setWorkDays}
  />
  <OgeCheckBoxGroup
    label="Toppings"
    layout="columns"
    columns={3}
    items={toppings}
    value={pizza}
    onValueChange={setPizza}
  />
</div>`,
    }),
  },
  {
    title: 'Inside a form',
    description:
      'The controlled pair is the integration point: derive "at least one" in your form layer and pass errors and touched back — the group renders the message in its subscript.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeCheckBoxGroup'] },
      name: 'CheckBoxGroupFormDemo',
      before: `const interests = ['Design', 'Engineering', 'Product', 'Sales'];`,
      body: `const [value, setValue] = useState<readonly unknown[]>([]);
const [touched, setTouched] = useState(false);`,
      jsx: `<OgeCheckBoxGroup
  label="Interests"
  items={interests}
  required
  value={value}
  onValueChange={setValue}
  touched={touched}
  onBlur={() => setTouched(true)}
  errors={value.length ? [] : [{ kind: 'required', message: 'Pick at least one interest' }]}
/>`,
    }),
  },
];
