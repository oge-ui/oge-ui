import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { frameworksOfPage } from './framework.service';

const BRAND = 'OGE UI';
const HOME_TITLE =
  'OGE UI — Free Angular and React UI Components: Data Grid, Tree List';

/**
 * Hand-written document titles for commercial-intent pages, where the query
 * people type ("AG Grid alternative", "pricing") matters more than the house
 * pattern. Exact paths only, each at most 60 characters.
 */
export const DOCUMENT_TITLES: Readonly<Record<string, string>> = {
  '/pricing': 'OGE UI Pricing — Free MIT Suite, Pro $299/Developer/Year',
  '/compare': 'OGE UI vs AG Grid, Kendo UI, DevExtreme and PrimeNG',
  '/compare/ag-grid': 'OGE UI vs AG Grid — Angular & React Alternative',
  '/compare/kendo-ui': 'OGE UI vs Kendo UI — Angular & React Alternative',
  '/compare/devextreme': 'OGE UI vs DevExtreme — Angular & React Alternative',
  '/compare/primeng': 'OGE UI vs PrimeNG — Angular UI Library Alternative',
};

/**
 * Turns the short route titles (`OGE — Button Group`) into search-friendly
 * document titles. Component pages name the frameworks the page exists in,
 * so the tab and the search snippet both read as what people actually
 * search for — and a page only one layer covers does not promise the other:
 *
 *   /components/buttons/button-group  →  "Button Group for Angular and React | OGE UI"
 *   /components/tabs/routed           →  "Angular Routed Tabs | OGE UI"
 *   /getting-started                  →  "Getting Started | OGE UI"
 *   /                                 →  HOME_TITLE
 *
 * Route `title` fields stay short on purpose — they also label the sidebar
 * and the generated llms.txt, where the suffix would be noise.
 */
@Injectable({ providedIn: 'root' })
export class OgeTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const raw = this.buildTitle(snapshot);
    this.title.setTitle(documentTitle(raw, snapshot.url));
  }
}

export function documentTitle(raw: string | undefined, url: string): string {
  const path = url.split(/[?#]/)[0];
  if (path === '/' || !raw) return HOME_TITLE;
  const fixed = DOCUMENT_TITLES[path];
  if (fixed) return fixed;
  const page = raw.replace(/^OGE\s+—\s+/, '').trim();
  if (!path.startsWith('/components/')) return `${page} | ${BRAND}`;
  const labels = frameworksOfPage(path).map((entry) => entry.label);
  // a title that already names a framework is left as written
  const named = labels.some((label) =>
    page.toLowerCase().startsWith(`${label.toLowerCase()} `),
  );
  if (labels.length === 0 || named) return `${page} | ${BRAND}`;
  const lead =
    labels.length === 1
      ? `${labels[0]} ${page}`
      : `${page} for ${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
  return `${lead} | ${BRAND}`;
}
