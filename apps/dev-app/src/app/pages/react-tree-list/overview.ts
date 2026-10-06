import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, type ReactNode } from 'react';
import { OgeTreeList, type OgeGridColumnProps } from '@oge-ui/react-tree-list';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { makeOrgTree, type OrgNode } from '../tree-list/tree-data';
import { TREE_OVERVIEW_DEMOS } from './overview-snippets';

const org = makeOrgTree();

const COLUMNS: OgeGridColumnProps<OrgNode>[] = [
  { field: 'name', caption: 'Name' },
  { field: 'title', caption: 'Title', width: 140 },
  { field: 'office', caption: 'Office', width: 140 },
  { field: 'headcount', caption: 'Reports', dataType: 'number', width: 110 },
];

/**
 * The React half of the tree-list overview — the same org chart as the
 * Angular page, rendered as a real React tree inside `/components/tree-list`
 * when the reader has chosen React (ADR 0002).
 */
@Component({
  selector: 'app-react-tree-overview-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // the React tree list carries the class names but no styles of its own —
  // the docs pull the same SCSS the package build compiles
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../../../../../../packages/react/tree-list/src/styles.scss',
    '../../../../../../packages/react/inputs/src/styles.scss',
    '../../shared/react-layout-demo-base.scss',
    '../../../../../../packages/react/overlay/src/styles.scss',
  ],
  template: `
    <app-demo-card
      [chips]="['flat id/parentId data', 'sibling-scoped sorting']"
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="overview" />
    </app-demo-card>

    <h3>Notes</h3>
    <ul>
      <li>
        Rows whose parent value equals <code>rootValue</code> (default
        <code>null</code>) become roots; rows with a missing parent follow
        <code>orphanPolicy</code> (<code>discard</code> or
        <code>promoteToRoot</code>).
      </li>
      <li>
        Sorting is sibling-scoped: each level sorts within its parent, the
        hierarchy never breaks.
      </li>
      <li>
        Expansion is a controlled pair — <code>expandedRowKeys</code> +
        <code>onExpandedRowKeysChange</code>; keyboard users expand/collapse
        with <kbd>→</kbd>/<kbd>←</kbd> in the first column (RTL-aware).
      </li>
      <li>
        The component ships full treegrid ARIA:
        <code>aria-level</code
        >/<code>aria-posinset</code>/<code>aria-setsize</code>/<code>aria-expanded</code>.
      </li>
    </ul>
  `,
})
export class ReactTreeOverviewDemos {
  protected readonly demos = TREE_OVERVIEW_DEMOS;
  protected readonly overview = (): ReactNode =>
    createElement(OgeTreeList<OrgNode>, {
      style: { maxHeight: 480 },
      data: org,
      keyExpr: 'id',
      parentIdExpr: 'parentId',
      autoExpandAll: true,
      columns: COLUMNS,
    });
}
