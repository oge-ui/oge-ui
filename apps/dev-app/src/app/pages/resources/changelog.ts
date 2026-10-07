import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import { SITE_VERSION } from '../../shared/site-version';
// The repository's own CHANGELOG.md, inlined at build time as text (the
// `.md` loader in project.json) — the page can never drift from the file.
// eslint-disable-next-line @nx/enforce-module-boundaries -- a build-time data file at the repo root, not a project import
import changelogSource from '../../../../../../CHANGELOG.md';
import {
  blocksToHtml,
  inlineToHtml,
  parseChangelog,
  releaseLabel,
} from './changelog-markdown';

/** Releases with their bodies serialized once, at module load. */
const RELEASES = parseChangelog(changelogSource).releases.map((release) => ({
  id: release.id,
  version: release.version,
  date: release.date,
  html: blocksToHtml(release.blocks),
  sections: release.sections.map((section) => ({
    id: section.id,
    label: section.label,
    titleHtml: inlineToHtml(section.title),
    html: blocksToHtml(section.blocks),
  })),
}));

/**
 * `/changelog` — `CHANGELOG.md` rendered as a page: one section per release
 * (`#v1-1-2`, `#unreleased`), one linkable sub-section per change group, and
 * the "On this page" rail listing the releases.
 *
 * Headings (with their anchors) are template elements; each body is a string
 * `changelog-markdown.ts` serialized from parsed data — escaped text and a
 * fixed set of tags — bound through Angular's sanitizer.
 */
@Component({
  selector: 'app-changelog',
  imports: [DocHeader, PageToc],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Changelog"
      category="Resources"
      categoryLink="/changelog"
      [chips]="['v' + version, releases.length + ' releases']"
    >
      <p>
        What changed in each OGE UI release, for the Angular and the React
        packages alike — rendered from
        <a
          href="https://github.com/oge-ui/oge-ui/blob/main/CHANGELOG.md"
          target="_blank"
          rel="noopener"
          class="text-indigo-600 underline dark:text-indigo-400"
          ><code>CHANGELOG.md</code></a
        >
        at build time. Every release and every change group has its own link.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="tocLabels" />

    @for (release of releases; track release.id) {
      <section
        class="app-changelog-release"
        [attr.aria-labelledby]="release.id"
      >
        <h2 [id]="release.id" class="scroll-mt-20">
          <a
            [href]="'#' + release.id"
            (click)="jump($event, release.id)"
            class="no-underline hover:underline"
            >{{ release.version }}</a
          >
          @if (release.date) {
            <time
              class="ml-2 align-middle text-[13px] font-normal text-gray-500 dark:text-gray-400"
              [attr.datetime]="release.date"
              >{{ release.date }}</time
            >
          }
          @if (release.version === version) {
            <span class="app-changelog-latest">latest</span>
          }
        </h2>
        @if (release.html) {
          <div [innerHTML]="release.html"></div>
        }
        @for (section of release.sections; track section.id) {
          <h3 [id]="section.id" class="scroll-mt-20">
            <a
              [href]="'#' + section.id"
              (click)="jump($event, section.id)"
              class="no-underline hover:underline"
              [innerHTML]="section.titleHtml"
            ></a>
          </h3>
          <div [innerHTML]="section.html"></div>
        }
      </section>
    }
  `,
  styles: `
    .app-changelog-release {
      margin-top: 2.5rem;
      padding-top: 0.5rem;
      border-top: 1px solid var(--app-changelog-rule, rgb(229 231 235));
    }
    :host-context(.dark) .app-changelog-release {
      --app-changelog-rule: rgb(31 41 55);
    }
    .app-changelog-latest {
      display: inline-block;
      margin-left: 0.5rem;
      padding: 0.05rem 0.5rem;
      border-radius: 999px;
      background: rgb(224 231 255);
      color: rgb(67 56 202);
      font-size: 11px;
      font-weight: 600;
      vertical-align: middle;
    }
    :host-context(.dark) .app-changelog-latest {
      background: rgb(99 102 241 / 0.18);
      color: rgb(199 210 254);
    }
  `,
})
export class ChangelogPage {
  protected readonly version = SITE_VERSION;
  protected readonly releases = RELEASES;
  /** The rail lists releases; `PageToc` slugifies each label to its id. */
  protected readonly tocLabels = RELEASES.map((release) =>
    releaseLabel(release.version),
  );

  /**
   * Fragment hrefs resolve against `<base href="/">` and would route away
   * from the page — scroll in place and update only the hash, keeping the
   * query string (`?framework=react`).
   */
  protected jump(event: Event, id: string): void {
    event.preventDefault();
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(
      null,
      '',
      `${location.pathname}${location.search}#${id}`,
    );
  }
}
