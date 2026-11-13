import { StrictMode, createRef, useState } from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import {
  resetScrollLockForTests,
  type OgeNotification,
} from '@oge-ui/behavior';
import {
  OgeNotificationCenter,
  type OgeNotificationCenterHandle,
} from './notification-center';
import { OgeOverlayConfigProvider } from './overlay-config';

const now = Date.now();
const ITEMS: OgeNotification[] = [
  {
    id: 'a',
    title: 'Build passed',
    body: 'main is green',
    time: now - 60_000,
    severity: 'success',
    group: 'CI',
  },
  {
    id: 'b',
    title: 'Invoice paid',
    time: now - 26 * 3_600_000,
    read: true,
    group: 'Billing',
  },
  {
    id: 'c',
    title: 'Quota at 90%',
    time: now - 9 * 86_400_000,
    severity: 'warning',
  },
];

const q = <T extends Element = HTMLElement>(s: string) =>
  document.querySelector(s) as T;
const all = (s: string) => [...document.querySelectorAll(s)] as HTMLElement[];

beforeEach(() => resetScrollLockForTests());

describe('<OgeNotificationCenter>', () => {
  it('shows the unread count, opens a feed of day sections and marks items', () => {
    const reads: string[] = [];
    const gone: string[] = [];
    function Host() {
      const [items, setItems] = useState<readonly OgeNotification[]>(ITEMS);
      return (
        <OgeNotificationCenter
          items={items}
          onItemsChange={setItems}
          locale="en"
          onReadChange={(e) => reads.push(`${e.item.id}:${e.read}`)}
          onDismissed={(i) => gone.push(i.id)}
          className="mine"
        />
      );
    }
    render(
      <StrictMode>
        <OgeOverlayConfigProvider
          config={{ messages: { notificationsEmpty: 'Hepsi okundu' } }}
        >
          <Host />
        </OgeOverlayConfigProvider>
      </StrictMode>,
    );
    expect(q('.oge-notification-center').classList).toContain('mine');
    expect(q('.oge-notification-bell').getAttribute('aria-label')).toBe(
      'Notifications, 2 unread',
    );
    expect(q('.oge-notification-badge').textContent).toBe('2');
    fireEvent.click(q('.oge-notification-bell'));
    expect(all('.oge-notification-section').map((h) => h.textContent)).toEqual([
      'Today',
      'Yesterday',
      'Earlier',
    ]);
    const articles = all('article');
    expect(articles[0].getAttribute('aria-setsize')).toBe('3');
    expect(articles[0].querySelector('time')?.textContent).toBe('1 minute ago');
    expect(
      document.getElementById(articles[0].getAttribute('aria-describedby')!)
        ?.textContent,
    ).toBe('main is green');
    fireEvent.click(articles[0].querySelector('.oge-notification-toggle')!);
    expect(reads).toEqual(['a:true']);
    fireEvent.click(all('.oge-notification-filter')[1]);
    expect(all('article').map((a) => a.textContent)).toEqual([
      expect.stringContaining('Quota'),
    ]);
    fireEvent.click(q('.oge-notification-dismiss'));
    expect(gone).toEqual(['c']);
    expect(q('.oge-notification-empty').textContent).toBe('Hepsi okundu');
    fireEvent.click(all('.oge-notification-filter')[0]);
    fireEvent.click(
      all('article')[1].querySelector('.oge-notification-toggle')!,
    ); // Invoice: back to unread
    expect(reads).toEqual(['a:true', 'b:false']);
  });

  it('loads more on scroll, from the button and the feed keys, and marks all read', () => {
    let loads = 0;
    const ref = createRef<OgeNotificationCenterHandle>();
    const { rerender } = render(
      <OgeNotificationCenter
        ref={ref}
        defaultItems={ITEMS}
        defaultOpened
        hasMore
        onLoadMore={() => loads++}
      />,
    );
    const scroller = q('.oge-notification-scroll');
    Object.defineProperties(scroller, {
      scrollTop: { value: 400, configurable: true },
      clientHeight: { value: 100, configurable: true },
      scrollHeight: { value: 520, configurable: true },
    });
    fireEvent.scroll(scroller);
    expect(loads).toBe(1);
    fireEvent.click(q('.oge-notification-more'));
    expect(loads).toBe(2);
    const articles = all('article');
    expect(articles[0].getAttribute('aria-setsize')).toBe('-1');
    articles[1].focus();
    fireEvent.keyDown(articles[1], { key: 'PageDown' });
    expect(document.activeElement).toBe(articles[2]);
    expect(loads).toBe(3);
    fireEvent.keyDown(articles[2], { key: 'PageUp' });
    expect(document.activeElement).toBe(articles[1]);
    fireEvent.keyDown(articles[1], { key: 'End', ctrlKey: true });
    expect(document.activeElement).toBe(q('.oge-notification-more'));
    fireEvent.keyDown(articles[1], { key: 'Home', ctrlKey: true });
    expect(document.activeElement).toBe(q('.oge-notification-bell'));
    fireEvent.keyDown(articles[1], { key: 'x' });
    act(() => ref.current!.markAllRead());
    expect(q('.oge-notification-badge')).toBeNull();
    rerender(
      <OgeNotificationCenter
        ref={ref}
        defaultItems={ITEMS}
        defaultOpened
        hasMore
        loading
        onLoadMore={() => loads++}
      />,
    );
    expect(q('[role="feed"]').getAttribute('aria-busy')).toBe('true');
    expect(q('.oge-notification-loading').textContent).toBe('Loading…');
    fireEvent.scroll(scroller);
    expect(loads).toBe(3);
  });

  it('announces new unread notifications and groups by group or not at all', () => {
    const { rerender } = render(
      <OgeNotificationCenter
        items={ITEMS}
        grouping="group"
        defaultOpened
        defaultFilter="all"
        onOpenedChange={() => undefined}
      />,
    );
    expect(all('.oge-notification-section').map((h) => h.textContent)).toEqual([
      'CI',
      'Billing',
    ]);
    rerender(
      <OgeNotificationCenter
        items={[{ id: 'n', title: 'Deploy done', time: Date.now() }, ...ITEMS]}
        grouping="none"
        defaultOpened
      />,
    );
    expect(q('.oge-notification-center > [role="status"]').textContent).toBe(
      '1 new notification',
    );
    expect(all('.oge-notification-section')).toHaveLength(0);
  });

  it('opens and filters when controlled', () => {
    const opened: boolean[] = [];
    const filters: string[] = [];
    render(
      <OgeNotificationCenter
        items={ITEMS}
        opened
        onOpenedChange={(o) => opened.push(o)}
        filter="unread"
        onFilterChange={(f) => filters.push(f)}
      />,
    );
    expect(all('article')).toHaveLength(2);
    fireEvent.click(all('.oge-notification-filter')[0]);
    expect(filters).toEqual(['all']);
    expect(all('article')).toHaveLength(2);
  });
});
