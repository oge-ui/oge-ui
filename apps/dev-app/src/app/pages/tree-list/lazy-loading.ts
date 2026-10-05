import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { OgeColumn, OgeTreeList } from '@oge-ui/tree-list';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { ReactTreeLazyDemos } from '../react-tree-list/lazy-loading';
import { OrgLazySource } from './org-lazy-source';
import { SNIPPET } from './lazy-loading-snippets';

@Component({
  selector: 'app-tree-lazy',
  imports: [OgeTreeList, OgeColumn, DemoCard, DocHeader, ReactTreeLazyDemos],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      category="Tree List"
      title="Lazy Loading"
      [chips]="['hasItemsExpr', 'DataSource', 'loadMode']"
    >
      <p>
        Hand the tree a <code>DataSource</code> plus
        <code>hasItemsExpr</code> and children are fetched on demand — one
        <code>parentId eq key</code> request per expansion, cached until the
        sort changes or <code>refresh()</code> is called. A skeleton row shows
        while a level is in flight.
      </p>
    </app-doc-header>

    @if (fw.isReact()) {
      <app-react-tree-lazy-demos />
    } @else {
      <app-demo-card
        [chips]="['350ms fake server', 'per-expansion requests']"
        [code]="snippet"
        language="ts"
      >
        <oge-tree-list
          style="max-height: 480px"
          [data]="source"
          keyExpr="id"
          parentIdExpr="parentId"
          hasItemsExpr="hasReports"
        >
          <oge-column field="name" caption="Name" />
          <oge-column field="title" caption="Title" [width]="140" />
          <oge-column field="office" caption="Office" [width]="140" />
        </oge-tree-list>
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
    }
  `,
})
export class TreeLazyPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly source = new OrgLazySource();
  protected readonly snippet = SNIPPET;
}
