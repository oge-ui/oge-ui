import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import {
  createElement,
  useCallback,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { OgeChart } from '@oge-ui/react-charts';
import {
  OgePivotGrid,
  type OgePivotCellClickEvent,
  type OgePivotChartData,
  type OgePivotFieldDef,
  type OgePivotGridHandle,
} from '@oge-ui/react-pivot';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import {
  pivotRowIndexOf,
  type PivotChartType,
} from '../pivot-grid/chart-integration-model';
import {
  makeOverviewSales,
  money,
  type Sale,
} from '../pivot-grid/pivot-demo-data';
import { PIVOT_CHART_DEMOS } from './chart-integration-snippets';

const sales = makeOverviewSales(400);

const FIELDS: OgePivotFieldDef<Sale>[] = [
  { dataField: 'region', area: 'row' },
  { dataField: 'country', area: 'row' },
  { dataField: 'date', caption: 'Year', area: 'column', groupInterval: 'year' },
  {
    dataField: 'amount',
    caption: 'Amount',
    area: 'data',
    summaryType: 'sum',
    format: money,
  },
];

const TYPES: readonly PivotChartType[] = ['bar', 'stackedBar', 'line'];
const EMPTY: OgePivotChartData<PivotChartType> = { dataSource: [], series: [] };

/** The pivot, the chart below it and the same controls as the Angular page. */
function ChartDemo(): ReactNode {
  const pivot = useRef<OgePivotGridHandle<Sale>>(null);
  const [type, setType] = useState<PivotChartType>('bar');
  const [selected, setSelected] = useState<number[] | undefined>(undefined);
  const [chart, setChart] = useState(EMPTY);
  const refresh = useCallback(
    (nextType = type, nextSelected = selected) => {
      if (!pivot.current) return;
      setChart(
        pivot.current.getChartData<PivotChartType>({
          type: nextType,
          argumentIndexes: nextSelected,
        }),
      );
    },
    [type, selected],
  );
  const select = (event: OgePivotCellClickEvent): void => {
    if (!pivot.current) return;
    const index = pivotRowIndexOf(
      pivot.current.getResult().rowRoot,
      event.rowPath,
    );
    const next = index === undefined ? undefined : [index];
    setSelected(next);
    refresh(type, next);
  };
  return createElement(
    'div',
    null,
    createElement(
      'div',
      { className: 'mb-2 flex flex-wrap items-center justify-between gap-3' },
      createElement(
        'span',
        { className: 'text-sm text-gray-500 dark:text-gray-400' },
        'Expand a region, click a value cell to chart that row only (click a grand-total cell to reset).',
      ),
      createElement(
        'span',
        { className: 'flex items-center gap-1.5' },
        ...TYPES.map((candidate) =>
          createElement(
            'button',
            {
              key: candidate,
              type: 'button',
              className:
                candidate === type
                  ? 'oge-tool-btn oge-tool-text-btn oge-btn-accent'
                  : 'oge-tool-btn oge-tool-text-btn',
              'aria-pressed': candidate === type,
              onClick: () => {
                setType(candidate);
                refresh(candidate);
              },
            },
            candidate,
          ),
        ),
      ),
    ),
    createElement(OgePivotGrid<Sale>, {
      ref: pivot,
      data: sales,
      fields: FIELDS,
      fieldPanel: false,
      style: { maxHeight: '340px' },
      onResultChange: () => refresh(),
      onCellClick: select,
    }),
    createElement(
      'div',
      { className: 'mt-4', 'data-testid': 'pivot-chart' },
      createElement(OgeChart, {
        dataSource: chart.dataSource,
        series: chart.series,
        title: 'Amount by region',
        style: { height: '320px' },
      }),
    ),
  );
}

/**
 * The React half of the pivot chart-integration page — `<OgePivotGrid>` and
 * `<OgeChart>` linked through `getChartData()` + `onResultChange`.
 */
@Component({
  selector: 'app-react-pivot-chart-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../../../../../../packages/react/pivot/src/styles.scss',
    '../../../../../../packages/react/charts/src/styles.scss',
  ],
  template: `
    <app-demo-card
      [chips]="['expand state', 'cell click selection', 'bar / stacked / line']"
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="chartDemo" />
    </app-demo-card>

    <h3>Notes</h3>
    <ul>
      <li>
        Options: <code>argumentAxis</code>, <code>measures</code>,
        <code>includeTotals</code> / <code>includeGrandTotals</code>,
        <code>argumentIndexes</code> / <code>seriesIndexes</code> (a selection),
        <code>type</code> and <code>pathSeparator</code>.
      </li>
      <li>
        The adapter is <code>toChartSeries(result)</code> in
        <code>&#64;oge-ui/pivot-engine</code> — plain data, no chart import — so
        <code>&#64;oge-ui/react-pivot</code> keeps no dependency on
        <code>&#64;oge-ui/react-charts</code>.
      </li>
    </ul>
  `,
})
export class ReactPivotChartDemos {
  protected readonly demos = PIVOT_CHART_DEMOS;
  protected readonly chartDemo = () => createElement(ChartDemo);
}
