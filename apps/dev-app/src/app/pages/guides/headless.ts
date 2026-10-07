import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CodeBlock } from '../../shared/code-block';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import { GuideTable } from './guide-table';
import {
  ADAPTER,
  BPMN_ENGINE,
  CHARTS_ENGINE,
  CORE_CSV,
  CORE_QUERY,
  SCHEDULER_ENGINE,
} from './headless-snippets';

const REPO = 'https://github.com/oge-ui/oge-ui/blob/main';

const SECTIONS = [
  'The three layers',
  'Data processing in core',
  'Interaction cores in behavior',
  'Family engines',
  'Licensing',
] as const;

/** `/guides/headless` — the framework-free engines used directly. */
@Component({
  selector: 'app-guide-headless',
  imports: [CodeBlock, DocHeader, GuideTable, PageToc, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Headless engines"
      category="Guides"
      categoryLink="/guides"
      [chips]="['@oge-ui/core', '@oge-ui/behavior', '@oge-ui/*-engine']"
    >
      <p>
        Both render layers run on the same framework-free code. You can use it
        without the components: query rows on a server, expand a recurrence rule
        in a worker, render a BPMN diagram to SVG in a build step, or put your
        own markup over the grid's data pipeline.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <h2 id="the-three-layers" class="scroll-mt-20">The three layers</h2>
    <app-guide-table
      caption="Framework-free packages"
      [head]="['Package', 'Contains', 'Licence']"
      [rows]="layers"
    />
    <p>
      None of them imports Angular or React (a lint rule enforces it), and their
      public API is snapshot-checked: <code>&#64;oge-ui/core</code> and
      <code>&#64;oge-ui/behavior</code> fail CI when a signature changes without
      an updated API report.
    </p>

    <h2 id="data-processing-in-core" class="scroll-mt-20">
      Data processing in core
    </h2>
    <app-guide-table
      caption="Headline functions of @oge-ui/core"
      [head]="['Function', 'Does']"
      [rows]="coreFunctions"
    />
    <app-code-block [code]="coreQuery" language="ts" />
    <app-code-block [code]="coreCsv" language="ts" />

    <h2 id="interaction-cores-in-behavior" class="scroll-mt-20">
      Interaction cores in behavior
    </h2>
    <p>
      <code>&#64;oge-ui/behavior</code> holds the machines both render layers
      share — keyboard models, selection, virtualization windows, the grid's
      state and data cores, masks, the editor's document model — plus the
      message catalogs and config defaults. Machines that hold state take an
      <code>OgeReactivityAdapter</code>, which is how one implementation runs on
      Angular signals and on React:
    </p>
    <app-code-block [code]="adapter" language="ts" />
    <app-guide-table
      caption="Selected behavior exports"
      [head]="['Export', 'Shape']"
      [rows]="behaviorExports"
    />
    <p>
      These are the layer the components are built from, and their constructors
      take the dependencies a render layer wires up. For an app, the stand-alone
      functions (sanitizers, the editor HTML model, motion and direction
      helpers) are the practical entry; the stateful cores are for building a
      render layer of your own.
    </p>

    <h2 id="family-engines" class="scroll-mt-20">Family engines</h2>
    <p>
      Each commercial family keeps its engine in its own package; the Angular
      and the React package of the family both depend on it, so installing
      either brings it along.
    </p>
    <app-code-block [code]="schedulerEngine" language="ts" />
    <app-code-block [code]="bpmnEngine" language="ts" />
    <app-code-block [code]="chartsEngine" language="ts" />
    <app-guide-table
      caption="Engine packages and headline exports"
      [head]="['Package', 'Headline exports']"
      [rows]="engines"
    />

    <h2 id="licensing" class="scroll-mt-20">Licensing</h2>
    <ul>
      <li>
        <code>&#64;oge-ui/core</code> and <code>&#64;oge-ui/behavior</code> are
        MIT, and will stay MIT.
      </li>
      <li>
        The six <code>&#64;oge-ui/&lt;family&gt;-engine</code> packages carry
        their family's commercial licence, exactly like the family's Angular and
        React packages: free for evaluation, development and testing; production
        use needs a paid licence — using the engine without the components is
        still use of the family.
      </li>
      <li>
        There is no licence key, runtime check, watermark or network call in any
        package; the licence is enforced by its text (<a
          class="text-indigo-600 underline dark:text-indigo-400"
          [href]="repo + '/docs/adr/0003-commercial-engine-packages.md'"
          >ADR 0003</a
        >). Terms:
        <a
          class="text-indigo-600 underline dark:text-indigo-400"
          routerLink="/license"
          >Licensing</a
        >.
      </li>
    </ul>
  `,
})
export class GuideHeadlessPage {
  protected readonly sections = SECTIONS;
  protected readonly repo = REPO;
  protected readonly coreQuery = CORE_QUERY;
  protected readonly coreCsv = CORE_CSV;
  protected readonly adapter = ADAPTER;
  protected readonly schedulerEngine = SCHEDULER_ENGINE;
  protected readonly bpmnEngine = BPMN_ENGINE;
  protected readonly chartsEngine = CHARTS_ENGINE;

  protected readonly layers = [
    [
      '`@oge-ui/core`',
      'Data: query pipeline, data sources, grouping and summaries, pivot aggregation, tree utilities, CSV, state validators',
      'MIT',
    ],
    [
      '`@oge-ui/behavior`',
      'Interaction: grid, list, overlay, editor and input machines; sanitizers; config defaults and messages; Excel / PDF builders',
      'MIT',
    ],
    [
      '`@oge-ui/<family>-engine`',
      'Charts, scheduler, Gantt, kanban, BPMN and pivot layout logic',
      'Commercial',
    ],
  ];

  protected readonly coreFunctions = [
    [
      '`runLoadOptions(rows, options, config?)`',
      'Filter → search → sort → group and summaries, or page — the in-memory grid query',
    ],
    [
      '`applyFilter`, `applySort`, `applyPaging`, `groupRows`, `createFilterPredicate`',
      'The pipeline steps on their own',
    ],
    [
      '`ArrayDataSource`, `CustomDataSource`, `CursorDataSource`, `ODataDataSource`, `buildODataQuery`',
      'The `DataSource` implementations the grid and tree list read',
    ],
    [
      '`computePivot(input)`, `PivotEngine`',
      'Pivot aggregation (MIT — the pivot grid UI is the commercial part)',
    ],
    [
      '`buildCsv(rows, columns, options?)`, `guardCsvFormula`, `escapeCsvCell`',
      'RFC 4180 CSV with the spreadsheet formula guard',
    ],
    [
      '`parseStateJson`, `sanitizeGridStateSnapshot`, `sanitizeTreeListStateSnapshot`, `sanitizePivotGridStateSnapshot`',
      'Never-throwing restore of untrusted stored state',
    ],
  ];

  protected readonly behaviorExports = [
    [
      '`sanitizeUrl(url, options?)`, `sanitizeResourceUrl(url)`',
      'Scheme allowlist for `href` / `src`',
    ],
    [
      '`ogeSanitizeEditorHtml(html, options?)`',
      'The rich-text editor allowlist as a string → string function (browser or Node)',
    ],
    [
      '`new OgeMaskCore({ mask, rules?, maskChar? })`',
      'Input mask engine (not reactive)',
    ],
    [
      '`new OgeGridStateCore(rx)`, `new OgeGridDataCore(deps, rx)`',
      'The grid state slices and its loading machine',
    ],
    [
      '`new OgeSelectListCore(deps, rx)`, `OgeListVirtualizerCore`',
      'Select-family list model and its virtualizer',
    ],
    [
      '`prefersReducedMotion()`, `ogeResolveDirection()`, `observeDirection()`',
      'Motion and direction helpers',
    ],
  ];

  protected readonly engines = [
    [
      '`@oge-ui/scheduler-engine`',
      '`parseRecurrenceRule`, `serializeRecurrenceRule`, `expandRecurrence`, `OgeSchedulerCore`; iCalendar export entry',
    ],
    [
      '`@oge-ui/gantt-engine`',
      '`scheduleGanttProject`, `criticalPathKeys`, `autoScheduleForward`, `buildGanttScale`; Excel, PDF, image and MS Project export entries',
    ],
    [
      '`@oge-ui/bpmn-engine`',
      '`readBpmnXml`, `writeBpmnXml`, `renderDiagramSvg`, `toBpmnJson` / `fromBpmnJson`, `OgeBpmnEditorCore`',
    ],
    [
      '`@oge-ui/charts-engine`',
      '`niceTicks`, `createLinearScale`, `buildCartesianData`, `buildCartesianScene`, `buildPieScene`; image and PDF export entries',
    ],
    [
      '`@oge-ui/kanban-engine`',
      '`normalizeCards`, `groupBoard`, `kanbanColumnWip`, `computeColumnWindow`',
    ],
    [
      '`@oge-ui/pivot-engine`',
      '`toChartSeries`, `OgePivotGridCore`, `OgePivotStateCore`; Excel and PDF export entries',
    ],
  ];
}
