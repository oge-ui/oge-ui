import { ChangeDetectionStrategy, Component } from '@angular/core';
import { OgeColumn, OgeDetailTemplate, OgeGrid } from '@oge-ui/grid';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { makeEmployees } from '../../shared/demo-data';
import { SNIPPET } from './master-detail-snippets';

@Component({
  selector: 'app-master-detail',
  imports: [OgeGrid, OgeColumn, OgeDetailTemplate, DemoCard, DocHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Master-Detail"
      [chips]="['ogeDetailTemplate', 'detailRowHeight', 'treegrid']"
    >
      <p>
        Expand a row to render any component or template underneath it —
        <code>*ogeDetailTemplate</code> receives the parent row with full
        typing.
      </p>
    </app-doc-header>

    <app-demo-card [chips]="['typed context']" [code]="snippet" language="ts">
      <oge-grid [data]="employees" keyField="id">
        <oge-column field="id" caption="Id" [width]="70" dataType="number" />
        <oge-column field="firstName" caption="First Name" />
        <oge-column field="lastName" caption="Last Name" />
        <oge-column field="department" caption="Department" />
        <oge-column field="city" caption="City" />
        <div
          *ogeDetailTemplate="let employee of employees"
          class="grid grid-cols-3 gap-4 max-sm:grid-cols-1"
        >
          <div
            class="rounded-md border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
          >
            <div
              class="text-[11px] font-semibold uppercase tracking-wider text-gray-400"
            >
              Employee
            </div>
            <div
              class="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100"
            >
              {{ employee.firstName }} {{ employee.lastName }}
            </div>
            <div class="text-sm text-gray-500 dark:text-gray-400">
              #{{ employee.id }} · {{ employee.department }}
            </div>
          </div>
          <div
            class="rounded-md border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
          >
            <div
              class="text-[11px] font-semibold uppercase tracking-wider text-gray-400"
            >
              Location
            </div>
            <div class="mt-1 text-sm text-gray-700 dark:text-gray-300">
              {{ employee.city }}
            </div>
          </div>
          <div
            class="rounded-md border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
          >
            <div
              class="text-[11px] font-semibold uppercase tracking-wider text-gray-400"
            >
              Compensation
            </div>
            <div class="mt-1 text-sm text-gray-700 dark:text-gray-300">
              ₺{{ employee.salary.toLocaleString('tr-TR') }}
            </div>
            <div class="text-sm text-gray-500 dark:text-gray-400">
              since {{ employee.hireDate }}
            </div>
          </div>
        </div>
      </oge-grid>
    </app-demo-card>

    <h3>Notes</h3>
    <ul>
      <li>
        The detail area renders <em>any</em> template or component — nested
        grids, forms, charts.
      </li>
      <li>
        Detail rows work together with grouping, selection and virtual
        scrolling; in virtual mode set <code>detailRowHeight</code> so the
        scrollbar stays accurate.
      </li>
      <li>
        Expansion state is client-side only; expanding a row never refetches
        data.
      </li>
      <li>
        The grid switches its ARIA role to <code>treegrid</code> automatically
        when detail rows are enabled.
      </li>
    </ul>
  `,
})
export class MasterDetailPage {
  protected readonly employees = makeEmployees(100);
  protected readonly snippet = SNIPPET;
}
