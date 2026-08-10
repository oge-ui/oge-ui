import { demoSource } from '../../shared/demo-source';

export const SNIPPET = demoSource({
  use: {
    '@oge-ui/navigation': ['OgeBreadcrumb'],
    '@angular/router': ['RouterOutlet'],
  },
  helpers: { '@angular/router': ['NavigationEnd', 'Router'] },
  types: {
    '@oge-ui/navigation': [
      'OgeBreadcrumbItemData',
      'OgeBreadcrumbItemClickEvent',
    ],
  },
  template: `<!-- The breadcrumb takes no router dependency: derive the trail
     from the URL, keep url crumbs real links (middle-click works) and hand
     the primary click to the router with preventDefault. The last crumb is
     the current page — non-interactive with aria-current="page". -->
<oge-breadcrumb [items]="trail()" (itemClick)="go($event)" />
<router-outlet />`,
  body: `private readonly router = inject(Router);

private readonly url = signal(this.router.url);

/** One crumb per URL segment — the last one is the current page. */
protected readonly trail = computed<OgeBreadcrumbItemData[]>(() => {
  const segments = this.url().split(/[?#]/)[0].split('/').filter(Boolean);
  return segments.map((segment, index) => ({
    text: segment,
    key: segment,
    url: '/' + segments.slice(0, index + 1).join('/'),
  }));
});

constructor() {
  this.router.events.subscribe((event) => {
    if (event instanceof NavigationEnd) this.url.set(event.urlAfterRedirects);
  });
}

protected go(event: OgeBreadcrumbItemClickEvent): void {
  event.event.preventDefault();
  if (event.item.url) void this.router.navigateByUrl(event.item.url);
}`,
});
