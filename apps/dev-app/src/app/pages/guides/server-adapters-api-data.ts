import type { ApiSections } from '../../shared/api-reference';

/** The API tables of `@oge-ui/server`, rendered on `/guides/server-adapters`. */
export const OGE_SERVER_API: ApiSections = {
  methods: [
    {
      title: 'Functions',
      entries: [
        {
          name: 'ogeParseLoadOptions(input, schema, limits?)',
          type: '(input: unknown, schema: OgeServerSchema, limits?: OgeParseLimits) =&gt; LoadOptions',
          description:
            'Checks an untrusted request body (the object or its JSON): only schema fields, only the contract&#39;s operators, bounded page size, filter depth and list length. Throws <code>OgeServerError</code> (status 400) otherwise. A missing <code>take</code> becomes <code>maxTake</code>.',
        },
        {
          name: 'ogeSqlLoad(options, config)',
          type: '(options: LoadOptions, config: OgeSqlLoadOptions) =&gt; Promise&lt;LoadResult&gt;',
          description:
            'Answers a grid request with your driver: the page of rows (or of first-level groups with counts and group summaries), the total count when asked for, the total summaries. <code>config.run</code> executes one <code>{ sql, params }</code> statement.',
        },
        {
          name: 'ogeSqlDistinct(field, options, config)',
          type: '(field: string, options: DistinctOptions, config) =&gt; Promise&lt;unknown[]&gt;',
          description:
            'The distinct values of a field for a header filter list, under the other columns&#39; filter, the search box and the list&#39;s own search text.',
        },
        {
          name: 'ogeBuildSqlQueries(options, config)',
          type: '(options: LoadOptions, config: OgeSqlOptions) =&gt; OgeSqlQueries',
          description:
            'The statements alone — <code>data</code>, <code>count</code>, <code>summary</code>, <code>groupCount</code> — for running them yourself (a transaction, a read replica, logging).',
        },
        {
          name: 'ogeBuildDistinctQuery(field, options, config)',
          type: '(field, options, config: OgeSqlOptions) =&gt; OgeSqlStatement',
          description: 'The header filter statement alone.',
        },
        {
          name: 'ogePostgresDialect(options?)',
          type: '(options?: { unaccent?: boolean }) =&gt; OgeSqlDialect',
          description:
            'PostgreSQL: <code>$1</code> placeholders, <code>LIMIT / OFFSET</code>, text folded with <code>lower()</code> — or <code>lower(unaccent())</code> with <code>{ unaccent: true }</code> when the extension is installed — and <code>date_trunc</code> buckets.',
        },
        {
          name: 'ogeMysqlDialect()',
          type: '() =&gt; OgeSqlDialect',
          description:
            'MySQL / MariaDB: <code>?</code> placeholders, backtick quoting, <code>lower()</code> folding (the default <code>_ai_ci</code> collations already ignore accents).',
        },
        {
          name: 'ogeSqliteDialect(options?)',
          type: '(options?: { foldFunction?: string | null }) =&gt; OgeSqlDialect',
          description:
            'SQLite: text folds through <code>oge_fold</code>, registered with <code>ogeFoldText</code> (<code>foldFunction: null</code> falls back to ASCII-only <code>lower()</code>); date buckets expect ISO text.',
        },
        {
          name: 'ogeMssqlDialect(options?)',
          type: '(options?: { collation?: string }) =&gt; OgeSqlDialect',
          description:
            'SQL Server: <code>@p1</code> named parameters, bracket quoting, <code>OFFSET … FETCH</code> (with <code>ORDER BY (SELECT NULL)</code> when unsorted) and folding through a case- and accent-insensitive collation (default <code>Latin1_General_100_CI_AI</code>).',
        },
        {
          name: 'ogeParseExportRequest(input, schema, limits?)',
          type: '(input: unknown, schema, limits?) =&gt; OgeExportRequest',
          description:
            'Checks a grid&#39;s <code>exportOnServer</code> request: the query as <code>ogeParseLoadOptions</code> does, every column a schema field, a safe file name (no paths or control characters) and bounded selected keys.',
        },
        {
          name: 'ogeSqlRows(request, config, options?)',
          type: 'AsyncGenerator&lt;Record&lt;string, unknown&gt;&gt;',
          description:
            'The request&#39;s rows from SQL in batches (<code>batchSize</code>, default 5 000) with the schema key as tie-breaker — no gaps or repeats — up to <code>maxRows</code> (default 1 000 000); <code>selectedKeys</code> become an <code>in</code> filter.',
        },
        {
          name: 'ogeXlsxStream(rows, columns, options?)',
          type: 'ReadableStream&lt;Uint8Array&gt;',
          description:
            'A streamed <code>.xlsx</code>: one sheet with a bold, frozen header row and an autofilter; numbers, booleans and dates (the column&#39;s time-zone wall clock) typed. Built on <code>CompressionStream</code>, no dependency; ZIP32, up to 4 GB.',
        },
        {
          name: 'ogeCsvChunks(rows, columns, options?)',
          type: 'AsyncGenerator&lt;string&gt;',
          description:
            'The file as CSV text chunks: a byte-order mark (unless <code>bom: false</code>), a header, the suite&#39;s formula guard, dates as ISO wall clock.',
        },
        {
          name: 'ogeExportResponse(request, rows)',
          type: 'Response',
          description:
            'The finished response: the streamed file, its content type and a <code>Content-Disposition</code> with the UTF-8 file name. In Node, pipe <code>Readable.fromWeb(response.body)</code>.',
        },
        {
          name: 'ogeFoldText(text)',
          type: '(text: string) =&gt; string',
          description:
            'The suite&#39;s text folding, to register as SQLite&#39;s <code>oge_fold</code> function so text compares exactly as in the browser.',
        },
        {
          name: 'ogeEscapeLike(text)',
          type: '(text: string) =&gt; string',
          description:
            "Escapes <code>%</code>, <code>_</code> and <code>!</code> for a <code>LIKE … ESCAPE '!'</code> pattern.",
        },
        {
          name: 'ogeSchemaField(schema, name, use?)',
          type: "(schema, name: string, use?: 'filter' | 'sort' | 'select') =&gt; OgeServerField",
          description:
            'A schema field, or the <code>OgeServerError</code> a request naming it would get.',
        },
      ],
    },
  ],
  types: [
    {
      title: 'Types',
      entries: [
        {
          name: 'OgeServerSchema',
          type: 'interface',
          description:
            '<code>{ fields, key? }</code> — the allowlist. <code>key</code> is appended to every sort so pages are stable.',
        },
        {
          name: 'OgeServerField',
          type: 'interface',
          description:
            '<code>{ column?, type?, searchable?, filterable?, sortable?, expression? }</code> — <code>type</code> is <code>string</code> (default, compared folded), <code>number</code>, <code>date</code> or <code>boolean</code>; <code>expression: true</code> takes <code>column</code> as raw SQL written by you.',
        },
        {
          name: 'OgeServerFieldType',
          type: "'string' | 'number' | 'date' | 'boolean'",
          description: 'How a field&#39;s values compare.',
        },
        {
          name: 'OgeParseLimits',
          type: 'interface',
          description:
            '<code>{ maxTake = 1000, maxFilterDepth = 16, maxFilterNodes = 200, maxListLength = 1000, maxTextLength = 500 }</code>.',
        },
        {
          name: 'OgeSqlOptions / OgeSqlLoadOptions',
          type: 'interface',
          description:
            '<code>{ schema, from, dialect, where?, toDbValue? }</code> plus <code>run</code> and <code>mapRow</code> for loading. <code>where</code> is your own condition (<code>?</code> per parameter) ANDed to every query; <code>toDbValue</code> converts request values (dates arrive as ISO text).',
        },
        {
          name: 'OgeSqlRunner',
          type: '(statement: OgeSqlStatement) =&gt; Promise&lt;Record&lt;string, unknown&gt;[]&gt;',
          description:
            'Executes one statement with your driver and returns its rows.',
        },
        {
          name: 'OgeSqlStatement / OgeSqlQueries',
          type: 'interface',
          description:
            '<code>{ sql, params }</code>, and the set <code>{ data, count, summary, groupCount }</code>.',
        },
        {
          name: 'OgeSqlDialect',
          type: 'interface',
          description:
            '<code>{ name, quote, placeholder, fold, trim, paging, dateBucket }</code> — implement it for another database.',
        },
        {
          name: 'OgeExportRequest / OgeExportFileColumn',
          type: 'interface',
          description:
            'A checked export request <code>{ format, fileName, loadOptions, columns, selectedKeys? }</code> and one file column <code>{ field, caption, dataType, width?, timeZone? }</code>.',
        },
        {
          name: 'OgeServerError',
          type: 'class',
          description:
            'A request the schema or the limits refuse; <code>status</code> is 400. Answer it as a bad request.',
        },
      ],
    },
  ],
};

/** The API tables of the `Oge.Data` NuGet package. */
export const OGE_DOTNET_API: ApiSections = {
  methods: [
    {
      title: 'Extension methods (IQueryable&lt;T&gt;)',
      entries: [
        {
          name: 'OgeLoadAsync(options, schema, runner, settings?, ct?)',
          type: 'Task&lt;OgeLoadResult&gt;',
          description:
            'Answers a request on any <code>IQueryable</code>: filter, search, sort (with the schema key as tie-breaker), paging, total count, total summaries, and first-level groups with counts and group summaries. <code>OgeLoad</code> is the synchronous form.',
        },
        {
          name: 'ApplyOgeFilter(options, schema, settings?) / ApplyOgeSort(sort, schema)',
          type: 'IQueryable&lt;T&gt;',
          description:
            'The filter and search, or the sort, alone — to compose with your own query.',
        },
        {
          name: 'OgeDistinctAsync(field, schema, filter?, searchText?, search?, take?, runner?, settings?, ct?)',
          type: 'Task&lt;IReadOnlyList&lt;object?&gt;&gt;',
          description:
            'The distinct values of a field for a header filter list.',
        },
      ],
    },
  ],
  types: [
    {
      title: 'Types',
      entries: [
        {
          name: 'OgeSchema&lt;T&gt;',
          type: 'class',
          description:
            'The allowlist: <code>FromProperties()</code> (every scalar property, camelCase), <code>Field(name, x =&gt; x.Member, searchable?, filterable?, sortable?)</code>, <code>Without(names)</code>, <code>WithKey(name)</code>.',
        },
        {
          name: 'OgeLoadOptions / OgeLoadResult / OgeGroup',
          type: 'class',
          description:
            'The request and the response, shaped as the grid sends and reads them (System.Text.Json, camelCase). <code>OgeLoadOptions.Parse(json)</code> reads a body.',
        },
        {
          name: 'OgeQueryOptions',
          type: 'class',
          description:
            '<code>{ Fold, MaxTake = 1000, MaxFilterDepth = 16, MaxFilterNodes = 200, MaxListLength = 1000 }</code>.',
        },
        {
          name: 'OgeTextFold',
          type: 'enum',
          description:
            '<code>ToLower</code> (default; translates on every provider), <code>Contract</code> (<code>OgeText.Fold</code>: case, accents, İ / ı — map it with <code>HasDbFunction</code> for Entity Framework) or <code>None</code>.',
        },
        {
          name: 'OgeQueryRunner',
          type: 'class',
          description:
            'Runs the queries; override <code>ToListAsync</code> / <code>CountAsync</code> with Entity Framework&#39;s. <code>OgeQueryRunner.Sync</code> runs them synchronously.',
        },
        {
          name: 'OgeServerException',
          type: 'class',
          description:
            'A request the schema or the limits refuse — answer with 400.',
        },
      ],
    },
  ],
};
