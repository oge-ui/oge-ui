import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React timeline page. Pure data, no React imports — the
 * `llms.txt` generator and the compile gate load this module in plain Node.
 *
 * Section-for-section mirror of `../layout/timeline.ts` (`docs/REACT-PARITY.md`):
 * same five sections, same order, same example content; the Angular template
 * slots arrive as the `renderContent` / `renderMarker` / `renderOpposite`
 * render props.
 */
const ORDER_ITEMS = `const order: OgeTimelineItem[] = [
  {
    key: 'placed',
    title: 'Order placed',
    description: 'Payment confirmed by card ending 4242.',
    time: new Date(2026, 2, 14, 9, 30),
    severity: 'success',
  },
  {
    key: 'packed',
    title: 'Packed',
    description: 'Two parcels, 3.4 kg.',
    time: new Date(2026, 2, 14, 16, 5),
  },
  {
    key: 'shipped',
    title: 'Shipped',
    description: 'Handed to the carrier in Istanbul.',
    time: new Date(2026, 2, 15, 8, 0),
  },
  {
    key: 'delivered',
    title: 'Delivery expected',
    time: 'Tomorrow, 10:00–14:00',
    variant: 'outlined',
    severity: 'neutral',
  },
];`;

export const LAYOUT_TIMELINE_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Vertical timeline',
    description:
      'The default: content on the end side of a vertical axis. A Date time is formatted in the runtime locale (medium date + short time, or dateFormat) and written into <time dateTime> from its local fields; a string time is shown verbatim.',
    source: reactDemoSource({
      use: { '@oge-ui/react-layout': ['OgeTimeline'] },
      types: { '@oge-ui/react-layout': ['OgeTimelineItem'] },
      name: 'TimelineVerticalDemo',
      before: ORDER_ITEMS,
      jsx: `<OgeTimeline items={order} ariaLabel="Order history" />`,
    }),
  },
  {
    title: 'Alignment & alternating',
    description:
      'start / end keep one side (logical, so RTL mirrors); alternate swaps per entry starting at the end side, alternate-reverse at the start side, and each entry’s time — or its opposite text — moves to the other side of the axis.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-layout': ['OgeTimeline'] },
      types: {
        '@oge-ui/react-layout': ['OgeTimelineAlign', 'OgeTimelineItem'],
      },
      name: 'TimelineAlignDemo',
      before: ORDER_ITEMS,
      body: `const [align, setAlign] = useState<OgeTimelineAlign>('alternate');`,
      jsx: `<>
  <label>
    Align
    <select
      value={align}
      onChange={(event) => setAlign(event.target.value as OgeTimelineAlign)}
    >
      <option value="end">end</option>
      <option value="start">start</option>
      <option value="alternate">alternate</option>
      <option value="alternate-reverse">alternate-reverse</option>
    </select>
  </label>
  <OgeTimeline items={order} align={align} ariaLabel="Order history, aligned" />
</>`,
    }),
  },
  {
    title: 'Horizontal timeline',
    description:
      'The entries share a row with the connector between the markers; alternating puts the opposite text above and the content below. When the row does not fit, the list scrolls inline instead of widening the page.',
    source: reactDemoSource({
      use: { '@oge-ui/react-layout': ['OgeTimeline'] },
      types: { '@oge-ui/react-layout': ['OgeTimelineItem'] },
      name: 'TimelineHorizontalDemo',
      before: `const releases: OgeTimelineItem[] = [
  { title: '1.0', description: 'Data grid', opposite: 'Jan 2026' },
  { title: '1.1', description: 'React layer', opposite: 'Jun 2026' },
  { title: '1.2', description: 'Feedback components', opposite: 'Oct 2026' },
  { title: '1.3', description: 'Planned', opposite: 'Q1 2027', variant: 'outlined' },
];`,
      jsx: `<OgeTimeline
  orientation="horizontal"
  align="alternate"
  items={releases}
  ariaLabel="Release history"
/>`,
    }),
  },
  {
    title: 'Markers, icons & severities',
    description:
      "severity colours the marker with the suite vocabulary, variant: 'outlined' draws a ring for pending or future entries, and icon (SVG path data) draws a larger marker with the glyph inside. Markers are decoration — the text carries the meaning.",
    source: reactDemoSource({
      use: { '@oge-ui/react-layout': ['OgeTimeline'] },
      types: { '@oge-ui/react-layout': ['OgeTimelineItem'] },
      name: 'TimelineMarkersDemo',
      before: `const deploys: OgeTimelineItem[] = [
  { title: 'Build passed', time: '09:12', severity: 'success', icon: 'M20 6 9 17l-5-5' },
  { title: 'Canary at 5 %', time: '09:20', severity: 'accent', icon: 'M4 22V4m0 0h13l-2 4 2 4H4' },
  { title: 'Error rate above budget', time: '09:41', severity: 'warning', icon: 'M12 9v4m0 3.5h.01' },
  { title: 'Rolled back', time: '09:43', severity: 'danger', icon: 'M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5' },
  { title: 'Retry scheduled', time: '14:00', severity: 'neutral', variant: 'outlined' },
];`,
      jsx: `<OgeTimeline items={deploys} ariaLabel="Deployments" />`,
    }),
  },
  {
    title: 'Custom templates',
    description:
      'Render props replace the content, the marker or the opposite text per entry, with the item, its index, its side and first/last flags in the context. Content is ordinary flow content: the link stays in the Tab order.',
    source: reactDemoSource({
      use: { '@oge-ui/react-layout': ['OgeTimeline'] },
      types: { '@oge-ui/react-layout': ['OgeTimelineItem'] },
      name: 'TimelineTemplatesDemo',
      before: `const steps: OgeTimelineItem[] = [
  { title: 'Create a workspace', description: 'Name it and invite your team.' },
  { title: 'Connect a data source', description: 'REST, OData or a plain array.' },
  { title: 'Publish a dashboard', description: 'Share a read-only link.' },
];`,
      jsx: `<OgeTimeline
  items={steps}
  ariaLabel="Onboarding"
  renderMarker={({ index }) => <span className="step-number">{index + 1}</span>}
  renderContent={({ item }) => (
    <>
      <strong>{item.title}</strong>
      <span>{item.description}</span>
      <a href="#timeline-help">Learn more</a>
    </>
  )}
/>`,
    }),
  },
];
