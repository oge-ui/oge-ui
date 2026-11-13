import type { ApiSections } from '../../shared/api-reference';
import {
  NOTIFICATION_FEED,
  NOTIFICATION_FIELDS,
  OGE_NOTIFICATION_CENTER_API,
} from '../overlay/notification-center-api-data';

/**
 * Hand-compiled from packages/react/overlay/src/lib/notification-center.tsx —
 * keep in sync with the source TSDoc when the public API changes.
 *
 * Block-for-block mirror of `../overlay/notification-center-api-data.ts`: the
 * two-way models become controlled props with `onXChange` callbacks (and
 * `defaultX`), the outputs `onX` callbacks, the method a ref handle.
 */
export const OGE_REACT_NOTIFICATION_CENTER_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'items',
          type: 'readonly OgeNotification[] | undefined',
          default: '[]',
          description: `The notifications (controlled with <code>onItemsChange</code>; <code>defaultItems</code> when uncontrolled), newest first whatever the order given. Fields: ${NOTIFICATION_FIELDS}.`,
        },
        {
          name: 'opened',
          type: 'boolean | undefined',
          default: 'false',
          description:
            'The panel is open (controlled; <code>defaultOpened</code> when uncontrolled).',
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
          type: "'all' | 'unread' | undefined",
          default: "'all'",
          description:
            'The All / Unread switch (controlled; <code>defaultFilter</code> when uncontrolled).',
        },
        {
          name: 'hasMore',
          type: 'boolean',
          default: 'false',
          description:
            'Older notifications exist: scrolling within 80 px of the end, the Load more button or Page Down onto the last article calls <code>onLoadMore</code>.',
        },
        {
          name: 'loading',
          type: 'boolean',
          default: 'false',
          description:
            'More are loading: the feed is <code>aria-busy</code> and no further <code>onLoadMore</code> fires.',
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
        {
          name: 'className / style',
          type: 'string / CSSProperties',
          description:
            'Added to the root <code>.oge-notification-center</code>.',
        },
      ],
    },
  ],
  methods: [
    {
      title: 'Ref handle (OgeNotificationCenterHandle)',
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
          name: 'onItemsChange / onOpenedChange / onFilterChange',
          type: 'callbacks',
          description:
            'The controlled halves of <code>items</code>, <code>opened</code> and <code>filter</code>.',
        },
        {
          name: 'onLoadMore',
          type: '() => void',
          description:
            'Add older notifications to <code>items</code> (and clear <code>hasMore</code> at the end).',
        },
        {
          name: 'onReadChange',
          type: '(event: { item: OgeNotification; read: boolean }) => void',
          description:
            'One notification was marked read or unread — tell the server.',
        },
        {
          name: 'onDismissed',
          type: '(item: OgeNotification) => void',
          description: 'One notification was dismissed.',
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
          name: 'OgeNotificationCenterProps',
          type: 'interface',
          description: 'The props above.',
        },
        {
          name: 'OgeNotificationCenterHandle',
          type: '{ markAllRead() }',
          description: 'What a <code>ref</code> reaches.',
        },
        ...(OGE_NOTIFICATION_CENTER_API.types?.[1]?.entries ?? []),
      ],
    },
  ],
};
