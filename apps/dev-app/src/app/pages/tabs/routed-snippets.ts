import { demoSource } from '../../shared/demo-source';

export const SNIPPET = demoSource({
  use: {
    '@angular/router': ['RouterOutlet'],
    '@oge-ui/tabs': ['OgeTabs'],
  },
  helpers: {
    '@angular/core/rxjs-interop': ['toSignal'],
    '@angular/router': ['NavigationEnd', 'Router'],
    rxjs: ['filter', 'map'],
  },
  types: { '@oge-ui/tabs': ['OgeTabItem', 'OgeTabSelectionChangedEvent'] },
  template: `<oge-tabs
  [items]="tabs"
  [selectedKey]="activeKey()"
  (selectionChanged)="go($event)"
  ariaLabel="Project sections"
/>
<router-outlet />`,
  body: `protected readonly tabs: OgeTabItem[] = [
  { key: 'overview', text: 'Overview' },
  { key: 'activity', text: 'Activity' },
  { key: 'settings', text: 'Settings' },
];

// the URL is the single source of truth
private readonly router = inject(Router);
private readonly url = toSignal(
  this.router.events.pipe(
    filter((e): e is NavigationEnd => e instanceof NavigationEnd),
    map((e) => e.urlAfterRedirects),
  ),
  { initialValue: this.router.url },
);

protected readonly activeKey = computed(() => {
  const segment = this.url().split(/[?#]/)[0].split('/').pop() ?? '';
  return this.tabs.some((t) => t.key === segment) ? segment : 'overview';
});

protected go(event: OgeTabSelectionChangedEvent): void {
  if (event.key) {
    void this.router.navigate(['/components/tabs/routed', event.key]);
  }
}`,
});
