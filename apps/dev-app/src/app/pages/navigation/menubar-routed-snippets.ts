import { demoSource } from '../../shared/demo-source';

export const SNIPPET = demoSource({
  use: {
    '@oge-ui/navigation': ['OgeMenubar'],
    '@angular/router': ['RouterOutlet'],
  },
  helpers: { '@angular/router': ['NavigationEnd', 'Router'] },
  types: {
    '@oge-ui/navigation': ['OgeMenubarItemData', 'OgeMenubarItemClickEvent'],
  },
  template: `<!-- The menubar takes no router dependency: bind activeKey
     one-way from the URL (it renders aria-current="page") and navigate in
     itemClick. url items stay real links for middle-click and copy-address;
     preventDefault hands the click to the router instead. -->
<oge-menubar
  [items]="menu"
  [activeKey]="activeKey()"
  (itemClick)="go($event)"
/>
<router-outlet />`,
  body: `private readonly router = inject(Router);

protected readonly menu: OgeMenubarItemData[] = [
  { text: 'Overview', key: 'overview', url: '/app/overview' },
  { text: 'Members', key: 'members', url: '/app/members' },
  {
    text: 'Reports',
    items: [
      { text: 'Monthly', key: 'monthly' },
      { text: 'Annual', key: 'annual' },
    ],
  },
];

private readonly url = signal(this.router.url);

protected readonly activeKey = computed(
  () => this.url().split('/').pop() ?? 'overview',
);

constructor() {
  this.router.events.subscribe((event) => {
    if (event instanceof NavigationEnd) this.url.set(event.urlAfterRedirects);
  });
}

protected go(event: OgeMenubarItemClickEvent): void {
  event.event.preventDefault();
  if (event.key) void this.router.navigate(['/app', event.key]);
}`,
});
