import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  OgeColumn,
  OgeTreeList,
  type OgeTreeListSummary,
} from '@oge-ui/tree-list';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { ReactTreeSummariesDemos } from '../react-tree-list/summaries';
import { makePlan, makePlanServer, type PlanTask } from './task-data';
import { REMOTE_SNIPPET, SUMMARIES_SNIPPET } from './summaries-snippets';

const hours = (value: unknown): string =>
  typeof value === 'number' ? `${value.toFixed(0)} h` : String(value ?? '');
const money = (value: unknown): string =>
  typeof value === 'number'
    ? `€${Math.round(value).toLocaleString('en-US')}`
    : String(value ?? '');

/** The summary configuration both layers' demos render. */
export const PLAN_SUMMARY: OgeTreeListSummary<PlanTask> = {
  totalItems: [
    { field: 'task', type: 'count' },
    { field: 'hours', type: 'sum' },
    { field: 'cost', type: 'avg' },
  ],
  recursiveItems: [
    { field: 'hours', type: 'sum' },
    { field: 'cost', type: 'max' },
  ],
};

@Component({
  selector: 'app-tree-summaries',
  imports: [
    OgeTreeList,
    OgeColumn,
    DemoCard,
    DocHeader,
    ReactTreeSummariesDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Summaries & Remote Filtering"
      category="Tree List"
      [chips]="[
        'summary.totalItems',
        'summary.recursiveItems',
        'export-pdf',
        'remoteOperations',
      ]"
    >
      <p>
        <code>summary.totalItems</code> aggregate every row the filter leaves
        visible — at every level, collapsed branches included — into a footer
        row; <code>summary.recursiveItems</code> show each parent the aggregate
        of its visible descendants beside its own value. Both travel into the
        Excel and PDF exports. <code>remoteOperations.filtering</code> moves
        filtering, search and header-filter values to the server.
      </p>
    </app-doc-header>

    @if (fw.isReact()) {
      <app-react-tree-summaries-demos />
    } @else {
      <app-demo-card
        [chips]="['count / sum / avg / max', 'per-parent', 'Excel + PDF']"
        [code]="summariesSnippet"
        language="ts"
      >
        <div class="mb-2 flex flex-wrap items-center justify-between gap-3">
          <span class="text-sm text-gray-500 dark:text-gray-400">
            Filter a column — the footer and every parent badge follow what
            stays visible.
          </span>
          <span class="flex items-center gap-1.5">
            <button
              type="button"
              class="oge-tool-btn oge-tool-text-btn oge-btn-accent"
              data-testid="tree-export-excel"
              (click)="excel()"
            >
              Excel
            </button>
            <button
              type="button"
              class="oge-tool-btn oge-tool-text-btn"
              data-testid="tree-export-pdf"
              (click)="pdf()"
            >
              PDF
            </button>
          </span>
        </div>
        <oge-tree-list
          #tree
          style="max-height: 480px"
          [data]="plan"
          keyExpr="id"
          parentIdExpr="parentId"
          [autoExpandAll]="true"
          [filterRow]="true"
          [filterDebounce]="150"
          [summary]="summary"
        >
          <oge-column field="task" caption="Task" />
          <oge-column field="owner" caption="Owner" [width]="120" />
          <oge-column
            field="hours"
            caption="Hours"
            dataType="number"
            [width]="170"
            [format]="hours"
          />
          <oge-column
            field="cost"
            caption="Cost"
            dataType="number"
            [width]="190"
            [format]="money"
          />
        </oge-tree-list>
      </app-demo-card>

      <h3>Remote filtering</h3>
      <p>
        With
        <code>[remoteOperations]="{{ '{' }} filtering: true {{ '}' }}"</code>
        the filter row, header filter, builder filter and search text reach the
        data source, and header-filter values come from
        <code>distinct()</code>. The server answers with the matches
        <strong>plus all their ancestors</strong>; the tree renders that answer
        as-is and opens the branches leading to the matches.
      </p>
      <app-demo-card
        [chips]="[
          'remoteOperations.filtering',
          'ancestor-preserving',
          '250ms latency',
        ]"
        [code]="remoteSnippet"
        language="ts"
      >
        <oge-tree-list
          style="max-height: 420px"
          [data]="server"
          keyExpr="id"
          parentIdExpr="parentId"
          [remoteOperations]="{ filtering: true }"
          [filterRow]="true"
          [filterDebounce]="200"
          [headerFilter]="true"
          [searchPanel]="true"
        >
          <oge-column field="task" caption="Task" />
          <oge-column field="owner" caption="Owner" [width]="140" />
          <oge-column
            field="hours"
            caption="Hours"
            dataType="number"
            [width]="110"
          />
        </oge-tree-list>
        <p
          class="mt-2 font-mono text-xs text-gray-500 dark:text-gray-400"
          data-testid="tree-remote-log"
        >
          {{ lastRequest() }}
        </p>
      </app-demo-card>

      <h3>Notes</h3>
      <ul>
        <li>
          Item types: <code>sum</code>, <code>avg</code>, <code>min</code>,
          <code>max</code>, <code>count</code> and <code>custom</code> (<code
            >calculateCustomSummary[name ?? field](rows, field)</code
          >); <code>showInColumn</code> moves a value under another column.
        </li>
        <li>
          Exports: the total becomes the last row, each parent’s recursive
          aggregate a footer line after its subtree (Excel keeps the values
          typed; <code>summaryFormulas</code> turns the total into a
          <code>SUBTOTAL</code>).
        </li>
        <li>
          Remote filtering applies to the full load mode; lazy trees keep their
          own remote match discovery, which completes the ancestor chains with
          <code>[keyExpr, 'in', keys]</code> lookups.
        </li>
      </ul>
    }
  `,
})
export class TreeSummariesPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly plan = makePlan();
  protected readonly summary = PLAN_SUMMARY;
  protected readonly hours = hours;
  protected readonly money = money;
  protected readonly summariesSnippet = SUMMARIES_SNIPPET;
  protected readonly remoteSnippet = REMOTE_SNIPPET;
  protected readonly lastRequest = signal('');
  protected readonly server = makePlanServer((message) =>
    this.lastRequest.set(message),
  );

  // optional: the React view renders no Angular tree
  private readonly tree = viewChild<OgeTreeList<PlanTask>>('tree');

  protected async excel(): Promise<void> {
    const tree = this.tree();
    if (!tree) return;
    const { exportOgeTreeListToExcel } =
      await import('@oge-ui/tree-list/export-excel');
    await exportOgeTreeListToExcel(tree, {
      filename: 'plan.xlsx',
      summaryFormulas: true,
    });
  }

  protected async pdf(): Promise<void> {
    const tree = this.tree();
    if (!tree) return;
    const { exportOgeTreeListToPdf } =
      await import('@oge-ui/tree-list/export-pdf');
    await exportOgeTreeListToPdf(tree, {
      filename: 'plan.pdf',
      title: 'Project plan',
      orientation: 'portrait',
      pageNumbers: true,
    });
  }
}
