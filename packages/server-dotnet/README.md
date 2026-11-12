# Oge.Data

The server side of the [OGE UI](https://www.ogeui.com) data grid for .NET.

A grid with a remote data source sends one request object, covering filter,
search, sort, page, groups and summaries. `Oge.Data` applies that request to
any `IQueryable` under a field allowlist and returns the result the grid
reads. Entity Framework Core translates the whole request into SQL.

Filtering follows the published
[filter contract](https://www.ogeui.com/guides/filter-contract). The package's
own tests run the contract's vectors against LINQ to Objects and against
Entity Framework Core on SQLite.

```bash
dotnet add package Oge.Data
```

```csharp
using Oge.Data;

private static readonly OgeSchema<Order> Schema =
    OgeSchema<Order>.FromProperties().Without("internalNote").WithKey("id");

[HttpPost("api/orders/query")]
public async Task<ActionResult<OgeLoadResult>> Query(OgeLoadOptions options, CancellationToken ct)
{
    try
    {
        return await db.Orders.Where(o => o.TenantId == tenantId)
            .OgeLoadAsync(options, Schema, EfRunner.Instance, cancellationToken: ct);
    }
    catch (OgeServerException error)
    {
        return BadRequest(new { error = error.Message });
    }
}
```

`EfRunner` is a two-method subclass of `OgeQueryRunner`. It runs the queries
with Entity Framework's `ToListAsync` and `CountAsync`; the guide shows it in
full.

Targets net8.0. Node.js counterpart: [`@oge-ui/server`](https://www.npmjs.com/package/@oge-ui/server).

Guide: <https://www.ogeui.com/guides/server-adapters>

MIT License.
