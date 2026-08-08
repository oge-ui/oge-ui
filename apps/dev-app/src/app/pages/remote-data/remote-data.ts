import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CustomDataSource } from '@oge-ui/core';
import { OgeColumn, OgeGrid } from '@oge-ui/grid';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FakeEmployeeServer } from '../../shared/fake-server';
import type { Employee } from '../../shared/demo-data';
import { SNIPPET } from './remote-data-snippets';

@Component({
  selector: 'app-remote-data',
  imports: [OgeGrid, OgeColumn, DemoCard, DocHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Remote Data"
      [chips]="['CustomDataSource', 'LoadOptions', 'AbortSignal']"
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
        <aside
          class="request-log max-h-[560px] overflow-auto rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 dark:border-gray-800 dark:bg-gray-900"
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
        </aside>
      </div>
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

  protected readonly source = new CustomDataSource<Employee>({
    key: 'id',
    load: (options) => this.server.load(options),
    distinct: (field, options) => this.server.distinct(field, options),
  });
}
