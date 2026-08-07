import { Component, DOCUMENT, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { filter, map } from 'rxjs';
import { Icon, type IconName } from './shared/icon';
import { SITE_VERSION } from './shared/site-version';
import { SeoService } from './shared/seo.service';
import { ThemeService, type GridTheme } from './shared/theme.service';

interface NavItem {
  path: string;
  label: string;
  icon: IconName;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon],
  selector: 'app-root',
  templateUrl: './app.html',
  host: { class: 'flex min-h-screen flex-col' },
})
export class App {
  protected readonly version = SITE_VERSION;

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
          path: '/getting-started/localization',
          label: 'Localization',
          icon: 'globe',
        },
      ],
    },
    {
      title: 'Data Grid',
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
      items: [
        { path: '/components/pivot-grid', label: 'Overview', icon: 'gauge' },
        {
          path: '/components/pivot-grid/analytics',
          label: 'Analytics & Export',
          icon: 'activity',
        },
        {
          path: '/components/pivot-grid/api',
          label: 'API Reference',
          icon: 'code',
        },
      ],
    },
    {
      title: 'Buttons',
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
          path: '/components/buttons/api',
          label: 'API Reference',
          icon: 'code',
        },
      ],
    },
    {
      title: 'Inputs',
      items: [
        { path: '/components/inputs', label: 'Overview', icon: 'text-cursor' },
        {
          path: '/components/inputs/validation',
          label: 'Validation',
          icon: 'check-square',
        },
        {
          path: '/components/inputs/select-box',
          label: 'Select Box',
          icon: 'chevron-down',
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
          path: '/components/inputs/date-box',
          label: 'Date Editors',
          icon: 'calendar',
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
      items: [
        { path: '/components/overlay', label: 'Overview', icon: 'layers' },
        {
          path: '/components/overlay/tooltip-context-menu',
          label: 'Tooltip & Context Menu',
          icon: 'pointer',
        },
        {
          path: '/components/overlay/modal',
          label: 'Modal',
          icon: 'layout',
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
  protected readonly isHome = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects.split(/[?#]/)[0] === '/'),
    ),
    { initialValue: inject(DOCUMENT).location?.pathname === '/' },
  );

  protected readonly themeService = inject(ThemeService);
  protected readonly themes: { value: GridTheme; label: string }[] = [
    { value: 'default', label: 'Default' },
    { value: 'tailwind', label: 'Tailwind' },
    { value: 'bootstrap', label: 'Bootstrap' },
  ];

  protected readonly navQuery = signal('');
  protected readonly collapsed = signal<ReadonlySet<string>>(new Set());

  protected toggleSection(title: string): void {
    const next = new Set(this.collapsed());
    if (!next.delete(title)) next.add(title);
    this.collapsed.set(next);
  }

  protected readonly sections = computed<NavSection[]>(() => {
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
}
