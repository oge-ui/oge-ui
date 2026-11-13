import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useState, type ReactNode } from 'react';
import {
  OgeNotificationCenter,
  type OgeNotification,
} from '@oge-ui/react-overlay';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import {
  notificationDemoFirstPage,
  notificationDemoOlderPage,
} from '../overlay/notification-center-demo-data';
import { OVERLAY_NOTIFICATION_CENTER_DEMOS } from './notification-center-snippets';

/** TOC of the React view — the same sections as the Angular page. */
export const REACT_OVERLAY_NOTIFICATION_CENTER_SECTIONS = [
  'Notification center',
] as const;

const BUTTON =
  'rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700';

let arrived = 0;

function NotificationDemo(): ReactNode {
  const [items, setItems] = useState<readonly OgeNotification[]>(() =>
    notificationDemoFirstPage(),
  );
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [last, setLast] = useState('');
  const loadOlder = () => {
    setLoading(true);
    setTimeout(() => {
      setItems((current) => [...current, ...notificationDemoOlderPage(page)]);
      setPage((p) => p + 1);
      setLoading(false);
    }, 300);
  };
  return createElement(
    'div',
    { className: 'flex items-center gap-3' },
    createElement(OgeNotificationCenter, {
      key: 'center',
      items,
      onItemsChange: setItems,
      hasMore: page < 3,
      loading,
      onLoadMore: loadOlder,
      onReadChange: (e) =>
        setLast(`${e.item.title}${e.read ? ': read' : ': unread'}`),
      onDismissed: (item) => setLast(`${item.title}: dismissed`),
    }),
    createElement(
      'button',
      {
        key: 'simulate',
        type: 'button',
        className: BUTTON,
        'data-testid': 'simulate',
        onClick: () => {
          arrived++;
          setItems((current) => [
            {
              id: `new-${arrived}`,
              title: `New order #${2000 + arrived} received`,
              time: Date.now(),
            },
            ...current,
          ]);
        },
      },
      'Simulate a new notification',
    ),
    createElement(
      'span',
      { key: 'last', className: 'text-sm', 'data-testid': 'last-action' },
      last,
    ),
  );
}

/**
 * The React half of the notification center page — rendered inside
 * `/components/overlay/notification-center` when the reader has chosen React
 * (ADR 0002).
 */
@Component({
  selector: 'app-react-overlay-notification-center-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // the popover and the panel's stylesheets the React component needs
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../../../../../../packages/overlay/src/lib/popover/popover.scss',
    '../../../../../../packages/overlay/src/lib/notification-center/notification-center.scss',
  ],
  template: `
    <app-demo-card
      [chips]="['items', 'hasMore', 'onLoadMore', 'onReadChange']"
      heading="Notification center"
      description="Open the bell: three unread notifications today, two read ones yesterday, and three more pages of older reports that load as you scroll (or press Page Down onto the last item). “Simulate a new notification” adds one, announced and counted on the bell."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="demo" />
    </app-demo-card>
  `,
})
export class ReactOverlayNotificationCenterDemos {
  protected readonly demos = OVERLAY_NOTIFICATION_CENTER_DEMOS;
  protected readonly demo = () => createElement(NotificationDemo);
}
