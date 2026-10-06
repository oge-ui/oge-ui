import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  inject,
} from '@angular/core';
import { createElement, type ReactNode } from 'react';
import {
  ArrayDataSource,
  CursorDataSource,
  CustomDataSource,
} from '@oge-ui/core';
import { OgeGrid, type OgeGridColumnProps } from '@oge-ui/react-grid';
import { OgeCard } from '@oge-ui/layout';
import { DemoCard } from '../../shared/demo-card';
import { FakeEmployeeServer } from '../../shared/fake-server';
import { makeEmployees, type Employee } from '../../shared/demo-data';
import { ReactHost } from '../../shared/react-host';
import { GRID_REMOTE_DATA_DEMOS } from './remote-data-snippets';

const SERVER_COLUMNS: OgeGridColumnProps<Employee>[] = [
  {
    field: 'id',
    caption: 'Id',
    width: 70,
    dataType: 'number',
    filterable: false,
  },
  { field: 'firstName', caption: 'First Name' },
  { field: 'lastName', caption: 'Last Name' },
  { field: 'department', caption: 'Department' },
  { field: 'city', caption: 'City' },
  { field: 'salary', caption: 'Salary', dataType: 'number' },
];

const CURSOR_COLUMNS: OgeGridColumnProps<Employee>[] = [
  { field: 'id', caption: 'Id', width: 70, dataType: 'number' },
  { field: 'firstName', caption: 'First Name' },
  { field: 'department', caption: 'Department' },
  { field: 'salary', caption: 'Salary', dataType: 'number' },
];

/**
 * The React half of the remote-data page — the same server-side
 * `CustomDataSource` against the simulated 250 ms backend (with its request
 * log) and the same `CursorDataSource` walking a cursor chain under infinite
 * scrolling, rendered as real React trees inside
 * `/components/data-grid/remote-data` when the reader has chosen React.
 */
@Component({
  selector: 'app-react-grid-remote-data-demos',
  imports: [DemoCard, ReactHost, OgeCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../../../../../../packages/react/grid/src/styles.scss',
    '../../../../../../packages/react/inputs/src/styles.scss',
    '../../shared/react-layout-demo-base.scss',
    '../../../../../../packages/react/overlay/src/styles.scss',
  ],
  template: `
    <app-demo-card
      [chips]="['server-side', '250ms latency']"
      [code]="demos[0].source"
      language="tsx"
    >
      <div
        class="grid grid-cols-[minmax(0,2fr)_minmax(260px,1fr)] items-start gap-4 max-lg:grid-cols-1"
      >
        <app-react-host class="min-w-0" [render]="server" />
        <oge-card
          stylingMode="filled"
          size="sm"
          class="request-log max-h-[560px]"
          style="overflow: auto"
          role="complementary"
          aria-label="Request log"
        >
          <h3 class="!mt-0 mb-2 text-sm font-semibold">Request log</h3>
          <ol
            reversed
            class="m-0 list-decimal pl-4 font-mono text-xs leading-relaxed"
          >
            @for (entry of backend.requestLog(); track entry) {
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
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="cursor" />
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
export class ReactGridRemoteDataDemos {
  protected readonly backend = inject(FakeEmployeeServer);
  protected readonly demos = GRID_REMOTE_DATA_DEMOS;

  private readonly source = new CustomDataSource<Employee>({
    key: 'id',
    load: (options) => this.backend.load(options),
    distinct: (field, options) => this.backend.distinct(field, options),
  });

  /**
   * A simulated cursor endpoint (its own data, so the request log above stays
   * the first demo's): the cursor is the next offset, opaque to the grid.
   */
  private readonly cursorBackend = new ArrayDataSource(
    makeEmployees(5_000, 7),
    { key: 'id' },
  );
  private readonly cursorSource = new CursorDataSource<Employee, number>({
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

  protected readonly server = (): ReactNode =>
    createElement(OgeGrid<Employee>, {
      data: this.source,
      columns: SERVER_COLUMNS,
      paging: { pageSize: 12 },
      filterRow: true,
      searchPanel: true,
      headerFilter: true,
    });

  protected readonly cursor = (): ReactNode =>
    createElement(OgeGrid<Employee>, {
      data: this.cursorSource,
      keyField: 'id',
      columns: CURSOR_COLUMNS,
      scrolling: { mode: 'infinite' },
      filterRow: true,
      style: { height: 420 },
    });
}
