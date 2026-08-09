import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { OgeTabs, type OgeTabItem } from '@oge-ui/tabs';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { SNIPPET } from './routed-snippets';

/** Route targets of the demo — trivial on purpose. */
@Component({
  selector: 'app-tabs-routed-overview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p class="py-3">
    <b>Overview</b> — rendered by the router into
    <code>&lt;router-outlet&gt;</code>, not by the tab strip.
  </p>`,
})
export class TabsRoutedOverview {}

@Component({
  selector: 'app-tabs-routed-members',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p class="py-3">
    <b>Members</b> — deep-linkable: this URL can be bookmarked and shared.
  </p>`,
})
export class TabsRoutedMembers {}

@Component({
  selector: 'app-tabs-routed-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p class="py-3">
    <b>Settings</b> — browser Back/Forward moves the selection with it.
  </p>`,
})
export class TabsRoutedSettings {}

@Component({
  selector: 'app-tabs-routed',
  imports: [OgeTabs, RouterOutlet, DemoCard, DocHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Routed tabs"
      category="Tabs"
      [chips]="['router-outlet', 'selectedKey', 'deep links']"
    >
      <p>
        Some references ship a separate tab-nav-bar component for router-driven
        tabs. <code>&lt;oge-tabs&gt;</code> needs no variant: bind
        <code>selectedKey</code> one-way from the URL and navigate in
        <code>selectionChanged</code>. Keyboard support, overflow and closable
        tabs all keep working, and the panels come from
        <code>&lt;router-outlet&gt;</code> instead of the component.
      </p>
    </app-doc-header>

    <app-demo-card
      [chips]="['URL is the source of truth', 'Back/Forward works']"
      heading="Router-driven selection"
      description="The strip never owns the selection here — it reflects the active route and asks the router to change it. Because <code>selectedKey</code> is matched by key (not index), routes can be reordered or added without touching the binding."
      [code]="snippet"
      language="ts"
    >
      <oge-tabs
        [items]="tabs"
        [selectedKey]="activeKey()"
        (selectionChanged)="go($event.key)"
        ariaLabel="Project sections"
      />
      <router-outlet />
    </app-demo-card>
  `,
})
export class TabsRoutedPage {
  private readonly router = inject(Router);

  protected readonly snippet = SNIPPET;

  protected readonly tabs: OgeTabItem[] = [
    { key: 'overview', text: 'Overview' },
    { key: 'members', text: 'Members', badge: 4 },
    { key: 'settings', text: 'Settings' },
  ];

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /** Last URL segment, falling back to the first tab for the bare route. */
  protected readonly activeKey = computed(() => {
    const segment = this.url().split(/[?#]/)[0].split('/').pop() ?? '';
    return this.tabs.some((tab) => tab.key === segment) ? segment : 'overview';
  });

  protected go(key: string | undefined): void {
    if (key) void this.router.navigate(['/components/tabs/routed', key]);
  }
}
