import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiReference } from '../../shared/api-reference';
import { CodeBlock } from '../../shared/code-block';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import { OGE_DOTNET_API, OGE_SERVER_API } from './server-adapters-api-data';
import {
  CLIENT_SOURCE,
  DOTNET_CONTROLLER,
  DOTNET_FOLD,
  DOTNET_INSTALL,
  NODE_DRIVERS,
  NODE_EXPRESS,
  NODE_INSTALL,
} from './server-adapters-snippets';

const SECTIONS = [
  'How it fits',
  'Node and SQL',
  'Other databases',
  '.NET and IQueryable',
  'Security',
  'Limits',
  'API reference',
] as const;

/**
 * `/guides/server-adapters` — answering grid requests on the server with
 * `@oge-ui/server` (Node, SQL) and `Oge.Data` (.NET, IQueryable).
 */
@Component({
  selector: 'app-guide-server-adapters',
  imports: [ApiReference, CodeBlock, DocHeader, PageToc, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Server adapters"
      category="Guides"
      categoryLink="/guides"
      [chips]="['Node', 'SQL', '.NET', 'IQueryable']"
    >
      <p>
        A grid with a remote data source sends one
        <code>LoadOptions</code> object per request — filter, search, sort,
        page, groups and summaries. The server adapters turn that object into a
        query and the rows back into the <code>LoadResult</code> the grid reads:
        <code>&#64;oge-ui/server</code> builds parameterized SQL for PostgreSQL,
        MySQL / MariaDB, SQLite and SQL Server, and
        <code>Oge.Data</code> applies the request to any .NET
        <code>IQueryable</code>, Entity Framework Core included.
      </p>
      <p>
        Both follow the
        <a
          routerLink="/guides/filter-contract"
          class="text-indigo-600 underline dark:text-indigo-400"
          >filter contract</a
        >: their test suites run its published vectors against a real database
        (SQLite for Node; LINQ to Objects and Entity Framework Core on SQLite
        for .NET), so a filter returns the same rows on the server as in the
        browser.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <h2 id="how-it-fits" class="scroll-mt-20">How it fits</h2>
    <p>
      On the client, a <code>CustomDataSource</code> posts the load options to
      your endpoint; the grid then sorts, filters, groups and pages through the
      server.
    </p>
    <app-code-block [code]="clientSource" language="ts" />

    <h2 id="node-and-sql" class="scroll-mt-20">Node and SQL</h2>
    <app-code-block [code]="nodeInstall" language="bash" />
    <p>
      Describe the resource as a schema — the fields a request may name and the
      column behind each — check every request with
      <code>ogeParseLoadOptions</code>, and answer it with
      <code>ogeSqlLoad</code>. The adapter has no driver of its own: you hand it
      a function that runs one statement.
    </p>
    <app-code-block [code]="nodeExpress" language="ts" />
    <ul>
      <li>
        Without <code>group</code> the answer is the page of rows; with it, the
        first-level groups as
        <code>{{ '{' }} key, items: null, count, summary {{ '}' }}</code
        >. The grid asks for an expanded group's rows itself, with a filter on
        its key.
      </li>
      <li>
        Calendar buckets (<code>hour</code>, <code>day</code>,
        <code>month</code>, <code>quarter</code>, <code>year</code>) and number
        buckets are computed in SQL. <code>week</code> is refused: its first day
        depends on the reader's locale.
      </li>
      <li>
        The schema's <code>key</code> is appended to every sort, so rows with
        equal sort values never trade places between pages.
      </li>
    </ul>

    <h2 id="other-databases" class="scroll-mt-20">Other databases</h2>
    <p>
      The dialect decides placeholders, quoting, paging and text folding. Text
      compares folded: <code>lower()</code> on PostgreSQL (plus
      <code>unaccent</code> when the extension is installed) and MySQL (whose
      default collations already ignore accents), an accent- and
      case-insensitive collation on SQL Server, and on SQLite the suite's own
      folding registered as a function.
    </p>
    <app-code-block [code]="nodeDrivers" language="ts" />

    <h2 id="net-and-iqueryable" class="scroll-mt-20">.NET and IQueryable</h2>
    <app-code-block [code]="dotnetInstall" language="bash" />
    <p>
      <code>Oge.Data</code> (net8.0) builds expression trees, so Entity
      Framework translates the whole request — filter, search, sort, paging,
      counts, groups and summaries — into one SQL query per part. Calendar
      buckets group by date parts, which every provider translates.
    </p>
    <app-code-block [code]="dotnetController" language="csharp" />
    <app-code-block [code]="dotnetFold" language="csharp" />

    <h2 id="security" class="scroll-mt-20">Security</h2>
    <ul>
      <li>
        <strong>The schema is the allowlist.</strong> A request can only name
        schema fields; an unknown field, operator or summary is a 400, never
        part of a query. Mark fields <code>filterable: false</code> or
        <code>sortable: false</code> (or leave them out) when they must not be
        probed.
      </li>
      <li>
        <strong>Values are always parameters.</strong> Identifiers come from the
        schema and are quoted; <code>LIKE</code> wildcards in typed text are
        escaped, so <code>50%</code> means the characters, not a pattern.
      </li>
      <li>
        <strong>Scope every query yourself.</strong> Tenant and permission
        conditions go in <code>where</code> (Node) or a
        <code>Where</code> before <code>OgeLoadAsync</code> (.NET) — the request
        cannot remove them.
      </li>
    </ul>

    <h2 id="limits" class="scroll-mt-20">Limits</h2>
    <p>
      Requests are bounded: at most 1000 rows per page (a missing
      <code>take</code> becomes the maximum), 16 levels of filter nesting, 200
      conditions, 1000 values in an <code>in</code> list and 500 characters of
      text. Raise or lower them per endpoint with <code>OgeParseLimits</code> /
      <code>OgeQueryOptions</code>. Custom summaries (<code>type: 'custom'</code
      >) are computed in the browser only and are refused.
    </p>

    <h2 id="api-reference" class="scroll-mt-20">API reference</h2>
    <app-api-reference title="@oge-ui/server API" [sections]="serverApi" />
    <app-api-reference title="Oge.Data API" [sections]="dotnetApi" />
  `,
})
export class GuideServerAdaptersPage {
  protected readonly sections = SECTIONS;
  protected readonly clientSource = CLIENT_SOURCE;
  protected readonly nodeInstall = NODE_INSTALL;
  protected readonly nodeExpress = NODE_EXPRESS;
  protected readonly nodeDrivers = NODE_DRIVERS;
  protected readonly dotnetInstall = DOTNET_INSTALL;
  protected readonly dotnetController = DOTNET_CONTROLLER;
  protected readonly dotnetFold = DOTNET_FOLD;
  protected readonly serverApi = OGE_SERVER_API;
  protected readonly dotnetApi = OGE_DOTNET_API;
}
