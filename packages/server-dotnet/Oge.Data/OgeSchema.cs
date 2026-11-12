using System.Globalization;
using System.Linq.Expressions;
using System.Reflection;
using System.Text;

namespace Oge.Data;

/// <summary>
/// The fields a request may name and the member behind each — the allowlist.
/// Nothing outside it reaches a query.
/// </summary>
public sealed class OgeSchema<T>
{
    private readonly Dictionary<string, OgeSchemaField> _fields = new(StringComparer.Ordinal);

    /// <summary>The key field, appended to every sort so pages are stable.</summary>
    public string? Key { get; private set; }

    /// <summary>The fields by name.</summary>
    public IReadOnlyDictionary<string, OgeSchemaField> Fields => _fields;

    /// <summary>
    /// Every public readable property of <typeparamref name="T"/> whose type is a
    /// scalar (text, number, date, boolean, Guid, enum), named in camelCase as the
    /// grid's JSON names it.
    /// </summary>
    public static OgeSchema<T> FromProperties()
    {
        var schema = new OgeSchema<T>();
        foreach (var property in typeof(T).GetProperties(BindingFlags.Public | BindingFlags.Instance))
        {
            if (!property.CanRead || !IsScalar(property.PropertyType)) continue;
            var parameter = Expression.Parameter(typeof(T), "x");
            var lambda = Expression.Lambda(Expression.Property(parameter, property), parameter);
            schema._fields[CamelCase(property.Name)] = new OgeSchemaField(lambda, null);
        }
        return schema;
    }

    /// <summary>Adds (or replaces) a field.</summary>
    public OgeSchema<T> Field<TValue>(
        string name,
        Expression<Func<T, TValue>> member,
        bool? searchable = null,
        bool filterable = true,
        bool sortable = true)
    {
        _fields[name] = new OgeSchemaField(member, searchable) { Filterable = filterable, Sortable = sortable };
        return this;
    }

    /// <summary>Removes fields a request must never touch.</summary>
    public OgeSchema<T> Without(params string[] names)
    {
        foreach (var name in names) _fields.Remove(name);
        return this;
    }

    /// <summary>Sets the key field.</summary>
    public OgeSchema<T> WithKey(string name)
    {
        Key = name;
        return this;
    }

    internal OgeSchemaField Get(string? name, string use = "select")
    {
        if (name is null || !_fields.TryGetValue(name, out var field))
            throw new OgeServerException($"Unknown field \"{name}\"");
        if (use == "filter" && !field.Filterable)
            throw new OgeServerException($"Field \"{name}\" cannot be filtered");
        if (use == "sort" && !field.Sortable)
            throw new OgeServerException($"Field \"{name}\" cannot be sorted or grouped");
        return field;
    }

    internal static bool IsScalar(Type type)
    {
        var t = Nullable.GetUnderlyingType(type) ?? type;
        return t.IsPrimitive || t.IsEnum || t == typeof(string) || t == typeof(decimal) ||
               t == typeof(DateTime) || t == typeof(DateTimeOffset) || t == typeof(DateOnly) ||
               t == typeof(Guid);
    }

    private static string CamelCase(string name) =>
        name.Length == 0 ? name : char.ToLowerInvariant(name[0]) + name[1..];
}

/// <summary>One field of a schema.</summary>
public sealed class OgeSchemaField
{
    internal OgeSchemaField(LambdaExpression member, bool? searchable)
    {
        Member = member;
        Searchable = searchable ?? member.ReturnType == typeof(string);
    }

    /// <summary>The member expression (<c>x =&gt; x.Name</c>).</summary>
    public LambdaExpression Member { get; }
    /// <summary>The member's type.</summary>
    public Type Type => Member.ReturnType;
    /// <summary>Part of the grid's search box.</summary>
    public bool Searchable { get; }
    /// <summary>May be filtered on.</summary>
    public bool Filterable { get; init; } = true;
    /// <summary>May be sorted and grouped by.</summary>
    public bool Sortable { get; init; } = true;
}

/// <summary>How text compares.</summary>
public enum OgeTextFold
{
    /// <summary>
    /// <c>ToLower()</c> on both sides: Entity Framework translates it to
    /// <c>LOWER()</c>; accents follow the database collation. The default.
    /// </summary>
    ToLower,
    /// <summary>
    /// The filter contract's own folding (<see cref="OgeText.Fold"/>): case,
    /// accents and the Turkish dotted / dotless i. For LINQ to Objects and
    /// providers that can run a .NET method; Entity Framework cannot translate it.
    /// </summary>
    Contract,
    /// <summary>Exact comparison (a case-insensitive collation does the folding).</summary>
    None,
}

/// <summary>Text helpers.</summary>
public static class OgeText
{
    /// <summary>
    /// The suite's folding (<c>foldText</c> in <c>@oge-ui/core</c>): invariant
    /// lower case, combining marks removed, <c>ı</c> mapped to <c>i</c>.
    /// </summary>
    public static string? Fold(string? text)
    {
        if (text is null) return null;
        var lower = text.ToLowerInvariant();
        var ascii = true;
        foreach (var c in lower)
        {
            if (c > 127) { ascii = false; break; }
        }
        if (ascii) return lower;
        // .NET's invariant casing leaves the dotted capital İ alone; once its
        // dot is stripped it is a plain I, so lower each kept character again
        var decomposed = lower.Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(decomposed.Length);
        foreach (var c in decomposed)
        {
            var category = CharUnicodeInfo.GetUnicodeCategory(c);
            if (category is UnicodeCategory.NonSpacingMark or UnicodeCategory.SpacingCombiningMark or UnicodeCategory.EnclosingMark)
                continue;
            builder.Append(c == 'ı' ? 'i' : char.ToLowerInvariant(c));
        }
        return builder.ToString();
    }
}
