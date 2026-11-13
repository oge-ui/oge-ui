'use client';

import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactElement,
} from 'react';
import {
  ogeFeedKeyIntent,
  ogeFormatMessage,
  ogeMarkNotifications,
  ogeNotificationSections,
  ogeNotificationTime,
  ogeOverlayMessage,
  ogeRelativeTime,
  ogeShouldLoadMore,
  ogeUnreadCount,
  type OgeNotification,
  type OgeNotificationFilter,
  type OgeNotificationGrouping,
  type OgeOverlayMessages,
} from '@oge-ui/behavior';
import { useOgeOverlayConfig } from './overlay-config';
import { OgePopover } from './popover';

export interface OgeNotificationCenterProps {
  /** The notifications (controlled; `defaultItems` when uncontrolled). */
  items?: readonly OgeNotification[];
  defaultItems?: readonly OgeNotification[];
  /** Marking read or dismissing produced a new array. */
  onItemsChange?: (items: readonly OgeNotification[]) => void;
  /** The panel is open (controlled; `defaultOpened` when uncontrolled). */
  opened?: boolean;
  defaultOpened?: boolean;
  onOpenedChange?: (opened: boolean) => void;
  /** `'day'` (Today / Yesterday / Earlier, default), `'group'` or `'none'`. */
  grouping?: OgeNotificationGrouping;
  /** `'all'` (default) or `'unread'` (controlled; `defaultFilter` when uncontrolled). */
  filter?: OgeNotificationFilter;
  defaultFilter?: OgeNotificationFilter;
  onFilterChange?: (filter: OgeNotificationFilter) => void;
  /** More, older notifications exist: scrolling near the end calls `onLoadMore`. */
  hasMore?: boolean;
  /** Set while more are loading (the feed is `aria-busy`). */
  loading?: boolean;
  /** Panel width (default 360). */
  width?: number | string;
  /** Locale of the relative times (default the browser's). */
  locale?: string;
  /** Per-instance message overrides. */
  messages?: Partial<OgeOverlayMessages>;
  /** Scrolled near the end while `hasMore`: add older notifications. */
  onLoadMore?: () => void;
  /** A notification was marked read or unread. */
  onReadChange?: (event: { item: OgeNotification; read: boolean }) => void;
  /** A notification was dismissed. */
  onDismissed?: (item: OgeNotification) => void;
  className?: string;
  style?: CSSProperties;
}

/** What a `ref` on {@link OgeNotificationCenter} reaches. */
export interface OgeNotificationCenterHandle {
  /** Marks every notification read. */
  markAllRead(): void;
}

/**
 * A notification center: a bell with the unread count that opens a WAI-ARIA
 * feed of notifications — sectioned by day or group, filtered to unread, with
 * read / unread, mark-all-read, dismiss and infinite scroll.
 */
export const OgeNotificationCenter = forwardRef<
  OgeNotificationCenterHandle,
  OgeNotificationCenterProps
>(function OgeNotificationCenterRender(props, ref): ReactElement {
  const config = useOgeOverlayConfig();
  const messages = useMemo(
    () => ({ ...config.messages, ...props.messages }),
    [config.messages, props.messages],
  );
  const text = (key: keyof OgeOverlayMessages) =>
    ogeOverlayMessage(messages, key);
  const latest = useRef(props);
  latest.current = props;

  const [ownItems, setOwnItems] = useState<readonly OgeNotification[]>(
    props.defaultItems ?? [],
  );
  const items = props.items ?? ownItems;
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const setItems = (next: readonly OgeNotification[]) => {
    itemsRef.current = next;
    if (latest.current.items === undefined) setOwnItems(next);
    latest.current.onItemsChange?.(next);
  };
  const [ownOpened, setOwnOpened] = useState(props.defaultOpened ?? false);
  const opened = props.opened ?? ownOpened;
  const setOpened = (next: boolean) => {
    if (props.opened === undefined) setOwnOpened(next);
    props.onOpenedChange?.(next);
  };
  const [ownFilter, setOwnFilter] = useState<OgeNotificationFilter>(
    props.defaultFilter ?? 'all',
  );
  const filter = props.filter ?? ownFilter;
  const setFilter = (next: OgeNotificationFilter) => {
    if (props.filter === undefined) setOwnFilter(next);
    props.onFilterChange?.(next);
  };

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (opened) setNow(Date.now());
  }, [opened]);

  const unread = ogeUnreadCount(items);
  const sections = ogeNotificationSections(items, {
    grouping: props.grouping ?? 'day',
    filter,
    now: new Date(now),
    labels: {
      today: text('notificationsToday'),
      yesterday: text('notificationsYesterday'),
      earlier: text('notificationsEarlier'),
    },
  });
  const order = sections.flatMap((s) => s.items);
  const hasMore = props.hasMore ?? false;
  const loading = props.loading ?? false;

  // announce new unread notifications (not the first list)
  const [announcement, setAnnouncement] = useState('');
  const known = useRef<Set<string> | null>(null);
  useEffect(() => {
    const ids = new Set(items.map((i) => i.id));
    if (known.current) {
      const fresh = items.filter(
        (i) => !i.read && !known.current!.has(i.id),
      ).length;
      if (fresh > 0)
        setAnnouncement(
          ogeFormatMessage(text('notificationsNew'), { count: fresh }),
        );
    }
    known.current = ids;
  }, [items]);

  const markAllRead = () =>
    setItems(ogeMarkNotifications(itemsRef.current, true));
  const markRef = useRef(markAllRead);
  markRef.current = markAllRead;
  useImperativeHandle(
    ref,
    () => ({ markAllRead: () => markRef.current() }),
    [],
  );

  const requestMore = () => {
    if (latest.current.hasMore && !latest.current.loading)
      latest.current.onLoadMore?.();
  };
  const uid = useId().replace(/:/g, '');
  const scroller = useRef<HTMLDivElement>(null);
  const bell = useRef<HTMLButtonElement>(null);

  const onFeedKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const articles = [
      ...(scroller.current?.querySelectorAll<HTMLElement>('article') ?? []),
    ];
    const at = articles.indexOf(
      (event.target as HTMLElement).closest('article') as HTMLElement,
    );
    if (at < 0) return;
    const intent = ogeFeedKeyIntent(event, at, articles.length);
    if (!intent) return;
    event.preventDefault();
    if (intent.kind === 'focus') {
      articles[intent.index].focus();
      if (intent.index === articles.length - 1) requestMore();
    } else if (intent.where === 'before') {
      bell.current?.focus();
    } else {
      scroller.current
        ?.querySelector<HTMLElement>('.oge-notification-more')
        ?.focus();
    }
  };

  const trigger = (
    <button
      ref={bell}
      type="button"
      className="oge-notification-bell"
      aria-label={ogeFormatMessage(text('notificationsBell'), {
        count: unread,
      })}
    >
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {unread > 0 && (
        <span className="oge-notification-badge" aria-hidden="true">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </button>
  );

  return (
    <span
      className={
        props.className
          ? `oge-notification-center ${props.className}`
          : 'oge-notification-center'
      }
      style={props.style}
    >
      <OgePopover
        trigger={trigger}
        open={opened}
        onOpenChange={setOpened}
        title={text('notificationsLabel')}
        placement="bottom-end"
        width={props.width ?? 360}
        padding="none"
        panelClass="oge-notification-panel"
      >
        <div className="oge-notification-header">
          <div
            className="oge-notification-filters"
            role="group"
            aria-label={text('notificationsLabel')}
          >
            <button
              type="button"
              className="oge-notification-filter"
              aria-pressed={filter === 'all'}
              onClick={() => setFilter('all')}
            >
              {text('notificationsAll')}
            </button>
            <button
              type="button"
              className="oge-notification-filter"
              aria-pressed={filter === 'unread'}
              onClick={() => setFilter('unread')}
            >
              {text('notificationsUnread')}
            </button>
          </div>
          <button
            type="button"
            className="oge-notification-mark-all"
            disabled={unread === 0}
            onClick={markAllRead}
          >
            {text('notificationsMarkAllRead')}
          </button>
        </div>
        <div
          ref={scroller}
          className="oge-notification-scroll"
          onScroll={(event) => {
            if (ogeShouldLoadMore(event.currentTarget)) requestMore();
          }}
        >
          {sections.length === 0 && !loading && (
            <p className="oge-notification-empty">
              {text('notificationsEmpty')}
            </p>
          )}
          <div
            className="oge-notification-feed"
            role="feed"
            aria-busy={loading}
            aria-label={text('notificationsLabel')}
            onKeyDown={onFeedKeyDown}
          >
            {sections.map((section) => [
              section.title ? (
                // a feed holds only articles: the label is visual, the day is in
                // each item's time and the group in its hidden title prefix
                <div
                  key={`h:${section.key}`}
                  className="oge-notification-section"
                  aria-hidden="true"
                >
                  {section.title}
                </div>
              ) : null,
              ...section.items.map((item) => {
                const t = ogeNotificationTime(item);
                return (
                  <article
                    key={item.id}
                    className={
                      item.read
                        ? 'oge-notification-item'
                        : 'oge-notification-item oge-notification-unread'
                    }
                    tabIndex={0}
                    data-severity={item.severity ?? 'info'}
                    aria-posinset={order.indexOf(item) + 1}
                    aria-setsize={hasMore ? -1 : order.length}
                    aria-labelledby={`oge-n-${uid}-t-${item.id}`}
                    aria-describedby={
                      item.body ? `oge-n-${uid}-b-${item.id}` : undefined
                    }
                  >
                    <span className="oge-notification-dot" aria-hidden="true" />
                    <div className="oge-notification-text">
                      <p
                        className="oge-notification-title"
                        id={`oge-n-${uid}-t-${item.id}`}
                      >
                        {props.grouping === 'group' && item.group && (
                          <span className="oge-notification-sr">
                            {item.group}:{' '}
                          </span>
                        )}
                        {!item.read && (
                          <span className="oge-notification-sr">
                            {text('notificationsUnread')}:{' '}
                          </span>
                        )}
                        {item.title}
                      </p>
                      {item.body && (
                        <p
                          className="oge-notification-body"
                          id={`oge-n-${uid}-b-${item.id}`}
                        >
                          {item.body}
                        </p>
                      )}
                      <time
                        className="oge-notification-time"
                        dateTime={
                          Number.isFinite(t)
                            ? new Date(t).toISOString()
                            : undefined
                        }
                      >
                        {ogeRelativeTime(t, now, props.locale)}
                      </time>
                    </div>
                    <div className="oge-notification-actions">
                      <button
                        type="button"
                        className="oge-notification-action oge-notification-toggle"
                        onClick={() => {
                          setItems(
                            ogeMarkNotifications(itemsRef.current, !item.read, [
                              item.id,
                            ]),
                          );
                          props.onReadChange?.({ item, read: !item.read });
                        }}
                      >
                        {item.read
                          ? text('notificationsMarkUnread')
                          : text('notificationsMarkRead')}
                      </button>
                      <button
                        type="button"
                        className="oge-notification-action oge-notification-dismiss"
                        aria-label={`${text('notificationsDismiss')}: ${item.title}`}
                        onClick={() => {
                          setItems(
                            itemsRef.current.filter((i) => i.id !== item.id),
                          );
                          props.onDismissed?.(item);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </article>
                );
              }),
            ])}
          </div>
          {loading ? (
            <p className="oge-notification-loading">
              {text('notificationsLoading')}
            </p>
          ) : hasMore ? (
            <button
              type="button"
              className="oge-notification-more"
              onClick={requestMore}
            >
              {text('notificationsLoadMore')}
            </button>
          ) : null}
        </div>
      </OgePopover>
      <span className="oge-notification-sr" role="status">
        {announcement}
      </span>
    </span>
  );
});
