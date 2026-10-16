import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DocHeader } from '../../shared/doc-header';

/**
 * Rendered for every URL no route matches. The host answers those with a real
 * 404 status (`404.html`, built from the client shell by
 * `tools/docs-tools/not-found-page.mjs`), and `SeoService` marks the page
 * `noindex` without a canonical, so a typo never becomes a duplicate of the
 * home page in a search index.
 */
@Component({
  selector: 'app-not-found',
  imports: [DocHeader, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <app-doc-header title="Page not found" category="Docs" categoryLink="/">
      <p>
        There is no page at this address — it may have moved when the docs were
        reorganised. One of these is probably what you were looking for.
      </p>
    </app-doc-header>
    <ul class="not-found-links">
      @for (link of links; track link.path) {
        <li>
          <a [routerLink]="link.path">{{ link.label }}</a>
          <span>{{ link.note }}</span>
        </li>
      }
    </ul>
  `,
  styles: `
    .not-found-links {
      display: grid;
      gap: 0.75rem;
      margin: 1.5rem 0 0;
      padding: 0;
      list-style: none;
    }
    .not-found-links a {
      font-weight: 600;
      color: rgb(79 70 229);
      text-decoration: underline;
    }
    .dark .not-found-links a {
      color: rgb(129 140 248);
    }
    .not-found-links span {
      margin-inline-start: 0.5rem;
      color: rgb(107 114 128);
    }
  `,
})
export class NotFoundPage {
  protected readonly links = [
    { path: '/', label: 'Home', note: 'what OGE UI is' },
    {
      path: '/getting-started',
      label: 'Getting started',
      note: 'install and render a first grid',
    },
    {
      path: '/components',
      label: 'All components',
      note: 'every family, Angular and React',
    },
    {
      path: '/components/data-grid',
      label: 'Data Grid',
      note: 'the virtualized grid',
    },
    { path: '/changelog', label: 'Changelog', note: 'what changed and where' },
  ] as const;
}
