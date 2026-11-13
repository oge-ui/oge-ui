import type { ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/overlay/src/lib/notification-center/** and
 * packages/behavior/src/lib/overlay/notification-center-core.ts — keep in
 * sync with the source TSDoc when the public API changes.
 */

export const NOTIFICATION_FIELDS =
  '<code>id</code>, <code>title</code>, <code>body?</code>, <code>time</code> (a <code>Date</code>, an ISO string or epoch ms — shown as a relative time, “5 minutes ago”), <code>read?</code>, <code>group?</code> (the section with <code>grouping="group"</code>), <code>severity?</code> (<code>info</code>, <code>success</code>, <code>warning</code>, <code>danger</code>: the mark’s colour)';

export const NOTIFICATION_FEED =
  'The list is a WAI-ARIA <strong>feed</strong>: each notification an <code>article</code> named by its title and described by its body, with <code>aria-posinset</code> / <code>aria-setsize</code> (−1 while <code>hasMore</code>); Page Down / Page Up move between articles, Ctrl+End / Ctrl+Home leave the feed; <code>aria-busy</code> while loading. Unread titles start with a visually hidden “Unread”, the bell says how many are unread, and new unread notifications are announced politely. The panel is the suite’s popover: Escape and an outside click close it and focus returns to the bell.';

export const OGE_NOTIFICATION_CENTER_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'items',
          type: 'readonly OgeNotification[] (model)',
          default: '[]',
          description: `Two-way: the notifications, newest first whatever the order given. Marking read or dismissing writes a new array. Fields: ${NOTIFICATION_FIELDS}.`,
        },
        {
          name: 'opened',
          type: 'boolean (model)',
          default: 'false',
          description: 'Two-way: the panel is open.',
        },
        {
          name: 'grouping',
          type: "'day' | 'group' | 'none'",
          default: "'day'",
          description:
            'Sections: Today / Yesterday / Earlier, the items’ <code>group</code>, or one list.',
        },
        {
          name: 'filter',
          type: "'all' | 'unread' (model)",
          default: "'all'",
          description: 'Two-way: the panel’s All / Unread switch.',
        },
        {
          name: 'hasMore',
          type: 'boolean',
          default: 'false',
          description:
            'Older notifications exist: scrolling within 80 px of the end, the Load more button or Page Down onto the last article emits <code>loadMore</code>.',
        },
        {
          name: 'loading',
          type: 'boolean',
          default: 'false',
          description:
            'More are loading: the feed is <code>aria-busy</code> and no further <code>loadMore</code> fires.',
        },
        {
          name: 'width',
          type: 'number | string',
          default: '360',
          description: 'Panel width.',
        },
        {
          name: 'locale',
          type: 'string | undefined',
          description: 'Locale of the relative times (default the browser’s).',
        },
        {
          name: 'messages',
          type: 'Partial<OgeOverlayMessages>',
          description:
            'Per-instance overrides of the <code>notifications*</code> messages (see Overlay configuration).',
        },
      ],
    },
  ],
  methods: [
    {
      entries: [
        {
          name: 'markAllRead()',
          type: '() => void',
          description: 'Marks every notification read.',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'itemsChange / openedChange / filterChange',
          type: 'model halves',
          description:
            'The banana halves of <code>[(items)]</code>, <code>[(opened)]</code> and <code>[(filter)]</code>.',
        },
        {
          name: 'loadMore',
          type: 'void',
          description:
            'Append older notifications to <code>items</code> (and clear <code>hasMore</code> at the end).',
        },
        {
          name: 'readChange',
          type: '{ item: OgeNotification; read: boolean }',
          description:
            'One notification was marked read or unread — tell the server.',
        },
        {
          name: 'dismissed',
          type: 'OgeNotification',
          description:
            'One notification was dismissed (it is already out of <code>items</code>).',
        },
      ],
    },
  ],
  types: [
    {
      title: 'Feed and announcements',
      entries: [
        {
          name: 'Keyboard and screen readers',
          type: 'role="feed"',
          description: NOTIFICATION_FEED,
        },
      ],
    },
    {
      title: 'Vocabulary',
      entries: [
        {
          name: 'OgeNotification',
          type: 'interface',
          description: `One notification: ${NOTIFICATION_FIELDS}.`,
        },
        {
          name: 'OgeNotificationGrouping',
          type: "'day' | 'group' | 'none'",
          description: 'How the list is sectioned.',
        },
        {
          name: 'OgeNotificationFilter',
          type: "'all' | 'unread'",
          description: 'Which items the list shows.',
        },
      ],
    },
    {
      title: 'Behavior building blocks (@oge-ui/behavior)',
      entries: [
        {
          name: 'ogeNotificationSections / OgeNotificationSection / OgeNotificationSectionOptions',
          type: '(items, { grouping?, filter?, now?, labels? }) => OgeNotificationSection[]',
          description: 'The sections, newest first.',
        },
        {
          name: 'ogeUnreadCount / ogeMarkNotifications / ogeNotificationTime',
          type: 'helpers',
          description:
            'Count unread; mark all or some read / unread (a new array); a notification’s time as epoch ms.',
        },
        {
          name: 'ogeRelativeTime / ogeShouldLoadMore / ogeFeedKeyIntent',
          type: 'helpers',
          description:
            '“5 minutes ago” in the locale (<code>Intl.RelativeTimeFormat</code>); whether a scrolled list is near its end; the feed keys.',
        },
      ],
    },
  ],
};
