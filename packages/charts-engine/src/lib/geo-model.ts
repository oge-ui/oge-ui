/**
 * The vector map's view model — what `<oge-vector-map>` / `<OgeVectorMap>`
 * draw: GeoJSON polygons projected (equirectangular or Mercator) and fitted
 * into the box, a choropleth fill per region from a colour scale, region
 * labels, the zoom / pan view maths, centroids for the keyboard's spatial
 * navigation and the screen-reader table. No projection library, no tiles.
 * Framework-free and pure.
 */
import {
  createFieldAccessor,
  ogeFormatMessage,
  ogeNumberFormat,
} from '@oge-ui/core';
import type { OgeChartsMessages } from './charts-config';
import {
  resolveChartColorScale,
  type OgeChartColorScale,
  type OgeChartColorScaleLegend,
} from './color-scale';

/** A GeoJSON geometry; only `Polygon` and `MultiPolygon` are drawn. */
export interface OgeGeoJsonGeometry {
  readonly type: string;
  readonly coordinates?: unknown;
}

export interface OgeGeoJsonFeature {
  readonly type: 'Feature';
  readonly id?: string | number;
  readonly properties?: Readonly<Record<string, unknown>> | null;
  readonly geometry: OgeGeoJsonGeometry | null;
}

export interface OgeGeoJsonFeatureCollection {
  readonly type: 'FeatureCollection';
  readonly features: readonly OgeGeoJsonFeature[];
}

export type OgeMapProjection = 'equirectangular' | 'mercator';

/** The payload of a region click / activation. */
export interface OgeChartMapRegionEvent<T = unknown> {
  readonly index: number;
  readonly key: string;
  readonly name: string;
  readonly value: number | null;
  readonly feature: OgeGeoJsonFeature;
  /** The joined data item. */
  readonly source: T | undefined;
}

type FieldExpr<T> = string | ((item: T) => unknown);

export interface OgeMapSceneInput<T> {
  readonly geoJson: OgeGeoJsonFeatureCollection | null;
  readonly projection: OgeMapProjection;
  /** Region key; default `feature.id`, then `properties.name`. */
  readonly regionKey?: (feature: OgeGeoJsonFeature) => string;
  /** Region name (labels, tooltip); default `properties.name`. */
  readonly nameField?: string;
  readonly dataSource: readonly T[];
  /** Data item → region key. Default `'key'`. */
  readonly keyField: FieldExpr<T>;
  readonly valueField: FieldExpr<T>;
  readonly colorScale?: OgeChartColorScale;
  readonly showLabels: boolean;
  readonly valueFormat?: (value: number) => string;
  readonly title?: string;
  readonly width: number;
  readonly height: number;
  readonly locale?: string;
  readonly messages: OgeChartsMessages;
}

export interface OgeMapRegionVm<T> {
  readonly index: number;
  readonly key: string;
  readonly name: string;
  readonly path: string;
  readonly fill: string;
  readonly empty: boolean;
  readonly centroid: { readonly x: number; readonly y: number };
  readonly bounds: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  readonly valueText: string;
  readonly payload: OgeChartMapRegionEvent<T>;
}

export interface OgeMapScene<T> {
  readonly regions: readonly OgeMapRegionVm<T>[];
  readonly legend: OgeChartColorScaleLegend;
  readonly ariaLabel: string;
}

const round1 = (value: number): number => Math.round(value * 10) / 10;

/** Longitude / latitude (degrees) → projected unit coordinates (y down). */
export function projectGeoPoint(
  lon: number,
  lat: number,
  projection: OgeMapProjection,
): [number, number] {
  if (projection === 'mercator') {
    const clamped = Math.max(-85.0511, Math.min(85.0511, lat));
    const phi = (clamped * Math.PI) / 180;
    return [(lon * Math.PI) / 180, -Math.log(Math.tan(Math.PI / 4 + phi / 2))];
  }
  return [(lon * Math.PI) / 180, (-lat * Math.PI) / 180];
}

type Ring = readonly (readonly number[])[];

/** The polygons (each a list of rings) of a geometry. */
export function geoPolygons(geometry: OgeGeoJsonGeometry | null): Ring[][] {
  if (geometry === null || !Array.isArray(geometry.coordinates)) return [];
  if (geometry.type === 'Polygon') return [geometry.coordinates as Ring[]];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates as Ring[][];
  return [];
}

const ringArea = (ring: readonly (readonly [number, number])[]): number => {
  let area = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    area += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  }
  return area / 2;
};

const ringCentroid = (
  ring: readonly (readonly [number, number])[],
): { x: number; y: number } => {
  const area = ringArea(ring);
  if (Math.abs(area) < 1e-12) {
    const n = Math.max(1, ring.length);
    return {
      x: ring.reduce((sum, p) => sum + p[0], 0) / n,
      y: ring.reduce((sum, p) => sum + p[1], 0) / n,
    };
  }
  let cx = 0;
  let cy = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const f = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
    cx += (ring[j][0] + ring[i][0]) * f;
    cy += (ring[j][1] + ring[i][1]) * f;
  }
  return { x: cx / (6 * area), y: cy / (6 * area) };
};

const defaultKey = (feature: OgeGeoJsonFeature, index: number): string => {
  if (feature.id !== undefined && feature.id !== null)
    return String(feature.id);
  const name = feature.properties?.['name'];
  return name === undefined || name === null ? String(index) : String(name);
};

export function buildMapScene<T>(input: OgeMapSceneInput<T>): OgeMapScene<T> {
  const features = (input.geoJson?.features ?? []).filter(
    (feature) => geoPolygons(feature.geometry).length > 0,
  );
  const format =
    input.valueFormat ??
    ((v: number) =>
      ogeNumberFormat(input.locale, { maximumFractionDigits: 2 }).format(v));
  const keyOf =
    typeof input.keyField === 'string'
      ? createFieldAccessor<T>(input.keyField)
      : input.keyField;
  const valueOf =
    typeof input.valueField === 'string'
      ? createFieldAccessor<T>(input.valueField)
      : input.valueField;
  const joined = new Map<string, { value: number | null; source: T }>();
  for (const item of input.dataSource) {
    const raw = valueOf(item);
    joined.set(String(keyOf(item) ?? ''), {
      value: typeof raw === 'number' && Number.isFinite(raw) ? raw : null,
      source: item,
    });
  }

  // project every ring once, then fit the union into the box
  const projected = features.map((feature) =>
    geoPolygons(feature.geometry).map((polygon) =>
      polygon.map((ring) =>
        ring
          .filter(
            (p) =>
              p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]),
          )
          .map((p) => projectGeoPoint(p[0], p[1], input.projection)),
      ),
    ),
  );
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const polygons of projected) {
    for (const polygon of polygons) {
      for (const ring of polygon) {
        for (const [x, y] of ring) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
  }
  const pad = 8;
  const w = Math.max(1, input.width - pad * 2);
  const h = Math.max(1, input.height - pad * 2);
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const k = Number.isFinite(minX) ? Math.min(w / spanX, h / spanY) : 1;
  const ox = pad + (w - spanX * k) / 2;
  const oy = pad + (h - spanY * k) / 2;
  const toScreen = ([x, y]: readonly [number, number]): [number, number] => [
    ox + (x - minX) * k,
    oy + (y - minY) * k,
  ];

  const keys = features.map((feature, index) =>
    input.regionKey !== undefined
      ? input.regionKey(feature)
      : defaultKey(feature, index),
  );
  const scale = resolveChartColorScale(
    input.colorScale,
    keys.map((key) => joined.get(key)?.value ?? null),
    input.locale,
  );
  const nameKey = input.nameField ?? 'name';

  const regions: OgeMapRegionVm<T>[] = features.map((feature, index) => {
    const key = keys[index];
    const entry = joined.get(key);
    const value = entry?.value ?? null;
    const raw = feature.properties?.[nameKey];
    const name = raw === undefined || raw === null ? key : String(raw);
    let d = '';
    let bx0 = Infinity;
    let bx1 = -Infinity;
    let by0 = Infinity;
    let by1 = -Infinity;
    let largest: (readonly [number, number])[] = [];
    let largestArea = -1;
    for (const polygon of projected[index]) {
      polygon.forEach((ring, ringIndex) => {
        const screen = ring.map(toScreen);
        if (screen.length < 3) return;
        d += `M ${screen.map(([x, y]) => `${round1(x)} ${round1(y)}`).join(' L ')} Z `;
        for (const [x, y] of screen) {
          if (x < bx0) bx0 = x;
          if (x > bx1) bx1 = x;
          if (y < by0) by0 = y;
          if (y > by1) by1 = y;
        }
        if (ringIndex === 0) {
          const area = Math.abs(ringArea(screen));
          if (area > largestArea) {
            largestArea = area;
            largest = screen;
          }
        }
      });
    }
    const centroid =
      largest.length > 0 ? ringCentroid(largest) : { x: 0, y: 0 };
    return {
      index,
      key,
      name,
      path: d.trim(),
      fill: scale.colorOf(value),
      empty: value === null,
      centroid: { x: round1(centroid.x), y: round1(centroid.y) },
      bounds: {
        x: round1(bx0),
        y: round1(by0),
        width: round1(Math.max(0, bx1 - bx0)),
        height: round1(Math.max(0, by1 - by0)),
      },
      valueText:
        value === null ? input.messages.visuals.noValue : format(value),
      payload: { index, key, name, value, feature, source: entry?.source },
    };
  });

  return {
    regions,
    legend: scale.legend,
    ariaLabel: ogeFormatMessage(
      input.messages.visuals.mapLabel,
      { title: input.title ?? '', count: regions.length },
      input.locale,
    ).trim(),
  };
}

/** The pan / zoom state of a map: `translate(x y) scale(zoom)`. */
export interface OgeMapView {
  readonly zoom: number;
  readonly x: number;
  readonly y: number;
}

export const OGE_MAP_HOME_VIEW: OgeMapView = { zoom: 1, x: 0, y: 0 };

/** Keeps at least a quarter of the zoomed content inside the box. */
export function clampMapView(
  view: OgeMapView,
  width: number,
  height: number,
  maxZoom: number,
): OgeMapView {
  const zoom = Math.max(1, Math.min(maxZoom, view.zoom));
  const minX = width / 4 - width * zoom;
  const maxX = (width * 3) / 4;
  const minY = height / 4 - height * zoom;
  const maxY = (height * 3) / 4;
  if (zoom === 1) return { zoom: 1, x: 0, y: 0 };
  return {
    zoom,
    x: Math.max(minX, Math.min(maxX, view.x)),
    y: Math.max(minY, Math.min(maxY, view.y)),
  };
}

/** Zooms by `factor` keeping the point (`px`, `py`) (box px) fixed. */
export function mapZoomAt(
  view: OgeMapView,
  factor: number,
  px: number,
  py: number,
  width: number,
  height: number,
  maxZoom: number,
): OgeMapView {
  const zoom = Math.max(1, Math.min(maxZoom, view.zoom * factor));
  const ratio = zoom / view.zoom;
  return clampMapView(
    { zoom, x: px - (px - view.x) * ratio, y: py - (py - view.y) * ratio },
    width,
    height,
    maxZoom,
  );
}

/** Pans by (dx, dy) box px. */
export function mapPanBy(
  view: OgeMapView,
  dx: number,
  dy: number,
  width: number,
  height: number,
  maxZoom: number,
): OgeMapView {
  return clampMapView(
    { zoom: view.zoom, x: view.x + dx, y: view.y + dy },
    width,
    height,
    maxZoom,
  );
}

/** Pans just enough to bring a (base-coordinate) point into the box. */
export function mapEnsureVisible(
  view: OgeMapView,
  point: { readonly x: number; readonly y: number },
  width: number,
  height: number,
  maxZoom: number,
): OgeMapView {
  const sx = view.x + point.x * view.zoom;
  const sy = view.y + point.y * view.zoom;
  const margin = 24;
  const dx =
    sx < margin ? margin - sx : sx > width - margin ? width - margin - sx : 0;
  const dy =
    sy < margin ? margin - sy : sy > height - margin ? height - margin - sy : 0;
  return dx === 0 && dy === 0
    ? view
    : mapPanBy(view, dx, dy, width, height, maxZoom);
}

/** The `transform` attribute of the zoomed layer. */
export function mapViewTransform(view: OgeMapView): string {
  return `translate(${round1(view.x)} ${round1(view.y)}) scale(${Math.round(view.zoom * 1000) / 1000})`;
}

/** A region label (base coordinates), when the region is wide enough at this zoom. */
export function mapRegionLabel<T>(
  region: OgeMapRegionVm<T>,
  zoom: number,
): { readonly x: number; readonly y: number; readonly text: string } | null {
  const needed = region.name.length * 6.4 + 6;
  if (region.bounds.width * zoom < needed || region.bounds.height * zoom < 14)
    return null;
  return {
    x: region.centroid.x,
    y: region.centroid.y + 4 / zoom,
    text: region.name,
  };
}

/** The screen-reader table: region, value. */
export function mapSrTable<T>(
  scene: OgeMapScene<T>,
  messages: OgeChartsMessages,
  limit: number,
): {
  readonly headers: readonly string[];
  readonly rows: readonly {
    readonly argText: string;
    readonly cells: readonly string[];
  }[];
} {
  return {
    headers: [messages.aria.argumentHeader, messages.visuals.valueHeader],
    rows: scene.regions.slice(0, limit).map((region) => ({
      argText: region.name,
      cells: [region.valueText],
    })),
  };
}
