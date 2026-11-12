using System.Globalization;
using System.Linq.Expressions;
using System.Reflection;
using System.Text.Json;

namespace Oge.Data;

/// <summary>Bounds and folding for one request.</summary>
public sealed class OgeQueryOptions
{
    /// <summary>How text compares. Default <see cref="OgeTextFold.ToLower"/>.</summary>
    public OgeTextFold Fold { get; init; } = OgeTextFold.ToLower;
    /// <summary>Largest page; a missing <c>take</c> becomes this. Default 1000.</summary>
    public int MaxTake { get; init; } = 1000;
    /// <summary>Deepest filter nesting. Default 16.</summary>
    public int MaxFilterDepth { get; init; } = 16;
    /// <summary>Most nodes in one filter. Default 200.</summary>
    public int MaxFilterNodes { get; init; } = 200;
    /// <summary>Longest <c>in</c> / <c>notin</c> list. Default 1000.</summary>
    public int MaxListLength { get; init; } = 1000;
}

/// <summary>
/// Runs the queries a request needs. The default runs them synchronously; for
/// Entity Framework Core override both with <c>ToListAsync</c> / <c>CountAsync</c>.
/// </summary>
public class OgeQueryRunner
{
    /// <summary>The synchronous runner.</summary>
    public static OgeQueryRunner Sync { get; } = new();

    /// <summary>Materializes a query.</summary>
    public virtual Task<List<TItem>> ToListAsync<TItem>(IQueryable<TItem> query, CancellationToken cancellationToken) =>
        Task.FromResult(query.ToList());

    /// <summary>Counts a query.</summary>
    public virtual Task<int> CountAsync<TItem>(IQueryable<TItem> query, CancellationToken cancellationToken) =>
        Task.FromResult(query.Count());
}

/// <summary>A group row before it is shaped into an <see cref="OgeGroup"/>.</summary>
public sealed class OgeGroupRow
{
    /// <summary>The key.</summary>
    public object? Key { get; set; }
    /// <summary>Rows in the group.</summary>
    public int Count { get; set; }
    /// <summary>The group summaries.</summary>
    public object?[] Summary { get; set; } = Array.Empty<object?>();
}

/// <summary>The date parts a calendar bucket groups by.</summary>
public sealed record OgeDateKey
{
    /// <summary>The year, or null for a null date.</summary>
    public int? Year { get; set; }
    /// <summary>The month (the quarter's first month for quarters), or null.</summary>
    public int? Month { get; set; }
    /// <summary>The day, or null.</summary>
    public int? Day { get; set; }
    /// <summary>The hour, or null.</summary>
    public int? Hour { get; set; }

    /// <summary>The bucket's first instant; null for the null-date group.</summary>
    public static DateTime? ToDate(int? year, int? month, int? day, int? hour) =>
        year is null ? null : new DateTime(year.Value, month ?? 1, day ?? 1, hour ?? 0, 0, 0);
}

/// <summary>Applies OGE grid requests to an <see cref="IQueryable{T}"/>.</summary>
public static class OgeQueryable
{
    /// <summary>The request's filter and search, checked against the schema.</summary>
    public static IQueryable<T> ApplyOgeFilter<T>(
        this IQueryable<T> source, OgeLoadOptions options, OgeSchema<T> schema, OgeQueryOptions? settings = null)
    {
        var builder = new Builder<T>(schema, settings ?? new OgeQueryOptions());
        var predicate = builder.Where(options.Filter, options.SearchText);
        return predicate is null ? source : source.Where(predicate);
    }

    /// <summary>The request's sort, with the schema key as tie-breaker.</summary>
    public static IQueryable<T> ApplyOgeSort<T>(
        this IQueryable<T> source, IEnumerable<OgeSortDescriptor>? sort, OgeSchema<T> schema)
    {
        var keys = (sort ?? Enumerable.Empty<OgeSortDescriptor>()).ToList();
        IOrderedQueryable<T>? ordered = null;
        foreach (var s in keys)
            ordered = Order(ordered ?? source, schema.Get(s.Field, "sort").Member, Desc(s.Dir), ordered is not null);
        if (schema.Key is { } key && keys.All(s => s.Field != key))
            ordered = Order(ordered ?? source, schema.Get(key).Member, false, ordered is not null);
        return ordered ?? source;
    }

    /// <summary>Answers a request synchronously.</summary>
    public static OgeLoadResult OgeLoad<T>(
        this IQueryable<T> source, OgeLoadOptions options, OgeSchema<T> schema, OgeQueryOptions? settings = null) =>
        source.OgeLoadAsync(options, schema, OgeQueryRunner.Sync, settings).GetAwaiter().GetResult();

    /// <summary>
    /// Answers a request: the page of rows (or of first-level groups), the total
    /// count when asked for (always with grouping) and the total summaries.
    /// </summary>
    public static async Task<OgeLoadResult> OgeLoadAsync<T>(
        this IQueryable<T> source,
        OgeLoadOptions options,
        OgeSchema<T> schema,
        OgeQueryRunner runner,
        OgeQueryOptions? settings = null,
        CancellationToken cancellationToken = default)
    {
        settings ??= new OgeQueryOptions();
        var take = options.Take ?? settings.MaxTake;
        if (take < 0 || take > settings.MaxTake)
            throw new OgeServerException($"\"take\" may be at most {settings.MaxTake}");
        var skip = options.Skip ?? 0;
        if (skip < 0) throw new OgeServerException("\"skip\" must be at least 0");

        var filtered = source.ApplyOgeFilter(options, schema, settings);
        var builder = new Builder<T>(schema, settings);
        var grouped = options.Group is { Count: > 0 };
        int? total = options.RequireTotalCount == true || grouped
            ? await runner.CountAsync(filtered, cancellationToken)
            : null;
        IReadOnlyList<object?>? summary = null;
        if (options.TotalSummary is { Count: > 0 } totals)
        {
            var row = await runner.ToListAsync(
                filtered.GroupBy(_ => 1).Select(builder.SummaryProjection(totals)), cancellationToken);
            summary = row.Count > 0 ? row[0] : totals.Select(_ => (object?)null).ToArray();
        }

        if (grouped)
        {
            var group = options.Group![0];
            var rows = builder.Groups(filtered, group, options.GroupSummary ?? new List<OgeSummaryDescriptor>());
            int? groupCount = options.RequireGroupCount == true
                ? await runner.CountAsync(rows, cancellationToken)
                : null;
            var page = await runner.ToListAsync(rows.Skip(skip).Take(take), cancellationToken);
            return new OgeLoadResult
            {
                Data = page.Select(g => (object?)new OgeGroup { Key = g.Key, Count = g.Count, Summary = g.Summary }).ToList(),
                TotalCount = total,
                GroupCount = groupCount,
                Summary = summary,
            };
        }

        var data = await runner.ToListAsync(
            filtered.ApplyOgeSort(options.Sort, schema).Skip(skip).Take(take), cancellationToken);
        return new OgeLoadResult { Data = data.Cast<object?>().ToList(), TotalCount = total, Summary = summary };
    }

    /// <summary>The distinct values of a field for a header filter list.</summary>
    public static async Task<IReadOnlyList<object?>> OgeDistinctAsync<T>(
        this IQueryable<T> source,
        string field,
        OgeSchema<T> schema,
        OgeFilterExpr? filter = null,
        string? searchText = null,
        string? search = null,
        int take = 1000,
        OgeQueryRunner? runner = null,
        OgeQueryOptions? settings = null,
        CancellationToken cancellationToken = default)
    {
        settings ??= new OgeQueryOptions();
        var builder = new Builder<T>(schema, settings);
        var member = schema.Get(field, "filter");
        var query = source.ApplyOgeFilter(new OgeLoadOptions { Filter = filter, SearchText = searchText }, schema, settings);
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(builder.Contains(member, search.Trim()));
        var values = builder.DistinctValues(query, member);
        var list = await (runner ?? OgeQueryRunner.Sync).ToListAsync(values.Take(Math.Min(take, settings.MaxTake)), cancellationToken);
        return list;
    }

    private static bool Desc(string? dir) => dir switch
    {
        null or "asc" => false,
        "desc" => true,
        _ => throw new OgeServerException("\"dir\" must be \"asc\" or \"desc\""),
    };

    private static IOrderedQueryable<T> Order<T>(IQueryable<T> source, LambdaExpression key, bool desc, bool then)
    {
        var name = (then ? "ThenBy" : "OrderBy") + (desc ? "Descending" : "");
        var method = typeof(Queryable).GetMethods()
            .Single(m => m.Name == name && m.GetParameters().Length == 2)
            .MakeGenericMethod(typeof(T), key.ReturnType);
        return (IOrderedQueryable<T>)method.Invoke(null, new object[] { source, key })!;
    }

    private sealed class Builder<T>
    {
        private readonly OgeSchema<T> _schema;
        private readonly OgeQueryOptions _settings;
        private readonly ParameterExpression _x = Expression.Parameter(typeof(T), "x");
        private int _nodes;

        public Builder(OgeSchema<T> schema, OgeQueryOptions settings)
        {
            _schema = schema;
            _settings = settings;
        }

        private Expression Member(OgeSchemaField field) =>
            new Rebind(field.Member.Parameters[0], _x).Visit(field.Member.Body)!;

        public Expression<Func<T, bool>>? Where(OgeFilterExpr? filter, string? searchText)
        {
            var parts = new List<Expression>();
            if (filter is not null) parts.Add(Filter(filter, 1));
            if (!string.IsNullOrWhiteSpace(searchText)) parts.Add(Search(searchText.Trim()));
            if (parts.Count == 0) return null;
            return Expression.Lambda<Func<T, bool>>(parts.Aggregate(Expression.AndAlso), _x);
        }

        public Expression<Func<T, bool>> Contains(OgeSchemaField field, string text) =>
            Expression.Lambda<Func<T, bool>>(TextOp(Member(field), "Contains", text), _x);

        private Expression Search(string text)
        {
            var fields = _schema.Fields.Values.Where(f => f.Searchable && f.Type == typeof(string)).ToList();
            if (fields.Count == 0) return Expression.Constant(false);
            return fields.Select(f => TextOp(Member(f), "Contains", text)).Aggregate(Expression.OrElse);
        }

        private Expression Filter(OgeFilterExpr expr, int depth)
        {
            if (depth > _settings.MaxFilterDepth) throw new OgeServerException("The filter is nested too deeply");
            if (++_nodes > _settings.MaxFilterNodes) throw new OgeServerException("The filter has too many conditions");
            switch (expr.Type)
            {
                case "and":
                case "or":
                    var operands = (expr.Operands ?? new List<OgeFilterExpr>()).Select(o => Filter(o, depth + 1)).ToList();
                    if (operands.Count == 0) return Expression.Constant(expr.Type == "and");
                    return operands.Aggregate(expr.Type == "and" ? Expression.AndAlso : Expression.OrElse);
                case "not":
                    if (expr.Operand is null) throw new OgeServerException("\"not\" needs an operand");
                    return Expression.Not(Filter(expr.Operand, depth + 1));
                case "binary":
                    return Leaf(expr);
                default:
                    throw new OgeServerException("A filter type must be binary, and, or or not");
            }
        }

        private static bool CanBeNull(Type type) => !type.IsValueType || Nullable.GetUnderlyingType(type) is not null;

        private static Expression NotNull(Expression member) =>
            CanBeNull(member.Type) ? Expression.NotEqual(member, Expression.Constant(null, member.Type)) : Expression.Constant(true);

        private static Expression IsNull(Expression member) =>
            CanBeNull(member.Type) ? Expression.Equal(member, Expression.Constant(null, member.Type)) : Expression.Constant(false);

        private Expression Fold(Expression text) => _settings.Fold switch
        {
            OgeTextFold.ToLower => Expression.Call(text, typeof(string).GetMethod(nameof(string.ToLower), Type.EmptyTypes)!),
            OgeTextFold.Contract => Expression.Call(typeof(OgeText).GetMethod(nameof(OgeText.Fold))!, text),
            _ => text,
        };

        private string FoldValue(string text) => _settings.Fold switch
        {
            OgeTextFold.ToLower => text.ToLowerInvariant(),
            OgeTextFold.Contract => OgeText.Fold(text)!,
            _ => text,
        };

        /// <summary>A value as a query parameter (a closure field, so EF parameterizes it).</summary>
        private static Expression Param(object? value, Type type)
        {
            var holder = Activator.CreateInstance(typeof(Holder<>).MakeGenericType(type), value)!;
            return Expression.Property(Expression.Constant(holder), "Value");
        }

        private Expression TextOp(Expression member, string method, string text)
        {
            if (member.Type != typeof(string)) throw new OgeServerException($"\"{method.ToLowerInvariant()}\" needs a text field");
            var call = Expression.Call(Fold(member), typeof(string).GetMethod(method, new[] { typeof(string) })!,
                Param(FoldValue(text), typeof(string)));
            return Expression.AndAlso(NotNull(member), call);
        }

        private Expression Leaf(OgeFilterExpr expr)
        {
            var field = _schema.Get(expr.Field, "filter");
            var member = Member(field);
            var isText = member.Type == typeof(string);
            var lhs = isText ? Fold(member) : member;
            Expression Value(JsonElement element) =>
                isText ? Param(FoldValue(Convert<string>(element)), typeof(string)) : Param(ConvertTo(element, member.Type), member.Type);
            Expression Compare(ExpressionType type, JsonElement element)
            {
                var rhs = Value(element);
                if (!isText) return Expression.MakeBinary(type, lhs, rhs);
                var compare = Expression.Call(typeof(string).GetMethod(nameof(string.Compare), new[] { typeof(string), typeof(string) })!, lhs, rhs);
                return Expression.MakeBinary(type, compare, Expression.Constant(0));
            }
            var value = expr.Value;
            bool IsNullValue(JsonElement? v) => v is null || v.Value.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined;
            switch (expr.Op)
            {
                case "eq":
                    return IsNullValue(value) ? IsNull(member) : Expression.AndAlso(NotNull(member), Compare(ExpressionType.Equal, value!.Value));
                case "ne":
                    return IsNullValue(value) ? NotNull(member) : Expression.OrElse(IsNull(member), Compare(ExpressionType.NotEqual, value!.Value));
                case "gt":
                case "ge":
                case "lt":
                case "le":
                    if (IsNullValue(value)) return Expression.Constant(false);
                    var type = expr.Op switch
                    {
                        "gt" => ExpressionType.GreaterThan,
                        "ge" => ExpressionType.GreaterThanOrEqual,
                        "lt" => ExpressionType.LessThan,
                        _ => ExpressionType.LessThanOrEqual,
                    };
                    return Expression.AndAlso(NotNull(member), Compare(type, value!.Value));
                case "contains":
                    return TextOp(member, "Contains", Convert<string>(value));
                case "notcontains":
                    return Expression.Not(TextOp(member, "Contains", Convert<string>(value)));
                case "startswith":
                    return TextOp(member, "StartsWith", Convert<string>(value));
                case "endswith":
                    return TextOp(member, "EndsWith", Convert<string>(value));
                case "in":
                case "notin":
                {
                    var items = List(value);
                    var withNull = items.Any(i => i.ValueKind == JsonValueKind.Null);
                    var real = items.Where(i => i.ValueKind != JsonValueKind.Null).ToList();
                    Expression inList = Expression.Constant(false);
                    if (real.Count > 0)
                    {
                        var elementType = isText ? typeof(string) : member.Type;
                        var listType = typeof(List<>).MakeGenericType(elementType);
                        var list = (System.Collections.IList)Activator.CreateInstance(listType)!;
                        foreach (var item in real)
                            list.Add(isText ? FoldValue(Convert<string>(item)) : ConvertTo(item, member.Type));
                        var contains = typeof(Enumerable).GetMethods()
                            .Single(m => m.Name == nameof(Enumerable.Contains) && m.GetParameters().Length == 2)
                            .MakeGenericMethod(elementType);
                        inList = Expression.AndAlso(NotNull(member), Expression.Call(contains, Param(list, listType), lhs));
                    }
                    if (expr.Op == "in") return withNull ? Expression.OrElse(IsNull(member), inList) : inList;
                    return withNull
                        ? Expression.AndAlso(NotNull(member), Expression.Not(inList))
                        : Expression.OrElse(IsNull(member), Expression.Not(inList));
                }
                case "between":
                {
                    var range = List(value);
                    if (range.Count != 2) throw new OgeServerException("\"between\" needs a [from, to] pair");
                    Expression result = NotNull(member);
                    if (range[0].ValueKind != JsonValueKind.Null)
                        result = Expression.AndAlso(result, Compare(ExpressionType.GreaterThanOrEqual, range[0]));
                    if (range[1].ValueKind != JsonValueKind.Null)
                        result = Expression.AndAlso(result, Compare(ExpressionType.LessThanOrEqual, range[1]));
                    return result;
                }
                case "isnull":
                    return IsNull(member);
                case "isnotnull":
                    return NotNull(member);
                case "isblank":
                    return isText
                        ? Expression.OrElse(IsNull(member), Expression.Equal(Trim(member), Expression.Constant("")))
                        : IsNull(member);
                case "isnotblank":
                    return isText
                        ? Expression.AndAlso(NotNull(member), Expression.NotEqual(Trim(member), Expression.Constant("")))
                        : NotNull(member);
                default:
                    throw new OgeServerException($"Unknown filter operator \"{expr.Op}\"");
            }
        }

        private static Expression Trim(Expression member) =>
            Expression.Call(member, typeof(string).GetMethod(nameof(string.Trim), Type.EmptyTypes)!);

        private List<JsonElement> List(JsonElement? value)
        {
            if (value is null || value.Value.ValueKind != JsonValueKind.Array)
                throw new OgeServerException("This operator needs a list value");
            var items = value.Value.EnumerateArray().ToList();
            if (items.Count > _settings.MaxListLength) throw new OgeServerException("The filter list is too long");
            return items;
        }

        private static TValue Convert<TValue>(JsonElement? element) =>
            (TValue)ConvertTo(element ?? default, typeof(TValue))!;

        private static object? ConvertTo(JsonElement element, Type type)
        {
            var target = Nullable.GetUnderlyingType(type) ?? type;
            try
            {
                if (element.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined) return null;
                if (target == typeof(string))
                    return element.ValueKind == JsonValueKind.String ? element.GetString() : element.GetRawText();
                if (target == typeof(bool))
                    return element.ValueKind switch
                    {
                        JsonValueKind.True => true,
                        JsonValueKind.False => false,
                        _ => bool.Parse(element.GetString()!),
                    };
                if (target == typeof(DateTime))
                    return DateTime.Parse(element.GetString()!, CultureInfo.InvariantCulture,
                        DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal);
                if (target == typeof(DateTimeOffset))
                    return DateTimeOffset.Parse(element.GetString()!, CultureInfo.InvariantCulture);
                if (target == typeof(DateOnly))
                    return DateOnly.FromDateTime(DateTime.Parse(element.GetString()!, CultureInfo.InvariantCulture));
                if (target == typeof(Guid)) return Guid.Parse(element.GetString()!);
                if (target.IsEnum)
                    return element.ValueKind == JsonValueKind.String
                        ? Enum.Parse(target, element.GetString()!, ignoreCase: true)
                        : Enum.ToObject(target, element.GetInt64());
                var number = element.ValueKind == JsonValueKind.String
                    ? decimal.Parse(element.GetString()!, CultureInfo.InvariantCulture)
                    : element.GetDecimal();
                return System.Convert.ChangeType(number, target, CultureInfo.InvariantCulture);
            }
            catch (Exception error) when (error is FormatException or InvalidOperationException or OverflowException or ArgumentException)
            {
                throw new OgeServerException($"{element.GetRawText()} is not a valid {target.Name}", error);
            }
        }

        public Expression<Func<IGrouping<int, T>, object?[]>> SummaryProjection(IReadOnlyList<OgeSummaryDescriptor> summaries)
        {
            var g = Expression.Parameter(typeof(IGrouping<int, T>), "g");
            return Expression.Lambda<Func<IGrouping<int, T>, object?[]>>(
                Expression.NewArrayInit(typeof(object), summaries.Select(s => Expression.Convert(Aggregate(g, s), typeof(object)))), g);
        }

        private Expression Aggregate(ParameterExpression group, OgeSummaryDescriptor summary)
        {
            var field = _schema.Get(summary.Field);
            var member = Member(field);
            var elementType = group.Type.GetGenericArguments()[1];
            if (summary.Type == "count")
            {
                var countMethod = typeof(Enumerable).GetMethods()
                    .Single(m => m.Name == nameof(Enumerable.Count) && m.GetParameters().Length == 2)
                    .MakeGenericMethod(elementType);
                return Expression.Call(countMethod, group, Expression.Lambda(NotNull(member), _x));
            }
            var name = summary.Type switch
            {
                "sum" => nameof(Enumerable.Sum),
                "avg" => nameof(Enumerable.Average),
                "min" => nameof(Enumerable.Min),
                "max" => nameof(Enumerable.Max),
                _ => throw new OgeServerException($"Summary type \"{summary.Type}\" is not supported"),
            };
            var underlying = Nullable.GetUnderlyingType(field.Type) ?? field.Type;
            if (!IsNumber(underlying))
                throw new OgeServerException($"\"{summary.Type}\" needs a number field");
            // as double? so empty groups give null and every numeric type shares one overload
            var selector = Expression.Lambda(Expression.Convert(member, typeof(double?)), _x);
            var method = typeof(Enumerable).GetMethods()
                .Single(m => m.Name == name && m.IsGenericMethodDefinition && m.GetParameters().Length == 2 &&
                             m.GetParameters()[1].ParameterType.GetGenericArguments().Last() == typeof(double?))
                .MakeGenericMethod(elementType);
            return Expression.Call(method, group, selector);
        }

        private static bool IsNumber(Type type) =>
            type == typeof(int) || type == typeof(long) || type == typeof(short) || type == typeof(byte) ||
            type == typeof(double) || type == typeof(float) || type == typeof(decimal);

        public IQueryable<OgeGroupRow> Groups(IQueryable<T> source, OgeGroupDescriptor group, IReadOnlyList<OgeSummaryDescriptor> summaries)
        {
            var field = _schema.Get(group.Field, "sort");
            var member = Member(field);
            var calendar = group.Interval is { ValueKind: JsonValueKind.String } interval
                ? interval.GetString()
                : null;
            // A calendar bucket groups by its date parts (year, month, …): every
            // provider translates those, while few translate `new DateTime(…)`.
            // The date is put back together in the final projection.
            var key = calendar is null ? Bucket(member, group.Interval) : DateParts(member, calendar);
            var keyLambda = Expression.Lambda(key, _x);
            var groupBy = typeof(Queryable).GetMethods()
                .Single(m => m.Name == nameof(Queryable.GroupBy) && m.GetParameters().Length == 2)
                .MakeGenericMethod(typeof(T), key.Type);
            IQueryable grouped = (IQueryable)groupBy.Invoke(null, new object[] { source, keyLambda })!;
            var g = Expression.Parameter(typeof(IGrouping<,>).MakeGenericType(key.Type, typeof(T)), "g");
            var groupKey = Expression.Property(g, "Key");
            var desc = Desc(group.Dir);
            var sortKeys = calendar is null
                ? new Expression[] { groupKey }
                : new[] { "Year", "Month", "Day", "Hour" }.Select(p => (Expression)Expression.Property(groupKey, p)).ToArray();
            for (var i = 0; i < sortKeys.Length; i++)
            {
                var name = (i == 0 ? "OrderBy" : "ThenBy") + (desc ? "Descending" : "");
                var method = typeof(Queryable).GetMethods()
                    .Single(m => m.Name == name && m.GetParameters().Length == 2)
                    .MakeGenericMethod(g.Type, sortKeys[i].Type);
                grouped = (IQueryable)method.Invoke(null, new object[] { grouped, Expression.Lambda(sortKeys[i], g) })!;
            }
            var count = Expression.Call(typeof(Enumerable).GetMethods()
                .Single(m => m.Name == nameof(Enumerable.Count) && m.GetParameters().Length == 1)
                .MakeGenericMethod(typeof(T)), g);
            Expression keyValue = calendar is null ? groupKey : DateFromParts(groupKey);
            var body = Expression.MemberInit(
                Expression.New(typeof(OgeGroupRow)),
                Expression.Bind(typeof(OgeGroupRow).GetProperty(nameof(OgeGroupRow.Key))!, Expression.Convert(keyValue, typeof(object))),
                Expression.Bind(typeof(OgeGroupRow).GetProperty(nameof(OgeGroupRow.Count))!, count),
                Expression.Bind(typeof(OgeGroupRow).GetProperty(nameof(OgeGroupRow.Summary))!,
                    Expression.NewArrayInit(typeof(object), summaries.Select(s => Expression.Convert(Aggregate(g, s), typeof(object))))));
            var select = typeof(Queryable).GetMethods()
                .First(m => m.Name == nameof(Queryable.Select) && m.GetParameters()[1].ParameterType.GetGenericArguments()[0].GetGenericArguments().Length == 2)
                .MakeGenericMethod(g.Type, typeof(OgeGroupRow));
            return (IQueryable<OgeGroupRow>)select.Invoke(null, new object[] { grouped, Expression.Lambda(body, g) })!;
        }

        /// <summary>The date parts of a calendar bucket as an <see cref="OgeDateKey"/>.</summary>
        private static Expression DateParts(Expression member, string? unit)
        {
            var underlying = Nullable.GetUnderlyingType(member.Type) ?? member.Type;
            if (underlying != typeof(DateTime))
                throw new OgeServerException("A calendar interval groups DateTime fields only");
            var nullable = Nullable.GetUnderlyingType(member.Type) is not null;
            var value = nullable ? Expression.Property(member, "Value") : member;
            Expression Part(string name) => Expression.Property(value, name);
            Expression? year = Part("Year"), month = null, day = null, hour = null;
            var one = Expression.Constant(1);
            switch (unit)
            {
                case "hour":
                    month = Part("Month"); day = Part("Day"); hour = Part("Hour");
                    break;
                case "day":
                    month = Part("Month"); day = Part("Day");
                    break;
                case "month":
                    month = Part("Month");
                    break;
                case "quarter":
                    month = Expression.Add(Expression.Multiply(
                        Expression.Divide(Expression.Subtract(Part("Month"), one), Expression.Constant(3)),
                        Expression.Constant(3)), one);
                    break;
                case "year":
                    break;
                case "week":
                    throw new OgeServerException("Week buckets depend on the reader’s first day of the week; group by day instead");
                default:
                    throw new OgeServerException($"Unknown group interval \"{unit}\"");
            }
            Expression Wrap(Expression? part)
            {
                if (part is null) return Expression.Constant(null, typeof(int?));
                var asNullable = Expression.Convert(part, typeof(int?));
                return nullable
                    ? Expression.Condition(Expression.Equal(member, Expression.Constant(null, member.Type)),
                        Expression.Constant(null, typeof(int?)), asNullable)
                    : asNullable;
            }
            return Expression.MemberInit(
                Expression.New(typeof(OgeDateKey)),
                Expression.Bind(typeof(OgeDateKey).GetProperty(nameof(OgeDateKey.Year))!, Wrap(year)),
                Expression.Bind(typeof(OgeDateKey).GetProperty(nameof(OgeDateKey.Month))!, Wrap(month)),
                Expression.Bind(typeof(OgeDateKey).GetProperty(nameof(OgeDateKey.Day))!, Wrap(day)),
                Expression.Bind(typeof(OgeDateKey).GetProperty(nameof(OgeDateKey.Hour))!, Wrap(hour)));
        }

        private static Expression DateFromParts(Expression key) =>
            Expression.Call(typeof(OgeDateKey).GetMethod(nameof(OgeDateKey.ToDate))!,
                Expression.Property(key, nameof(OgeDateKey.Year)),
                Expression.Property(key, nameof(OgeDateKey.Month)),
                Expression.Property(key, nameof(OgeDateKey.Day)),
                Expression.Property(key, nameof(OgeDateKey.Hour)));

        /// <summary>A number bucket (<c>floor(x / width) * width</c>), or the member itself.</summary>
        private static Expression Bucket(Expression member, JsonElement? interval)
        {
            if (interval is null || interval.Value.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined) return member;
            if (interval.Value.ValueKind != JsonValueKind.Number)
                throw new OgeServerException("A group interval is a calendar unit or a positive number");
            var underlying = Nullable.GetUnderlyingType(member.Type) ?? member.Type;
            var nullable = Nullable.GetUnderlyingType(member.Type) is not null;
            var value = nullable ? Expression.Property(member, "Value") : member;
            var width = interval.Value.GetDouble();
            if (!(width > 0) || double.IsInfinity(width)) throw new OgeServerException("A bucket width must be positive");
            if (!IsNumber(underlying)) throw new OgeServerException("A number interval groups number fields only");
            var floor = typeof(Math).GetMethod(nameof(Math.Floor), new[] { typeof(double) })!;
            var bucket = Expression.Multiply(
                Expression.Call(floor, Expression.Divide(Expression.Convert(value, typeof(double)), Param(width, typeof(double)))),
                Param(width, typeof(double)));
            if (!nullable) return bucket;
            return Expression.Condition(
                Expression.Equal(member, Expression.Constant(null, member.Type)),
                Expression.Constant(null, typeof(double?)),
                Expression.Convert(bucket, typeof(double?)));
        }

        public IQueryable<object?> DistinctValues(IQueryable<T> source, OgeSchemaField field)
        {
            var member = Member(field);
            var select = typeof(Queryable).GetMethods()
                .First(m => m.Name == nameof(Queryable.Select) && m.GetParameters()[1].ParameterType.GetGenericArguments()[0].GetGenericArguments().Length == 2)
                .MakeGenericMethod(typeof(T), member.Type);
            var values = (IQueryable)select.Invoke(null, new object[] { source, Expression.Lambda(member, _x) })!;
            var distinct = typeof(Queryable).GetMethods()
                .Single(m => m.Name == nameof(Queryable.Distinct) && m.GetParameters().Length == 1)
                .MakeGenericMethod(member.Type);
            var p = Expression.Parameter(member.Type, "v");
            var ordered = typeof(Queryable).GetMethods()
                .Single(m => m.Name == nameof(Queryable.OrderBy) && m.GetParameters().Length == 2)
                .MakeGenericMethod(member.Type, member.Type);
            var distinctValues = (IQueryable)distinct.Invoke(null, new object[] { values })!;
            var sorted = (IQueryable)ordered.Invoke(null, new object[] { distinctValues, Expression.Lambda(p, p) })!;
            var box = typeof(Queryable).GetMethods()
                .First(m => m.Name == nameof(Queryable.Select) && m.GetParameters()[1].ParameterType.GetGenericArguments()[0].GetGenericArguments().Length == 2)
                .MakeGenericMethod(member.Type, typeof(object));
            return (IQueryable<object?>)box.Invoke(null, new object[] { sorted, Expression.Lambda(Expression.Convert(p, typeof(object)), p) })!;
        }
    }

    private sealed class Holder<TValue>
    {
        public Holder(TValue value) => Value = value;
        public TValue Value { get; }
    }

    private sealed class Rebind : ExpressionVisitor
    {
        private readonly ParameterExpression _from;
        private readonly ParameterExpression _to;
        public Rebind(ParameterExpression from, ParameterExpression to) { _from = from; _to = to; }
        protected override Expression VisitParameter(ParameterExpression node) => node == _from ? _to : node;
    }
}
