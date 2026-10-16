import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import {
  PRO_CHECKOUT_URL,
  PRO_FAMILIES,
  PRO_PRICE_USD,
  PRO_SALES_EMAIL,
} from '../../shared/pro-license';
import { pageJsonLd } from '../../shared/seo.service';
import { GuideTable } from '../guides/guide-table';
import {
  MIT_PACKAGES,
  PLAN_ROWS,
  PRICING_FAQ,
  PRO_PRODUCT_JSON_LD,
  faqPageJsonLd,
} from './pricing-data';

const SECTIONS = ['Plans', 'Compare plans', 'Questions'] as const;

/**
 * `/pricing` — the open-core offer at a glance: the MIT suite, OGE UI Pro and
 * the terms side by side. Every statement restates `/license`; the price and
 * the checkout link come from `shared/pro-license.ts`.
 */
@Component({
  selector: 'app-pricing',
  imports: [DocHeader, GuideTable, PageToc, RouterLink],
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
        forever. Six enterprise families make up
        <strong>OGE UI Pro</strong>: free to evaluate and develop with, licensed
        per developer for production.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <h2 id="plans" class="scroll-mt-20">Plans</h2>
    <div class="not-prose my-6 grid gap-6 md:grid-cols-2">
      <section
        class="flex flex-col rounded-xl border border-gray-200 p-6 dark:border-gray-700"
        aria-labelledby="plan-free"
      >
        <h3 id="plan-free" class="m-0 text-xl font-semibold">OGE UI — MIT</h3>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
          The core suite, free for any use, commercial included.
        </p>
        <p class="mt-4 mb-0">
          <span class="text-3xl font-bold">$0</span>
          <span class="text-sm text-gray-600 dark:text-gray-300"> forever</span>
        </p>
        <ul class="mt-4 grid gap-1 text-sm">
          <li>
            ✓ Data Grid with Excel/PDF export, master-detail, range selection
            and server-side operations
          </li>
          <li>✓ Tree List, inputs, forms, rich-text editor, upload</li>
          <li>✓ Buttons, overlay, layout, navigation, tabs, locales</li>
          <li>✓ Angular and React</li>
          <li>
            ✓ No feature that is free today will move behind a paid license
          </li>
        </ul>
        <p class="mt-4 mb-0 flex flex-wrap gap-1">
          @for (pkg of mitPackages; track pkg) {
            <code class="text-xs">{{ pkg }}</code>
          }
        </p>
        <div class="mt-auto pt-6">
          <a
            routerLink="/getting-started"
            class="inline-block rounded-lg border border-gray-300 px-4 py-2 font-medium no-underline hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
            >Get started</a
          >
        </div>
      </section>

      <section
        class="oge-pro-card flex flex-col rounded-xl border-2 border-blue-600 p-6 dark:border-blue-500"
        aria-labelledby="plan-pro"
      >
        <h3 id="plan-pro" class="m-0 text-xl font-semibold">OGE UI Pro</h3>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
          Every commercial family, both Angular and React, one key.
        </p>
        <p class="mt-4 mb-0">
          <span class="text-3xl font-bold">\${{ price }}</span>
          <span class="text-sm text-gray-600 dark:text-gray-300">
            / developer / year</span
          >
        </p>
        <ul class="mt-4 grid gap-1 text-sm sm:grid-cols-2">
          @for (family of families; track family.pkg) {
            <li>✓ {{ family.name }}</li>
          }
        </ul>
        <ul class="mt-3 grid gap-1 text-sm">
          <li>✓ Free for evaluation, development and testing</li>
          <li>✓ 12 months of updates, then keep what you have</li>
          <li>✓ Unlimited apps, end users and servers</li>
        </ul>
        <div class="mt-auto flex flex-wrap items-center gap-4 pt-6">
          <a
            class="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white no-underline hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2"
            [href]="checkoutUrl"
            [attr.target]="checkoutUrl.startsWith('http') ? '_blank' : null"
            rel="noopener"
            >{{
              checkoutUrl.startsWith('http') ? 'Buy OGE UI Pro' : 'Get a quote'
            }}</a
          >
          <a routerLink="/license/claim" class="text-sm"
            >Already bought? Get your key</a
          >
        </div>
      </section>
    </div>

    <h2 id="compare-plans" class="scroll-mt-20">Compare plans</h2>
    <app-guide-table
      caption="OGE UI MIT and OGE UI Pro compared"
      [head]="['Term', 'MIT', 'OGE UI Pro']"
      [rows]="planRows"
    />
    <p>
      The full terms — the perpetual fallback, development hosts and the license
      key API — are on the <a routerLink="/license">licensing page</a>.
      Wondering how this compares with other suites? See
      <a routerLink="/compare">OGE UI compared</a>.
    </p>

    <h2 id="questions" class="scroll-mt-20">Questions</h2>
    @for (entry of faq; track entry.id) {
      <h3 [id]="entry.id" class="scroll-mt-20">{{ entry.question }}</h3>
      <p>{{ entry.answer }}</p>
    }
    <p>
      Anything else — invoices, purchase orders, volume pricing —
      <a [href]="'mailto:' + salesEmail">{{ salesEmail }}</a
      >.
    </p>
  `,
})
export class PricingPage {
  protected readonly sections = SECTIONS;
  protected readonly price = PRO_PRICE_USD;
  protected readonly families = PRO_FAMILIES;
  protected readonly mitPackages = MIT_PACKAGES;
  protected readonly planRows = PLAN_ROWS;
  protected readonly faq = PRICING_FAQ;
  protected readonly salesEmail = PRO_SALES_EMAIL;
  protected readonly checkoutUrl =
    PRO_CHECKOUT_URL ||
    `mailto:${PRO_SALES_EMAIL}?subject=${encodeURIComponent('OGE UI Pro license')}`;

  constructor() {
    pageJsonLd('oge-pricing-faq', faqPageJsonLd(PRICING_FAQ));
    pageJsonLd('oge-pricing-product', PRO_PRODUCT_JSON_LD);
  }
}
