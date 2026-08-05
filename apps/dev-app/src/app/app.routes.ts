import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: 'getting-started' },
  {
    path: 'getting-started',
    loadComponent: () =>
      import('./pages/getting-started/getting-started').then((m) => m.GettingStartedPage),
    title: 'oge — Getting Started',
  },
  {
    path: 'components/data-grid',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/data-grid/overview').then((m) => m.DataGridOverviewPage),
        title: 'oge — Data Grid',
      },
      {
        path: 'playground',
        loadComponent: () => import('./pages/playground/playground').then((m) => m.PlaygroundPage),
        title: 'oge — Data Grid Playground',
      },
      {
        path: 'sorting',
        loadComponent: () => import('./pages/sorting/sorting').then((m) => m.SortingPage),
        title: 'oge — Data Grid Sorting & Paging',
      },
      {
        path: 'virtual-scroll',
        loadComponent: () =>
          import('./pages/virtual-scroll/virtual-scroll').then((m) => m.VirtualScrollPage),
        title: 'oge — Data Grid Virtual Scroll',
      },
      {
        path: 'infinite-scroll',
        loadComponent: () =>
          import('./pages/infinite-scroll/infinite-scroll').then((m) => m.InfiniteScrollPage),
        title: 'oge — Data Grid Infinite Scroll',
      },
      {
        path: 'remote-data',
        loadComponent: () =>
          import('./pages/remote-data/remote-data').then((m) => m.RemoteDataPage),
        title: 'oge — Data Grid Remote Data',
      },
      {
        path: 'live-updates',
        loadComponent: () =>
          import('./pages/live-updates/live-updates').then((m) => m.LiveUpdatesPage),
        title: 'oge — Data Grid Live Updates',
      },
      {
        path: 'columns',
        loadComponent: () => import('./pages/data-grid/columns').then((m) => m.ColumnsPage),
        title: 'oge — Data Grid Columns',
      },
      {
        path: 'filtering',
        loadComponent: () => import('./pages/data-grid/filtering').then((m) => m.FilteringPage),
        title: 'oge — Data Grid Filtering',
      },
      {
        path: 'selection',
        loadComponent: () => import('./pages/data-grid/selection').then((m) => m.SelectionPage),
        title: 'oge — Data Grid Selection',
      },
      {
        path: 'editing',
        loadComponent: () => import('./pages/data-grid/editing').then((m) => m.EditingPage),
        title: 'oge — Data Grid Editing',
      },
      {
        path: 'grouping',
        loadComponent: () => import('./pages/data-grid/grouping').then((m) => m.GroupingPage),
        title: 'oge — Data Grid Grouping',
      },
      {
        path: 'master-detail',
        loadComponent: () =>
          import('./pages/data-grid/master-detail').then((m) => m.MasterDetailPage),
        title: 'oge — Data Grid Master-Detail',
      },
    ],
  },
  // legacy redirects
  { path: 'basic-grid', redirectTo: 'components/data-grid' },
  { path: 'playground', redirectTo: 'components/data-grid/playground' },
  { path: 'sorting', redirectTo: 'components/data-grid/sorting' },
  { path: 'virtual-scroll', redirectTo: 'components/data-grid/virtual-scroll' },
  { path: 'remote-data', redirectTo: 'components/data-grid/remote-data' },
];
