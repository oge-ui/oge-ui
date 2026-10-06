import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React load panel page. Pure data, no React imports —
 * the `llms.txt` generator and the compile gate load this module in plain
 * Node.
 *
 * Section-for-section mirror of `../layout/load-panel.ts` (same four
 * sections, same order, same example content; `onShown` / `onHidden` for the
 * `(shown)` / `(hidden)` outputs, a ref or selector for `target`).
 */
export const LAYOUT_LOAD_PANEL_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Covering a container',
    description:
      'Placed inside a container, the panel covers that parent (a statically positioned parent is made position: relative while shown). The parent is aria-busy for exactly as long as the panel is up, the message is announced through the shared live region, and clicks on the shade never reach the buttons underneath.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeLoadPanel'] },
      name: 'LoadPanelContainerDemo',
      body: `const [loading, setLoading] = useState(false);

const reload = () => {
  setLoading(true);
  setTimeout(() => setLoading(false), 2000);
};`,
      jsx: `<section className="orders">
  {/* covers its own parent; aria-busy + one announcement while shown */}
  <OgeLoadPanel visible={loading} />
  <h3>Orders</h3>
  <button type="button" onClick={reload}>
    Reload
  </button>
</section>`,
    }),
  },
  {
    title: 'Delay & minimum time',
    description:
      'showDelay (300 ms here) keeps a fast load from flashing a panel at all; minDisplayTime (800 ms) keeps a panel that did appear on screen long enough to read. onShown and onHidden report what actually painted — the fast load fires neither.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeLoadPanel'] },
      name: 'LoadPanelTimingDemo',
      body: `const [loading, setLoading] = useState(false);
const [events, setEvents] = useState<string[]>([]);

const load = (ms: number) => {
  setEvents([]);
  setLoading(true);
  setTimeout(() => setLoading(false), ms);
};`,
      jsx: `<section>
  <OgeLoadPanel
    visible={loading}
    showDelay={300}
    minDisplayTime={800}
    onShown={() => setEvents((e) => [...e, 'shown'])}
    onHidden={() => setEvents((e) => [...e, 'hidden'])}
  />
  <button type="button" onClick={() => load(100)}>
    Fast load (100 ms)
  </button>
  <button type="button" onClick={() => load(1500)}>
    Slow load (1.5 s)
  </button>
  <p>Events: {events.join(' ') || 'none'}</p>
</section>`,
    }),
  },
  {
    title: 'Target & full screen',
    description:
      'target takes an element, a ref or a selector anywhere on the page — the panel is portalled into it while shown. fullScreen covers the viewport (fixed, above everything); without a target it marks nothing busy, because aria-busy on the body would also mute the live region its own message goes to.',
    source: reactDemoSource({
      react: ['useRef', 'useState'],
      use: { '@oge-ui/react-layout': ['OgeLoadPanel'] },
      name: 'LoadPanelTargetDemo',
      body: `const chart = useRef<HTMLDivElement>(null);
const [chartLoading, setChartLoading] = useState(false);
const [saving, setSaving] = useState(false);`,
      jsx: `<>
  <div ref={chart}>Chart area (the panel's target)</div>
  <OgeLoadPanel target={chart} visible={chartLoading} message="Rendering chart…" />
  <OgeLoadPanel fullScreen visible={saving} message="Saving the report…" />
  <button type="button" onClick={() => setChartLoading(!chartLoading)}>
    Render chart
  </button>
  <button type="button" onClick={() => setSaving(!saving)}>
    Save report (full screen)
  </button>
</>`,
    }),
  },
  {
    title: 'Appearance',
    description:
      'showPane: false drops the raised card, shading: false the dim layer, and position moves the pane to the top or bottom. Without the indicator the message itself is the readable text. The default message is the localized loadPanelMessage of the load-indicator config.',
    source: reactDemoSource({
      use: { '@oge-ui/react-layout': ['OgeLoadPanel'] },
      name: 'LoadPanelAppearanceDemo',
      jsx: `<>
  <section>
    <OgeLoadPanel visible showPane={false} shading={false} position="top" message="Refreshing…" />
    <p>Plain, unshaded, top</p>
  </section>
  <section>
    <OgeLoadPanel visible showIndicator={false} message="Waiting for the server…" />
    <p>Message only</p>
  </section>
</>`,
    }),
  },
];
