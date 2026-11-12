import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { foldText, type FilterExpr, type LoadOptions } from '@oge-ui/core';
import { ogeSqlDistinct, ogeSqlLoad, type OgeSqlRunner } from './load';
import { ogeParseLoadOptions } from './parse';
import { OgeServerError, type OgeServerSchema } from './schema';
import {
  ogeBuildDistinctQuery,
  ogeBuildSqlQueries,
  ogeEscapeLike,
  ogeMssqlDialect,
  ogeMysqlDialect,
  ogePostgresDialect,
  ogeSqliteDialect,
  type OgeSqlOptions,
} from './sql';

interface Vectors {
  rows: Record<string, unknown>[];
  dateFields: string[];
  cases: { name: string; filter: FilterExpr; expect: number[] }[];
}
const vectors = JSON.parse(
  readFileSync(resolve(__dirname, '../../../core/filter-vectors.json'), 'utf8'),
) as Vectors;

const SCHEMA: OgeServerSchema = {
  key: 'id',
  fields: {
    id: { type: 'number' },
    name: {},
    city: {},
    qty: { type: 'number' },
    at: { type: 'date' },
    note: {},
  },
};

/** node:sqlite binds every JS number as REAL; LIMIT and friends want INTEGER. */
const bind = (params: readonly unknown[]) =>
  params.map((p) =>
    typeof p === 'number' && Number.isInteger(p) ? BigInt(p) : p,
  ) as (string | number | bigint | null)[];

/** The vectors' rows in an in-memory SQLite table, dates as epoch ms. */
function database() {
  const db = new DatabaseSync(':memory:');
  db.function('oge_fold', (value: unknown) =>
    value === null ? null : foldText(String(value)),
  );
  db.exec(
    'CREATE TABLE people (id INTEGER, name TEXT, city TEXT, qty REAL, at INTEGER, note TEXT)',
  );
  const insert = db.prepare('INSERT INTO people VALUES (?, ?, ?, ?, ?, ?)');
  for (const row of vectors.rows) {
    insert.run(
      row['id'] as number,
      row['name'] as string,
      (row['city'] as string | null) ?? null,
      (row['qty'] as number | null) ?? null,
      row['at'] ? Date.parse(row['at'] as string) : null,
      (row['note'] as string | null) ?? null,
    );
  }
  const run: OgeSqlRunner = async ({ sql, params }) =>
    db.prepare(sql).all(...bind(params)) as Record<string, unknown>[];
  const config = {
    schema: SCHEMA,
    from: 'people',
    dialect: ogeSqliteDialect(),
    run,
    toDbValue: (value: unknown, field: { type?: string }) =>
      field.type === 'date' && typeof value === 'string'
        ? Date.parse(value)
        : value,
  };
  return { db, run, config };
}

describe('the filter contract on SQLite', () => {
  const { config } = database();
  for (const c of vectors.cases) {
    it(c.name, async () => {
      const result = await ogeSqlLoad({ filter: c.filter }, config);
      const ids = (result.data as { id: number }[]).map((r) => r.id).sort();
      expect(ids).toEqual([...c.expect].sort());
    });
  }
});

describe('ogeSqlLoad', () => {
  it('searches, sorts with the key as tie-breaker, pages, counts and sums', async () => {
    const { config } = database();
    const result = await ogeSqlLoad(
      {
        searchText: 'KAYA',
        sort: [{ field: 'name', dir: 'desc' }],
        skip: 0,
        take: 1,
        requireTotalCount: true,
        totalSummary: [
          { field: 'qty', type: 'sum' },
          { field: 'qty', type: 'count' },
        ],
      },
      { ...config, mapRow: (row) => ({ id: row['id'], name: row['name'] }) },
    );
    expect(result.data).toEqual([{ id: 1, name: 'Kaya, Mehmet' }]);
    expect(result.totalCount).toBe(2);
    expect(result.summary).toEqual([2, 2]);
  });

  it('groups the first level with counts, group sums and the group count', async () => {
    const { config } = database();
    const result = await ogeSqlLoad(
      {
        group: [{ field: 'qty', dir: 'desc', interval: 10 }],
        groupSummary: [{ field: 'qty', type: 'max' }],
        requireGroupCount: true,
        filter: { type: 'binary', field: 'qty', op: 'isnotnull' },
      },
      config,
    );
    expect(result.data).toEqual([
      { key: 10, items: null, count: 1, summary: [12] },
      { key: 0, items: null, count: 2, summary: [5] },
      { key: -10, items: null, count: 1, summary: [-3] },
    ]);
    expect(result.totalCount).toBe(4);
    expect(result.groupCount).toBe(3);
  });

  it('adds your own condition and lists distinct values', async () => {
    const { config } = database();
    const own = { ...config, where: { sql: 'qty > ?', params: [0] } };
    const result = await ogeSqlLoad({ requireTotalCount: true }, own);
    expect(result.totalCount).toBe(2);
    const values = await ogeSqlDistinct(
      'city',
      { search: 'İZ', take: 10 },
      config,
    );
    expect(values).toEqual(['izmir', 'İzmir']);
    const all = await ogeSqlDistinct('city', {}, config);
    expect(all[0]).toBeNull();
  });

  it('groups ISO dates by calendar unit on SQLite', async () => {
    const db = new DatabaseSync(':memory:');
    db.exec(
      "CREATE TABLE t (at TEXT); INSERT INTO t VALUES ('2026-01-31T10:00:00Z'), ('2026-02-01T09:00:00Z'), ('2026-04-15T00:00:00Z')",
    );
    const run: OgeSqlRunner = async ({ sql, params }) =>
      db.prepare(sql).all(...bind(params)) as Record<string, unknown>[];
    const config = {
      schema: { fields: { at: { type: 'date' as const } } },
      from: 't',
      dialect: ogeSqliteDialect(),
      run,
    };
    const keys = async (
      interval: 'month' | 'quarter' | 'year' | 'day' | 'hour',
    ) =>
      (
        await ogeSqlLoad(
          { group: [{ field: 'at', dir: 'asc', interval }] },
          config,
        )
      ).data.map((g) => (g as { key: unknown }).key);
    expect(await keys('month')).toEqual([
      '2026-01-01',
      '2026-02-01',
      '2026-04-01',
    ]);
    expect(await keys('quarter')).toEqual(['2026-01-01', '2026-04-01']);
    expect(await keys('year')).toEqual(['2026-01-01']);
    expect(await keys('day')).toHaveLength(3);
    expect(await keys('hour')).toContain('2026-01-31T10:00:00');
  });
});

describe('ogeBuildSqlQueries per dialect', () => {
  const options: LoadOptions = {
    filter: {
      type: 'and',
      operands: [
        { type: 'binary', field: 'name', op: 'contains', value: '50%_off!' },
        { type: 'binary', field: 'qty', op: 'between', value: [1, null] },
        {
          type: 'binary',
          field: 'at',
          op: 'ge',
          value: '2026-01-01T00:00:00Z',
        },
      ],
    },
    sort: [{ field: 'qty', dir: 'desc' }],
    skip: 20,
    take: 10,
  };
  const config = (dialect: OgeSqlOptions['dialect']): OgeSqlOptions => ({
    schema: SCHEMA,
    from: 'app.people',
    dialect,
  });

  it('writes PostgreSQL with $n placeholders and lower() folding', () => {
    const q = ogeBuildSqlQueries(options, config(ogePostgresDialect()));
    expect(q.data.sql).toBe(
      'SELECT * FROM app.people WHERE (("name" IS NOT NULL AND lower("name") LIKE lower($1) ESCAPE \'!\') AND ("qty" IS NOT NULL AND "qty" >= $2) AND ("at" IS NOT NULL AND "at" >= $3)) ORDER BY "qty" DESC, "id" ASC LIMIT $4 OFFSET $5',
    );
    expect(q.data.params[0]).toBe('%50!%!_off!!%');
    expect(q.data.params[2]).toEqual(new Date('2026-01-01T00:00:00Z'));
    expect(q.data.params.slice(3)).toEqual([10, 20]);
    expect(q.count.sql).toMatch(
      /^SELECT COUNT\(\*\) AS count FROM app\.people WHERE/,
    );
    expect(q.summary).toBeNull();
    expect(
      ogeBuildSqlQueries(
        { filter: options.filter },
        config(ogePostgresDialect({ unaccent: true })),
      ).data.sql,
    ).toContain('lower(unaccent("name"))');
  });

  it('writes MySQL with backticks and ? placeholders', () => {
    const q = ogeBuildSqlQueries(options, config(ogeMysqlDialect()));
    expect(q.data.sql).toContain(
      '`name` IS NOT NULL AND lower(`name`) LIKE lower(?)',
    );
    expect(q.data.sql).toMatch(/LIMIT \? OFFSET \?$/);
  });

  it('writes SQL Server with a collation, @p placeholders and OFFSET … FETCH', () => {
    const q = ogeBuildSqlQueries(options, config(ogeMssqlDialect()));
    expect(q.data.sql).toContain(
      '[name] COLLATE Latin1_General_100_CI_AI LIKE @p1 COLLATE Latin1_General_100_CI_AI',
    );
    expect(q.data.sql).toMatch(
      /ORDER BY \[qty\] DESC, \[id\] ASC OFFSET @p5 ROWS FETCH NEXT @p4 ROWS ONLY$/,
    );
    expect(q.data.sql.startsWith('SELECT * FROM [app].[people]')).toBe(false);
    // no sort: SQL Server still needs an ORDER BY to page
    const noSort = ogeBuildSqlQueries(
      { take: 5 },
      { schema: { fields: { a: {} } }, from: 't', dialect: ogeMssqlDialect() },
    );
    expect(noSort.data.sql).toBe(
      'SELECT * FROM t ORDER BY (SELECT NULL) OFFSET @p2 ROWS FETCH NEXT @p1 ROWS ONLY',
    );
    expect(() => ogeMssqlDialect({ collation: 'x; DROP' })).toThrow(
      OgeServerError,
    );
  });

  it('buckets dates per dialect and refuses weeks', () => {
    const group = (
      dialect: OgeSqlOptions['dialect'],
      interval: 'month' | 'week' | 'hour' | 'day' | 'quarter' | 'year',
    ) =>
      ogeBuildSqlQueries(
        { group: [{ field: 'at', dir: 'asc', interval }] },
        config(dialect),
      ).data.sql;
    expect(group(ogePostgresDialect(), 'month')).toContain(
      `date_trunc('month', "at")`,
    );
    for (const unit of ['hour', 'day', 'month', 'quarter', 'year'] as const) {
      expect(group(ogeMysqlDialect(), unit)).toContain('`at`');
      expect(group(ogeMssqlDialect(), unit)).toContain('[at]');
    }
    for (const dialect of [
      ogePostgresDialect(),
      ogeMysqlDialect(),
      ogeSqliteDialect(),
      ogeMssqlDialect(),
    ]) {
      expect(() => group(dialect, 'week')).toThrow(/first day of the week/);
    }
    expect(() =>
      ogeBuildSqlQueries(
        { group: [{ field: 'name', dir: 'asc', interval: 'day' }] },
        config(ogePostgresDialect()),
      ),
    ).toThrow(/date fields only/);
    expect(() =>
      ogeBuildSqlQueries(
        { group: [{ field: 'name', dir: 'asc', interval: 5 }] },
        config(ogePostgresDialect()),
      ),
    ).toThrow(/number fields only/);
  });

  it('covers the remaining operator shapes', () => {
    const sql = (filter: FilterExpr) =>
      ogeBuildSqlQueries({ filter }, config(ogePostgresDialect())).data.sql;
    expect(
      sql({ type: 'binary', field: 'qty', op: 'gt', value: null }),
    ).toContain('1=0');
    expect(sql({ type: 'and', operands: [] })).toContain('WHERE 1=1');
    expect(sql({ type: 'or', operands: [] })).toContain('WHERE 1=0');
    expect(
      sql({ type: 'binary', field: 'name', op: 'ne', value: null }),
    ).toContain('"name" IS NOT NULL');
    expect(
      sql({ type: 'binary', field: 'name', op: 'in', value: 'x' }),
    ).toContain('IN (lower($1))');
    expect(() =>
      sql({ type: 'binary', field: 'name', op: 'nope' as 'eq', value: 1 }),
    ).toThrow(/Unknown filter operator/);
    expect(() =>
      sql({ type: 'binary', field: 'at', op: 'eq', value: 'soon' }),
    ).toThrow(/not a date/);
    const bools = ogeBuildSqlQueries(
      { filter: { type: 'binary', field: 'ok', op: 'eq', value: true } },
      {
        schema: { fields: { ok: { type: 'boolean' } } },
        from: 't',
        dialect: ogeMysqlDialect(),
      },
    );
    expect(bools.data.params).toEqual([1]);
    const expression = ogeBuildSqlQueries(
      {
        sort: [{ field: 'full', dir: 'asc' }],
        totalSummary: [{ field: 'full', type: 'min' }],
      },
      {
        schema: {
          fields: {
            full: { column: "first || ' ' || last", expression: true },
          },
        },
        from: 't',
        dialect: ogePostgresDialect(),
      },
    );
    expect(expression.data.sql).toContain(
      "ORDER BY (first || ' ' || last) ASC",
    );
    expect(expression.summary?.sql).toBe(
      `SELECT MIN((first || ' ' || last)) AS "s0" FROM t`,
    );
    expect(() =>
      ogeBuildSqlQueries(
        { totalSummary: [{ field: 'qty', type: 'custom' }] },
        config(ogePostgresDialect()),
      ),
    ).toThrow(/not supported/);
    expect(
      ogeBuildSqlQueries(
        { searchText: 'x' },
        {
          schema: { fields: { n: { type: 'number' } } },
          from: 't',
          dialect: ogePostgresDialect(),
        },
      ).data.sql,
    ).toContain('WHERE 1=0');
    expect(
      ogeBuildSqlQueries(
        { skip: 5 },
        config(ogeSqliteDialect({ foldFunction: null })),
      ).data.params,
    ).toEqual([Number.MAX_SAFE_INTEGER, 5]);
    expect(
      ogeBuildSqlQueries(
        { filter: { type: 'binary', field: 'name', op: 'eq', value: 'x' } },
        config(ogeSqliteDialect({ foldFunction: null })),
      ).data.sql,
    ).toContain('lower("name") = lower(?)');
    expect(
      ogeBuildDistinctQuery('name', {}, config(ogeMssqlDialect())).sql,
    ).toBe(
      'SELECT DISTINCT [name] AS [value] FROM app.people ORDER BY [value] ASC OFFSET @p2 ROWS FETCH NEXT @p1 ROWS ONLY',
    );
  });

  it('escapes LIKE wildcards', () => {
    expect(ogeEscapeLike('a%b_c!d')).toBe('a!%b!_c!!d');
  });
});

describe('ogeParseLoadOptions', () => {
  it('accepts a well-formed request as an object or JSON', () => {
    const parsed = ogeParseLoadOptions(
      JSON.stringify({
        skip: '10',
        take: 25,
        sort: [{ field: 'name' }],
        group: [
          { field: 'at', dir: 'desc', interval: 'month' },
          { field: 'qty' },
        ],
        filter: {
          type: 'not',
          operand: {
            type: 'or',
            operands: [
              { type: 'binary', field: 'city', op: 'in', value: ['A', null] },
              { type: 'binary', field: 'qty', op: 'between', value: [1, 2] },
              {
                type: 'binary',
                field: 'note',
                op: 'isblank',
                value: 'ignored',
              },
              { type: 'binary', field: 'name', op: 'contains', value: 'x' },
            ],
          },
        },
        totalSummary: [{ field: 'qty', type: 'sum' }],
        groupSummary: [{ field: 'qty', type: 'avg' }],
        requireTotalCount: 'true',
        requireGroupCount: true,
        searchText: '  hi  ',
      }),
      SCHEMA,
    );
    expect(parsed.skip).toBe(10);
    expect(parsed.sort).toEqual([{ field: 'name', dir: 'asc' }]);
    expect(parsed.group?.[0].interval).toBe('month');
    expect(parsed.requireTotalCount).toBe(true);
    expect(parsed.searchText).toBe('hi');
    expect(
      (parsed.filter as { operand: { operands: FilterExpr[] } }).operand
        .operands[2],
    ).toEqual({ type: 'binary', field: 'note', op: 'isblank' });
    expect(ogeParseLoadOptions(undefined, SCHEMA)).toMatchObject({
      take: 1000,
      filter: null,
    });
  });

  it('refuses what the schema or the limits do not allow', () => {
    const bad =
      (input: unknown, limits = {}) =>
      () =>
        ogeParseLoadOptions(input, SCHEMA, limits);
    expect(bad('{')).toThrow('not valid JSON');
    expect(bad([])).toThrow('must be an object');
    expect(bad({ take: 5000 })).toThrow('at most 1000');
    expect(bad({ skip: -1 })).toThrow('integer');
    expect(bad({ sort: [{ field: 'password' }] })).toThrow(
      'Unknown field "password"',
    );
    expect(bad({ sort: [{ field: 'name', dir: 'up' }] })).toThrow('"dir"');
    expect(bad({ sort: {} })).toThrow('must be a list');
    expect(bad({ sort: [1] })).toThrow('needs a field');
    expect(bad({ group: [{}] })).toThrow('needs a field');
    expect(bad({ group: [{ field: 'at', interval: 'decade' }] })).toThrow(
      'interval',
    );
    expect(bad({ totalSummary: [{}] })).toThrow('needs a field');
    expect(bad({ totalSummary: [{ field: 'qty', type: 'custom' }] })).toThrow(
      'not supported',
    );
    expect(bad({ filter: 3 })).toThrow('must be an object');
    expect(bad({ filter: { type: 'xor' } })).toThrow('binary, and, or or not');
    expect(bad({ filter: { type: 'binary' } })).toThrow('needs a field');
    expect(
      bad({ filter: { type: 'binary', field: 'name', op: 'like' } }),
    ).toThrow('Unknown filter operator');
    expect(
      bad({
        filter: { type: 'binary', field: 'name', op: 'between', value: [1] },
      }),
    ).toThrow('pair');
    expect(
      bad({ filter: { type: 'binary', field: 'name', op: 'eq', value: {} } }),
    ).toThrow('text, numbers');
    expect(
      bad({
        filter: { type: 'binary', field: 'qty', op: 'eq', value: Infinity },
      }),
    ).toThrow('finite');
    expect(
      bad({
        filter: {
          type: 'binary',
          field: 'name',
          op: 'eq',
          value: 'x'.repeat(600),
        },
      }),
    ).toThrow('too long');
    expect(
      bad(
        {
          filter: { type: 'binary', field: 'name', op: 'in', value: [1, 2, 3] },
        },
        { maxListLength: 2 },
      ),
    ).toThrow('list is too long');
    const deep: Record<string, unknown> = {
      type: 'binary',
      field: 'name',
      op: 'eq',
      value: 'x',
    };
    let nested: Record<string, unknown> = deep;
    for (let i = 0; i < 20; i++) nested = { type: 'not', operand: nested };
    expect(bad({ filter: nested })).toThrow('too deeply');
    expect(
      bad(
        { filter: { type: 'and', operands: [deep, deep, deep] } },
        { maxFilterNodes: 3 },
      ),
    ).toThrow('too many conditions');
    expect(bad({ searchText: 4 })).toThrow('must be text');
    expect(bad({ searchText: 'x'.repeat(600) })).toThrow('too long');
    const locked: OgeServerSchema = {
      fields: { a: { filterable: false, sortable: false } },
    };
    expect(() =>
      ogeParseLoadOptions(
        { filter: { type: 'binary', field: 'a', op: 'isnull' } },
        locked,
      ),
    ).toThrow('cannot be filtered');
    expect(() =>
      ogeParseLoadOptions({ sort: [{ field: 'a' }] }, locked),
    ).toThrow('cannot be sorted');
    try {
      ogeParseLoadOptions({ take: -1 }, SCHEMA);
    } catch (error) {
      expect((error as OgeServerError).status).toBe(400);
      expect((error as Error).name).toBe('OgeServerError');
    }
  });
});
