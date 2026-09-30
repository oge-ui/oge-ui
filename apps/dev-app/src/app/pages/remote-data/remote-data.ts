import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  ArrayDataSource,
  CursorDataSource,
  CustomDataSource,
} from '@oge-ui/core';
import { OgeColumn, OgeGrid } from '@oge-ui/grid';
import { OgeCard } from '@oge-ui/layout';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FakeEmployeeServer } from '../../shared/fake-server';
import { makeEmployees, type Employee } from '../../shared/demo-data';
import { CURSOR_SNIPPET, SNIPPET } from './remote-data-snippets';

@Component({
  selector: 'app-remote-data',
  imports: [OgeGrid, OgeColumn, OgeCard, DemoCard, DocHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Remote Data"
      [chips]="[
        'CustomDataSource',
        'CursorDataSource',
        'LoadOptions',
        'AbortSignal',
      ]"
    >
      <p>
        Sorting, filtering, searching and paging are all delegated to a
        (simulated) backend with 250&nbsp;ms latency. Watch the request log:
        rapid typing produces a single request thanks to debouncing, and a newer
        request aborts the stale one.
      </p>
    </app-doc-header>

    <app-demo-card
      [chips]="['server-side', '250ms latency']"
      [code]="snippet"
      language="ts"
    >
      <div
        class="grid grid-cols-[minmax(0,2fr)_minmax(260px,1fr)] items-start gap-4 max-lg:grid-cols-1"
      >
        <oge-grid
          [data]="source"
          [paging]="{ pageSize: 12 }"
          [filterRow]="true"
          [searchPanel]="true"
          [headerFilter]="true"
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
        </oge-grid>
        <oge-card
          stylingMode="filled"
          size="sm"
          class="request-log max-h-[560px]"
          style="overflow: auto"
          role="complementary"
        >
          <h3 class="!mt-0 mb-2 text-sm font-semibold">Request log</h3>
          <ol
            reversed
            class="m-0 list-decimal pl-4 font-mono text-xs leading-relaxed"
          >
            @for (entry of server.requestLog(); track entry) {
              <li class="break-all">{{ entry }}</li>
            }
          </ol>
        </oge-card>
      </div>
    </app-demo-card>

    <h3>Cursor-paginated endpoints</h3>
    <p>
      Many APIs page with a cursor (<code>?after=…</code> →
      <code>{{ '{' }} items, nextCursor {{ '}' }}</code
      >) and have no offset to jump to. <code>CursorDataSource</code> adapts one
      to the grid: pair it with infinite scrolling and it walks the cursor chain
      as you scroll, fetching each page once. The total stays open until the
      last page arrives; a new sort, filter or search restarts from the first
      page.
    </p>
    <app-demo-card
      [chips]="['CursorDataSource', 'infinite scrolling']"
      [code]="cursorSnippet"
      language="ts"
    >
      <oge-grid
        [data]="cursorSource"
        keyField="id"
        [scrolling]="{ mode: 'infinite' }"
        [filterRow]="true"
        style="height: 420px"
      >
        <oge-column field="id" caption="Id" [width]="70" dataType="number" />
        <oge-column field="firstName" caption="First Name" />
        <oge-column field="department" caption="Department" />
        <oge-column field="salary" caption="Salary" dataType="number" />
      </oge-grid>
    </app-demo-card>

    <h3>Notes</h3>
    <ul>
      <li>
        <code>LoadOptions</code> is a plain serializable object — post it to a
        .NET / Node endpoint as-is and return
        <code>{{ '{' }} data, totalCount {{ '}' }}</code
        >.
      </li>
      <li>
        Every option carries an <code>AbortSignal</code>: when the state changes
        mid-flight, the stale request is aborted and can never overwrite newer
        data.
      </li>
      <li>
        Filter typing is debounced (<code>filterDebounce</code>, default
        300&nbsp;ms) so one settled interaction equals one request.
      </li>
      <li>
        The header filter's distinct values come from the optional
        <code>distinct()</code> delegate.
      </li>
    </ul>
  `,
})
export class RemoteDataPage {
  protected readonly server = inject(FakeEmployeeServer);
  protected readonly snippet = SNIPPET;
  protected readonly cursorSnippet = CURSOR_SNIPPET;

  protected readonly source = new CustomDataSource<Employee>({
    key: 'id',
    load: (options) => this.server.load(options),
    distinct: (field, options) => this.server.distinct(field, options),
  });

  /**
   * A simulated cursor endpoint (its own data, so the request log above stays
   * the first demo's): the cursor is the next offset, opaque to the grid.
   */
  private readonly cursorBackend = new ArrayDataSource(
    makeEmployees(5_000, 7),
    {
      key: 'id',
    },
  );
  protected readonly cursorSource = new CursorDataSource<Employee, number>({
    key: 'id',
    pageSize: 40,
    fetchPage: async ({ cursor, pageSize, ...query }) => {
      const skip = cursor ?? 0;
      await new Promise((resolve) => setTimeout(resolve, 150));
      const page = await this.cursorBackend.load({
        ...query,
        skip,
        take: pageSize,
        requireTotalCount: true,
      });
      const items = page.data as readonly Employee[];
      const next = skip + items.length;
      return {
        items,
        nextCursor:
          page.totalCount !== undefined && next < page.totalCount ? next : null,
      };
    },
  });
}
