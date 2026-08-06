import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: 'getting-started' },
  {
    path: 'getting-started',
    loadComponent: () =>
      import('./pages/getting-started/getting-started').then(
        (m) => m.GettingStartedPage,
      ),
    title: 'oge — Getting Started',
  },
  {
    path: 'components/data-grid',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/data-grid/overview').then(
            (m) => m.DataGridOverviewPage,
          ),
        title: 'oge — Data Grid',
      },
      {
        path: 'playground',
        loadComponent: () =>
          import('./pages/playground/playground').then((m) => m.PlaygroundPage),
        title: 'oge — Data Grid Playground',
      },
      {
        path: 'sorting',
        loadComponent: () =>
          import('./pages/sorting/sorting').then((m) => m.SortingPage),
        title: 'oge — Data Grid Sorting & Paging',
      },
      {
        path: 'virtual-scroll',
        loadComponent: () =>
          import('./pages/virtual-scroll/virtual-scroll').then(
            (m) => m.VirtualScrollPage,
          ),
        title: 'oge — Data Grid Virtual Scroll',
      },
      {
        path: 'infinite-scroll',
        loadComponent: () =>
          import('./pages/infinite-scroll/infinite-scroll').then(
            (m) => m.InfiniteScrollPage,
          ),
        title: 'oge — Data Grid Infinite Scroll',
      },
      {
        path: 'remote-data',
        loadComponent: () =>
          import('./pages/remote-data/remote-data').then(
            (m) => m.RemoteDataPage,
          ),
        title: 'oge — Data Grid Remote Data',
      },
      {
        path: 'live-updates',
        loadComponent: () =>
          import('./pages/live-updates/live-updates').then(
            (m) => m.LiveUpdatesPage,
          ),
        title: 'oge — Data Grid Live Updates',
      },
      {
        path: 'columns',
        loadComponent: () =>
          import('./pages/data-grid/columns').then((m) => m.ColumnsPage),
        title: 'oge — Data Grid Columns',
      },
      {
        path: 'filtering',
        loadComponent: () =>
          import('./pages/data-grid/filtering').then((m) => m.FilteringPage),
        title: 'oge — Data Grid Filtering',
      },
      {
        path: 'selection',
        loadComponent: () =>
          import('./pages/data-grid/selection').then((m) => m.SelectionPage),
        title: 'oge — Data Grid Selection',
      },
      {
        path: 'editing',
        loadComponent: () =>
          import('./pages/data-grid/editing').then((m) => m.EditingPage),
        title: 'oge — Data Grid Editing',
      },
      {
        path: 'grouping',
        loadComponent: () =>
          import('./pages/data-grid/grouping').then((m) => m.GroupingPage),
        title: 'oge — Data Grid Grouping',
      },
      {
        path: 'rows',
        loadComponent: () =>
          import('./pages/data-grid/rows').then((m) => m.RowsPage),
        title: 'oge — Data Grid Rows & Templates',
      },
      {
        path: 'persistence',
        loadComponent: () =>
          import('./pages/data-grid/persistence').then(
            (m) => m.PersistencePage,
          ),
        title: 'oge — Data Grid State Persistence',
      },
      {
        path: 'context-menu',
        loadComponent: () =>
          import('./pages/data-grid/context-menu').then(
            (m) => m.ContextMenuPage,
          ),
        title: 'oge — Data Grid Context Menus',
      },
      {
        path: 'master-detail',
        loadComponent: () =>
          import('./pages/data-grid/master-detail').then(
            (m) => m.MasterDetailPage,
          ),
        title: 'oge — Data Grid Master-Detail',
      },
    ],
  },
  {
    path: 'components/tree-list',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/tree-list/overview').then((m) => m.TreeOverviewPage),
        title: 'oge — Tree List',
      },
      {
        path: 'lazy-loading',
        loadComponent: () =>
          import('./pages/tree-list/lazy-loading').then((m) => m.TreeLazyPage),
        title: 'oge — Tree List Lazy Loading',
      },
      {
        path: 'filtering',
        loadComponent: () =>
          import('./pages/tree-list/filtering').then(
            (m) => m.TreeFilteringPage,
          ),
        title: 'oge — Tree List Filtering',
      },
      {
        path: 'selection',
        loadComponent: () =>
          import('./pages/tree-list/selection').then(
            (m) => m.TreeSelectionPage,
          ),
        title: 'oge — Tree List Selection',
      },
      {
        path: 'virtual-scroll',
        loadComponent: () =>
          import('./pages/tree-list/virtual-scroll').then(
            (m) => m.TreeVirtualPage,
          ),
        title: 'oge — Tree List Virtual Scroll',
      },
      {
        path: 'drag-drop',
        loadComponent: () =>
          import('./pages/tree-list/drag-drop').then((m) => m.TreeDragPage),
        title: 'oge — Tree List Drag & Drop',
      },
      {
        path: 'editing',
        loadComponent: () =>
          import('./pages/tree-list/editing').then((m) => m.TreeEditingPage),
        title: 'oge — Tree List Editing',
      },
    ],
  },
  {
    path: 'components/pivot-grid',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/pivot-grid/overview').then(
            (m) => m.PivotOverviewPage,
          ),
        title: 'oge — Pivot Grid',
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import('./pages/pivot-grid/analytics').then(
            (m) => m.PivotAnalyticsPage,
          ),
        title: 'oge — Pivot Analytics & Export',
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
