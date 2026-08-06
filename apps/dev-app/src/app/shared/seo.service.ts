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
    '/components/buttons',
    'Angular Buttons with async actions and automatic loading, click guards, hold-to-confirm, badges, button groups and drop-down/split buttons.',
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
