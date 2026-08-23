import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

const BRAND = 'OGE UI';
const HOME_TITLE =
  'OGE UI — Free Angular UI Components: Data Grid, Tree List, Pivot Grid';

/**
 * Turns the short route titles (`OGE — Button Group`) into search-friendly
 * document titles. Component pages lead with the framework so the tab and
 * the search snippet both read as what people actually search for:
 *
 *   /components/buttons/button-group  →  "Angular Button Group | OGE UI"
 *   /getting-started                  →  "Getting Started | OGE UI"
 *   /                                 →  HOME_TITLE
 *
 * Route `title` fields stay short on purpose — they also label the sidebar
 * and the generated llms.txt, where the prefix would be noise.
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
  const page = raw.replace(/^OGE\s+—\s+/, '').trim();
  const isComponent = path.startsWith('/components/');
  const lead =
    isComponent && !/^angular/i.test(page) ? `Angular ${page}` : page;
  return `${lead} | ${BRAND}`;
}
