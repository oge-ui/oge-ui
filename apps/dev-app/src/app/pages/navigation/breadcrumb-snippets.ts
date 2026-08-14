import { demoSource } from '../../shared/demo-source';

export const BASIC_SNIPPET = demoSource({
  use: { '@oge-ui/navigation': ['OgeBreadcrumb'] },
  types: {
    '@oge-ui/navigation': [
      'OgeBreadcrumbItemData',
      'OgeBreadcrumbItemClickEvent',
    ],
  },
  template: `<!-- The APG breadcrumb: a nav landmark holding an ordered list of
     links, the current page carrying aria-current="page". The last crumb is
     never interactive — you are already there — and disabled crumbs stay
     visible but inert. No roving tabindex: the APG defines no keyboard
     behavior for a breadcrumb, so none is invented. -->
<oge-breadcrumb [items]="trail" (itemClick)="go($event)" />`,
  body: `protected readonly trail: OgeBreadcrumbItemData[] = [
  { text: 'Home', key: 'home', url: '/', icon: 'M2 8 8 2l6 6M4 7v7h8V7' },
  { text: 'Products', key: 'products', url: '/products' },
  { text: 'Keyboards', key: 'keyboards', url: '/products/keyboards' },
  { text: 'Mechanical' },
];

protected go(event: OgeBreadcrumbItemClickEvent): void {
  console.log(event.key, event.index);
}`,
});

export const DECLARATIVE_SNIPPET = demoSource({
  use: { '@oge-ui/navigation': ['OgeBreadcrumb', 'OgeBreadcrumbItem'] },
  template: `<!-- Declarative children come first, then the items input — the
     house merge order. A flat list, never nested. -->
<oge-breadcrumb>
  <oge-breadcrumb-item text="Home" key="home" url="/" />
  <oge-breadcrumb-item text="Reports" key="reports" url="/reports" />
  <oge-breadcrumb-item text="Q3 summary" />
</oge-breadcrumb>`,
});

export const COLLAPSE_SNIPPET = demoSource({
  use: { '@oge-ui/navigation': ['OgeBreadcrumb'] },
  types: { '@oge-ui/navigation': ['OgeBreadcrumbItemData'] },
  template: `<!-- collapseMode 'auto' (default) measures the breadcrumb's OWN
     container, never the window. When room runs out the OLDEST middle crumbs
     collapse first — first and last always stay visible — and unlike the
     references the collapsed crumbs remain reachable: the ellipsis opens
     them as real links. 'wrap' breaks onto rows, 'none' keeps one
     scrollable row. -->
<oge-breadcrumb [items]="trail" collapseMode="auto" />`,
  body: `protected readonly trail: OgeBreadcrumbItemData[] = [
  { text: 'Home', url: '/' },
  { text: 'Products', url: '/products' },
  { text: 'Peripherals', url: '/products/peripherals' },
  { text: 'Keyboards', url: '/products/keyboards' },
  { text: 'Mechanical' },
];`,
});

export const TEMPLATES_SNIPPET = demoSource({
  use: {
    '@oge-ui/navigation': [
      'OgeBreadcrumb',
      'OgeBreadcrumbItemTemplate',
      'OgeBreadcrumbSeparatorTemplate',
    ],
  },
  types: { '@oge-ui/navigation': ['OgeBreadcrumbItemData'] },
  template: `<!-- The item template replaces the crumb's interior only — the
     link/current/disabled element semantics stay with the component. The
     separator template renders aria-hidden: a separator is decoration. -->
<oge-breadcrumb [items]="trail">
  <ng-template ogeBreadcrumbItemTemplate let-item let-last="last">
    <strong [style.opacity]="last ? 1 : 0.75">{{ item.text }}</strong>
  </ng-template>
  <ng-template ogeBreadcrumbSeparatorTemplate>·</ng-template>
</oge-breadcrumb>`,
  body: `protected readonly trail: OgeBreadcrumbItemData[] = [
  { text: 'Home', url: '/' },
  { text: 'Library', url: '/library' },
  { text: 'Data' },
];`,
});

export const CONFIG_SNIPPET = demoSource({
  use: { '@oge-ui/navigation': ['OgeBreadcrumb'] },
  helpers: { '@oge-ui/navigation': ['provideOgeBreadcrumbConfig'] },
  types: { '@oge-ui/navigation': ['OgeBreadcrumbItemData'] },
  template: `<oge-breadcrumb [items]="trail" />`,
  body: `protected readonly trail: OgeBreadcrumbItemData[] = [
  { text: 'Giriş', url: '/' },
  { text: 'Raporlar' },
];`,
  before: `// Every user-facing string lives in the messages block — the nav
// landmark's label and the ellipsis button's label included.
export const BREADCRUMB_PROVIDERS = [
  provideOgeBreadcrumbConfig({
    collapseMode: 'auto',
    messages: { breadcrumb: 'İçerik haritası', collapsed: 'Gizli öğeleri göster' },
  }),
];`,
});
