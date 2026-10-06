import { demoSource } from '../../shared/demo-source';

const ORDER_ITEMS = `protected readonly order: OgeTimelineItem[] = [
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

export const VERTICAL_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeTimeline'] },
  types: { '@oge-ui/layout': ['OgeTimelineItem'] },
  template: `<!-- An ordered list: screen readers announce "list, 4 items" and each
     position. Date times are formatted in the app locale and written into
     <time datetime>; a string time is shown verbatim. -->
<oge-timeline [items]="order" ariaLabel="Order history" />`,
  body: ORDER_ITEMS,
});

export const ALIGN_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeTimeline'] },
  types: { '@oge-ui/layout': ['OgeTimelineAlign', 'OgeTimelineItem'] },
  template: `<!-- start / end keep one side (logical, so RTL mirrors);
     alternate swaps per entry and moves each time — or the entry's
     opposite text — to the other side of the axis. -->
<oge-timeline [items]="order" [align]="align()" ariaLabel="Order history" />

<label>
  Align
  <select (change)="align.set($any($event.target).value)">
    <option value="end">end</option>
    <option value="start">start</option>
    <option value="alternate" selected>alternate</option>
    <option value="alternate-reverse">alternate-reverse</option>
  </select>
</label>`,
  body: `protected readonly align = signal<OgeTimelineAlign>('alternate');
${ORDER_ITEMS}`,
});

export const HORIZONTAL_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeTimeline'] },
  types: { '@oge-ui/layout': ['OgeTimelineItem'] },
  template: `<!-- The entries share a row and the list scrolls inline when they do
     not fit, instead of widening the page on a phone. -->
<oge-timeline
  orientation="horizontal"
  align="alternate"
  [items]="releases"
  ariaLabel="Release history"
/>`,
  body: `protected readonly releases: OgeTimelineItem[] = [
  { title: '1.0', description: 'Data grid', opposite: 'Jan 2026' },
  { title: '1.1', description: 'React layer', opposite: 'Jun 2026' },
  { title: '1.2', description: 'Feedback components', opposite: 'Oct 2026' },
  { title: '1.3', description: 'Planned', opposite: 'Q1 2027', variant: 'outlined' },
];`,
});

export const MARKERS_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeTimeline'] },
  types: { '@oge-ui/layout': ['OgeTimelineItem'] },
  template: `<!-- severity colours the marker, variant="outlined" draws a ring
     (pending / future entries), icon (SVG path data) draws a larger marker
     with the glyph inside. Markers are aria-hidden decoration, so the
     meaning must also be in the text. -->
<oge-timeline [items]="deploys" ariaLabel="Deployments" />`,
  body: `protected readonly deploys: OgeTimelineItem[] = [
  { title: 'Build passed', time: '09:12', severity: 'success', icon: 'M20 6 9 17l-5-5' },
  { title: 'Canary at 5 %', time: '09:20', severity: 'accent', icon: 'M4 22V4m0 0h13l-2 4 2 4H4' },
  { title: 'Error rate above budget', time: '09:41', severity: 'warning', icon: 'M12 9v4m0 3.5h.01' },
  { title: 'Rolled back', time: '09:43', severity: 'danger', icon: 'M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5' },
  { title: 'Retry scheduled', time: '14:00', severity: 'neutral', variant: 'outlined' },
];`,
});

export const TEMPLATES_SNIPPET = demoSource({
  use: {
    '@oge-ui/layout': [
      'OgeTimeline',
      'OgeTimelineContentTemplate',
      'OgeTimelineMarkerTemplate',
    ],
  },
  types: { '@oge-ui/layout': ['OgeTimelineItem'] },
  template: `<!-- Templates replace the content and the marker per entry. Content
     is ordinary flow content — the link stays in the Tab order (the
     timeline adds no keyboard model). -->
<oge-timeline [items]="steps" ariaLabel="Onboarding">
  <ng-template ogeTimelineMarkerTemplate let-index="index">
    <span class="step-number">{{ index + 1 }}</span>
  </ng-template>
  <ng-template ogeTimelineContentTemplate let-item>
    <strong>{{ item.title }}</strong>
    <span>{{ item.description }}</span>
    <a href="#timeline-help">Learn more</a>
  </ng-template>
</oge-timeline>`,
  body: `protected readonly steps: OgeTimelineItem[] = [
  { title: 'Create a workspace', description: 'Name it and invite your team.' },
  { title: 'Connect a data source', description: 'REST, OData or a plain array.' },
  { title: 'Publish a dashboard', description: 'Share a read-only link.' },
];`,
});
