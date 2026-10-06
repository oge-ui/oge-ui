import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { OgeGeoJsonFeatureCollection } from '@oge-ui/charts-engine';
import type { OgeChartCellRef } from './heatmap';
import { OgeFunnelChart } from './funnel-chart';
import { OgeHeatmap } from './heatmap';
import { OgeSankeyChart } from './sankey-chart';
import { OgeSunburstChart } from './sunburst-chart';
import { OgeTreemap } from './treemap';
import { OgeVectorMap } from './vector-map';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

const key = (
  el: Element | null,
  name: string,
  extra: KeyboardEventInit = {},
): void => {
  el?.dispatchEvent(
    new KeyboardEvent('keydown', { key: name, bubbles: true, ...extra }),
  );
};

const text = (el: Element | null): string =>
  (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

/** A table row's cells joined by single spaces. */
const rowText = (row: Element): string =>
  Array.from(row.children).map(text).join(' ');

/* ------------------------------------------------------------------ */

const PIPELINE = [
  { stage: 'Visits', count: 1000 },
  { stage: 'Leads', count: 400 },
  { stage: 'Orders', count: 100 },
];

@Component({
  imports: [OgeFunnelChart],
  template: `
    <oge-funnel-chart
      [dataSource]="data"
      argumentField="stage"
      valueField="count"
      [type]="type()"
      [(selectedItems)]="selected"
      (itemClick)="clicks.push($event.argument)"
      title="Pipeline"
      locale="en-US"
    />
  `,
})
class FunnelHost {
  readonly data = PIPELINE;
  readonly type = signal<'funnel' | 'pyramid'>('funnel');
  selected: readonly number[] = [];
  readonly clicks: unknown[] = [];
}

describe('<oge-funnel-chart>', () => {
  let fixture: ComponentFixture<FunnelHost>;
  let host: HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(FunnelHost);
    await settle(fixture);
    host = fixture.nativeElement as HTMLElement;
  });

  it('draws one stage per item with legend, labels and the sr table', () => {
    expect(host.querySelectorAll('.oge-funnel-item')).toHaveLength(3);
    expect(host.querySelectorAll('.oge-chart-legend-btn')).toHaveLength(3);
    expect(
      host.querySelector('.oge-chart-plot-wrap')?.getAttribute('aria-label'),
    ).toBe('Pipeline funnel chart, 3 stages');
    const rows = Array.from(
      host.querySelectorAll('.oge-chart-sr-table tbody tr'),
    ).map(rowText);
    expect(rows[1]).toBe('Leads 400 40% of first stage');
  });

  it('arrow keys walk the stages and announce the conversion; Enter selects', async () => {
    const plot = host.querySelector('.oge-chart-plot-wrap');
    key(plot, 'ArrowDown');
    key(plot, 'ArrowDown');
    await settle(fixture);
    expect(text(host.querySelector('.oge-chart-live[aria-live]'))).toBe(
      'Leads: 400, 40% of first stage',
    );
    expect(host.querySelectorAll('.oge-chart-item-active')).toHaveLength(1);
    key(plot, 'Enter');
    await settle(fixture);
    expect(fixture.componentInstance.selected).toEqual([1]);
    expect(fixture.componentInstance.clicks).toEqual(['Leads']);
    expect(host.querySelectorAll('.oge-chart-point-selected')).toHaveLength(1);
  });

  it('the legend toggles the selection; pyramid relabels', async () => {
    (
      host.querySelectorAll('.oge-chart-legend-btn')[2] as HTMLButtonElement
    ).click();
    await settle(fixture);
    expect(fixture.componentInstance.selected).toEqual([2]);
    fixture.componentInstance.type.set('pyramid');
    await settle(fixture);
    expect(
      host.querySelector('.oge-chart-plot-wrap')?.getAttribute('aria-label'),
    ).toBe('Pipeline pyramid chart, 3 levels');
  });
});

/* ------------------------------------------------------------------ */

@Component({
  imports: [OgeHeatmap],
  template: `
    <oge-heatmap
      [dataSource]="data"
      xField="hour"
      yField="day"
      valueField="load"
      [(selectedCells)]="selected"
      locale="en-US"
    />
  `,
})
class HeatmapHost {
  readonly data = [
    { day: 'Mon', hour: '9', load: 10 },
    { day: 'Mon', hour: '10', load: 30 },
    { day: 'Tue', hour: '9', load: 20 },
    { day: 'Tue', hour: '10', load: 5 },
  ];
  selected: readonly OgeChartCellRef[] = [];
}

describe('<oge-heatmap>', () => {
  let fixture: ComponentFixture<HeatmapHost>;
  let host: HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(HeatmapHost);
    await settle(fixture);
    host = fixture.nativeElement as HTMLElement;
  });

  it('renders the grid, the colour legend and a 2-D sr table', () => {
    expect(host.querySelectorAll('.oge-heatmap-cell')).toHaveLength(4);
    expect(
      host.querySelector('.oge-chart-color-legend')?.getAttribute('aria-label'),
    ).toBe('Colour scale');
    const headers = Array.from(
      host.querySelectorAll('.oge-chart-sr-table thead th'),
    ).map(text);
    expect(headers).toEqual(['Argument', '9', '10']);
    const fill =
      host.querySelectorAll<SVGRectElement>('.oge-heatmap-cell')[1].style.fill;
    expect(fill).toContain('var(--oge-chart-heat-high)');
  });

  it('grid keys move the active cell; Enter toggles the selection', async () => {
    const plot = host.querySelector('.oge-chart-plot-wrap');
    key(plot, 'ArrowRight');
    key(plot, 'ArrowRight');
    key(plot, 'ArrowDown');
    await settle(fixture);
    expect(text(host.querySelector('.oge-chart-live[aria-live]'))).toBe(
      'Tue, 10: 5',
    );
    key(plot, 'Home', { ctrlKey: true });
    await settle(fixture);
    expect(text(host.querySelector('.oge-chart-live[aria-live]'))).toBe(
      'Mon, 9: 10',
    );
    key(plot, 'Enter');
    await settle(fixture);
    expect(fixture.componentInstance.selected).toEqual([{ row: 0, column: 0 }]);
  });
});

/* ------------------------------------------------------------------ */

const TREE = [
  {
    name: 'Europe',
    items: [
      { name: 'Germany', value: 40 },
      { name: 'France', value: 30 },
    ],
  },
  { name: 'Asia', items: [{ name: 'Japan', value: 30 }] },
  { name: 'Other', value: 10 },
];

@Component({
  imports: [OgeTreemap, OgeSunburstChart],
  template: `
    <oge-treemap
      class="treemap"
      [dataSource]="data"
      [(rootKey)]="treemapRoot"
      (tileClick)="tiles.push($event.name)"
      locale="en-US"
    />
    <oge-sunburst-chart
      class="sunburst"
      [dataSource]="data"
      [(rootKey)]="sunburstRoot"
      locale="en-US"
    />
  `,
})
class HierarchyHost {
  readonly data = TREE;
  treemapRoot = '';
  sunburstRoot = '';
  readonly tiles: string[] = [];
}

describe('<oge-treemap> / <oge-sunburst-chart>', () => {
  let fixture: ComponentFixture<HierarchyHost>;
  let host: HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(HierarchyHost);
    await settle(fixture);
    host = fixture.nativeElement as HTMLElement;
  });

  it('nests tiles under group headers and lists them in the sr table', () => {
    expect(host.querySelectorAll('.treemap .oge-treemap-tile')).toHaveLength(6);
    expect(host.querySelectorAll('.treemap .oge-treemap-group')).toHaveLength(
      2,
    );
    const rows = Array.from(
      host.querySelectorAll('.treemap .oge-chart-sr-table tbody tr'),
    ).map(rowText);
    expect(rows).toContain('Europe / Germany 40 57.1%');
    expect(host.querySelector('.treemap .oge-chart-breadcrumb')).toBeNull();
  });

  it('click drills into a group; the breadcrumb and Escape go back', async () => {
    const europe = host.querySelectorAll<SVGRectElement>(
      '.treemap .oge-treemap-group',
    )[0];
    europe.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle(fixture);
    expect(fixture.componentInstance.treemapRoot).toBe('0');
    expect(fixture.componentInstance.tiles).toEqual(['Europe']);
    expect(host.querySelectorAll('.treemap .oge-treemap-tile')).toHaveLength(2);
    expect(
      text(
        host.querySelector(
          '.treemap .oge-chart-breadcrumb [aria-current="page"]',
        ),
      ),
    ).toBe('Europe');
    expect(
      text(host.querySelector('.treemap .oge-chart-live[aria-live]')),
    ).toBe('Europe opened');
    key(host.querySelector('.treemap .oge-chart-plot-wrap'), 'Escape');
    await settle(fixture);
    expect(fixture.componentInstance.treemapRoot).toBe('');
    expect(
      text(host.querySelector('.treemap .oge-chart-live[aria-live]')),
    ).toBe('Back to All');
  });

  it('arrow keys walk siblings and children; Enter drills', async () => {
    const plot = host.querySelector('.treemap .oge-chart-plot-wrap');
    key(plot, 'ArrowRight');
    await settle(fixture);
    expect(
      text(host.querySelector('.treemap .oge-chart-live[aria-live]')),
    ).toBe('Europe: 70 (63.6%)');
    key(plot, 'ArrowDown');
    await settle(fixture);
    expect(
      text(host.querySelector('.treemap .oge-chart-live[aria-live]')),
    ).toBe('Germany: 40 (57.1%)');
    key(plot, 'ArrowUp');
    key(plot, 'Enter');
    await settle(fixture);
    expect(fixture.componentInstance.treemapRoot).toBe('0');
    expect(
      host
        .querySelector('.treemap .oge-chart-plot-wrap')
        ?.getAttribute('aria-describedby'),
    ).toMatch(/-hint$/);
  });

  it('the sunburst draws one ring per level and drills from the keyboard', async () => {
    expect(
      host.querySelectorAll('.sunburst .oge-sunburst-segment'),
    ).toHaveLength(6);
    expect(
      text(host.querySelector('.sunburst .oge-sunburst-center-name')),
    ).toBe('All');
    const plot = host.querySelector('.sunburst .oge-chart-plot-wrap');
    key(plot, 'ArrowRight');
    key(plot, 'Enter');
    await settle(fixture);
    expect(fixture.componentInstance.sunburstRoot).toBe('0');
    expect(
      host.querySelectorAll('.sunburst .oge-sunburst-segment'),
    ).toHaveLength(2);
    (
      host.querySelector('.sunburst .oge-sunburst-center') as SVGCircleElement
    ).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle(fixture);
    expect(fixture.componentInstance.sunburstRoot).toBe('');
  });
});

/* ------------------------------------------------------------------ */

@Component({
  imports: [OgeSankeyChart],
  template: `
    <oge-sankey-chart
      [dataSource]="links"
      (nodeClick)="nodes.push($event.id)"
      locale="en-US"
    />
  `,
})
class SankeyHost {
  readonly links = [
    { source: 'A', target: 'X', value: 10 },
    { source: 'A', target: 'Y', value: 5 },
    { source: 'B', target: 'X', value: 5 },
    { source: 'X', target: 'Z', value: 15 },
  ];
  readonly nodes: string[] = [];
}

describe('<oge-sankey-chart>', () => {
  let fixture: ComponentFixture<SankeyHost>;
  let host: HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(SankeyHost);
    await settle(fixture);
    host = fixture.nativeElement as HTMLElement;
  });

  it('draws nodes, link bands and the sr table of flows', () => {
    expect(host.querySelectorAll('.oge-sankey-node')).toHaveLength(5);
    expect(host.querySelectorAll('.oge-sankey-link')).toHaveLength(4);
    const headers = Array.from(
      host.querySelectorAll('.oge-chart-sr-table thead th'),
    ).map(text);
    expect(headers).toEqual(['Source', 'Target', 'Value']);
  });

  it('hovering a node dims the unrelated links', async () => {
    const nodes = host.querySelectorAll('.oge-sankey-node');
    const b =
      Array.from(nodes).find((n) => n.nextElementSibling !== null) ?? nodes[1];
    b.dispatchEvent(new MouseEvent('mouseenter'));
    await settle(fixture);
    expect(
      host.querySelectorAll('.oge-sankey-link-lit').length,
    ).toBeGreaterThan(0);
    expect(host.querySelectorAll('.oge-sankey-dim').length).toBeGreaterThan(0);
  });

  it('column keys walk the nodes and announce their flows', async () => {
    const plot = host.querySelector('.oge-chart-plot-wrap');
    key(plot, 'ArrowDown');
    await settle(fixture);
    expect(text(host.querySelector('.oge-chart-live[aria-live]'))).toMatch(
      /^[AB]: out \d+$/,
    );
    key(plot, 'ArrowRight');
    await settle(fixture);
    expect(text(host.querySelector('.oge-chart-live[aria-live]'))).toMatch(
      /^[XY]: in \d+/,
    );
    key(plot, 'Enter');
    await settle(fixture);
    expect(fixture.componentInstance.nodes).toHaveLength(1);
  });
});

/* ------------------------------------------------------------------ */

const square = (x: number, y: number): number[][][] => [
  [
    [x, y],
    [x + 10, y],
    [x + 10, y + 10],
    [x, y + 10],
    [x, y],
  ],
];
const GEO: OgeGeoJsonFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'W',
      properties: { name: 'West' },
      geometry: { type: 'Polygon', coordinates: square(0, 0) },
    },
    {
      type: 'Feature',
      id: 'E',
      properties: { name: 'East' },
      geometry: { type: 'Polygon', coordinates: square(10, 0) },
    },
  ],
};

@Component({
  imports: [OgeVectorMap],
  template: `
    <oge-vector-map
      [geoJson]="geo"
      [dataSource]="data"
      [(selectedRegions)]="selected"
      locale="en-US"
    />
  `,
})
class MapHost {
  readonly geo = GEO;
  readonly data = [
    { key: 'W', value: 3 },
    { key: 'E', value: 9 },
  ];
  selected: readonly string[] = [];
}

describe('<oge-vector-map>', () => {
  let fixture: ComponentFixture<MapHost>;
  let host: HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(MapHost);
    await settle(fixture);
    host = fixture.nativeElement as HTMLElement;
  });

  it('draws the regions with labelled zoom buttons and the sr table', () => {
    expect(host.querySelectorAll('.oge-map-region')).toHaveLength(2);
    const buttons = Array.from(host.querySelectorAll('.oge-map-control')).map(
      (b) => b.getAttribute('aria-label'),
    );
    expect(buttons).toEqual(['Zoom in', 'Zoom out', 'Reset zoom']);
    const rows = Array.from(
      host.querySelectorAll('.oge-chart-sr-table tbody tr'),
    ).map(rowText);
    expect(rows).toEqual(['West 3', 'East 9']);
  });

  it('arrows move between regions, + zooms, 0 resets, Enter selects', async () => {
    const plot = host.querySelector('.oge-chart-plot-wrap');
    key(plot, 'ArrowRight');
    await settle(fixture);
    expect(text(host.querySelector('.oge-chart-live[aria-live]'))).toBe(
      'West: 3',
    );
    key(plot, 'ArrowRight');
    await settle(fixture);
    expect(text(host.querySelector('.oge-chart-live[aria-live]'))).toBe(
      'East: 9',
    );
    key(plot, '+');
    await settle(fixture);
    expect(
      host.querySelector('.oge-map-svg g')?.getAttribute('transform'),
    ).toContain('scale(1.5)');
    key(plot, '0');
    await settle(fixture);
    expect(
      host.querySelector('.oge-map-svg g')?.getAttribute('transform'),
    ).toBe('translate(0 0) scale(1)');
    key(plot, 'Enter');
    await settle(fixture);
    expect(fixture.componentInstance.selected).toEqual(['E']);
  });

  it('the zoom buttons zoom and disable at the limits', async () => {
    const [zoomIn, zoomOut] = Array.from(
      host.querySelectorAll<HTMLButtonElement>('.oge-map-control'),
    );
    expect(zoomOut.disabled).toBe(true);
    zoomIn.click();
    await settle(fixture);
    expect(zoomOut.disabled).toBe(false);
  });
});
