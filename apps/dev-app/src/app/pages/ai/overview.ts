import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CodeBlock } from '../../shared/code-block';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import { AGENTS_BLOCK, FETCH, NG_ADD, RULES } from './overview-snippets';

const SECTIONS = [
  'Machine-readable reference',
  'ng add & AGENTS.md',
  'Rules that matter',
  'Common mistakes',
] as const;

/**
 * The docs page for the AI-facing half of the documentation: what OGE publishes
 * for coding assistants, where it lives, and how to point a project at it.
 */
@Component({
  selector: 'app-ai-overview',
  imports: [CodeBlock, DocHeader, PageToc, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="AI coding assistants"
      category="AI"
      [chips]="['llms.txt', 'llms-full.txt', 'ng add', 'AGENTS.md']"
    >
      <p>
        Assistants are a first-class audience for these docs. Every package
        publishes a machine-readable API reference — on the site and inside the
        installed tarball — so a model writes real OGE code instead of guessing
        at an API it has never seen. Every snippet on this site is compiled in
        CI, so what an assistant copies actually builds.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <h2 id="machine-readable-reference" class="scroll-mt-20">
      Machine-readable reference
    </h2>
    <table class="api-table">
      <thead>
        <tr>
          <th class="w-[38%]">File</th>
          <th>What it contains</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <a href="/llms.txt" class="text-indigo-600 dark:text-indigo-400"
              ><code>/llms.txt</code></a
            >
          </td>
          <td>
            The <a href="https://llmstxt.org" rel="noopener">llmstxt.org</a>
            index: every package and every documentation page, one line each.
            Start here when context is tight.
          </td>
        </tr>
        <tr>
          <td>
            <a
              href="/llms-full.txt"
              class="text-indigo-600 dark:text-indigo-400"
              ><code>/llms-full.txt</code></a
            >
          </td>
          <td>
            Everything inlined: the conventions below, every documented input,
            output, method and type, and every demo as a complete component. The
            best single input for code generation.
          </td>
        </tr>
        <tr>
          <td><code>/llms/&lt;package&gt;.txt</code></td>
          <td>
            One self-contained reference per package — conventions, API tables
            and demos scoped to that family.
          </td>
        </tr>
        <tr>
          <td><code>node_modules/&#64;oge-ui/&lt;pkg&gt;/llms.txt</code></td>
          <td>
            The same per-package file, shipped in the tarball. No network access
            needed: it is on disk right after
            <code>npm install</code>.
          </td>
        </tr>
      </tbody>
    </table>
    <app-code-block [code]="fetch" language="bash" />
    <p>
      These files are generated from the source tree — routes, API tables,
      entry-point exports and demo sources — so they cannot drift from the site,
      and CI fails if the committed copies fall behind.
    </p>

    <h2 id="ng-add-agents-md" class="scroll-mt-20">ng add &amp; AGENTS.md</h2>
    <p>
      Assistants read <code>AGENTS.md</code> before they write code. Running
      <code>ng add</code> writes a short usage block into yours, so every
      assistant working in the repo reaches for OGE by default — and reads the
      reference in <code>node_modules</code> instead of inventing an API.
    </p>
    <app-code-block [code]="ngAdd" language="bash" />
    <p>
      The block lives between markers and is regenerated from the OGE packages
      in your <code>package.json</code>, so installing a second family grows the
      table instead of duplicating the block. Everything outside the markers is
      left untouched.
    </p>
    <app-code-block [code]="agentsBlock" language="md" />
    <p>
      See
      <a
        class="text-indigo-600 hover:underline dark:text-indigo-400"
        routerLink="/getting-started/setup"
        >Set up your project</a
      >
      for the full <code>ng add</code> options.
    </p>

    <h2 id="rules-that-matter" class="scroll-mt-20">Rules that matter</h2>
    <p>
      The seven rules that decide whether generated code compiles. They are the
      opening section of <code>llms-full.txt</code>, repeated here for humans:
    </p>
    <app-code-block [code]="rules" language="ts" />

    <h2 id="common-mistakes" class="scroll-mt-20">Common mistakes</h2>
    <p>
      Models trained on other Angular suites reach for the wrong names.
      <code>llms.txt</code> lists these explicitly, because naming the wrong
      guess works better than only stating the right one:
    </p>
    <table class="api-table">
      <thead>
        <tr>
          <th class="w-[45%]">Wrong</th>
          <th>Right</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><code>&lt;oge-data-grid&gt;</code></td>
          <td><code>&lt;oge-grid&gt;</code></td>
        </tr>
        <tr>
          <td><code>[dataSource]="rows"</code></td>
          <td><code>[data]="rows"</code></td>
        </tr>
        <tr>
          <td><code>import &#123; OgeGridModule &#125;</code></td>
          <td>no modules — <code>imports: [OgeGrid, OgeColumn]</code></td>
        </tr>
        <tr>
          <td><code>&#64;Input() foo</code></td>
          <td><code>readonly foo = input&lt;T&gt;()</code></td>
        </tr>
        <tr>
          <td><code>(onRowClick)</code> / <code>(onSelectionChanged)</code></td>
          <td><code>(rowClick)</code> / <code>(selectionChanged)</code></td>
        </tr>
        <tr>
          <td><code>MatDialog</code> / <code>DialogService</code></td>
          <td>
            <code>&lt;oge-modal&gt;</code> or
            <code>OgeModalService.open()</code>
          </td>
        </tr>
        <tr>
          <td><code>MessageService</code> / <code>MatSnackBar</code></td>
          <td><code>OgeToastService.show()</code></td>
        </tr>
        <tr>
          <td><code>::ng-deep .oge-grid-row</code></td>
          <td>override a <code>--oge-*</code> token</td>
        </tr>
      </tbody>
    </table>
  `,
})
export class AiOverviewPage {
  protected readonly sections = SECTIONS;
  protected readonly fetch = FETCH;
  protected readonly ngAdd = NG_ADD;
  protected readonly agentsBlock = AGENTS_BLOCK;
  protected readonly rules = RULES;
}
