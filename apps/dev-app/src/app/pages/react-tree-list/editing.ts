import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useRef, type ReactNode } from 'react';
import {
  OgeTreeList,
  type OgeGridColumnProps,
  type OgeTreeListHandle,
} from '@oge-ui/react-tree-list';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { makeOrgTree, type OrgNode } from '../tree-list/tree-data';
import { TREE_EDITING_DEMOS } from './editing-snippets';

const COLUMNS: OgeGridColumnProps<OrgNode>[] = [
  { field: 'name', caption: 'Name', required: true },
  { field: 'title', caption: 'Title', width: 140 },
  { field: 'office', caption: 'Office', width: 140 },
];

function EditingDemo({ org }: { org: OrgNode[] }): ReactNode {
  const tree = useRef<OgeTreeListHandle<OrgNode>>(null);
  const addUnderFirstVp = () => {
    const firstVp = org.find((row) => row.title === 'VP');
    if (firstVp) tree.current?.addRow(firstVp.id);
  };
  return createElement(
    'div',
    null,
    createElement(
      'div',
      { className: 'mb-3 flex items-center gap-2' },
      createElement(
        'button',
        {
          type: 'button',
          className:
            'rounded-md border border-gray-300 px-2 py-1 text-xs dark:border-gray-700',
          onClick: addUnderFirstVp,
        },
        'Add under the first VP',
      ),
      createElement(
        'span',
        { className: 'text-xs text-gray-500 dark:text-gray-400' },
        'new rows arrive pre-titled "Engineer"',
      ),
    ),
    createElement(OgeTreeList<OrgNode>, {
      ref: tree,
      style: { maxHeight: 480 },
      data: org,
      keyExpr: 'id',
      parentIdExpr: 'parentId',
      autoExpandAll: true,
      editing: {
        mode: 'form',
        allowUpdating: true,
        allowAdding: true,
        allowDeleting: true,
        confirmDelete: false,
        formColCount: 2,
        formItems: ['name', 'title', { field: 'office', colSpan: 2 }],
      },
      onInitNewRow: (event) => {
        event.values['title'] = 'Engineer';
      },
      columns: COLUMNS,
    }),
  );
}

/** The React half of the tree-list editing page. */
@Component({
  selector: 'app-react-tree-editing-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../../../../../../packages/react/tree-list/src/styles.scss',
    '../../../../../../packages/react/forms/src/styles.scss',
    '../../../../../../packages/react/inputs/src/styles.scss',
    '../../../../../../packages/react/layout/src/styles.scss',
    '../../../../../../packages/react/overlay/src/styles.scss',
  ],
  template: `
    <app-demo-card
      [chips]="['form mode', 'prefill', 'insert under parent']"
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="editing" />
    </app-demo-card>

    <h3>Notes</h3>
    <ul>
      <li>
        <code>cell</code>, <code>row</code>, <code>batch</code>,
        <code>form</code> and <code>popup</code> modes all ship; validation and
        <code>renderEditor</code> custom editors come from the shared column
        props.
      </li>
      <li>
        <code>formItems</code> selects, orders, relabels and spans the form
        fields; <code>formColCount</code> fixes the layout columns.
      </li>
      <li>
        <code>addRow(parentKey)</code> on the <code>ref</code> handle pre-stages
        the parent reference, so the saved row lands under that node;
        <code>onInitNewRow</code> prefills any other field.
      </li>
      <li>
        Saves flow through the cancelable <code>onSavingChanges</code> callback
        into the DataSource; on lazy trees the affected levels re-fetch so the
        UI always shows persisted values.
      </li>
    </ul>
  `,
})
export class ReactTreeEditingDemos {
  protected readonly demos = TREE_EDITING_DEMOS;
  private readonly org = makeOrgTree(3, 2, 3);
  protected readonly editing = (): ReactNode =>
    createElement(EditingDemo, { org: this.org });
}
