/**
 * Runs a request against any SQL driver: you hand in a function that executes
 * one statement and returns its rows; the adapter builds the statements, runs
 * the ones the request needs and shapes the grid's `LoadResult`.
 */
import type {
  DistinctOptions,
  GroupedItem,
  LoadOptions,
  LoadResult,
} from '@oge-ui/core';
import {
  ogeBuildDistinctQuery,
  ogeBuildSqlQueries,
  type OgeSqlOptions,
  type OgeSqlStatement,
} from './sql';

/** Executes one statement: `pg`'s `client.query`, `mysql2`'s `execute`, … */
export type OgeSqlRunner = (
  statement: OgeSqlStatement,
) => Promise<readonly Record<string, unknown>[]>;

export interface OgeSqlLoadOptions extends OgeSqlOptions {
  readonly run: OgeSqlRunner;
  /** Shapes each row before it is returned (rename columns, drop secrets). */
  readonly mapRow?: (row: Record<string, unknown>) => unknown;
}

const num = (value: unknown) =>
  typeof value === 'bigint' ? Number(value) : Number(value ?? 0);

/**
 * Answers a grid request: the page of rows (or of first-level groups), the
 * total count when asked for, and the total summaries.
 */
export async function ogeSqlLoad<T = Record<string, unknown>>(
  options: LoadOptions,
  config: OgeSqlLoadOptions,
): Promise<LoadResult<T>> {
  const queries = ogeBuildSqlQueries(options, config);
  const grouped = !!options.group?.length;
  const [rows, count, summary, groupCount] = await Promise.all([
    config.run(queries.data),
    options.requireTotalCount || grouped ? config.run(queries.count) : null,
    queries.summary ? config.run(queries.summary) : null,
    grouped && options.requireGroupCount && queries.groupCount
      ? config.run(queries.groupCount)
      : null,
  ]);
  const summaryValues = summary
    ? (options.totalSummary ?? []).map((_s, i) => summary[0]?.[`s${i}`] ?? null)
    : undefined;
  const totalCount = count ? num(count[0]?.['count']) : undefined;
  if (grouped) {
    const groups: GroupedItem<T>[] = rows.map((row) => ({
      key: row['key'] ?? null,
      items: null,
      count: num(row['count']),
      summary: (options.groupSummary ?? []).map(
        (_s, i) => row[`g${i}`] ?? null,
      ),
    }));
    return {
      data: groups,
      totalCount,
      groupCount: groupCount ? num(groupCount[0]?.['count']) : undefined,
      summary: summaryValues,
    };
  }
  const map = config.mapRow ?? ((row: Record<string, unknown>) => row);
  return {
    data: rows.map((row) => map(row) as T),
    totalCount,
    summary: summaryValues,
  };
}

/** Answers a header filter's request for the distinct values of a field. */
export async function ogeSqlDistinct(
  field: string,
  options: Omit<DistinctOptions, 'signal'>,
  config: OgeSqlLoadOptions,
): Promise<unknown[]> {
  const rows = await config.run(ogeBuildDistinctQuery(field, options, config));
  return rows.map((row) => row['value'] ?? null);
}
