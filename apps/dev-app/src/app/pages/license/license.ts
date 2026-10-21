import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiReference } from '../../shared/api-reference';
import { CodeBlock } from '../../shared/code-block';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import {
  PRO_CHECKOUT_URL,
  PRO_FAMILIES,
  PRO_PRICE_USD,
  PRO_SALES_EMAIL,
} from '../../shared/pro-license';
import { OGE_LICENSE_API } from './license-api-data';
import { ANGULAR_KEY, CHECK_KEY, ENV_KEY, REACT_KEY } from './license-snippets';

@Component({
  selector: 'app-license',
  imports: [ApiReference, CodeBlock, DocHeader, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Licensing & pricing"
      category="Getting Started"
      categoryLink="/getting-started"
      [chips]="['open-core', 'MIT', 'OGE UI Pro']"
    >
      <p>
        OGE UI is <strong>open-core</strong>: the suite is MIT-licensed and free
        for any use. Seven enterprise families — the Pivot Grid, Gantt,
        Scheduler, Kanban, Charts, the BPMN Editor and the Spreadsheet — make up
        <strong>OGE UI Pro</strong>, which is free to evaluate and develop with
        and needs a license in production.
      </p>
    </app-doc-header>

    <section
      class="oge-pro-card not-prose my-8 grid gap-6 rounded-xl border border-gray-200 p-6 sm:grid-cols-[1fr_auto] dark:border-gray-700"
      aria-labelledby="pro-plan"
    >
      <div>
        <h2 id="pro-plan" class="m-0 text-xl font-semibold">OGE UI Pro</h2>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
          Every commercial family, both Angular and React, one key.
        </p>
        <ul class="mt-4 grid gap-1 text-sm sm:grid-cols-2">
          @for (family of families; track family.pkg) {
            <li>
              ✓ {{ family.name }}
              <code class="text-xs">&#64;oge-ui/{{ family.pkg }}</code>
            </li>
          }
          <li>✓ 12 months of updates, then keep what you have</li>
          <li>✓ Unlimited apps, end users and servers</li>
        </ul>
      </div>
      <div class="flex flex-col items-start gap-3 sm:items-end">
        <p class="m-0">
          <span class="text-3xl font-bold">\${{ price }}</span>
          <span class="text-sm text-gray-600 dark:text-gray-300">
            / developer / year</span
          >
        </p>
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
        <a routerLink="/pricing" class="text-sm">Compare plans</a>
      </div>
    </section>

    <h2 id="mit" class="scroll-mt-20">MIT — free forever</h2>
    <p>
      <code>oge-ui</code>, <code>&#64;oge-ui/core</code>,
      <code>&#64;oge-ui/grid</code> (including Excel/PDF export, master-detail
      and server-side operations), <code>&#64;oge-ui/tree-list</code>, the
      inputs, buttons, overlay, layout, navigation, tabs, forms, editor and
      upload packages and their React counterparts are released under the
      <a
        href="https://github.com/oge-ui/oge-ui/blob/main/LICENSE"
        target="_blank"
        rel="noopener"
        >MIT license</a
      >.
    </p>
    <p>
      This is a commitment, not a phase:
      <strong
        >these packages and every feature currently in them will remain
        MIT.</strong
      >
      No feature that is free today will ever move behind a paid license.
    </p>

    <h2 id="commercial" class="scroll-mt-20">
      OGE UI Pro — how the license works
    </h2>
    <ul>
      <li>
        <strong>Free</strong> for evaluation, development, testing and any other
        non-production use — install from npm and try everything, no sign-up.
      </li>
      <li>
        <strong>Per developer:</strong> one seat for each developer who writes
        code against the Pro packages. End users, servers, apps and deployments
        are unlimited.
      </li>
      <li>
        <strong>Yearly, with a perpetual fallback:</strong> a key covers every
        release published while it is current, forever. When it lapses your apps
        keep working on those versions; renew to get later releases.
      </li>
      <li>
        The packages are source-available under the
        <a
          href="https://github.com/oge-ui/oge-ui/blob/main/packages/pivot/LICENSE"
          target="_blank"
          rel="noopener"
          >OGE UI Commercial License</a
        >.
      </li>
    </ul>

    <h2 id="license-key" class="scroll-mt-20">Using your license key</h2>
    <p>
      After the purchase, open
      <a routerLink="/license/claim">Get your key</a> with the order number from
      your receipt. Register the key once, before the first Pro component
      renders:
    </p>
    <app-code-block
      [code]="fw.isReact() ? reactKey : angularKey"
      language="ts"
    />
    <p>
      The key is checked <strong>offline</strong>, in the browser, against a
      signature — nothing is sent anywhere and no network access is needed. It
      is not a secret: shipping it in your bundle is expected.
    </p>
    <app-code-block [code]="envKey" language="ts" />

    <h3 id="without-a-key" class="scroll-mt-20">What happens without a key</h3>
    <p>
      Nothing breaks. On a production host a Pro component without a valid key
      still works in full; the page gets one console warning per package and a
      small “OGE UI Pro — unlicensed” link in the corner. On development hosts —
      <code>localhost</code>, <code>*.local</code>, <code>*.test</code>, file
      URLs, StackBlitz and CodeSandbox, and jsdom/happy-dom test runs — there is
      no notice at all.
    </p>
    <app-code-block [code]="checkKey" language="ts" />

    <h3 id="license-api" class="scroll-mt-20">License API</h3>
    <app-api-reference title="License API" [sections]="licenseApi" />

    <h2 id="why" class="scroll-mt-20">Why this model?</h2>
    <p>
      The paid tier funds full-time maintenance of the free one. It is the same
      model proven by other data-grid vendors — with a deliberately more
      generous free tier: features that competitors sell (master-detail, Excel
      export, advanced filtering, server-side operations) are MIT in OGE.
    </p>

    <h2 id="questions" class="scroll-mt-20">Questions</h2>
    <p>
      Invoices, purchase orders, volume pricing, or anything unclear —
      <a [href]="'mailto:' + salesEmail">{{ salesEmail }}</a> or open a
      <a
        href="https://github.com/oge-ui/oge-ui/issues"
        target="_blank"
        rel="noopener"
        >GitHub issue</a
      >.
    </p>
  `,
})
export class LicensePage {
  protected readonly fw = inject(FrameworkService);
  protected readonly families = PRO_FAMILIES;
  protected readonly price = PRO_PRICE_USD;
  protected readonly salesEmail = PRO_SALES_EMAIL;
  protected readonly checkoutUrl =
    PRO_CHECKOUT_URL ||
    `mailto:${PRO_SALES_EMAIL}?subject=${encodeURIComponent('OGE UI Pro license')}`;
  protected readonly angularKey = ANGULAR_KEY;
  protected readonly reactKey = REACT_KEY;
  protected readonly envKey = ENV_KEY;
  protected readonly checkKey = CHECK_KEY;
  protected readonly licenseApi = OGE_LICENSE_API;
}
