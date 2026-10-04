import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import {
  createElement,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  OgeTreeList,
  type OgeGridColumnProps,
  type OgeTreeListHandle,
  type OgeTreeListSummary,
} from '@oge-ui/react-tree-list';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import {
  makePlan,
  makePlanServer,
  type PlanTask,
} from '../tree-list/task-data';
import { TREE_SUMMARIES_DEMOS } from './summaries-snippets';
import { loadDocsPdfFont } from '../../shared/pdf-font';

const plan = makePlan();

const hours = (value: unknown): string =>
  typeof value === 'number' ? `${value.toFixed(0)} h` : String(value ?? '');
const money = (value: unknown): string =>
  typeof value === 'number'
    ? `€${Math.round(value).toLocaleString('en-US')}`
    : String(value ?? '');

const SUMMARY: OgeTreeListSummary<PlanTask> = {
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

const COLUMNS: OgeGridColumnProps<PlanTask>[] = [
  { field: 'task', caption: 'Task' },
  { field: 'owner', caption: 'Owner', width: 120 },
  {
    field: 'hours',
    caption: 'Hours',
    dataType: 'number',
    width: 170,
    format: hours,
  },
  {
    field: 'cost',
    caption: 'Cost',
    dataType: 'number',
    width: 190,
    format: money,
  },
];

const REMOTE_COLUMNS: OgeGridColumnProps<PlanTask>[] = [
  { field: 'task', caption: 'Task' },
  { field: 'owner', caption: 'Owner', width: 140 },
  { field: 'hours', caption: 'Hours', dataType: 'number', width: 110 },
];

const BUTTON = 'oge-tool-btn oge-tool-text-btn';

/** Card 1: the footer row, the parent badges and both exports. */
function SummariesDemo(): ReactNode {
  const tree = useRef<OgeTreeListHandle<PlanTask>>(null);
  const excel = async (): Promise<void> => {
    if (!tree.current) return;
    const { exportOgeTreeListToExcel } =
      await import('@oge-ui/react-tree-list/export-excel');
    await exportOgeTreeListToExcel(tree.current, {
      filename: 'plan.xlsx',
      summaryFormulas: true,
    });
  };
  const pdf = async (): Promise<void> => {
    if (!tree.current) return;
    const { exportOgeTreeListToPdf } =
      await import('@oge-ui/react-tree-list/export-pdf');
    await loadDocsPdfFont(); // Unicode font: Turkish ğ ş ı İ
    await exportOgeTreeListToPdf(tree.current, {
      filename: 'plan.pdf',
      title: 'Project plan',
      orientation: 'portrait',
      pageNumbers: true,
    });
  };
  return createElement(
    'div',
    null,
    createElement(
      'div',
      { className: 'mb-2 flex flex-wrap items-center justify-between gap-3' },
      createElement(
        'span',
        { className: 'text-sm text-gray-500 dark:text-gray-400' },
        'Filter a column — the footer and every parent badge follow what stays visible.',
      ),
      createElement(
        'span',
        { className: 'flex items-center gap-1.5' },
        createElement(
          'button',
          {
            type: 'button',
            className: `${BUTTON} oge-btn-accent`,
            'data-testid': 'tree-export-excel',
            onClick: () => void excel(),
          },
          'Excel',
        ),
        createElement(
          'button',
          {
            type: 'button',
            className: BUTTON,
            'data-testid': 'tree-export-pdf',
            onClick: () => void pdf(),
          },
          'PDF',
        ),
      ),
    ),
    createElement(OgeTreeList<PlanTask>, {
      ref: tree,
      data: plan,
      keyExpr: 'id',
      parentIdExpr: 'parentId',
      columns: COLUMNS,
      autoExpandAll: true,
      filterRow: true,
      filterDebounce: 150,
      summary: SUMMARY,
      style: { maxHeight: '480px' },
    }),
  );
}

/** Card 2: filtering on the (fake) server, ancestor-preserving answers. */
function RemoteDemo(): ReactNode {
  const [lastRequest, setLastRequest] = useState('');
  const server = useMemo(() => makePlanServer(setLastRequest), []);
  return createElement(
    'div',
    null,
    createElement(OgeTreeList<PlanTask>, {
      data: server,
      keyExpr: 'id',
      parentIdExpr: 'parentId',
      columns: REMOTE_COLUMNS,
      remoteOperations: { filtering: true },
      filterRow: true,
      filterDebounce: 200,
      headerFilter: true,
      searchPanel: true,
      style: { maxHeight: '420px' },
    }),
    createElement(
      'p',
      {
        className: 'mt-2 font-mono text-xs text-gray-500 dark:text-gray-400',
        'data-testid': 'tree-remote-log',
      },
      lastRequest,
    ),
  );
}

/**
 * The React half of the tree-list summaries page — the same plan, summary
 * items, exports and fake server as the Angular page.
 */
@Component({
  selector: 'app-react-tree-summaries-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../../../../../../packages/react/tree-list/src/styles.scss',
    '../../../../../../packages/react/inputs/src/styles.scss',
    '../../../../../../packages/react/layout/src/styles.scss',
    '../../../../../../packages/react/overlay/src/styles.scss',
  ],
  template: `
    <app-demo-card
      [chips]="['count / sum / avg / max', 'per-parent', 'Excel + PDF']"
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="summaries" />
    </app-demo-card>

    <h3>Remote filtering</h3>
    <p>
      With
      <code
        >remoteOperations={{ '{' }}{{ '{' }} filtering: true {{ '}'
        }}{{ '}' }}</code
      >
      the filter row, header filter, builder filter and search text reach the
      data source, and header-filter values come from <code>distinct()</code>.
      The server answers with the matches
      <strong>plus all their ancestors</strong>; the tree renders that answer
      as-is and opens the branches leading to the matches.
    </p>
    <app-demo-card
      [chips]="[
        'remoteOperations.filtering',
        'ancestor-preserving',
        '250ms latency',
      ]"
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="remote" />
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
        aggregate a footer line after its subtree.
      </li>
      <li>
        Remote filtering applies to the full load mode; lazy trees keep their
        own remote match discovery.
      </li>
    </ul>
  `,
})
export class ReactTreeSummariesDemos {
  protected readonly demos = TREE_SUMMARIES_DEMOS;
  protected readonly summaries = () => createElement(SummariesDemo);
  protected readonly remote = () => createElement(RemoteDemo);
}
