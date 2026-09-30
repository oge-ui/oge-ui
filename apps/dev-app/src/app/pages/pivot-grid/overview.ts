import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  OgePivotField,
  OgePivotGrid,
  type OgePivotCellClickEvent,
} from '@oge-ui/pivot';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { ReactPivotOverviewDemos } from '../react-pivot/overview';
import { SNIPPET } from './overview-snippets';
import { makeOverviewSales, money } from './pivot-demo-data';

@Component({
  selector: 'app-pivot-overview',
  imports: [
    OgePivotGrid,
    OgePivotField,
    DemoCard,
    DocHeader,
    ReactPivotOverviewDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Pivot Grid"
      category="Pivot Grid"
      [chips]="
        fw.isReact()
          ? ['OgePivotGrid', 'fields', 'field panel', 'totals']
          : ['oge-pivot-grid', 'oge-pivot-field', 'field panel', 'totals']
      "
    >
      <p>
        Multi-dimensional summaries over flat data: drop fields into the row,
        column, value and filter areas, expand headers on both axes, and read
        sub / grand totals — all computed by the pure engine in
        <code>&#64;oge-ui/core</code>. Drag the field chips between areas to
        re-pivot instantly.
      </p>
    </app-doc-header>

    @if (fw.isReact()) {
      <app-react-pivot-overview-demos />
    } @else {
      <app-demo-card
        [chips]="['5.000 rows', '3 row fields', 'year columns']"
        [code]="snippet"
        language="ts"
      >
        <div class="mb-2 text-sm text-gray-500 dark:text-gray-400">
          Click headers to expand / collapse.
          @if (lastCell()) {
            <span
              class="ml-2 rounded bg-gray-100 px-2 py-0.5 font-mono text-xs dark:bg-gray-800"
              >{{ lastCell() }}</span
            >
          }
        </div>
        <oge-pivot-grid
          [data]="sales"
          style="max-height: 560px"
          (cellClick)="onCell($event)"
        >
          <oge-pivot-field dataField="region" area="row" />
          <oge-pivot-field dataField="country" area="row" />
          <oge-pivot-field dataField="city" area="row" />
          <oge-pivot-field
            dataField="date"
            caption="Year"
            area="column"
            groupInterval="year"
          />
          <oge-pivot-field
            dataField="amount"
            caption="Amount"
            area="data"
            summaryType="sum"
            [format]="money"
          />
        </oge-pivot-grid>
      </app-demo-card>
    }

    <h3>Notes</h3>
    <ul>
      <li>
        The engine interns axis paths and accumulates cells in a single pass;
        expanding or collapsing a header only re-materializes the visible
        matrix.
      </li>
      <li>
        An expanded group keeps its own line, which carries the subtotals —
        collapse it from the same line.
      </li>
      <li>
        <code>groupInterval</code> buckets dates
        (<code>year</code>/<code>quarter</code>/<code>month</code>/…) or numbers
        (bucket size).
      </li>
      <li>
        <code>summaryType</code>: sum · count · avg · min · max · custom (with
        <code>calculateCustomSummary</code>); display modes (percent-of, running
        totals, variations) ship in the engine.
      </li>
      <li>
        <code>drillDown(rowPath, columnPath)</code> returns the raw rows behind
        any cell —
        @if (fw.isReact()) {
          on the <code>ref</code> handle, with the coordinates from
          <code>onCellClick</code> / <code>onCellDblClick</code>.
        } @else {
          on the component, with the coordinates from
          <code>(cellClick)</code> / <code>(cellDblClick)</code>.
        }
      </li>
    </ul>
  `,
})
export class PivotOverviewPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sales = makeOverviewSales(5000);
  protected readonly snippet = SNIPPET;
  protected readonly lastCell = signal('');

  protected readonly money = money;

  protected onCell(event: OgePivotCellClickEvent): void {
    this.lastCell.set(
      `[${event.rowPath.map(String).join(' / ') || 'Grand'}] × [${event.columnPath.map(String).join(' / ') || 'Grand'}]`,
    );
  }
}
