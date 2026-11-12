using System.Text.Json;
using System.Text.Json.Serialization;

namespace Oge.Data;

/// <summary>
/// The request an OGE grid sends (<c>LoadOptions</c> in <c>@oge-ui/core</c>),
/// as System.Text.Json reads it from the request body.
/// </summary>
public sealed class OgeLoadOptions
{
    /// <summary>Rows to skip.</summary>
    public int? Skip { get; set; }
    /// <summary>Rows to return.</summary>
    public int? Take { get; set; }
    /// <summary>Sort order, first key first.</summary>
    public List<OgeSortDescriptor>? Sort { get; set; }
    /// <summary>The filter tree, or null.</summary>
    public OgeFilterExpr? Filter { get; set; }
    /// <summary>Grouping, first level first.</summary>
    public List<OgeGroupDescriptor>? Group { get; set; }
    /// <summary>Summaries per group.</summary>
    public List<OgeSummaryDescriptor>? GroupSummary { get; set; }
    /// <summary>Summaries over every matching row.</summary>
    public List<OgeSummaryDescriptor>? TotalSummary { get; set; }
    /// <summary>Whether to count the matching rows.</summary>
    public bool? RequireTotalCount { get; set; }
    /// <summary>Whether to count the groups.</summary>
    public bool? RequireGroupCount { get; set; }
    /// <summary>The grid's search box text.</summary>
    public string? SearchText { get; set; }

    /// <summary>JSON options matching the grid's camelCase payload.</summary>
    public static JsonSerializerOptions JsonOptions { get; } = new(JsonSerializerDefaults.Web);

    /// <summary>Reads a request body.</summary>
    public static OgeLoadOptions Parse(string json)
    {
        try
        {
            return JsonSerializer.Deserialize<OgeLoadOptions>(json, JsonOptions) ?? new OgeLoadOptions();
        }
        catch (JsonException error)
        {
            throw new OgeServerException("The load options are not valid JSON", error);
        }
    }
}

/// <summary>One sort key.</summary>
public sealed class OgeSortDescriptor
{
    /// <summary>The field name.</summary>
    public string Field { get; set; } = "";
    /// <summary><c>asc</c> or <c>desc</c>.</summary>
    public string? Dir { get; set; }
}

/// <summary>One grouping level.</summary>
public sealed class OgeGroupDescriptor
{
    /// <summary>The field name.</summary>
    public string Field { get; set; } = "";
    /// <summary><c>asc</c> or <c>desc</c>.</summary>
    public string? Dir { get; set; }
    /// <summary>A calendar unit (<c>hour</c>, <c>day</c>, <c>month</c>, <c>quarter</c>, <c>year</c>) or a bucket width.</summary>
    public JsonElement? Interval { get; set; }
}

/// <summary>One summary.</summary>
public sealed class OgeSummaryDescriptor
{
    /// <summary>The field name.</summary>
    public string Field { get; set; } = "";
    /// <summary><c>sum</c>, <c>avg</c>, <c>min</c>, <c>max</c> or <c>count</c>.</summary>
    public string Type { get; set; } = "";
}

/// <summary>A node of the filter tree.</summary>
public sealed class OgeFilterExpr
{
    /// <summary><c>binary</c>, <c>and</c>, <c>or</c> or <c>not</c>.</summary>
    public string Type { get; set; } = "";
    /// <summary>The field of a binary condition.</summary>
    public string? Field { get; set; }
    /// <summary>The operator of a binary condition (the filter contract's names).</summary>
    public string? Op { get; set; }
    /// <summary>The value: a scalar, or a list for <c>in</c>, <c>notin</c> and <c>between</c>.</summary>
    public JsonElement? Value { get; set; }
    /// <summary>The children of <c>and</c> / <c>or</c>.</summary>
    public List<OgeFilterExpr>? Operands { get; set; }
    /// <summary>The child of <c>not</c>.</summary>
    public OgeFilterExpr? Operand { get; set; }
}

/// <summary>A group of the first level.</summary>
public sealed class OgeGroup
{
    /// <summary>The group key.</summary>
    public object? Key { get; init; }
    /// <summary>Always null: the grid asks for an expanded group's rows itself.</summary>
    [JsonPropertyName("items")]
    public object? Items => null;
    /// <summary>Rows in the group.</summary>
    public int Count { get; init; }
    /// <summary>The group summaries, in request order.</summary>
    public IReadOnlyList<object?> Summary { get; init; } = Array.Empty<object?>();
}

/// <summary>What the grid expects back (<c>LoadResult</c> in <c>@oge-ui/core</c>).</summary>
public sealed class OgeLoadResult
{
    /// <summary>The page of rows, or of <see cref="OgeGroup"/>s.</summary>
    public IReadOnlyList<object?> Data { get; init; } = Array.Empty<object?>();
    /// <summary>Matching rows, when asked for (always with grouping).</summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public int? TotalCount { get; init; }
    /// <summary>Groups, when asked for.</summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public int? GroupCount { get; init; }
    /// <summary>The total summaries, in request order.</summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public IReadOnlyList<object?>? Summary { get; init; }
}

/// <summary>A request the schema or the limits refuse: answer it with 400.</summary>
public sealed class OgeServerException : Exception
{
    /// <summary>Creates the error.</summary>
    public OgeServerException(string message, Exception? inner = null) : base(message, inner) { }
}
