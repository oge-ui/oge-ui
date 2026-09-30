import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useRef, type ReactNode } from 'react';
import {
  OgePivotGrid,
  type OgePivotFieldDef,
  type OgePivotGridHandle,
} from '@oge-ui/react-pivot';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import {
  makeAnalyticsSales,
  money,
  type Sale,
} from '../pivot-grid/pivot-demo-data';
import { PIVOT_ANALYTICS_DEMOS } from './analytics-snippets';

const bigSales = makeAnalyticsSales(50000);
const sales = makeAnalyticsSales(5000);

const ANALYTICS_FIELDS: OgePivotFieldDef<Sale>[] = [
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
  {
    dataField: 'amount',
    id: 'share',
    caption: '% of Column',
    area: 'data',
    summaryType: 'sum',
    summaryDisplayMode: 'percentOfColumnGrandTotal',
  },
];

const REPORT_FIELDS: OgePivotFieldDef<Sale>[] = [
  { dataField: 'region', area: 'row' },
  { dataField: 'city', area: 'row' },
  { dataField: 'date', caption: 'Year', area: 'column', groupInterval: 'year' },
  {
    dataField: 'amount',
    caption: 'Amount',
    area: 'data',
    summaryType: 'sum',
    format: money,
  },
  { dataField: 'units', caption: 'Units', area: 'data', summaryType: 'sum' },
];

type Shape =
  | { line: [number, number, number, number] }
  | { path: string }
  | { polyline: string }
  | { rect: [number, number, number, number, number] };

/** The same stroke icons the Angular page draws inline. */
function icon(shapes: readonly Shape[], round = true): ReactNode {
  return createElement(
    'svg',
    {
      viewBox: '0 0 24 24',
      width: 13,
      height: 13,
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 2,
      strokeLinecap: 'round',
      strokeLinejoin: round ? 'round' : undefined,
      'aria-hidden': true,
    },
    ...shapes.map((shape, key) => {
      if ('line' in shape) {
        const [x1, y1, x2, y2] = shape.line;
        return createElement('line', { key, x1, y1, x2, y2 });
      }
      if ('path' in shape) return createElement('path', { key, d: shape.path });
      if ('polyline' in shape)
        return createElement('polyline', { key, points: shape.polyline });
      const [x, y, width, height, rx] = shape.rect;
      return createElement('rect', { key, x, y, width, height, rx });
    }),
  );
}

const SLIDERS: Shape[] = [
  { line: [4, 21, 4, 14] },
  { line: [4, 10, 4, 3] },
  { line: [12, 21, 12, 12] },
  { line: [12, 8, 12, 3] },
  { line: [20, 21, 20, 16] },
  { line: [20, 12, 20, 3] },
  { line: [1, 14, 7, 14] },
  { line: [9, 8, 15, 8] },
  { line: [17, 16, 23, 16] },
];

const FILE: Shape[] = [
  { path: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' },
  { polyline: '14 2 14 8 20 8' },
  { line: [8, 13, 16, 13] },
  { line: [8, 17, 16, 17] },
];

const SHEET: Shape[] = [
  { rect: [3, 3, 18, 18, 2] },
  { line: [3, 9, 21, 9] },
  { line: [3, 15, 21, 15] },
  { line: [12, 3, 12, 21] },
];

const BUTTON = 'oge-tool-btn oge-tool-text-btn';
const HINT = 'text-sm text-gray-500 dark:text-gray-400';
const BAR = 'mb-2 flex items-center justify-between gap-3';

/** Card 1: 50 000 rows, virtual scrolling, a percent-of-column measure. */
function AnalyticsDemo(): ReactNode {
  const pivot = useRef<OgePivotGridHandle<Sale>>(null);
  return createElement(
    'div',
    null,
    createElement(
      'div',
      { className: BAR },
      createElement(
        'span',
        { className: HINT },
        'Right-click a header for sorting and filters; the second measure shows each column’s share of its grand total.',
      ),
      createElement(
        'button',
        {
          type: 'button',
          className: BUTTON,
          onClick: () => pivot.current?.showFieldChooser(),
        },
        icon(SLIDERS, false),
        ' Field chooser',
      ),
    ),
    createElement(OgePivotGrid<Sale>, {
      ref: pivot,
      data: bigSales,
      fields: ANALYTICS_FIELDS,
      virtualScrolling: true,
      style: { maxHeight: '520px' },
    }),
  );
}

/** Card 2: stateKey persistence, CSV and the lazy Excel entry. */
function ReportDemo(): ReactNode {
  const pivot = useRef<OgePivotGridHandle<Sale>>(null);
  const exportExcel = async (): Promise<void> => {
    const { exportPivotToExcel } =
      await import('@oge-ui/react-pivot/export-excel');
    if (pivot.current)
      await exportPivotToExcel(pivot.current, { filename: 'sales.xlsx' });
  };
  return createElement(
    'div',
    null,
    createElement(
      'div',
      { className: BAR },
      createElement(
        'span',
        { className: HINT },
        'Re-pivot or expand something, reload the page — the layout comes back.',
      ),
      createElement(
        'span',
        { className: 'flex items-center gap-1.5' },
        createElement(
          'button',
          {
            type: 'button',
            className: BUTTON,
            onClick: () => pivot.current?.exportCsv('sales.csv'),
          },
          icon(FILE),
          ' CSV',
        ),
        createElement(
          'button',
          {
            type: 'button',
            className: `${BUTTON} oge-btn-accent`,
            onClick: () => void exportExcel(),
          },
          icon(SHEET),
          ' Excel',
        ),
      ),
    ),
    createElement(OgePivotGrid<Sale>, {
      ref: pivot,
      data: sales,
      fields: REPORT_FIELDS,
      stateKey: 'demo-pivot-report-react',
      style: { maxHeight: '460px' },
    }),
  );
}

/**
 * The React half of the pivot analytics page — the same two cards as the
 * Angular page (display modes over 50 000 virtualized rows; stateKey + CSV +
 * Excel), rendered as real React trees inside
 * `/components/pivot-grid/analytics` when the reader has chosen React.
 */
@Component({
  selector: 'app-react-pivot-analytics-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../../../../packages/react/pivot/src/styles.scss'],
  template: `
    <app-demo-card
      [chips]="['50.000 rows', 'percent of column', 'running total', 'virtual']"
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="analytics" />
    </app-demo-card>

    <app-demo-card
      [chips]="['stateKey', 'exportCsv', 'export-excel entry']"
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="report" />
    </app-demo-card>
  `,
})
export class ReactPivotAnalyticsDemos {
  protected readonly demos = PIVOT_ANALYTICS_DEMOS;
  protected readonly analytics = () => createElement(AnalyticsDemo);
  protected readonly report = () => createElement(ReportDemo);
}
