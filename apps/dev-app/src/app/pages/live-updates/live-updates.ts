import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { ArrayDataSource } from '@oge-ui/core';
import { OgeColumn, OgeGrid } from '@oge-ui/grid';
import { DemoCard, type DemoFile } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { makeEmployees, type Employee } from '../../shared/demo-data';

const FILES: DemoFile[] = [
  {
    name: 'ticker.component.ts',
    language: 'ts',
    code: `import { ArrayDataSource } from '@oge-ui/core';

export class TickerComponent {
  readonly employees = new ArrayDataSource(makeEmployees(200), { key: 'id' });

  constructor() {
    // any push source works: WebSocket, SSE, SignalR…
    setInterval(() => {
      this.employees.push([
        { type: 'update', key: randomId(), patch: { salary: randomSalary() } },
      ]);
    }, 700);
  }
}`,
  },
  {
    name: 'ticker.component.html',
    language: 'html',
    code: `<!-- pure updates patch rows in place — no reload, no scroll jump -->
<oge-grid [data]="employees" keyField="id"
          [paging]="{ pageSize: 10 }" class="h-auto">
  <oge-column field="id" caption="Id" [width]="80" dataType="number" />
  <oge-column field="firstName" caption="First Name" />
  <oge-column field="lastName" caption="Last Name" />
  <oge-column field="salary" caption="Salary" dataType="number" />
</oge-grid>`,
  },
];

@Component({
  selector: 'app-live-updates',
  imports: [OgeGrid, OgeColumn, DemoCard, DocHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header title="Live Updates" [chips]="['DataSource.changes', 'push']">
      <p>
        Any DataSource can expose a <code>changes</code> stream; the grid subscribes and applies
        pushed batches without a reload. Pure <code>update</code> batches patch rows in place —
        sorting, selection and scroll position are untouched — while <code>insert</code> /
        <code>remove</code> re-run the current load so ordering stays correct.
        <code>ArrayDataSource.push()</code> feeds the stream directly; map a WebSocket or SSE feed
        onto it for remote sources.
      </p>
    </app-doc-header>

    <app-demo-card [chips]="['updates every 700ms', updateCount() + ' pushed']" [files]="files">
      <oge-grid [data]="employees" keyField="id" [paging]="{ pageSize: 10 }">
        <oge-column field="id" caption="Id" [width]="80" dataType="number" />
        <oge-column field="firstName" caption="First Name" />
        <oge-column field="lastName" caption="Last Name" />
        <oge-column field="department" caption="Department" />
        <oge-column field="salary" caption="Salary" dataType="number" />
      </oge-grid>
    </app-demo-card>
  `,
})
export class LiveUpdatesPage {
  protected readonly files = FILES;
  protected readonly updateCount = signal(0);

  protected readonly employees = new ArrayDataSource<Employee>(makeEmployees(200), { key: 'id' });

  constructor() {
    const timer = setInterval(() => {
      const key = 1 + Math.floor(Math.random() * 200);
      const salary = 30000 + Math.floor(Math.random() * 90) * 1000;
      this.employees.push([{ type: 'update', key, patch: { salary } }]);
      this.updateCount.update((count) => count + 1);
    }, 700);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }
}
