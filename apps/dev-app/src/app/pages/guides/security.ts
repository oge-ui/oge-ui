import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CodeBlock } from '../../shared/code-block';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import { GuideTable } from './guide-table';
import {
  ANGULAR_NONCE,
  ANGULAR_NONCE_PROVIDER,
  EDITOR_SANITIZE,
  SANITIZE_URL_REACT,
  STATIC_POLICY,
  STRICT_POLICY,
} from './security-snippets';

const REPO = 'https://github.com/oge-ui/oge-ui/blob/main';

const SECTIONS = [
  'What the packages need',
  'A tested strict policy',
  'Nonces',
  'Trusted Types',
  'URLs from data',
  'Rich text',
  'What is not covered',
] as const;

/**
 * `/guides/security` — running the suite under a strict CSP with Trusted
 * Types, stated as what `strict-csp.spec.ts` serves and drives.
 */
@Component({
  selector: 'app-guide-security',
  imports: [CodeBlock, DocHeader, GuideTable, PageToc, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="CSP and Trusted Types"
      category="Guides"
      categoryLink="/guides"
      [chips]="['strict-dynamic', 'nonce', 'require-trusted-types-for']"
    >
      <p>
        OGE UI runs under a strict Content Security Policy: no inline scripts,
        no <code>eval</code>, no string-built DOM, and two named Trusted Types
        policies for the only two parsers in the suite. The policy below is the
        one the end-to-end suite serves this site under.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <h2 id="what-the-packages-need" class="scroll-mt-20">
      What the packages need
    </h2>
    <app-guide-table
      caption="CSP directives and what OGE UI needs from them"
      [head]="['Directive', 'OGE UI needs', 'Why']"
      [rows]="directives"
    />
    <p>
      A static host cannot mint a per-request nonce. There, allow the component
      styles inline and keep scripts strict:
    </p>
    <app-code-block [code]="staticPolicy" language="bash" />

    <h2 id="a-tested-strict-policy" class="scroll-mt-20">
      A tested strict policy
    </h2>
    <p>
      <code>apps/dev-app-e2e/ssr/strict-csp.spec.ts</code> serves the
      prerendered site with this header (a fresh nonce per request) and fails on
      any <code>securitypolicyviolation</code> while it hydrates the pages,
      exports a grid to CSV and Excel (the lazy export chunk loads under
      <code>'strict-dynamic'</code>), imports BPMN XML, renders an HTML overlay
      badge, opens a modal in both render layers and exports a chart to JPEG and
      PDF.
    </p>
    <app-code-block [code]="strictPolicy" language="bash" />

    <h2 id="nonces" class="scroll-mt-20">Nonces</h2>
    @if (fw.isReact()) {
      <p>
        The React packages add no <code>&lt;script&gt;</code> and no
        <code>&lt;style&gt;</code> element at runtime: their CSS is the
        stylesheet you import (<code>&#64;oge-ui/react-*/styles.css</code>),
        served as a file. A nonce is only needed for what your framework emits —
        in Next.js, the scripts it adds to the page. Layout values
        (virtual-scroll offsets, popup positions) are written as inline
        <code>style</code> attributes, which is what
        <code>style-src-attr 'unsafe-inline'</code> admits; they cannot run
        script.
      </p>
      <p>
        The one runtime <code>&lt;style&gt;</code> is the scheduler's print
        sheet, added to its print frame by <code>print()</code>. It carries the
        nonce of the page's own nonce'd style or script elements, or the one you
        pass: <code>ref.current?.print({{ '{' }} nonce {{ '}' }})</code>.
      </p>
    } @else {
      <p>
        Angular adds a <code>&lt;style&gt;</code> element per component
        stylesheet, OGE's included. Give Angular the request's nonce and it
        stamps it on each of them — the strict run injects it as
        <code>ngCspNonce</code> on the root element, the way a nonce-injecting
        SSR server or edge function would:
      </p>
      <app-code-block [code]="angularNonce" language="html" />
      <app-code-block [code]="angularNonceProvider" language="ts" />
      <p>
        Server-rendered layout values (virtual-scroll offsets, popup positions)
        arrive as inline <code>style</code> attributes, hence
        <code>style-src-attr 'unsafe-inline'</code>; they cannot run script.
      </p>
      <p>
        The scheduler's <code>print()</code> adds a print sheet to its print
        frame as a <code>&lt;style&gt;</code> element; it carries the same
        <code>CSP_NONCE</code> (or
        <code>print({{ '{' }} nonce {{ '}' }})</code>, or the nonce of the
        page's own nonce'd elements), so a nonce-only
        <code>style-src</code> admits it.
      </p>
    }

    <h2 id="trusted-types" class="scroll-mt-20">Trusted Types</h2>
    <p>
      Under <code>require-trusted-types-for 'script'</code> the suite has
      exactly two sinks, both <code>DOMParser.parseFromString</code> into an
      inert document that is only walked, never inserted. Each engine creates
      its policy once, lazily, the first time it parses.
    </p>
    <app-guide-table
      caption="Trusted Types policy names"
      [head]="['Policy', 'Created by', 'When']"
      [rows]="policies"
    />
    <p>
      The suite never calls a <code>bypassSecurityTrust*</code> API, so
      <code>angular#unsafe-bypass</code> is not needed. A new sink must reuse a
      documented policy or add one to
      <a
        class="text-indigo-600 underline dark:text-indigo-400"
        [href]="repo + '/SECURITY.md'"
        >SECURITY.md</a
      >
      — the strict run reads its list of names from that file, so an
      undocumented policy fails it.
    </p>

    <h2 id="urls-from-data" class="scroll-mt-20">URLs from data</h2>
    <p>
      Data-driven links (menu items, breadcrumbs, menubar items) can carry a
      <code>javascript:</code> URL. Angular's <code>[href]</code> binding
      neutralises it; React's <code>href</code> does not, so every React
      component routes data-driven <code>href</code>/<code>src</code> through
      <code>sanitizeUrl</code> / <code>sanitizeResourceUrl</code> from
      <code>&#64;oge-ui/behavior</code>. Use the same functions for links you
      render yourself:
    </p>
    <app-guide-table
      caption="URL sanitizer behaviour"
      [head]="['Input', 'sanitizeUrl', 'sanitizeResourceUrl']"
      [rows]="urlRows"
    />
    <app-code-block [code]="sanitizeUrlReact" language="tsx" />

    <h2 id="rich-text" class="scroll-mt-20">Rich text</h2>
    <p>
      The rich-text editor is the one component whose value is markup. The bound
      value, every paste and drop, and <code>insertHtml()</code> go through one
      allowlist parser into the editor's document model: allow-listed tags,
      <code>href</code> (<code>sanitizeUrl</code>),
      <code>src</code> (<code>sanitizeResourceUrl</code>; no <code>blob:</code>,
      <code>file:</code> or SVG; <code>data:image/*</code> only with
      <code>allowDataImages</code>), <code>alt</code>, <code>title</code>,
      <code>dir</code>, validated colours and <code>text-align</code>.
      Everything else — <code>script</code>, <code>style</code>,
      <code>svg</code>, <code>iframe</code>, event handlers — is dropped, and
      the emitted value is re-serialized from the model.
      <code>ogeSanitizeEditorHtml()</code> applies the same allowlist to HTML
      you render elsewhere, in the browser or on a server:
    </p>
    <app-code-block [code]="editorSanitize" language="ts" />
    <p>
      Client-side sanitizing is a convenience, not your server's defence: still
      sanitize stored HTML on the server, as you would any user-written markup.
      The same goes for upload rules — see
      <a
        class="text-indigo-600 underline dark:text-indigo-400"
        [href]="repo + '/SECURITY.md'"
        >SECURITY.md</a
      >
      for exports (CSV formula guard), restored state and the reporting process.
    </p>

    <h2 id="what-is-not-covered" class="scroll-mt-20">What is not covered</h2>
    <ul>
      <li>
        The strict run does not drive the rich-text editor yet; its
        <code>oge-ui#editor</code> policy is documented and listed in the
        policy, but no end-to-end test types into the editor under
        <code>require-trusted-types-for</code>.
      </li>
      <li>
        The production docs site itself uses the static-host shape (script
        hashes, <code>'unsafe-inline'</code> styles) — see the
        <a
          class="text-indigo-600 underline dark:text-indigo-400"
          routerLink="/guides/angular-ssr"
          >SSR guide</a
        >
        for the one inline script event replay needs.
      </li>
    </ul>
  `,
})
export class GuideSecurityPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly repo = REPO;
  protected readonly strictPolicy = STRICT_POLICY;
  protected readonly staticPolicy = STATIC_POLICY;
  protected readonly angularNonce = ANGULAR_NONCE;
  protected readonly angularNonceProvider = ANGULAR_NONCE_PROVIDER;
  protected readonly sanitizeUrlReact = SANITIZE_URL_REACT;
  protected readonly editorSanitize = EDITOR_SANITIZE;

  protected readonly directives = [
    [
      '`script-src`',
      "`'self'` (or a nonce with `'strict-dynamic'`)",
      'No inline scripts, no `eval`, no `new Function`, no `document.write`. Export libraries load as ordinary lazy chunks.',
    ],
    [
      '`style-src`',
      "`'self'` + a nonce (Angular) or `'unsafe-inline'`",
      'Angular adds component `<style>` elements; React ships a stylesheet file.',
    ],
    [
      '`style-src-attr`',
      "`'unsafe-inline'`",
      'Layout values in server-rendered `style` attributes (virtual-scroll offsets, panel positions).',
    ],
    [
      '`img-src`',
      "`'self' data: blob:`",
      'Upload previews and image exports use object URLs; the editor allows `data:image/*` only when enabled.',
    ],
    [
      '`font-src`',
      "`'self'`",
      'PDF exports embed only a font you serve (`setOgePdfDefaultFont()`); nothing is fetched from a CDN.',
    ],
    [
      '`connect-src`',
      'your API only',
      'Components fetch nothing on their own; remote data goes through your `DataSource`.',
    ],
    [
      '`require-trusted-types-for`',
      "`'script'` + the policy names below",
      'Two parsers, each behind a named policy.',
    ],
  ];

  protected readonly policies = [
    [
      '`oge-ui#editor`',
      '`@oge-ui/behavior` (used by `@oge-ui/editor`, `@oge-ui/react-editor`)',
      'Parsing a value or a clipboard payload in the rich-text editor.',
    ],
    [
      '`oge-ui#bpmn`',
      '`@oge-ui/bpmn-engine`',
      'Importing BPMN XML, and overlay badge markup in the React layer.',
    ],
    [
      '`angular`',
      'Angular',
      'Its sanitizing `[innerHTML]` (BPMN overlay badges in the Angular layer). Angular apps only.',
    ],
    ['`angular#bundler`', 'Angular', 'Loading lazy chunks. Angular apps only.'],
  ];

  protected readonly urlRows = [
    [
      '`/orders/42`, `https://…`, `mailto:`, `tel:`, `ftp:`, `sms:`',
      'kept',
      'kept',
    ],
    [
      '`javascript:`, `vbscript:`, unknown schemes',
      '`about:blank`',
      '`about:blank`',
    ],
    ['`blob:…`, `data:image/png;…`', '`about:blank`', 'kept'],
    ['`data:text/html;…` (markup)', '`about:blank`', '`about:blank`'],
    [
      "a custom scheme with `allowedSchemes: ['web+app']`",
      'kept',
      '`about:blank` (no options)',
    ],
  ];
}
