import { DOCUMENT, Injectable, inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

const ORIGIN = 'https://ogeui.com';

const DEFAULT_DESCRIPTION =
  'OGE is a free, signal-based Angular UI component suite: a virtualized Data Grid, Tree List, Pivot Grid, Select Box, Buttons and form Inputs. Zoneless, themeable with CSS tokens, WAI-ARIA accessible.';

/** Longest-prefix match wins — order from specific to general. */
const DESCRIPTIONS: readonly (readonly [string, string])[] = [
  [
    '/components/inputs/select-box',
    'Angular Select Box: searchable WAI-ARIA combobox with displayExpr/valueExpr data mapping, grouping, custom values, lazy loading and full keyboard support — signal-based and zoneless.',
  ],
  [
    '/components/data-grid',
    'Angular Data Grid with row and column virtualization, sorting, filtering, grouping with summaries, inline/batch editing, master-detail, remote data and CSV/Excel/PDF export.',
  ],
  [
    '/components/tree-list',
    'Angular Tree List: the full data-grid feature set on hierarchical data — lazy loading, ancestor-preserving filtering, tri-state selection and drag & drop.',
  ],
  [
    '/components/pivot-grid',
    'Angular Pivot Grid: cross-tab analytics with rows × columns × measures, grand totals, field chooser, sorting and Excel export.',
  ],
  [
    '/components/bpmn',
    'Angular BPMN Editor: a from-scratch BPMN 2.0 modeler with its own dependency-free XML + diagram-interchange engine — palette, orthogonal routing, snapping, undo/redo, keyboard-accessible canvas with live-region announcements, and no watermark. Commercial, free for evaluation.',
  ],
  [
    '/components/charts',
    'Angular Charts: line, spline, area, bar, stacked, scatter, range and candlestick series plus pie/doughnut on a dependency-free SVG kernel — calendar-true time axes, log axes, zoom & pan, crosshair, shared tooltips, interactive legend, keyboard point inspection and a screen-reader data table. Commercial, free for evaluation.',
  ],
  [
    '/components/gantt',
    'Angular Gantt chart: virtualized task tree + timeline chart, summary/milestone/baseline bars, FS/SS/FF/SF dependency arrows with cycle-safe drawing, critical path, drag editing with Escape-cancel, snapshot undo/redo and full keyboard access. Commercial, free for evaluation.',
  ],
  [
    '/components/kanban',
    'Angular Kanban board: columns, swimlanes and WIP limits over a plain card array with field mapping, per-column virtualization, drag & drop with Escape-cancel, Ctrl+Arrow keyboard card moving with live announcements, built-in edit dialog, context menu and toolbar. Commercial, free for evaluation.',
  ],
  [
    '/components/scheduler',
    'Angular Scheduler / event calendar: day, week and month views, all-day strip, deterministic overlap layout from a framework-free kernel, drag & resize with Escape-cancel, anchored appointment popup, form-based editing and full keyboard access. Commercial, free for evaluation.',
  ],
  [
    '/components/buttons',
    'Angular Buttons with async actions and automatic loading, click guards, hold-to-confirm, badges, button groups and drop-down/split buttons.',
  ],
  [
    '/components/forms/validation',
    'Angular form validation: declarative rules compiled into Signal Forms, custom and cross-field rules, reactive-forms interop, and an accessible validation summary that focuses the first invalid field.',
  ],
  [
    '/components/forms/layout',
    'Angular form layout: fixed or auto-fit columns, colSpan, nested fieldset groups, and responsive column counts driven by container queries rather than window width.',
  ],
  [
    '/components/forms',
    'Angular form component: responsive column layout over the OGE editors, nestable fieldset groups, dataType-driven editor selection, validation summary, and Signal Forms, reactive forms or plain signal binding.',
  ],
  [
    '/components/toolbar',
    'Angular Toolbar: a WAI-ARIA APG command bar with roving tabindex, before/center/after groups and an overflow menu for the commands that stop fitting — signal-based, RTL-aware and zoneless.',
  ],
  [
    '/components/toolbar/api',
    'Angular Toolbar API reference: every property, method, event and type of oge-toolbar and oge-toolbar-item, the projection slots, the overflow model and the config provider.',
  ],
  [
    '/components/card/api',
    'Angular Card API reference: every property and type of oge-card, the attribute slot directives (media, avatar, header actions, actions, footer, separator) and the config provider.',
  ],
  [
    '/components/card',
    'Angular Card: a content surface with header, full-bleed media, action row and footer as attribute slots — outlined, raised, filled or flat chrome, horizontal orientation, and an accessible clickable-card pattern instead of a nested-interactive trap.',
  ],
  [
    '/components/stepper',
    'Angular Stepper: a linear or free wizard whose ARIA model stays the same in both orientations — an ordered list of buttons with aria-current="step", async leave guards, and refusals that say why.',
  ],
  [
    '/components/drawer',
    'Angular Drawer: an overlay, push or side panel whose modality is derived from its mode — role="dialog" with a focus trap and inert background when it covers the content, a landmark when it shares the row. Responsive to its own container, not the window.',
  ],
  [
    '/components/progress',
    'Angular Progress & Loading: a linear progress bar (buffer and chunked variants, severity colors), an indeterminate load-indicator ring and a shimmer skeleton — role="progressbar" with aria-valuenow correctly omitted in the indeterminate state, and reduced motion that slows instead of freezing.',
  ],
  [
    '/components/progress/api',
    'Angular Progress & Loading API reference: every property, event and type of oge-progress-bar, oge-load-indicator and oge-skeleton, including the config providers.',
  ],
  [
    '/components/inputs/slider',
    'Angular Slider and RangeSlider: the WAI-ARIA APG slider and multi-thumb patterns as bare form editors — arrows/PageUp/Home/End, live drag commits with Escape-to-cancel, dynamic aria constraints between range thumbs, formatValue feeding aria-valuetext, and Signal Forms membership out of the box.',
  ],
  [
    '/components/inputs/color-box',
    'Angular ColorBox: a color picker dropdown on the shared field chrome — CSS color string value normalized to hex/rgb/rgba/hsl, saturation/brightness surface with hue/alpha sliders, swatch palette grid, any-CSS-color text parsing incl. named colors, instantly/useButtons commit modes, and composed dialog+slider+grid accessibility (no APG color-picker pattern exists).',
  ],
  [
    '/components/pagination',
    'Angular Pagination: a standalone pager around 0-based two-way pageIndex/pageSize models — a constant-width numeric window with real ellipsis markers, page-size selector with an All option, info range in a polite live region, jump-to-page input and a container-width adaptive compact mode. No APG pagination pattern exists; the markup composes a nav landmark, real buttons and aria-current="page".',
  ],
  [
    '/components/breadcrumb',
    'Angular Breadcrumb: the WAI-ARIA APG trail — a nav landmark of real links with aria-current="page", collapsing its oldest middle crumbs against its own container width into an ellipsis menu where they stay reachable as links. No roving tabindex, because the APG defines none.',
  ],
  [
    '/components/breadcrumb/routed',
    'Angular Breadcrumb with the router: derive the trail from the URL, keep crumbs real links and hand the primary click to the router — no router dependency in the package.',
  ],
  [
    '/components/menubar',
    "Angular Menubar: a persistent WAI-ARIA APG menubar with roving tabindex, nested submenus on the shared overlay machinery, cancelable open/close pairs and a container-width hamburger collapse — plus the APG's own advice on when a nav of links serves better.",
  ],
  [
    '/components/menubar/routed',
    'Angular Menubar with the router: activeKey bound one-way from the URL renders aria-current="page", itemClick navigates — no router dependency in the package, url items stay real links.',
  ],
  [
    '/components/splitter/api',
    'Angular Splitter API reference: every property, method, event and type of oge-splitter and oge-splitter-pane, including the WAI-ARIA separator attributes and the config provider.',
  ],
  [
    '/components/splitter',
    'Angular Splitter: resizable, collapsible and nestable panes on the WAI-ARIA window splitter pattern — ratio or pixel sizing, arrow-key resizing, RTL and touch support, signal-based and zoneless.',
  ],
  [
    '/components/accordion',
    'Angular Accordion: WAI-ARIA expansion panels with single or multiple expansion, lazy content, async expand guards, invalid-section jumping and header actions — signal-based and zoneless.',
  ],
  [
    '/components/inputs',
    'Angular form inputs on one field chrome: TextBox, TextArea, NumberBox and SelectBox with floating labels, validation, Signal Forms and reactive forms support.',
  ],
  [
    '/components/overlay',
    'Angular overlay primitives: flip-aware anchored popups, WAI-ARIA menus, tooltips and context menus for any element.',
  ],
  [
    '/getting-started',
    'Get started with OGE: install the signal-based Angular UI packages, bind your first components and theme them with CSS design tokens.',
  ],
];

/**
 * Keeps canonical URL, meta description and Open Graph tags in sync with the
 * active route — the SPA equivalent of per-page head tags for search engines.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly document = inject(DOCUMENT);
  private readonly meta = inject(Meta);
  private readonly router = inject(Router);

  constructor() {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => this.update(event.urlAfterRedirects));
  }

  private update(url: string): void {
    const path = url.split(/[?#]/)[0];
    const canonicalUrl = ORIGIN + (path === '/' ? '/' : path);

    let canonical = this.document.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    );
    if (!canonical) {
      canonical = this.document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      this.document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);

    const description =
      DESCRIPTIONS.find(([prefix]) => path.startsWith(prefix))?.[1] ??
      DEFAULT_DESCRIPTION;
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: canonicalUrl });
    this.meta.updateTag({
      property: 'og:title',
      content: this.document.title,
    });
  }
}
