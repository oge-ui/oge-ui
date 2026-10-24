import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import {
  PRO_CHECKOUT_URL,
  PRO_FAMILIES,
  proCheckoutUrl,
  PRO_PRICE_USD,
  PRO_SALES_EMAIL,
} from '../../shared/pro-license';
import { pageJsonLd } from '../../shared/seo.service';
import { PriceBars } from '../compare/price-bars';
import {
  MIT_PACKAGES,
  PLAN_ROWS,
  PRICING_FAQ,
  PRO_PRODUCT_JSON_LD,
  faqPageJsonLd,
} from './pricing-data';

const SECTIONS = [
  'Plans',
  'Your team',
  'Compare plans',
  'Against other suites',
  'Questions',
] as const;

/** What the MIT plan carries, as plan-card bullets. */
const MIT_POINTS = [
  'Data Grid with Excel/PDF export, master-detail, range selection and server-side operations',
  'Tree List, inputs, forms, rich-text editor and upload',
  'Buttons, overlay, layout, navigation, tabs and locales',
  'Angular and React, the same engine underneath',
  'No feature that is free today will move behind a paid license',
] as const;

/** What a Pro seat adds on top of the MIT suite. */
const PRO_POINTS = [
  'Free for evaluation, development and testing — no sign-up',
  '12 months of updates, then keep every version you have',
  'Unlimited apps, end users, servers and deployments',
  'One key for Angular and React, verified offline',
] as const;

/** A comparison cell that grants something gets a check, `None` a dash. */
function cellKind(cell: string): 'yes' | 'none' | 'pro' | 'text' {
  if (/^(Free|Included|Unlimited|Both|Every release|MIT)\b/.test(cell)) {
    return 'yes';
  }
  if (cell === 'None') return 'none';
  if (cell.startsWith('Licensed for production')) return 'pro';
  return 'text';
}

/**
 * `/pricing` — the open-core offer at a glance: the MIT suite, OGE UI Pro,
 * a seat calculator, the terms side by side and the published prices of the
 * suites `/compare` covers. Every statement restates `/license`; the price
 * and the checkout link come from `shared/pro-license.ts`.
 */
@Component({
  selector: 'app-pricing',
  imports: [DocHeader, PageToc, PriceBars, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <app-doc-header
      title="Pricing"
      category="Getting Started"
      categoryLink="/getting-started"
      [chips]="['MIT', 'OGE UI Pro', '$' + price + ' / developer / year']"
    >
      <p>
        OGE UI is open-core. The Data Grid, Tree List, form editors and the rest
        of the core suite for Angular and React are MIT-licensed and free
        forever. Seven enterprise families make up
        <strong>OGE UI Pro</strong>: free to evaluate and develop with, licensed
        per developer for production.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <h2 id="plans" class="scroll-mt-20">Plans</h2>
    <div class="not-prose app-plans">
      <section class="app-plan" aria-labelledby="plan-free">
        <p class="app-plan-kicker">Open source</p>
        <h3 id="plan-free" class="app-plan-name">OGE UI — MIT</h3>
        <p class="app-plan-tagline">
          The core suite, free for any use, commercial included.
        </p>
        <p class="app-plan-price">
          <span class="app-plan-amount">$0</span>
          <span class="app-plan-unit">forever</span>
        </p>
        <ul class="app-plan-points">
          @for (point of mitPoints; track point) {
            <li>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="m5 10.5 3 3 7-7" />
              </svg>
              {{ point }}
            </li>
          }
        </ul>
        <details class="app-plan-pkgs">
          <summary>{{ mitPackages.length }} MIT packages</summary>
          <p>
            @for (pkg of mitPackages; track pkg) {
              <code>{{ pkg }}</code>
            }
          </p>
        </details>
        <div class="app-plan-cta">
          <a routerLink="/getting-started" class="app-btn app-btn-ghost"
            >Get started</a
          >
        </div>
      </section>

      <section class="app-plan app-plan-pro" aria-labelledby="plan-pro">
        <p class="app-plan-kicker">Commercial</p>
        <h3 id="plan-pro" class="app-plan-name">OGE UI Pro</h3>
        <p class="app-plan-tagline">
          Every commercial family, Angular and React, one key.
        </p>
        <p class="app-plan-price">
          <span class="app-plan-amount">\${{ price }}</span>
          <span class="app-plan-unit">per developer / year</span>
        </p>
        <ul class="app-plan-families" aria-label="Families in OGE UI Pro">
          @for (family of families; track family.pkg) {
            <li>
              <a [routerLink]="familyPath(family.pkg)" class="app-family">
                <span class="app-family-thumb" aria-hidden="true">
                  <img
                    class="block dark:hidden"
                    [src]="'/showcase/bento-' + family.pkg + '-light.webp'"
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                  <img
                    class="hidden dark:block"
                    [src]="'/showcase/bento-' + family.pkg + '-dark.webp'"
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                </span>
                <span class="app-family-name">{{ family.name }}</span>
              </a>
            </li>
          }
        </ul>
        <ul class="app-plan-points">
          @for (point of proPoints; track point) {
            <li>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="m5 10.5 3 3 7-7" />
              </svg>
              {{ point }}
            </li>
          }
        </ul>
        <div class="app-plan-cta">
          <a
            class="app-btn app-btn-primary"
            [href]="checkoutUrl()"
            [attr.target]="storeOpen ? '_blank' : null"
            rel="noopener"
            >{{ storeOpen ? 'Buy OGE UI Pro' : 'Get a quote' }}</a
          >
          <a routerLink="/license/claim" class="app-plan-link"
            >Already bought? Get your key</a
          >
        </div>
      </section>
    </div>

    <h2 id="your-team" class="scroll-mt-20">Your team</h2>
    <p>
      A seat is a developer who writes code against the Pro packages. Designers,
      testers, end users and servers never need one.
    </p>
    <div class="not-prose app-calc">
      <div class="app-calc-input">
        <label for="seat-count" class="app-calc-label"
          >Developers on the Pro packages</label
        >
        <div class="app-calc-stepper">
          <button
            type="button"
            aria-label="One developer fewer"
            [disabled]="seats() <= 1"
            (click)="setSeats(seats() - 1)"
          >
            −
          </button>
          <input
            id="seat-count"
            type="number"
            inputmode="numeric"
            min="1"
            max="200"
            [value]="seats()"
            (input)="setSeats($any($event.target).valueAsNumber)"
          />
          <button
            type="button"
            aria-label="One developer more"
            [disabled]="seats() >= 200"
            (click)="setSeats(seats() + 1)"
          >
            +
          </button>
        </div>
        <input
          class="app-calc-range"
          type="range"
          min="1"
          max="50"
          aria-label="Developers"
          [value]="seats()"
          (input)="setSeats($any($event.target).valueAsNumber)"
        />
      </div>
      <div class="app-calc-result" aria-live="polite">
        <p class="app-calc-total">
          <span class="app-calc-amount"
            >\${{ yearly().toLocaleString('en-US') }}</span
          >
          <span class="app-calc-per">per year</span>
        </p>
        <p class="app-calc-detail">
          {{ seats() }} × \${{ price }} · about \${{
            monthly().toLocaleString('en-US')
          }}
          a month for the whole team, every Pro family in both frameworks
        </p>
        @if (storeOpen) {
          <a
            class="app-btn app-btn-primary app-calc-buy"
            [href]="checkoutUrl()"
            target="_blank"
            rel="noopener"
            >Buy {{ seats() }} {{ seats() === 1 ? 'seat' : 'seats' }}</a
          >
        }
        <p class="app-calc-detail">
          Invoices, purchase orders and volume pricing —
          <a [href]="'mailto:' + salesEmail">{{ salesEmail }}</a>
        </p>
      </div>
    </div>

    <h2 id="compare-plans" class="scroll-mt-20">Compare plans</h2>
    <div
      class="not-prose app-matrix-wrap"
      role="region"
      aria-label="OGE UI MIT and OGE UI Pro compared"
      tabindex="0"
    >
      <table class="app-matrix">
        <caption class="sr-only">
          OGE UI MIT and OGE UI Pro compared
        </caption>
        <thead>
          <tr>
            <th scope="col">Term</th>
            <th scope="col">MIT</th>
            <th scope="col" class="is-pro">OGE UI Pro</th>
          </tr>
        </thead>
        <tbody>
          @for (row of planRows; track row[0]) {
            <tr>
              <th scope="row">{{ row[0] }}</th>
              @for (cell of row.slice(1); track $index; let pro = $last) {
                <td [class.is-pro]="pro">
                  @switch (kindOf(cell)) {
                    @case ('yes') {
                      <span class="app-cell app-cell-yes">
                        <svg viewBox="0 0 20 20" aria-hidden="true">
                          <path d="m5 10.5 3 3 7-7" />
                        </svg>
                        {{ cell }}
                      </span>
                    }
                    @case ('none') {
                      <span class="app-cell app-cell-none"
                        >—<span class="sr-only">None</span></span
                      >
                    }
                    @case ('pro') {
                      <span class="app-cell app-cell-pro">
                        <svg viewBox="0 0 20 20" aria-hidden="true">
                          <path
                            d="M12.5 8.5a3 3 0 1 0-2.9 3H11l1 1h1.5v1.5H15V16h2v-2.5l-4.5-4.5Z"
                          />
                        </svg>
                        {{ cell }}
                      </span>
                    }
                    @default {
                      {{ cell }}
                    }
                  }
                </td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
    <p>
      The full terms — the perpetual fallback, development hosts and the license
      key API — are on the <a routerLink="/license">licensing page</a>.
    </p>

    <h2 id="against-other-suites" class="scroll-mt-20">Against other suites</h2>
    <p>
      One Pro seat covers seven families in two frameworks. Here is what the
      suites teams most often weigh OGE UI against charge for their commercial
      tier — the detail, and where each of them is the better pick, is in
      <a routerLink="/compare">OGE UI compared</a>.
    </p>
    <app-price-bars />

    <h2 id="questions" class="scroll-mt-20">Questions</h2>
    <div class="not-prose app-faq">
      @for (entry of faq; track entry.id; let first = $first) {
        <details class="app-faq-item" [id]="entry.id" [open]="first">
          <summary>{{ entry.question }}</summary>
          <p>{{ entry.answer }}</p>
        </details>
      }
    </div>
    <p>
      Anything else — invoices, purchase orders, volume pricing —
      <a [href]="'mailto:' + salesEmail">{{ salesEmail }}</a
      >.
    </p>
  `,
  styles: `
    /* ═══ plan cards ═══ */
    .app-plans {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1.25rem;
      margin: 1.5rem 0 2rem;
    }

    @media (max-width: 48rem) {
      .app-plans {
        grid-template-columns: 1fr;
      }
    }

    .app-plan {
      position: relative;
      display: flex;
      flex-direction: column;
      border: 1px solid var(--color-gray-200);
      border-radius: 1rem;
      padding: 1.5rem;
      background: var(--color-white);
    }

    .dark .app-plan {
      border-color: var(--color-gray-800);
      background: color-mix(in oklab, var(--color-gray-900) 60%, transparent);
    }

    /* the Pro card: gradient hairline + soft glow */
    .app-plan-pro {
      border-color: transparent;
      background:
        linear-gradient(var(--color-white), var(--color-white)) padding-box,
        linear-gradient(
            135deg,
            var(--color-cyan-400),
            var(--color-indigo-500),
            var(--color-fuchsia-500)
          )
          border-box;
      border: 1.5px solid transparent;
      box-shadow: 0 24px 60px -36px
        color-mix(in oklab, var(--color-indigo-600) 70%, transparent);
    }

    .dark .app-plan-pro {
      background:
        linear-gradient(var(--color-gray-950), var(--color-gray-950))
          padding-box,
        linear-gradient(
            135deg,
            var(--color-cyan-400),
            var(--color-indigo-500),
            var(--color-fuchsia-500)
          )
          border-box;
    }

    .app-plan-kicker {
      margin: 0;
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      font-weight: 600;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--color-gray-500);
    }

    .app-plan-pro .app-plan-kicker {
      color: var(--color-indigo-600);
    }

    .dark .app-plan-pro .app-plan-kicker {
      color: var(--color-indigo-300);
    }

    .app-plan-name {
      margin: 0.375rem 0 0;
      font-size: 1.25rem;
      font-weight: 700;
      letter-spacing: -0.01em;
    }

    .app-plan-tagline {
      margin: 0.25rem 0 0;
      font-size: 0.875rem;
      color: var(--color-gray-600);
    }

    .dark .app-plan-tagline {
      color: var(--color-gray-400);
    }

    .app-plan-price {
      display: flex;
      align-items: baseline;
      gap: 0.5rem;
      margin: 1.25rem 0 0;
    }

    .app-plan-amount {
      font-size: 2.75rem;
      font-weight: 800;
      line-height: 1;
      letter-spacing: -0.03em;
      font-variant-numeric: tabular-nums;
    }

    .app-plan-pro .app-plan-amount {
      background-image: linear-gradient(
        100deg,
        var(--color-cyan-500),
        var(--color-indigo-500) 55%,
        var(--color-fuchsia-500)
      );
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }

    .app-plan-unit {
      font-size: 0.875rem;
      color: var(--color-gray-500);
    }

    .app-plan-points {
      display: grid;
      gap: 0.5rem;
      margin: 1.25rem 0 0;
      padding: 0;
      list-style: none;
      font-size: 0.875rem;
    }

    .app-plan-points li {
      display: flex;
      gap: 0.5rem;
    }

    .app-plan-points svg,
    .app-cell svg {
      flex: none;
      width: 1.125rem;
      height: 1.125rem;
      margin-top: 0.0625rem;
      fill: none;
      stroke: var(--color-emerald-600);
      stroke-width: 2.2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .dark .app-plan-points svg,
    .dark .app-cell-yes svg {
      stroke: var(--color-emerald-400);
    }

    .app-plan-pkgs {
      margin-top: 1rem;
      font-size: 0.8125rem;
    }

    .app-plan-pkgs summary {
      cursor: pointer;
      color: var(--color-gray-600);
    }

    .app-plan-pkgs p {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
      margin: 0.5rem 0 0;
    }

    .app-plan-pkgs code {
      font-size: 0.6875rem;
    }

    .app-plan-families {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(6.5rem, 1fr));
      gap: 0.5rem;
      margin: 1.25rem 0 0;
      padding: 0;
      list-style: none;
    }

    .app-family {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid var(--color-gray-200);
      border-radius: 0.625rem;
      text-decoration: none;
      color: inherit;
      transition:
        border-color 0.2s ease,
        transform 0.2s ease;
    }

    .dark .app-family {
      border-color: var(--color-gray-800);
    }

    .app-family:hover {
      border-color: var(--color-indigo-400);
      transform: translateY(-1px);
    }

    .app-family-thumb {
      display: block;
      height: 3.75rem;
      overflow: hidden;
      background: var(--color-gray-50);
    }

    .app-family-thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: top left;
    }

    .app-family-name {
      padding: 0.375rem 0.5rem;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .app-plan-cta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 1rem;
      margin-top: auto;
      padding-top: 1.5rem;
    }

    .app-plan-link {
      font-size: 0.875rem;
    }

    .app-btn {
      display: inline-flex;
      align-items: center;
      border-radius: 0.625rem;
      padding: 0.625rem 1.125rem;
      font-size: 0.875rem;
      font-weight: 600;
      text-decoration: none;
      transition:
        transform 0.2s ease,
        filter 0.2s ease,
        background-color 0.2s ease;
    }

    .app-btn-primary {
      color: #fff;
      background: linear-gradient(
        95deg,
        var(--color-indigo-600),
        var(--color-indigo-500) 60%,
        var(--color-fuchsia-500) 150%
      );
      box-shadow: 0 10px 24px -12px var(--color-indigo-500);
    }

    .app-btn-primary:hover {
      transform: translateY(-1px);
      filter: brightness(1.07);
    }

    .app-btn-ghost {
      border: 1px solid var(--color-gray-300);
      color: inherit;
    }

    .app-btn-ghost:hover {
      background: var(--color-gray-50);
    }

    .dark .app-btn-ghost {
      border-color: var(--color-gray-700);
    }

    .dark .app-btn-ghost:hover {
      background: var(--color-gray-800);
    }

    /* ═══ seat calculator ═══ */
    .app-calc {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 1.5rem;
      align-items: center;
      margin: 1rem 0 2rem;
      border: 1px solid var(--color-gray-200);
      border-radius: 1rem;
      padding: 1.5rem;
      background:
        radial-gradient(
          80% 120% at 100% 0%,
          color-mix(in oklab, var(--color-indigo-500) 9%, transparent),
          transparent 60%
        ),
        var(--color-white);
    }

    .dark .app-calc {
      border-color: var(--color-gray-800);
      background:
        radial-gradient(
          80% 120% at 100% 0%,
          color-mix(in oklab, var(--color-indigo-500) 14%, transparent),
          transparent 60%
        ),
        color-mix(in oklab, var(--color-gray-900) 60%, transparent);
    }

    @media (max-width: 40rem) {
      .app-calc {
        grid-template-columns: 1fr;
      }
    }

    .app-calc-label {
      display: block;
      font-size: 0.8125rem;
      font-weight: 600;
    }

    .app-calc-stepper {
      display: inline-flex;
      margin-top: 0.5rem;
      border: 1px solid var(--color-gray-300);
      border-radius: 0.625rem;
      overflow: hidden;
    }

    .dark .app-calc-stepper {
      border-color: var(--color-gray-700);
    }

    .app-calc-stepper button {
      width: 2.5rem;
      font-size: 1.125rem;
      cursor: pointer;
      background: var(--color-gray-50);
    }

    .dark .app-calc-stepper button {
      background: var(--color-gray-800);
    }

    .app-calc-stepper button:disabled {
      cursor: not-allowed;
      opacity: 0.45;
    }

    .app-calc-stepper input {
      width: 4.5rem;
      border-inline: 1px solid var(--color-gray-300);
      padding: 0.5rem;
      text-align: center;
      font-size: 1.125rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      background: transparent;
      -moz-appearance: textfield;
    }

    .dark .app-calc-stepper input {
      border-color: var(--color-gray-700);
    }

    .app-calc-stepper input::-webkit-inner-spin-button,
    .app-calc-stepper input::-webkit-outer-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }

    .app-calc-range {
      display: block;
      width: 100%;
      margin-top: 1rem;
      accent-color: var(--color-indigo-600);
    }

    .app-calc-total {
      display: flex;
      align-items: baseline;
      gap: 0.5rem;
      margin: 0;
    }

    .app-calc-amount {
      font-size: 2.5rem;
      font-weight: 800;
      line-height: 1;
      letter-spacing: -0.03em;
      font-variant-numeric: tabular-nums;
    }

    .app-calc-per {
      font-size: 0.875rem;
      color: var(--color-gray-500);
    }

    .app-calc-buy {
      margin-top: 0.875rem;
    }

    .app-calc-detail {
      margin: 0.5rem 0 0;
      font-size: 0.8125rem;
      color: var(--color-gray-600);
    }

    .dark .app-calc-detail {
      color: var(--color-gray-400);
    }

    /* ═══ plan matrix ═══ */
    .app-matrix-wrap {
      position: relative;
      margin: 1rem 0;
      overflow-x: auto;
      border: 1px solid var(--color-gray-200);
      border-radius: 0.875rem;
    }

    .dark .app-matrix-wrap {
      border-color: var(--color-gray-800);
    }

    .app-matrix {
      width: 100%;
      min-width: 38rem;
      border-collapse: collapse;
      font-size: 0.8125rem;
    }

    .app-matrix th,
    .app-matrix td {
      padding: 0.625rem 0.875rem;
      text-align: start;
      vertical-align: top;
      border-top: 1px solid var(--color-gray-100);
    }

    .dark .app-matrix th,
    .dark .app-matrix td {
      border-top-color: var(--color-gray-800);
    }

    .app-matrix thead th {
      border-top: 0;
      background: var(--color-gray-50);
      font-weight: 600;
    }

    .dark .app-matrix thead th {
      background: var(--color-gray-900);
    }

    .app-matrix tbody th {
      width: 34%;
      font-weight: 500;
    }

    .app-matrix .is-pro {
      background: color-mix(in oklab, var(--color-indigo-500) 5%, transparent);
    }

    .app-matrix thead .is-pro {
      color: var(--color-indigo-700);
      background: color-mix(
        in oklab,
        var(--color-indigo-500) 11%,
        var(--color-gray-50)
      );
    }

    .dark .app-matrix thead .is-pro {
      color: var(--color-indigo-300);
      background: color-mix(
        in oklab,
        var(--color-indigo-500) 18%,
        var(--color-gray-900)
      );
    }

    .app-cell {
      display: inline-flex;
      gap: 0.375rem;
    }

    .app-cell-none {
      color: var(--color-gray-400);
    }

    .app-cell-pro svg {
      stroke: none;
      fill: var(--color-indigo-500);
    }

    /* ═══ questions ═══ */
    .app-faq {
      display: grid;
      gap: 0.5rem;
      margin: 1rem 0;
    }

    .app-faq-item {
      border: 1px solid var(--color-gray-200);
      border-radius: 0.75rem;
      padding: 0 1rem;
      scroll-margin-top: 5rem;
    }

    .dark .app-faq-item {
      border-color: var(--color-gray-800);
    }

    .app-faq-item[open] {
      border-color: color-mix(
        in oklab,
        var(--color-indigo-500) 40%,
        var(--color-gray-200)
      );
    }

    .app-faq-item summary {
      position: relative;
      padding: 0.875rem 1.75rem 0.875rem 0;
      font-size: 0.9375rem;
      font-weight: 600;
      cursor: pointer;
      list-style: none;
    }

    .app-faq-item summary::-webkit-details-marker {
      display: none;
    }

    .app-faq-item summary::after {
      content: '+';
      position: absolute;
      inset-inline-end: 0;
      top: 50%;
      transform: translateY(-50%);
      font-size: 1.25rem;
      font-weight: 400;
      color: var(--color-gray-400);
    }

    .app-faq-item[open] summary::after {
      content: '−';
    }

    .app-faq-item p {
      margin: 0 0 1rem;
      font-size: 0.875rem;
      line-height: 1.6;
      color: var(--color-gray-600);
    }

    .dark .app-faq-item p {
      color: var(--color-gray-400);
    }

    .app-plan a:focus-visible,
    .app-calc button:focus-visible,
    .app-calc input:focus-visible,
    .app-faq-item summary:focus-visible,
    .app-matrix-wrap:focus-visible {
      outline: 2px solid var(--color-indigo-500);
      outline-offset: 2px;
    }

    @media (prefers-reduced-motion: reduce) {
      .app-family,
      .app-btn {
        transition: none;
      }
    }

    @media (forced-colors: active) {
      .app-plan-pro {
        border: 2px solid Highlight;
      }

      .app-plan-pro .app-plan-amount {
        color: CanvasText;
        background: none;
      }
    }
  `,
})
export class PricingPage {
  protected readonly sections = SECTIONS;
  protected readonly price = PRO_PRICE_USD;
  protected readonly families = PRO_FAMILIES;
  protected readonly mitPackages = MIT_PACKAGES;
  protected readonly mitPoints = MIT_POINTS;
  protected readonly proPoints = PRO_POINTS;
  protected readonly planRows = PLAN_ROWS;
  protected readonly faq = PRICING_FAQ;
  protected readonly salesEmail = PRO_SALES_EMAIL;
  protected readonly mailUrl = `mailto:${PRO_SALES_EMAIL}?subject=${encodeURIComponent('OGE UI Pro license')}`;
  /** The store link for the calculator's seat count, or email until the store is live. */
  protected readonly checkoutUrl = computed(
    () => proCheckoutUrl(this.seats()) || this.mailUrl,
  );
  protected readonly storeOpen = PRO_CHECKOUT_URL !== '';

  protected readonly seats = signal(5);
  protected readonly yearly = computed(() => this.seats() * PRO_PRICE_USD);
  protected readonly monthly = computed(() => Math.round(this.yearly() / 12));

  protected readonly kindOf = cellKind;

  /** `bpmn` → `/components/bpmn`, `pivot` → `/components/pivot-grid`. */
  protected familyPath(pkg: string): string {
    return pkg === 'pivot' ? '/components/pivot-grid' : `/components/${pkg}`;
  }

  protected setSeats(value: number): void {
    if (!Number.isFinite(value)) return;
    this.seats.set(Math.min(200, Math.max(1, Math.round(value))));
  }

  constructor() {
    pageJsonLd('oge-pricing-faq', faqPageJsonLd(PRICING_FAQ));
    pageJsonLd('oge-pricing-product', PRO_PRODUCT_JSON_LD);
  }
}
