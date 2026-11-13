import type { OgeNotification } from '@oge-ui/overlay';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** The first page of the demo's notifications, times relative to now. */
export function notificationDemoFirstPage(now = Date.now()): OgeNotification[] {
  return [
    {
      id: 'n1',
      title: 'Build passed',
      body: 'main is green after 14 checks.',
      time: now - 2 * MINUTE,
      severity: 'success',
      group: 'Builds',
    },
    {
      id: 'n2',
      title: 'Ada commented on “Q4 forecast”',
      body: '“Can we split the totals by region?”',
      time: now - 40 * MINUTE,
      group: 'Comments',
    },
    {
      id: 'n3',
      title: 'Storage at 90%',
      body: 'Free up space or upgrade the plan.',
      time: now - 5 * HOUR,
      severity: 'warning',
      group: 'Account',
    },
    {
      id: 'n4',
      title: 'Invoice #1042 paid',
      time: now - 1 * DAY - 2 * HOUR,
      read: true,
      group: 'Billing',
    },
    {
      id: 'n5',
      title: 'Deploy to staging failed',
      body: 'The migration step timed out.',
      time: now - 1 * DAY - 6 * HOUR,
      severity: 'danger',
      read: true,
      group: 'Builds',
    },
  ];
}

/** Older notifications, a page at a time (three pages, then the end). */
export function notificationDemoOlderPage(
  page: number,
  now = Date.now(),
): OgeNotification[] {
  return Array.from({ length: 5 }, (_, i) => {
    const n = page * 5 + i;
    return {
      id: `old-${n}`,
      title: `Weekly report #${40 - n} is ready`,
      body: 'Sales, stock and cash flow for the week.',
      time: now - (3 + n) * DAY,
      read: true,
      group: 'Reports',
    };
  });
}
