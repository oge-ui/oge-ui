import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Icon, type IconName } from './shared/icon';
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
  private readonly allSections: NavSection[] = [
    {
      title: 'Overview',
      items: [
        { path: '/getting-started', label: 'Getting Started', icon: 'book' },
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
      ],
    },
  ];

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
