import { Component, signal, viewChild } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import {
  resetScrollLockForTests,
  type OgeNotification,
} from '@oge-ui/behavior';
import { provideOgeOverlayConfig } from '../config';
import { OgeNotificationCenter } from './notification-center';

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

@Component({
  imports: [OgeNotificationCenter],
  providers: [
    provideOgeOverlayConfig({
      messages: { notificationsEmpty: 'Hepsi okundu' },
    }),
  ],
  template: `<oge-notification-center
    #center
    [(items)]="items"
    [(opened)]="opened"
    [grouping]="grouping()"
    [hasMore]="hasMore()"
    [loading]="loading()"
    locale="en"
    (loadMore)="loads = loads + 1"
    (readChange)="reads.push($event.item.id + ':' + $event.read)"
    (dismissed)="gone.push($event.id)"
  />`,
})
class Host {
  readonly items = signal<readonly OgeNotification[]>(ITEMS);
  readonly opened = signal(false);
  readonly grouping = signal<'day' | 'group' | 'none'>('day');
  readonly hasMore = signal(true);
  readonly loading = signal(false);
  readonly center = viewChild.required(OgeNotificationCenter);
  loads = 0;
  readonly reads: string[] = [];
  readonly gone: string[] = [];
}

async function settle<T>(fixture: ComponentFixture<T>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  await new Promise((r) => setTimeout(r, 0));
  fixture.detectChanges();
}

const q = <T extends Element = HTMLElement>(s: string) =>
  document.body.querySelector(s) as T;
const all = (s: string) =>
  [...document.body.querySelectorAll(s)] as HTMLElement[];
const key = (el: Element, k: string, ctrlKey = false) =>
  el.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: k,
      ctrlKey,
      bubbles: true,
      cancelable: true,
    }),
  );

describe('OgeNotificationCenter', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;

  beforeEach(async () => {
    resetScrollLockForTests();
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    document.body.appendChild(fixture.nativeElement);
    await settle(fixture);
  });

  afterEach(() => {
    fixture.destroy();
    document.body.innerHTML = '';
  });

  async function open() {
    q<HTMLButtonElement>('.oge-notification-bell').click();
    await settle(fixture);
  }

  it('shows the unread count on the bell and opens a feed of day sections', async () => {
    const bell = q('.oge-notification-bell');
    expect(bell.getAttribute('aria-label')).toBe('Notifications, 2 unread');
    expect(q('.oge-notification-badge').textContent?.trim()).toBe('2');
    await open();
    expect(host.opened()).toBe(true);
    const feed = q('[role="feed"]');
    expect(feed.getAttribute('aria-busy')).toBe('false');
    expect(
      all('.oge-notification-section').map((h) => h.textContent?.trim()),
    ).toEqual(['Today', 'Yesterday', 'Earlier']);
    const articles = all('article');
    expect(articles).toHaveLength(3);
    expect(articles[0].getAttribute('aria-posinset')).toBe('1');
    expect(articles[0].getAttribute('aria-setsize')).toBe('-1');
    expect(
      document.getElementById(articles[0].getAttribute('aria-labelledby')!)
        ?.textContent,
    ).toContain('Build passed');
    expect(
      document.getElementById(articles[0].getAttribute('aria-describedby')!)
        ?.textContent,
    ).toBe('main is green');
    expect(articles[0].querySelector('.oge-notification-sr')?.textContent).toBe(
      'Unread: ',
    );
    expect(articles[0].querySelector('time')?.textContent).toBe('1 minute ago');
    expect(articles[0].querySelector('time')?.getAttribute('datetime')).toMatch(
      /Z$/,
    );
    expect(articles[1].classList).not.toContain('oge-notification-unread');
  });

  it('marks read and unread, marks all read, dismisses and filters to unread', async () => {
    await open();
    all('article')[0]
      .querySelector<HTMLButtonElement>('.oge-notification-toggle')!
      .click();
    await settle(fixture);
    expect(host.reads).toEqual(['a:true']);
    expect(host.items().find((i) => i.id === 'a')?.read).toBe(true);
    q<HTMLButtonElement>(
      '[aria-pressed="false"].oge-notification-filter',
    ).click(); // Unread
    await settle(fixture);
    expect(all('article').map((a) => a.textContent)).toEqual([
      expect.stringContaining('Quota'),
    ]);
    all('article')[0]
      .querySelector<HTMLButtonElement>('.oge-notification-dismiss')!
      .click();
    await settle(fixture);
    expect(host.gone).toEqual(['c']);
    expect(q('.oge-notification-empty').textContent?.trim()).toBe(
      'Hepsi okundu',
    );
    expect(q<HTMLButtonElement>('.oge-notification-mark-all').disabled).toBe(
      true,
    );
    host.items.set(ITEMS);
    await settle(fixture);
    host.center().markAllRead();
    await settle(fixture);
    expect(host.items().every((i) => i.read)).toBe(true);
    expect(q('.oge-notification-badge')).toBeNull();
  });

  it('loads more near the end, from the button and from the keys, and stays quiet while loading', async () => {
    await open();
    const scroller = q('.oge-notification-scroll');
    Object.defineProperties(scroller, {
      scrollTop: { value: 400, configurable: true },
      clientHeight: { value: 100, configurable: true },
      scrollHeight: { value: 520, configurable: true },
    });
    scroller.dispatchEvent(new Event('scroll'));
    expect(host.loads).toBe(1);
    q<HTMLButtonElement>('.oge-notification-more').click();
    expect(host.loads).toBe(2);
    const articles = all('article');
    articles[1].focus();
    key(articles[1], 'PageDown');
    expect(document.activeElement).toBe(articles[2]);
    expect(host.loads).toBe(3);
    key(articles[2], 'PageUp');
    expect(document.activeElement).toBe(articles[1]);
    key(articles[1], 'End', true);
    expect(document.activeElement).toBe(q('.oge-notification-more'));
    key(articles[1], 'Home', true);
    expect(document.activeElement).toBe(q('.oge-notification-bell'));
    key(articles[1], 'x');
    host.loading.set(true);
    await settle(fixture);
    expect(q('[role="feed"]').getAttribute('aria-busy')).toBe('true');
    expect(q('.oge-notification-loading').textContent?.trim()).toBe('Loading…');
    scroller.dispatchEvent(new Event('scroll'));
    expect(host.loads).toBe(3);
    host.loading.set(false);
    host.hasMore.set(false);
    await settle(fixture);
    expect(q('.oge-notification-more')).toBeNull();
    expect(all('article')[0].getAttribute('aria-setsize')).toBe('3');
  });

  it('announces new unread notifications and groups by group', async () => {
    host.items.set([
      { id: 'n', title: 'Deploy done', time: Date.now() },
      ...ITEMS,
    ]);
    await settle(fixture);
    expect(q('.oge-notification-center > [role="status"]').textContent).toBe(
      '1 new notification',
    );
    host.grouping.set('group');
    await open();
    expect(
      all('.oge-notification-section').map((h) => h.textContent?.trim()),
    ).toEqual(['CI', 'Billing']);
    host.grouping.set('none');
    await settle(fixture);
    expect(all('.oge-notification-section')).toHaveLength(0);
  });
});
