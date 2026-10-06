import { OGE_DEFAULT_CHARTS_MESSAGES } from './charts-config';
import {
  OGE_MAP_HOME_VIEW,
  buildMapScene,
  clampMapView,
  mapEnsureVisible,
  mapPanBy,
  mapRegionLabel,
  mapSrTable,
  mapViewTransform,
  mapZoomAt,
  projectGeoPoint,
  type OgeGeoJsonFeatureCollection,
} from './geo-model';

const messages = OGE_DEFAULT_CHARTS_MESSAGES;

const square = (x: number, y: number, size: number): number[][][] => [
  [
    [x, y],
    [x + size, y],
    [x + size, y + size],
    [x, y + size],
    [x, y],
  ],
];

const geo: OgeGeoJsonFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'W',
      properties: { name: 'West' },
      geometry: { type: 'Polygon', coordinates: square(0, 0, 10) },
    },
    {
      type: 'Feature',
      properties: { name: 'East' },
      geometry: {
        type: 'MultiPolygon',
        coordinates: [square(10, 0, 10), square(25, 0, 1)],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Point' },
      geometry: { type: 'Point', coordinates: [0, 0] },
    },
  ],
};

const input = {
  geoJson: geo,
  projection: 'equirectangular' as const,
  dataSource: [
    { key: 'W', value: 3 },
    { key: 'East', value: 9 },
  ],
  keyField: 'key',
  valueField: 'value',
  showLabels: true,
  width: 400,
  height: 200,
  locale: 'en-US',
  messages,
};

describe('projectGeoPoint', () => {
  it('equirectangular is linear; mercator stretches the poles and clamps them', () => {
    expect(projectGeoPoint(180, 0, 'equirectangular')[0]).toBeCloseTo(Math.PI);
    expect(projectGeoPoint(0, 45, 'equirectangular')[1]).toBeCloseTo(
      -Math.PI / 4,
    );
    expect(Math.abs(projectGeoPoint(0, 60, 'mercator')[1])).toBeGreaterThan(
      Math.abs(projectGeoPoint(0, 60, 'equirectangular')[1]),
    );
    expect(Number.isFinite(projectGeoPoint(0, 90, 'mercator')[1])).toBe(true);
  });
});

describe('buildMapScene', () => {
  it('draws polygons only, joins data by key (id first, then name)', () => {
    const scene = buildMapScene(input);
    expect(scene.regions.map((r) => r.name)).toEqual(['West', 'East']);
    expect(scene.regions[0].payload.value).toBe(3);
    expect(scene.regions[1].fill).toBe('var(--oge-chart-heat-high)');
    expect(scene.regions[1].path.match(/M/g)).toHaveLength(2);
    expect(scene.ariaLabel).toBe('map, 2 regions');
  });

  it('fits the content into the box and keeps the aspect', () => {
    const scene = buildMapScene(input);
    const west = scene.regions[0].bounds;
    expect(west.width).toBeCloseTo(west.height, 0);
    const right = Math.max(
      ...scene.regions.map((r) => r.bounds.x + r.bounds.width),
    );
    expect(right).toBeLessThanOrEqual(400);
  });

  it('a region without data is empty and says so', () => {
    const scene = buildMapScene({ ...input, dataSource: [] });
    expect(scene.regions[0].empty).toBe(true);
    expect(scene.regions[0].valueText).toBe('no data');
    expect(mapSrTable(scene, messages, 50).rows[0]).toEqual({
      argText: 'West',
      cells: ['no data'],
    });
  });

  it('labels need room at the current zoom', () => {
    const scene = buildMapScene(input);
    expect(mapRegionLabel(scene.regions[0], 1)?.text).toBe('West');
    const small = buildMapScene({ ...input, width: 60, height: 30 });
    expect(mapRegionLabel(small.regions[0], 1)).toBeNull();
    expect(mapRegionLabel(small.regions[0], 8)).not.toBeNull();
  });
});

describe('map view maths', () => {
  it('zooms about a fixed point and clamps to 1..maxZoom', () => {
    const view = mapZoomAt(OGE_MAP_HOME_VIEW, 2, 100, 50, 400, 200, 8);
    expect(view).toEqual({ zoom: 2, x: -100, y: -50 });
    // the point under the cursor stays put
    expect(view.x + 100 * view.zoom).toBeCloseTo(100);
    expect(mapZoomAt(view, 0.1, 0, 0, 400, 200, 8)).toEqual(OGE_MAP_HOME_VIEW);
    expect(mapZoomAt(view, 100, 0, 0, 400, 200, 8).zoom).toBe(8);
  });

  it('pans within bounds and brings a point into view', () => {
    const zoomed = { zoom: 2, x: 0, y: 0 };
    expect(mapPanBy(zoomed, -5000, 0, 400, 200, 8).x).toBe(100 - 800);
    expect(clampMapView({ zoom: 1, x: 50, y: 50 }, 400, 200, 8)).toEqual(
      OGE_MAP_HOME_VIEW,
    );
    const visible = mapEnsureVisible(zoomed, { x: 390, y: 10 }, 400, 200, 8);
    expect(visible.x + 390 * 2).toBeLessThanOrEqual(400);
    expect(mapViewTransform(zoomed)).toBe('translate(0 0) scale(2)');
  });
});
