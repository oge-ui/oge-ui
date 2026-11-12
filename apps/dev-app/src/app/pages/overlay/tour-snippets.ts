import { demoSource } from '../../shared/demo-source';

export const TOUR_BASIC_SNIPPET = demoSource({
  use: { '@oge-ui/overlay': ['OgeTour'] },
  types: { '@oge-ui/overlay': ['OgeTourClosedEvent', 'OgeTourStep'] },
  template: `<div class="toolbar">
  <input id="tour-search" type="search" aria-label="Search" />
  <button id="tour-filters" type="button">Filters</button>
  <button id="tour-export" type="button">Export</button>
</div>
<button type="button" (click)="tour.start()">Take the tour</button>
<oge-tour #tour [steps]="steps" (closed)="onClosed($event)" />
<p>{{ last() }}</p>`,
  body: `protected readonly last = signal('Not taken yet');
protected readonly steps: OgeTourStep[] = [
  {
    target: '#tour-search',
    title: 'Search everything',
    content: 'Type a customer, an invoice number or an amount.',
  },
  {
    target: '#tour-filters',
    title: 'Narrow it down',
    content: 'Filters keep their state when you come back.',
    placement: 'bottom-start',
  },
  {
    target: '#tour-export',
    title: 'Take the data with you',
    content: 'Export the current view to Excel or PDF.',
    placement: 'left',
  },
  // no target: the card is centered
  { title: 'You are all set', content: 'Reopen this tour any time from the Help menu.' },
];

protected onClosed(event: OgeTourClosedEvent): void {
  // store it to show the tour only once
  this.last.set(\`Closed by \${event.reason} on step \${event.step + 1}\`);
}`,
});

export const TOUR_CONTROLLED_SNIPPET = demoSource({
  use: { '@oge-ui/overlay': ['OgeTour'] },
  types: { '@oge-ui/overlay': ['OgeTourStep'] },
  template: `<!-- [(step)] and [(opened)] are two-way: resume where the user left off. -->
<button type="button" (click)="opened.set(true)">Resume the tour</button>
<oge-tour
  [steps]="steps"
  [(step)]="step"
  [(opened)]="opened"
  [closeOnBackdropClick]="true"
/>
<p>Step {{ step() + 1 }} of {{ steps.length }}</p>`,
  body: `protected readonly step = signal(0);
protected readonly opened = signal(false);
protected readonly steps: OgeTourStep[] = [
  { title: 'Welcome to OGE', content: 'A two-minute look at what is new.' },
  { title: 'Faster grids', content: 'Scrolling 100,000 rows now runs at 60 fps.' },
  { title: 'New components', content: 'Image viewer, command palette and this tour.' },
];`,
});
