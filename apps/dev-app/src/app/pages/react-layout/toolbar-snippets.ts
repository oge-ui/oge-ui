import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React toolbar page. Pure data, no React imports — the
 * `llms.txt` generator and the compile gate load this module in plain Node.
 *
 * Section-for-section mirror of `../layout/toolbar-snippets.ts`, per the parity
 * standard (`docs/REACT-PARITY.md`): same order, same titles, same example
 * content — translated to React idiom. The one structural difference is the
 * item source: Angular's declarative `<oge-toolbar-item>` children have no
 * React counterpart, so every demo drives the bar from the `items` array and
 * the component-level callbacks (`onItemClick`, `onActiveChanged`), with the
 * `before` / `center` / `after` node slots and the `renderItem` /
 * `renderMenuItem` render props as the escape hatches.
 */
export const LAYOUT_TOOLBAR_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Commands',
    description:
      'Every entry of the items array renders a button by default. severity picks the emphasis, type: "separator" draws a rule, and one component-level onItemClick reports whichever command ran.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeToolbar'] },
      types: { '@oge-ui/react-layout': ['OgeToolbarItemData'] },
      name: 'ToolbarCommandsDemo',
      before: `const commands: readonly OgeToolbarItemData[] = [
  { key: 'new', text: 'New' },
  { key: 'open', text: 'Open' },
  { key: 'sep', type: 'separator' },
  { key: 'save', text: 'Save', severity: 'accent' },
  { key: 'delete', text: 'Delete', severity: 'danger', location: 'after' },
];`,
      body: `const [last, setLast] = useState('—');`,
      jsx: `<>
  <OgeToolbar
    ariaLabel="Document actions"
    items={commands}
    onItemClick={(event) => setLast(event.item?.text ?? '')}
  />
  <p>last command → {last}</p>
</>`,
    }),
  },
  {
    title: 'Data-driven items',
    description:
      'The items array is the only item source in React — there is no child component to project. An entry with a defined active renders a toggle button with aria-pressed.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeToolbar'] },
      types: { '@oge-ui/react-layout': ['OgeToolbarItemData'] },
      name: 'ToolbarItemsDemo',
      before: `const tools: readonly OgeToolbarItemData[] = [
  { key: 'undo', text: 'Undo' },
  { key: 'redo', text: 'Redo' },
  { key: 'sep', type: 'separator' },
  { key: 'bold', text: 'Bold', active: true },
  { key: 'note', type: 'label', text: 'Draft' },
  { key: 'publish', text: 'Publish', location: 'after', severity: 'accent' },
];`,
      body: `const [last, setLast] = useState('—');`,
      jsx: `<>
  <OgeToolbar
    items={tools}
    onItemClick={(event) =>
      setLast(\`\${event.key} (\${event.inMenu ? 'menu' : 'bar'})\`)
    }
  />
  <p>last command → {last}</p>
</>`,
    }),
  },
  {
    title: 'Location groups',
    description:
      'before and after take their natural width; center claims the rest and centres inside it. Everything uses logical properties, so the order mirrors in RTL with no flag to set.',
    source: reactDemoSource({
      use: { '@oge-ui/react-layout': ['OgeToolbar'] },
      types: { '@oge-ui/react-layout': ['OgeToolbarItemData'] },
      name: 'ToolbarLocationDemo',
      before: `const items: readonly OgeToolbarItemData[] = [
  { key: 'back', text: 'Back', location: 'before' },
  { key: 'file', type: 'label', text: 'report.xlsx', location: 'center' },
  { key: 'share', text: 'Share', location: 'after' },
];`,
      jsx: `<OgeToolbar items={items} />`,
    }),
  },
  {
    title: 'Overflow menu',
    description:
      "Narrow the container and the trailing commands collapse into the menu. locateInMenu defaults to 'auto'; 'always' pins an item to the menu whatever the width, 'never' keeps it on the bar even if the row overflows.",
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeToolbar'] },
      types: { '@oge-ui/react-layout': ['OgeToolbarItemData'] },
      name: 'ToolbarOverflowDemo',
      before: `const items: readonly OgeToolbarItemData[] = [
  { key: 'cut', text: 'Cut', locateInMenu: 'never' },
  { key: 'copy', text: 'Copy' },
  { key: 'paste', text: 'Paste' },
  { key: 'paste-special', text: 'Paste special' },
  { key: 'print', text: 'Print preview' },
  { key: 'settings', text: 'Document settings', locateInMenu: 'always' },
];`,
      body: `const [width, setWidth] = useState(520);
const [inMenu, setInMenu] = useState(0);`,
      jsx: `<>
  <label htmlFor="tb-width">width</label>
  <input
    id="tb-width"
    type="range"
    min={220}
    max={720}
    step={10}
    value={width}
    onChange={(event) => setWidth(Number(event.target.value))}
  />
  <div style={{ maxWidth: width }}>
    <OgeToolbar
      overflow="menu"
      items={items}
      onOverflowChanged={(event) => setInMenu(event.count)}
    />
  </div>
  <p>in the menu → {inMenu} command(s)</p>
</>`,
    }),
  },
  {
    title: 'Overflow priority',
    description:
      'Every reference toolbar drops strictly from the end of the row, so keeping a primary command means moving it to the front. overflowPriority separates yield order from visual order — higher survives longer — and equal priorities fall back to end-first, so the default reproduces the reference behaviour exactly.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeToolbar'] },
      types: { '@oge-ui/react-layout': ['OgeToolbarItemData'] },
      name: 'ToolbarPriorityDemo',
      before: `const items: readonly OgeToolbarItemData[] = [
  { key: 'open', text: 'Open' },
  { key: 'print', text: 'Print preview', overflowPriority: -1 },
  { key: 'settings', text: 'Document settings', overflowPriority: -1 },
  // Save sits last on the bar and is still the last to collapse.
  { key: 'save', text: 'Save', severity: 'accent', overflowPriority: 10 },
];`,
      body: `const [width, setWidth] = useState(520);`,
      jsx: `<>
  <label htmlFor="tb-priority-width">width</label>
  <input
    id="tb-priority-width"
    type="range"
    min={220}
    max={720}
    step={10}
    value={width}
    onChange={(event) => setWidth(Number(event.target.value))}
  />
  <div style={{ maxWidth: width }}>
    <OgeToolbar overflow="menu" items={items} />
  </div>
</>`,
    }),
  },
  {
    title: 'Overflow modes',
    description:
      'Five modes, one prop — the union of every mode the reference libraries offer. scroll keeps a single line and adds arrows, extended hides the remainder in a second row behind a toggle that names it through aria-controls.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeToolbar'] },
      types: {
        '@oge-ui/react-layout': ['OgeToolbarItemData', 'OgeToolbarOverflow'],
      },
      name: 'ToolbarModesDemo',
      before: `const modes: readonly OgeToolbarOverflow[] = [
  'menu',
  'scroll',
  'wrap',
  'extended',
  'none',
];

const items: readonly OgeToolbarItemData[] = [
  { key: 'cut', text: 'Cut' },
  { key: 'copy', text: 'Copy' },
  { key: 'paste', text: 'Paste' },
  { key: 'paste-special', text: 'Paste special' },
  { key: 'print', text: 'Print preview' },
];`,
      body: `const [mode, setMode] = useState<OgeToolbarOverflow>('extended');`,
      jsx: `<>
  <div>
    {modes.map((option) => (
      <button key={option} type="button" onClick={() => setMode(option)}>
        {option}
      </button>
    ))}
  </div>
  <div style={{ maxWidth: 384 }}>
    <OgeToolbar overflow={mode} items={items} />
  </div>
</>`,
    }),
  },
  {
    title: 'Toggle commands',
    description:
      'A defined active is what makes an item a toggle. items entries are data the toolbar must not mutate, so a React toggle is controlled: the component reports through onActiveChanged and the application applies the new value.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeToolbar'] },
      types: { '@oge-ui/react-layout': ['OgeToolbarItemData'] },
      name: 'ToolbarToggleDemo',
      body: `const [bold, setBold] = useState(true);
const [italic, setItalic] = useState(false);
const [last, setLast] = useState('—');

const items: readonly OgeToolbarItemData[] = [
  { key: 'bold', text: 'Bold', active: bold },
  { key: 'italic', text: 'Italic', active: italic },
];`,
      jsx: `<>
  <OgeToolbar
    items={items}
    onActiveChanged={(event) => {
      if (event.key === 'bold') setBold(event.active);
      if (event.key === 'italic') setItalic(event.active);
      setLast(\`\${event.key} → \${event.active}\`);
    }}
  />
  <p>
    bold {String(bold)} · italic {String(italic)} · last {last}
  </p>
</>`,
    }),
  },
  {
    title: 'Runtime changes',
    description:
      'items stays the declared source of truth and the ref handle is an override layer on top of it — so a re-supplied array cannot silently undo a hideItem(). dataSource loads the same shape from a server.',
    source: reactDemoSource({
      react: ['useRef'],
      use: { '@oge-ui/react-layout': ['OgeToolbar'] },
      types: {
        '@oge-ui/react-layout': ['OgeToolbarHandle', 'OgeToolbarItemData'],
      },
      name: 'ToolbarRuntimeDemo',
      before: `const tools: readonly OgeToolbarItemData[] = [
  { key: 'cut', text: 'Cut' },
  { key: 'copy', text: 'Copy' },
  { key: 'paste', text: 'Paste' },
];`,
      body: `const bar = useRef<OgeToolbarHandle>(null);`,
      jsx: `<>
  <OgeToolbar ref={bar} items={tools} />
  <button
    type="button"
    onClick={() => bar.current?.addItem({ key: 'new', text: 'Added' })}
  >
    addItem
  </button>
  <button type="button" onClick={() => bar.current?.hideItem('copy')}>
    hideItem
  </button>
  <button
    type="button"
    onClick={() => bar.current?.enableItem('paste', false)}
  >
    disable
  </button>
  <button type="button" onClick={() => bar.current?.clearItemOverrides()}>
    reset
  </button>
  <button type="button" onClick={() => bar.current?.refreshOverflow()}>
    refreshOverflow
  </button>
</>`,
    }),
  },
  {
    title: 'Icon-only commands',
    description:
      'showText="inMenu" renders the bar entry icon-only and keeps the label for the overflow menu. The button never loses its accessible name — the text becomes its aria-label.',
    source: reactDemoSource({
      use: { '@oge-ui/react-layout': ['OgeToolbar'] },
      types: { '@oge-ui/react-layout': ['OgeToolbarItemData'] },
      name: 'ToolbarIconDemo',
      before: `// Icons are SVG path data — there is no icon font or icon package.
const items: readonly OgeToolbarItemData[] = [
  { key: 'bold', text: 'Bold', icon: 'M5 3h4a3 3 0 0 1 0 6H5zM5 9h5a3 3 0 0 1 0 6H5z' },
  { key: 'italic', text: 'Italic', icon: 'M10 3H6m4 0-3 10m0 0H3m4 0h3' },
  {
    key: 'underline',
    text: 'Underline',
    icon: 'M4 3v5a4 4 0 0 0 8 0V3M3 14h10',
    showText: 'always',
  },
];`,
      jsx: `<OgeToolbar showText="inMenu" items={items} />`,
    }),
  },
  {
    title: 'Custom content',
    description:
      'Two escape hatches instead of a string-keyed widget + options bag. The before / center / after node slots put any control straight on the bar — where it stays, because the toolbar cannot re-render DOM it does not own. A renderItem render prop replaces the rendering of the entries the toolbar does own, so such an entry can still collapse into the menu.',
    source: reactDemoSource({
      react: ['useState'],
      use: {
        '@oge-ui/react-layout': ['OgeToolbar'],
        '@oge-ui/react-inputs': ['OgeSelectBox'],
      },
      types: { '@oge-ui/react-layout': ['OgeToolbarItemData'] },
      name: 'ToolbarSlotsDemo',
      before: `const views = ['All', 'Mine', 'Archived'];
const items: readonly OgeToolbarItemData[] = [{ key: 'view', text: 'View' }];`,
      body: `const [view, setView] = useState<unknown>('All');`,
      jsx: `<OgeToolbar
  items={items}
  renderItem={() => (
    <OgeSelectBox
      label="View"
      items={views}
      value={view}
      onValueChange={setView}
      size="sm"
    />
  )}
  after={<input type="search" placeholder="Search…" aria-label="Search" />}
/>`,
    }),
  },
  {
    title: 'Keyboard & accessibility',
    description:
      'One Tab stop for the whole toolbar, arrow keys between the controls, Home/End to the ends, disabled controls skipped. A vertical toolbar uses Up/Down and reports aria-orientation. A text input inside keeps its own arrow and Home/End keys — the APG warns against stealing them.',
    source: reactDemoSource({
      use: { '@oge-ui/react-layout': ['OgeToolbar'] },
      types: { '@oge-ui/react-layout': ['OgeToolbarItemData'] },
      name: 'ToolbarKeyboardDemo',
      before: `const items: readonly OgeToolbarItemData[] = [
  { key: 'select', text: 'Select' },
  { key: 'move', text: 'Move', disabled: true },
  { key: 'zoom', text: 'Zoom' },
];`,
      jsx: `<OgeToolbar
  orientation="vertical"
  ariaLabel="Tools"
  wrap={false}
  items={items}
/>`,
    }),
  },
  {
    title: 'Configuration',
    description:
      "Every user-facing string — including the overflow button's accessible name — lives in the messages interface, overridable app-wide with <OgeToolbarConfigProvider> or per instance with the messages prop.",
    source: reactDemoSource({
      use: {
        '@oge-ui/react-layout': ['OgeToolbar', 'OgeToolbarConfigProvider'],
      },
      types: { '@oge-ui/react-layout': ['OgeToolbarItemData'] },
      name: 'ToolbarConfigDemo',
      before: `const items: readonly OgeToolbarItemData[] = [
  { key: 'yeni', text: 'Yeni' },
  { key: 'kaydet', text: 'Kaydet', severity: 'accent' },
  { key: 'ayarlar', text: 'Ayarlar', locateInMenu: 'always' },
];`,
      jsx: `<OgeToolbarConfigProvider
  config={{
    size: 'sm',
    stylingMode: 'flat',
    messages: {
      toolbar: 'Araç çubuğu',
      overflowMenu: 'Daha fazla komut',
      noData: 'Gösterilecek komut yok',
    },
  }}
>
  {/* A single instance can still override the strings with the messages prop. */}
  <OgeToolbar
    items={items}
    messages={{ toolbar: 'Araç çubuğu', overflowMenu: 'Daha fazla' }}
  />
</OgeToolbarConfigProvider>`,
    }),
  },
];
