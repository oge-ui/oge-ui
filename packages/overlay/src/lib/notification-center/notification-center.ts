import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
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
} from '@oge-ui/behavior';
import { OGE_OVERLAY_CONFIG, type OgeOverlayMessages } from '../config';
import { OgePopover, OgePopoverTrigger } from '../popover/popover';

/**
 * A notification center: a bell with the unread count that opens a panel of
 * notifications — newest first, sectioned by day or by group, filtered to
 * unread, with read / unread, mark-all-read and dismiss:
 *
 * ```html
 * <oge-notification-center [(items)]="items" [hasMore]="more()" (loadMore)="fetchOlder()" />
 * ```
 *
 * The list is a WAI-ARIA feed: each notification an `article` (Page Down /
 * Page Up move between them), `aria-busy` while more load, and scrolling near
 * the end asks for more (`loadMore`) while `hasMore` is set. New unread
 * notifications are announced politely; the bell says how many are unread.
 */
@Component({
  selector: 'oge-notification-center',
  imports: [OgePopover, OgePopoverTrigger],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'oge-notification-center' },
  styleUrl: './notification-center.scss',
  template: `
    <button
      #bell
      type="button"
      class="oge-notification-bell"
      [ogePopover]="panel"
      [attr.aria-label]="bellLabel()"
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
      @if (unread() > 0) {
        <span class="oge-notification-badge" aria-hidden="true">{{
          unread() > 99 ? '99+' : unread()
        }}</span>
      }
    </button>
    <oge-popover
      #panel
      [(visible)]="opened"
      [title]="text('notificationsLabel')"
      placement="bottom-end"
      [width]="width()"
      padding="none"
      panelClass="oge-notification-panel"
    >
      <div class="oge-notification-header">
        <div
          class="oge-notification-filters"
          role="group"
          [attr.aria-label]="text('notificationsLabel')"
        >
          <button
            type="button"
            class="oge-notification-filter"
            [attr.aria-pressed]="filter() === 'all'"
            (click)="filter.set('all')"
          >
            {{ text('notificationsAll') }}
          </button>
          <button
            type="button"
            class="oge-notification-filter"
            [attr.aria-pressed]="filter() === 'unread'"
            (click)="filter.set('unread')"
          >
            {{ text('notificationsUnread') }}
          </button>
        </div>
        <button
          type="button"
          class="oge-notification-mark-all"
          [disabled]="unread() === 0"
          (click)="markAllRead()"
        >
          {{ text('notificationsMarkAllRead') }}
        </button>
      </div>
      <div #scroller class="oge-notification-scroll" (scroll)="onScroll()">
        @if (sections().length === 0 && !loading()) {
          <p class="oge-notification-empty">{{ text('notificationsEmpty') }}</p>
        }
        <div
          class="oge-notification-feed"
          role="feed"
          [attr.aria-busy]="loading()"
          [attr.aria-label]="text('notificationsLabel')"
          (keydown)="onFeedKeydown($event)"
        >
          @for (section of sections(); track section.key) {
            @if (section.title) {
              <!-- a feed holds only articles: the label is visual, the day is in each
                   item's time and the group in its hidden title prefix -->
              <div class="oge-notification-section" aria-hidden="true">
                {{ section.title }}
              </div>
            }
            @for (item of section.items; track item.id) {
              <article
                class="oge-notification-item"
                tabindex="0"
                [class.oge-notification-unread]="!item.read"
                [attr.data-severity]="item.severity ?? 'info'"
                [attr.aria-posinset]="position(item) + 1"
                [attr.aria-setsize]="hasMore() ? -1 : shownCount()"
                [attr.aria-labelledby]="id + '-t-' + item.id"
                [attr.aria-describedby]="
                  item.body ? id + '-b-' + item.id : null
                "
              >
                <span class="oge-notification-dot" aria-hidden="true"></span>
                <div class="oge-notification-text">
                  <p class="oge-notification-title" [id]="id + '-t-' + item.id">
                    @if (grouping() === 'group' && item.group) {
                      <span class="oge-notification-sr"
                        >{{ item.group }}:
                      </span>
                    }
                    @if (!item.read) {
                      <span class="oge-notification-sr"
                        >{{ text('notificationsUnread') }}:
                      </span>
                    }
                    {{ item.title }}
                  </p>
                  @if (item.body) {
                    <p
                      class="oge-notification-body"
                      [id]="id + '-b-' + item.id"
                      [textContent]="item.body"
                    ></p>
                  }
                  <time
                    class="oge-notification-time"
                    [attr.datetime]="iso(item)"
                    >{{ relative(item) }}</time
                  >
                </div>
                <div class="oge-notification-actions">
                  <button
                    type="button"
                    class="oge-notification-action oge-notification-toggle"
                    (click)="setRead(item, !item.read)"
                  >
                    {{
                      item.read
                        ? text('notificationsMarkUnread')
                        : text('notificationsMarkRead')
                    }}
                  </button>
                  <button
                    type="button"
                    class="oge-notification-action oge-notification-dismiss"
                    [attr.aria-label]="
                      text('notificationsDismiss') + ': ' + item.title
                    "
                    (click)="dismiss(item)"
                  >
                    ×
                  </button>
                </div>
              </article>
            }
          }
        </div>
        @if (loading()) {
          <p class="oge-notification-loading">
            {{ text('notificationsLoading') }}
          </p>
        } @else if (hasMore()) {
          <button
            type="button"
            class="oge-notification-more"
            (click)="requestMore()"
          >
            {{ text('notificationsLoadMore') }}
          </button>
        }
      </div>
    </oge-popover>
    <span class="oge-notification-sr" role="status">{{ announcement() }}</span>
  `,
})
export class OgeNotificationCenter {
  private readonly config = inject(OGE_OVERLAY_CONFIG);
  private static nextId = 0;
  protected readonly id = `oge-notifications-${OgeNotificationCenter.nextId++}`;

  /** Two-way: the notifications (marking read or dismissing writes a new array). */
  readonly items = model<readonly OgeNotification[]>([]);
  /** Two-way: the panel is open. */
  readonly opened = model(false);
  /** `'day'` (Today / Yesterday / Earlier, default), `'group'` or `'none'`. */
  readonly grouping = input<OgeNotificationGrouping>('day');
  /** Two-way: `'all'` (default) or `'unread'`. */
  readonly filter = model<OgeNotificationFilter>('all');
  /** More, older notifications exist: scrolling near the end emits `loadMore`. */
  readonly hasMore = input(false);
  /** Set while more are loading (the feed is `aria-busy`). */
  readonly loading = input(false);
  /** Panel width (default 360). */
  readonly width = input<number | string>(360);
  /** Locale of the relative times (default the browser's). */
  readonly locale = input<string | undefined>(undefined);
  /** Per-instance message overrides. */
  readonly messages = input<Partial<OgeOverlayMessages>>();

  /** Scrolled near the end while `hasMore`: append older notifications to `items`. */
  readonly loadMore = output<void>();
  /** A notification was marked read or unread. */
  readonly readChange = output<{ item: OgeNotification; read: boolean }>();
  /** A notification was dismissed (it is already out of `items`). */
  readonly dismissed = output<OgeNotification>();

  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');
  private readonly bell =
    viewChild.required<ElementRef<HTMLButtonElement>>('bell');
  protected readonly announcement = signal('');
  private readonly now = signal(Date.now());

  private readonly mergedMessages = computed(() => ({
    ...this.config.messages,
    ...this.messages(),
  }));

  protected readonly unread = computed(() => ogeUnreadCount(this.items()));
  protected readonly sections = computed(() =>
    ogeNotificationSections(this.items(), {
      grouping: this.grouping(),
      filter: this.filter(),
      now: new Date(this.now()),
      labels: {
        today: this.text('notificationsToday'),
        yesterday: this.text('notificationsYesterday'),
        earlier: this.text('notificationsEarlier'),
      },
    }),
  );
  private readonly order = computed(() =>
    this.sections().flatMap((s) => s.items),
  );
  protected readonly shownCount = computed(() => this.order().length);
  protected readonly bellLabel = computed(() =>
    ogeFormatMessage(this.text('notificationsBell'), { count: this.unread() }),
  );

  constructor() {
    // announce new unread notifications (not the first list)
    let known: Set<string> | null = null;
    effect(() => {
      const items = this.items();
      untracked(() => {
        const ids = new Set(items.map((i) => i.id));
        if (known) {
          const fresh = items.filter(
            (i) => !i.read && !known!.has(i.id),
          ).length;
          if (fresh > 0)
            this.announcement.set(
              ogeFormatMessage(this.text('notificationsNew'), { count: fresh }),
            );
        }
        known = ids;
      });
    });
    // relative times are fresh whenever the panel opens
    effect(() => {
      if (this.opened()) untracked(() => this.now.set(Date.now()));
    });
  }

  protected text(key: keyof OgeOverlayMessages): string {
    return ogeOverlayMessage(this.mergedMessages(), key);
  }

  protected position(item: OgeNotification): number {
    return this.order().indexOf(item);
  }

  protected relative(item: OgeNotification): string {
    return ogeRelativeTime(
      ogeNotificationTime(item),
      this.now(),
      this.locale(),
    );
  }

  protected iso(item: OgeNotification): string | null {
    const t = ogeNotificationTime(item);
    return Number.isFinite(t) ? new Date(t).toISOString() : null;
  }

  /** Marks every notification read. */
  markAllRead(): void {
    this.items.set(ogeMarkNotifications(this.items(), true));
  }

  protected setRead(item: OgeNotification, read: boolean): void {
    this.items.set(ogeMarkNotifications(this.items(), read, [item.id]));
    this.readChange.emit({ item, read });
  }

  protected dismiss(item: OgeNotification): void {
    this.items.set(this.items().filter((i) => i.id !== item.id));
    this.dismissed.emit(item);
  }

  protected requestMore(): void {
    if (this.hasMore() && !this.loading()) this.loadMore.emit();
  }

  protected onScroll(): void {
    const el = this.scroller()?.nativeElement;
    if (el && ogeShouldLoadMore(el)) this.requestMore();
  }

  protected onFeedKeydown(event: KeyboardEvent): void {
    const articles = [
      ...(this.scroller()?.nativeElement.querySelectorAll<HTMLElement>(
        'article',
      ) ?? []),
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
      // reaching the last article loads the next page, as a feed does
      if (intent.index === articles.length - 1) this.requestMore();
    } else if (intent.where === 'before') {
      this.bell().nativeElement.focus();
    } else {
      this.scroller()
        ?.nativeElement.querySelector<HTMLElement>('.oge-notification-more')
        ?.focus();
    }
  }
}
