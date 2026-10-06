import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useState, type ReactNode } from 'react';
import {
  OgeFunnelChart,
  OgeHeatmap,
  OgeSankeyChart,
  OgeSunburstChart,
  OgeTreemap,
  OgeVectorMap,
} from '@oge-ui/react-charts';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import {
  AGE_GROUPS,
  CHANGE,
  CHANGE_SCALE,
  ENERGY,
  ENERGY_NODES,
  MARKETS,
  ORG,
  PIPELINE,
  PROVINCE_GEO,
  PROVINCE_SALES,
  TICKETS,
} from '../charts/specialized-data';
import { CHARTS_SPECIALIZED_DEMOS } from './specialized-snippets';

/** TOC of the React view — the same six sections as the Angular page. */
export const REACT_CHARTS_SPECIALIZED_SECTIONS = [
  'Funnel & pyramid',
  'Heatmap',
  'Treemap',
  'Sunburst',
  'Sankey diagram',
  'Vector map',
] as const;

const signed = (value: number): string =>
  value > 0 ? `+${value}` : String(value);

function TreemapDemo(): ReactNode {
  const [root, setRoot] = useState('');
  return createElement(
    'div',
    null,
    createElement(OgeTreemap, {
      dataSource: MARKETS,
      valueField: 'sales',
      rootKey: root,
      onRootKeyChange: setRoot,
      title: 'Sales by market (M$)',
      style: { height: 380 },
    }),
    createElement(
      'p',
      { className: 'mt-2 text-sm text-slate-600 dark:text-slate-300' },
      'Current root: ',
      createElement('code', null, root || 'all markets'),
    ),
  );
}

/**
 * The React half of the "Funnel, heatmap & flows" page — the same sections,
 * data and options as the Angular page, rendered as real React trees.
 */
@Component({
  selector: 'app-react-charts-specialized-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // the docs pull the same SCSS the package build compiles
  encapsulation: ViewEncapsulation.None,
  styleUrl: '../../../../../../packages/react/charts/src/styles.scss',
  template: `
    <app-demo-card
      [chips]="['dynamicSlope', 'dynamicHeight', 'neck', 'conversion']"
      heading="Funnel & pyramid"
      description="Stages sized by value: <code>dynamicSlope</code> (widths follow the values) or <code>dynamicHeight</code> (heights follow them, one fixed outline narrowing to a <code>neckWidth</code>). <code>type: 'pyramid'</code> puts the apex on top. Labels go inside or <code>outside</code> with connectors; the tooltip, the announcement and the screen-reader table carry the conversion rates."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="funnel" />
    </app-demo-card>

    <app-demo-card
      [chips]="['colour scale', 'diverging', 'grid keys', '2-D table']"
      heading="Heatmap"
      description="A category × category grid coloured through a <code>colorScale</code> — two or more stops (theme tokens work, blended with <code>color-mix()</code>) or <code>segmented</code> bands — with the colour-scale legend, cell labels where they fit and tooltips. Focus the grid: arrows move the active cell, Home/End, Ctrl+Home/End and PageUp/PageDown jump, Enter selects."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="heatmap" />
    </app-demo-card>

    <app-demo-card
      [chips]="['squarified', 'drill-down', 'breadcrumb']"
      heading="Treemap"
      description="Nested rectangles sized by value: squarified tiling (or <code>sliceAndDice</code>), group headers, fitted labels and palette colours per top-level group, lightened by depth — or <code>colorScale</code> by value. Click a group or press Enter to drill in; the breadcrumb or Escape goes back. <code>rootKey</code> + <code>onRootKeyChange</code> is the drill state."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="treemap" />
    </app-demo-card>

    <app-demo-card
      [chips]="['flat data', 'rings', 'drill-down']"
      heading="Sunburst"
      description="The same hierarchy model as rings around a centre — here from flat data (<code>idField</code> + <code>parentField</code>). Segments are sized by value inside their parent's angle; click a branch to re-root on it and the centre (or Escape) to go back up. Arrow keys walk siblings, children and parents."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="sunburst" />
    </app-demo-card>

    <app-demo-card
      [chips]="['flows', 'hover highlight', 'column keys']"
      heading="Sankey diagram"
      description="Flows between nodes, one item per link: columns from the longest path, node heights from the throughput, positions relaxed so bands cross little. Hover a node to light up its links (or a link to light its two ends); the keyboard walks nodes Up/Down within a column and Left/Right across. Cycles are tolerated and the flow mirrors in RTL."
      [code]="demos[4].source"
      language="tsx"
    >
      <app-react-host [render]="sankey" />
    </app-demo-card>

    <app-demo-card
      [chips]="['GeoJSON', 'choropleth', 'zoom & pan', 'region keys']"
      heading="Vector map"
      description="A choropleth over any GeoJSON <code>FeatureCollection</code>: equirectangular or Mercator projection fitted to the box, fills from a colour scale joined by key, labels where they fit. Wheel, pinch or the buttons zoom and dragging pans; focused, the arrow keys move to the nearest region in that direction, + and - zoom, Shift+arrows pan and Enter selects. This fictional country's borders are generated, so neighbours share their edges."
      [code]="demos[5].source"
      language="tsx"
    >
      <app-react-host [render]="map" />
    </app-demo-card>
  `,
})
export class ReactChartsSpecializedDemos {
  protected readonly demos = CHARTS_SPECIALIZED_DEMOS;

  protected readonly funnel = () =>
    createElement(
      'div',
      { className: 'grid gap-3 md:grid-cols-2' },
      createElement(OgeFunnelChart, {
        dataSource: PIPELINE,
        argumentField: 'stage',
        valueField: 'count',
        neckWidth: 0.2,
        label: { position: 'outside' },
        title: 'Sales pipeline',
        style: { height: 320 },
      }),
      createElement(OgeFunnelChart, {
        dataSource: AGE_GROUPS,
        argumentField: 'group',
        valueField: 'people',
        type: 'pyramid',
        algorithm: 'dynamicHeight',
        sortData: false,
        title: 'Population (thousands)',
        style: { height: 320 },
      }),
    );
  protected readonly heatmap = () =>
    createElement(
      'div',
      null,
      createElement(OgeHeatmap, {
        dataSource: TICKETS,
        xField: 'hour',
        yField: 'day',
        valueField: 'tickets',
        title: 'Support tickets by hour',
        style: { height: 340 },
      }),
      createElement(OgeHeatmap, {
        className: 'mt-3',
        dataSource: CHANGE,
        xField: 'quarter',
        yField: 'region',
        valueField: 'change',
        colorScale: CHANGE_SCALE,
        valueFormat: signed,
        title: 'Change vs last year (%)',
        style: { height: 260 },
      }),
    );
  protected readonly treemap = () => createElement(TreemapDemo);
  protected readonly sunburst = () =>
    createElement(OgeSunburstChart, {
      dataSource: ORG,
      parentField: 'parent',
      valueField: 'people',
      title: 'Headcount',
      style: { height: 380 },
    });
  protected readonly sankey = () =>
    createElement(OgeSankeyChart, {
      dataSource: ENERGY,
      nodes: ENERGY_NODES,
      title: 'Energy flows (TWh)',
      style: { height: 380 },
    });
  protected readonly map = () =>
    createElement(OgeVectorMap, {
      geoJson: PROVINCE_GEO,
      dataSource: PROVINCE_SALES,
      keyField: 'province',
      valueField: 'revenue',
      title: 'Revenue by province',
      style: { height: 420 },
    });
}
