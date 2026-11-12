/** Code samples rendered on the server adapters guide (server code: fragments, exempt from the component compile gate). */

export const NODE_INSTALL = `npm install @oge-ui/server`;

export const NODE_EXPRESS = `import express from 'express';
import pg from 'pg';
import {
  OgeServerError,
  ogeParseLoadOptions,
  ogePostgresDialect,
  ogeSqlDistinct,
  ogeSqlLoad,
  type OgeServerSchema,
  type OgeSqlLoadOptions,
} from '@oge-ui/server';

const pool = new pg.Pool();

// the allowlist: only these fields may appear in a request, each mapped to
// its column; anything else is a 400
const orders: OgeServerSchema = {
  key: 'id',
  fields: {
    id: { type: 'number' },
    customer: { column: 'customer_name' },
    country: {},
    total: { type: 'number' },
    orderedAt: { column: 'ordered_at', type: 'date' },
    shipped: { type: 'boolean', searchable: false },
  },
};

const sql = (tenantId: string): OgeSqlLoadOptions => ({
  schema: orders,
  from: 'sales.orders',
  dialect: ogePostgresDialect({ unaccent: true }),
  // your own condition, ANDed to every query
  where: { sql: 'tenant_id = ?', params: [tenantId] },
  run: async ({ sql, params }) => (await pool.query(sql, [...params])).rows,
});

const app = express().use(express.json());

app.post('/api/orders/query', async (req, res) => {
  try {
    const options = ogeParseLoadOptions(req.body, orders, { maxTake: 500 });
    res.json(await ogeSqlLoad(options, sql(req.user.tenantId)));
  } catch (error) {
    if (error instanceof OgeServerError) res.status(error.status).json({ error: error.message });
    else throw error;
  }
});

// a header filter's value list
app.post('/api/orders/distinct/:field', async (req, res) => {
  const { filter, searchText, search, take } = ogeParseLoadOptions(
    { filter: req.body.filter, searchText: req.body.searchText, take: req.body.take },
    orders,
  );
  res.json(
    await ogeSqlDistinct(req.params.field, { filter, searchText, search: req.body.search, take }, sql(req.user.tenantId)),
  );
});`;

export const NODE_DRIVERS = `// mysql2 — ? placeholders
ogeMysqlDialect();
run: async ({ sql, params }) => (await pool.execute(sql, params))[0]

// SQL Server (mssql) — @p1, @p2… named parameters
ogeMssqlDialect({ collation: 'Turkish_100_CI_AI' });
run: async ({ sql, params }) => {
  const request = pool.request();
  params.forEach((value, i) => request.input(\`p\${i + 1}\`, value));
  return (await request.query(sql)).recordset;
}

// SQLite (node:sqlite or better-sqlite3) — register the suite's folding once
db.function('oge_fold', (text) => (text === null ? null : ogeFoldText(String(text))));
ogeSqliteDialect();
run: async ({ sql, params }) => db.prepare(sql).all(...params)`;

export const CLIENT_SOURCE = `import { CustomDataSource } from '@oge-ui/core';

const orders = new CustomDataSource<Order>({
  key: 'id',
  // the server sorts, filters, groups, pages and sums (the default)
  load: (options) => api.post('/api/orders/query', options, { signal: options.signal }),
  distinct: (field, options = {}) =>
    api.post(\`/api/orders/distinct/\${field}\`, options, { signal: options.signal }),
});`;

export const DOTNET_INSTALL = `dotnet add package Oge.Data`;

export const DOTNET_CONTROLLER = `using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Oge.Data;

[ApiController]
[Route("api/orders")]
public sealed class OrdersController(SalesContext db) : ControllerBase
{
    // the allowlist: every scalar property in camelCase, minus what must stay private
    private static readonly OgeSchema<Order> Schema =
        OgeSchema<Order>.FromProperties().Without("internalNote").WithKey("id");

    [HttpPost("query")]
    public async Task<ActionResult<OgeLoadResult>> Query(OgeLoadOptions options, CancellationToken ct)
    {
        try
        {
            return await db.Orders.Where(o => o.TenantId == User.TenantId())
                .OgeLoadAsync(options, Schema, EfRunner.Instance, cancellationToken: ct);
        }
        catch (OgeServerException error)
        {
            return BadRequest(new { error = error.Message });
        }
    }
}

// Entity Framework Core runs the queries asynchronously
public sealed class EfRunner : OgeQueryRunner
{
    public static readonly EfRunner Instance = new();
    public override Task<List<T>> ToListAsync<T>(IQueryable<T> query, CancellationToken ct) =>
        EntityFrameworkQueryableExtensions.ToListAsync(query, ct);
    public override Task<int> CountAsync<T>(IQueryable<T> query, CancellationToken ct) =>
        EntityFrameworkQueryableExtensions.CountAsync(query, ct);
}`;

export const DOTNET_FOLD = `// OgeTextFold.ToLower (default): LOWER() on both sides — translates on every
// provider; accents follow the column collation.
// OgeTextFold.Contract: the suite's own folding (case, accents, İ / ı). Map it
// to a database function so Entity Framework can translate it:
protected override void OnModelCreating(ModelBuilder model) =>
    model.HasDbFunction(typeof(OgeText).GetMethod(nameof(OgeText.Fold))!).HasName("oge_fold");

var result = await db.Orders.OgeLoadAsync(
    options, Schema, EfRunner.Instance, new OgeQueryOptions { Fold = OgeTextFold.Contract });`;
