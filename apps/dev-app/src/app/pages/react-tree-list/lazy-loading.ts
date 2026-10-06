import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, type ReactNode } from 'react';
import { OgeTreeList, type OgeGridColumnProps } from '@oge-ui/react-tree-list';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { OrgLazySource, type LazyNode } from '../tree-list/org-lazy-source';
import { TREE_LAZY_DEMOS } from './lazy-loading-snippets';

const COLUMNS: OgeGridColumnProps<LazyNode>[] = [
  { field: 'name', caption: 'Name' },
  { field: 'title', caption: 'Title', width: 140 },
  { field: 'office', caption: 'Office', width: 140 },
];

/**
 * The React half of the lazy-loading page: the same 350 ms fake server as the
 * Angular demo, and the same request log under the tree — the log is the
 * source's own signal, so it reads identically in both views.
 */
@Component({
  selector: 'app-react-tree-lazy-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../../../../../../packages/react/tree-list/src/styles.scss',
    '../../../../../../packages/react/inputs/src/styles.scss',
    '../../shared/react-layout-demo-base.scss',
    '../../../../../../packages/react/overlay/src/styles.scss',
  ],
  template: `
    <app-demo-card
      [chips]="['350ms fake server', 'per-expansion requests']"
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="lazy" />
      <div
        class="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3 text-xs dark:border-gray-800 dark:bg-gray-900"
      >
        <div class="font-semibold uppercase tracking-wider text-gray-400">
          Requests
        </div>
        <ol class="mt-1 list-decimal pl-5 text-gray-600 dark:text-gray-300">
          @for (request of source.requests(); track $index) {
            <li>
              <code>{{ request }}</code>
            </li>
          }
        </ol>
      </div>
    </app-demo-card>

    <h3>Notes</h3>
    <ul>
      <li>
        The initial load asks for <code>parentId eq rootValue</code>; an OData
        backend works without any adapter code (<code
          >$filter=parentId eq 42</code
        >).
      </li>
      <li>
        <code>hasItemsExpr</code> decides expandability before children exist
        locally.
      </li>
      <li>
        Lazy mode needs a string <code>parentIdExpr</code>; a sort change
        re-requests open levels.
      </li>
      <li>
        <code>loadMode</code> defaults to <code>'lazy'</code> exactly when a
        DataSource and <code>hasItemsExpr</code> are both present — set it
        explicitly to override.
      </li>
    </ul>
  `,
})
export class ReactTreeLazyDemos {
  protected readonly demos = TREE_LAZY_DEMOS;
  protected readonly source = new OrgLazySource();
  protected readonly lazy = (): ReactNode =>
    createElement(OgeTreeList<LazyNode>, {
      style: { maxHeight: 480 },
      data: this.source,
      keyExpr: 'id',
      parentIdExpr: 'parentId',
      hasItemsExpr: 'hasReports',
      columns: COLUMNS,
    });
}
