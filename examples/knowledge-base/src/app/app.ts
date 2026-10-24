import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import {
  OgeAccordion,
  OgeAppBar,
  OgeAppBarCenter,
  OgeAppBarEnd,
  OgeAppBarStart,
  OgeAutocomplete,
  OgeBreadcrumb,
  OgeButton,
  OgeButtonGroup,
  OgeButtonIcon,
  OgeCard,
  OgeCardActions,
  OgeCellTemplate,
  OgeChip,
  OgeColumn,
  OgeDrawer,
  OgeEditor,
  OgeGrid,
  OgeModal,
  OgeModalFooter,
  OgeProgressBar,
  OgeStep,
  OgeStepper,
  OgeTimeline,
  OgeToastService,
  OgeTooltip,
  OgeTreeList,
  type OgeAutocompleteItemClickEvent,
  type OgeBreadcrumbItemClickEvent,
  type OgeBreadcrumbItemData,
  type OgeButtonGroupItem,
  type OgeButtonGroupSelectionChangedEvent,
  type OgeRowClickEvent,
  type RowKey,
} from 'oge-ui';
import { activeLang } from './app.config';
import {
  INITIAL_KB_NODES,
  KB_CHANGELOG_TIMELINE,
  KB_FAQ_ITEMS,
  KB_GUIDE_STEPS,
  KB_READER_METRICS,
  UI_STRINGS,
  type KbLocaleCode,
  type KbNavSectionId,
  type KbNode,
  type KbReaderMetricRow,
} from './data';

/* 24×24 stroke icons (path data only) */
const ICONS = {
  menu: 'M4 6h16M4 12h16M4 18h16',
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z',
  doc: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6ZM14 2v6h6',
  guide: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  chart: 'M18 20V10M12 20V4M6 20v-6',
  save: 'M20 6 9 17l-5-5',
  reset: 'M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5',
  moon: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z',
  sun: 'M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32 1.41-1.41M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-11v5m0-8.5v.5',
} as const;

/** True once per browser: the intro opens on the first visit only. */
function firstVisit(flag: string): boolean {
  try {
    if (localStorage.getItem(flag)) return false;
    localStorage.setItem(flag, '1');
    return true;
  } catch {
    return false;
  }
}

interface SectionItem {
  key: KbNavSectionId;
  icon: string;
  packageName: string;
}

const SECTIONS: readonly SectionItem[] = [
  { key: 'articles', icon: ICONS.doc, packageName: '@oge-ui/editor' },
  { key: 'guides', icon: ICONS.guide, packageName: '@oge-ui/navigation' },
  { key: 'feedback', icon: ICONS.chart, packageName: '@oge-ui/grid' },
];

@Component({
  selector: 'app-root',
  imports: [
    OgeAccordion,
    OgeAppBar,
    OgeAppBarStart,
    OgeAppBarCenter,
    OgeAppBarEnd,
    OgeAutocomplete,
    OgeBreadcrumb,
    OgeButton,
    OgeButtonGroup,
    OgeButtonIcon,
    OgeCard,
    OgeCardActions,
    OgeCellTemplate,
    OgeChip,
    OgeColumn,
    OgeDrawer,
    OgeEditor,
    OgeGrid,
    OgeModal,
    OgeModalFooter,
    OgeProgressBar,
    OgeStep,
    OgeStepper,
    OgeTimeline,
    OgeTooltip,
    OgeTreeList,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="app-shell">
      <!-- ───────────────── header ───────────────── -->
      <oge-app-bar landmark="banner" positionMode="sticky" [ariaLabel]="ui().appTitle">
        <div ogeAppBarStart class="app-brand-row">
          <button
            type="button"
            class="app-icon-btn"
            [attr.aria-label]="ui().toggleDrawerAria"
            [attr.aria-expanded]="drawerOpen()"
            (click)="drawerOpen.set(!drawerOpen())"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path [attr.d]="icons.menu" />
            </svg>
          </button>

          <span class="app-brand">
            <img src="brand.svg" alt="" width="28" height="28" class="app-brand-mark" />
            <span class="app-brand-name">AtlasDocs</span>
          </span>
        </div>

        <div ogeAppBarCenter class="app-search">
          <oge-autocomplete
            [ariaLabel]="ui().searchLabel"
            [placeholder]="ui().searchPlaceholder"
            [items]="articleSuggestions()"
            displayExpr="title"
            [(value)]="searchQuery"
            [minSearchLength]="0"
            [openOnFieldClick]="true"
            [showClearButton]="true"
            size="sm"
            subscriptSizing="dynamic"
            (itemClick)="onSearchPick($event)"
          />
        </div>

        <div ogeAppBarEnd class="app-actions">
          <oge-button-group
            [items]="langItems"
            selectionMode="single"
            [selectedKeys]="[lang()]"
            stylingMode="outlined"
            size="sm"
            [ariaLabel]="ui().langGroupAria"
            (selectionChanged)="onLanguageSwitch($event)"
          />
          <button
            type="button"
            class="app-icon-btn"
            ogeTooltip="About this demo"
            tooltipPlacement="bottom"
            aria-label="About this demo"
            (click)="aboutOpen.set(true)"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path [attr.d]="icons.info" />
            </svg>
          </button>
          <button
            type="button"
            class="app-icon-btn"
            [ogeTooltip]="darkMode() ? ui().lightTheme : ui().darkTheme"
            tooltipPlacement="bottom"
            [attr.aria-label]="darkMode() ? ui().lightTheme : ui().darkTheme"
            [attr.aria-pressed]="darkMode()"
            (click)="darkMode.set(!darkMode())"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path [attr.d]="darkMode() ? icons.sun : icons.moon" />
            </svg>
          </button>
        </div>
      </oge-app-bar>

      <!-- ───────────────── sidebar + main ───────────────── -->
      <oge-drawer
        class="app-drawer"
        [(opened)]="drawerOpen"
        mode="side"
        position="start"
        [size]="316"
        [minSize]="64"
        [compactBelow]="960"
        [ariaLabel]="ui().drawerAria"
      >
        <aside ogeDrawerPanel class="app-sidebar" [class.is-rail]="!drawerOpen()">
          <nav class="app-nav" [attr.aria-label]="ui().appTitle">
            @for (section of sections; track section.key) {
              <button
                type="button"
                class="app-nav-item"
                [class.is-active]="activeSection() === section.key"
                [attr.aria-current]="activeSection() === section.key ? 'page' : null"
                [ogeTooltip]="drawerOpen() ? '' : sectionLabel(section.key)"
                tooltipPlacement="right"
                [attr.aria-label]="drawerOpen() ? null : sectionLabel(section.key)"
                (click)="activeSection.set(section.key)"
              >
                <svg class="app-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path [attr.d]="section.icon" />
                </svg>
                @if (drawerOpen()) {
                  <span class="app-nav-label">{{ sectionLabel(section.key) }}</span>
                  @if (section.key === 'articles') {
                    <span class="app-nav-count">{{ articleSuggestions().length }}</span>
                  }
                }
              </button>
            }
          </nav>

          @if (drawerOpen()) {
            <div class="app-tree">
              <h2 class="app-nav-group-label">{{ ui().sidebarTitle }}</h2>
              <oge-tree-list
                class="app-tree-list"
                [data]="nodes()"
                keyExpr="id"
                parentIdExpr="parentId"
                [rootValue]="null"
                [autoExpandAll]="true"
                selectionMode="single"
                [focusedRowEnabled]="true"
                [(focusedRowKey)]="focusedNodeKey"
                [selectedKeys]="[selectedArticleId()]"
                [searchPanel]="true"
                (rowClick)="onTreeRowClick($event)"
              >
                <oge-column field="title" [caption]="ui().treeTitleColumn" [minWidth]="180">
                  <span *ogeCellTemplate="let title; let row = row" class="node-cell">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path [attr.d]="isFolder(row) ? icons.folder : icons.doc" />
                    </svg>
                    <span>{{ title }}</span>
                  </span>
                </oge-column>
                <oge-column field="updatedAt" [caption]="ui().treeUpdatedColumn" [width]="100" />
              </oge-tree-list>
            </div>
          }

          <div class="app-nav-foot">
            @if (drawerOpen()) {
              <a class="app-credit" href="https://ogeui.com" target="_blank" rel="noopener">
                <img src="oge-mark.png" alt="" width="16" height="16" />
                <span>Built with <strong>OGE UI 1.1.6</strong></span>
              </a>
              <span class="app-nav-foot-fw">Angular 21</span>
            } @else {
              <a class="app-credit" href="https://ogeui.com" target="_blank" rel="noopener" aria-label="Built with OGE UI 1.1.6">
                <img src="oge-mark.png" alt="" width="18" height="18" />
              </a>
            }
          </div>
        </aside>

        <main class="app-main" [attr.aria-label]="ui().appTitle">
          <header class="page-head">
            <div class="page-head-copy">
              <h1 class="page-title">{{ sectionLabel(activeSection()) }}</h1>
              <p class="page-desc">{{ sectionDescription() }}</p>
            </div>
            <div class="page-head-end">
              <code class="page-pkg">{{ currentSection().packageName }}</code>
            </div>
          </header>

          <!-- ═══════════ Articles ═══════════ -->
          @if (activeSection() === 'articles') {
            <oge-breadcrumb
              class="page-crumbs"
              [items]="breadcrumbItems()"
              collapseMode="auto"
              (itemClick)="onBreadcrumbClick($event)"
            />

            <oge-card
              [header]="selectedArticle().title"
              [subheader]="ui().authorPrefix + ' ' + selectedArticle().author + ' · ' + ui().updatedPrefix + ' ' + selectedArticle().updatedAt"
            >
              <div class="article-meta">
                <oge-chip [label]="selectedArticle().category" severity="accent" size="sm" />
                <oge-chip [label]="selectedArticle().readMinutes + ' ' + ui().readTimeSuffix" size="sm" />
                <span class="article-id">{{ selectedArticle().id }}</span>
              </div>

              <oge-editor
                [label]="ui().editorLabel"
                [hint]="ui().editorHint"
                [(value)]="editorHtml"
                counter="both"
                [minHeight]="360"
                [resizable]="true"
                [markdownShortcuts]="true"
              />

              <div ogeCardActions align="end">
                <oge-button [text]="ui().revertButton" stylingMode="text" [disabled]="!isDirty()" (clicked)="revertArticle()">
                  <svg ogeButtonIcon viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="icons.reset" /></svg>
                </oge-button>
                <oge-button [text]="ui().saveButton" severity="accent" stylingMode="contained" [disabled]="!isDirty()" (clicked)="saveArticle()">
                  <svg ogeButtonIcon viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="icons.save" /></svg>
                </oge-button>
              </div>
            </oge-card>
          }

          <!-- ═══════════ Guides ═══════════ -->
          @if (activeSection() === 'guides') {
            <oge-card [header]="ui().guidesHeader" [subheader]="ui().guidesSubheader">
              <oge-stepper [(activeIndex)]="activeGuideStep" orientation="horizontal">
                @for (step of guideSteps(); track step.key) {
                  <oge-step [label]="step.label">
                    <p class="step-desc">{{ step.description }}</p>
                  </oge-step>
                }
              </oge-stepper>
            </oge-card>

            <section class="grid-2">
              <oge-card [header]="ui().faqHeader" [subheader]="ui().faqSubheader">
                <oge-accordion [items]="faqItems()" [multiple]="true" [collapsible]="true" />
              </oge-card>
              <oge-card [header]="ui().timelineHeader" [subheader]="ui().timelineSubheader">
                <oge-timeline [items]="changelogItems()" />
              </oge-card>
            </section>
          }

          <!-- ═══════════ Telemetry ═══════════ -->
          @if (activeSection() === 'feedback') {
            <oge-card [header]="ui().feedbackHeader" [subheader]="ui().feedbackSubheader">
              <oge-grid
                [data]="readerMetrics"
                keyExpr="id"
                [searchPanel]="true"
                [columnAutoWidth]="true"
                class="metrics-grid"
                (rowClick)="onMetricRowClick($event)"
              >
                <oge-column field="articleTitle" [caption]="ui().treeTitleColumn" [minWidth]="240" />
                <oge-column field="category" caption="Category" [width]="130">
                  <oge-chip *ogeCellTemplate="let cat" [label]="asString(cat)" severity="accent" size="sm" />
                </oge-column>
                <oge-column field="views30d" caption="Views · 30d" dataType="number" [width]="120" />
                <oge-column field="helpfulRatio" caption="Helpful" dataType="number" [width]="190">
                  <oge-progress-bar
                    *ogeCellTemplate="let ratio"
                    [value]="asNumber(ratio)"
                    [max]="100"
                    [severity]="asNumber(ratio) >= 95 ? 'success' : 'accent'"
                    [showLabel]="true"
                    ariaLabel="Helpfulness"
                  />
                </oge-column>
                <oge-column field="avgReadTimeMin" caption="Avg read, min" dataType="number" [width]="130" />
                <oge-column field="lastUpdated" [caption]="ui().treeUpdatedColumn" [width]="130" />
              </oge-grid>
            </oge-card>
          }
        </main>
      </oge-drawer>

      <!-- about this demo -->
      <oge-modal [(opened)]="aboutOpen" title="About this demo" ariaLabel="About this demo" [width]="640">
        <div class="about-hero">
          <img src="brand.svg" alt="" width="56" height="56" class="about-mark" />
          <div class="about-copy">
            <h2 class="about-title">AtlasDocs</h2>
            <p class="about-tagline">A bilingual knowledge base: documentation tree, rich-text editing, guides and readership telemetry.</p>
            <div class="about-chips">
              <oge-chip label="Angular 21" size="sm" />
              <oge-chip label="OGE UI 1.1.6" size="sm" severity="accent" />
              <oge-chip label="English · Türkçe" size="sm" />
            </div>
          </div>
        </div>
        <p class="about-text">
          Switch the language in the header and watch every component — the tree, the editor toolbar,
          the breadcrumb, the grid — re-render in the other language without a reload, through
          <code>&#64;oge-ui/locales</code>. Edits are kept in memory; explore freely.
        </p>
        <ul class="about-grid">
          @for (section of sections; track section.key) {
            <li class="about-item">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="section.icon" /></svg>
              <span class="about-item-label">{{ sectionLabel(section.key) }}</span>
              <code class="about-item-pkg">{{ section.packageName }}</code>
            </li>
          }
        </ul>
        <div *ogeModalFooter class="about-links">
          <a class="about-link" href="https://github.com/oge-ui/oge-ui/tree/main/examples/knowledge-base" target="_blank" rel="noopener">View source</a>
          <a class="about-link" href="https://stackblitz.com/github/oge-ui/oge-ui/tree/main/examples/knowledge-base" target="_blank" rel="noopener">Open in StackBlitz</a>
          <a class="about-link" href="https://ogeui.com" target="_blank" rel="noopener">OGE UI docs</a>
          <oge-button text="Start exploring" severity="accent" stylingMode="contained" size="sm" (clicked)="aboutOpen.set(false)" />
        </div>
      </oge-modal>
    </div>
  `,
})
export class App {
  private readonly doc = inject(DOCUMENT);
  private readonly toast = inject(OgeToastService);

  protected readonly icons = ICONS;
  protected readonly sections = SECTIONS;

  protected readonly lang = activeLang;
  protected readonly darkMode = signal(false);
  protected readonly aboutOpen = signal(firstVisit('atlas-docs-intro-seen'));
  protected readonly drawerOpen = signal(typeof window === 'undefined' || window.innerWidth >= 960);
  protected readonly activeSection = signal<KbNavSectionId>('articles');
  protected readonly activeGuideStep = signal(2);
  protected readonly searchQuery = signal('');

  protected readonly langItems: readonly OgeButtonGroupItem[] = [
    { value: 'en', text: 'EN' },
    { value: 'tr', text: 'TR' },
  ];

  protected readonly readerMetrics = KB_READER_METRICS;

  private readonly datasets = signal<Record<KbLocaleCode, KbNode[]>>({
    en: INITIAL_KB_NODES.en.map((n) => ({ ...n })),
    tr: INITIAL_KB_NODES.tr.map((n) => ({ ...n })),
  });

  protected readonly ui = computed(() => UI_STRINGS[this.lang()]);
  protected readonly nodes = computed(() => this.datasets()[this.lang()]);
  protected readonly guideSteps = computed(() => KB_GUIDE_STEPS[this.lang()]);
  protected readonly faqItems = computed(() => KB_FAQ_ITEMS[this.lang()]);
  protected readonly changelogItems = computed(() => KB_CHANGELOG_TIMELINE[this.lang()]);

  protected readonly currentSection = computed(
    () => SECTIONS.find((s) => s.key === this.activeSection()) ?? SECTIONS[0],
  );

  protected readonly sectionDescription = computed(() => {
    const ui = this.ui();
    switch (this.activeSection()) {
      case 'guides':
        return ui.guidesDesc;
      case 'feedback':
        return ui.feedbackDesc;
      default:
        return ui.articlesDesc;
    }
  });

  protected readonly articleSuggestions = computed(() => this.nodes().filter((n) => n.kind === 'article'));

  protected readonly selectedArticleId = signal<string>('art-quickstart');
  protected readonly focusedNodeKey = signal<RowKey | null>('art-quickstart');

  protected readonly selectedArticle = computed<KbNode>(() => {
    const list = this.articleSuggestions();
    return list.find((a) => a.id === this.selectedArticleId()) ?? list[0];
  });

  protected readonly editorHtml = signal<string>(
    INITIAL_KB_NODES.en.find((n) => n.id === 'art-quickstart')?.contentHtml ?? '',
  );

  protected readonly isDirty = computed(() => this.editorHtml() !== this.selectedArticle().contentHtml);

  protected readonly breadcrumbItems = computed<OgeBreadcrumbItemData[]>(() => {
    const article = this.selectedArticle();
    const folder = this.nodes().find((n) => n.id === article.parentId);
    const items: OgeBreadcrumbItemData[] = [{ key: 'root', text: this.ui().breadcrumbRoot }];
    if (folder) items.push({ key: folder.id, text: folder.title });
    items.push({ key: article.id, text: article.title });
    return items;
  });

  constructor() {
    effect(() => {
      const root = this.doc.documentElement;
      const isDark = this.darkMode();
      root.classList.toggle('oge-theme-dark', isDark);
      root.style.colorScheme = isDark ? 'dark' : 'light';
    });

    effect(() => {
      this.doc.documentElement.lang = this.lang();
    });
  }

  protected sectionLabel(key: KbNavSectionId): string {
    const ui = this.ui();
    switch (key) {
      case 'guides':
        return ui.navGuides;
      case 'feedback':
        return ui.navFeedback;
      default:
        return ui.navArticles;
    }
  }

  protected asString(value: unknown): string {
    return String(value ?? '');
  }

  protected asNumber(value: unknown): number {
    return Number(value ?? 0);
  }

  protected isFolder(row: unknown): boolean {
    return Boolean(row && typeof row === 'object' && (row as KbNode).kind === 'folder');
  }

  protected selectArticle(articleId: string): void {
    const target = this.nodes().find((n) => n.id === articleId);
    if (!target) return;
    if (target.kind === 'folder') {
      const firstChild = this.nodes().find((n) => n.parentId === target.id && n.kind === 'article');
      if (firstChild) {
        this.selectedArticleId.set(firstChild.id);
        this.focusedNodeKey.set(firstChild.id);
        this.editorHtml.set(firstChild.contentHtml);
      }
      return;
    }
    this.selectedArticleId.set(target.id);
    this.focusedNodeKey.set(target.id);
    this.editorHtml.set(target.contentHtml);
  }

  protected onTreeRowClick(event: OgeRowClickEvent<KbNode>): void {
    this.activeSection.set('articles');
    this.selectArticle(event.row.id);
  }

  protected onMetricRowClick(event: OgeRowClickEvent<KbReaderMetricRow>): void {
    this.activeSection.set('articles');
    this.selectArticle(event.row.id);
  }

  protected onSearchPick(event: OgeAutocompleteItemClickEvent<KbNode>): void {
    this.activeSection.set('articles');
    this.selectArticle(event.item.id);
    this.searchQuery.set('');
  }

  protected onBreadcrumbClick(event: OgeBreadcrumbItemClickEvent): void {
    if (!event.key || event.key === 'root') {
      this.selectArticle('art-quickstart');
      return;
    }
    this.selectArticle(String(event.key));
  }

  protected onLanguageSwitch(event: OgeButtonGroupSelectionChangedEvent): void {
    const next = event.selectedKeys[0] as KbLocaleCode | undefined;
    if (!next || next === this.lang()) return;
    this.lang.set(next);
    const updatedArticle = this.datasets()[next].find((n) => n.id === this.selectedArticleId());
    if (updatedArticle) this.editorHtml.set(updatedArticle.contentHtml);
    this.toast.info(this.ui().switchedLangToast(next === 'tr' ? 'Türkçe' : 'English'));
  }

  protected saveArticle(): void {
    const code = this.lang();
    const id = this.selectedArticleId();
    const html = this.editorHtml();
    const today = new Date().toISOString().slice(0, 10);
    this.datasets.update((current) => ({
      ...current,
      [code]: current[code].map((node) =>
        node.id === id ? { ...node, contentHtml: html, updatedAt: today } : node,
      ),
    }));
    this.toast.success(this.ui().savedToast(this.selectedArticle().title));
  }

  protected revertArticle(): void {
    const current = this.selectedArticle();
    this.editorHtml.set(current.contentHtml);
    this.toast.info(this.ui().revertedToast(current.title));
  }
}
