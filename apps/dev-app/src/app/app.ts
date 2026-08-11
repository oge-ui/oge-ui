import {
  Component,
  DOCUMENT,
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
import { Icon, type IconName } from './shared/icon';
import { SITE_VERSION } from './shared/site-version';
import { SeoService } from './shared/seo.service';
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
          path: '/components/bpmn/api',
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
          path: '/components/gantt/api',
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
          path: '/components/buttons/api',
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

  constructor() {
    if (typeof window !== 'undefined') {
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
