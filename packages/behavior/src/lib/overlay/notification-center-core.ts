/**
 * The notification center's framework-free half: the item model, the
 * sections (by day or by group, filtered to unread), relative times, the
 * unread count, the infinite-scroll trigger and the feed keys (WAI-ARIA APG
 * feed pattern: Page Down / Page Up move between articles).
 */

/** One notification. */
export interface OgeNotification {
  readonly id: string;
  readonly title: string;
  readonly body?: string;
  /** When it happened: a `Date`, an ISO string or epoch milliseconds. */
  readonly time: Date | string | number;
  readonly read?: boolean;
  /** Section it is listed under when grouping by `group`. */
  readonly group?: string;
  /** Tints the item's mark (default `info`). */
  readonly severity?: 'info' | 'success' | 'warning' | 'danger';
}

/** How the list is sectioned. */
export type OgeNotificationGrouping = 'day' | 'group' | 'none';

/** Which items the list shows. */
export type OgeNotificationFilter = 'all' | 'unread';

/** A section: a heading (empty for `none`) and its items, newest first. */
export interface OgeNotificationSection {
  readonly key: string;
  readonly title: string;
  readonly items: readonly OgeNotification[];
}

export interface OgeNotificationSectionOptions {
  readonly grouping?: OgeNotificationGrouping;
  readonly filter?: OgeNotificationFilter;
  /** "Now" (default `new Date()`), for the day sections. */
  readonly now?: Date;
  /** Day headings. */
  readonly labels?: {
    readonly today: string;
    readonly yesterday: string;
    readonly earlier: string;
  };
}

/** A notification's time as epoch milliseconds (`NaN` when it cannot be read). */
export function ogeNotificationTime(
  item: Pick<OgeNotification, 'time'>,
): number {
  const t = item.time;
  return t instanceof Date
    ? t.getTime()
    : typeof t === 'number'
      ? t
      : Date.parse(t);
}

const startOfDay = (date: Date): number =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

/** The list's sections: newest first, filtered, grouped by day, by `group` or not at all. */
export function ogeNotificationSections(
  items: readonly OgeNotification[],
  options: OgeNotificationSectionOptions = {},
): OgeNotificationSection[] {
  const shown = items
    .filter((item) => options.filter !== 'unread' || !item.read)
    .slice()
    .sort(
      (a, b) => (ogeNotificationTime(b) || 0) - (ogeNotificationTime(a) || 0),
    );
  const grouping = options.grouping ?? 'day';
  if (grouping === 'none')
    return shown.length ? [{ key: 'all', title: '', items: shown }] : [];
  const sections: { key: string; title: string; items: OgeNotification[] }[] =
    [];
  const add = (key: string, title: string, item: OgeNotification) => {
    let section = sections.find((s) => s.key === key);
    if (!section) {
      section = { key, title, items: [] };
      sections.push(section);
    }
    section.items.push(item);
  };
  if (grouping === 'group') {
    for (const item of shown)
      add(`group:${item.group ?? ''}`, item.group ?? '', item);
    return sections;
  }
  const labels = options.labels ?? {
    today: 'Today',
    yesterday: 'Yesterday',
    earlier: 'Earlier',
  };
  const today = startOfDay(options.now ?? new Date());
  const yesterday = today - 86_400_000;
  for (const item of shown) {
    const t = ogeNotificationTime(item);
    if (t >= today) add('today', labels.today, item);
    else if (t >= yesterday) add('yesterday', labels.yesterday, item);
    else add('earlier', labels.earlier, item);
  }
  return sections;
}

/** How many items are unread. */
export function ogeUnreadCount(items: readonly OgeNotification[]): number {
  return items.reduce((n, item) => n + (item.read ? 0 : 1), 0);
}

const UNITS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 86_400_000],
  ['month', 30 * 86_400_000],
  ['week', 7 * 86_400_000],
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
];

/** "5 minutes ago", "yesterday", "in 2 hours" — in the locale's words. */
export function ogeRelativeTime(
  time: number,
  now: number,
  locale?: string,
): string {
  if (!Number.isFinite(time)) return '';
  const diff = time - now;
  const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  for (const [unit, size] of UNITS) {
    if (Math.abs(diff) >= size)
      return format.format(Math.round(diff / size), unit);
  }
  return format.format(0, 'second');
}

/** Whether a scrolled list is close enough to its end to ask for more. */
export function ogeShouldLoadMore(
  scroll: {
    readonly scrollTop: number;
    readonly clientHeight: number;
    readonly scrollHeight: number;
  },
  threshold = 80,
): boolean {
  return (
    scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight <= threshold
  );
}

/**
 * The feed keys (APG): Page Down / Page Up move to the next / previous
 * article; Ctrl+End / Ctrl+Home leave the feed (the layer focuses what is
 * after / before it). Returns the article index to focus, or `null`.
 */
export function ogeFeedKeyIntent(
  event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey'>,
  index: number,
  count: number,
):
  | { kind: 'focus'; index: number }
  | { kind: 'exit'; where: 'after' | 'before' }
  | null {
  if (count === 0) return null;
  switch (event.key) {
    case 'PageDown':
      return { kind: 'focus', index: Math.min(count - 1, index + 1) };
    case 'PageUp':
      return { kind: 'focus', index: Math.max(0, index - 1) };
    case 'End':
      return event.ctrlKey || event.metaKey
        ? { kind: 'exit', where: 'after' }
        : null;
    case 'Home':
      return event.ctrlKey || event.metaKey
        ? { kind: 'exit', where: 'before' }
        : null;
    default:
      return null;
  }
}

/** Items marked read (all, or the listed ids), as a new array. */
export function ogeMarkNotifications(
  items: readonly OgeNotification[],
  read: boolean,
  ids?: readonly string[],
): OgeNotification[] {
  const only = ids ? new Set(ids) : null;
  return items.map((item) =>
    (!only || only.has(item.id)) && !!item.read !== read
      ? { ...item, read }
      : item,
  );
}
