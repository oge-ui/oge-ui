import {
  ogeFeedKeyIntent,
  ogeMarkNotifications,
  ogeNotificationSections,
  ogeNotificationTime,
  ogeRelativeTime,
  ogeShouldLoadMore,
  ogeUnreadCount,
  type OgeNotification,
} from './notification-center-core';

const NOW = new Date(2026, 10, 12, 15, 0, 0);
const at = (days: number, hours = 0) =>
  new Date(NOW.getTime() - days * 86_400_000 - hours * 3_600_000);

const ITEMS: OgeNotification[] = [
  {
    id: 'a',
    title: 'Build passed',
    time: at(0, 1),
    group: 'CI',
    severity: 'success',
  },
  {
    id: 'b',
    title: 'Invoice paid',
    time: at(1).toISOString(),
    read: true,
    group: 'Billing',
  },
  { id: 'c', title: 'New comment', time: at(0, 3).getTime(), group: 'CI' },
  { id: 'd', title: 'Quota at 90%', time: at(9), severity: 'warning' },
];

describe('notification center core', () => {
  it('sections by day, newest first, and filters to unread', () => {
    const sections = ogeNotificationSections(ITEMS, { now: NOW });
    expect(sections.map((s) => [s.title, s.items.map((i) => i.id)])).toEqual([
      ['Today', ['a', 'c']],
      ['Yesterday', ['b']],
      ['Earlier', ['d']],
    ]);
    const unread = ogeNotificationSections(ITEMS, {
      now: NOW,
      filter: 'unread',
      labels: { today: 'Bugün', yesterday: 'Dün', earlier: 'Önce' },
    });
    expect(unread.map((s) => s.title)).toEqual(['Bugün', 'Önce']);
  });

  it('sections by group, or not at all', () => {
    expect(
      ogeNotificationSections(ITEMS, { grouping: 'group' }).map((s) => [
        s.title,
        s.items.length,
      ]),
    ).toEqual([
      ['CI', 2],
      ['Billing', 1],
      ['', 1],
    ]);
    expect(
      ogeNotificationSections(ITEMS, { grouping: 'none' })[0].items,
    ).toHaveLength(4);
    expect(ogeNotificationSections([], { grouping: 'none' })).toEqual([]);
    // an unreadable time sorts last instead of throwing
    expect(
      ogeNotificationSections(
        [{ id: 'x', title: 'x', time: 'not a date' }, ITEMS[0]],
        {
          grouping: 'none',
        },
      )[0].items.map((i) => i.id),
    ).toEqual(['a', 'x']);
  });

  it('counts unread items and marks them', () => {
    expect(ogeUnreadCount(ITEMS)).toBe(3);
    const all = ogeMarkNotifications(ITEMS, true);
    expect(ogeUnreadCount(all)).toBe(0);
    expect(all[1]).toBe(ITEMS[1]); // already read: the same object
    const one = ogeMarkNotifications(ITEMS, false, ['b']);
    expect(one.find((i) => i.id === 'b')?.read).toBe(false);
    expect(ogeUnreadCount(one)).toBe(4);
  });

  it('tells relative times in the locale', () => {
    const now = NOW.getTime();
    expect(ogeRelativeTime(now - 5 * 60_000, now, 'en')).toBe('5 minutes ago');
    expect(ogeRelativeTime(now - 86_400_000, now, 'en')).toBe('yesterday');
    expect(ogeRelativeTime(now + 2 * 3_600_000, now, 'en')).toBe('in 2 hours');
    expect(ogeRelativeTime(now - 1000, now, 'en')).toBe('now');
    expect(ogeRelativeTime(now - 400 * 86_400_000, now, 'tr')).toBe(
      'geçen yıl',
    );
    expect(ogeRelativeTime(Number.NaN, now)).toBe('');
    expect(ogeNotificationTime({ time: '2026-11-12T00:00:00Z' })).toBe(
      Date.UTC(2026, 10, 12),
    );
  });

  it('asks for more near the end of the list', () => {
    expect(
      ogeShouldLoadMore({
        scrollTop: 900,
        clientHeight: 100,
        scrollHeight: 1050,
      }),
    ).toBe(true);
    expect(
      ogeShouldLoadMore({
        scrollTop: 0,
        clientHeight: 100,
        scrollHeight: 1050,
      }),
    ).toBe(false);
    expect(
      ogeShouldLoadMore(
        { scrollTop: 0, clientHeight: 100, scrollHeight: 300 },
        250,
      ),
    ).toBe(true);
  });

  it('maps the feed keys', () => {
    const key = (k: string, ctrl = false) => ({
      key: k,
      ctrlKey: ctrl,
      metaKey: false,
    });
    expect(ogeFeedKeyIntent(key('PageDown'), 1, 3)).toEqual({
      kind: 'focus',
      index: 2,
    });
    expect(ogeFeedKeyIntent(key('PageDown'), 2, 3)).toEqual({
      kind: 'focus',
      index: 2,
    });
    expect(ogeFeedKeyIntent(key('PageUp'), 0, 3)).toEqual({
      kind: 'focus',
      index: 0,
    });
    expect(ogeFeedKeyIntent(key('End', true), 0, 3)).toEqual({
      kind: 'exit',
      where: 'after',
    });
    expect(ogeFeedKeyIntent(key('Home', true), 0, 3)).toEqual({
      kind: 'exit',
      where: 'before',
    });
    expect(ogeFeedKeyIntent(key('Home'), 0, 3)).toBeNull();
    expect(ogeFeedKeyIntent(key('PageDown'), 0, 0)).toBeNull();
    expect(ogeFeedKeyIntent(key('x'), 0, 3)).toBeNull();
  });
});
