import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DocHeader } from '../../shared/doc-header';
import { PRO_PRICE_USD } from '../../shared/pro-license';
import { CHECKED_ON, COMPETITORS } from './compare-data';
import { PriceBars } from './price-bars';

const ASPECTS = ['Frameworks', 'License', 'Price'] as const;

/** One row of every comparison table, OGE UI first. */
function rowOf(aspect: string): { aspect: string; cells: string[] } {
  const own = COMPETITORS[0].rows.find(([name]) => name === aspect)?.[1] ?? '';
  return {
    aspect,
    cells: [
      own,
      ...COMPETITORS.map(
        (competitor) =>
          competitor.rows.find(([name]) => name === aspect)?.[2] ?? '—',
      ),
    ],
  };
}

/**
 * `/compare` — the hub of the "OGE UI vs X" pages: one card per comparison
 * (with both entry prices), the published entry prices
 * as bars, and the license / price / framework rows of all of them side by
 * side with the OGE UI column highlighted.
 */
@Component({
  selector: 'app-compare',
  imports: [DocHeader, PriceBars, RouterLink],
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

    <ul class="not-prose app-vs-grid">
      @for (competitor of competitors; track competitor.slug) {
        <li>
          <a [routerLink]="'/compare/' + competitor.slug" class="app-vs-card">
            <span class="app-vs-head">
              <span class="app-vs-badge app-vs-badge-oge" aria-hidden="true"
                >OGE</span
              >
              <span class="app-vs-vs" aria-hidden="true">vs</span>
              <span class="app-vs-badge" aria-hidden="true">{{
                initials(competitor.name)
              }}</span>
              <span class="app-vs-arrow" aria-hidden="true">→</span>
            </span>
            <span class="app-vs-title">OGE UI vs {{ competitor.name }}</span>
            <span class="app-vs-summary">{{ competitor.summary }}</span>
            <span class="app-vs-tally">
              <span class="app-vs-tally-item"
                >OGE UI Pro \${{ proPrice }}/yr</span
              >
              <span class="app-vs-tally-item"
                >{{ competitor.name }} \${{ competitor.entryPrice.usd }}</span
              >
            </span>
          </a>
        </li>
      }
    </ul>

    <h2 id="prices" class="scroll-mt-20">Prices</h2>
    <app-price-bars />

    <h2 id="at-a-glance" class="scroll-mt-20">At a glance</h2>
    <div
      class="not-prose app-glance-wrap"
      role="region"
      aria-label="OGE UI and other component libraries at a glance"
      tabindex="0"
    >
      <table class="app-glance">
        <caption class="sr-only">
          OGE UI and other component libraries at a glance
        </caption>
        <thead>
          <tr>
            <th scope="col">Aspect</th>
            <th scope="col" class="is-own">OGE UI</th>
            @for (competitor of competitors; track competitor.slug) {
              <th scope="col">
                <a [routerLink]="'/compare/' + competitor.slug">{{
                  competitor.name
                }}</a>
              </th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of rows; track row.aspect) {
            <tr>
              <th scope="row">{{ row.aspect }}</th>
              @for (cell of row.cells; track $index; let own = $first) {
                <td [class.is-own]="own">{{ cell }}</td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
    <p>
      OGE UI’s own terms are on the <a routerLink="/pricing">pricing page</a>.
      Each comparison links the vendor pages its facts come from.
    </p>
  `,
  styles: `
    .app-vs-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1rem;
      margin: 1.5rem 0 2rem;
      padding: 0;
      list-style: none;
    }

    @media (max-width: 40rem) {
      .app-vs-grid {
        grid-template-columns: 1fr;
      }
    }

    .app-vs-card {
      display: flex;
      flex-direction: column;
      height: 100%;
      border: 1px solid var(--color-gray-200);
      border-radius: 1rem;
      padding: 1.25rem;
      color: inherit;
      text-decoration: none;
      background: var(--color-white);
      transition:
        border-color 0.2s ease,
        box-shadow 0.2s ease,
        transform 0.2s ease;
    }

    .dark .app-vs-card {
      border-color: var(--color-gray-800);
      background: color-mix(in oklab, var(--color-gray-900) 60%, transparent);
    }

    .app-vs-card:hover {
      border-color: var(--color-indigo-400);
      transform: translateY(-2px);
      box-shadow: 0 20px 44px -28px var(--color-indigo-500);
    }

    .app-vs-card:focus-visible,
    .app-glance-wrap:focus-visible {
      outline: 2px solid var(--color-indigo-500);
      outline-offset: 2px;
    }

    .app-vs-head {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .app-vs-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 2.5rem;
      height: 2rem;
      border: 1px solid var(--color-gray-200);
      border-radius: 0.5rem;
      padding: 0 0.5rem;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      color: var(--color-gray-700);
      background: var(--color-gray-50);
    }

    .dark .app-vs-badge {
      border-color: var(--color-gray-700);
      color: var(--color-gray-300);
      background: var(--color-gray-800);
    }

    .app-vs-badge-oge {
      border-color: transparent;
      color: #fff;
      background: linear-gradient(
        135deg,
        var(--color-cyan-500),
        var(--color-indigo-500) 60%,
        var(--color-fuchsia-500)
      );
    }

    .dark .app-vs-badge-oge {
      color: #fff;
    }

    .app-vs-vs {
      font-size: 0.75rem;
      color: var(--color-gray-400);
    }

    .app-vs-arrow {
      margin-inline-start: auto;
      color: var(--color-gray-400);
      transition:
        transform 0.2s ease,
        color 0.2s ease;
    }

    .app-vs-card:hover .app-vs-arrow {
      transform: translateX(3px);
      color: var(--color-indigo-500);
    }

    .app-vs-title {
      margin-top: 0.875rem;
      font-size: 1.0625rem;
      font-weight: 650;
    }

    .app-vs-summary {
      margin-top: 0.375rem;
      font-size: 0.875rem;
      line-height: 1.55;
      color: var(--color-gray-600);
    }

    .dark .app-vs-summary {
      color: var(--color-gray-400);
    }

    .app-vs-tally {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: auto;
      padding-top: 1rem;
    }

    .app-vs-tally-item {
      border-radius: 999px;
      padding: 0.1875rem 0.625rem;
      font-size: 0.75rem;
      color: var(--color-gray-600);
      background: var(--color-gray-100);
    }

    .dark .app-vs-tally-item {
      color: var(--color-gray-300);
      background: var(--color-gray-800);
    }

    .app-vs-tally-item:first-child {
      color: var(--color-indigo-700);
      background: color-mix(in oklab, var(--color-indigo-500) 12%, transparent);
    }

    .dark .app-vs-tally-item:first-child {
      color: var(--color-indigo-300);
    }

    .app-glance-wrap {
      position: relative;
      margin: 1rem 0;
      overflow-x: auto;
      border: 1px solid var(--color-gray-200);
      border-radius: 0.875rem;
    }

    .dark .app-glance-wrap {
      border-color: var(--color-gray-800);
    }

    .app-glance {
      width: 100%;
      min-width: 48rem;
      border-collapse: collapse;
      font-size: 0.8125rem;
    }

    .app-glance th,
    .app-glance td {
      padding: 0.75rem 0.875rem;
      text-align: start;
      vertical-align: top;
      border-top: 1px solid var(--color-gray-100);
    }

    .dark .app-glance th,
    .dark .app-glance td {
      border-top-color: var(--color-gray-800);
    }

    .app-glance thead th {
      border-top: 0;
      background: var(--color-gray-50);
      font-weight: 600;
    }

    .dark .app-glance thead th {
      background: var(--color-gray-900);
    }

    .app-glance thead a {
      color: inherit;
    }

    .app-glance tbody th {
      font-weight: 600;
    }

    .app-glance .is-own {
      background: color-mix(in oklab, var(--color-indigo-500) 6%, transparent);
    }

    .app-glance thead .is-own {
      color: var(--color-indigo-700);
      background: color-mix(
        in oklab,
        var(--color-indigo-500) 12%,
        var(--color-gray-50)
      );
    }

    .dark .app-glance thead .is-own {
      color: var(--color-indigo-300);
      background: color-mix(
        in oklab,
        var(--color-indigo-500) 18%,
        var(--color-gray-900)
      );
    }

    @media (prefers-reduced-motion: reduce) {
      .app-vs-card,
      .app-vs-arrow {
        transition: none;
      }
    }

    @media (forced-colors: active) {
      .app-vs-badge-oge {
        border-color: CanvasText;
        color: CanvasText;
        background: none;
      }
    }
  `,
})
export class CompareHubPage {
  protected readonly competitors = COMPETITORS;
  protected readonly checkedOn = CHECKED_ON;
  protected readonly proPrice = PRO_PRICE_USD;
  protected readonly rows = ASPECTS.map(rowOf);

  /** "AG Grid" → "AG", "Kendo UI" → "KU", "PrimeNG" → "PN". */
  protected initials(name: string): string {
    const words = name.split(/\s+/);
    if (words.length > 1)
      return words
        .map((word) => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    const caps = name.match(/[A-Z]/g) ?? [];
    return (
      caps.length >= 2 ? caps.slice(0, 2).join('') : name.slice(0, 2)
    ).toUpperCase();
  }
}
