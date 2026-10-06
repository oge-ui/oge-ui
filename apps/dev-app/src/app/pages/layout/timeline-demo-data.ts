import type { OgeTimelineItem } from '@oge-ui/layout/timeline';

/** Demo data of the timeline page, shared by the Angular and React views. */
export const TIMELINE_ORDER: readonly OgeTimelineItem[] = [
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
];

export const TIMELINE_RELEASES: readonly OgeTimelineItem[] = [
  { title: '1.0', description: 'Data grid', opposite: 'Jan 2026' },
  { title: '1.1', description: 'React layer', opposite: 'Jun 2026' },
  { title: '1.2', description: 'Feedback components', opposite: 'Oct 2026' },
  {
    title: '1.3',
    description: 'Planned',
    opposite: 'Q1 2027',
    variant: 'outlined',
  },
];

export const TIMELINE_DEPLOYS: readonly OgeTimelineItem[] = [
  {
    title: 'Build passed',
    time: '09:12',
    severity: 'success',
    icon: 'M20 6 9 17l-5-5',
  },
  {
    title: 'Canary at 5 %',
    time: '09:20',
    severity: 'accent',
    icon: 'M4 22V4m0 0h13l-2 4 2 4H4',
  },
  {
    title: 'Error rate above budget',
    time: '09:41',
    severity: 'warning',
    icon: 'M12 9v4m0 3.5h.01',
  },
  {
    title: 'Rolled back',
    time: '09:43',
    severity: 'danger',
    icon: 'M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5',
  },
  {
    title: 'Retry scheduled',
    time: '14:00',
    severity: 'neutral',
    variant: 'outlined',
  },
];

export const TIMELINE_STEPS: readonly OgeTimelineItem[] = [
  { title: 'Create a workspace', description: 'Name it and invite your team.' },
  {
    title: 'Connect a data source',
    description: 'REST, OData or a plain array.',
  },
  { title: 'Publish a dashboard', description: 'Share a read-only link.' },
];
