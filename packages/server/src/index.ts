// @oge-ui/server — answers OGE grid requests on your server: checks the
// request against a field allowlist, builds parameterized SQL for
// PostgreSQL, MySQL / MariaDB, SQLite and SQL Server following the filter
// contract, and shapes the LoadResult. Driver-agnostic and dependency-free
// besides @oge-ui/core. Explicit named exports only (house rule).

export {
  OgeServerError,
  ogeSchemaField,
  type OgeServerField,
  type OgeServerFieldType,
  type OgeServerSchema,
} from './lib/schema';

export { ogeParseLoadOptions, type OgeParseLimits } from './lib/parse';

export {
  ogeBuildDistinctQuery,
  ogeBuildSqlQueries,
  ogeEscapeLike,
  ogeMssqlDialect,
  ogeMysqlDialect,
  ogePostgresDialect,
  ogeSqliteDialect,
  type OgeSqlDialect,
  type OgeSqlOptions,
  type OgeSqlQueries,
  type OgeSqlStatement,
} from './lib/sql';

export {
  ogeSqlDistinct,
  ogeSqlLoad,
  type OgeSqlLoadOptions,
  type OgeSqlRunner,
} from './lib/load';

/** The suite's text folding, to register as SQLite's `oge_fold` function. */
export { foldText as ogeFoldText } from '@oge-ui/core';
