import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React breadcrumb page. Pure data, no React imports —
 * the `llms.txt` generator and the compile gate load this module in plain Node.
 *
 * Section-for-section mirror of `../navigation/breadcrumb.ts`, per the parity
 * standard (`docs/REACT-PARITY.md`): the same five sections, in the same
 * order, with the same trail, translated to React idiom. Two differences are
 * idiom, not scope: React reserves the `key` prop so there is no
 * `<OgeBreadcrumbItem>` child (the `items` array is the whole API), and the
 * two `ng-template` slots arrive as the `renderItem` / `renderSeparator`
 * render props.
 */
export const NAVIGATION_BREADCRUMB_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Getting started',
    description:
      'One flat items trail. url crumbs are real links (middle-click and copy-address work; preventDefault() in onItemClick hands navigation to a router), the last crumb is never interactive and disabled crumbs stay visible but inert.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-navigation': ['OgeBreadcrumb'] },
      types: {
        '@oge-ui/react-navigation': [
          'OgeBreadcrumbItemData',
          'OgeBreadcrumbItemClickEvent',
        ],
      },
      name: 'BreadcrumbBasicsDemo',
      before: `// The APG breadcrumb: a nav landmark holding an ordered list of
// links, the current page carrying aria-current="page". The last crumb is
// never interactive — you are already there — and disabled crumbs stay
// visible but inert. No roving tabindex: the APG defines no keyboard
// behavior for a breadcrumb, so none is invented.
const trail: OgeBreadcrumbItemData[] = [
  { text: 'Home', key: 'home', url: '/', icon: 'M2 8 8 2l6 6M4 7v7h8V7' },
  { text: 'Products', key: 'products', url: '/products' },
  { text: 'Keyboards', key: 'keyboards', url: '/products/keyboards' },
  { text: 'Mechanical' },
];`,
      body: `const [last, setLast] = useState('—');

const go = (event: OgeBreadcrumbItemClickEvent) => {
  setLast(\`\${event.key ?? event.item.text} [\${event.index}]\`);
};`,
      jsx: `<>
  <OgeBreadcrumb items={trail} onItemClick={go} />
  <p className="mt-3 text-sm">
    Last click: <code>{last}</code>
  </p>
</>`,
    }),
  },
  {
    title: 'Declarative items',
    description:
      'Angular offers two APIs and merges declarative <oge-breadcrumb-item> children before the items input. React has one: the flat items array. A child component could not carry the identity anyway — React reserves the key prop — so a trail is data, and there is no merge order to remember.',
    source: reactDemoSource({
      use: { '@oge-ui/react-navigation': ['OgeBreadcrumb'] },
      types: { '@oge-ui/react-navigation': ['OgeBreadcrumbItemData'] },
      name: 'BreadcrumbItemsDemo',
      before: `// The Angular counterpart of this section lists
// <oge-breadcrumb-item> elements. React has no such child: \`key\` is
// reserved by React itself, so a crumb component could not carry the
// identity \`key\` means here. A trail is the items array — flat, never
// nested.
const trail: OgeBreadcrumbItemData[] = [
  { text: 'Home', key: 'home', url: '/' },
  { text: 'Reports', key: 'reports', url: '/reports' },
  { text: 'Q3 summary' },
];`,
      jsx: `<OgeBreadcrumb items={trail} />`,
    }),
  },
  {
    title: 'Collapse modes',
    description:
      "collapseMode 'auto' (default) collapses against the breadcrumb's own container; the ellipsis menu keeps the hidden crumbs reachable as real links. 'wrap' breaks onto rows and 'none' keeps one scrollable row.",
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-navigation': ['OgeBreadcrumb'] },
      types: { '@oge-ui/react-navigation': ['OgeBreadcrumbItemData'] },
      name: 'BreadcrumbCollapseDemo',
      before: `// collapseMode 'auto' (default) measures the breadcrumb's OWN
// container, never the window. When room runs out the OLDEST middle crumbs
// collapse first — first and last always stay visible — and unlike the
// references the collapsed crumbs remain reachable: the ellipsis opens
// them as real links. 'wrap' breaks onto rows, 'none' keeps one
// scrollable row.
const trail: OgeBreadcrumbItemData[] = [
  { text: 'Home', url: '/' },
  { text: 'Products', url: '/products' },
  { text: 'Peripherals', url: '/products/peripherals' },
  { text: 'Keyboards', url: '/products/keyboards' },
  { text: 'Mechanical' },
];`,
      body: `const [width, setWidth] = useState(640);`,
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
    <OgeBreadcrumb items={trail} collapseMode="auto" />
  </div>
</>`,
    }),
  },
  {
    title: 'Templates',
    description:
      "renderItem replaces the crumb's interior only — link/current/disabled semantics stay with the component. renderSeparator renders aria-hidden: a separator is decoration, never content. They are the React face of [ogeBreadcrumbItemTemplate] / [ogeBreadcrumbSeparatorTemplate].",
    source: reactDemoSource({
      use: { '@oge-ui/react-navigation': ['OgeBreadcrumb'] },
      types: { '@oge-ui/react-navigation': ['OgeBreadcrumbItemData'] },
      name: 'BreadcrumbTemplatesDemo',
      before: `// The item render prop replaces the crumb's interior only — the
// link/current/disabled element semantics stay with the component. The
// separator render prop is rendered aria-hidden: a separator is
// decoration. They are the React face of Angular's two ng-template slots.
const trail: OgeBreadcrumbItemData[] = [
  { text: 'Home', url: '/' },
  { text: 'Library', url: '/library' },
  { text: 'Data' },
];`,
      jsx: `<OgeBreadcrumb
  items={trail}
  renderItem={({ item, last }) => (
    <strong style={{ opacity: last ? 1 : 0.75 }}>{item.text}</strong>
  )}
  renderSeparator={() => '·'}
/>`,
    }),
  },
  {
    title: 'Configuration',
    description:
      'Subtree defaults for collapseMode plus every user-facing string — the nav landmark’s label and the ellipsis button’s label — via <OgeBreadcrumbConfigProvider>, overridable per instance with the messages prop.',
    source: reactDemoSource({
      use: {
        '@oge-ui/react-navigation': [
          'OgeBreadcrumb',
          'OgeBreadcrumbConfigProvider',
        ],
      },
      types: { '@oge-ui/react-navigation': ['OgeBreadcrumbItemData'] },
      name: 'BreadcrumbConfigDemo',
      before: `// Every user-facing string lives in the messages block — the nav
// landmark's label and the ellipsis button's label included. The context
// provider is the React shape of provideOgeBreadcrumbConfig().
const trail: OgeBreadcrumbItemData[] = [
  { text: 'Giriş', url: '/' },
  { text: 'Raporlar' },
];`,
      jsx: `<OgeBreadcrumbConfigProvider
  config={{
    collapseMode: 'auto',
    messages: {
      breadcrumb: 'İçerik haritası',
      collapsed: 'Gizli öğeleri göster',
    },
  }}
>
  <OgeBreadcrumb items={trail} />
</OgeBreadcrumbConfigProvider>`,
    }),
  },
];
