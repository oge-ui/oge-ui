# @oge-ui/server

The server side of the [OGE UI](https://www.ogeui.com) data grid for Node.

A grid with a remote data source sends one `LoadOptions` object per request,
covering filter, search, sort, page, groups and summaries. This package does
three things with it:

- It checks the request against a field allowlist.
- It turns the request into **parameterized SQL** for PostgreSQL,
  MySQL / MariaDB, SQLite and SQL Server.
- It shapes the rows into the `LoadResult` the grid reads.

Filtering follows the published
[filter contract](https://www.ogeui.com/guides/filter-contract). The package's
own tests run the contract's vectors against a real SQLite database.

```bash
npm install @oge-ui/server
```

```ts
import { ogeParseLoadOptions, ogePostgresDialect, ogeSqlLoad, type OgeServerSchema } from '@oge-ui/server';

const schema: OgeServerSchema = {
  key: 'id',
  fields: {
    id: { type: 'number' },
    customer: { column: 'customer_name' },
    total: { type: 'number' },
    orderedAt: { column: 'ordered_at', type: 'date' },
  },
};

app.post('/api/orders/query', async (req, res) => {
  const options = ogeParseLoadOptions(req.body, schema); // 400 on anything else
  res.json(
    await ogeSqlLoad(options, {
      schema,
      from: 'sales.orders',
      dialect: ogePostgresDialect(),
      where: { sql: 'tenant_id = ?', params: [req.user.tenantId] },
      run: async ({ sql, params }) => (await pool.query(sql, [...params])).rows,
    }),
  );
});
```

The package depends on no database driver. You pass in a function that runs
one statement, so it works with `pg`, `mysql2`, `mssql`, `node:sqlite` and
`better-sqlite3`.

For .NET, the same contract is implemented by the
[`Oge.Data`](https://www.nuget.org/packages/Oge.Data) NuGet package, which
applies grid requests to any `IQueryable`, including Entity Framework Core.

Guide: <https://www.ogeui.com/guides/server-adapters>

MIT License.
