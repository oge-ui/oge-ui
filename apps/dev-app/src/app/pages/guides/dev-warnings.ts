import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  OGE_DEV_WARNINGS,
  type OgeDevWarningCode,
  type OgeDevWarningInfo,
} from '@oge-ui/core';
import { slugify } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import { GuideTable, cellRuns } from './guide-table';

interface WarningEntry extends OgeDevWarningInfo {
  readonly code: OgeDevWarningCode;
  readonly anchor: string;
}

const ENTRIES: readonly WarningEntry[] = (
  Object.entries(OGE_DEV_WARNINGS) as [OgeDevWarningCode, OgeDevWarningInfo][]
).map(([code, info]) => ({ code, anchor: code.toLowerCase(), ...info }));

/** Code groups by their first digit — one `h2` each; the codes are `h3`s. */
const GROUPS = [
  { digit: '1', label: 'Core' },
  { digit: '2', label: 'Overlays, security and export' },
  { digit: '3', label: 'Component configuration' },
].map((group) => ({
  ...group,
  id: slugify(group.label),
  entries: ENTRIES.filter((entry) => entry.code[3] === group.digit),
}));

const SECTIONS = [
  'How warnings work',
  'All codes',
  ...GROUPS.map((group) => group.label),
];

/**
 * `/guides/dev-warnings` — every coded development warning, rendered from
 * `@oge-ui/core`'s `OGE_DEV_WARNINGS` (the registry `ogeDevWarn` prints
 * from), so a console line's link always lands on its entry.
 */
@Component({
  selector: 'app-guide-dev-warnings',
  imports: [DocHeader, GuideTable, PageToc],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Development warnings"
      category="Guides"
      categoryLink="/guides"
      [chips]="['OGE codes', 'dev mode only', 'both render layers']"
    >
      <p>
        Every warning OGE UI prints while you develop starts with a stable code
        — <code>[OGE3101] …</code> — and ends with a link to its entry below:
        what caused it and what to change. Production builds print none.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <h2 id="how-warnings-work" class="scroll-mt-20">How warnings work</h2>
    <ul>
      <li>
        Angular apps warn while <code>ngDevMode</code> is on (<code
          >ng serve</code
        >, tests) and stay silent in optimized builds. React and other
        toolchains warn when <code>NODE_ENV</code> is
        <code>development</code> or <code>test</code>; with neither signal the
        suite assumes production.
      </li>
      <li>
        A warning that depends on a value (an attribute name, a message key)
        prints once per value, not on every render.
      </li>
      <li>
        <code>OGE3001</code> is a <code>console.error</code>: the inputs
        contradict each other and one of them is ignored. Everything else is a
        <code>console.warn</code>.
      </li>
      <li>
        License notices (<code>[OGE UI] …</code>) are not development warnings:
        the commercial families show them in production on purpose.
      </li>
    </ul>

    <h2 id="all-codes" class="scroll-mt-20">All codes</h2>
    <app-guide-table
      caption="Development warning codes"
      [head]="['Code', 'Warning', 'Printed by']"
      [rows]="summary"
    />

    @for (group of groups; track group.id) {
      <h2 [id]="group.id" class="scroll-mt-20">{{ group.label }}</h2>
      @for (entry of group.entries; track entry.code) {
        <h3 [id]="entry.anchor" class="scroll-mt-20">
          {{ entry.code }} — {{ entry.title }}
        </h3>
        <dl class="app-dev-warning">
          <dt>Cause</dt>
          <dd>
            @for (run of runs(entry.cause); track $index) {
              @if (run.code) {
                <code>{{ run.text }}</code>
              } @else {
                {{ run.text }}
              }
            }
          </dd>
          <dt>Fix</dt>
          <dd>
            @for (run of runs(entry.fix); track $index) {
              @if (run.code) {
                <code>{{ run.text }}</code>
              } @else {
                {{ run.text }}
              }
            }
          </dd>
          <dt>Printed by</dt>
          <dd>{{ entry.packages.join(', ') }}</dd>
        </dl>
      }
    }
  `,
  styles: `
    .app-dev-warning {
      display: grid;
      grid-template-columns: max-content 1fr;
      gap: 4px 16px;
      margin-block: 8px 24px;
    }
    .app-dev-warning dt {
      font-weight: 600;
    }
    .app-dev-warning dd {
      margin: 0;
    }
  `,
})
export class GuideDevWarningsPage {
  protected readonly sections = SECTIONS;
  protected readonly groups = GROUPS;
  protected readonly runs = cellRuns;
  protected readonly summary = ENTRIES.map((e) => [
    e.code,
    e.title,
    e.packages.join(', '),
  ]);
}
