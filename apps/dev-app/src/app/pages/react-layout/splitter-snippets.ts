import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React splitter page. Pure data, no React imports —
 * the `llms.txt` generator and the compile gate load this module in plain Node.
 *
 * Section-for-section mirror of `../layout/splitter.ts`, per the parity
 * standard (`docs/REACT-PARITY.md`): same eleven headings, in the same order,
 * with the same example content — translated to React idiom. Angular's
 * projected `<oge-splitter-pane>` children become entries of the `panes` prop
 * carrying `content`, the `[(sizes)]` model becomes the controlled
 * `sizes` / `onSizesChange` pair, and `[ogeSplitterPaneTemplate]` becomes the
 * `renderPane` render prop.
 */
export const LAYOUT_SPLITTER_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Resizable panes',
    description:
      'Drag the separator, or Tab to it and use the arrow keys. sizes is the controlled half of the pair — pass it with onSizesChange and it is the only state you need to keep.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeSplitter'] },
      types: { '@oge-ui/react-layout': ['OgeSplitterSize'] },
      name: 'SplitterDemo',
      body: `// Sizes are ratios, not percentages — [30, 30] lays out like [50, 50],
// so a configuration that does not add up to 100 is never an error.
const [sizes, setSizes] = useState<readonly OgeSplitterSize[]>([35, 65]);`,
      jsx: `// The splitter fills its container, so give it (or a wrapper) a height.
<OgeSplitter
  sizes={sizes}
  onSizesChange={setSizes}
  style={{ blockSize: 220 }}
  panes={[
    { key: 'list', minSize: 15, content: <div>Result list…</div> },
    { key: 'detail', minSize: 25, content: <div>Detail view…</div> },
  ]}
/>`,
    }),
  },
  {
    title: 'Orientation',
    description:
      'horizontal lays the panes out side by side, vertical stacks them. The keyboard follows the axis: Left/Right against a horizontal splitter, Up/Down against a vertical one.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeSplitter'] },
      types: { '@oge-ui/react-layout': ['OgeSplitterOrientation'] },
      name: 'SplitterOrientationDemo',
      body: `const [orientation, setOrientation] =
  useState<OgeSplitterOrientation>('vertical');`,
      jsx: `<>
  {(['horizontal', 'vertical'] as const).map((option) => (
    <button key={option} type="button" onClick={() => setOrientation(option)}>
      {option}
    </button>
  ))}
  <OgeSplitter
    orientation={orientation}
    style={{ blockSize: 220 }}
    panes={[
      { content: <div>Top / left</div> },
      { content: <div>Bottom / right</div> },
    ]}
  />
</>`,
    }),
  },
  {
    title: 'Fixed and fluid panes',
    description:
      "A '240px' size becomes a fixed grid track and leaves the share pool; dragging it moves real pixels. minSize and maxSize accept either unit, so a pixel floor on a ratio pane is fine.",
    source: reactDemoSource({
      use: { '@oge-ui/react-layout': ['OgeSplitter'] },
      name: 'SplitterFixedDemo',
      jsx: `// A '<n>px' size pins the pane: it becomes a fixed grid track and
// drops out of the share pool, while '<n>%' and plain numbers stay ratios.
// min and max accept either unit, so a px floor on a ratio pane is fine.
<OgeSplitter
  style={{ blockSize: 220 }}
  panes={[
    {
      size: '240px',
      minSize: '160px',
      maxSize: '420px',
      content: <div>Fixed sidebar — dragged in pixels</div>,
    },
    { minSize: 20, content: <div>Fluid content</div> },
  ]}
/>`,
    }),
  },
  {
    title: 'Collapsible panes',
    description:
      'A separator grows one grip per collapsible neighbour, so either side can be collapsed. Enter targets the pane before it (the APG primary pane) and Ctrl+Arrow reaches both. The pane returns at the size it left, and while collapsed it stays in the DOM as inert so aria-controls keeps pointing at a real element.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeSplitter'] },
      types: { '@oge-ui/react-layout': ['OgeSplitterPaneCollapsedEvent'] },
      name: 'SplitterCollapseDemo',
      body: `// A pane's \`collapsed\` field is the React counterpart of the Angular
// [(collapsed)] model: write it to drive the pane, and follow the pane's
// own collapses through onPaneCollapsed / onPaneExpanded.
const [sideCollapsed, setSideCollapsed] = useState(false);

const onCollapsed = (event: OgeSplitterPaneCollapsedEvent) => {
  console.log('collapsed', event.key);
  setSideCollapsed(true);
};`,
      jsx: `<OgeSplitter
  style={{ blockSize: 220 }}
  onPaneCollapsed={onCollapsed}
  onPaneExpanded={() => setSideCollapsed(false)}
  panes={[
    {
      key: 'side',
      size: 30,
      collapsible: true,
      collapsedSize: '28px',
      collapsed: sideCollapsed,
      content: <div>Navigation…</div>,
    },
    { key: 'main', content: <div>Editor…</div> },
  ]}
/>`,
    }),
  },
  {
    title: 'Data-driven panes',
    description:
      'Pass the panes as data and render their bodies from one renderPane render prop — the React face of [ogeSplitterPaneTemplate]. An entry that carries its own content overrides it, so the two styles mix freely.',
    source: reactDemoSource({
      use: { '@oge-ui/react-layout': ['OgeSplitter'] },
      types: { '@oge-ui/react-layout': ['OgeSplitterPaneItem'] },
      name: 'SplitterPanesDemo',
      before: `const areas: OgeSplitterPaneItem[] = [
  { key: 'explorer', size: 25, minSize: 15, collapsible: true },
  { key: 'editor', size: 50 },
  { key: 'inspector', size: 25, minSize: 15 },
];`,
      jsx: `<OgeSplitter
  panes={areas}
  style={{ blockSize: 220 }}
  renderPane={(pane, index) => (
    <h4>
      {index} — {pane.key}
    </h4>
  )}
/>`,
    }),
  },
  {
    title: 'Nested splitters',
    description:
      'A splitter inside a pane just works — no second component and no wrapper. A pane nests either by rendering an <OgeSplitter> as its content, or by carrying its own panes array, which defaults to the opposite axis.',
    source: reactDemoSource({
      use: { '@oge-ui/react-layout': ['OgeSplitter'] },
      name: 'SplitterNestedDemo',
      jsx: `// Nesting needs no second component: a splitter inside a pane just
// works, and a pane also nests by carrying its own panes array
// (which defaults to the opposite axis).
<OgeSplitter
  style={{ blockSize: 220 }}
  panes={[
    { size: '220px', collapsible: true, content: <div>Sidebar</div> },
    {
      content: (
        <OgeSplitter
          orientation="vertical"
          style={{ blockSize: '100%' }}
          panes={[
            { size: 70, content: <div>Editor</div> },
            { size: 30, collapsible: true, content: <div>Terminal</div> },
          ]}
        />
      ),
    },
  ]}
/>`,
    }),
  },
  {
    title: 'Forms inside a pane',
    description:
      'A pane is a plain block box and never a query container, so a form inside one keeps resolving its @container queries against itself. There is no React @oge-ui/forms layer yet, so the fields here are @oge-ui/react-inputs editors bound to plain state — the honest React idiom, and the same demonstration: drag the separator and the form reflows with the pane, not the window.',
    source: reactDemoSource({
      react: ['useState'],
      use: {
        '@oge-ui/react-inputs': ['OgeNumberBox', 'OgeTextBox'],
        '@oge-ui/react-layout': ['OgeSplitter'],
      },
      name: 'SplitterFormDemo',
      body: `// @oge-ui/forms has no React layer yet (docs/REACT-PARITY.md), so the
// editors hold their value in your own state — useState here, but React
// Hook Form, Formik or TanStack Form bind exactly the same way.
const [server, setServer] = useState({
  host: 'db.internal',
  port: 5432 as number | null,
  user: 'app',
});`,
      jsx: `<OgeSplitter
  style={{ blockSize: 280 }}
  panes={[
    {
      size: 78,
      content: (
        <div className="demo-row">
          <OgeTextBox
            label="Host"
            value={server.host}
            onValueChange={(host) => setServer((s) => ({ ...s, host }))}
          />
          <OgeNumberBox
            label="Port"
            value={server.port}
            onValueChange={(port) => setServer((s) => ({ ...s, port }))}
          />
          <OgeTextBox
            label="User"
            value={server.user}
            onValueChange={(user) => setServer((s) => ({ ...s, user }))}
          />
        </div>
      ),
    },
    { size: 22, content: <div>Preview…</div> },
  ]}
/>`,
    }),
  },
  {
    title: 'Keyboard & accessibility',
    description:
      "Tab to a separator, then Arrow keys to move it by step, Home and End for the primary pane's smallest and largest size, and Enter to collapse or restore it. Ctrl+Arrow reaches either neighbour. Values are reported on one 0–100 scale via aria-valuenow.",
    source: reactDemoSource({
      use: { '@oge-ui/react-layout': ['OgeSplitter'] },
      name: 'SplitterKeyboardDemo',
      jsx: `// WAI-ARIA APG window splitter: every separator is a focusable
// role="separator" with aria-controls on the pane before it and
// aria-valuenow/min/max on one 0-100 scale.
//   Arrow keys    move it by \`step\` share points (RTL mirrored)
//   Home / End    jump to the primary pane's smallest / largest size
//   Enter         collapse the primary pane, or restore it
//   Ctrl + Arrow  collapse the pane the arrow points at, or restore
//                 the collapsed one it points away from
<OgeSplitter
  step={10}
  ariaLabel="Editor layout"
  style={{ blockSize: 220 }}
  panes={[
    {
      minSize: 20,
      maxSize: 70,
      collapsible: true,
      content: <div>Primary</div>,
    },
    { minSize: 20, collapsible: true, content: <div>Secondary</div> },
  ]}
/>`,
    }),
  },
  {
    title: 'Events',
    description:
      'onResizeStarted fires once, onResized on every change and onResizeEnded once the gesture settles — the same trio the references expose. onPaneCollapsing and onPaneExpanding are cancelable.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeSplitter'] },
      types: {
        '@oge-ui/react-layout': [
          'OgeSplitterPaneCollapsingEvent',
          'OgeSplitterResizeEvent',
        ],
      },
      name: 'SplitterEventsDemo',
      body: `const [locked, setLocked] = useState(true);

const onResized = (event: OgeSplitterResizeEvent) => {
  console.log(event.sizes, event.previousSizes);
};

// onPaneCollapsing / onPaneExpanding are cancelable — set cancel to veto.
const onCollapsing = (event: OgeSplitterPaneCollapsingEvent) => {
  if (locked) event.cancel = true;
};`,
      jsx: `<>
  <label>
    <input
      type="checkbox"
      checked={locked}
      onChange={(event) => setLocked(event.target.checked)}
    />
    veto collapsing (event.cancel = true)
  </label>
  <OgeSplitter
    style={{ blockSize: 220 }}
    onResizeStarted={() => console.log('start')}
    onResized={onResized}
    onResizeEnded={() => console.log('end')}
    onPaneCollapsing={onCollapsing}
    panes={[
      { key: 'a', collapsible: true, content: <div>A</div> },
      { key: 'b', content: <div>B</div> },
    ]}
  />
</>`,
    }),
  },
  {
    title: 'Persisting sizes',
    description:
      "sizes is the whole persistable state — a plain array of numbers and '<n>px' strings. There is no stateKey to learn and no context to provide: save it to localStorage, an API or a route param in a few lines.",
    source: reactDemoSource({
      react: ['useEffect', 'useState'],
      use: { '@oge-ui/react-layout': ['OgeSplitter'] },
      types: { '@oge-ui/react-layout': ['OgeSplitterSize'] },
      name: 'SplitterPersistDemo',
      body: `// sizes + onSizesChange is the whole persistable state, so there is no
// stateKey to learn and no storage context to provide — save it anywhere.
const [sizes, setSizes] = useState<readonly OgeSplitterSize[]>(
  () => JSON.parse(localStorage.getItem('editor-layout') ?? 'null') ?? [30, 70],
);

useEffect(() => {
  localStorage.setItem('editor-layout', JSON.stringify(sizes));
}, [sizes]);`,
      jsx: `<OgeSplitter
  sizes={sizes}
  onSizesChange={setSizes}
  style={{ blockSize: 220 }}
  panes={[
    { content: <div>Left</div> },
    { content: <div>Right</div> },
  ]}
/>`,
    }),
  },
  {
    title: 'Configuration',
    description:
      "<OgeSplitterConfigProvider> sets the defaults and every user-facing string for its subtree, including the separators' accessible names — the React counterpart of provideOgeSplitterConfig(). A per-instance messages prop overrides it.",
    source: reactDemoSource({
      use: {
        '@oge-ui/react-layout': ['OgeSplitter', 'OgeSplitterConfigProvider'],
      },
      name: 'SplitterConfigDemo',
      jsx: `<OgeSplitterConfigProvider
  config={{
    separatorSize: 8,
    step: 10,
    messages: {
      separator: '{{first}} ile {{second}} arasını yeniden boyutlandır',
      collapsePane: 'Paneli daralt',
      expandPane: 'Paneli aç',
    },
  }}
>
  <OgeSplitter
    style={{ blockSize: 220 }}
    panes={[
      { collapsible: true, content: <div>Sol</div> },
      { content: <div>Sağ</div> },
    ]}
  />
</OgeSplitterConfigProvider>`,
    }),
  },
];
