import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CodeBlock } from '../../shared/code-block';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import { GuideTable } from './guide-table';
import {
  APP_CONFIG,
  BROWSER_ONLY,
  LOCALE,
  SERVER_CONFIG,
  ZONELESS,
} from './angular-ssr-snippets';

const SECTIONS = [
  'What renders on the server',
  'Hydration with event replay',
  'The event replay fold',
  'Ids, locale and time zones',
  'Browser-only work',
  'Zoneless',
] as const;

/** `/guides/angular-ssr` — Angular SSR, hydration and zoneless apps. */
@Component({
  selector: 'app-guide-angular-ssr',
  imports: [CodeBlock, DocHeader, GuideTable, PageToc, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Angular SSR, hydration and zoneless"
      category="Guides"
      categoryLink="/guides"
      [chips]="['@angular/ssr', 'withEventReplay', 'zoneless']"
    >
      <p>
        Every Angular family renders on a server and hydrates in the browser
        without a mismatch, and none of them needs <code>zone.js</code>. This
        site is the proof: all of its pages are prerendered, hydrated with event
        replay and run zoneless.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    @if (fw.isReact()) {
      <p
        class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[14px] dark:border-amber-900 dark:bg-amber-950/40"
      >
        This guide is about the Angular layer. For React, see
        <a
          class="text-indigo-600 underline dark:text-indigo-400"
          routerLink="/guides/nextjs"
          >Next.js App Router</a
        >.
      </p>
    }

    <h2 id="what-renders-on-the-server" class="scroll-mt-20">
      What renders on the server
    </h2>
    <p>
      The whole component: markup, ARIA attributes, the first page of in-memory
      data and the initial state of every input. What waits for the browser is
      what needs one — measuring (virtual-scroll windows sized from the
      viewport, popup placement, overflow menus), observers and timers. Each
      claim below is a test:
    </p>
    <app-guide-table
      caption="SSR claims and the tests that prove them"
      [head]="['Claim', 'Proven by']"
      [rows]="claims"
    />

    <h2 id="hydration-with-event-replay" class="scroll-mt-20">
      Hydration with event replay
    </h2>
    <p>
      Standard Angular setup — OGE needs no provider of its own. Event replay
      queues the clicks and keys a reader makes before the bundle has hydrated
      the page.
    </p>
    <app-code-block [code]="appConfig" language="ts" />

    <h2 id="the-event-replay-fold" class="scroll-mt-20">
      The event replay fold
    </h2>
    <p>
      Angular 22.2 has an ordering bug that bites any content projected into a
      component and rendered outside its host — in OGE, declarative
      <code>&lt;oge-tab&gt;</code> children of
      <code>&lt;oge-tab-panel&gt;</code> and
      <code>&lt;oge-step&gt;</code> children of
      <code>&lt;oge-stepper&gt;</code>. With <code>withEventReplay()</code> on,
      the client fails with <code>NG0509</code> and leaves the view unhydrated.
      Until Angular fixes it, fold the replay call into its contract script on
      the server:
    </p>
    <app-code-block [code]="serverConfig" language="ts" />
    <p>
      <code>apps/ssr-smoke/src/hydration.spec.ts</code> pins the upstream bug —
      it fails once Angular fixes the ordering, which is the cue to delete the
      fold. If you serve with a hash-based CSP, the fold also changes the inline
      script's hash: re-derive it from your built HTML.
    </p>

    <h2 id="ids-locale-and-time-zones" class="scroll-mt-20">
      Ids, locale and time zones
    </h2>
    <ul>
      <li>
        <strong>Ids.</strong> Generated ids (<code>aria-controls</code>,
        <code>aria-labelledby</code>) may differ between the server and the
        browser render; Angular hydration re-binds every attribute from the
        client's values, so they never mismatch. Pass your own
        <code>id</code> where an outside element must point at a component.
      </li>
      <li>
        <strong>Locale.</strong> The grid, tree list, pivot, pager and form
        summaries read <code>LOCALE_ID</code>, the same value on both sides. Set
        it explicitly — a server whose runtime locale differs from your readers'
        then cannot drift.
      </li>
      <li>
        <strong>Time zones.</strong> Scheduler and Gantt layouts that involve
        "today" assume the server and the browser share a time zone. Pass
        <code>timeZone</code> where they may not.
      </li>
    </ul>
    <app-code-block [code]="locale" language="ts" />

    <h2 id="browser-only-work" class="scroll-mt-20">Browser-only work</h2>
    <p>
      The components never touch <code>window</code>, <code>document</code>,
      <code>localStorage</code> or <code>ResizeObserver</code> while
      constructing or destroying, and take observers from the element's own
      window. Your own host code should do the same: render a server default,
      adjust in <code>afterNextRender</code>.
    </p>
    <app-code-block [code]="browserOnly" language="ts" />

    <h2 id="zoneless" class="scroll-mt-20">Zoneless</h2>
    <p>
      The packages make no <code>NgZone</code> assumptions: signal inputs,
      <code>OnPush</code>, and state changes that schedule their own render. An
      Angular 22 app that does not load <code>zone.js</code> is zoneless with
      nothing to configure — this site has no <code>zone.js</code>
      installed at all.
    </p>
    <app-code-block [code]="zoneless" language="ts" />
    <ul>
      <li>
        Mutating a plain array you bound to <code>[data]</code> in place is not
        a change the grid can see. Bind a signal and set a new array, call
        <code>refresh()</code>, or use a <code>DataSource</code> with a
        <code>changes</code> stream (see
        <a
          class="text-indigo-600 underline dark:text-indigo-400"
          routerLink="/guides/performance"
          >Performance</a
        >).
      </li>
      <li>
        In tests, settle the fixture the zoneless way —
        <code>detectChanges()</code>, <code>await whenStable()</code>,
        <code>detectChanges()</code> (see
        <a
          class="text-indigo-600 underline dark:text-indigo-400"
          routerLink="/guides/testing"
          >Testing</a
        >).
      </li>
    </ul>
  `,
})
export class GuideAngularSsrPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly appConfig = APP_CONFIG;
  protected readonly serverConfig = SERVER_CONFIG;
  protected readonly browserOnly = BROWSER_ONLY;
  protected readonly zoneless = ZONELESS;
  protected readonly locale = LOCALE;

  protected readonly claims = [
    [
      'Every Angular family renders on a server with no browser globals',
      '`apps/ssr-smoke/src/server-render.spec.ts` — `renderApplication` per family in plain Node, hydration annotations on, silent console',
    ],
    [
      'Components hydrate the server DOM instead of re-rendering it',
      '`apps/ssr-smoke/src/hydration.spec.ts` — every `ngh` consumed, the server elements survive, no NG05xx',
    ],
    [
      'Every page of this site hydrates',
      '`apps/dev-app-e2e/ssr/hydration.spec.ts` — crawls the sitemap; fails on NG05xx, CSP reports or uncaught errors',
    ],
    [
      'The suite runs under a strict nonce CSP with Trusted Types',
      '`apps/dev-app-e2e/ssr/strict-csp.spec.ts` — see the CSP guide',
    ],
  ];
}
