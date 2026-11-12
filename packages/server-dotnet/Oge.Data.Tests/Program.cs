using System.Text.Json;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Oge.Data;

var failures = 0;
var checks = 0;

void Check(bool condition, string name)
{
    checks++;
    if (condition) return;
    failures++;
    Console.Error.WriteLine($"FAIL: {name}");
}

void Equal<TValue>(TValue expected, TValue actual, string name) =>
    Check(EqualityComparer<TValue>.Default.Equals(expected, actual), $"{name}: expected {expected}, got {actual}");

void Throws(Action action, string fragment, string name)
{
    try
    {
        action();
        Check(false, $"{name}: no exception");
    }
    catch (OgeServerException error)
    {
        Check(error.Message.Contains(fragment), $"{name}: \"{error.Message}\" lacks \"{fragment}\"");
    }
}

// --- the contract vectors -----------------------------------------------------
var vectorsJson = JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "filter-vectors.json")));
var people = vectorsJson.RootElement.GetProperty("rows").EnumerateArray().Select(row => new Person
{
    Id = row.GetProperty("id").GetInt32(),
    Name = row.GetProperty("name").GetString()!,
    City = row.GetProperty("city").ValueKind == JsonValueKind.Null ? null : row.GetProperty("city").GetString(),
    Qty = row.GetProperty("qty").ValueKind == JsonValueKind.Null ? null : row.GetProperty("qty").GetDouble(),
    At = row.GetProperty("at").ValueKind == JsonValueKind.Null
        ? null
        : DateTime.Parse(row.GetProperty("at").GetString()!, null, System.Globalization.DateTimeStyles.AdjustToUniversal),
    Note = row.GetProperty("note").ValueKind == JsonValueKind.Null ? null : row.GetProperty("note").GetString(),
}).ToList();

var schema = OgeSchema<Person>.FromProperties().WithKey("id");
var contract = new OgeQueryOptions { Fold = OgeTextFold.Contract };

using var connection = new SqliteConnection("Data Source=:memory:");
connection.Open();
connection.CreateFunction("oge_fold", (string? text) => OgeText.Fold(text));
var dbOptions = new DbContextOptionsBuilder<PeopleContext>().UseSqlite(connection).Options;
using (var seed = new PeopleContext(dbOptions))
{
    seed.Database.EnsureCreated();
    seed.People.AddRange(people.Select(p => p with { }));
    seed.SaveChanges();
}
using var db = new PeopleContext(dbOptions);

foreach (var vector in vectorsJson.RootElement.GetProperty("cases").EnumerateArray())
{
    var name = vector.GetProperty("name").GetString()!;
    var filter = vector.GetProperty("filter").Deserialize<OgeFilterExpr>(OgeLoadOptions.JsonOptions)!;
    var expected = vector.GetProperty("expect").EnumerateArray().Select(e => e.GetInt32()).OrderBy(i => i).ToList();
    var options = new OgeLoadOptions { Filter = filter };

    var inMemory = people.AsQueryable().ApplyOgeFilter(options, schema, contract).Select(p => p.Id).OrderBy(i => i).ToList();
    Check(inMemory.SequenceEqual(expected), $"LINQ to Objects · {name}: [{string.Join(",", inMemory)}]");

    var sql = db.People.ApplyOgeFilter(options, schema, contract).Select(p => p.Id).OrderBy(i => i).ToList();
    Check(sql.SequenceEqual(expected), $"EF Core SQLite · {name}: [{string.Join(",", sql)}]");
}

// --- loading ------------------------------------------------------------------
foreach (var (label, source, runner) in new (string, IQueryable<Person>, OgeQueryRunner)[]
         {
             ("LINQ to Objects", people.AsQueryable(), OgeQueryRunner.Sync),
             ("EF Core SQLite", db.People, new EfRunner()),
         })
{
    var page = await source.OgeLoadAsync(
        OgeLoadOptions.Parse("""
            {"searchText":"KAYA","sort":[{"field":"name","dir":"desc"}],"skip":0,"take":1,
             "requireTotalCount":true,"totalSummary":[{"field":"qty","type":"sum"},{"field":"qty","type":"count"},{"field":"qty","type":"max"}]}
            """),
        schema, runner, contract);
    Equal(1, ((Person)page.Data[0]!).Id, $"{label} · search + sort + page");
    Equal(2, page.TotalCount, $"{label} · total count");
    Equal(2.0, Convert.ToDouble(page.Summary![0]), $"{label} · sum");
    Equal(2, Convert.ToInt32(page.Summary![1]), $"{label} · count");
    Equal(5.0, Convert.ToDouble(page.Summary![2]), $"{label} · max");

    var groups = await source.OgeLoadAsync(
        OgeLoadOptions.Parse("""
            {"group":[{"field":"qty","dir":"desc","interval":10}],"groupSummary":[{"field":"qty","type":"min"}],
             "requireGroupCount":true,"filter":{"type":"binary","field":"qty","op":"isnotnull"}}
            """),
        schema, runner, contract);
    var keys = groups.Data.Cast<OgeGroup>().Select(g => Convert.ToDouble(g.Key)).ToList();
    Check(keys.SequenceEqual(new[] { 10.0, 0.0, -10.0 }), $"{label} · number buckets [{string.Join(",", keys)}]");
    Equal(2, groups.Data.Cast<OgeGroup>().ElementAt(1).Count, $"{label} · group count");
    Equal(0.0, Convert.ToDouble(groups.Data.Cast<OgeGroup>().ElementAt(1).Summary[0]), $"{label} · group min");
    Equal(3, groups.GroupCount, $"{label} · number of groups");
    Equal(4, groups.TotalCount, $"{label} · rows in groups");

    var months = await source.OgeLoadAsync(
        OgeLoadOptions.Parse("""{"group":[{"field":"at","interval":"month"}],"take":10}"""), schema, runner, contract);
    var monthKeys = months.Data.Cast<OgeGroup>().Select(g => g.Key is DateTime d ? d.ToString("yyyy-MM") : "null").ToList();
    Check(monthKeys.SequenceEqual(new[] { "null", "2026-01", "2026-02" }), $"{label} · month buckets [{string.Join(",", monthKeys)}]");
    foreach (var unit in new[] { "hour", "day", "quarter", "year" })
    {
        var buckets = await source.OgeLoadAsync(
            OgeLoadOptions.Parse($$"""{"group":[{"field":"at","interval":"{{unit}}"}]}"""), schema, runner, contract);
        Check(buckets.Data.Count > 0, $"{label} · {unit} buckets");
    }

    var values = await source.OgeDistinctAsync("city", schema, search: "İZ", runner: runner, settings: contract);
    Check(values.Count == 2 && values.All(v => v is string s && OgeText.Fold(s) == "izmir"), $"{label} · distinct with search");
    var all = await source.OgeDistinctAsync("city", schema, take: 2, runner: runner, settings: contract);
    Equal(2, all.Count, $"{label} · distinct take");
}

// the default ToLower fold translates for any EF provider
var lower = db.People.ApplyOgeFilter(
    new OgeLoadOptions { Filter = new OgeFilterExpr { Type = "binary", Field = "name", Op = "eq", Value = JsonDocument.Parse("\"kaya\"").RootElement } },
    schema).Select(p => p.Id).ToList();
Check(lower.SequenceEqual(new[] { 5 }), "EF Core SQLite · ToLower fold");
var exact = people.AsQueryable().ApplyOgeFilter(
    new OgeLoadOptions { Filter = new OgeFilterExpr { Type = "binary", Field = "name", Op = "startswith", Value = JsonDocument.Parse("\"Kaya\"").RootElement } },
    schema, new OgeQueryOptions { Fold = OgeTextFold.None }).Count();
Equal(2, exact, "no fold · startswith");

// conversions of the other scalar types
var things = new[]
{
    new Thing { Id = 1, Ok = true, Kind = Kind.Big, Ref = Guid.Parse("5f8e1d2c-0000-0000-0000-000000000001"), When = new DateTimeOffset(2026, 1, 2, 0, 0, 0, TimeSpan.Zero), Day = new DateOnly(2026, 1, 2), Price = 9.5m },
    new Thing { Id = 2, Ok = false, Kind = Kind.Small, Ref = Guid.Empty, When = new DateTimeOffset(2026, 3, 1, 0, 0, 0, TimeSpan.Zero), Day = new DateOnly(2026, 3, 1), Price = 20m },
}.AsQueryable();
var thingSchema = OgeSchema<Thing>.FromProperties();
int Count(string filter) =>
    things.ApplyOgeFilter(OgeLoadOptions.Parse($$"""{"filter":{{filter}}}"""), thingSchema).Count();
Equal(1, Count("""{"type":"binary","field":"ok","op":"eq","value":true}"""), "bool");
Equal(1, Count("""{"type":"binary","field":"ok","op":"eq","value":"false"}"""), "bool as text");
Equal(1, Count("""{"type":"binary","field":"kind","op":"eq","value":"big"}"""), "enum by name");
Equal(1, Count("""{"type":"binary","field":"kind","op":"eq","value":0}"""), "enum by number");
Equal(1, Count("""{"type":"binary","field":"ref","op":"eq","value":"5f8e1d2c-0000-0000-0000-000000000001"}"""), "guid");
Equal(1, Count("""{"type":"binary","field":"when","op":"gt","value":"2026-02-01T00:00:00Z"}"""), "DateTimeOffset");
Equal(1, Count("""{"type":"binary","field":"day","op":"le","value":"2026-01-31"}"""), "DateOnly");
Equal(2, Count("""{"type":"binary","field":"price","op":"in","value":[9.5,"20"]}"""), "decimal in");
Equal(0, Count("""{"type":"binary","field":"price","op":"isblank"}"""), "isblank on a non-nullable number");
Equal(2, Count("""{"type":"binary","field":"price","op":"isnotnull"}"""), "isnotnull on a non-nullable number");
Equal(0, Count("""{"type":"binary","field":"price","op":"isnull"}"""), "isnull on a non-nullable number");
Equal(0, Count("""{"type":"binary","field":"price","op":"gt","value":null}"""), "gt null");
Equal(2, Count("""{"type":"and","operands":[]}"""), "empty and");
Equal(0, Count("""{"type":"or","operands":[]}"""), "empty or");
Equal(2, things.OgeLoad(new OgeLoadOptions { SearchText = "x" }, thingSchema).Data.Count == 0 ? 2 : 0, "search with no text fields matches nothing");
var noKey = things.OgeLoad(OgeLoadOptions.Parse("""{"sort":[{"field":"price","dir":"desc"}]}"""), thingSchema);
Equal(2, ((Thing)noKey.Data[0]!).Id, "sort without a key");

// refusals
Throws(() => OgeLoadOptions.Parse("{"), "not valid JSON", "bad JSON");
Throws(() => Count("""{"type":"binary","field":"secret","op":"eq","value":1}"""), "Unknown field", "unknown field");
Throws(() => Count("""{"type":"binary","field":"price","op":"like","value":1}"""), "Unknown filter operator", "unknown operator");
Throws(() => Count("""{"type":"xor"}"""), "binary, and, or or not", "unknown type");
Throws(() => Count("""{"type":"not"}"""), "needs an operand", "not without operand");
Throws(() => Count("""{"type":"binary","field":"price","op":"contains","value":"1"}"""), "needs a text field", "contains on a number");
Throws(() => Count("""{"type":"binary","field":"price","op":"between","value":[1]}"""), "pair", "between pair");
Throws(() => Count("""{"type":"binary","field":"price","op":"in","value":1}"""), "list value", "in without list");
Throws(() => Count("""{"type":"binary","field":"price","op":"eq","value":"abc"}"""), "not a valid Decimal", "bad number");
Throws(() => things.OgeLoad(new OgeLoadOptions { Take = 5000 }, thingSchema), "at most 1000", "take limit");
Throws(() => things.OgeLoad(new OgeLoadOptions { Skip = -1 }, thingSchema), "at least 0", "negative skip");
Throws(() => things.OgeLoad(OgeLoadOptions.Parse("""{"sort":[{"field":"price","dir":"up"}]}"""), thingSchema), "\"dir\"", "bad dir");
Throws(() => things.OgeLoad(OgeLoadOptions.Parse("""{"totalSummary":[{"field":"price","type":"custom"}]}"""), thingSchema), "not supported", "custom summary");
Throws(() => things.OgeLoad(OgeLoadOptions.Parse("""{"totalSummary":[{"field":"kind","type":"sum"}]}"""), thingSchema), "needs a number field", "sum of an enum");
Throws(() => things.OgeLoad(OgeLoadOptions.Parse("""{"group":[{"field":"when","interval":"day"}]}"""), thingSchema), "DateTime fields only", "calendar on DateTimeOffset");
Throws(() => things.OgeLoad(OgeLoadOptions.Parse("""{"group":[{"field":"kind","interval":5}]}"""), thingSchema), "number fields only", "width on an enum");
Throws(() => things.OgeLoad(OgeLoadOptions.Parse("""{"group":[{"field":"price","interval":-1}]}"""), thingSchema), "positive", "negative width");
Throws(() => people.AsQueryable().OgeLoad(OgeLoadOptions.Parse("""{"group":[{"field":"at","interval":"week"}]}"""), schema), "first day of the week", "week");
Throws(() => people.AsQueryable().OgeLoad(OgeLoadOptions.Parse("""{"group":[{"field":"at","interval":"decade"}]}"""), schema), "Unknown group interval", "unknown interval");
var locked = new OgeSchema<Thing>().Field("price", t => t.Price, filterable: false, sortable: false).Field("id", t => t.Id).Without("id");
Throws(() => things.ApplyOgeFilter(OgeLoadOptions.Parse("""{"filter":{"type":"binary","field":"price","op":"isnull"}}"""), locked).Count(), "cannot be filtered", "not filterable");
Throws(() => things.ApplyOgeSort(new[] { new OgeSortDescriptor { Field = "price" } }, locked).Count(), "cannot be sorted", "not sortable");
Throws(() => things.ApplyOgeSort(new[] { new OgeSortDescriptor { Field = "id" } }, locked).Count(), "Unknown field", "removed field");
var deep = new OgeFilterExpr { Type = "binary", Field = "price", Op = "isnull" };
for (var i = 0; i < 20; i++) deep = new OgeFilterExpr { Type = "not", Operand = deep };
Throws(() => things.ApplyOgeFilter(new OgeLoadOptions { Filter = deep }, thingSchema).Count(), "too deeply", "depth limit");
Throws(() => things.ApplyOgeFilter(OgeLoadOptions.Parse("""{"filter":{"type":"binary","field":"price","op":"in","value":[1,2,3]}}"""), thingSchema, new OgeQueryOptions { MaxListLength = 2 }).Count(), "too long", "list limit");
Throws(() => things.ApplyOgeFilter(OgeLoadOptions.Parse("""{"filter":{"type":"and","operands":[{"type":"and"},{"type":"and"}]}}"""), thingSchema, new OgeQueryOptions { MaxFilterNodes = 2 }).Count(), "too many", "node limit");

// the result serializes as the grid reads it
var json = JsonSerializer.Serialize(people.AsQueryable().OgeLoad(OgeLoadOptions.Parse("""{"take":1,"requireTotalCount":true}"""), schema), OgeLoadOptions.JsonOptions);
Check(json.Contains("\"totalCount\":5") && json.Contains("\"data\":[{\"id\":1") && !json.Contains("groupCount"), $"result JSON {json}");
var groupJson = JsonSerializer.Serialize(new OgeGroup { Key = "A", Count = 2 }, OgeLoadOptions.JsonOptions);
Check(groupJson.Contains("\"items\":null") && groupJson.Contains("\"count\":2"), $"group JSON {groupJson}");

Console.WriteLine($"{checks - failures}/{checks} checks passed");
return failures == 0 ? 0 : 1;

/// <summary>A row of the contract vectors.</summary>
public sealed record Person
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string? City { get; set; }
    public double? Qty { get; set; }
    public DateTime? At { get; set; }
    public string? Note { get; set; }
}

public enum Kind { Big, Small }

public sealed class Thing
{
    public int Id { get; set; }
    public bool Ok { get; set; }
    public Kind Kind { get; set; }
    public Guid Ref { get; set; }
    public DateTimeOffset When { get; set; }
    public DateOnly Day { get; set; }
    public decimal Price { get; set; }
}

public sealed class PeopleContext : DbContext
{
    public PeopleContext(DbContextOptions<PeopleContext> options) : base(options) { }
    public DbSet<Person> People => Set<Person>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Person>().Property(p => p.Id).ValueGeneratedNever();
        // the contract's folding runs in the database as the oge_fold function
        modelBuilder.HasDbFunction(typeof(OgeText).GetMethod(nameof(OgeText.Fold))!).HasName("oge_fold");
    }
}

public sealed class EfRunner : OgeQueryRunner
{
    public override Task<List<TItem>> ToListAsync<TItem>(IQueryable<TItem> query, CancellationToken cancellationToken) =>
        EntityFrameworkQueryableExtensions.ToListAsync(query, cancellationToken);

    public override Task<int> CountAsync<TItem>(IQueryable<TItem> query, CancellationToken cancellationToken) =>
        EntityFrameworkQueryableExtensions.CountAsync(query, cancellationToken);
}
