import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React diff viewer page. Pure data, no React imports —
 * the `llms.txt` generator and the compile gate load this module in plain
 * Node. Section-for-section mirror of `../layout/diff-viewer.ts`.
 */
export const LAYOUT_DIFF_VIEWER_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Text',
    description:
      'Changed words are highlighted inside changed lines; unchanged runs fold to context lines around each change. mode / onModeChange switch the layout.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeDiffViewer'] },
      name: 'DiffTextDemo',
      before: `const before = 'server:\\n  port: 8080\\n  workers: 4\\nlogging:\\n  level: info';
const after = 'server:\\n  port: 8443\\n  workers: 8\\n  tls: true\\nlogging:\\n  level: warn';`,
      body: `const [mode, setMode] = useState<'split' | 'inline'>('split');`,
      jsx: `<OgeDiffViewer
  oldValue={before}
  newValue={after}
  context={1}
  mode={mode}
  onModeChange={setMode}
/>`,
    }),
  },
  {
    title: 'JSON',
    description:
      'JSON text or values, compared as canonical key-sorted text: the key order is not a change. The ref handle’s diff().changes lists the changed paths.',
    source: reactDemoSource({
      react: ['useEffect', 'useRef', 'useState'],
      use: { '@oge-ui/react-layout': ['OgeDiffViewer'] },
      types: {
        '@oge-ui/react-layout': ['OgeDiffViewerHandle', 'OgeJsonChange'],
      },
      name: 'DiffJsonDemo',
      before: `const before = '{"sku": "SKU-2041", "price": 39.9, "tags": ["lighting"]}';
const after = { price: 34.9, sku: 'SKU-2041', tags: ['lighting', 'sale'] };`,
      body: `const viewer = useRef<OgeDiffViewerHandle>(null);
const [changes, setChanges] = useState<readonly OgeJsonChange[]>([]);
useEffect(() => setChanges(viewer.current?.diff().changes ?? []), []);`,
      jsx: `<>
  <OgeDiffViewer ref={viewer} language="json" oldValue={before} newValue={after} defaultMode="inline" />
  <ul>
    {changes.map((c) => (
      <li key={c.path}>
        {c.kind} {c.path}
      </li>
    ))}
  </ul>
</>`,
    }),
  },
];
