import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterOutlet,
} from '@angular/router';
import { filter, map } from 'rxjs';
import {
  OgeBreadcrumb,
  type OgeBreadcrumbItemClickEvent,
  type OgeBreadcrumbItemData,
} from '@oge-ui/navigation';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { SNIPPET } from './breadcrumb-routed-snippets';

/** Route targets of the demo — trivial on purpose. */
@Component({
  selector: 'app-breadcrumb-routed-reports',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p class="py-3">
    <b>Reports</b> — rendered by the router into
    <code>&lt;router-outlet&gt;</code>; the trail above reflects the URL. Go
    deeper:
    <a
      class="underline"
      routerLink="/components/breadcrumb/routed/reports/monthly"
      >Monthly</a
    >
  </p>`,
})
export class BreadcrumbRoutedReports {}

@Component({
  selector: 'app-breadcrumb-routed-monthly',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p class="py-3">
    <b>Monthly</b> — deep-linkable: this URL can be bookmarked and shared, and
    browser Back walks the trail with it.
  </p>`,
})
export class BreadcrumbRoutedMonthly {}

@Component({
  selector: 'app-breadcrumb-routed',
  imports: [OgeBreadcrumb, RouterOutlet, DemoCard, DocHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Routed breadcrumb"
      category="Breadcrumb"
      [chips]="['URL-derived trail', 'aria-current', 'no router dependency']"
    >
      <p>
        The breadcrumb takes no <code>&#64;angular/router</code> dependency — no
        package in the suite does. Derive the trail from the URL, keep
        <code>url</code> crumbs real links (middle-click and copy-address work)
        and hand the primary click to the router with
        <code>preventDefault</code>. The last crumb is the current page:
        non-interactive, <code>aria-current="page"</code>.
      </p>
    </app-doc-header>

    <app-demo-card
      [chips]="['URL is the source of truth', 'Back/Forward works']"
      heading="Router-driven trail"
      description="The trail never owns state — it is computed from the route. Navigating deeper grows it; browser Back shrinks it."
      [code]="snippet"
      language="ts"
    >
      <oge-breadcrumb [items]="trail()" (itemClick)="go($event)" />
      <router-outlet />
    </app-demo-card>
  `,
})
export class BreadcrumbRoutedPage {
  private readonly router = inject(Router);

  protected readonly snippet = SNIPPET;

  private readonly base = '/components/breadcrumb/routed';

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /** One crumb per demo segment beyond the base route. */
  protected readonly trail = computed<readonly OgeBreadcrumbItemData[]>(() => {
    const path = this.url().split(/[?#]/)[0];
    const rest = path.startsWith(this.base)
      ? path.slice(this.base.length).split('/').filter(Boolean)
      : [];
    const crumbs: OgeBreadcrumbItemData[] = [
      { text: 'Routed demo', key: 'routed', url: this.base },
    ];
    let acc = this.base;
    for (const segment of rest) {
      acc = `${acc}/${segment}`;
      crumbs.push({ text: segment, key: segment, url: acc });
    }
    return crumbs;
  });

  protected go(event: OgeBreadcrumbItemClickEvent): void {
    event.event.preventDefault();
    if (event.item.url) void this.router.navigateByUrl(event.item.url);
  }
}
