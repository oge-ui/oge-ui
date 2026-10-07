import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import { SITE_VERSION } from '../../shared/site-version';
import { CRITERIA, summarize, type CriterionRow } from './conformance-data';
import { GuideTable } from './guide-table';

const SECTIONS = [
  'Report details',
  'Summary',
  'Level A',
  'Level AA',
  'Terms',
] as const;

const toRow = (row: CriterionRow): readonly string[] => [
  `${row.id} ${row.name}`,
  row.conformance,
  row.remarks,
];

/**
 * `/guides/accessibility/conformance` — the accessibility conformance report
 * (ACR) in the VPAT 2.5 format, WCAG 2.2 A and AA, self-assessed.
 */
@Component({
  selector: 'app-guide-conformance',
  imports: [DocHeader, GuideTable, PageToc, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Accessibility conformance report"
      category="Guides"
      categoryLink="/guides"
      [chips]="['VPAT 2.5', 'WCAG 2.2 A / AA', 'self-assessed']"
    >
      <p>
        An accessibility conformance report for the OGE UI component suite,
        following the VPAT® 2.5 format and its WCAG 2.2 table. It is
        <strong>self-assessed</strong> by the maintainers from the automated
        tests named in the remarks; it is not a third-party audit. How the
        components get there is in the
        <a
          class="text-indigo-600 underline dark:text-indigo-400"
          routerLink="/guides/accessibility"
          >accessibility guide</a
        >.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <h2 id="report-details" class="scroll-mt-20">Report details</h2>
    <app-guide-table
      caption="Report details"
      [head]="['Item', 'Value']"
      [rows]="details"
    />

    <h2 id="summary" class="scroll-mt-20">Summary</h2>
    <app-guide-table
      caption="Criteria per conformance level"
      [head]="['Conformance level', 'Criteria']"
      [rows]="summary"
    />

    <h2 id="level-a" class="scroll-mt-20">Level A</h2>
    <app-guide-table
      caption="WCAG 2.2 level A success criteria"
      [head]="['Criterion', 'Conformance level', 'Remarks and explanations']"
      [rows]="levelA"
    />

    <h2 id="level-aa" class="scroll-mt-20">Level AA</h2>
    <app-guide-table
      caption="WCAG 2.2 level AA success criteria"
      [head]="['Criterion', 'Conformance level', 'Remarks and explanations']"
      [rows]="levelAA"
    />

    <h2 id="terms" class="scroll-mt-20">Terms</h2>
    <app-guide-table
      caption="Conformance level terms"
      [head]="['Term', 'Meaning']"
      [rows]="terms"
    />
    <p>
      Level AAA criteria were not evaluated. "VPAT" is a registered service mark
      of the Information Technology Industry Council (ITI).
    </p>
  `,
})
export class GuideConformancePage {
  protected readonly sections = SECTIONS;

  protected readonly details = [
    ['Product', 'OGE UI — Angular and React component packages (`@oge-ui/*`)'],
    ['Version', SITE_VERSION],
    ['Report date', '2026-10-08'],
    ['Standard', 'WCAG 2.2, levels A and AA'],
    [
      'Evaluation methods',
      'Self-assessment from automated tests: axe-core over every docs page in both render layers (nightly) and in about 95 component specs (every pull request), keyboard and ARIA assertions in Playwright, emulated forced colours and reduced motion, colour contrast scans. No manual screen-reader test is recorded.',
    ],
    [
      'Scope',
      'The components as shipped with their default, dark and high-contrast themes. Page-level criteria (titles, language, bypass blocks, navigation) belong to the application using them.',
    ],
    [
      'Other standards',
      'The Revised Section 508 and EN 301 549 web chapters reference these same WCAG criteria and are not repeated here.',
    ],
  ];

  protected readonly summary = summarize(CRITERIA).map(([level, count]) => [
    level,
    String(count),
  ]);
  protected readonly levelA = CRITERIA.filter((row) => row.level === 'A').map(
    toRow,
  );
  protected readonly levelAA = CRITERIA.filter((row) => row.level === 'AA').map(
    toRow,
  );

  protected readonly terms = [
    [
      'Supports',
      'The functionality meets the criterion without known defects.',
    ],
    [
      'Partially Supports',
      'Some functionality does not meet the criterion, or it is not verified; the remark says which.',
    ],
    [
      'Does Not Support',
      'The majority of the functionality does not meet the criterion.',
    ],
    [
      'Not Applicable',
      'The criterion is not relevant to a component library, or is met by the host application.',
    ],
  ];
}
