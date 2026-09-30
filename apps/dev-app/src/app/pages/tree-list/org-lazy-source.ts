import { signal } from '@angular/core';
import type {
  DataSource,
  DataSourceCapabilities,
  LoadOptions,
  LoadResult,
  RowKey,
} from '@oge-ui/core';
import { makeOrgTree, type OrgNode } from './tree-data';

/**
 * The lazy-loading page's fake server, shared by the Angular demo and its
 * React mirror so both views hit the same backend and log the same requests.
 */
export interface LazyNode extends OrgNode {
  hasReports: boolean;
}

/** Fake server: 350 ms latency, serves children of the requested parent only. */
export class OrgLazySource implements DataSource<LazyNode> {
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
