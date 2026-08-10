import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import {
  OgeMenubar,
  type OgeMenubarItemClickEvent,
  type OgeMenubarItemData,
} from '@oge-ui/navigation';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { SNIPPET } from './menubar-routed-snippets';

/** Route targets of the demo — trivial on purpose. */
@Component({
  selector: 'app-menubar-routed-overview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p class="py-3">
    <b>Overview</b> — rendered by the router into
    <code>&lt;router-outlet&gt;</code>, not by the menubar.
  </p>`,
})
export class MenubarRoutedOverview {}

@Component({
  selector: 'app-menubar-routed-members',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p class="py-3">
    <b>Members</b> — deep-linkable: this URL can be bookmarked and shared.
  </p>`,
})
export class MenubarRoutedMembers {}

@Component({
  selector: 'app-menubar-routed-reports',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p class="py-3">
    <b>Reports</b> — reached through a submenu; browser Back/Forward moves
    <code>aria-current</code> with it.
  </p>`,
})
export class MenubarRoutedReports {}

@Component({
  selector: 'app-menubar-routed',
  imports: [OgeMenubar, RouterOutlet, DemoCard, DocHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Routed menubar"
      category="Menubar"
      [chips]="['activeKey', 'aria-current', 'no router dependency']"
    >
      <p>
        The menubar takes no <code>&#64;angular/router</code> dependency — no
        package in the suite does. Bind <code>activeKey</code> one-way from the
        URL (the matching item renders <code>aria-current="page"</code>) and
        navigate in <code>itemClick</code>. <code>url</code> items stay real
        links, so middle-click and copy-address keep working;
        <code>preventDefault</code> hands the primary click to the router.
      </p>
    </app-doc-header>

    <app-demo-card
      [chips]="['URL is the source of truth', 'Back/Forward works']"
      heading="Router-driven menubar"
      description="The bar never owns the active state here — it reflects the route and asks the router to change it. Matching is by <code>key</code>, so routes can be reordered without touching the binding."
      [code]="snippet"
      language="ts"
    >
      <oge-menubar
        [items]="menu"
        [activeKey]="activeKey()"
        (itemClick)="go($event)"
      />
      <router-outlet />
    </app-demo-card>
  `,
})
export class MenubarRoutedPage {
  private readonly router = inject(Router);

  protected readonly snippet = SNIPPET;

  protected readonly menu: readonly OgeMenubarItemData[] = [
    {
      text: 'Overview',
      key: 'overview',
      url: '/components/menubar/routed/overview',
    },
    {
      text: 'Members',
      key: 'members',
      url: '/components/menubar/routed/members',
    },
    {
      text: 'Reports',
      items: [{ text: 'All reports', key: 'reports' }],
    },
  ];

  private readonly keys = ['overview', 'members', 'reports'];

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /** Last URL segment, falling back to the first entry for the bare route. */
  protected readonly activeKey = computed(() => {
    const segment = this.url().split(/[?#]/)[0].split('/').pop() ?? '';
    return this.keys.includes(segment) ? segment : 'overview';
  });

  protected go(event: OgeMenubarItemClickEvent): void {
    event.event.preventDefault();
    if (event.key) {
      void this.router.navigate(['/components/menubar/routed', event.key]);
    }
  }
}
