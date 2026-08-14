import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React autocomplete page. Pure data, no React imports —
 * the `llms.txt` generator and the compile gate load this module in plain Node.
 *
 * Section-for-section mirror of `../inputs/autocomplete.ts`, per the parity
 * standard (`docs/REACT-PARITY.md`): same headings, same example content,
 * React idiom (`value` + `onValueChange` instead of `[(value)]`, callback
 * props instead of outputs).
 */
export const INPUTS_AUTOCOMPLETE_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Basic usage',
    description:
      'Type to see suggestions (from minSearchLength = 1 character on). Enter or blur commits the text; picking a suggestion commits its display text. The chevron and field-click opening are off by default.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeAutocomplete'] },
      before: `const cities = ['Ankara', 'Berlin', 'Lisbon', 'Oslo', 'Tokyo'];`,
      name: 'AutocompleteBasicDemo',
      body: `// the committed value is the TEXT itself, not an item value
const [cityName, setCityName] = useState('');`,
      jsx: `<OgeAutocomplete
  label="City"
  items={cities}
  value={cityName}
  onValueChange={setCityName}
/>`,
    }),
  },
  {
    title: 'Suggestion tuning',
    description:
      'minSearchLength keeps the list closed until enough is typed, maxItemCount caps it (default 10), searchMode switches contains/startswith and searchTimeout debounces the filter. groupBy and renderItem work exactly like the select box.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeAutocomplete'] },
      before: `const products = [
  { id: 1, name: 'Aurora Display' },
  { id: 2, name: 'Aurora Keyboard' },
  { id: 3, name: 'Nimbus Router' },
];`,
      name: 'AutocompleteTuningDemo',
      body: `const [productName, setProductName] = useState('');`,
      jsx: `<OgeAutocomplete
  label="Product"
  items={products}
  displayExpr="name"
  searchMode="startswith"
  minSearchLength={2}
  maxItemCount={5}
  value={productName}
  onValueChange={setProductName}
/>`,
    }),
  },
  {
    title: 'Force selection',
    description:
      'forceSelection turns free text off: on blur, text that matches no suggestion reverts to the last committed value, and an exact match resolves to the item with its canonical casing. onSelectionChange reports the picked item — or null once the text diverges.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeAutocomplete'] },
      before: `const users = [
  { id: 1, name: 'Elif Kaya', role: 'Engineering' },
  { id: 2, name: 'Mert Demir', role: 'Design' },
];`,
      name: 'AutocompleteForceDemo',
      body: `const [assigneeName, setAssigneeName] = useState('');
// non-matching text reverts on blur; an exact match resolves to the item
// (canonical casing) and fires onSelectionChange
const [assigneeRole, setAssigneeRole] = useState<string | null>(null);`,
      jsx: `<OgeAutocomplete
  label="Assignee"
  items={users}
  displayExpr="name"
  forceSelection
  value={assigneeName}
  onValueChange={setAssigneeName}
  onSelectionChange={(event) => setAssigneeRole(event.item?.role ?? null)}
/>`,
    }),
  },
  {
    title: 'Virtual scrolling',
    description:
      'virtualScroll windows the dropdown: 10 000 rows, ~15 in the DOM inside a full-height spacer. Available on the select box, tag box and autocomplete alike — pass true or { itemHeight, overscan }. Raise maxItemCount on the autocomplete, which otherwise caps the list at 10.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeAutocomplete', 'OgeSelectBox'] },
      before: `const accounts = Array.from(
  { length: 10000 },
  (_, index) => \`Account \${index + 1}\`,
);`,
      name: 'AutocompleteVirtualDemo',
      body: `const [accountName, setAccountName] = useState('');
const [accountId, setAccountId] = useState<unknown>(null);`,
      jsx: `<div className="demo-row">
  {/* 10 000 rows, ~15 in the DOM */}
  <OgeAutocomplete
    label="Account"
    items={accounts}
    virtualScroll
    maxItemCount={10000}
    value={accountName}
    onValueChange={setAccountName}
  />

  <OgeSelectBox
    label="Account"
    items={accounts}
    searchEnabled
    virtualScroll={{ overscan: 6 }}
    value={accountId}
    onValueChange={setAccountId}
  />
</div>`,
    }),
  },
  {
    title: 'Lazy & server-side data',
    description:
      'A function as items loads once on first open with localized loading/error rows. For fully server-driven suggestions, listen to onSearchChange, keep items in sync and flag loading while the request runs.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeAutocomplete'] },
      before: `// invoked once, on first open
const loadRepos = (): Promise<string[]> =>
  fetch('/api/repos').then((response) => response.json());`,
      name: 'AutocompleteLazyDemo',
      body: `const [repo, setRepo] = useState('');
const [serverItems, setServerItems] = useState<string[]>([]);
const [serverLoading, setServerLoading] = useState(false);

const queryServer = (text: string): void => {
  setServerLoading(true);
  fetch(\`/api/repos?q=\${encodeURIComponent(text)}\`)
    .then((response) => response.json())
    .then((items: string[]) => setServerItems(items))
    .finally(() => setServerLoading(false));
};`,
      jsx: `<div className="demo-row">
  <OgeAutocomplete
    label="Repository"
    items={loadRepos}
    value={repo}
    onValueChange={setRepo}
  />

  {/* or fully server-side: keep items in sync yourself */}
  <OgeAutocomplete
    items={serverItems}
    loading={serverLoading}
    searchTimeout={300}
    onSearchChange={(event) => queryServer(event.text)}
  />
</div>`,
    }),
  },
  {
    title: 'Field chrome',
    description:
      'The shared chrome applies unchanged: label modes, sizes, styling modes, clear button, hints and validation. showDropDownButton + openOnFieldClick opt into select-box-like opening.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeAutocomplete'] },
      before: `const tags = ['angular', 'signals', 'zoneless'];`,
      name: 'AutocompleteChromeDemo',
      body: `const [tag, setTag] = useState('');`,
      jsx: `<OgeAutocomplete
  label="Tag"
  labelMode="floating"
  showClearButton
  showDropDownButton
  openOnFieldClick
  hint="Start typing to search"
  items={tags}
  value={tag}
  onValueChange={setTag}
/>`,
    }),
  },
];
