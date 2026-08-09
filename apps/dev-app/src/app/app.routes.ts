import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./pages/home/home').then((m) => m.HomePage),
    title: 'OGE — Angular UI components',
  },
  {
    path: 'getting-started',
    loadComponent: () =>
      import('./pages/getting-started/getting-started').then(
        (m) => m.GettingStartedPage,
      ),
    title: 'OGE — Getting Started',
  },
  {
    path: 'getting-started/setup',
    loadComponent: () =>
      import('./pages/getting-started/setup').then(
        (m) => m.GettingStartedSetupPage,
      ),
    title: 'OGE — Set up your project',
  },
  {
    path: 'getting-started/styling',
    loadComponent: () =>
      import('./pages/getting-started/styling').then(
        (m) => m.GettingStartedStylingPage,
      ),
    title: 'OGE — Style the app',
  },
  {
    path: 'ai',
    loadComponent: () =>
      import('./pages/ai/overview').then((m) => m.AiOverviewPage),
    title: 'OGE — AI coding assistants',
  },
  {
    path: 'getting-started/localization',
    loadComponent: () =>
      import('./pages/getting-started/localization').then(
        (m) => m.GettingStartedLocalizationPage,
      ),
    title: 'OGE — Localization',
  },
  {
    path: 'components',
    pathMatch: 'full',
    loadComponent: () =>
      import('./pages/components/components').then(
        (m) => m.ComponentsIndexPage,
      ),
    title: 'OGE — Components',
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
        title: 'OGE — Data Grid',
      },
      {
        path: 'playground',
        loadComponent: () =>
          import('./pages/playground/playground').then((m) => m.PlaygroundPage),
        title: 'OGE — Data Grid Playground',
      },
      {
        path: 'sorting',
        loadComponent: () =>
          import('./pages/sorting/sorting').then((m) => m.SortingPage),
        title: 'OGE — Data Grid Sorting & Paging',
      },
      {
        path: 'virtual-scroll',
        loadComponent: () =>
          import('./pages/virtual-scroll/virtual-scroll').then(
            (m) => m.VirtualScrollPage,
          ),
        title: 'OGE — Data Grid Virtual Scroll',
      },
      {
        path: 'infinite-scroll',
        loadComponent: () =>
          import('./pages/infinite-scroll/infinite-scroll').then(
            (m) => m.InfiniteScrollPage,
          ),
        title: 'OGE — Data Grid Infinite Scroll',
      },
      {
        path: 'remote-data',
        loadComponent: () =>
          import('./pages/remote-data/remote-data').then(
            (m) => m.RemoteDataPage,
          ),
        title: 'OGE — Data Grid Remote Data',
      },
      {
        path: 'live-updates',
        loadComponent: () =>
          import('./pages/live-updates/live-updates').then(
            (m) => m.LiveUpdatesPage,
          ),
        title: 'OGE — Data Grid Live Updates',
      },
      {
        path: 'columns',
        loadComponent: () =>
          import('./pages/data-grid/columns').then((m) => m.ColumnsPage),
        title: 'OGE — Data Grid Columns',
      },
      {
        path: 'filtering',
        loadComponent: () =>
          import('./pages/data-grid/filtering').then((m) => m.FilteringPage),
        title: 'OGE — Data Grid Filtering',
      },
      {
        path: 'selection',
        loadComponent: () =>
          import('./pages/data-grid/selection').then((m) => m.SelectionPage),
        title: 'OGE — Data Grid Selection',
      },
      {
        path: 'editing',
        loadComponent: () =>
          import('./pages/data-grid/editing').then((m) => m.EditingPage),
        title: 'OGE — Data Grid Editing',
      },
      {
        path: 'grouping',
        loadComponent: () =>
          import('./pages/data-grid/grouping').then((m) => m.GroupingPage),
        title: 'OGE — Data Grid Grouping',
      },
      {
        path: 'rows',
        loadComponent: () =>
          import('./pages/data-grid/rows').then((m) => m.RowsPage),
        title: 'OGE — Data Grid Rows & Templates',
      },
      {
        path: 'persistence',
        loadComponent: () =>
          import('./pages/data-grid/persistence').then(
            (m) => m.PersistencePage,
          ),
        title: 'OGE — Data Grid State Persistence',
      },
      {
        path: 'context-menu',
        loadComponent: () =>
          import('./pages/data-grid/context-menu').then(
            (m) => m.ContextMenuPage,
          ),
        title: 'OGE — Data Grid Context Menus',
      },
      {
        path: 'master-detail',
        loadComponent: () =>
          import('./pages/data-grid/master-detail').then(
            (m) => m.MasterDetailPage,
          ),
        title: 'OGE — Data Grid Master-Detail',
      },
      {
        path: 'api',
        loadComponent: () =>
          import('./pages/data-grid/api').then((m) => m.DataGridApiPage),
        title: 'OGE — Data Grid API',
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
        title: 'OGE — Tree List',
      },
      {
        path: 'lazy-loading',
        loadComponent: () =>
          import('./pages/tree-list/lazy-loading').then((m) => m.TreeLazyPage),
        title: 'OGE — Tree List Lazy Loading',
      },
      {
        path: 'filtering',
        loadComponent: () =>
          import('./pages/tree-list/filtering').then(
            (m) => m.TreeFilteringPage,
          ),
        title: 'OGE — Tree List Filtering',
      },
      {
        path: 'selection',
        loadComponent: () =>
          import('./pages/tree-list/selection').then(
            (m) => m.TreeSelectionPage,
          ),
        title: 'OGE — Tree List Selection',
      },
      {
        path: 'virtual-scroll',
        loadComponent: () =>
          import('./pages/tree-list/virtual-scroll').then(
            (m) => m.TreeVirtualPage,
          ),
        title: 'OGE — Tree List Virtual Scroll',
      },
      {
        path: 'drag-drop',
        loadComponent: () =>
          import('./pages/tree-list/drag-drop').then((m) => m.TreeDragPage),
        title: 'OGE — Tree List Drag & Drop',
      },
      {
        path: 'editing',
        loadComponent: () =>
          import('./pages/tree-list/editing').then((m) => m.TreeEditingPage),
        title: 'OGE — Tree List Editing',
      },
      {
        path: 'api',
        loadComponent: () =>
          import('./pages/tree-list/api').then((m) => m.TreeListApiPage),
        title: 'OGE — Tree List API',
      },
    ],
  },
  {
    path: 'components/buttons',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/buttons/overview').then((m) => m.ButtonsOverviewPage),
        title: 'OGE — Buttons',
      },
      {
        path: 'interactions',
        loadComponent: () =>
          import('./pages/buttons/interactions').then(
            (m) => m.ButtonsInteractionsPage,
          ),
        title: 'OGE — Button Interactions',
      },
      {
        path: 'button-group',
        loadComponent: () =>
          import('./pages/buttons/button-group').then(
            (m) => m.ButtonsGroupPage,
          ),
        title: 'OGE — Button Group',
      },
      {
        path: 'drop-down-button',
        loadComponent: () =>
          import('./pages/buttons/drop-down-button').then(
            (m) => m.ButtonsDropDownPage,
          ),
        title: 'OGE — Drop Down Button',
      },
      {
        path: 'api',
        loadComponent: () =>
          import('./pages/buttons/api').then((m) => m.ButtonsApiPage),
        title: 'OGE — Buttons API',
      },
    ],
  },
  {
    path: 'components/tabs',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/tabs/overview').then((m) => m.TabsOverviewPage),
        title: 'OGE — Tabs',
      },
      {
        path: 'routed',
        loadComponent: () =>
          import('./pages/tabs/routed').then((m) => m.TabsRoutedPage),
        title: 'OGE — Routed Tabs',
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'overview' },
          {
            path: 'overview',
            loadComponent: () =>
              import('./pages/tabs/routed').then((m) => m.TabsRoutedOverview),
          },
          {
            path: 'members',
            loadComponent: () =>
              import('./pages/tabs/routed').then((m) => m.TabsRoutedMembers),
          },
          {
            path: 'settings',
            loadComponent: () =>
              import('./pages/tabs/routed').then((m) => m.TabsRoutedSettings),
          },
        ],
      },
      {
        path: 'api',
        loadComponent: () =>
          import('./pages/tabs/api').then((m) => m.TabsApiPage),
        title: 'OGE — Tabs API',
      },
    ],
  },
  {
    path: 'components/forms',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/forms/overview').then((m) => m.FormsOverviewPage),
        title: 'OGE — Form',
      },
      {
        path: 'layout',
        loadComponent: () =>
          import('./pages/forms/layout').then((m) => m.FormsLayoutPage),
        title: 'OGE — Form Layout',
      },
      {
        path: 'validation',
        loadComponent: () =>
          import('./pages/forms/validation').then((m) => m.FormsValidationPage),
        title: 'OGE — Form Validation',
      },
      {
        path: 'api',
        loadComponent: () =>
          import('./pages/forms/api').then((m) => m.FormsApiPage),
        title: 'OGE — Forms API',
      },
    ],
  },
  {
    path: 'components/accordion',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/layout/overview').then((m) => m.LayoutOverviewPage),
        title: 'OGE — Accordion',
      },
      {
        path: 'api',
        loadComponent: () =>
          import('./pages/layout/api').then((m) => m.LayoutApiPage),
        title: 'OGE — Accordion API',
      },
    ],
  },
  {
    path: 'components/card',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/layout/card').then((m) => m.LayoutCardPage),
        title: 'OGE — Card',
      },
      {
        path: 'api',
        loadComponent: () =>
          import('./pages/layout/card-api').then((m) => m.LayoutCardApiPage),
        title: 'OGE — Card API',
      },
    ],
  },
  {
    path: 'components/splitter',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/layout/splitter').then((m) => m.LayoutSplitterPage),
        title: 'OGE — Splitter',
      },
      {
        path: 'api',
        loadComponent: () =>
          import('./pages/layout/splitter-api').then(
            (m) => m.LayoutSplitterApiPage,
          ),
        title: 'OGE — Splitter API',
      },
    ],
  },
  {
    path: 'components/toolbar',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/layout/toolbar').then((m) => m.LayoutToolbarPage),
        title: 'OGE — Toolbar',
      },
      {
        path: 'api',
        loadComponent: () =>
          import('./pages/layout/toolbar-api').then(
            (m) => m.LayoutToolbarApiPage,
          ),
        title: 'OGE — Toolbar API',
      },
    ],
  },
  {
    path: 'components/stepper',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/navigation/stepper').then(
            (m) => m.NavigationStepperPage,
          ),
        title: 'OGE — Stepper',
      },
    ],
  },
  {
    path: 'components/drawer',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/navigation/drawer').then(
            (m) => m.NavigationDrawerPage,
          ),
        title: 'OGE — Drawer',
      },
    ],
  },
  {
    path: 'components/tree-view',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/navigation/overview').then(
            (m) => m.NavigationOverviewPage,
          ),
        title: 'OGE — Tree View',
      },
      {
        path: 'api',
        loadComponent: () =>
          import('./pages/navigation/api').then((m) => m.NavigationApiPage),
        title: 'OGE — Tree View API',
      },
    ],
  },
  {
    path: 'components/inputs',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/inputs/overview').then((m) => m.InputsOverviewPage),
        title: 'OGE — Inputs',
      },
      {
        path: 'validation',
        loadComponent: () =>
          import('./pages/inputs/validation').then(
            (m) => m.InputsValidationPage,
          ),
        title: 'OGE — Input Validation',
      },
      {
        path: 'select-box',
        loadComponent: () =>
          import('./pages/inputs/select-box').then(
            (m) => m.InputsSelectBoxPage,
          ),
        title: 'OGE — Select Box',
      },
      {
        path: 'tree-select',
        loadComponent: () =>
          import('./pages/inputs/tree-select').then(
            (m) => m.InputsTreeSelectPage,
          ),
        title: 'OGE — Tree Select',
      },
      {
        path: 'autocomplete',
        loadComponent: () =>
          import('./pages/inputs/autocomplete').then(
            (m) => m.InputsAutocompletePage,
          ),
        title: 'OGE — Autocomplete',
      },
      {
        path: 'toggle-controls',
        loadComponent: () =>
          import('./pages/inputs/toggle-controls').then(
            (m) => m.InputsToggleControlsPage,
          ),
        title: 'OGE — Toggle Controls',
      },
      {
        path: 'date-box',
        loadComponent: () =>
          import('./pages/inputs/date-box').then((m) => m.InputsDateBoxPage),
        title: 'OGE — Date Editors',
      },
      {
        path: 'showcase',
        loadComponent: () =>
          import('./pages/inputs/showcase').then((m) => m.InputsShowcasePage),
        title: 'OGE — Input Showcase',
      },
      {
        path: 'api',
        loadComponent: () =>
          import('./pages/inputs/api').then((m) => m.InputsApiPage),
        title: 'OGE — Inputs API',
      },
    ],
  },
  {
    path: 'components/overlay',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/overlay/overview').then((m) => m.OverlayOverviewPage),
        title: 'OGE — Overlay',
      },
      {
        path: 'tooltip-context-menu',
        loadComponent: () =>
          import('./pages/overlay/tooltip-context-menu').then(
            (m) => m.OverlayTooltipContextMenuPage,
          ),
        title: 'OGE — Tooltip & Context Menu',
      },
      {
        path: 'modal',
        loadComponent: () =>
          import('./pages/overlay/modal').then((m) => m.OverlayModalPage),
        title: 'OGE — Modal',
      },
      {
        path: 'toast',
        loadComponent: () =>
          import('./pages/overlay/toast').then((m) => m.OverlayToastPage),
        title: 'OGE — Toast',
      },
      {
        path: 'api',
        loadComponent: () =>
          import('./pages/overlay/api').then((m) => m.OverlayApiPage),
        title: 'OGE — Overlay API',
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
        title: 'OGE — Pivot Grid',
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import('./pages/pivot-grid/analytics').then(
            (m) => m.PivotAnalyticsPage,
          ),
        title: 'OGE — Pivot Analytics & Export',
      },
      {
        path: 'api',
        loadComponent: () =>
          import('./pages/pivot-grid/api').then((m) => m.PivotGridApiPage),
        title: 'OGE — Pivot Grid API',
      },
    ],
  },
  {
    path: 'license',
    loadComponent: () =>
      import('./pages/license/license').then((m) => m.LicensePage),
    title: 'OGE — Licensing',
  },
  // legacy redirects
  { path: 'basic-grid', redirectTo: 'components/data-grid' },
  { path: 'playground', redirectTo: 'components/data-grid/playground' },
  { path: 'sorting', redirectTo: 'components/data-grid/sorting' },
  { path: 'virtual-scroll', redirectTo: 'components/data-grid/virtual-scroll' },
  { path: 'remote-data', redirectTo: 'components/data-grid/remote-data' },
];
