import {
  ChangeDetectionStrategy,
  Component,
  signal,
  viewChild,
} from '@angular/core';
import { OgeColumn, OgeTreeList } from '@oge-ui/tree-list';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { makeOrgTree, type OrgNode } from './tree-data';

const SNIPPET = `<oge-tree-list
  [data]="org"
  keyExpr="id"
  parentIdExpr="parentId"
  [editing]="{
    mode: 'form',
    allowUpdating: true,
    allowAdding: true,
    allowDeleting: true,
    formColCount: 2,
    formItems: ['name', 'title', { field: 'office', colSpan: 2 }]
  }"
  (initNewRow)="$event.values.title = 'Engineer'"
/>
<!-- treeList.addRow(parentKey) inserts under a chosen node -->`;

@Component({
  selector: 'app-tree-editing',
  imports: [OgeTreeList, OgeColumn, DemoCard, DocHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Editing"
      [chips]="['editing.mode', 'formItems', 'addRow(parentKey)', 'initNewRow']"
    >
      <p>
        All five editing modes of the data grid work on trees — the demo below
        uses <code>form</code> mode with a two-column layout. New rows can be
        inserted under a chosen parent and prefilled via
        <code>initNewRow</code>.
      </p>
    </app-doc-header>

    <app-demo-card
      [chips]="['form mode', 'prefill', 'insert under parent']"
      [code]="snippet"
    >
      <div class="mb-3 flex items-center gap-2">
        <button
          type="button"
          class="rounded-md border border-gray-300 px-2 py-1 text-xs dark:border-gray-700"
          (click)="addUnderFirstVp()"
        >
          Add under the first VP
        </button>
        <span class="text-xs text-gray-500 dark:text-gray-400">
          new rows arrive pre-titled "Engineer"
        </span>
      </div>
      <oge-tree-list
        #tree
        [data]="org()"
        keyExpr="id"
        parentIdExpr="parentId"
        [autoExpandAll]="true"
        [editing]="{
          mode: 'form',
          allowUpdating: true,
          allowAdding: true,
          allowDeleting: true,
          confirmDelete: false,
          formColCount: 2,
          formItems: ['name', 'title', { field: 'office', colSpan: 2 }],
        }"
        (initNewRow)="$event.values['title'] = 'Engineer'"
      >
        <oge-column field="name" caption="Name" [required]="true" />
        <oge-column field="title" caption="Title" [width]="140" />
        <oge-column field="office" caption="Office" [width]="140" />
      </oge-tree-list>
    </app-demo-card>

    <h3>Notes</h3>
    <ul>
      <li>
        <code>cell</code>, <code>row</code>, <code>batch</code>,
        <code>form</code> and <code>popup</code> modes all ship; validation and
        <code>*ogeEditTemplate</code> custom editors come from the shared column
        definitions.
      </li>
      <li>
        <code>formItems</code> selects, orders, relabels and spans the form
        fields; <code>formColCount</code> fixes the layout columns.
      </li>
      <li>
        <code>addRow(parentKey)</code> pre-stages the parent reference, so the
        saved row lands under that node; <code>initNewRow</code> prefills any
        other field.
      </li>
      <li>
        Saves flow through the cancelable <code>savingChanges</code> event into
        the DataSource; on lazy trees the affected levels re-fetch so the UI
        always shows persisted values.
      </li>
    </ul>
  `,
})
export class TreeEditingPage {
  protected readonly org = signal(makeOrgTree(3, 2, 3));
  protected readonly snippet = SNIPPET;
  private readonly tree = viewChild<OgeTreeList<OrgNode>>('tree');

  protected addUnderFirstVp(): void {
    const firstVp = this.org().find((row) => row.title === 'VP');
    if (firstVp) this.tree()?.addRow(firstVp.id);
  }
}
