import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  OgeFunnelChart,
  OgeHeatmap,
  OgeSankeyChart,
  OgeSunburstChart,
  OgeTreemap,
  OgeVectorMap,
} from '@oge-ui/charts';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_CHARTS_SPECIALIZED_SECTIONS,
  ReactChartsSpecializedDemos,
} from '../react-charts/specialized';
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
} from './specialized-data';
import {
  FUNNEL_SNIPPET,
  HEATMAP_SNIPPET,
  MAP_SNIPPET,
  SANKEY_SNIPPET,
  SUNBURST_SNIPPET,
  TREEMAP_SNIPPET,
} from './specialized-snippets';

const SECTIONS = [
  'Funnel & pyramid',
  'Heatmap',
  'Treemap',
  'Sunburst',
  'Sankey diagram',
  'Vector map',
] as const;

@Component({
  selector: 'app-charts-specialized',
  imports: [
    DemoCard,
    DocHeader,
    OgeFunnelChart,
    OgeHeatmap,
    OgeSankeyChart,
    OgeSunburstChart,
    OgeTreemap,
    OgeVectorMap,
    PageToc,
    ReactChartsSpecializedDemos,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Funnel, heatmap & flows"
      category="Charts"
      categoryLink="/components/charts"
      [chips]="['funnel', 'heatmap', 'treemap', 'sunburst', 'Sankey', 'map']"
    >
      <p>
        The non-cartesian charts, each a model and a layout in the
        framework-free engine both render layers run:
        <strong>funnel and pyramid</strong> with conversion rates, the
        <strong>heatmap</strong> with colour scales and grid keyboard
        navigation, the squarified <strong>treemap</strong> and the
        <strong>sunburst</strong> with drill-down and breadcrumbs, the
        <strong>Sankey</strong> flow diagram with hover highlighting, and a
        GeoJSON <strong>vector map</strong> with choropleth fills, zoom and pan.
        Every chart is keyboard-operable with live announcements and has a
        screen-reader table. Pie, polar and the cartesian series are on the
        <a
          routerLink="/components/charts"
          class="text-indigo-600 underline dark:text-indigo-400"
          >overview</a
        >.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-charts-specialized-demos />
    } @else {
      <app-demo-card
        [chips]="['dynamicSlope', 'dynamicHeight', 'neck', 'conversion']"
        heading="Funnel & pyramid"
        description="Stages sized by value: <code>dynamicSlope</code> (widths follow the values) or <code>dynamicHeight</code> (heights follow them, one fixed outline narrowing to a <code>neckWidth</code>). <code>type: 'pyramid'</code> puts the apex on top. Labels go inside or <code>outside</code> with connectors; the tooltip, the announcement and the screen-reader table carry the conversion rates."
        [code]="funnelSnippet"
        language="ts"
      >
        <div class="grid gap-3 md:grid-cols-2">
          <oge-funnel-chart
            [dataSource]="pipeline"
            argumentField="stage"
            valueField="count"
            [neckWidth]="0.2"
            [label]="{ position: 'outside' }"
            title="Sales pipeline"
            style="height: 320px"
          />
          <oge-funnel-chart
            [dataSource]="ages"
            argumentField="group"
            valueField="people"
            type="pyramid"
            algorithm="dynamicHeight"
            [sortData]="false"
            title="Population (thousands)"
            style="height: 320px"
          />
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['colour scale', 'diverging', 'grid keys', '2-D table']"
        heading="Heatmap"
        description="A category × category grid coloured through a <code>colorScale</code> — two or more stops (theme tokens work, blended with <code>color-mix()</code>) or <code>segmented</code> bands — with the colour-scale legend, cell labels where they fit and tooltips. Focus the grid: arrows move the active cell, Home/End, Ctrl+Home/End and PageUp/PageDown jump, Enter selects."
        [code]="heatmapSnippet"
        language="ts"
      >
        <oge-heatmap
          [dataSource]="tickets"
          xField="hour"
          yField="day"
          valueField="tickets"
          title="Support tickets by hour"
          style="height: 340px"
        />
        <oge-heatmap
          class="mt-3"
          [dataSource]="change"
          xField="quarter"
          yField="region"
          valueField="change"
          [colorScale]="changeScale"
          [valueFormat]="signed"
          title="Change vs last year (%)"
          style="height: 260px"
        />
      </app-demo-card>

      <app-demo-card
        [chips]="['squarified', 'drill-down', 'breadcrumb']"
        heading="Treemap"
        description="Nested rectangles sized by value: squarified tiling (or <code>sliceAndDice</code>), group headers, fitted labels and palette colours per top-level group, lightened by depth — or <code>colorScale</code> by value. Click a group or press Enter to drill in; the breadcrumb or Escape goes back. <code>[(rootKey)]</code> is the drill state."
        [code]="treemapSnippet"
        language="ts"
      >
        <oge-treemap
          [dataSource]="markets"
          valueField="sales"
          [(rootKey)]="treemapRoot"
          title="Sales by market (M$)"
          style="height: 380px"
        />
        <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Current root:
          <code>{{ treemapRoot() || 'all markets' }}</code>
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['flat data', 'rings', 'drill-down']"
        heading="Sunburst"
        description="The same hierarchy model as rings around a centre — here from flat data (<code>idField</code> + <code>parentField</code>). Segments are sized by value inside their parent's angle; click a branch to re-root on it and the centre (or Escape) to go back up. Arrow keys walk siblings, children and parents."
        [code]="sunburstSnippet"
        language="ts"
      >
        <oge-sunburst-chart
          [dataSource]="org"
          parentField="parent"
          valueField="people"
          title="Headcount"
          style="height: 380px"
        />
      </app-demo-card>

      <app-demo-card
        [chips]="['flows', 'hover highlight', 'column keys']"
        heading="Sankey diagram"
        description="Flows between nodes, one item per link: columns from the longest path, node heights from the throughput, positions relaxed so bands cross little. Hover a node to light up its links (or a link to light its two ends); the keyboard walks nodes Up/Down within a column and Left/Right across. Cycles are tolerated and the flow mirrors in RTL."
        [code]="sankeySnippet"
        language="ts"
      >
        <oge-sankey-chart
          [dataSource]="energy"
          [nodes]="energyNodes"
          title="Energy flows (TWh)"
          style="height: 380px"
        />
      </app-demo-card>

      <app-demo-card
        [chips]="['GeoJSON', 'choropleth', 'zoom & pan', 'region keys']"
        heading="Vector map"
        description="A choropleth over any GeoJSON <code>FeatureCollection</code>: equirectangular or Mercator projection fitted to the box, fills from a colour scale joined by key, labels where they fit. Wheel, pinch or the buttons zoom and dragging pans; focused, the arrow keys move to the nearest region in that direction, + and - zoom, Shift+arrows pan and Enter selects. This fictional country's borders are generated, so neighbours share their edges."
        [code]="mapSnippet"
        language="ts"
      >
        <oge-vector-map
          [geoJson]="provinces"
          [dataSource]="provinceSales"
          keyField="province"
          valueField="revenue"
          title="Revenue by province"
          style="height: 420px"
        />
      </app-demo-card>
    }
  `,
})
export class ChartsSpecializedPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_CHARTS_SPECIALIZED_SECTIONS;

  protected readonly pipeline = PIPELINE;
  protected readonly ages = AGE_GROUPS;
  protected readonly tickets = TICKETS;
  protected readonly change = CHANGE;
  protected readonly changeScale = CHANGE_SCALE;
  protected readonly markets = MARKETS;
  protected readonly org = ORG;
  protected readonly energy = ENERGY;
  protected readonly energyNodes = ENERGY_NODES;
  protected readonly provinces = PROVINCE_GEO;
  protected readonly provinceSales = PROVINCE_SALES;
  protected readonly treemapRoot = signal('');
  protected readonly signed = (value: number): string =>
    value > 0 ? `+${value}` : String(value);

  protected readonly funnelSnippet = FUNNEL_SNIPPET;
  protected readonly heatmapSnippet = HEATMAP_SNIPPET;
  protected readonly treemapSnippet = TREEMAP_SNIPPET;
  protected readonly sunburstSnippet = SUNBURST_SNIPPET;
  protected readonly sankeySnippet = SANKEY_SNIPPET;
  protected readonly mapSnippet = MAP_SNIPPET;
}
