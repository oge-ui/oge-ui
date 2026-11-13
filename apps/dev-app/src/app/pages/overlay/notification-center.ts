import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { OgeNotificationCenter, type OgeNotification } from '@oge-ui/overlay';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_OVERLAY_NOTIFICATION_CENTER_SECTIONS,
  ReactOverlayNotificationCenterDemos,
} from '../react-overlay/notification-center';
import {
  notificationDemoFirstPage,
  notificationDemoOlderPage,
} from './notification-center-demo-data';
import { NOTIFICATION_CENTER_SNIPPET } from './notification-center-snippets';

const SECTIONS = ['Notification center'] as const;

const BUTTON =
  'rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700';

let arrived = 0;

@Component({
  selector: 'app-overlay-notification-center',
  imports: [
    OgeNotificationCenter,
    DemoCard,
    DocHeader,
    PageToc,
    ReactOverlayNotificationCenterDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Notification Center"
      category="Overlay"
      categoryLink="/components/overlay"
      [chips]="['feed', 'unread', 'grouping', 'infinite scroll']"
    >
      @if (fw.isReact()) {
        <p>
          <code>&lt;OgeNotificationCenter&gt;</code> from
          <code>&#64;oge-ui/react-overlay</code> is a bell with the unread count
          and a panel of notifications, with the same model, markup and
          stylesheet as the Angular component.
        </p>
      } @else {
        <p>
          <code>oge-notification-center</code> is a bell with the unread count
          and a panel of notifications.
        </p>
      }
      <p>
        Notifications list newest first, by day (Today / Yesterday / Earlier),
        by group or in one list, with an All / Unread switch, read / unread and
        dismiss per item and mark all as read. The list is a WAI-ARIA feed —
        Page Down and Page Up move between items — and scrolling to its end asks
        for older notifications. New unread ones are announced politely.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-overlay-notification-center-demos />
    } @else {
      <app-demo-card
        [chips]="['items', 'hasMore', 'loadMore', 'readChange']"
        heading="Notification center"
        description="Open the bell: three unread notifications today, two read ones yesterday, and three more pages of older reports that load as you scroll (or press Page Down onto the last item). “Simulate a new notification” adds one, announced and counted on the bell."
        [code]="snippet"
        language="ts"
      >
        <div class="flex items-center gap-3">
          <oge-notification-center
            [(items)]="items"
            [hasMore]="page() < 3"
            [loading]="loading()"
            (loadMore)="loadOlder()"
            (readChange)="
              lastAction.set(
                $event.item.title + ($event.read ? ': read' : ': unread')
              )
            "
            (dismissed)="lastAction.set($event.title + ': dismissed')"
          />
          <button
            type="button"
            [class]="button"
            data-testid="simulate"
            (click)="arrive()"
          >
            Simulate a new notification
          </button>
          <span class="text-sm" data-testid="last-action">{{
            lastAction()
          }}</span>
        </div>
      </app-demo-card>
    }
  `,
})
export class OverlayNotificationCenterPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_OVERLAY_NOTIFICATION_CENTER_SECTIONS;
  protected readonly snippet = NOTIFICATION_CENTER_SNIPPET;
  protected readonly button = BUTTON;
  protected readonly items = signal<readonly OgeNotification[]>(
    notificationDemoFirstPage(),
  );
  protected readonly page = signal(0);
  protected readonly loading = signal(false);
  protected readonly lastAction = signal('');

  protected loadOlder(): void {
    this.loading.set(true);
    setTimeout(() => {
      this.items.update((items) => [
        ...items,
        ...notificationDemoOlderPage(this.page()),
      ]);
      this.page.update((p) => p + 1);
      this.loading.set(false);
    }, 300);
  }

  protected arrive(): void {
    arrived++;
    this.items.update((items) => [
      {
        id: `new-${arrived}`,
        title: `New order #${2000 + arrived} received`,
        time: Date.now(),
      },
      ...items,
    ]);
  }
}
