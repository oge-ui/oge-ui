import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React tile layout page. Pure data, no React imports —
 * the `llms.txt` generator and the compile gate load this module in plain Node.
 *
 * Section-for-section mirror of `../layout/tile-layout.ts`
 * (`docs/REACT-PARITY.md`): same five sections, same order, same example
 * content; the Angular template slots arrive as `renderHeader` /
 * `renderContent`, and the declarative `<oge-tile-layout-item>` children as
 * plain `items`.
 */
const DASHBOARD = `const tiles: OgeTileLayoutItemData[] = [
  { key: 'revenue', title: 'Revenue', colSpan: 2 },
  { key: 'orders', title: 'Orders' },
  { key: 'visitors', title: 'Visitors' },
  { key: 'traffic', title: 'Traffic sources', colSpan: 2, rowSpan: 2 },
  { key: 'conversion', title: 'Conversion' },
  { key: 'refunds', title: 'Refunds' },
  { key: 'tickets', title: 'Open tickets', colSpan: 2 },
];
const kpis: Record<string, string> = {
  revenue: '€ 48,210',
  orders: '1,284',
  visitors: '23,915',
  traffic: '61% search',
  conversion: '3.4%',
  refunds: '18',
  tickets: '42',
};`;

export const LAYOUT_TILE_LAYOUT_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Dashboard & spans',
    description:
      'Tiles take a colSpan and a rowSpan on a columns-wide grid; grid-auto-flow: dense back-fills the holes. Below 480px of its own width the layout collapses to one column.',
    source: reactDemoSource({
      use: { '@oge-ui/react-layout': ['OgeTileLayout'] },
      types: { '@oge-ui/react-layout': ['OgeTileLayoutItemData'] },
      name: 'TileLayoutBasicsDemo',
      before: DASHBOARD,
      jsx: `<OgeTileLayout
  items={tiles}
  columns={4}
  rowHeight={120}
  ariaLabel="Sales dashboard"
  renderContent={({ item }) => <strong>{kpis[item.key]}</strong>}
/>`,
    }),
  },
  {
    title: 'Reorder by drag & keyboard',
    description:
      'Drag a tile by its header or press Ctrl+Arrow keys on a focused tile — the same commit, the same onReordering (cancelable) → onReordered → onLayoutChanged sequence, an announcement, and focus stays on the moved tile. Escape cancels a drag.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeTileLayout'] },
      types: { '@oge-ui/react-layout': ['OgeTileLayoutItemData'] },
      name: 'TileLayoutReorderDemo',
      before: DASHBOARD,
      body: `const [log, setLog] = useState('Drag a header or press Ctrl+Arrow on a tile.');`,
      jsx: `<>
  <OgeTileLayout
    items={tiles}
    columns={4}
    rowHeight={110}
    ariaLabel="Reorderable dashboard"
    onReordered={(e) =>
      setLog(\`Moved \${e.key} from \${e.fromIndex + 1} to \${e.toIndex + 1} (\${e.source})\`)
    }
    renderContent={({ item }) => <strong>{kpis[item.key]}</strong>}
  />
  <p>{log}</p>
</>`,
    }),
  },
  {
    title: 'Resizing tiles',
    description:
      'resizable adds a pointer-only corner handle that snaps to whole tracks with a live preview; Ctrl+Shift+Arrow keys are the keyboard twin. Spans stay inside each tile’s bounds and the cancelable onResizing vetoes anything taller than three rows.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeTileLayout'] },
      types: { '@oge-ui/react-layout': ['OgeTileLayoutItemData'] },
      name: 'TileLayoutResizeDemo',
      before: `const tiles: OgeTileLayoutItemData[] = [
  { key: 'revenue', title: 'Revenue', colSpan: 2, maxColSpan: 3 },
  { key: 'orders', title: 'Orders', maxRowSpan: 2 },
  { key: 'traffic', title: 'Traffic sources', resizable: 'horizontal' },
  { key: 'tickets', title: 'Open tickets', resizable: false },
];`,
      body: `const [log, setLog] = useState('Drag a corner or press Ctrl+Shift+Arrow.');`,
      jsx: `<>
  <OgeTileLayout
    items={tiles}
    columns={4}
    rowHeight={110}
    resizable
    ariaLabel="Resizable dashboard"
    onResizing={(e) => {
      e.cancel = e.next.rowSpan > 3;
    }}
    onResized={(e) => setLog(\`\${e.key}: \${e.next.colSpan} × \${e.next.rowSpan}\`)}
    renderContent={({ colSpan, rowSpan }) => \`\${colSpan} × \${rowSpan}\`}
  />
  <p>{log}</p>
</>`,
    }),
  },
  {
    title: 'Persisted layout state',
    description:
      'state / onStateChange carry the serializable layout { version: 1, tiles: [{ key, order, colSpan, rowSpan }] }. Persist it from onLayoutChanged and hand it back through the ref’s applyState(), which validates untrusted input first.',
    source: reactDemoSource({
      react: ['useRef', 'useState'],
      use: {
        '@oge-ui/react-layout': ['OgeTileLayout', 'sanitizeOgeTileLayoutState'],
      },
      types: {
        '@oge-ui/react-layout': [
          'OgeTileLayoutHandle',
          'OgeTileLayoutItemData',
          'OgeTileLayoutState',
        ],
      },
      name: 'TileLayoutStateDemo',
      before: `const tiles: OgeTileLayoutItemData[] = [
  { key: 'revenue', title: 'Revenue', colSpan: 2 },
  { key: 'orders', title: 'Orders' },
  { key: 'visitors', title: 'Visitors' },
  { key: 'tickets', title: 'Open tickets', colSpan: 2 },
];

function parse(text: string): unknown {
  try {
    return sanitizeOgeTileLayoutState(JSON.parse(text));
  } catch {
    return null;
  }
}`,
      body: `const layout = useRef<OgeTileLayoutHandle>(null);
const [state, setState] = useState<OgeTileLayoutState | undefined>();
const [saved, setSaved] = useState('');`,
      jsx: `<>
  <OgeTileLayout
    ref={layout}
    items={tiles}
    columns={4}
    rowHeight={100}
    resizable
    state={state}
    onStateChange={setState}
    onLayoutChanged={(e) => setSaved(JSON.stringify(e.state))}
    ariaLabel="Persisted dashboard"
    renderContent={({ item }) => item.key}
  />
  <button type="button" onClick={() => layout.current?.applyState(parse(saved))}>
    Restore saved
  </button>
  <button type="button" onClick={() => setState(undefined)}>
    Reset
  </button>
  <pre>{saved}</pre>
</>`,
    }),
  },
  {
    title: 'Declarative tiles & templates',
    description:
      'React has one shape — the items array; renderHeader replaces the title and renderContent fills the body, the Angular ogeTileLayoutItemHeader / content slots. Controls in a header stay real buttons that never start a drag.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeTileLayout'] },
      types: { '@oge-ui/react-layout': ['OgeTileLayoutItemData'] },
      name: 'TileLayoutTemplatesDemo',
      before: `const tiles: OgeTileLayoutItemData[] = [
  { key: 'welcome', title: 'Welcome', colSpan: 2 },
  { key: 'notes', title: 'Notes' },
  { key: 'links', title: 'Links', colSpan: 3 },
];`,
      body: `const [notes, setNotes] = useState(3);`,
      jsx: `<OgeTileLayout
  items={tiles}
  columns={3}
  rowHeight="auto"
  ariaLabel="Team board"
  renderHeader={({ item }) =>
    item.key === 'notes' ? (
      <>
        Notes <button type="button" onClick={() => setNotes(notes + 1)}>Add</button>
      </>
    ) : (
      item.title
    )
  }
  renderContent={({ item }) =>
    item.key === 'notes' ? (
      <p>{notes} notes pinned</p>
    ) : item.key === 'links' ? (
      <a href="#declarative-tiles-templates">Team handbook</a>
    ) : (
      <p>Drag the headers or use Ctrl+Arrow keys to arrange the board.</p>
    )
  }
/>`,
    }),
  },
];
