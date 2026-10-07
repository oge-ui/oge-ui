import {
  Component,
  DOCUMENT,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { filter, map } from 'rxjs';
import { OgeSelectBox } from '@oge-ui/inputs/select-box';
import { FrameworkLogo } from './shared/framework-logo';
import { ThemeLogo } from './shared/theme-logo';
import { FrameworkSwitch } from './shared/framework-switch';
import { FrameworkService } from './shared/framework.service';
import { Icon, type IconName } from './shared/icon';
import { SITE_VERSION } from './shared/site-version';
import { VersionMenu } from './shared/version-menu';
import { SeoService } from './shared/seo.service';
import { SearchPalette } from './shared/search/search-palette';
import { SearchService } from './shared/search/search.service';
import { ThemeService, type GridTheme } from './shared/theme.service';

interface NavItem {
  path: string;
  label: string;
  icon: IconName;
  /**
   * Static file served from `public/` rather than an Angular route — rendered
   * as a plain anchor so the browser fetches the file instead of the router
   * trying (and failing) to match it.
   */
  file?: boolean;
  /**
   * Section anchor on a shared page — the navigation family documents all
   * six components on one API page, so each family links to its own part.
   */
  fragment?: string;
}

interface NavSection {
  title: string;
  /**
   * Sections without a group sit at the top of the sidebar; grouped ones render
   * under a shared label. Component families are grouped so the guides stay
   * visible as the suite grows.
   */
  group?: string;
  items: NavItem[];
}

/** A group label plus the sections under it — `null` for the ungrouped lead-in. */
interface NavGroup {
  label: string | null;
  sections: NavSection[];
}

const COMPONENTS_GROUP = 'Components';

@Component({
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    Icon,
    FrameworkSwitch,
    FrameworkLogo,
    ThemeLogo,
    OgeSelectBox,
    VersionMenu,
    SearchPalette,
  ],
  selector: 'app-root',
  templateUrl: './app.html',
  host: { class: 'flex min-h-screen flex-col' },
})
export class App {
  protected readonly version = SITE_VERSION;
  protected readonly framework = inject(FrameworkService);
  private readonly doc = inject(DOCUMENT);

  /** Human label of the active framework, for the brand lockup badge. */
  protected readonly frameworkLabel = computed(
    () =>
      this.framework.frameworks.find(
        (entry) => entry.id === this.framework.framework(),
      )?.label ?? '',
  );

  /**
   * Stamp the active framework on the document so the whole shell can respond
   * in CSS — the accent rail, the brand badge, the switch — without any of
   * them needing a binding. A future vanilla-JavaScript layer inherits this
   * for free.
   */
  private readonly stampFramework = effect(() => {
    // setAttribute rather than `dataset`: the prerender DOM has no dataset.
    this.doc.documentElement.setAttribute(
      'data-framework',
      this.framework.framework(),
    );
  });

  private readonly allSections: NavSection[] = [
    {
      title: 'Getting Started',
      items: [
        { path: '/getting-started', label: 'Introduction', icon: 'book' },
        {
          path: '/getting-started/setup',
          label: 'Set up your project',
          icon: 'package',
        },
        {
          path: '/getting-started/styling',
          label: 'Style the app',
          icon: 'palette',
        },
        {
          path: '/getting-started/tokens',
          label: 'Design tokens',
          icon: 'list',
        },
        {
          path: '/getting-started/theme-builder',
          label: 'Theme builder',
          icon: 'sliders',
        },
        {
          path: '/getting-started/localization',
          label: 'Localization',
          icon: 'globe',
        },
        {
          path: '/getting-started/localization/api',
          label: 'Localization API',
          icon: 'code',
        },
      ],
    },
    {
      title: 'Guides',
      items: [
        { path: '/guides', label: 'All guides', icon: 'lightbulb' },
        {
          path: '/guides/angular-ssr',
          label: 'Angular SSR & zoneless',
          icon: 'layers',
        },
        { path: '/guides/nextjs', label: 'Next.js App Router', icon: 'zap' },
        {
          path: '/guides/build-tools',
          label: 'Vite, Angular CLI, Nx',
          icon: 'package',
        },
        { path: '/guides/testing', label: 'Testing', icon: 'check-square' },
        { path: '/guides/performance', label: 'Performance', icon: 'gauge' },
        {
          path: '/guides/security',
          label: 'CSP & Trusted Types',
          icon: 'shield',
        },
        { path: '/guides/headless', label: 'Headless engines', icon: 'code' },
        {
          path: '/guides/accessibility',
          label: 'Accessibility',
          icon: 'user',
        },
        {
          path: '/guides/accessibility/conformance',
          label: 'Conformance (ACR)',
          icon: 'check',
        },
        { path: '/guides/versioning', label: 'Versioning policy', icon: 'tag' },
      ],
    },
    {
      title: 'AI',
      items: [
        { path: '/ai', label: 'Coding assistants', icon: 'code' },
        { path: '/llms.txt', label: 'llms.txt', icon: 'list', file: true },
        {
          path: '/llms-full.txt',
          label: 'llms-full.txt',
          icon: 'book',
          file: true,
        },
      ],
    },
    {
      title: 'Resources',
      items: [
        { path: '/changelog', label: 'Changelog', icon: 'timeline' },
        { path: '/bundle-size', label: 'Bundle size', icon: 'gauge' },
      ],
    },
    {
      title: 'Data Grid',
      group: COMPONENTS_GROUP,
      items: [
        { path: '/components/data-grid', label: 'Overview', icon: 'table' },
        {
          path: '/components/data-grid/playground',
          label: 'Playground',
          icon: 'sliders',
        },
        {
          path: '/components/data-grid/columns',
          label: 'Columns',
          icon: 'columns',
        },
        {
          path: '/components/data-grid/sorting',
          label: 'Sorting & Paging',
          icon: 'sort',
        },
        {
          path: '/components/data-grid/filtering',
          label: 'Filtering',
          icon: 'filter',
        },
        {
          path: '/components/data-grid/selection',
          label: 'Selection',
          icon: 'check-square',
        },
        {
          path: '/components/data-grid/editing',
          label: 'Editing',
          icon: 'pencil',
        },
        {
          path: '/components/data-grid/grouping',
          label: 'Grouping & Summaries',
          icon: 'layout',
        },
        {
          path: '/components/data-grid/rows',
          label: 'Rows & Templates',
          icon: 'table',
        },
        {
          path: '/components/data-grid/context-menu',
          label: 'Context Menus',
          icon: 'sliders',
        },
        {
          path: '/components/data-grid/persistence',
          label: 'State Persistence',
          icon: 'package',
        },
        {
          path: '/components/data-grid/master-detail',
          label: 'Master-Detail',
          icon: 'pages',
        },
        {
          path: '/components/data-grid/range-selection',
          label: 'Range Selection & Clipboard',
          icon: 'copy',
        },
        {
          path: '/components/data-grid/conditional-formatting',
          label: 'Conditional Formatting',
          icon: 'palette',
        },
        {
          path: '/components/data-grid/pinned-rows',
          label: 'Pinned Rows',
          icon: 'layers',
        },
        {
          path: '/components/data-grid/export',
          label: 'Excel & PDF Export',
          icon: 'copy',
        },
        {
          path: '/components/data-grid/virtual-scroll',
          label: 'Virtual Scroll',
          icon: 'zap',
        },
        {
          path: '/components/data-grid/infinite-scroll',
          label: 'Infinite Scroll',
          icon: 'infinity',
        },
        {
          path: '/components/data-grid/remote-data',
          label: 'Remote Data',
          icon: 'globe',
        },
        {
          path: '/components/data-grid/live-updates',
          label: 'Live Updates',
          icon: 'activity',
        },
        {
          path: '/components/data-grid/api',
          label: 'API Reference',
          icon: 'code',
        },
      ],
    },
    {
      title: 'Tree List',
      group: COMPONENTS_GROUP,
      items: [
        { path: '/components/tree-list', label: 'Overview', icon: 'layout' },
        {
          path: '/components/tree-list/lazy-loading',
          label: 'Lazy Loading',
          icon: 'globe',
        },
        {
          path: '/components/tree-list/filtering',
          label: 'Filtering',
          icon: 'filter',
        },
        {
          path: '/components/tree-list/selection',
          label: 'Selection',
          icon: 'check-square',
        },
        {
          path: '/components/tree-list/virtual-scroll',
          label: 'Virtual Scroll',
          icon: 'zap',
        },
        {
          path: '/components/tree-list/drag-drop',
          label: 'Drag & Drop',
          icon: 'sort',
        },
        {
          path: '/components/tree-list/summaries',
          label: 'Summaries',
          icon: 'layers',
        },
        {
          path: '/components/tree-list/editing',
          label: 'Editing',
          icon: 'pencil',
        },
        {
          path: '/components/tree-list/api',
          label: 'API Reference',
          icon: 'code',
        },
      ],
    },
    {
      title: 'Pivot Grid',
      group: COMPONENTS_GROUP,
      items: [
        { path: '/components/pivot-grid', label: 'Overview', icon: 'gauge' },
        {
          path: '/components/pivot-grid/analytics',
          label: 'Analytics & Export',
          icon: 'activity',
        },
        {
          path: '/components/pivot-grid/chart-integration',
          label: 'Chart Integration',
          icon: 'gauge',
        },
        {
          path: '/components/pivot-grid/calculated-fields',
          label: 'Calculated Fields',
          icon: 'sliders',
        },
        {
          path: '/components/pivot-grid/api',
          label: 'API Reference',
          icon: 'code',
        },
      ],
    },
    {
      title: 'BPMN Editor',
      group: COMPONENTS_GROUP,
      items: [
        { path: '/components/bpmn', label: 'Overview', icon: 'workflow' },
        {
          path: '/components/bpmn/validation',
          label: 'Validation',
          icon: 'check-square',
        },
        {
          path: '/components/bpmn/extending',
          label: 'Extending the editor',
          icon: 'package',
        },
        {
          path: '/components/bpmn/camunda',
          label: 'Camunda / Zeebe',
          icon: 'sliders',
        },
        {
          path: '/components/bpmn/api',
          label: 'API Reference',
          icon: 'code',
        },
      ],
    },
    {
      title: 'Charts',
      group: COMPONENTS_GROUP,
      items: [
        { path: '/components/charts', label: 'Overview', icon: 'activity' },
        {
          path: '/components/charts/axes-layout',
          label: 'Axes & Layout',
          icon: 'layers',
        },
        {
          path: '/components/charts/gauges',
          label: 'Gauges & Sparklines',
          icon: 'gauge',
        },
        {
          path: '/components/charts/specialized',
          label: 'Funnel, Heatmap & Flows',
          icon: 'globe',
        },
        {
          path: '/components/charts/api',
          label: 'API Reference',
          icon: 'code',
        },
      ],
    },
    {
      title: 'Gantt',
      group: COMPONENTS_GROUP,
      items: [
        { path: '/components/gantt', label: 'Overview', icon: 'list' },
        {
          path: '/components/gantt/scheduling',
          label: 'Scheduling & constraints',
          icon: 'calendar',
        },
        {
          path: '/components/gantt/resources',
          label: 'Resources',
          icon: 'layers',
        },
        {
          path: '/components/gantt/task-list',
          label: 'Task list editing',
          icon: 'pencil',
        },
        {
          path: '/components/gantt/import-export',
          label: 'Import / export',
          icon: 'upload',
        },
        {
          path: '/components/gantt/api',
          label: 'API Reference',
          icon: 'code',
        },
      ],
    },
    {
      title: 'Upload',
      group: COMPONENTS_GROUP,
      items: [
        { path: '/components/upload', label: 'Overview', icon: 'upload' },
        {
          path: '/components/upload/api',
          label: 'API Reference',
          icon: 'code',
        },
      ],
    },
    {
      title: 'Rich Text Editor',
      group: COMPONENTS_GROUP,
      items: [
        { path: '/components/editor', label: 'Overview', icon: 'type' },
        {
          path: '/components/editor/api',
          label: 'API Reference',
          icon: 'code',
        },
      ],
    },
    {
      title: 'Kanban',
      group: COMPONENTS_GROUP,
      items: [
        { path: '/components/kanban', label: 'Overview', icon: 'columns' },
        {
          path: '/components/kanban/filtering',
          label: 'Filtering & sorting',
          icon: 'filter',
        },
        {
          path: '/components/kanban/multi-select',
          label: 'Multi-select & cross-board',
          icon: 'layers',
        },
        {
          path: '/components/kanban/api',
          label: 'API Reference',
          icon: 'code',
        },
      ],
    },
    {
      title: 'Scheduler',
      group: COMPONENTS_GROUP,
      items: [
        { path: '/components/scheduler', label: 'Overview', icon: 'calendar' },
        {
          path: '/components/scheduler/views-grouping',
          label: 'Views & grouping',
          icon: 'columns',
        },
        {
          path: '/components/scheduler/resources-availability',
          label: 'Resources & availability',
          icon: 'layers',
        },
        {
          path: '/components/scheduler/recurrence-editor',
          label: 'Recurrence editor',
          icon: 'infinity',
        },
        {
          path: '/components/scheduler/import-export',
          label: 'Import / export',
          icon: 'upload',
        },
        {
          path: '/components/scheduler/time-zones',
          label: 'Time zones',
          icon: 'globe',
        },
        {
          path: '/components/scheduler/remote-data',
          label: 'Remote data',
          icon: 'loader',
        },
        {
          path: '/components/scheduler/api',
          label: 'API Reference',
          icon: 'code',
        },
      ],
    },
    {
      title: 'Buttons',
      group: COMPONENTS_GROUP,
      items: [
        { path: '/components/buttons', label: 'Overview', icon: 'pointer' },
        {
          path: '/components/buttons/interactions',
          label: 'Interactions',
          icon: 'zap',
        },
        {
          path: '/components/buttons/button-group',
          label: 'Button Group',
          icon: 'columns',
        },
        {
          path: '/components/buttons/drop-down-button',
          label: 'Drop Down Button',
          icon: 'chevron-down',
        },
        {
          path: '/components/buttons/fab',
          label: 'FAB & Speed Dial',
          icon: 'plus',
        },
        {
          path: '/components/buttons/api',
          label: 'API Reference',
          icon: 'code',
        },
      ],
    },
    {
      title: 'Avatar & Badge',
      group: COMPONENTS_GROUP,
      items: [
        { path: '/components/avatar', label: 'Overview', icon: 'user' },
        {
          path: '/components/avatar/api',
          label: 'API Reference',
          icon: 'code',
        },
      ],
    },
    {
      title: 'Chip',
      group: COMPONENTS_GROUP,
      items: [
        { path: '/components/chip', label: 'Overview', icon: 'tag' },
        { path: '/components/chip/api', label: 'API Reference', icon: 'code' },
      ],
    },
    {
      title: 'Alert',
      group: COMPONENTS_GROUP,
      items: [
        { path: '/components/alert', label: 'Overview', icon: 'alert' },
        {
          path: '/components/alert/api',
          label: 'API Reference',
          icon: 'code',
        },
      ],
    },
    {
      title: 'Timeline',
      group: COMPONENTS_GROUP,
      items: [
        { path: '/components/timeline', label: 'Overview', icon: 'timeline' },
        {
          path: '/components/timeline/api',
          label: 'API Reference',
          icon: 'code',
        },
      ],
    },
    {
      title: 'Carousel',
      group: COMPONENTS_GROUP,
      items: [
        { path: '/components/carousel', label: 'Overview', icon: 'carousel' },
        {
          path: '/components/carousel/api',
          label: 'API Reference',
          icon: 'code',
        },
      ],
    },
    {
      title: 'Tile Layout',
      group: COMPONENTS_GROUP,
      items: [
        {
          path: '/components/tile-layout',
          label: 'Overview',
          icon: 'dashboard',
        },
        {
          path: '/components/tile-layout/api',
          label: 'API Reference',
          icon: 'code',
        },
      ],
    },
    {
      title: 'Data View',
      group: COMPONENTS_GROUP,
      items: [
        { path: '/components/data-view', label: 'Overview', icon: 'data-view' },
        {
          path: '/components/data-view/api',
          label: 'API Reference',
          icon: 'code',
        },
      ],
    },
    {
      title: 'List View',
      group: COMPONENTS_GROUP,
      items: [
        { path: '/components/list-view', label: 'Overview', icon: 'list-view' },
        {
          path: '/components/list-view/api',
          label: 'API Reference',
          icon: 'code',
        },
      ],
    },
    {
      title: 'App Bar',
      group: COMPONENTS_GROUP,
      items: [
        { path: '/components/app-bar', label: 'Overview', icon: 'app-bar' },
        {
          path: '/components/app-bar/api',
          label: 'API Reference',
          icon: 'code',
        },
      ],
    },
    {
      title: 'Tabs',
      group: COMPONENTS_GROUP,
      items: [
        { path: '/components/tabs', label: 'Overview', icon: 'tabs' },
        {
          path: '/components/tabs/routed',
          label: 'Routed Tabs',
          icon: 'globe',
        },
        { path: '/components/tabs/api', label: 'API Reference', icon: 'code' },
      ],
    },
    {
      title: 'Forms',
      group: COMPONENTS_GROUP,
      items: [
        {
          path: '/components/forms',
          label: 'Overview',
          icon: 'text-cursor',
        },
        {
          path: '/components/forms/layout',
          label: 'Form Layout',
          icon: 'columns',
        },
        {
          path: '/components/forms/validation',
          label: 'Validation',
          icon: 'check-square',
        },
        {
          path: '/components/forms/api',
          label: 'API Reference',
          icon: 'code',
        },
      ],
    },
    {
      title: 'Accordion',
      group: COMPONENTS_GROUP,
      items: [
        {
          path: '/components/accordion',
          label: 'Overview',
          icon: 'accordion',
        },
        {
          path: '/components/accordion/api',
          label: 'API Reference',
          icon: 'code',
        },
      ],
    },
    {
      title: 'Card',
      group: COMPONENTS_GROUP,
      items: [
        {
          path: '/components/card',
          label: 'Overview',
          icon: 'card',
        },
        {
          path: '/components/card/api',
          label: 'API Reference',
          icon: 'code',
        },
      ],
    },
    {
      title: 'Splitter',
      group: COMPONENTS_GROUP,
      items: [
        {
          path: '/components/splitter',
          label: 'Overview',
          icon: 'splitter',
        },
        {
          path: '/components/splitter/api',
          label: 'API Reference',
          icon: 'code',
        },
      ],
    },
    {
      title: 'Toolbar',
      group: COMPONENTS_GROUP,
      items: [
        {
          path: '/components/toolbar',
          label: 'Overview',
          icon: 'toolbar',
        },
        {
          path: '/components/toolbar/api',
          label: 'API Reference',
          icon: 'code',
        },
      ],
    },
    {
      title: 'Stepper',
      group: COMPONENTS_GROUP,
      items: [
        { path: '/components/stepper', label: 'Overview', icon: 'stepper' },
        {
          path: '/components/tree-view/api',
          fragment: 'ogestepper',
          label: 'API Reference',
          icon: 'code',
        },
      ],
    },
    {
      title: 'Drawer',
      group: COMPONENTS_GROUP,
      items: [
        { path: '/components/drawer', label: 'Overview', icon: 'drawer' },
        {
          path: '/components/tree-view/api',
          fragment: 'ogedrawer',
          label: 'API Reference',
          icon: 'code',
        },
      ],
    },
    {
      title: 'Breadcrumb',
      group: COMPONENTS_GROUP,
      items: [
        {
          path: '/components/breadcrumb',
          label: 'Overview',
          icon: 'breadcrumb',
        },
        {
          path: '/components/breadcrumb/routed',
          label: 'Routed Breadcrumb',
          icon: 'globe',
        },
        {
          path: '/components/tree-view/api',
          fragment: 'ogebreadcrumb',
          label: 'API Reference',
          icon: 'code',
        },
      ],
    },
    {
      title: 'Progress & Loading',
      group: COMPONENTS_GROUP,
      items: [
        { path: '/components/progress', label: 'Overview', icon: 'loader' },
        {
          path: '/components/progress/load-panel',
          label: 'Load Panel',
          icon: 'layers',
        },
        {
          path: '/components/progress/api',
          label: 'API Reference',
          icon: 'code',
        },
      ],
    },
    {
      title: 'Pagination',
      group: COMPONENTS_GROUP,
      items: [
        { path: '/components/pagination', label: 'Overview', icon: 'pages' },
        {
          path: '/components/tree-view/api',
          fragment: 'ogepagination',
          label: 'API Reference',
          icon: 'code',
        },
      ],
    },
    {
      title: 'Menubar',
      group: COMPONENTS_GROUP,
      items: [
        { path: '/components/menubar', label: 'Overview', icon: 'menubar' },
        {
          path: '/components/menubar/routed',
          label: 'Routed Menubar',
          icon: 'globe',
        },
        {
          path: '/components/tree-view/api',
          fragment: 'ogemenubar',
          label: 'API Reference',
          icon: 'code',
        },
      ],
    },
    {
      title: 'Tree View',
      group: COMPONENTS_GROUP,
      items: [
        { path: '/components/tree-view', label: 'Overview', icon: 'tree' },
        {
          path: '/components/tree-view/api',
          fragment: 'ogetreeview',
          label: 'API Reference',
          icon: 'code',
        },
      ],
    },
    {
      title: 'Inputs',
      group: COMPONENTS_GROUP,
      items: [
        { path: '/components/inputs', label: 'Overview', icon: 'text-cursor' },
        {
          path: '/components/inputs/validation',
          label: 'Validation',
          icon: 'check-square',
        },
        {
          path: '/components/inputs/masked-text-box',
          label: 'Masked Text Box',
          icon: 'text-cursor',
        },
        {
          path: '/components/inputs/select-box',
          label: 'Select Box',
          icon: 'chevron-down',
        },
        {
          path: '/components/inputs/tree-select',
          label: 'Tree Select',
          icon: 'tree',
        },
        {
          path: '/components/inputs/multi-column-combo-box',
          label: 'Multi-Column ComboBox',
          icon: 'table',
        },
        {
          path: '/components/inputs/autocomplete',
          label: 'Autocomplete',
          icon: 'search',
        },
        {
          path: '/components/inputs/toggle-controls',
          label: 'Toggle Controls',
          icon: 'toggle',
        },
        {
          path: '/components/inputs/check-box-group',
          label: 'Check Box Group',
          icon: 'check-square',
        },
        {
          path: '/components/inputs/slider',
          label: 'Slider',
          icon: 'sliders',
        },
        {
          path: '/components/inputs/date-box',
          label: 'Date Editors',
          icon: 'calendar',
        },
        {
          path: '/components/inputs/color-box',
          label: 'Color Box',
          icon: 'palette',
        },
        {
          path: '/components/inputs/color-gradient',
          label: 'Color Gradient',
          icon: 'palette',
        },
        {
          path: '/components/inputs/color-palette',
          label: 'Color Palette',
          icon: 'palette',
        },
        {
          path: '/components/inputs/rating',
          label: 'Rating',
          icon: 'heart',
        },
        {
          path: '/components/inputs/otp-input',
          label: 'OTP Input',
          icon: 'shield',
        },
        {
          path: '/components/inputs/signature-pad',
          label: 'Signature Pad',
          icon: 'pencil',
        },
        {
          path: '/components/inputs/list-box',
          label: 'List Box',
          icon: 'list',
        },
        {
          path: '/components/inputs/transfer-list',
          label: 'Transfer List',
          icon: 'columns',
        },
        {
          path: '/components/inputs/mention',
          label: 'Mention',
          icon: 'text-cursor',
        },
        {
          path: '/components/inputs/showcase',
          label: 'Showcase',
          icon: 'lightbulb',
        },
        {
          path: '/components/inputs/api',
          label: 'API Reference',
          icon: 'code',
        },
      ],
    },
    {
      title: 'Overlay',
      group: COMPONENTS_GROUP,
      items: [
        { path: '/components/overlay', label: 'Overview', icon: 'layers' },
        {
          path: '/components/overlay/tooltip-context-menu',
          label: 'Tooltip & Context Menu',
          icon: 'pointer',
        },
        {
          path: '/components/overlay/popover',
          label: 'Popover',
          icon: 'layers',
        },
        {
          path: '/components/overlay/action-sheet',
          label: 'Action Sheet',
          icon: 'list',
        },
        {
          path: '/components/overlay/modal',
          label: 'Modal',
          icon: 'layout',
        },
        {
          path: '/components/overlay/toast',
          label: 'Toast',
          icon: 'zap',
        },
        {
          path: '/components/overlay/window',
          label: 'Window',
          icon: 'copy',
        },
        {
          path: '/components/overlay/api',
          label: 'API Reference',
          icon: 'code',
        },
      ],
    },
  ];

  private readonly router = inject(Router);
  /** Instantiates the root SEO service (canonical + meta per route). */
  private readonly seo = inject(SeoService);

  /** Landing page renders full-bleed without the docs sidebar shell. */
  private readonly path = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects.split(/[?#]/)[0]),
    ),
    { initialValue: inject(DOCUMENT).location?.pathname ?? '/' },
  );

  protected readonly isHome = computed(() => this.path() === '/');

  protected readonly themeService = inject(ThemeService);
  protected readonly themes: { value: GridTheme; label: string }[] = [
    { value: 'default', label: 'Default' },
    { value: 'high-contrast', label: 'High contrast' },
    { value: 'tailwind', label: 'Tailwind' },
    { value: 'bootstrap', label: 'Bootstrap' },
  ];

  protected readonly navQuery = signal('');

  /**
   * Component families start collapsed — nine expanded families would bury the
   * guides under hundreds of pixels of links. The family you are actually
   * reading opens itself (see the effect below); the guides stay open.
   */
  protected readonly collapsed = signal<ReadonlySet<string>>(
    new Set(
      this.allSections
        .filter((section) => section.group === COMPONENTS_GROUP)
        .map((section) => section.title),
    ),
  );

  /** True once the page is scrolled — the header then settles onto its rule. */
  protected readonly scrolled = signal(false);

  /** Ctrl/⌘K palette — the palette itself is deferred (see app.html). */
  protected readonly search = inject(SearchService);

  /**
   * The shortcut hint on the search button. The prerender cannot know the
   * reader's platform, so it renders "Ctrl K" and Apple devices swap in "⌘K"
   * after hydration.
   */
  protected readonly searchShortcut = signal('Ctrl K');

  constructor() {
    if (typeof window !== 'undefined') {
      this.search.listen();
      afterNextRender(() => {
        if (/Mac|iPhone|iPad/.test(navigator.userAgent)) {
          this.searchShortcut.set('⌘K');
        }
      });
      const onScroll = (): void => {
        const isScrolled = window.scrollY > 4;
        if (isScrolled !== this.scrolled()) this.scrolled.set(isScrolled);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }
  }

  /**
   * Opens the family that owns the current page. Runs on every navigation so a
   * deep link lands with its section expanded, but never re-closes anything the
   * reader opened by hand.
   */
  private readonly revealActiveSection = effect(() => {
    const path = this.path();
    const active = this.allSections.find((section) =>
      section.items.some((item) => item.path === path),
    );
    if (!active) return;
    untracked(() => {
      if (!this.collapsed().has(active.title)) return;
      const next = new Set(this.collapsed());
      next.delete(active.title);
      this.collapsed.set(next);
    });
  });

  protected toggleSection(title: string): void {
    const next = new Set(this.collapsed());
    if (!next.delete(title)) next.add(title);
    this.collapsed.set(next);
  }

  private readonly sections = computed<NavSection[]>(() => {
    const query = this.navQuery().trim().toLocaleLowerCase();
    if (!query) return this.allSections;
    return this.allSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) =>
          item.label.toLocaleLowerCase().includes(query),
        ),
      }))
      .filter((section) => section.items.length > 0);
  });

  /**
   * Sidebar layout: ungrouped guides first, then one labelled group per family
   * bucket. Component families are sorted A→Z so a new one lands in a
   * predictable place instead of at the bottom.
   */
  protected readonly navGroups = computed<NavGroup[]>(() => {
    const groups: NavGroup[] = [];
    for (const section of this.sections()) {
      const label = section.group ?? null;
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.sections.push(section);
      else groups.push({ label, sections: [section] });
    }
    for (const group of groups) {
      if (group.label === null) continue;
      group.sections.sort((a, b) => a.title.localeCompare(b.title));
    }
    return groups;
  });
}
