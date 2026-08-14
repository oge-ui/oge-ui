import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React accordion overview. Pure data, no React imports —
 * the `llms.txt` generator and the compile gate load this module in plain Node.
 *
 * Section-for-section mirror of `../layout/overview.ts`, per the parity
 * standard (`docs/REACT-PARITY.md`): same ten sections, in the same order, with
 * the same example content — translated to React idiom, never trimmed.
 *
 * The one idiom difference worth naming up front: React has no counterpart of
 * the projected `<oge-accordion-item>` child, so every panel is an entry of the
 * `items` array carrying its own `content`, and the per-panel `[(expanded)]` /
 * `open()` / `close()` pair becomes the accordion handle's
 * `expand()` / `collapse()` / `toggle()` addressed by key (recorded in
 * `tools/docs-tools/check-parity.mjs`).
 */
export const LAYOUT_OVERVIEW_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Declarative panels',
    description:
      'Every panel is an items entry carrying its own content. selectedIndex is the controlled single-expand pair (pass onSelectedIndexChange with it); a user gesture first fires the cancelable onItemExpanding, then onItemExpanded. collapsible lets a second click close the open panel — without it the last open panel deliberately stays open. Disabled panels are skipped by clicks and arrow keys.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeAccordion'] },
      name: 'BasicAccordionDemo',
      body: `const [index, setIndex] = useState(-1);`,
      jsx: `<OgeAccordion
  collapsible
  selectedIndex={index}
  onSelectedIndexChange={setIndex}
  onItemExpanded={(event) => console.log('itemExpanded', event.index)}
  items={[
    {
      key: 'account',
      title: 'Account',
      description: 'Name and e-mail',
      content: <p>Account settings — selected index: {index}</p>,
    },
    { key: 'notifications', title: 'Notifications', badge: 3, content: <p>Notification settings…</p> },
    { key: 'archived', title: 'Archived', disabled: true, content: <p>Never reachable…</p> },
  ]}
/>`,
    }),
  },
  {
    title: 'Data-driven items',
    description:
      "The items array drives the panels; expandedKeys is the multi-expand controlled pair, so state survives reordering and insertions. icon takes raw SVG path data — there is no icon font or icon package. A component-level renderContent render prop renders every panel's body.",
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeAccordion'] },
      types: { '@oge-ui/react-layout': ['OgeAccordionItemDefinition'] },
      name: 'ItemsAccordionDemo',
      before: `const sections: OgeAccordionItemDefinition[] = [
  {
    key: 'general',
    title: 'General',
    description: 'Language, time zone and formats',
    icon: 'M12 3v2m0 14v2m9-9h-2M5 12H3m14.5-6.5l-1.4 1.4M7.9 16.1l-1.4 1.4m11.2 0l-1.4-1.4M7.9 7.9L6.5 6.5',
  },
  {
    key: 'security',
    title: 'Security',
    description: 'Password and two-factor auth',
    badge: 2,
    icon: 'M12 2l8 4v6c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6z',
  },
  { key: 'danger', title: 'Danger zone', description: 'Irreversible actions' },
];`,
      body: `const [openKeys, setOpenKeys] = useState<readonly string[]>(['general']);`,
      jsx: `<OgeAccordion
  items={sections}
  multiple
  collapsible
  expandedKeys={openKeys}
  onExpandedKeysChange={setOpenKeys}
  renderContent={({ item }) => (
    <p>
      Body of <b>{item?.title}</b> — expandedKeys: <code>{openKeys.join(', ') || '(none)'}</code>
    </p>
  )}
/>`,
    }),
  },
  {
    title: 'Single, multiple & collapsible',
    description:
      'Single-expand collapses the sibling automatically. Without collapsible the last open panel cannot be closed, and the APG says such a header gets aria-disabled="true" — not disabled, so it stays focusable. Toggle the switches and watch the open header.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeAccordion'] },
      types: { '@oge-ui/react-layout': ['OgeAccordionItemDefinition'] },
      name: 'ModeAccordionDemo',
      before: `const sections: OgeAccordionItemDefinition[] = [
  { key: 'general', title: 'General', description: 'Language, time zone and formats' },
  { key: 'security', title: 'Security', description: 'Password and two-factor auth', badge: 2 },
  { key: 'danger', title: 'Danger zone', description: 'Irreversible actions' },
];`,
      body: `const [multiple, setMultiple] = useState(false);
const [collapsible, setCollapsible] = useState(false);`,
      jsx: `<>
  <div className="demo-row demo-row-start">
    <label>
      <input type="checkbox" checked={multiple} onChange={() => setMultiple(!multiple)} /> multiple
    </label>
    <label>
      <input type="checkbox" checked={collapsible} onChange={() => setCollapsible(!collapsible)} /> collapsible
    </label>
  </div>
  <OgeAccordion
    items={sections}
    multiple={multiple}
    collapsible={collapsible}
    renderContent={({ item }) => <p>{item?.title} body…</p>}
  />
</>`,
    }),
  },
  {
    title: 'Lazy rendering & keep-alive',
    description:
      'With deferRendering (default) a panel that renders through renderContent is mounted on first expand; keepAlive (default) then keeps it mounted while collapsed — the creation time does not change when you reopen. Turn keep-alive off and the content is recreated every time.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeAccordion'] },
      name: 'LazyAccordionDemo',
      before: `function CreatedAt() {
  const [createdAt] = useState(() => new Date().toLocaleTimeString());
  return <p className="text-sm">Created at {createdAt}</p>;
}`,
      body: `const [keepAlive, setKeepAlive] = useState(true);`,
      jsx: `<>
  <label>
    <input type="checkbox" checked={keepAlive} onChange={() => setKeepAlive(!keepAlive)} /> keepAlive
  </label>
  <OgeAccordion
    keepAlive={keepAlive}
    multiple
    collapsible
    items={[
      { key: 'first', title: 'First', renderContent: () => <CreatedAt /> },
      { key: 'second', title: 'Second', renderContent: () => <CreatedAt /> },
    ]}
  />
</>`,
    }),
  },
  {
    title: 'Async expand guard',
    description:
      "Expanding runs a pipeline: cancelable onItemExpanding → the panel's async expandGuard (the header shows a spinner, extra clicks are ignored) → onItemExpanded. The guard also runs on collapse. Resolving false, throwing and rejecting all veto.",
    source: reactDemoSource({
      use: { '@oge-ui/react-layout': ['OgeAccordion'] },
      types: { '@oge-ui/react-layout': ['OgeAccordionItemDefinition'] },
      name: 'GuardAccordionDemo',
      before: `const guarded: OgeAccordionItemDefinition[] = [
  { key: 'plain', title: 'Opens right away' },
  {
    key: 'slow',
    title: 'Confirms first (1s)',
    expandGuard: () => new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 1000)),
  },
  { key: 'locked', title: 'Always vetoes', expandGuard: () => false },
];`,
      jsx: `<OgeAccordion
  items={guarded}
  multiple
  collapsible
  renderContent={({ item }) => <p>{item?.title} body…</p>}
/>`,
    }),
  },
  {
    title: 'Invalid sections',
    description:
      'Flag a panel invalid and it grows a danger rail, a dot beside the title and a visually hidden label so screen readers announce it. expandInvalid() on the ref handle opens every failing section at once — the natural move after a rejected form submit.',
    source: reactDemoSource({
      react: ['useRef', 'useState'],
      use: { '@oge-ui/react-layout': ['OgeAccordion'] },
      types: {
        '@oge-ui/react-layout': [
          'OgeAccordionHandle',
          'OgeAccordionItemDefinition',
        ],
      },
      name: 'InvalidAccordionDemo',
      body: `const accordion = useRef<OgeAccordionHandle>(null);
const [sections, setSections] = useState<OgeAccordionItemDefinition[]>([
  { key: 'contact', title: 'Contact' },
  { key: 'billing', title: 'Billing', invalid: true },
  { key: 'shipping', title: 'Shipping', invalid: true },
]);`,
      jsx: `<>
  <OgeAccordion
    ref={accordion}
    items={sections}
    multiple
    collapsible
    renderContent={({ item }) => <p>{item?.title} fields…</p>}
  />
  <div className="demo-row demo-row-start">
    <button type="button" onClick={() => accordion.current?.expandInvalid()}>
      Show all errors
    </button>
    <button
      type="button"
      onClick={() => setSections((all) => all.map((s) => ({ ...s, invalid: false })))}
    >
      Fix everything
    </button>
  </div>
</>`,
    }),
  },
  {
    title: 'Async content loader',
    description:
      'A per-panel contentLoader runs on first expand: a shimmering skeleton shows while it is pending, the resolved value reaches renderContent as data, and a rejection renders the failure message with a real retry button. The second panel fails once, then succeeds.',
    source: reactDemoSource({
      use: { '@oge-ui/react-layout': ['OgeAccordion'] },
      name: 'LoaderAccordionDemo',
      before: `const loadInvoices = () =>
  new Promise<string>((resolve) => setTimeout(() => resolve('42 invoices loaded.'), 900));

let flakyAttempts = 0;
const loadFlaky = () =>
  new Promise<string>((resolve, reject) =>
    setTimeout(() => {
      flakyAttempts++;
      if (flakyAttempts === 1) reject(new Error('network'));
      else resolve(\`Report ready on attempt \${flakyAttempts}.\`);
    }, 700),
  );`,
      jsx: `<OgeAccordion
  multiple
  collapsible
  renderContent={({ data }) => <p>{data as string}</p>}
  items={[
    { key: 'invoices', title: 'Invoices', contentLoader: loadInvoices },
    { key: 'flaky', title: 'Flaky report', contentLoader: loadFlaky },
  ]}
/>`,
    }),
  },
  {
    title: 'Header actions',
    description:
      'The APG puts the panel title in a <button>, so a second focusable control cannot live inside it — axe flags that as nested-interactive. renderHeaderActions is therefore rendered as a sibling of the toggle: real buttons, reachable with Tab, skipped by the accordion’s arrow navigation.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeAccordion'] },
      name: 'ActionsAccordionDemo',
      before: `const ALL_TEAMS = ['Platform', 'Design', 'Support'];`,
      body: `const [teams, setTeams] = useState<readonly string[]>(ALL_TEAMS);`,
      jsx: `<>
  <OgeAccordion
    multiple
    collapsible
    items={teams.map((team) => ({
      key: team,
      title: team,
      content: <p>{team} members…</p>,
      renderHeaderActions: () => (
        <button type="button" onClick={() => setTeams(teams.filter((t) => t !== team))}>
          Remove
        </button>
      ),
    }))}
  />
  <button type="button" onClick={() => setTeams(ALL_TEAMS)}>
    Reset
  </button>
</>`,
    }),
  },
  {
    title: 'Panel-level control',
    description:
      "React has no per-panel component, so a panel is driven from outside through the accordion's ref handle: expand(), collapse() and toggle() take an index or a key and run the same pipeline as a click, so a guard veto simply resolves false. An items entry may still start expanded, hideToggle is overridable per panel, and onAfterExpand/onAfterCollapse fire once the height animation settles. The footer action bar is the oge-accordion-action-row class inside the panel body.",
    source: reactDemoSource({
      react: ['useRef', 'useState'],
      use: { '@oge-ui/react-layout': ['OgeAccordion'] },
      types: { '@oge-ui/react-layout': ['OgeAccordionHandle'] },
      name: 'PanelControlAccordionDemo',
      body: `const accordion = useRef<OgeAccordionHandle>(null);
const [settled, setSettled] = useState<string | null>(null);`,
      jsx: `<>
  <OgeAccordion
    ref={accordion}
    multiple
    collapsible
    onAfterExpand={(event) => setSettled(\`afterExpand → \${event.index}\`)}
    onAfterCollapse={(event) => setSettled(\`afterCollapse → \${event.index}\`)}
    items={[
      {
        key: 'profile',
        title: 'Profile',
        expanded: true,
        content: (
          <>
            <p>Name, e-mail and avatar…</p>
            <div className="oge-accordion-action-row">
              <button type="button" onClick={() => accordion.current?.collapse('profile')}>
                Cancel
              </button>
              <button type="button" onClick={() => accordion.current?.collapse('profile')}>
                Save
              </button>
            </div>
          </>
        ),
      },
      {
        key: 'preferences',
        title: 'Preferences',
        hideToggle: true,
        content: <p>This panel overrides hideToggle on its own.</p>,
      },
    ]}
  />
  <div className="demo-row demo-row-start">
    <button type="button" onClick={() => accordion.current?.toggle('profile')}>
      toggle('profile')
    </button>
    {settled && <span>{settled}</span>}
  </div>
</>`,
    }),
  },
  {
    title: 'Toggle position & styling',
    description:
      "togglePosition is logical, so RTL mirrors it for free. displayMode: 'flat' drops the gutters and joins the panels into one stack, stylingMode switches between outlined, filled and borderless, and size sets the header density.",
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeAccordion'] },
      types: {
        '@oge-ui/react-layout': [
          'OgeAccordionItemDefinition',
          'OgeAccordionTogglePosition',
        ],
      },
      name: 'StylingAccordionDemo',
      before: `const sections: OgeAccordionItemDefinition[] = [
  { key: 'general', title: 'General', description: 'Language, time zone and formats' },
  { key: 'security', title: 'Security', description: 'Password and two-factor auth', badge: 2 },
  { key: 'danger', title: 'Danger zone', description: 'Irreversible actions' },
];`,
      body: `const [togglePosition, setTogglePosition] = useState<OgeAccordionTogglePosition>('end');
const [flat, setFlat] = useState(false);`,
      jsx: `<>
  <div className="demo-row demo-row-start">
    <label>
      <input
        type="checkbox"
        checked={togglePosition === 'start'}
        onChange={() => setTogglePosition(togglePosition === 'end' ? 'start' : 'end')}
      />{' '}
      togglePosition = start
    </label>
    <label>
      <input type="checkbox" checked={flat} onChange={() => setFlat(!flat)} /> displayMode = flat
    </label>
  </div>
  <OgeAccordion
    items={sections}
    multiple
    collapsible
    togglePosition={togglePosition}
    displayMode={flat ? 'flat' : 'default'}
    stylingMode="filled"
    size="sm"
    renderContent={({ item }) => <p>{item?.title} body…</p>}
  />
</>`,
    }),
  },
];
