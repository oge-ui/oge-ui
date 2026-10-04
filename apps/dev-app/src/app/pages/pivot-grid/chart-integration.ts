import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { OgeChart } from '@oge-ui/charts';
import {
  OgePivotField,
  OgePivotGrid,
  type OgePivotCellClickEvent,
  type OgePivotChartData,
} from '@oge-ui/pivot';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { ReactPivotChartDemos } from '../react-pivot/chart-integration';
import {
  pivotRowIndexOf,
  type PivotChartType,
} from './chart-integration-model';
import { CHART_SNIPPET } from './chart-integration-snippets';
import { makeOverviewSales, money, type Sale } from './pivot-demo-data';

@Component({
  selector: 'app-pivot-chart-integration',
  imports: [
    OgePivotGrid,
    OgePivotField,
    OgeChart,
    DemoCard,
    DocHeader,
    ReactPivotChartDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Chart Integration"
      category="Pivot Grid"
      [chips]="['getChartData', 'resultChange', 'toChartSeries', 'selection']"
    >
      <p>
        <code>getChartData()</code> turns the current pivot view into
        <code>dataSource</code> + <code>series</code> for
        <code>&lt;oge-chart&gt;</code>: one argument per visible row line, one
        series per column line × measure. Expanding, collapsing, filtering or
        re-pivoting fires <code>resultChange</code>, so a linked chart follows
        the grid; a clicked row narrows the chart to that row.
      </p>
    </app-doc-header>

    @if (fw.isReact()) {
      <app-react-pivot-chart-demos />
    } @else {
      <app-demo-card
        [chips]="[
          'expand state',
          'cell click selection',
          'bar / stacked / line',
        ]"
        [code]="snippet"
        language="ts"
      >
        <div class="mb-2 flex flex-wrap items-center justify-between gap-3">
          <span class="text-sm text-gray-500 dark:text-gray-400">
            Expand a region, click a value cell to chart that row only (click a
            grand-total cell to reset).
          </span>
          <span class="flex items-center gap-1.5">
            @for (type of types; track type) {
              <button
                type="button"
                class="oge-tool-btn oge-tool-text-btn"
                [class.oge-btn-accent]="chartType() === type"
                [attr.aria-pressed]="chartType() === type"
                (click)="setType(type)"
              >
                {{ type }}
              </button>
            }
          </span>
        </div>
        <oge-pivot-grid
          #pivot
          [data]="sales"
          [fieldPanel]="false"
          style="max-height: 340px"
          (resultChange)="refresh()"
          (cellClick)="select($event)"
        >
          <oge-pivot-field dataField="region" area="row" />
          <oge-pivot-field dataField="country" area="row" />
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
        <oge-chart
          class="mt-4 block"
          data-testid="pivot-chart"
          [dataSource]="chart().dataSource"
          [series]="chart().series"
          title="Amount by region"
          style="height: 320px"
        />
      </app-demo-card>

      <h3>Notes</h3>
      <ul>
        <li>
          Options: <code>argumentAxis</code> (<code>'row'</code> /
          <code>'column'</code>), <code>measures</code>,
          <code>includeTotals</code> / <code>includeGrandTotals</code>,
          <code>argumentIndexes</code> / <code>seriesIndexes</code> (a
          selection), <code>type</code> and <code>pathSeparator</code>.
        </li>
        <li>
          The adapter is <code>toChartSeries(result)</code> in
          <code>&#64;oge-ui/pivot-engine</code> — plain data, no chart import —
          so the commercial pivot packages keep no dependency on
          <code>&#64;oge-ui/charts</code>.
        </li>
        <li>
          Calculated measures (see Calculated Fields) chart like any other
          measure.
        </li>
      </ul>
    }
  `,
})
export class PivotChartIntegrationPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sales = makeOverviewSales(400);
  protected readonly money = money;
  protected readonly snippet = CHART_SNIPPET;
  protected readonly types: readonly PivotChartType[] = [
    'bar',
    'stackedBar',
    'line',
  ];
  protected readonly chartType = signal<PivotChartType>('bar');
  protected readonly chart = signal<OgePivotChartData<PivotChartType>>({
    dataSource: [],
    series: [],
  });
  private readonly selected = signal<number[] | undefined>(undefined);

  // optional: the React view renders no Angular pivot
  private readonly pivot = viewChild<OgePivotGrid<Sale>>('pivot');

  protected refresh(): void {
    const pivot = this.pivot();
    if (!pivot) return;
    this.chart.set(
      pivot.getChartData<PivotChartType>({
        type: this.chartType(),
        argumentIndexes: this.selected(),
      }),
    );
  }

  protected setType(type: PivotChartType): void {
    this.chartType.set(type);
    this.refresh();
  }

  protected select(event: OgePivotCellClickEvent): void {
    const pivot = this.pivot();
    if (!pivot) return;
    const index = pivotRowIndexOf(pivot.getResult().rowRoot, event.rowPath);
    this.selected.set(index === undefined ? undefined : [index]);
    this.refresh();
  }
}
