import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CodeBlock } from '../../shared/code-block';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import { SITE_VERSION } from '../../shared/site-version';
import { GuideTable } from './guide-table';
import { DEPRECATED_MEMBER, LOCKSTEP } from './versioning-snippets';

const REPO = 'https://github.com/oge-ui/oge-ui/blob/main';

const SECTIONS = [
  'Version numbers',
  'What a release may contain',
  'Deprecations',
  'Supported versions',
  'How the promise is checked',
  'Decision records',
] as const;

/**
 * `/guides/versioning` — the release, compatibility and deprecation policy,
 * stated as what the release history and the CI gates actually do.
 */
@Component({
  selector: 'app-guide-versioning',
  imports: [CodeBlock, DocHeader, GuideTable, PageToc, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Versioning and deprecation"
      category="Guides"
      categoryLink="/guides"
      [chips]="['semver', 'lockstep releases', 'v' + version]"
    >
      <p>
        How OGE UI numbers its releases, what an upgrade inside a major may
        change, how a deprecation reaches you before anything is removed, and
        which versions still get fixes. The same policy covers the Angular
        packages, the React packages and the framework-free engines.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <h2 id="version-numbers" class="scroll-mt-20">Version numbers</h2>
    <ul>
      <li>
        <strong>One version for the whole suite.</strong> Every
        <code>&#64;oge-ui/*</code> package — Angular, React, engines, locales —
        is released together with the same number, and the packages depend on
        each other at that exact version. Keep all of them on one version; a
        mixed install pulls in two copies of <code>&#64;oge-ui/core</code> and
        <code>&#64;oge-ui/behavior</code>.
      </li>
      <li>
        <strong>Small, frequent patch releases.</strong> The 1.x line ships as
        <code>1.1.1</code>, <code>1.1.2</code>, <code>1.1.3</code>, … — new
        components and new members arrive in these releases too, instead of
        waiting for a minor. The compatibility rules below are what such a
        release promises.
      </li>
      <li>
        <strong>The docs site is always the latest release</strong>
        (v{{ version }}). The 0.13 line stays readable as a frozen copy at
        <a
          class="text-indigo-600 underline dark:text-indigo-400"
          href="https://v0-13.ogeui.com"
          >v0-13.ogeui.com</a
        >; there is no per-patch archive.
      </li>
    </ul>
    <app-code-block [code]="lockstep" language="bash" />

    <h2 id="what-a-release-may-contain" class="scroll-mt-20">
      What a release may contain
    </h2>
    <app-guide-table
      caption="What each kind of release may change"
      [head]="['Change', 'Within 1.x', 'Only in a major (2.0)']"
      [rows]="releaseRows"
    />
    <p>
      Behaviour changes inside 1.x are rare and never silent: each one is listed
      under <strong>Migration notes / behaviour changes</strong> in that release
      of the
      <a
        class="text-indigo-600 underline dark:text-indigo-400"
        routerLink="/changelog"
        >changelog</a
      >, with the one-line setting that restores the old behaviour (1.1.2:
      <code>columnHidingMode="hide"</code>, <code>adaptiveMode</code> stays
      <code>'none'</code> unless you opt in).
    </p>

    <h2 id="deprecations" class="scroll-mt-20">Deprecations</h2>
    <p>A member is deprecated before it is removed, never removed directly:</p>
    <app-guide-table
      caption="Where a deprecation is announced"
      [head]="['Channel', 'What you see']"
      [rows]="deprecationChannels"
    />
    <app-code-block [code]="deprecatedMember" language="ts" />
    <p>
      A deprecated member keeps working for at least one minor release and is
      removed no earlier than the release after that. Every member deprecated so
      far still works in v{{ version }}:
    </p>
    <app-guide-table
      caption="Deprecated members and their replacements"
      [head]="['Deprecated', 'Since', 'Use instead']"
      [rows]="deprecated"
    />

    <h2 id="supported-versions" class="scroll-mt-20">Supported versions</h2>
    <app-guide-table
      caption="Release lines, platforms and support status"
      [head]="['OGE', 'Angular', 'React', 'Node (tooling)', 'Status']"
      [rows]="support"
    />
    <ul>
      <li>
        Fixes, security fixes included, ship as a patch of the latest release;
        older 1.x patches are not back-ported to. Report vulnerabilities as
        described in
        <a
          class="text-indigo-600 underline dark:text-indigo-400"
          [href]="repo + '/SECURITY.md'"
          >SECURITY.md</a
        >.
      </li>
      <li>
        Peer ranges are declared, not implied: Angular packages accept
        <code>&#64;angular/core &gt;=22.0.0 &lt;24.0.0</code>, React packages
        <code>react ^18.0.0 || ^19.0.0</code>. A new framework major is added to
        the range once the suite passes on it; dropping one is a major-only
        change.
      </li>
      <li>
        Browsers: the last two versions of Chrome, Edge, Firefox and Safari,
        plus iOS Safari and Chrome for Android (<code>.browserslistrc</code>).
      </li>
    </ul>

    <h2 id="how-the-promise-is-checked" class="scroll-mt-20">
      How the promise is checked
    </h2>
    <app-guide-table
      caption="CI gates behind the compatibility promise"
      [head]="['Gate', 'Fails when']"
      [rows]="gates"
    />

    <h2 id="decision-records" class="scroll-mt-20">Decision records</h2>
    <p>
      Changes to the platform strategy are written down as architecture decision
      records before they ship:
    </p>
    <ul>
      @for (adr of adrs; track adr.file) {
        <li>
          <a
            class="text-indigo-600 underline dark:text-indigo-400"
            [href]="repo + '/docs/adr/' + adr.file"
            >{{ adr.title }}</a
          >
          — {{ adr.note }}
        </li>
      }
    </ul>
  `,
})
export class GuideVersioningPage {
  protected readonly sections = SECTIONS;
  protected readonly version = SITE_VERSION;
  protected readonly repo = REPO;
  protected readonly lockstep = LOCKSTEP;
  protected readonly deprecatedMember = DEPRECATED_MEMBER;

  protected readonly releaseRows = [
    ['Bug and security fixes', 'Yes — every release', '—'],
    ['New components, packages, inputs, outputs, props, methods', 'Yes', '—'],
    [
      'New message keys (with English defaults)',
      'Yes — a partial catalog keeps working',
      '—',
    ],
    [
      'A changed default or behaviour',
      'Rarely — listed under Migration notes with the setting that restores it',
      'Yes',
    ],
    ['Deprecating a member', 'Yes — announced, still working', '—'],
    [
      'Removing or renaming an export, input, prop or message key',
      'No',
      'Yes, after a deprecation',
    ],
    ['Dropping a supported Angular, React or Node major', 'No', 'Yes'],
  ];

  protected readonly deprecationChannels = [
    [
      'TSDoc `@deprecated`',
      'Your editor strikes the member through and names the replacement.',
    ],
    [
      'Dev-mode console warning',
      'Once per key, for deprecated message keys that are still honoured (`[oge] the "…" message is deprecated…`). Production builds stay silent.',
    ],
    [
      'Changelog',
      'The release that deprecates it says so, with the replacement.',
    ],
    ['API reference', 'The member stays documented until it is removed.'],
  ];

  protected readonly deprecated = [
    [
      '`rowCountOneAnnouncement` (grid, tree list messages)',
      '1.1.2',
      'An ICU `one {…}` branch in `rowCountAnnouncement`',
    ],
    ['`rowsSuffix` (grid, tree list messages)', '1.1.2', '`pagerInfo`'],
    [
      '`validationSummaryTitleOne` (forms messages)',
      '1.1.2',
      'An ICU `one {…}` branch in `validationSummaryTitle`',
    ],
    [
      '`OGE_PIVOT_FIELD_DRAG_TYPE`, `OgePivotDragLike`',
      '1.1.2',
      'Nothing — field chips use a pointer drag; kept so imports compile',
    ],
    [
      '`buildSearchHighlightHtml` (`@oge-ui/core`)',
      '0.13.1',
      '`buildSearchHighlightSegments` — real text nodes and `<mark>` elements',
    ],
  ];

  protected readonly support = [
    [
      '1.x',
      '22 – 23',
      '18 – 19',
      '≥ 22.22',
      'Supported — fixes land on the latest 1.1.x',
    ],
    ['0.13.x', '22', '—', '≥ 22.22', 'Security fixes only, until 2027-04-01'],
    [
      '< 0.13',
      '—',
      '—',
      '—',
      'End of life — upgrade (migration notes in the changelog)',
    ],
  ];

  protected readonly gates = [
    [
      '`api-check`',
      'A public signature of `@oge-ui/core` or `@oge-ui/behavior` changes without an updated API report (API Extractor).',
    ],
    [
      '`package-check`',
      'A package breaks a resolution mode (`publint`, Are the Types Wrong).',
    ],
    [
      '`size-check`',
      'An entry point grows by more than 10 % gzip over its baseline.',
    ],
    [
      '`license-boundary-check`',
      'An MIT package depends on, or imports, a commercial one.',
    ],
    [
      '`docs-tools:parity`',
      'The Angular and React API tables of a family stop matching without a recorded reason.',
    ],
  ];

  protected readonly adrs = [
    {
      file: '0001-multi-framework-strategy.md',
      title: 'ADR 0001 — Multi-framework strategy',
      note: 'one framework-free engine, an Angular and a React render layer',
    },
    {
      file: '0002-framework-aware-docs.md',
      title: 'ADR 0002 — Framework-aware docs',
      note: 'one docs site with a global Angular / React switch',
    },
    {
      file: '0003-commercial-engine-packages.md',
      title: 'ADR 0003 — Commercial engine packages',
      note: 'per-family engine packages, and no runtime licence check',
    },
  ];
}
