import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CodeBlock } from '../../shared/code-block';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import { RUN } from './benchmarks-snippets';
// The committed results file the runner writes — never a second copy of the numbers.
// eslint-disable-next-line @nx/enforce-module-boundaries -- a build-time data file at the repo root, not a project import
import report from '../../../../../../tools/benchmarks/grid-results.json';

const SECTIONS = ['Results', 'What is measured', 'Run it yourself'] as const;

interface Row {
  readonly label: string;
  readonly angular: string;
  readonly react: string;
}

type Results = Record<string, number>;
const angular = report.results.angular as Results;
const react = report.results.react as Results;
const ms = (v: number | undefined) => (v === undefined ? '—' : `${v} ms`);

const ROWS: readonly Row[] = [
  {
    label: `First render (${report.rows.toLocaleString('en-US')} rows)`,
    angular: ms(angular['firstRender']),
    react: ms(react['firstRender']),
  },
  ...(report.steps as readonly { key: string; label: string }[]).map(
    (step) => ({
      label: step.label,
      angular: ms(angular[step.key]),
      react: ms(react[step.key]),
    }),
  ),
  {
    label: 'Scroll: frames per second',
    angular: `${angular['scrollFps']} fps`,
    react: `${react['scrollFps']} fps`,
  },
  {
    label: 'Scroll: 95th percentile frame',
    angular: ms(angular['p95FrameMs']),
    react: ms(react['p95FrameMs']),
  },
  {
    label: 'Scroll: frames over 50 ms',
    angular: String(angular['longFrames']),
    react: String(react['longFrames']),
  },
];

/**
 * `/benchmarks` — the data grid's measured performance: the committed output
 * of `tools/benchmarks/grid-bench.mjs`, with the method and how to reproduce.
 */
@Component({
  selector: 'app-benchmarks',
  imports: [CodeBlock, DocHeader, PageToc, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Benchmarks"
      category="Resources"
      categoryLink="/changelog"
      [chips]="[
        report.rows.toLocaleString('en-US') + ' rows',
        'production build',
        'median of ' + report.runs,
      ]"
    >
      <p>
        How the data grid performs on {{ report.rows.toLocaleString('en-US') }}
        rows, in Angular and in React: the first render, filtering, sorting and
        the frame rate while scrolling. The numbers are the committed output of
        a script you can run on your own machine — the method is below.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <h2 id="results" class="scroll-mt-20">Results</h2>
    <div class="overflow-x-auto">
      <table class="w-full text-left text-sm">
        <caption class="mb-2 text-left text-gray-600 dark:text-gray-300">
          Medians of
          {{
            report.runs
          }}
          fresh-browser runs,
          {{
            report.date
          }}
          (commit
          <code>{{ report.commit }}</code
          >)
        </caption>
        <thead>
          <tr class="border-b border-gray-200 dark:border-gray-700">
            <th scope="col" class="py-2 pe-4">Measurement</th>
            <th scope="col" class="py-2 pe-4 text-right">Angular</th>
            <th scope="col" class="py-2 text-right">React</th>
          </tr>
        </thead>
        <tbody>
          @for (row of rows; track row.label) {
            <tr class="border-b border-gray-100 dark:border-gray-800">
              <th scope="row" class="py-2 pe-4 font-normal">{{ row.label }}</th>
              <td class="py-2 pe-4 text-right tabular-nums">
                {{ row.angular }}
              </td>
              <td class="py-2 text-right tabular-nums">{{ row.react }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
    <p class="text-sm text-gray-600 dark:text-gray-300">
      Machine: {{ report.machine.cpu }} ({{ report.machine.cores }} logical
      cores, {{ report.machine.memoryGb }} GB), {{ report.machine.os }},
      {{ report.machine.browser }}, Node {{ report.machine.node }}.
    </p>

    <h2 id="what-is-measured" class="scroll-mt-20">What is measured</h2>
    <ul>
      <li>
        <strong>The grid only.</strong> The page generates the rows (seven
        columns: number, text, date and boolean) before the clock starts, then
        mounts one grid with virtual scrolling in a 600 px viewport.
      </li>
      <li>
        <strong>First render</strong> runs from mounting the grid until its
        first rows are in the DOM and a frame has painted.
      </li>
      <li>
        <strong>Filter and sort</strong> run from the change — a
        <code>filterValue</code>, a click on a column header — until the grid
        updated the DOM and the next frame painted. Text filters fold case and
        accents, as the
        <a
          routerLink="/guides/filter-contract"
          class="text-indigo-600 underline dark:text-indigo-400"
          >filter contract</a
        >
        requires.
      </li>
      <li>
        <strong>Scrolling</strong> moves the viewport 120 px per animation frame
        for 180 frames and reports the frame rate, the 95th-percentile frame
        time and the frames over 50 ms (the ones a person notices).
      </li>
      <li>
        Each run uses a fresh browser context on a production build, so caches
        and the JIT start cold; the table shows the median.
      </li>
    </ul>

    <h2 id="run-it-yourself" class="scroll-mt-20">Run it yourself</h2>
    <app-code-block [code]="run" language="bash" />
    <p>
      The script serves the build itself (or takes <code>--url</code>), drives
      <code>/benchmarks/run</code> with Playwright's Chromium and rewrites the
      results file this page renders. Numbers depend on the machine; compare
      runs on the same one. What each package adds to your bundle is on the
      <a
        routerLink="/bundle-size"
        class="text-indigo-600 underline dark:text-indigo-400"
        >bundle size</a
      >
      page, and the settings that matter for large data are in the
      <a
        routerLink="/guides/performance"
        class="text-indigo-600 underline dark:text-indigo-400"
        >performance guide</a
      >.
    </p>
  `,
})
export class BenchmarksPage {
  protected readonly report = report;
  protected readonly rows = ROWS;
  protected readonly sections = SECTIONS;
  protected readonly run = RUN;
}
