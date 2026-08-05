import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import type {
  DataSource,
  DataSourceCapabilities,
  LoadOptions,
  LoadResult,
  RowKey,
} from '@oge-ui/core';
import { OgeColumn, OgeTreeList } from '@oge-ui/tree-list';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { makeOrgTree, type OrgNode } from './tree-data';

const SNIPPET = `<!-- children are fetched per expansion:
     load({ filter: ['parentId', '=', parentKey] }) -->
<oge-tree-list
  [data]="source"
  keyExpr="id"
  parentIdExpr="parentId"
  hasItemsExpr="hasReports"
/>`;

interface LazyNode extends OrgNode {
  hasReports: boolean;
}

/** Fake server: 350 ms latency, serves children of the requested parent only. */
class OrgLazySource implements DataSource<LazyNode> {
  readonly capabilities: DataSourceCapabilities = {
    sort: true,
    filter: true,
    group: false,
    paging: false,
    summary: false,
  };
  private readonly rows: LazyNode[];
  /** Signal, so the OnPush request log re-renders per request. */
  readonly requests = signal<readonly string[]>([]);

  constructor() {
    const rows = makeOrgTree(5, 4, 6);
    this.rows = rows.map((row) => ({ ...row, hasReports: row.headcount > 0 }));
  }

  keyOf(item: LazyNode): RowKey {
    return item.id;
  }

  async load(options: LoadOptions): Promise<LoadResult<LazyNode>> {
    const filter = options.filter as
      { field: string; value: unknown } | undefined;
    const parent = (filter?.value ?? null) as number | null;
    this.requests.update((log) => [
      ...log,
      `parentId eq ${parent === null ? 'null' : parent}`,
    ]);
    await new Promise((resolve) => setTimeout(resolve, 350));
    return { data: this.rows.filter((row) => row.parentId === parent) };
  }
}

@Component({
  selector: 'app-tree-lazy',
  imports: [OgeTreeList, OgeColumn, DemoCard, DocHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
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

    <app-demo-card
      [chips]="['350ms fake server', 'per-expansion requests']"
      [code]="snippet"
    >
      <oge-tree-list
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
  `,
})
export class TreeLazyPage {
  protected readonly source = new OrgLazySource();
  protected readonly snippet = SNIPPET;
}
