import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React drawer page. Pure data, no React imports — the
 * `llms.txt` generator and the compile gate load this module in plain Node.
 *
 * Section-for-section mirror of `../navigation/drawer-snippets.ts`, per the
 * parity standard (`docs/REACT-PARITY.md`): the same eight sections, in the
 * same order, with the same example content — translated to React idiom. The
 * Angular `[ogeDrawerPanel]` slot arrives here as the `panel` node prop and the
 * `[(opened)]` model as the controlled `opened` + `onOpenedChange` pair.
 */
export const NAVIGATION_DRAWER_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Layout modes',
    description:
      'overlay floats over the content, push shifts it aside without resizing it, side shrinks it so both share the row. DevExtreme calls the last one shrink and Kendo calls it push; only DevExtreme and this drawer offer all three.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-navigation': ['OgeDrawer'] },
      types: { '@oge-ui/react-navigation': ['OgeDrawerMode'] },
      name: 'DrawerModesDemo',
      before: `// One component, not the container/drawer/content trio the reference
// libraries need. The panel is the \`panel\` node prop; \`children\` is
// everything the drawer sits next to.`,
      body: `const [opened, setOpened] = useState(true);
const [mode, setMode] = useState<OgeDrawerMode>('side');`,
      jsx: `<OgeDrawer
  opened={opened}
  onOpenedChange={setOpened}
  mode={mode}
  size={240}
  panel={<div>Navigation…</div>}
>
  <main>Content that overlay covers, push shifts and side shrinks.</main>
</OgeDrawer>`,
    }),
  },
  {
    title: 'Position',
    description:
      'Logical edges: start and end mirror in RTL on their own, because there is no rtlEnabled flag anywhere in this suite. Kendo is horizontal-only; this is the union of every edge the references offer.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-navigation': ['OgeDrawer'] },
      types: { '@oge-ui/react-navigation': ['OgeDrawerPosition'] },
      name: 'DrawerPositionDemo',
      before: `// start/end are logical: they mirror in RTL on their own, because there
// is no rtlEnabled flag anywhere in this suite.`,
      body: `const [opened, setOpened] = useState(false);
const [position, setPosition] = useState<OgeDrawerPosition>('start');`,
      jsx: `<OgeDrawer
  opened={opened}
  onOpenedChange={setOpened}
  mode="overlay"
  position={position}
  panel={<div>Panel</div>}
>
  <main>Content</main>
</OgeDrawer>`,
    }),
  },
  {
    title: 'Modal drawer',
    description:
      'An overlay drawer takes focus, traps Tab, closes on Escape and on a backdrop click, and marks the content behind it inert — which none of the four reference drawers does. Escape only acts on the topmost overlay, so a popup opened inside the drawer closes first.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-navigation': ['OgeDrawer'] },
      name: 'DrawerModalDemo',
      before: `// Modality is DERIVED from mode, never configured. overlay and push cover
// or displace the content, so they are dialogs: role="dialog", aria-modal,
// a focus trap, Escape and inert on the background. side is part of the
// layout, so it is a landmark with none of those.
//
// An independent "modal" flag is exactly what lets a panel claim
// role="complementary" and aria-modal="true" at the same time.`,
      body: `const [opened, setOpened] = useState(false);`,
      jsx: `<OgeDrawer
  opened={opened}
  onOpenedChange={setOpened}
  mode="overlay"
  ariaLabel="Main menu"
  showCloseButton
  panel={<a href="#reports">Reports</a>}
>
  <button
    type="button"
    aria-expanded={opened}
    onClick={() => setOpened(true)}
  >
    Menu
  </button>
  <main>Content</main>
</OgeDrawer>`,
    }),
  },
  {
    title: 'Compact rail',
    description:
      'minSize is the closed size — the rail that keeps icons reachable. It applies to mode="side" only: a rail belongs to the layout, and a modal drawer still partly on screen is not closed. Kendo spells this mini + miniWidth; one prop covers both.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-navigation': ['OgeDrawer'] },
      name: 'DrawerRailDemo',
      before: `// minSize is the closed size: the compact rail that keeps icons visible.
// It only applies to mode="side", because a rail belongs to the layout and
// a modal drawer still partly on screen is not closed.`,
      body: `const [opened, setOpened] = useState(false);`,
      jsx: `<OgeDrawer
  opened={opened}
  onOpenedChange={setOpened}
  mode="side"
  size={240}
  minSize={56}
  panel={<div>Icons, then labels once open</div>}
>
  <main>Content</main>
</OgeDrawer>`,
    }),
  },
  {
    title: 'Responsive downgrade',
    description:
      'DevExtreme and Kendo watch the window. This one measures its own container, so a drawer nested in a dialog, a split pane or this card adapts to the room it actually has. The decision is behavior’s pure resolveDrawerMode(), unit-tested without a DOM.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-navigation': ['OgeDrawer'] },
      types: { '@oge-ui/react-navigation': ['OgeDrawerModeChangedEvent'] },
      name: 'DrawerCompactDemo',
      before: `// compactBelow measures the drawer's OWN container, never the window, so a
// drawer nested in a dialog or a split pane adapts to the room it actually
// has. Below the threshold it downgrades to an overlay and closes, rather
// than leaving a backdrop the user never asked for.`,
      body: `const [opened, setOpened] = useState(true);

const onModeChanged = (event: OgeDrawerModeChangedEvent): void => {
  console.log(event.mode, 'compact:', event.compact);
};`,
      jsx: `<OgeDrawer
  opened={opened}
  onOpenedChange={setOpened}
  mode="side"
  compactBelow={720}
  onModeChanged={onModeChanged}
  panel={<div>Navigation</div>}
>
  <main>Content</main>
</OgeDrawer>`,
    }),
  },
  {
    title: 'Close guard',
    description:
      'The overlay package’s veto semantics, reused verbatim: false, a throw and a rejection all mean “stay open”, a promise reports pending, and a second close gesture meanwhile is dropped.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-navigation': ['OgeDrawer'] },
      name: 'DrawerGuardDemo',
      before: `// closeGuard follows the overlay package's veto semantics: false, a throw
// and a rejection all mean "stay open", a promise reports pending through
// the handle's closePending (and onClosePendingChange), and a second
// gesture meanwhile is dropped.`,
      body: `const [opened, setOpened] = useState(true);
const [dirty, setDirty] = useState(true);

const confirmDiscard = (): boolean =>
  !dirty || confirm('Discard your changes?');`,
      jsx: `<OgeDrawer
  opened={opened}
  onOpenedChange={setOpened}
  closeGuard={confirmDiscard}
  panel={<form>Unsaved edits…</form>}
>
  <label>
    <input
      type="checkbox"
      checked={dirty}
      onChange={() => setDirty(!dirty)}
    />
    pretend there are unsaved changes
  </label>
  <main>Content</main>
</OgeDrawer>`,
    }),
  },
  {
    title: 'App shell',
    description:
      'The whole shell out of OGE containers: a toolbar on top, a drawer down the side holding the tree view that ships in the same package, and a splitter dividing the workspace. Drag the width and the shell reorganises itself from its own size.',
    source: reactDemoSource({
      react: ['useState'],
      use: {
        '@oge-ui/react-navigation': ['OgeDrawer', 'OgeTreeView'],
        '@oge-ui/react-layout': ['OgeToolbar', 'OgeSplitter'],
      },
      types: {
        '@oge-ui/react-layout': ['OgeSplitterSize', 'OgeToolbarItemData'],
      },
      name: 'DrawerAppShellDemo',
      before: `// The whole app shell out of three OGE containers: a toolbar on top, a
// drawer down the side holding the tree view that ships in the same
// package, and a splitter dividing the workspace.
//
// compactBelow makes the shell responsive to its own width, so the same
// markup works full-page and inside a preview card.
const nav = [
  { id: 1, parentId: null, text: 'Reports' },
  { id: 2, parentId: 1, text: 'Monthly' },
  { id: 3, parentId: null, text: 'Settings' },
];`,
      body: `const [menuOpen, setMenuOpen] = useState(true);
const [sizes, setSizes] = useState<readonly OgeSplitterSize[]>([60, 40]);

const commands: readonly OgeToolbarItemData[] = [
  { key: 'menu', text: 'Menu' },
  { key: 'save', text: 'Save', severity: 'accent', overflowPriority: 10 },
  { key: 'help', text: 'Help', location: 'after', overflowPriority: -1 },
];`,
      jsx: `<>
  <OgeToolbar
    ariaLabel="Application"
    items={commands}
    onItemClick={(event) => {
      if (event.key === 'menu') setMenuOpen((open) => !open);
    }}
  />

  <OgeDrawer
    opened={menuOpen}
    onOpenedChange={setMenuOpen}
    mode="side"
    size={220}
    compactBelow={720}
    ariaLabel="Sections"
    panel={<OgeTreeView items={nav} />}
  >
    <OgeSplitter
      sizes={sizes}
      onSizesChange={setSizes}
      panes={[
        { key: 'list', content: <div>Rows…</div> },
        { key: 'detail', content: <div>Details…</div> },
      ]}
    />
  </OgeDrawer>
</>`,
    }),
  },
  {
    title: 'Configuration',
    description:
      'Every user-facing string, including the panel’s accessible name, lives in the messages interface — overridable app-wide with <OgeDrawerConfigProvider> or per instance with the messages prop.',
    source: reactDemoSource({
      react: ['useState'],
      use: {
        '@oge-ui/react-navigation': ['OgeDrawer', 'OgeDrawerConfigProvider'],
      },
      name: 'DrawerConfigDemo',
      body: `const [opened, setOpened] = useState(true);`,
      jsx: `<OgeDrawerConfigProvider
  config={{
    mode: 'side',
    size: 280,
    messages: { drawer: 'Gezinme', close: 'Kapat' },
  }}
>
  {/* A single instance can still override the strings with the messages prop. */}
  <OgeDrawer
    opened={opened}
    onOpenedChange={setOpened}
    showCloseButton
    messages={{ close: 'Paneli kapat' }}
    panel={<div>Gezinme…</div>}
  >
    <main>İçerik</main>
  </OgeDrawer>
</OgeDrawerConfigProvider>`,
    }),
  },
];
