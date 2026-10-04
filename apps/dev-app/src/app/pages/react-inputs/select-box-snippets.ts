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
  {
    title: 'Mobile / adaptive',
    description:
      "adaptiveMode='auto' turns the drop-down into a modal bottom sheet (title, close button, search field, 44px rows) and the date picker into a full-screen dialog below adaptiveBreakpoint (600px). <OgeInputsConfigProvider config={{ adaptiveMode: 'auto' }}> switches the whole family.",
    source: reactDemoSource({
      react: ['useState'],
      use: {
        '@oge-ui/react-inputs': ['OgeSelectBox', 'OgeTagBox', 'OgeDateBox'],
      },
      before: `const cities = ['Ankara', 'Berlin', 'Lisbon', 'Oslo', 'Tokyo'];
const skills = ['Angular', 'Signals', 'Nx', 'Vitest', 'SCSS'];`,
      name: 'SelectBoxAdaptiveDemo',
      body: `const [city, setCity] = useState<unknown>(null);
const [skillIds, setSkillIds] = useState<readonly unknown[]>([]);
const [due, setDue] = useState<Date | null>(null);`,
      jsx: `<div className="demo-row">
  <OgeSelectBox
    label="City"
    adaptiveMode="auto"
    items={cities}
    searchEnabled
    value={city}
    onValueChange={setCity}
  />
  <OgeTagBox
    label="Skills"
    adaptiveMode="auto"
    items={skills}
    value={skillIds}
    onValueChange={setSkillIds}
  />
  <OgeDateBox
    label="Due date"
    adaptiveMode="auto"
    value={due}
    onValueChange={setDue}
  />
</div>`,
    }),
  },
  {
    title: 'Remote data',
    description:
      'Bind any @oge-ui/core DataSource to dataSource: pages of pageSize rows load as the list scrolls, the typed text goes to the server as searchText after searchTimeout, superseded requests are aborted and pages are cached per search. byKey() resolves a value no loaded page holds.',
    source: reactDemoSource({
      react: ['useState'],
      use: {
        '@oge-ui/react-inputs': ['OgeSelectBox'],
        '@oge-ui/core': ['CustomDataSource'],
      },
      before: `interface Customer {
  id: number;
  name: string;
}

const CUSTOMERS: Customer[] = Array.from({ length: 5000 }, (_, i) => ({
  id: i + 1,
  name: \`Customer \${String(i + 1).padStart(4, '0')}\`,
}));

/** Any core DataSource works; byKey resolves the initial value. */
const customers = Object.assign(
  new CustomDataSource<Customer>({
    key: 'id',
    load: async ({ skip = 0, take = 40, searchText }) => {
      await new Promise((resolve) => setTimeout(resolve, 400));
      const term = (searchText ?? '').toLowerCase();
      const rows = CUSTOMERS.filter((c) => c.name.toLowerCase().includes(term));
      return { data: rows.slice(skip, skip + take), totalCount: rows.length };
    },
  }),
  {
    byKey: async (key: unknown) => CUSTOMERS.find((c) => c.id === key) ?? null,
  },
);`,
      name: 'SelectBoxRemoteDemo',
      body: `const [customerId, setCustomerId] = useState<unknown>(1234);`,
      jsx: `<OgeSelectBox<Customer>
  label="Customer"
  displayExpr="name"
  valueExpr="id"
  dataSource={customers}
  pageSize={40}
  searchEnabled
  searchTimeout={300}
  virtualScroll
  showClearButton
  value={customerId}
  onValueChange={setCustomerId}
/>`,
    }),
  },
  {
    title: 'Templates & cancelable events',
    description:
      'renderGroup, renderField (paints the closed field over the real input), renderHeader and renderFooter. onOpening / onClosing are cancelable pre-events — set event.cancel = true; onClosing carries its reason.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeSelectBox'] },
      before: `interface Status {
  id: string;
  name: string;
  phase: string;
  color: string;
}

const statuses: Status[] = [
  { id: 'todo', name: 'To do', phase: 'Open', color: '#94a3b8' },
  { id: 'doing', name: 'In progress', phase: 'Open', color: '#6366f1' },
  { id: 'review', name: 'In review', phase: 'Open', color: '#f59e0b' },
  { id: 'done', name: 'Done', phase: 'Closed', color: '#10b981' },
];

const dot = (color: string) => (
  <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 5, background: color }} />
);`,
      name: 'SelectBoxTemplatesDemo',
      body: `const [statusId, setStatusId] = useState<unknown>('doing');
const [pinned, setPinned] = useState(false);`,
      jsx: `<OgeSelectBox<Status>
  label="Status"
  items={statuses}
  displayExpr="name"
  valueExpr="id"
  groupBy="phase"
  renderGroup={(label) => <span>Phase · {label}</span>}
  renderField={(item, { text }) => (
    <>
      {item && dot(item.color)} {text}
    </>
  )}
  renderItem={(item) => (
    <>
      {dot(item.color)} <span className="oge-select-option-text">{item.name}</span>
    </>
  )}
  renderHeader={({ items }) => <>{items.length} statuses</>}
  renderFooter={() => (
    <label>
      <input type="checkbox" checked={pinned} onChange={() => setPinned(!pinned)} />{' '}
      Keep open (cancels closing)
    </label>
  )}
  onClosing={(event) => {
    if (pinned && event.reason !== 'select') event.cancel = true;
  }}
  value={statusId}
  onValueChange={setStatusId}
/>`,
    }),
  },
  {
    title: 'Tag Box — select all, custom tags & limits',
    description:
      'The tag box speaks the select box vocabulary — groupBy, renderItem, lazy items, acceptCustomValue + onCustomItemCreating — and adds a tri-state showSelectAll row, maxSelectedItems with a status message, renderTag chips and a "+N more" overflow chip.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeTagBox'] },
      before: `interface Skill {
  id: number;
  name: string;
  area: string;
}

const INITIAL: Skill[] = [
  { id: 1, name: 'Angular', area: 'Frontend' },
  { id: 2, name: 'Signals', area: 'Frontend' },
  { id: 3, name: 'SCSS', area: 'Frontend' },
  { id: 4, name: 'Nx', area: 'Tooling' },
  { id: 5, name: 'Vitest', area: 'Tooling' },
  { id: 6, name: 'Playwright', area: 'Tooling' },
];
let nextId = 100;`,
      name: 'TagBoxFeaturesDemo',
      body: `const [skills, setSkills] = useState(INITIAL);
const [skillIds, setSkillIds] = useState<readonly unknown[]>([1, 4]);`,
      jsx: `<OgeTagBox<Skill>
  label="Skills"
  items={skills}
  displayExpr="name"
  valueExpr="id"
  groupBy="area"
  searchEnabled
  showSelectAll
  acceptCustomValue
  maxSelectedItems={5}
  maxDisplayedTags={3}
  renderTag={(_item, { text }) => <span className="oge-tag-text">#{text}</span>}
  hint="Type a new skill and press Enter"
  onCustomItemCreating={(event) => {
    const item = { id: nextId++, name: event.text, area: 'Custom' };
    setSkills((all) => [...all, item]);
    event.customItem = item;
  }}
  value={skillIds}
  onValueChange={setSkillIds}
/>`,
    }),
  },
  {
    title: 'Tag Box — remote data',
    description:
      'The same dataSource contract on the tag box: 2,000 cities paged 30 at a time, server-side search, and chips that stay resolved while the list shows another search.',
    source: reactDemoSource({
      react: ['useState'],
      use: {
        '@oge-ui/react-inputs': ['OgeTagBox'],
        '@oge-ui/core': ['CustomDataSource'],
      },
      before: `interface City {
  id: number;
  name: string;
}

const CITIES: City[] = Array.from({ length: 2000 }, (_, i) => ({
  id: i + 1,
  name: \`City \${i + 1}\`,
}));

const cities = new CustomDataSource<City>({
  key: 'id',
  load: async ({ skip = 0, take = 30, searchText, signal }) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    signal?.throwIfAborted(); // a newer search superseded this request
    const term = (searchText ?? '').toLowerCase();
    const rows = CITIES.filter((c) => c.name.toLowerCase().includes(term));
    return { data: rows.slice(skip, skip + take), totalCount: rows.length };
  },
});`,
      name: 'TagBoxRemoteDemo',
      body: `const [cityIds, setCityIds] = useState<readonly unknown[]>([]);`,
      jsx: `<OgeTagBox<City>
  label="Delivery cities"
  displayExpr="name"
  valueExpr="id"
  dataSource={cities}
  searchEnabled
  virtualScroll
  value={cityIds}
  onValueChange={setCityIds}
/>`,
    }),
  },
];
