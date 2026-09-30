import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useState, type ReactNode } from 'react';
import {
  OgePivotGrid,
  type OgePivotCellClickEvent,
  type OgePivotFieldDef,
} from '@oge-ui/react-pivot';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import {
  makeOverviewSales,
  money,
  type Sale,
} from '../pivot-grid/pivot-demo-data';
import { PIVOT_OVERVIEW_DEMOS } from './overview-snippets';

const sales = makeOverviewSales(5000);

const FIELDS: OgePivotFieldDef<Sale>[] = [
  { dataField: 'region', area: 'row' },
  { dataField: 'country', area: 'row' },
  { dataField: 'city', area: 'row' },
  { dataField: 'date', caption: 'Year', area: 'column', groupInterval: 'year' },
  {
    dataField: 'amount',
    caption: 'Amount',
    area: 'data',
    summaryType: 'sum',
    format: money,
  },
];

const describe = (event: OgePivotCellClickEvent): string =>
  `[${event.rowPath.map(String).join(' / ') || 'Grand'}] × [${event.columnPath.map(String).join(' / ') || 'Grand'}]`;

/** The overview demo as real React state: the clicked cell's coordinates. */
function OverviewDemo(): ReactNode {
  const [lastCell, setLastCell] = useState('');
  return createElement(
    'div',
    null,
    createElement(
      'div',
      { className: 'mb-2 text-sm text-gray-500 dark:text-gray-400' },
      'Click headers to expand / collapse.',
      lastCell
        ? createElement(
            'span',
            {
              className:
                'ml-2 rounded bg-gray-100 px-2 py-0.5 font-mono text-xs dark:bg-gray-800',
            },
            lastCell,
          )
        : null,
    ),
    createElement(OgePivotGrid<Sale>, {
      data: sales,
      fields: FIELDS,
      style: { maxHeight: '560px' },
      onCellClick: (event) => setLastCell(describe(event)),
    }),
  );
}

/**
 * The React half of the pivot-grid overview — the same demo as the Angular
 * page (5 000 rows, three row fields, year columns), rendered as a real React
 * tree inside `/components/pivot-grid` when the reader has chosen React
 * (ADR 0002).
 */
@Component({
  selector: 'app-react-pivot-overview-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The React pivot carries the class names but no styles of its own — the
  // docs pull the same SCSS the package build compiles.
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../../../../packages/react/pivot/src/styles.scss'],
  template: `
    <app-demo-card
      [chips]="['5.000 rows', '3 row fields', 'year columns']"
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="overview" />
    </app-demo-card>
  `,
})
export class ReactPivotOverviewDemos {
  protected readonly demos = PIVOT_OVERVIEW_DEMOS;
  protected readonly overview = () => createElement(OverviewDemo);
}
