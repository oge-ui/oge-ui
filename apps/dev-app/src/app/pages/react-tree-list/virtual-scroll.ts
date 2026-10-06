import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, type ReactNode } from 'react';
import { OgeTreeList, type OgeGridColumnProps } from '@oge-ui/react-tree-list';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { makeBigTree, type OrgNode } from '../tree-list/tree-data';
import { TREE_VIRTUAL_DEMOS } from './virtual-scroll-snippets';

const COLUMNS: OgeGridColumnProps<OrgNode>[] = [
  { field: 'name', caption: 'Name' },
  { field: 'title', caption: 'Title', width: 130 },
  { field: 'office', caption: 'Office', width: 140 },
];

/** The React half of the tree-list virtual scrolling page (100k nodes). */
@Component({
  selector: 'app-react-tree-virtual-demos',
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
      [chips]="['O(visible) flatten', 'windowed DOM']"
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="virtual" />
    </app-demo-card>

    <h3>Notes</h3>
    <ul>
      <li>
        Expanding or collapsing re-flattens only the visible rows, never the
        full 100k.
      </li>
      <li>
        Collapse all branches and the scrollbar shrinks to the root count
        instantly.
      </li>
      <li>
        <code>scrollToRow(key)</code> on the <code>ref</code> handle jumps
        anywhere in the virtual space.
      </li>
    </ul>
  `,
})
export class ReactTreeVirtualDemos {
  protected readonly demos = TREE_VIRTUAL_DEMOS;
  private readonly rows = makeBigTree(100, 999);
  protected readonly virtual = (): ReactNode =>
    createElement(OgeTreeList<OrgNode>, {
      style: { height: 480 },
      data: this.rows,
      keyExpr: 'id',
      parentIdExpr: 'parentId',
      autoExpandAll: true,
      virtualScroll: true,
      columns: COLUMNS,
    });
}
