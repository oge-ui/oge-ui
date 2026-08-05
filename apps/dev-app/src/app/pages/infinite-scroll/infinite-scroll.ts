import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CustomDataSource } from '@oge-ui/core';
import { OgeColumn, OgeGrid } from '@oge-ui/grid';
import { DemoCard, type DemoFile } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { makeEmployeeAt, type Employee } from '../../shared/demo-data';

const TOTAL = 1_000_000;

const FILES: DemoFile[] = [
  {
    name: 'employees.component.ts',
    language: 'ts',
    code: `import { CustomDataSource } from '@oge-ui/core';

const TOTAL = 1_000_000;

export class EmployeesComponent {
  // The grid asks for 100-row blocks as you scroll; nothing else is fetched.
  readonly employees = new CustomDataSource<Employee>({
    key: 'id',
    load: async ({ skip = 0, take = 100 }) => {
      const response = await fetch(\`/api/employees?skip=\${skip}&take=\${take}\`);
      const { data } = await response.json();
      return { data, totalCount: TOTAL };
    },
  });
}`,
  },
  {
    name: 'employees.component.html',
    language: 'html',
    code: `<!-- remote virtual scrolling: sparse 100-row blocks over 1M rows -->
<oge-grid [data]="employees" keyField="id"
          [scrolling]="{ mode: 'virtual', remote: true }"
          [sortable]="false" class="h-[560px]">
  <oge-column field="id" caption="Id" [width]="110" dataType="number" />
  <oge-column field="firstName" caption="First Name" />
  <oge-column field="lastName" caption="Last Name" />
  <oge-column field="department" caption="Department" />
  <oge-column field="city" caption="City" />
  <oge-column field="salary" caption="Salary" dataType="number" />
</oge-grid>`,
  },
];

@Component({
  selector: 'app-infinite-scroll',
  imports: [OgeGrid, OgeColumn, DemoCard, DocHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header title="Infinite &amp; Remote Virtual Scroll" [chips]="['scrolling', 'remote', 'CustomDataSource']">
      <p>
        One million rows, none of them preloaded. The grid fetches sparse 100-row blocks around
        the viewport as you scroll — drag the scrollbar to the middle and only that block is
        requested; everything in between is skipped. Rows still loading render as skeletons.
      </p>
    </app-doc-header>

    <app-demo-card [chips]="['1.000.000 rows', '150ms latency']" [files]="files">
      <oge-grid
        [data]="employees"
        keyField="id"
        [scrolling]="{ mode: 'virtual', remote: true }"
        [sortable]="false"
        style="height: 560px"
      >
        <oge-column field="id" caption="Id" [width]="110" dataType="number" />
        <oge-column field="firstName" caption="First Name" />
        <oge-column field="lastName" caption="Last Name" />
        <oge-column field="department" caption="Department" />
        <oge-column field="city" caption="City" />
        <oge-column field="salary" caption="Salary" dataType="number" />
      </oge-grid>
    </app-demo-card>

    <h3>Scrolling modes</h3>
    <ul>
      <li><code>mode: 'virtual'</code> with <code>remote: true</code> — the scrollbar reflects the full <code>totalCount</code>; blocks load on demand with block-level caching and de-duplication.</li>
      <li><code>mode: 'infinite'</code> — same block fetching, but the scroll space grows as the user reaches the end; a <code>totalCount</code> is not required.</li>
      <li>Sorting or filtering invalidates the block cache and reloads around the current position — the request carries the usual <code>LoadOptions</code>, so the server stays in charge.</li>
    </ul>
  `,
})
export class InfiniteScrollPage {
  protected readonly files = FILES;

  protected readonly employees = new CustomDataSource<Employee>({
    key: 'id',
    load: async ({ skip = 0, take = 100 }) => {
      // fake server: ~150ms latency, rows generated on demand from the index
      await new Promise((resolve) => setTimeout(resolve, 150));
      const count = Math.max(0, Math.min(take, TOTAL - skip));
      const data = Array.from({ length: count }, (_, i) => makeEmployeeAt(skip + i));
      return { data, totalCount: TOTAL };
    },
  });
}
