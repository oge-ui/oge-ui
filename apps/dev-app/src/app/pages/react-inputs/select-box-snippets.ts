import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React select box page. Pure data, no React imports —
 * the `llms.txt` generator and the compile gate load this module in plain Node.
 *
 * Section-for-section mirror of `../inputs/select-box.ts`, per the parity
 * standard (`docs/REACT-PARITY.md`): same headings, same example content,
 * React idiom (`value` + `onValueChange` instead of `[(value)]`, callback
 * props instead of outputs).
 */
export const INPUTS_SELECT_BOX_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Basic usage',
    description:
      'Bind an array of strings and the value pair — no mapping needed. Open with the mouse, ArrowDown, Enter or by typing a letter (type-ahead).',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeSelectBox'] },
      before: `const cities = ['Ankara', 'Berlin', 'Lisbon', 'Oslo', 'Tokyo'];`,
      name: 'SelectBoxBasicDemo',
      body: `const [city, setCity] = useState<unknown>(null);`,
      jsx: `<OgeSelectBox
  label="City"
  items={cities}
  value={city}
  onValueChange={setCity}
/>`,
    }),
  },
  {
    title: 'Data mapping & search',
    description:
      'Objects map through displayExpr/valueExpr (field name or function). searchEnabled turns the input editable and filters client-side; onSearchChange + loading are the server-side escape hatch.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeSelectBox'] },
      before: `const users = [
  { id: 1, name: 'Elif Kaya', role: 'Engineering' },
  { id: 2, name: 'Mert Demir', role: 'Design' },
  { id: 3, name: 'Deniz Ünal', role: 'Engineering' },
];`,
      name: 'SelectBoxMappingDemo',
      body: `const [assigneeId, setAssigneeId] = useState<unknown>(null);`,
      jsx: `<OgeSelectBox
  label="Assignee"
  items={users}
  displayExpr="name"
  valueExpr="id"
  searchEnabled
  showClearButton
  value={assigneeId}
  onValueChange={setAssigneeId}
  onSearchChange={(event) => console.log('searching for', event.text)}
/>`,
    }),
  },
  {
    title: 'Grouping & custom values',
    description:
      'groupBy (field name or function) groups flat data under headers on the fly — no pre-shaping. acceptCustomValue lets typed text that matches nothing become the value: onCustomItemCreating maps it to an item (sync, async, or null to reject).',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeSelectBox'] },
      before: `const users = [
  { id: 1, name: 'Elif Kaya', role: 'Engineering' },
  { id: 2, name: 'Mert Demir', role: 'Design' },
];`,
      name: 'SelectBoxGroupingDemo',
      body: `const [memberId, setMemberId] = useState<unknown>(null);
const [tags, setTags] = useState(['angular', 'signals']);
const [tag, setTag] = useState<unknown>(null);`,
      jsx: `<div className="demo-row">
  {/* flat data, grouped on the fly */}
  <OgeSelectBox
    label="Team member"
    items={users}
    displayExpr="name"
    valueExpr="id"
    groupBy="role"
    value={memberId}
    onValueChange={setMemberId}
  />

  {/* typed text becomes a new item */}
  <OgeSelectBox
    label="Tag"
    items={tags}
    searchEnabled
    acceptCustomValue
    value={tag}
    onValueChange={setTag}
    onCustomItemCreating={(payload) => {
      // or a promise, or null to reject
      payload.customItem = payload.text;
      setTags((current) => [...current, payload.text]);
    }}
  />
</div>`,
    }),
  },
  {
    title: 'Lazy data',
    description:
      'Pass a function as items — it runs once on first open; the popup shows a localized loading row while pending and an error row on rejection.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeSelectBox'] },
      before: `// invoked once, on first open — loading/error rows render while pending
const loadWarehouses = (): Promise<string[]> =>
  new Promise((resolve) =>
    setTimeout(() => resolve(['Hamburg', 'İzmir', 'Rotterdam']), 900),
  );`,
      name: 'SelectBoxLazyDemo',
      body: `const [warehouse, setWarehouse] = useState<unknown>(null);`,
      jsx: `<OgeSelectBox
  label="Warehouse"
  items={loadWarehouses}
  value={warehouse}
  onValueChange={setWarehouse}
/>`,
    }),
  },
  {
    title: 'Tag Box — multi-select',
    description:
      'OgeTagBox is the multi-select sibling: the value is an array of valueExpr results, picks render as removable chips, the popup stays open while selecting and Backspace removes the last chip. imageExpr puts avatars on chips and options; maxDisplayedTags collapses overflow into a +N chip.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeTagBox'] },
      before: `const skills = ['Angular', 'TypeScript', 'CSS', 'Testing'];

const users = [
  { id: 1, name: 'Elif Kaya', avatar: '/avatars/1.png' },
  { id: 2, name: 'Mert Demir', avatar: '/avatars/2.png' },
];`,
      name: 'TagBoxDemo',
      body: `const [selectedSkills, setSelectedSkills] = useState<readonly unknown[]>([
  'Angular',
]);
const [teamIds, setTeamIds] = useState<readonly unknown[]>([]);`,
      jsx: `<div className="demo-row">
  <OgeTagBox
    label="Skills"
    items={skills}
    searchEnabled
    value={selectedSkills}
    onValueChange={setSelectedSkills}
    onSelectionChange={(event) =>
      console.log(event.addedItems, event.removedItems)
    }
  />

  <OgeTagBox
    label="Team"
    items={users}
    displayExpr="name"
    valueExpr="id"
    imageExpr="avatar"
    maxDisplayedTags={3}
    value={teamIds}
    onValueChange={setTeamIds}
  />
</div>`,
    }),
  },
  {
    title: 'Item states & templates',
    description:
      'disabledExpr marks rows non-selectable (skipped by keyboard navigation too). renderItem is the React counterpart of the itemTemplate slot. The selected value stays resolvable even while the visible list is filtered.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeSelectBox'] },
      before: `const plans = [
  { id: 'free', name: 'Free', soldOut: false },
  { id: 'pro', name: 'Pro', soldOut: false },
  { id: 'enterprise', name: 'Enterprise', soldOut: true },
];`,
      name: 'SelectBoxStatesDemo',
      body: `const [planId, setPlanId] = useState<unknown>('free');`,
      jsx: `<OgeSelectBox
  label="Plan"
  items={plans}
  displayExpr="name"
  valueExpr="id"
  disabledExpr="soldOut"
  value={planId}
  onValueChange={setPlanId}
/>`,
    }),
  },
  {
    title: 'Field chrome',
    description:
      'Everything from the shared chrome applies: label modes, sizes, styling modes, clear button, hints, validation subscript and the sm + subscriptSizing="none" compact grid-editor shape.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeSelectBox'] },
      before: `const countries = ['Germany', 'Netherlands', 'Türkiye'];`,
      name: 'SelectBoxChromeDemo',
      body: `const [country, setCountry] = useState<unknown>(null);`,
      jsx: `<div className="demo-row">
  <OgeSelectBox
    label="Country"
    labelMode="floating"
    items={countries}
    showClearButton
    hint="Shipping destination"
    value={country}
    onValueChange={setCountry}
  />

  <OgeSelectBox
    label="Country"
    size="sm"
    stylingMode="filled"
    subscriptSizing="none"
    items={countries}
    value={country}
    onValueChange={setCountry}
  />
</div>`,
    }),
  },
];
