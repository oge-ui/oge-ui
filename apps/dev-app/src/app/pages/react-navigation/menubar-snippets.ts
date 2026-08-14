import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React menubar page. Pure data, no React imports — the
 * `llms.txt` generator and the compile gate load this module in plain Node.
 *
 * Section-for-section mirror of `../navigation/menubar.ts`, per the parity
 * standard (`docs/REACT-PARITY.md`): the same seven sections, in the same
 * order, with the same example menu, translated to React idiom. The one real
 * difference is the second section: React reserves the `key` prop, so a
 * `<OgeMenubarItem>` child could not carry item identity — the React layer has
 * a single API, the shared `items` array, and the section says so.
 */
export const NAVIGATION_MENUBAR_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Getting started',
    description:
      'One items tree; children at any depth open as nested submenus. onItemClick reports the item, its key and the hierarchical index path. shortcut renders a right-aligned accelerator hint (announced via aria-keyshortcuts; the binding stays yours) and badge a counter pill. Try the keyboard: Left/Right, Down to open, ArrowRight on Share, Escape to unwind.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-navigation': ['OgeMenubar'] },
      types: {
        '@oge-ui/react-navigation': [
          'OgeMenubarItemData',
          'OgeMenubarItemClickEvent',
        ],
      },
      name: 'MenubarBasicsDemo',
      before: `// role="menubar" with the full APG keyboard contract: roving
// tabindex, Left/Right between items, Down/Enter opens, Escape unwinds,
// type-ahead. Submenus run on the same <OgeMenuList> every other menu in
// the suite uses.
const menu: OgeMenubarItemData[] = [
  {
    text: 'File',
    items: [
      // shortcut renders right-aligned and announces aria-keyshortcuts;
      // the actual key binding stays the application's job.
      { text: 'New', key: 'new', shortcut: 'Ctrl+N' },
      { text: 'Open…', key: 'open', shortcut: 'Ctrl+O' },
      { separator: true, text: '' },
      { text: 'Share', badge: 2, items: [{ text: 'Email', key: 'email' }] },
    ],
  },
  { text: 'Edit', items: [{ text: 'Undo', key: 'undo', shortcut: 'Ctrl+Z' }] },
  { text: 'Help', key: 'help' },
];`,
      body: `const [last, setLast] = useState('—');

const run = (event: OgeMenubarItemClickEvent) => {
  setLast(\`\${event.key ?? event.item.text} [\${event.path.join(', ')}]\`);
};`,
      jsx: `<>
  <OgeMenubar items={menu} onItemClick={run} />
  <p className="mt-3 text-sm">
    Last click: <code>{last}</code>
  </p>
</>`,
    }),
  },
  {
    title: 'Declarative items',
    description:
      'Angular offers two APIs and merges declarative <oge-menubar-item> children before the items input. React has one: the items array. A child component could not carry the identity anyway — React reserves the key prop — so the tree is data, at every depth, and there is no merge order to remember.',
    source: reactDemoSource({
      use: { '@oge-ui/react-navigation': ['OgeMenubar'] },
      types: { '@oge-ui/react-navigation': ['OgeMenubarItemData'] },
      name: 'MenubarItemsDemo',
      before: `// The Angular counterpart of this section nests
// <oge-menubar-item> elements. React has no such child: \`key\` is
// reserved by React itself, so an item component could not carry the
// identity \`key\` means here. Nesting is the items array, all the way
// down — the same tree the section above builds.
const menu: OgeMenubarItemData[] = [
  {
    text: 'File',
    items: [
      { text: 'New', key: 'new' },
      { separator: true, text: '' },
      { text: 'Exit', key: 'exit' },
    ],
  },
  { text: 'Help', key: 'help' },
];`,
      jsx: `<OgeMenubar items={menu} />`,
    }),
  },
  {
    title: 'Open mode',
    description:
      "openMode applies to the top level only: 'click' is the desktop-menubar default, 'hover' opens after hoverDelay. Nested levels always open on hover and on ArrowRight/Enter. With a menu open, hovering siblings switches it in either mode.",
    source: reactDemoSource({
      use: { '@oge-ui/react-navigation': ['OgeMenubar'] },
      types: { '@oge-ui/react-navigation': ['OgeMenubarItemData'] },
      name: 'MenubarOpenModeDemo',
      before: `// openMode applies to the TOP level only: 'click' is the
// desktop-menubar default, 'hover' opens after hoverDelay. Nested levels
// always open on hover and on ArrowRight/Enter — the reference libraries'
// first-vs-nested split baked in as behavior, not a second prop. Once a
// menu is open, hovering siblings switches it in either mode.
const menu: OgeMenubarItemData[] = [
  { text: 'File', items: [{ text: 'New' }] },
  { text: 'Edit', items: [{ text: 'Undo' }] },
];`,
      jsx: `<OgeMenubar items={menu} openMode="hover" hoverDelay={150} />`,
    }),
  },
  {
    title: 'Vertical menubar',
    description:
      'Same widget, same roles: aria-orientation="vertical" is announced, Up/Down traverse the bar and ArrowRight opens the submenu beside it — the axis swap the APG prescribes.',
    source: reactDemoSource({
      use: { '@oge-ui/react-navigation': ['OgeMenubar'] },
      types: { '@oge-ui/react-navigation': ['OgeMenubarItemData'] },
      name: 'MenubarVerticalDemo',
      before: `// A vertical menubar keeps role="menubar" and announces
// aria-orientation="vertical"; Up/Down traverse the bar and ArrowRight
// opens the submenu beside it, exactly as the APG allows.
const menu: OgeMenubarItemData[] = [
  { text: 'Dashboard', key: 'dashboard' },
  { text: 'Reports', items: [{ text: 'Monthly' }, { text: 'Annual' }] },
  { text: 'Settings', items: [{ text: 'Profile' }] },
];`,
      jsx: `<OgeMenubar orientation="vertical" items={menu} />`,
    }),
  },
  {
    title: 'Adaptive hamburger',
    description:
      "compactBelow measures the menubar's own container, never the window — a bar inside a split pane adapts to the room it actually has. Below the threshold the whole bar becomes one hamburger button opening the full tree as nested menus.",
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-navigation': ['OgeMenubar'] },
      types: {
        '@oge-ui/react-navigation': [
          'OgeMenubarItemData',
          'OgeMenubarCompactChangedEvent',
        ],
      },
      name: 'MenubarCompactDemo',
      before: `// compactBelow measures the menubar's OWN container, never the
// window (DevExtreme collapses on widget overflow, PrimeNG on a media
// query). Below the threshold the whole bar becomes a hamburger button
// opening the full tree as one nested menu — no second interaction model.
const menu: OgeMenubarItemData[] = [
  { text: 'File', items: [{ text: 'New' }] },
  { text: 'Edit', items: [{ text: 'Undo' }] },
  { text: 'Help', key: 'help' },
];`,
      body: `const [width, setWidth] = useState(640);

const onCompact = (event: OgeMenubarCompactChangedEvent) => {
  console.log('compact:', event.compact);
};`,
      jsx: `<>
  <label className="mb-2 flex items-center gap-2 text-sm">
    Container width
    <input
      type="range"
      min={200}
      max={640}
      value={width}
      onChange={(event) => setWidth(+event.target.value)}
    />
    <code>{width}px</code>
  </label>
  <div className="rounded border p-2" style={{ width }}>
    <OgeMenubar
      items={menu}
      compactBelow={420}
      onCompactChanged={onCompact}
    />
  </div>
</>`,
    }),
  },
  {
    title: 'Cancelable events',
    description:
      'The -ing pair carries the house mutable cancel flag. Closes the menubar itself initiates (escape, select, navigation, api) are interceptable; pointer closes owned by the overlay (outside) and Tab only report onSubmenuClosed.',
    source: reactDemoSource({
      react: ['useRef', 'useState'],
      use: { '@oge-ui/react-navigation': ['OgeMenubar'] },
      types: {
        '@oge-ui/react-navigation': [
          'OgeMenubarItemData',
          'OgeMenubarSubmenuOpeningEvent',
          'OgeMenubarSubmenuClosingEvent',
        ],
      },
      name: 'MenubarEventsDemo',
      before: `// The -ing pair is cancelable with the house mutable cancel
// flag. Closes the menubar initiates (escape, select, navigation, api) run
// through onSubmenuClosing; pointer closes owned by the overlay (outside)
// and Tab only report onSubmenuClosed.
const menu: OgeMenubarItemData[] = [
  { text: 'File', key: 'file', items: [{ text: 'New' }] },
];`,
      body: `const [locked, setLocked] = useState(false);
// The callbacks run inside the component's event pipeline, so they read the
// latest value from a ref rather than the render they were created in.
const lockedRef = useRef(locked);
lockedRef.current = locked;

const onOpening = (event: OgeMenubarSubmenuOpeningEvent) => {
  if (lockedRef.current) event.cancel = true;
};

const onClosing = (event: OgeMenubarSubmenuClosingEvent) => {
  if (lockedRef.current && event.reason !== 'tab') event.cancel = true;
};`,
      jsx: `<>
  <label className="mb-2 flex items-center gap-2 text-sm">
    <input
      type="checkbox"
      checked={locked}
      onChange={(event) => setLocked(event.target.checked)}
    />
    Lock the submenu (cancel opening and closing)
  </label>
  <OgeMenubar
    items={menu}
    onSubmenuOpening={onOpening}
    onSubmenuClosing={onClosing}
  />
</>`,
    }),
  },
  {
    title: 'Configuration',
    description:
      'Subtree defaults for openMode, hoverDelay, orientation and compactBelow, plus every user-facing string — the bar’s accessible name and the hamburger label included — via <OgeMenubarConfigProvider>; instance props win.',
    source: reactDemoSource({
      use: {
        '@oge-ui/react-navigation': ['OgeMenubar', 'OgeMenubarConfigProvider'],
      },
      types: { '@oge-ui/react-navigation': ['OgeMenubarItemData'] },
      name: 'MenubarConfigDemo',
      before: `// Every user-facing string lives in the messages block — the bar's
// accessible name and the compact hamburger's label included. The context
// provider is the React shape of provideOgeMenubarConfig().
const menu: OgeMenubarItemData[] = [
  { text: 'Dosya', items: [{ text: 'Yeni' }] },
];`,
      jsx: `<OgeMenubarConfigProvider
  config={{
    openMode: 'hover',
    compactBelow: 480,
    messages: { menubar: 'Ana menü', hamburger: 'Menü' },
  }}
>
  <OgeMenubar items={menu} />
</OgeMenubarConfigProvider>`,
    }),
  },
];
