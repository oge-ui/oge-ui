import type { RowKey } from '../rows/row-node';
import { resolveKeySelector } from '../util/value-accessor';
import type { DataSource, DataSourceCapabilities, LoadResult } from './data-source';
import type { FilterExpr, LoadOptions } from './load-options';

export interface ODataQueryOptions {
  /** Fields the global search text matches against (folded into `$filter`). */
  searchFields?: readonly string[];
}

function literal(value: unknown): string {
  if (value == null) return 'null';
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value instanceof Date) return value.toISOString();
  return `'${String(value).replace(/'/g, "''")}'`;
}

function filterToOData(expr: FilterExpr): string {
  switch (expr.type) {
    case 'and':
    case 'or': {
      const parts = expr.operands.map((operand) => `(${filterToOData(operand)})`);
      return parts.join(` ${expr.type} `);
    }
    case 'not':
      return `not (${filterToOData(expr.operand)})`;
    case 'binary': {
      const { field, op, value } = expr;
      switch (op) {
        case 'eq':
        case 'ne':
        case 'gt':
        case 'ge':
        case 'lt':
        case 'le':
          return `${field} ${op} ${literal(value)}`;
        case 'contains':
          return `contains(${field},${literal(value)})`;
        case 'notcontains':
          return `not contains(${field},${literal(value)})`;
        case 'startswith':
          return `startswith(${field},${literal(value)})`;
        case 'endswith':
          return `endswith(${field},${literal(value)})`;
        case 'in': {
          const values = (value as readonly unknown[]) ?? [];
          if (!values.length) return 'false';
          return values.map((v) => `(${field} eq ${literal(v)})`).join(' or ');
        }
        case 'between': {
          const [from, to] = (value as readonly unknown[]) ?? [];
          return `(${field} ge ${literal(from)}) and (${field} le ${literal(to)})`;
        }
        case 'isnull':
          return `${field} eq null`;
        case 'isnotnull':
          return `${field} ne null`;
      }
    }
  }
}

/**
 * Serializes LoadOptions into an OData v4 query string
 * (`$skip`/`$top`/`$orderby`/`$filter`/`$count`). Grouping and summaries are
 * not translated — pair OData sources with client-side grouping or `$apply`
 * middleware of your own.
 */
export function buildODataQuery(options: LoadOptions, config: ODataQueryOptions = {}): string {
  const params: string[] = [];
  if (options.skip) params.push(`$skip=${options.skip}`);
  if (options.take != null) params.push(`$top=${options.take}`);
  if (options.sort?.length) {
    const orderby = options.sort
      .map(({ field, dir }) => (dir === 'desc' ? `${field} desc` : field))
      .join(',');
    params.push(`$orderby=${encodeURIComponent(orderby)}`);
  }
  const filters: string[] = [];
  if (options.filter) filters.push(filterToOData(options.filter));
  const search = options.searchText?.trim();
  if (search && config.searchFields?.length) {
    const ors = config.searchFields
      .map((field) => `contains(${field},${literal(search)})`)
      .join(' or ');
    filters.push(`(${ors})`);
  }
  if (filters.length) {
    params.push(`$filter=${encodeURIComponent(filters.map((f) => `(${f})`).join(' and '))}`);
  }
  if (options.requireTotalCount) params.push('$count=true');
  return params.join('&');
}

export interface ODataDataSourceOptions<T> {
  /** Service URL of the entity set, e.g. `https://host/odata/Orders`. */
  url: string;
  key: keyof T | ((row: T) => RowKey);
  /** Fields the global search text matches against. */
  searchFields?: readonly string[];
  /** Extra headers (e.g. auth) added to every request. */
  headers?: Record<string, string>;
  /** Request executor — defaults to the global `fetch`. */
  fetchFn?: typeof fetch;
}

/**
 * Read-only DataSource for OData v4 endpoints: sorting, filtering, paging and
 * total counts translate to `$orderby`/`$filter`/`$skip`/`$top`/`$count`.
 */
export class ODataDataSource<T> implements DataSource<T> {
  readonly capabilities: DataSourceCapabilities = {
    sort: true,
    filter: true,
    group: false,
    paging: true,
    summary: false,
  };

  private readonly keySelector: (row: T) => RowKey;

  constructor(private readonly options: ODataDataSourceOptions<T>) {
    this.keySelector = resolveKeySelector(options.key);
  }

  async load(load: LoadOptions): Promise<LoadResult<T>> {
    const query = buildODataQuery(load, { searchFields: this.options.searchFields });
    const url = query ? `${this.options.url}?${query}` : this.options.url;
    const fetchFn = this.options.fetchFn ?? fetch;
    const response = await fetchFn(url, {
      headers: { Accept: 'application/json', ...this.options.headers },
      signal: load.signal,
    });
    if (!response.ok) {
      throw new Error(`ODataDataSource: ${response.status} ${response.statusText} for ${url}`);
    }
    const body = (await response.json()) as { value: T[]; '@odata.count'?: number };
    return {
      data: body.value,
      ...(body['@odata.count'] !== undefined ? { totalCount: body['@odata.count'] } : {}),
    };
  }

  keyOf(item: T): RowKey {
    return this.keySelector(item);
  }
}
