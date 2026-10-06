import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  OgeChart,
  OgeCircularGauge,
  OgeHeatmap,
  OgePieChart,
  OgeSankeyChart,
  type OgeChartSeriesInput,
} from '@oge-ui/charts';
import type { SsrFamily } from '../render';

@Component({
  selector: 'app-ssr-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    OgeChart,
    OgePieChart,
    OgeCircularGauge,
    OgeHeatmap,
    OgeSankeyChart,
  ],
  template: `
    <oge-chart
      [dataSource]="revenue"
      [series]="series"
      title="Quarterly revenue"
      style="height: 320px"
    />
    <oge-pie-chart
      [dataSource]="channels"
      argumentField="channel"
      valueField="share"
      style="height: 240px"
    />
    <oge-circular-gauge
      [value]="72"
      [scale]="{ min: 0, max: 160, tickInterval: 20 }"
      title="Speed"
      style="height: 220px"
    />
    <oge-heatmap
      [dataSource]="tickets"
      xField="hour"
      yField="day"
      valueField="tickets"
      style="height: 220px"
    />
    <oge-sankey-chart [dataSource]="flows" style="height: 260px" />
  `,
})
class ChartsHost {
  protected readonly revenue = [
    { quarter: 'Q1', product: 120, services: 60 },
    { quarter: 'Q2', product: 150, services: 74 },
    { quarter: 'Q3', product: 138, services: 90 },
  ];
  protected readonly series: OgeChartSeriesInput[] = [
    { type: 'bar', argumentField: 'quarter', valueField: 'product' },
    { type: 'line', argumentField: 'quarter', valueField: 'services' },
  ];
  protected readonly channels = [
    { channel: 'Search', share: 48 },
    { channel: 'Social', share: 32 },
    { channel: 'Direct', share: 20 },
  ];
  protected readonly tickets = [
    { day: 'Mon', hour: '09', tickets: 4 },
    { day: 'Mon', hour: '10', tickets: 7 },
    { day: 'Tue', hour: '09', tickets: 2 },
  ];
  protected readonly flows = [
    { source: 'Solar', target: 'Grid', value: 12 },
    { source: 'Wind', target: 'Grid', value: 20 },
    { source: 'Grid', target: 'Homes', value: 32 },
  ];
}

export const CHARTS: SsrFamily = {
  name: 'charts',
  host: ChartsHost,
  expect: [
    'oge-chart',
    'oge-pie-chart',
    'oge-circular-gauge',
    'oge-heatmap',
    'oge-sankey-chart',
    'Quarterly revenue',
  ],
};
