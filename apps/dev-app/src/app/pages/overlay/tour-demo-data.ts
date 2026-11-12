import type { OgeTourStep } from '@oge-ui/overlay';

/** The guided tour over the demo toolbar (both render layers). */
export const TOUR_STEPS: OgeTourStep[] = [
  {
    target: '#tour-demo-search',
    title: 'Search everything',
    content: 'Type a customer, an invoice number or an amount.',
  },
  {
    target: '#tour-demo-filters',
    title: 'Narrow it down',
    content: 'Filters keep their state when you come back.',
    placement: 'bottom-start',
  },
  {
    target: '#tour-demo-export',
    title: 'Take the data with you',
    content: 'Export the current view to Excel or PDF.',
    placement: 'left',
  },
  {
    title: 'You are all set',
    content: 'Reopen this tour any time from the Help menu.',
  },
];

/** A tour without targets: every card is centered. */
export const TOUR_WELCOME_STEPS: OgeTourStep[] = [
  { title: 'Welcome to OGE', content: 'A two-minute look at what is new.' },
  {
    title: 'Faster grids',
    content: 'Scrolling 100,000 rows now runs at 60 fps.',
  },
  {
    title: 'New components',
    content: 'Image viewer, command palette and this tour.',
  },
];
