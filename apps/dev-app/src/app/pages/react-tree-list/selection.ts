import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useState, type ReactNode } from 'react';
import type { RowKey } from '@oge-ui/core';
import { OgeTreeList, type OgeGridColumnProps } from '@oge-ui/react-tree-list';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { makeOrgTree, type OrgNode } from '../tree-list/tree-data';
import { TREE_SELECTION_DEMOS } from './selection-snippets';

const org = makeOrgTree();

const COLUMNS: OgeGridColumnProps<OrgNode>[] = [
  { field: 'name', caption: 'Name' },
  { field: 'title', caption: 'Title', width: 140 },
  { field: 'office', caption: 'Office', width: 140 },
];

/** Real React state: the key list under the tree is `useState`, like the snippet. */
function SelectionDemo(): ReactNode {
  const [selectedKeys, setSelectedKeys] = useState<RowKey[]>([]);
  return createElement(
    'div',
    null,
    createElement(OgeTreeList<OrgNode>, {
      style: { maxHeight: 480 },
      data: org,
      keyExpr: 'id',
      parentIdExpr: 'parentId',
      autoExpandAll: true,
      selectionMode: 'checkbox',
      selectionRecursive: true,
      selectedKeys,
      onSelectedKeysChange: setSelectedKeys,
      columns: COLUMNS,
    }),
    createElement(
      'div',
      { className: 'mt-3 text-sm text-gray-500 dark:text-gray-400' },
      `Selected keys (${selectedKeys.length}): `,
      createElement('code', null, selectedKeys.join(', ') || '—'),
    ),
  );
}

/** The React half of the tree-list selection page. */
@Component({
  selector: 'app-react-tree-selection-demos',
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
      [chips]="['tri-state', 'cascade']"
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="selection" />
    </app-demo-card>

    <h3>Notes</h3>
    <ul>
      <li>
        Toggling cascades down and normalizes up: a parent is selected iff all
        children are.
      </li>
      <li>
        <code>getSelectedRowKeys(mode)</code> on the <code>ref</code> handle
        narrows the reported set: <code>'all'</code>,
        <code>'leavesOnly'</code> or <code>'excludeRecursive'</code>
        (top-most selected roots).
      </li>
      <li>
        <kbd>Space</kbd> toggles the focused row; <kbd>Shift</kbd>+click selects
        a range.
      </li>
      <li>
        <code>focusedRowEnabled</code> + <code>focusedRowKey</code> /
        <code>onFocusedRowKeyChange</code> track a single focused row.
      </li>
    </ul>
  `,
})
export class ReactTreeSelectionDemos {
  protected readonly demos = TREE_SELECTION_DEMOS;
  protected readonly selection = (): ReactNode => createElement(SelectionDemo);
}
