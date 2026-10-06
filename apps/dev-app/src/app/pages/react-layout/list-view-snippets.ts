import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React list view page. Pure data, no React imports —
 * the `llms.txt` generator and the compile gate load this module in plain
 * Node.
 *
 * Section-for-section mirror of `../layout/list-view.ts`
 * (`docs/REACT-PARITY.md`): same six sections, same order, same example
 * content; the Angular template slots arrive as the `renderItem` /
 * `renderGroup` / `renderEmpty` / `renderFooter` render props.
 */
const PEOPLE = `interface Person {
  id: number;
  name: string;
  role: string;
  team: string;
  away?: boolean;
}

const people: Person[] = [
  { id: 1, name: 'Ada Lovelace', role: 'Analyst', team: 'Research' },
  { id: 2, name: 'Grace Hopper', role: 'Compiler lead', team: 'Platform' },
  { id: 3, name: 'Alan Turing', role: 'Cryptanalyst', team: 'Research', away: true },
  { id: 4, name: 'Margaret Hamilton', role: 'Flight software', team: 'Platform' },
  { id: 7, name: 'Barbara Liskov', role: 'Abstractions', team: 'Design' },
];`;

export const LAYOUT_LIST_VIEW_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Basics & templates',
    description:
      'Pass items and a displayExpr; renderItem replaces the row content while the list keeps the role, focus and selection. Without selection the list is a role="list": arrows, Home / End, PageUp / PageDown and type-ahead move one roving tab stop, Enter or a click reports onItemClick.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeListView'] },
      name: 'ListViewBasicsDemo',
      before: PEOPLE,
      body: `const [opened, setOpened] = useState<string | null>(null);`,
      jsx: `<>
  {/* selectionMode "none" (the default) renders role="list" with a roving tab stop */}
  <OgeListView
    items={people}
    displayExpr="name"
    ariaLabel="Team"
    onItemClick={(event) => setOpened(event.item.name)}
    renderItem={({ item }) => (
      <span className="flex flex-col">
        <strong>{item.name}</strong>
        <small>{item.role}</small>
      </span>
    )}
  />
  <p>Opened: {opened ?? '—'}</p>
</>`,
    }),
  },
  {
    title: 'Selection',
    description:
      'single or multiple turns the list into an APG listbox. Space toggles, Enter selects (single), Shift+arrows and Shift+click extend a range, Ctrl+A selects all and announces the count; disabledExpr keeps an option visible but aria-disabled, and the keyboard skips it.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeListView'] },
      types: { '@oge-ui/react-layout': ['OgeListViewKey'] },
      name: 'ListViewSelectionDemo',
      before: PEOPLE,
      body: `const [picked, setPicked] = useState<OgeListViewKey[]>([2]);`,
      jsx: `<>
  <OgeListView
    items={people}
    displayExpr="name"
    disabledExpr="away"
    selectionMode="multiple"
    showSelectionControls
    selectedKeys={picked}
    onSelectedKeysChange={setPicked}
    ariaLabel="Reviewers"
  />
  <p>Selected: {picked.join(', ') || 'none'}</p>
</>`,
    }),
  },
  {
    title: 'Grouping & sticky headers',
    description:
      'groupExpr splits the items into labelled segments (role="group" in a listbox, a nested list in a plain list). The visible header is aria-hidden — the segment already carries the name — and sticks to the top of its segment, so the next header pushes the previous one out.',
    source: reactDemoSource({
      use: { '@oge-ui/react-layout': ['OgeListView'] },
      name: 'ListViewGroupingDemo',
      before: PEOPLE,
      jsx: `<OgeListView
  items={people}
  displayExpr="name"
  groupExpr="team"
  selectionMode="single"
  height="260px"
  ariaLabel="People by team"
  renderGroup={({ group, count }) => \`\${group} · \${count}\`}
/>`,
    }),
  },
  {
    title: 'Virtual scrolling',
    description:
      'With fixed row heights the list renders only the rows in view plus a small overscan — 10 000 items scroll and type-ahead instantly. Keyboard navigation scrolls the active option into the window before pointing aria-activedescendant at it.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeListView'] },
      types: { '@oge-ui/react-layout': ['OgeListViewKey'] },
      name: 'ListViewVirtualDemo',
      before: `const tickets = Array.from({ length: 10_000 }, (_, i) => ({
  id: i + 1,
  name: \`Ticket #\${String(i + 1).padStart(5, '0')}\`,
}));`,
      body: `const [selected, setSelected] = useState<OgeListViewKey[]>([]);`,
      jsx: `<OgeListView
  items={tickets}
  displayExpr="name"
  selectionMode="single"
  selectedKeys={selected}
  onSelectedKeysChange={setSelected}
  virtualScroll={{ itemHeight: 44 }}
  height={320}
  ariaLabel="Tickets"
/>`,
    }),
  },
  {
    title: 'Search & infinite scroll',
    description:
      'searchEnabled adds a labelled search field that filters locale- and accent-insensitively ("istanbul" finds "İstanbul") and announces the result count. pageLoadMode "scroll" calls onLoadMoreRequested near the end (once per page), "button" renders a Load more button, and the arrival is announced.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeListView'] },
      name: 'ListViewSearchDemo',
      before: `interface City {
  id: number;
  name: string;
}

const NAMES = ['İstanbul', 'Ankara', 'Berlin', 'München', 'Paris', 'Zürich', 'Kraków', 'São Paulo'];

function page(index: number, size = 16): City[] {
  return Array.from({ length: size }, (_, i) => {
    const n = index * size + i;
    return { id: n + 1, name: \`\${NAMES[n % NAMES.length]} \${n + 1}\` };
  });
}`,
      body: `const [cities, setCities] = useState<City[]>(() => page(0));
const [loading, setLoading] = useState(false);
const loadMore = () => {
  setLoading(true);
  setTimeout(() => {
    setCities((current) => [...current, ...page(current.length / 16)]);
    setLoading(false);
  }, 600);
};`,
      jsx: `<OgeListView
  items={cities}
  displayExpr="name"
  searchEnabled
  pageLoadMode="scroll"
  hasMore={cities.length < 96}
  loading={loading}
  height={300}
  ariaLabel="Cities"
  onLoadMoreRequested={loadMore}
/>`,
    }),
  },
  {
    title: 'Swipe actions',
    description:
      'Actions are revealed by a horizontal swipe on touch (mirrored in RTL) and on hover or focus with a mouse; tapping or clicking one runs it. Inside an option they are aria-hidden glyphs — a listbox cannot hold buttons — so their keyboard twin is each action’s shortcut, advertised in aria-keyshortcuts.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeListView'] },
      types: { '@oge-ui/react-layout': ['OgeListViewItemAction'] },
      name: 'ListViewActionsDemo',
      before: `interface Message {
  id: number;
  from: string;
  subject: string;
}

const actions: OgeListViewItemAction[] = [
  { key: 'archive', label: 'Archive', severity: 'accent', shortcut: 'Shift+A' },
  { key: 'delete', label: 'Delete', severity: 'danger', shortcut: 'Delete' },
];`,
      body: `const [inbox, setInbox] = useState<Message[]>([
  { id: 1, from: 'Build bot', subject: 'Nightly build passed' },
  { id: 2, from: 'Ayşe Kaya', subject: 'Design review moved to Friday' },
  { id: 3, from: 'Billing', subject: 'Your invoice for October' },
]);
const [last, setLast] = useState<string | null>(null);`,
      jsx: `<>
  <OgeListView
    items={inbox}
    displayExpr="subject"
    selectionMode="single"
    itemActions={actions}
    ariaLabel="Inbox"
    onItemActionClick={(event) => {
      setLast(\`\${event.action.label}: \${event.item.subject}\`);
      setInbox((current) => current.filter((m) => m.id !== event.key));
    }}
  />
  <p>Last action: {last ?? '—'}</p>
</>`,
    }),
  },
];
