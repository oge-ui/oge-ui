import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DocHeader } from '../../shared/doc-header';
import { GuideTable } from '../guides/guide-table';
import { CHECKED_ON, COMPETITORS } from './compare-data';

/** Pulls one row of every comparison table into the hub's overview. */
function rowOf(aspect: string): string[] {
  const own = COMPETITORS[0].rows.find(([name]) => name === aspect)?.[1] ?? '';
  return [
    aspect,
    own,
    ...COMPETITORS.map(
      (competitor) =>
        competitor.rows.find(([name]) => name === aspect)?.[2] ?? '—',
    ),
  ];
}

/**
 * `/compare` — the hub of the "OGE UI vs X" pages: one card per comparison
 * and the license / price / framework rows of all of them side by side.
 */
@Component({
  selector: 'app-compare',
  imports: [DocHeader, GuideTable, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <app-doc-header
      title="OGE UI compared"
      category="Getting Started"
      categoryLink="/getting-started"
      [chips]="['AG Grid', 'Kendo UI', 'DevExtreme', 'PrimeNG']"
    >
      <p>
        How OGE UI stacks up against the component libraries Angular and React
        teams most often weigh it against — including where each of them is the
        better choice. Competitor facts were checked against the vendors’ own
        pages on {{ checkedOn }}.
      </p>
    </app-doc-header>

    <ul class="not-prose my-6 grid gap-4 sm:grid-cols-2">
      @for (competitor of competitors; track competitor.slug) {
        <li class="rounded-xl border border-gray-200 p-5 dark:border-gray-700">
          <h2 class="m-0 text-lg font-semibold">
            <a [routerLink]="'/compare/' + competitor.slug"
              >OGE UI vs {{ competitor.name }}</a
            >
          </h2>
          <p class="mt-2 mb-0 text-sm text-gray-600 dark:text-gray-300">
            {{ competitor.summary }}
          </p>
        </li>
      }
    </ul>

    <h2 id="at-a-glance" class="scroll-mt-20">At a glance</h2>
    <app-guide-table
      caption="OGE UI and other component libraries at a glance"
      [head]="head"
      [rows]="rows"
    />
    <p>
      OGE UI’s own terms are on the <a routerLink="/pricing">pricing page</a>.
      Each comparison links the vendor pages its facts come from.
    </p>
  `,
})
export class CompareHubPage {
  protected readonly competitors = COMPETITORS;
  protected readonly checkedOn = CHECKED_ON;
  protected readonly head = [
    'Aspect',
    'OGE UI',
    ...COMPETITORS.map((competitor) => competitor.name),
  ];
  protected readonly rows = ['Frameworks', 'License', 'Price'].map(rowOf);
}
