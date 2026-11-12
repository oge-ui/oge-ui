/**
 * `LoadOptions` → parameterized SQL for PostgreSQL, MySQL / MariaDB, SQLite
 * and SQL Server, following the published filter contract
 * (`/guides/filter-contract`): every leaf is two-valued (a null cell makes it
 * false, never unknown), so `not` is a true complement, and text compares
 * folded. Values always travel as parameters; identifiers come only from the
 * schema.
 */
import type {
  FilterExpr,
  GroupDescriptor,
  GroupInterval,
  LoadOptions,
  SortDescriptor,
  SummaryDescriptor,
} from '@oge-ui/core';
import {
  OgeServerError,
  ogeSchemaField,
  type OgeServerField,
  type OgeServerSchema,
} from './schema';

/** How one database spells what the builder needs. */
export interface OgeSqlDialect {
  readonly name: string;
  /** A quoted identifier (`"name"`, `` `name` ``, `[name]`). */
  quote(identifier: string): string;
  /** The placeholder of the parameter at 1-based `index` (`$1`, `?`, `@p1`). */
  placeholder(index: number): string;
  /** Text folded for comparison (case, and accents where the database can). */
  fold(sql: string): string;
  /** `TRIM` for the blank checks. */
  trim(sql: string): string;
  /** `LIMIT … OFFSET …` or `OFFSET … FETCH …`, given parameter placeholders. */
  paging(limit: string, offset: string): string;
  /** A date truncated to a calendar unit, for grouping. */
  dateBucket(sql: string, unit: Exclude<GroupInterval, number>): string;
}

const identifier = (open: string, close: string) => (name: string) =>
  name
    .split('.')
    .map((part) => open + part.split(close).join(close + close) + close)
    .join('.');

/**
 * PostgreSQL. Text folds with `lower()`; pass `unaccent: true` when the
 * `unaccent` extension is installed to fold accents too.
 */
export function ogePostgresDialect(
  options: { readonly unaccent?: boolean } = {},
): OgeSqlDialect {
  return {
    name: 'postgres',
    quote: identifier('"', '"'),
    placeholder: (i) => `$${i}`,
    fold: (sql) =>
      options.unaccent ? `lower(unaccent(${sql}))` : `lower(${sql})`,
    trim: (sql) => `trim(${sql})`,
    paging: (limit, offset) => `LIMIT ${limit} OFFSET ${offset}`,
    dateBucket: (sql, unit) => {
      if (unit === 'week') throw weekUnsupported();
      return `date_trunc('${unit}', ${sql})`;
    },
  };
}

/** MySQL / MariaDB. Their default `_ai_ci` collations already fold case and accents. */
export function ogeMysqlDialect(): OgeSqlDialect {
  return {
    name: 'mysql',
    quote: identifier('`', '`'),
    placeholder: () => '?',
    fold: (sql) => `lower(${sql})`,
    trim: (sql) => `trim(${sql})`,
    paging: (limit, offset) => `LIMIT ${limit} OFFSET ${offset}`,
    dateBucket: (sql, unit) => {
      switch (unit) {
        case 'hour':
          return `DATE_FORMAT(${sql}, '%Y-%m-%d %H:00:00')`;
        case 'day':
          return `DATE(${sql})`;
        case 'month':
          return `DATE_FORMAT(${sql}, '%Y-%m-01')`;
        case 'quarter':
          return `MAKEDATE(YEAR(${sql}), 1) + INTERVAL (QUARTER(${sql}) - 1) QUARTER`;
        case 'year':
          return `DATE_FORMAT(${sql}, '%Y-01-01')`;
        default:
          throw weekUnsupported();
      }
    },
  };
}

/**
 * SQLite. Its `lower()` folds ASCII only, so text folds through a function
 * you register once — `db.function('oge_fold', ogeFoldText)` — which runs
 * the suite's own folding. Pass `foldFunction: null` to fall back to
 * `lower()`. Dates are expected as ISO text for grouping.
 */
export function ogeSqliteDialect(
  options: { readonly foldFunction?: string | null } = {},
): OgeSqlDialect {
  const fn =
    options.foldFunction === undefined ? 'oge_fold' : options.foldFunction;
  return {
    name: 'sqlite',
    quote: identifier('"', '"'),
    placeholder: () => '?',
    fold: (sql) => (fn ? `${fn}(${sql})` : `lower(${sql})`),
    trim: (sql) => `trim(${sql})`,
    paging: (limit, offset) => `LIMIT ${limit} OFFSET ${offset}`,
    dateBucket: (sql, unit) => {
      switch (unit) {
        case 'hour':
          return `strftime('%Y-%m-%dT%H:00:00', ${sql})`;
        case 'day':
          return `date(${sql})`;
        case 'month':
          return `strftime('%Y-%m-01', ${sql})`;
        case 'quarter':
          return `printf('%s-%02d-01', strftime('%Y', ${sql}), ((CAST(strftime('%m', ${sql}) AS INTEGER) - 1) / 3) * 3 + 1)`;
        case 'year':
          return `strftime('%Y-01-01', ${sql})`;
        default:
          throw weekUnsupported();
      }
    },
  };
}

/**
 * SQL Server. Text folds through an accent- and case-insensitive collation
 * (`Latin1_General_100_CI_AI` unless you name another).
 */
export function ogeMssqlDialect(
  options: { readonly collation?: string } = {},
): OgeSqlDialect {
  const collation = options.collation ?? 'Latin1_General_100_CI_AI';
  if (!/^\w+$/.test(collation)) {
    throw new OgeServerError(
      'The collation name may hold letters, digits and _ only',
      500,
    );
  }
  return {
    name: 'mssql',
    quote: identifier('[', ']'),
    placeholder: (i) => `@p${i}`,
    fold: (sql) => `${sql} COLLATE ${collation}`,
    trim: (sql) => `LTRIM(RTRIM(${sql}))`,
    paging: (limit, offset) =>
      `OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`,
    dateBucket: (sql, unit) => {
      switch (unit) {
        case 'hour':
          return `DATEADD(hour, DATEDIFF(hour, 0, ${sql}), 0)`;
        case 'day':
          return `CAST(${sql} AS date)`;
        case 'month':
          return `DATEFROMPARTS(YEAR(${sql}), MONTH(${sql}), 1)`;
        case 'quarter':
          return `DATEFROMPARTS(YEAR(${sql}), (DATEPART(quarter, ${sql}) - 1) * 3 + 1, 1)`;
        case 'year':
          return `DATEFROMPARTS(YEAR(${sql}), 1, 1)`;
        default:
          throw weekUnsupported();
      }
    },
  };
}

const weekUnsupported = () =>
  new OgeServerError(
    'Week buckets depend on the reader’s first day of the week; group by day instead',
  );

/** A statement and its parameters, in placeholder order. */
export interface OgeSqlStatement {
  readonly sql: string;
  readonly params: readonly unknown[];
}

/** What the builder needs besides the request. */
export interface OgeSqlOptions {
  readonly schema: OgeServerSchema;
  /** The table, view or `(subquery) AS alias` to read. Written by you. */
  readonly from: string;
  readonly dialect: OgeSqlDialect;
  /**
   * A condition of your own ANDed to every query (tenant, permissions), with
   * `?` for each of its `params`.
   */
  readonly where?: {
    readonly sql: string;
    readonly params?: readonly unknown[];
  };
  /**
   * Turns a request value into a database value for a field — dates arrive
   * as ISO text. Default: dates become `Date` (ISO text for SQLite).
   */
  readonly toDbValue?: (value: unknown, field: OgeServerField) => unknown;
}

/** The statements for one request. */
export interface OgeSqlQueries {
  /** The page of rows (or of groups when the request groups). */
  readonly data: OgeSqlStatement;
  /** `SELECT COUNT(*) AS count` of the matching rows. */
  readonly count: OgeSqlStatement;
  /** The total summaries as one row `s0, s1, …`, or `null` without any. */
  readonly summary: OgeSqlStatement | null;
  /** `SELECT COUNT(*) AS count` of the groups, or `null` without grouping. */
  readonly groupCount: OgeSqlStatement | null;
}

class Builder {
  readonly params: unknown[] = [];
  constructor(private readonly options: OgeSqlOptions) {}

  get dialect(): OgeSqlDialect {
    return this.options.dialect;
  }

  param(value: unknown): string {
    this.params.push(value);
    return this.dialect.placeholder(this.params.length);
  }

  column(name: string, use: 'filter' | 'sort' | 'select' = 'select') {
    const field = ogeSchemaField(this.options.schema, name, use);
    const raw = field.column ?? name;
    return {
      field,
      sql: field.expression ? `(${raw})` : this.dialect.quote(raw),
      text: (field.type ?? 'string') === 'string',
    };
  }

  value(value: unknown, field: OgeServerField): unknown {
    if (this.options.toDbValue) return this.options.toDbValue(value, field);
    if (field.type === 'date' && typeof value === 'string') {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        throw new OgeServerError(`"${value}" is not a date`);
      }
      return this.dialect.name === 'sqlite' ? date.toISOString() : date;
    }
    if (field.type === 'boolean' && typeof value === 'boolean') {
      return this.dialect.name === 'postgres' ? value : value ? 1 : 0;
    }
    return value;
  }

  where(options: LoadOptions): string {
    const parts: string[] = [];
    if (this.options.where) {
      let i = 0;
      const own = this.options.where.params ?? [];
      parts.push(
        `(${this.options.where.sql.replace(/\?/g, () => this.param(own[i++]))})`,
      );
    }
    if (options.filter) parts.push(this.filter(options.filter));
    if (options.searchText?.trim()) parts.push(this.search(options.searchText));
    return parts.length ? ` WHERE ${parts.join(' AND ')}` : '';
  }

  private search(text: string): string {
    const fields = Object.entries(this.options.schema.fields).filter(
      ([, f]) => f.searchable ?? (f.type ?? 'string') === 'string',
    );
    if (!fields.length) return '1=0';
    const pattern = `%${escapeLike(text.trim())}%`;
    return `(${fields
      .map(([name]) => {
        const col = this.column(name);
        return `(${col.sql} IS NOT NULL AND ${this.dialect.fold(col.sql)} LIKE ${this.dialect.fold(this.param(pattern))} ESCAPE '!')`;
      })
      .join(' OR ')})`;
  }

  filter(expr: FilterExpr): string {
    switch (expr.type) {
      case 'and':
      case 'or':
        return expr.operands.length
          ? `(${expr.operands.map((o) => this.filter(o)).join(expr.type === 'and' ? ' AND ' : ' OR ')})`
          : expr.type === 'and'
            ? '1=1'
            : '1=0';
      case 'not':
        return `(NOT ${this.filter(expr.operand)})`;
      default:
        return this.leaf(expr.field, expr.op, expr.value);
    }
  }

  private leaf(name: string, op: string, value: unknown): string {
    const col = this.column(name, 'filter');
    const f = col.sql;
    const d = this.dialect;
    const cmp = (v: unknown) =>
      col.text
        ? d.fold(this.param(this.value(v, col.field)))
        : this.param(this.value(v, col.field));
    const lhs = col.text ? d.fold(f) : f;
    const like = (pattern: string) =>
      `${d.fold(f)} LIKE ${d.fold(this.param(pattern))} ESCAPE '!'`;
    const text = String(value ?? '');
    switch (op) {
      case 'eq':
        return value === null || value === undefined
          ? `${f} IS NULL`
          : `(${f} IS NOT NULL AND ${lhs} = ${cmp(value)})`;
      case 'ne':
        return value === null || value === undefined
          ? `${f} IS NOT NULL`
          : `(${f} IS NULL OR ${lhs} <> ${cmp(value)})`;
      case 'gt':
      case 'ge':
      case 'lt':
      case 'le': {
        if (value === null || value === undefined) return '1=0';
        const sign = { gt: '>', ge: '>=', lt: '<', le: '<=' }[op];
        return `(${f} IS NOT NULL AND ${lhs} ${sign} ${cmp(value)})`;
      }
      case 'contains':
        return `(${f} IS NOT NULL AND ${like(`%${escapeLike(text)}%`)})`;
      case 'notcontains':
        return `(${f} IS NULL OR NOT (${like(`%${escapeLike(text)}%`)}))`;
      case 'startswith':
        return `(${f} IS NOT NULL AND ${like(`${escapeLike(text)}%`)})`;
      case 'endswith':
        return `(${f} IS NOT NULL AND ${like(`%${escapeLike(text)}`)})`;
      case 'in':
      case 'notin': {
        const items = Array.isArray(value) ? value : [value];
        const withNull = items.some((v) => v === null || v === undefined);
        const real = items.filter((v) => v !== null && v !== undefined);
        const inList = real.length
          ? `(${f} IS NOT NULL AND ${lhs} IN (${real.map((v) => cmp(v)).join(', ')}))`
          : '1=0';
        if (op === 'in') {
          return withNull ? `(${f} IS NULL OR ${inList})` : inList;
        }
        // notin: the complement of in
        return withNull
          ? `(${f} IS NOT NULL AND NOT ${inList})`
          : `(${f} IS NULL OR NOT ${inList})`;
      }
      case 'between': {
        const [from, to] = Array.isArray(value) ? value : [];
        const parts = [`${f} IS NOT NULL`];
        if (from !== null && from !== undefined)
          parts.push(`${lhs} >= ${cmp(from)}`);
        if (to !== null && to !== undefined) parts.push(`${lhs} <= ${cmp(to)}`);
        return `(${parts.join(' AND ')})`;
      }
      case 'isnull':
        return `${f} IS NULL`;
      case 'isnotnull':
        return `${f} IS NOT NULL`;
      case 'isblank':
        return col.text
          ? `(${f} IS NULL OR ${d.trim(f)} = '')`
          : `${f} IS NULL`;
      case 'isnotblank':
        return col.text
          ? `(${f} IS NOT NULL AND ${d.trim(f)} <> '')`
          : `${f} IS NOT NULL`;
      default:
        throw new OgeServerError(`Unknown filter operator "${op}"`);
    }
  }

  orderBy(sort: readonly SortDescriptor[]): string {
    const key = this.options.schema.key;
    const items = sort.map(
      (s) => `${this.column(s.field, 'sort').sql} ${dirSql(s.dir)}`,
    );
    if (key && !sort.some((s) => s.field === key)) {
      items.push(`${this.column(key).sql} ASC`);
    }
    return items.length ? ` ORDER BY ${items.join(', ')}` : '';
  }

  summary(items: readonly SummaryDescriptor[], prefix = 's'): string[] {
    return items.map((s, i) => {
      const col = this.column(s.field).sql;
      const fn = {
        sum: 'SUM',
        avg: 'AVG',
        min: 'MIN',
        max: 'MAX',
        count: 'COUNT',
      }[s.type as 'sum'];
      if (!fn)
        throw new OgeServerError(`Summary type "${s.type}" is not supported`);
      return `${fn}(${col}) AS ${this.dialect.quote(`${prefix}${i}`)}`;
    });
  }

  groupKey(group: GroupDescriptor): string {
    const col = this.column(group.field, 'sort');
    const interval = group.interval;
    if (interval === undefined) return col.sql;
    if (typeof interval === 'number') {
      if (col.field.type !== 'number') {
        throw new OgeServerError('A number interval groups number fields only');
      }
      // one placeholder per use: `?` dialects bind by position
      return `(FLOOR(${col.sql} / ${this.param(interval)}) * ${this.param(interval)})`;
    }
    if (col.field.type !== 'date') {
      throw new OgeServerError('A calendar interval groups date fields only');
    }
    return this.dialect.dateBucket(col.sql, interval);
  }
}

const dirSql = (dir: string) => (dir === 'desc' ? 'DESC' : 'ASC');

/** Escapes `%`, `_` and the escape character `!` for a LIKE pattern. */
export function ogeEscapeLike(text: string): string {
  return text.replace(/[!%_]/g, (c) => `!${c}`);
}
const escapeLike = ogeEscapeLike;

/**
 * Builds the statements for one request. Without `group`: the page of rows
 * (`SELECT *` filtered, searched, sorted and paged). With `group`: the page of
 * first-level groups as `key, count[, g0, g1…]` — the grid asks for the rows
 * of an expanded group with a filter on its key, which is a plain request.
 */
export function ogeBuildSqlQueries(
  options: LoadOptions,
  config: OgeSqlOptions,
): OgeSqlQueries {
  const d = config.dialect;
  const from = config.from;
  const make = (build: (b: Builder) => string): OgeSqlStatement => {
    const b = new Builder(config);
    const sql = build(b);
    return { sql, params: b.params };
  };
  const paging = (b: Builder, hasOrder: boolean) => {
    const take = options.take;
    const skip = options.skip ?? 0;
    if (take === undefined && !skip) return '';
    const limit = b.param(take ?? Number.MAX_SAFE_INTEGER);
    const offset = b.param(skip);
    const order =
      !hasOrder && d.name === 'mssql' ? ' ORDER BY (SELECT NULL)' : '';
    return `${order} ${d.paging(limit, offset)}`;
  };
  const count = make(
    (b) => `SELECT COUNT(*) AS count FROM ${from}${b.where(options)}`,
  );
  const summary = options.totalSummary?.length
    ? make((b) => {
        const where = b.where(options);
        return `SELECT ${b.summary(options.totalSummary ?? []).join(', ')} FROM ${from}${where}`;
      })
    : null;
  const group = options.group?.[0];
  if (!group) {
    const data = make((b) => {
      const where = b.where(options);
      const order = b.orderBy(options.sort ?? []);
      return `SELECT * FROM ${from}${where}${order}${paging(b, order !== '')}`;
    });
    return { data, count, summary, groupCount: null };
  }
  // parameters are numbered in the order they appear in the text, so each
  // part is built where it is written
  const data = make((b) => {
    const key = b.groupKey(group);
    const select = [
      `${key} AS ${d.quote('key')}`,
      `COUNT(*) AS ${d.quote('count')}`,
      ...b.summary(options.groupSummary ?? [], 'g'),
    ];
    const where = b.where(options);
    // the key expression again, not its alias: SQL Server and PostgreSQL
    // refuse an alias in GROUP BY
    const keyAgain = b.groupKey(group);
    return `SELECT ${select.join(', ')} FROM ${from}${where} GROUP BY ${keyAgain} ORDER BY ${d.quote('key')} ${dirSql(group.dir)}${paging(b, true)}`;
  });
  const groupCount = make((b) => {
    const key = b.groupKey(group);
    const where = b.where(options);
    return `SELECT COUNT(*) AS count FROM (SELECT ${key} AS ${d.quote('key')} FROM ${from}${where} GROUP BY ${b.groupKey(group)}) ${d.quote('oge_groups')}`;
  });
  return { data, count, summary, groupCount };
}

/** The distinct values of one field for a header filter list. */
export function ogeBuildDistinctQuery(
  field: string,
  options: {
    readonly filter?: FilterExpr | null;
    readonly searchText?: string;
    /** Only values containing this text (the list's own search box). */
    readonly search?: string;
    readonly take?: number;
  },
  config: OgeSqlOptions,
): OgeSqlStatement {
  const b = new Builder(config);
  const col = b.column(field, 'filter');
  const where = b.where({
    filter: options.filter,
    searchText: options.searchText,
  });
  const own = options.search?.trim()
    ? `${where ? ' AND' : ' WHERE'} (${col.sql} IS NOT NULL AND ${config.dialect.fold(col.sql)} LIKE ${config.dialect.fold(b.param(`%${escapeLike(options.search.trim())}%`))} ESCAPE '!')`
    : '';
  const take = options.take ?? 1000;
  const limit = b.param(take);
  const offset = b.param(0);
  return {
    sql: `SELECT DISTINCT ${col.sql} AS ${config.dialect.quote('value')} FROM ${config.from}${where}${own} ORDER BY ${config.dialect.quote('value')} ASC ${config.dialect.paging(limit, offset)}`,
    params: b.params,
  };
}
