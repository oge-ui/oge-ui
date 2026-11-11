import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  OGE_FILTER_OPERATORS,
  type FilterOperator,
  type OgeFilterOperatorInfo,
} from '@oge-ui/core';
import { CodeBlock } from '../../shared/code-block';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import { DISTINCT_ENDPOINT, SERVER_VECTORS } from './filter-contract-snippets';
import { GuideTable } from './guide-table';

const ARITY: Record<OgeFilterOperatorInfo['arity'], string> = {
  none: 'none',
  one: 'one value',
  list: 'array',
  pair: '[from, to]',
};

/** The operator table, rendered from the registry the evaluator follows. */
const OPERATOR_ROWS = (
  Object.entries(OGE_FILTER_OPERATORS) as [
    FilterOperator,
    OgeFilterOperatorInfo,
  ][]
).map(([op, info]) => [
  `\`${op}\``,
  ARITY[info.arity],
  info.meaning,
  info.blanks,
  `\`${info.sql}\``,
]);

const SECTIONS = [
  'Rules for every operator',
  'Operators',
  'What the grid sends',
  'Value lists',
  'Test vectors',
];

/**
 * `/guides/filter-contract` — what every `FilterExpr` operator means,
 * including blanks, so a server returns the same rows the in-memory engine
 * does. The table renders `OGE_FILTER_OPERATORS` from `@oge-ui/core`.
 */
@Component({
  selector: 'app-guide-filter-contract',
  imports: [CodeBlock, DocHeader, GuideTable, PageToc],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Filter contract"
      category="Guides"
      categoryLink="/guides"
      [chips]="['FilterExpr', 'server parity', 'test vectors']"
    >
      <p>
        A grid, tree list or pivot filters in memory or hands the same
        <code>FilterExpr</code> to your server. This page is the contract both
        sides follow — what each operator means and what it does with blank
        cells — so the same filter returns the same rows either way. Run the
        published test vectors against your server to prove it.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <h2 id="rules-for-every-operator" class="scroll-mt-20">
      Rules for every operator
    </h2>
    <ul>
      <li>
        <strong>Two-valued logic.</strong> Every condition is true or false for
        a row — never SQL's "unknown" — and <code>not</code> is the plain
        complement. A SQL translation spells the null branch out (as the table
        does) or wraps a negation as <code>NOT COALESCE(expr, FALSE)</code>.
      </li>
      <li>
        <strong>Text is folded.</strong> Comparisons ignore case and accents
        with a locale-independent fold: <code>İzmir</code>,
        <code>IZMIR</code> and <code>izmir</code> are equal, and
        <code>ı</code> matches <code>i</code>. On a server, use a case- and
        accent-insensitive collation.
      </li>
      <li>
        <strong>Days are half-open.</strong> A day is
        <code>[00:00, next day 00:00)</code> in local time, so a row stamped
        17:30 on the last day of a range is inside it, and "not on that day"
        keeps rows with no date.
      </li>
      <li>
        <strong>Lists are arrays.</strong> <code>in</code> and
        <code>notin</code> take an array and never split on commas —
        <code>"Kaya, Mehmet"</code> is one value. An empty <code>in</code> list
        matches no row: nothing selected is not "no filter".
      </li>
      <li>
        <strong>Blank</strong> means null, undefined or text that is empty after
        trimming. Zero and <code>false</code> are values.
      </li>
    </ul>

    <h2 id="operators" class="scroll-mt-20">Operators</h2>
    <app-guide-table
      caption="Filter operators"
      [head]="['Operator', 'Value', 'Matches', 'Blank cells', 'Reference SQL']"
      [rows]="operatorRows"
    />

    <h2 id="what-the-grid-sends" class="scroll-mt-20">What the grid sends</h2>
    <ul>
      <li>
        "Is blank" / "Is not blank" in the filter menus send
        <code>isblank</code> / <code>isnotblank</code> for text columns and
        <code>isnull</code> / <code>isnotnull</code> for number, date and
        boolean columns — the same rows, and an operator every OData server
        understands.
      </li>
      <li>
        A date condition becomes a day range: "equals" is
        <code>ge</code> day and <code>lt</code> next day, "does not equal" is
        <code>lt</code> day, <code>ge</code> next day or <code>isnull</code> —
        never a <code>not</code> a server would turn into "unknown".
      </li>
      <li>
        A header filter's checked values travel as <code>in</code>; the global
        search box travels separately as <code>LoadOptions.searchText</code>.
      </li>
      <li>
        <code>buildODataQuery</code> and <code>ODataDataSource</code> follow the
        table, including the explicit null branches.
      </li>
    </ul>

    <h2 id="value-lists" class="scroll-mt-20">Value lists</h2>
    <p>
      An Excel-style header filter lists a column's values through
      <code>DataSource.distinct(field, options)</code>. The list cascades: it is
      taken under every other active filter and the global search text, never
      under the column's own filter. An in-memory source is searched in the
      browser; a server source is asked once when the popup opens and again
      250&nbsp;ms after the user stops typing in its search box, with the typed
      text as <code>search</code>. Each request aborts the previous one and a
      late answer never replaces a newer one. A source without
      <code>distinct</code> shows no value list — the current page is never
      passed off as every value.
    </p>
    <ul>
      <li>
        <strong>One "(Blank)" item.</strong> Null, empty and whitespace-only
        values list as a single <em>(Blank)</em> entry at the end. Checking it
        adds an <code>isblank</code> condition (<code>isnull</code> on number,
        date and boolean columns) next to the <code>in</code> list, so a boolean
        column filters yes / no / blank.
      </li>
      <li>
        <strong>A cut list says so.</strong> The grid asks for one value more
        than <code>valueLimit</code> (<code>take</code>); when the source
        returns more, the popup lists the first <code>valueLimit</code> values
        and notes that typing narrows the list. A server should honour
        <code>take</code>.
      </li>
    </ul>
    <app-code-block [code]="distinctEndpoint" language="ts" />

    <h2 id="test-vectors" class="scroll-mt-20">Test vectors</h2>
    <p>
      <code>&#64;oge-ui/core/filter-vectors.json</code> holds rows, expressions
      and the expected row ids for every operator — blank and null cells,
      timestamps inside a day, values with commas, the Turkish dotted and
      dotless i. The suite's own evaluator runs them on every build; run them
      against your translation too.
    </p>
    <app-code-block [code]="serverVectors" language="ts" />
  `,
})
export class GuideFilterContractPage {
  protected readonly sections = SECTIONS;
  protected readonly operatorRows = OPERATOR_ROWS;
  protected readonly distinctEndpoint = DISTINCT_ENDPOINT;
  protected readonly serverVectors = SERVER_VECTORS;
}
