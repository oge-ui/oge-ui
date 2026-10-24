import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { PRO_PRICE_USD } from '../../shared/pro-license';
import { CHECKED_ON, COMPETITORS } from './compare-data';

interface Bar {
  readonly name: string;
  readonly usd: number;
  readonly basis: string;
  readonly own: boolean;
  readonly slug?: string;
}

/**
 * Entry price per developer of OGE UI Pro and the suites `/compare` covers,
 * as horizontal bars. Every figure comes from `compare-data.ts`
 * (`entryPrice`, checked on {@link CHECKED_ON}); the basis line under each
 * bar says what the money buys, because perpetual and subscription models
 * are not the same thing. Used on `/pricing` and `/compare`.
 */
@Component({
  selector: 'app-price-bars',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <figure class="app-price-bars not-prose" aria-labelledby="price-bars-title">
      <figcaption id="price-bars-title" class="app-price-bars-title">
        Entry price of the commercial tier, per developer
      </figcaption>
      <ul class="app-price-bars-list">
        @for (bar of bars; track bar.name) {
          <li class="app-price-bar" [class.is-own]="bar.own">
            <span class="app-price-bar-name">
              @if (bar.slug) {
                <a [routerLink]="'/compare/' + bar.slug">{{ bar.name }}</a>
              } @else {
                {{ bar.name }}
              }
            </span>
            <span class="app-price-bar-track" aria-hidden="true">
              <span
                class="app-price-bar-fill"
                [style.width.%]="(bar.usd / max) * 100"
              ></span>
            </span>
            <span class="app-price-bar-value">\${{ bar.usd }}</span>
            <span class="app-price-bar-basis">{{ bar.basis }}</span>
          </li>
        }
      </ul>
      <p class="app-price-bars-note">
        Published list prices, checked on {{ checkedOn }}. Licensing models
        differ — read each basis line, and confirm current terms with the
        vendor. The OGE UI core suite is MIT and costs nothing.
      </p>
    </figure>
  `,
  styles: `
    .app-price-bars {
      margin: 1.5rem 0;
      border: 1px solid var(--color-gray-200);
      border-radius: 0.875rem;
      padding: 1.25rem 1.25rem 1rem;
      background: var(--color-white);
    }

    .dark .app-price-bars {
      border-color: var(--color-gray-800);
      background: color-mix(in oklab, var(--color-gray-900) 60%, transparent);
    }

    .app-price-bars-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-gray-900);
    }

    .dark .app-price-bars-title {
      color: var(--color-gray-100);
    }

    .app-price-bars-list {
      display: grid;
      gap: 0.875rem;
      margin: 1rem 0 0;
      padding: 0;
      list-style: none;
    }

    .app-price-bar {
      display: grid;
      grid-template-columns: 7.5rem minmax(0, 1fr) 4rem;
      grid-template-areas:
        'name track value'
        '. basis basis';
      align-items: center;
      column-gap: 0.75rem;
      row-gap: 0.125rem;
    }

    .app-price-bar-name {
      grid-area: name;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-gray-700);
    }

    .app-price-bar-name a {
      color: inherit;
      text-decoration: none;
    }

    .app-price-bar-name a:hover {
      color: var(--color-indigo-600);
      text-decoration: underline;
    }

    .dark .app-price-bar-name {
      color: var(--color-gray-300);
    }

    .app-price-bar-track {
      grid-area: track;
      height: 0.75rem;
      border-radius: 999px;
      background: var(--color-gray-100);
      overflow: hidden;
    }

    .dark .app-price-bar-track {
      background: var(--color-gray-800);
    }

    .app-price-bar-fill {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: var(--color-gray-400);
      transform-origin: left center;
    }

    .dark .app-price-bar-fill {
      background: var(--color-gray-500);
    }

    .app-price-bar.is-own .app-price-bar-fill {
      background: linear-gradient(
        90deg,
        var(--color-cyan-500),
        var(--color-indigo-500) 60%,
        var(--color-fuchsia-500)
      );
    }

    .app-price-bar.is-own .app-price-bar-name {
      font-weight: 700;
      color: var(--color-indigo-700);
    }

    .dark .app-price-bar.is-own .app-price-bar-name {
      color: var(--color-indigo-300);
    }

    .app-price-bar-value {
      grid-area: value;
      text-align: end;
      font-size: 0.875rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      color: var(--color-gray-900);
    }

    .dark .app-price-bar-value {
      color: var(--color-gray-100);
    }

    .app-price-bar-basis {
      grid-area: basis;
      font-size: 0.75rem;
      color: var(--color-gray-500);
    }

    .app-price-bars-note {
      margin: 1rem 0 0;
      font-size: 0.75rem;
      line-height: 1.5;
      color: var(--color-gray-500);
    }

    @media (max-width: 40rem) {
      .app-price-bar {
        grid-template-columns: minmax(0, 1fr) 3.5rem;
        grid-template-areas:
          'name value'
          'track track'
          'basis basis';
      }
    }

    @media (prefers-reduced-motion: no-preference) {
      .app-price-bar-fill {
        animation: app-price-grow 0.9s cubic-bezier(0.22, 1, 0.36, 1) both;
      }

      @keyframes app-price-grow {
        from {
          transform: scaleX(0);
        }
      }
    }

    @media (forced-colors: active) {
      .app-price-bar-fill {
        background: CanvasText;
      }

      .app-price-bar.is-own .app-price-bar-fill {
        background: Highlight;
      }
    }
  `,
})
export class PriceBars {
  protected readonly checkedOn = CHECKED_ON;
  protected readonly bars: readonly Bar[] = [
    {
      name: 'OGE UI Pro',
      usd: PRO_PRICE_USD,
      basis: 'Yearly, all seven Pro families in Angular and React',
      own: true,
    },
    ...COMPETITORS.map((competitor): Bar => ({
      name: competitor.name,
      usd: competitor.entryPrice.usd,
      basis: competitor.entryPrice.basis,
      own: false,
      slug: competitor.slug,
    })),
  ].sort((a, b) => a.usd - b.usd);
  protected readonly max = Math.max(...this.bars.map((bar) => bar.usd));
}
