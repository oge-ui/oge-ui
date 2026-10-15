import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  inject,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import { pageJsonLd } from '../../shared/seo.service';
import { GuideTable, cellRuns } from '../guides/guide-table';
import { faqPageJsonLd, type FaqEntry } from '../pricing/pricing-data';
import { CHECKED_ON, competitorBySlug, plainText } from './compare-data';

const SECTIONS = [
  'When to pick which',
  'Feature comparison',
  'Migrating',
  'Questions',
] as const;

/**
 * `/compare/<competitor>` — one "OGE UI vs X" page. The route's
 * `data.competitor` picks the entry of `COMPETITORS`; each route is its own
 * config, so moving between two comparisons creates a fresh page (and a
 * fresh `FAQPage` block).
 */
@Component({
  selector: 'app-compare-page',
  imports: [DocHeader, GuideTable, PageToc, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <app-doc-header
      [title]="'OGE UI vs ' + vs.name"
      category="Compare"
      categoryLink="/compare"
      [chips]="[vs.keyword, 'checked ' + checkedOn]"
    >
      @for (paragraph of vs.intro; track $index) {
        <p class="!mb-3">{{ paragraph }}</p>
      }
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <h2 id="when-to-pick-which" class="scroll-mt-20">When to pick which</h2>
    <div class="not-prose my-6 grid gap-6 md:grid-cols-2">
      <section
        class="rounded-xl border border-gray-200 p-5 dark:border-gray-700"
        aria-labelledby="pick-them"
      >
        <h3 id="pick-them" class="m-0 text-base font-semibold">
          Pick {{ vs.name }} if…
        </h3>
        <ul class="mt-3 grid list-disc gap-2 pl-5 text-sm">
          @for (item of vs.pickThem; track $index) {
            <li>{{ item }}</li>
          }
        </ul>
      </section>
      <section
        class="rounded-xl border border-gray-200 p-5 dark:border-gray-700"
        aria-labelledby="pick-oge"
      >
        <h3 id="pick-oge" class="m-0 text-base font-semibold">
          Pick OGE UI if…
        </h3>
        <ul class="mt-3 grid list-disc gap-2 pl-5 text-sm">
          @for (item of vs.pickOge; track $index) {
            <li>{{ item }}</li>
          }
        </ul>
      </section>
    </div>

    <h2 id="feature-comparison" class="scroll-mt-20">Feature comparison</h2>
    <app-guide-table
      [caption]="'OGE UI and ' + vs.name + ' compared'"
      [head]="['Aspect', 'OGE UI', vs.name]"
      [rows]="vs.rows"
    />
    <p class="text-sm text-gray-600 dark:text-gray-400">
      {{ vs.name }} facts were checked against the vendor’s pages on
      {{ checkedOn }}:
      @for (source of vs.sources; track source.url; let last = $last) {
        <a [href]="source.url" target="_blank" rel="noopener">{{
          source.label
        }}</a
        >{{ last ? '.' : ',' }}
      }
      Prices and terms change — confirm them there before you decide. OGE UI
      terms are on the <a routerLink="/pricing">pricing page</a>.
    </p>

    <h2 id="migrating" class="scroll-mt-20">Migrating from {{ vs.name }}</h2>
    <ul>
      @for (step of migration; track $index) {
        <li>
          @for (run of step.runs; track $index) {
            @if (run.code) {
              <code>{{ run.text }}</code>
            } @else {
              {{ run.text }}
            }
          }
          @if (step.link; as link) {
            → <a [routerLink]="link.path">{{ link.label }}</a>
          }
        </li>
      }
    </ul>

    <h2 id="questions" class="scroll-mt-20">Questions</h2>
    @for (entry of vs.faq; track entry.id) {
      <h3 [id]="entry.id" class="scroll-mt-20">{{ entry.question }}</h3>
      <p>{{ entry.answer }}</p>
    }
    <p>
      See every comparison on the <a routerLink="/compare">compare page</a>, or
      <a routerLink="/getting-started">get started</a> with OGE UI.
    </p>
  `,
})
export class ComparePage {
  protected readonly vs = competitorBySlug(
    inject(ActivatedRoute).snapshot.data['competitor'] as string,
  );
  protected readonly sections = SECTIONS;
  protected readonly checkedOn = CHECKED_ON;
  protected readonly migration = this.vs.migration.map((step) => ({
    runs: cellRuns(step.text),
    link: step.link,
  }));

  constructor() {
    pageJsonLd(
      'oge-compare-faq',
      faqPageJsonLd(
        this.vs.faq.map((entry): FaqEntry => ({
          ...entry,
          answer: plainText(entry.answer),
        })),
      ),
    );
  }
}
