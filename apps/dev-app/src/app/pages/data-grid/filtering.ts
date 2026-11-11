import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import type { FilterExpr } from '@oge-ui/core';
import { OgeColumn, OgeFilterCellTemplate, OgeGrid } from '@oge-ui/grid';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { ReactGridFilteringDemos } from '../react-grid/filtering';
import {
  DEMO_STATUSES,
  makeEmployees,
  makeTurkishPeople,
  type TurkishPerson,
} from '../../shared/demo-data';
import {
  CHIPS_SNIPPET,
  DISPLAY_SNIPPET,
  MENU_SNIPPET,
  SNIPPET,
  TOOLS_SNIPPET,
} from './filtering-snippets';
import { toLocalDate } from '@oge-ui/core';

@Component({
  selector: 'app-filtering',
  imports: [
    OgeGrid,
    OgeColumn,
    OgeFilterCellTemplate,
    DemoCard,
    DocHeader,
    ReactGridFilteringDemos,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Filtering"
      [chips]="[
        'filterRow',
        'headerFilter',
        'searchPanel',
        'filterPanel',
        'filterValue',
      ]"
    >
      <p>
        All four filtering surfaces on one grid: type in the filter row (click
        the operator button to switch <em>Contains → Starts with → …</em>), open
        a header filter and search inside its values, use the global search
        (matches are <mark>highlighted</mark>), or click the filter panel at the
        top to open the <strong>Filter Builder</strong> for arbitrary and/or
        trees.
      </p>
    </app-doc-header>

    @if (fw.isReact()) {
      <app-react-grid-filtering-demos />
    } @else {
      <app-demo-card
        [chips]="['2.000 rows', 'all filter surfaces']"
        [code]="snippet"
        language="html"
      >
        @if (filter()) {
          <div
            class="mb-3 rounded-md bg-gray-100 px-3 py-1.5 font-mono text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300"
          >
            filterValue = {{ filterJson() }}
          </div>
        }
        <oge-grid
          [data]="employees"
          keyField="id"
          [filterRow]="true"
          [headerFilter]="true"
          [searchPanel]="true"
          [filterPanel]="true"
          [filterValue]="filter()"
          (filterValueChange)="filter.set($event)"
          [paging]="{ pageSize: 12 }"
        >
          <oge-column
            field="id"
            caption="Id"
            [width]="70"
            dataType="number"
            [filterable]="false"
          />
          <oge-column field="firstName" caption="First Name" />
          <oge-column field="lastName" caption="Last Name" />
          <oge-column field="department" caption="Department" />
          <oge-column field="city" caption="City" />
          <oge-column field="salary" caption="Salary" dataType="number" />
          <oge-column
            field="hireDate"
            caption="Hire Date"
            dataType="date"
            [width]="120"
          />
        </oge-grid>
      </app-demo-card>

      <h3>Excel-style filter menu</h3>
      <p>
        <code>headerFilter.mode</code> picks what the funnel opens:
        <code>'list'</code> (the default value checklist with search and
        select-all), <code>'conditions'</code> (two operator + value conditions
        joined by And / Or) or <code>'both'</code>. Date columns list their
        values as a collapsible year → month → day tree. The conditions are
        stored as a filter expression, so they persist with
        <code>stateKey</code>.
      </p>
      <app-demo-card
        [chips]="['headerFilter.mode', 'date tree']"
        [code]="menuSnippet"
        language="ts"
      >
        <oge-grid
          class="demo-filter-menu"
          [data]="datedEmployees"
          keyField="id"
          [headerFilter]="{ mode: 'both' }"
          [paging]="{ pageSize: 8 }"
        >
          <oge-column field="firstName" caption="First Name" />
          <oge-column field="salary" caption="Salary" dataType="number" />
          <oge-column field="hireDate" caption="Hired" dataType="date" />
        </oge-grid>
      </app-demo-card>

      <h3>Filter chips and column summaries</h3>
      <app-demo-card
        [chips]="['filterChips', 'summaryMenu', '(Blank)']"
        description="<code>filterChips</code> shows every filter that narrows the rows as a removable chip — <em>Column · operator · value</em> — with a clear-all button; removing a chip also empties its editor. <code>summaryMenu</code> adds a <em>Summary</em> submenu to the header context menu (right-click a header): Count for any column, Sum / Avg / Min / Max for numbers. The pick persists with the grid state. In a value list, empty and missing values are one <em>(Blank)</em> item."
        [code]="chipsSnippet"
        language="ts"
      >
        <oge-grid
          class="demo-filter-chips"
          [data]="chipEmployees"
          keyField="id"
          [filterRow]="true"
          [headerFilter]="true"
          [searchPanel]="true"
          [filterChips]="true"
          [summaryMenu]="true"
          [paging]="{ pageSize: 8 }"
        >
          <oge-column field="firstName" caption="First Name" />
          <oge-column field="city" caption="City" />
          <oge-column
            field="salary"
            caption="Salary"
            dataType="number"
            totalSummary="sum"
          />
        </oge-grid>
      </app-demo-card>

      <h3>Filter tools</h3>
      <app-demo-card
        [chips]="[
          'headerFilter.auto',
          'filterRange',
          'dateFilterPresets',
          'filterApplyMode',
          'savedViews',
        ]"
        description="<code>headerFilter.auto</code> puts the value list only on columns whose values repeat (Department, City). Salary filters with a range slider (<code>filterRange</code>), Department with a custom cell (<code>ogeFilterCellTemplate</code> / <code>renderFilterCell</code>). Open the Hired funnel for the quick dates (<code>dateFilterPresets</code>). <code>filterApplyMode: 'manual'</code> holds every edit until <em>Apply filters</em>, and <em>Views</em> (<code>savedViews</code>) saves and reopens named states."
        [code]="toolsSnippet"
        language="ts"
      >
        <oge-grid
          class="demo-filter-tools"
          [data]="datedEmployees"
          keyField="id"
          stateKey="demo-filter-tools"
          [filterRow]="true"
          [filterDebounce]="0"
          [headerFilter]="{ auto: true }"
          [dateFilterPresets]="true"
          filterApplyMode="manual"
          [savedViews]="true"
          [paging]="{ pageSize: 8 }"
        >
          <oge-column field="firstName" caption="First Name" />
          <oge-column field="department" caption="Department">
            <select
              *ogeFilterCellTemplate="let value; setValue as set"
              class="demo-department-filter"
              aria-label="Filter Department"
              [value]="value ?? ''"
              (change)="set($any($event.target).value)"
            >
              <option value="">Any</option>
              @for (d of departments; track d) {
                <option [value]="d">{{ d }}</option>
              }
            </select>
          </oge-column>
          <oge-column field="city" caption="City" />
          <oge-column
            field="salary"
            caption="Salary"
            dataType="number"
            [filterRange]="{ min: 30000, max: 150000, step: 5000 }"
          />
          <oge-column
            field="hireDate"
            caption="Hired"
            dataType="date"
            [headerFilter]="true"
          />
        </oge-grid>
      </app-demo-card>

      <h3>Display values and Turkish sorting</h3>
      <app-demo-card
        [chips]="[
          'calculateFilterValue',
          'lookup search',
          'sorting.locale',
          'filterField',
        ]"
        description="The search box and the Name filter match what the cells show: <em>leave</em> finds the Status label behind code 1 (a static <code>lookup</code>), <em>ada k</em> finds a full name built by <code>calculateFilterValue</code>. Sort City: <code>sorting.locale: 'tr'</code> puts Isparta (dotless I) before İnegöl, where an English sort would not. On a server source, <code>filterField</code> sends a column's filters under another field."
        [code]="displaySnippet"
        language="ts"
      >
        <oge-grid
          class="demo-display-values"
          [data]="people"
          keyField="id"
          [filterRow]="true"
          [filterDebounce]="0"
          [searchPanel]="true"
          [sorting]="{ locale: 'tr' }"
          [paging]="{ pageSize: 20 }"
        >
          <oge-column
            field="name"
            caption="Name"
            [calculateCellValue]="fullName"
            [calculateFilterValue]="fullName"
          />
          <oge-column
            field="status"
            caption="Status"
            [lookup]="{
              dataSource: statuses,
              valueExpr: 'value',
              displayExpr: 'text',
            }"
          />
          <oge-column field="city" caption="City" />
        </oge-grid>
      </app-demo-card>

      <h3>Notes</h3>
      <ul>
        <li>
          Open the <strong>Hire Date</strong> header filter: date values are
          grouped into a year tree — the year checkbox toggles all its dates at
          once and the search box matches years or single dates.
        </li>
        <li>
          Every surface produces the same serializable
          <code>FilterExpr</code> tree — combined with AND and sent to your
          backend unchanged in remote mode. What each operator means, blank
          cells included, is the
          <a routerLink="/guides/filter-contract">filter contract</a>; its JSON
          test vectors let a server prove it returns the same rows.
        </li>
        <li>
          A value list cascades like Excel's: it lists the values left by the
          other columns' filters and the search text, ignoring the column's own
          selection. On a server source the list's search box asks
          <code>distinct()</code> again 250&nbsp;ms after typing stops.
        </li>
        <li>
          "Is blank" matches null, empty and whitespace-only cells, and "does
          not equal" or "not on that day" keep blank rows.
        </li>
        <li>
          The operator button in each filter cell offers dataType-appropriate
          operators; <em>Reset</em> returns to the column default.
        </li>
        <li>
          <code>[(filterValue)]</code> is two-way: set it programmatically, read
          what the builder produced, persist it — it also participates in
          <code>stateKey</code>.
        </li>
        <li>
          Search highlighting only touches default cells; custom
          <code>*ogeCellTemplate</code> content is never rewritten.
        </li>
      </ul>
    }
  `,
})
export class FilteringPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly employees = makeEmployees(2000, 5);
  /** 60 rows, every seventh city left blank — the value list shows "(Blank)". */
  protected readonly chipEmployees = makeEmployees(60, 21).map((row, i) =>
    i % 7 === 3 ? { ...row, city: '' } : row,
  );
  protected readonly snippet = SNIPPET;
  protected readonly menuSnippet = MENU_SNIPPET;
  protected readonly chipsSnippet = CHIPS_SNIPPET;
  protected readonly toolsSnippet = TOOLS_SNIPPET;
  protected readonly displaySnippet = DISPLAY_SNIPPET;
  protected readonly people = makeTurkishPeople(20);
  protected readonly statuses = DEMO_STATUSES;
  protected readonly fullName = (row: TurkishPerson) =>
    `${row.firstName} ${row.lastName}`;
  protected readonly departments = [
    ...new Set(this.employees.map((e) => e.department)),
  ].sort();
  protected readonly datedEmployees = makeEmployees(80, 13).map((row) => ({
    ...row,
    hireDate: toLocalDate(row.hireDate),
  }));
  protected readonly filter = signal<FilterExpr | null>(null);

  protected filterJson(): string {
    return JSON.stringify(this.filter());
  }
}
