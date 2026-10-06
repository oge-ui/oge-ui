import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useState, type ReactNode } from 'react';
import {
  OgeTreeList,
  type OgeGridColumnProps,
  type OgeTreeRowReparentEvent,
} from '@oge-ui/react-tree-list';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { makeOrgTree, type OrgNode } from '../tree-list/tree-data';
import { TREE_DRAG_DEMOS } from './drag-drop-snippets';

const COLUMNS: OgeGridColumnProps<OrgNode>[] = [
  { field: 'name', caption: 'Name' },
  { field: 'title', caption: 'Title', width: 140 },
  { field: 'office', caption: 'Office', width: 140 },
];

function DragDemo({ org }: { org: OrgNode[] }): ReactNode {
  const [lastMove, setLastMove] =
    useState<OgeTreeRowReparentEvent<OrgNode> | null>(null);
  return createElement(
    'div',
    null,
    createElement(OgeTreeList<OrgNode>, {
      style: { maxHeight: 480 },
      data: org,
      keyExpr: 'id',
      parentIdExpr: 'parentId',
      autoExpandAll: true,
      rowDragging: true,
      onRowReparented: setLastMove,
      columns: COLUMNS,
    }),
    lastMove
      ? createElement(
          'div',
          { className: 'mt-3 text-sm text-gray-500 dark:text-gray-400' },
          'Moved ',
          createElement('code', null, `#${String(lastMove.key)}`),
          ' from parent ',
          createElement('code', null, String(lastMove.fromParentKey ?? 'root')),
          ' to ',
          createElement('code', null, String(lastMove.toParentKey ?? 'root')),
          '.',
        )
      : null,
  );
}

/** The React half of the tree-list drag & drop page. */
@Component({
  selector: 'app-react-tree-drag-demos',
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
      [chips]="['reparenting', 'descendant guard']"
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="drag" />
    </app-demo-card>

    <h3>Notes</h3>
    <ul>
      <li>
        Plain-array data is updated in place (the parent field is rewritten);
        with a DataSource, handle <code>onRowReparented</code> and persist the
        move yourself.
      </li>
      <li>
        The new parent expands automatically so the dropped row stays visible.
      </li>
      <li>
        State persistence (<code>stateKey</code>) also captures the expansion
        produced by moves.
      </li>
    </ul>
  `,
})
export class ReactTreeDragDemos {
  protected readonly demos = TREE_DRAG_DEMOS;
  private readonly org = makeOrgTree(3, 2, 4);
  protected readonly drag = (): ReactNode =>
    createElement(DragDemo, { org: this.org });
}
