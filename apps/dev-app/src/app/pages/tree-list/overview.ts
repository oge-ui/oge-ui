import { ChangeDetectionStrategy, Component } from '@angular/core';
import { OgeColumn, OgeTreeList } from '@oge-ui/tree-list';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { makeOrgTree } from './tree-data';

const SNIPPET = `<oge-tree-list
  [data]="org"
  keyExpr="id"
  parentIdExpr="parentId"
  [autoExpandAll]="true"
>
  <oge-column field="name" caption="Name" />
  <oge-column field="title" caption="Title" [width]="140" />
  <oge-column field="office" caption="Office" [width]="140" />
  <oge-column field="headcount" caption="Reports" dataType="number" [width]="110" />
</oge-tree-list>`;

@Component({
  selector: 'app-tree-overview',
  imports: [OgeTreeList, OgeColumn, DemoCard, DocHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Tree List"
      [chips]="['keyExpr', 'parentIdExpr', 'autoExpandAll', 'expandedRowKeys']"
    >
      <p>
        <code>&lt;oge-tree-list&gt;</code> renders hierarchical data from a flat
        self-referencing array — every row points at its parent via
        <code>parentIdExpr</code>. Columns, templates, themes and configuration
        are the same building blocks the data grid uses.
      </p>
    </app-doc-header>

    <app-demo-card
      [chips]="['flat id/parentId data', 'sibling-scoped sorting']"
      [code]="snippet"
    >
      <oge-tree-list
        style="max-height: 480px"
        [data]="org"
        keyExpr="id"
        parentIdExpr="parentId"
        [autoExpandAll]="true"
      >
        <oge-column field="name" caption="Name" />
        <oge-column field="title" caption="Title" [width]="140" />
        <oge-column field="office" caption="Office" [width]="140" />
        <oge-column
          field="headcount"
          caption="Reports"
          dataType="number"
          [width]="110"
        />
      </oge-tree-list>
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
        Expansion is two-way bindable via <code>[(expandedRowKeys)]</code>;
        keyboard users expand/collapse with <kbd>→</kbd>/<kbd>←</kbd> in the
        first column (RTL-aware).
      </li>
      <li>
        The component ships full treegrid ARIA:
        <code>aria-level</code
        >/<code>aria-posinset</code>/<code>aria-setsize</code>/<code>aria-expanded</code>.
      </li>
    </ul>
  `,
})
export class TreeOverviewPage {
  protected readonly org = makeOrgTree();
  protected readonly snippet = SNIPPET;
}
