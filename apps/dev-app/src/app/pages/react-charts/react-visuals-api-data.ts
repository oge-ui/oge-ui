// The React tables of the W8c chart components — the same builder as the
// Angular page (`../charts/visuals-api-data.ts`) in its React idiom:
// controlled pairs, `on…` callbacks and a `ref` handle.
import type { ApiSections } from '../../shared/api-reference';
import { chartVisualsApi } from '../charts/visuals-api-data';

const REACT = chartVisualsApi('react');

export const OGE_REACT_CIRCULAR_GAUGE_API: ApiSections = REACT.circularGauge;
export const OGE_REACT_LINEAR_GAUGE_API: ApiSections = REACT.linearGauge;
export const OGE_REACT_BULLET_CHART_API: ApiSections = REACT.bulletChart;
export const OGE_REACT_SPARKLINE_API: ApiSections = REACT.sparkline;
export const OGE_REACT_FUNNEL_CHART_API: ApiSections = REACT.funnelChart;
export const OGE_REACT_HEATMAP_API: ApiSections = REACT.heatmap;
export const OGE_REACT_TREEMAP_API: ApiSections = REACT.treemap;
export const OGE_REACT_SUNBURST_CHART_API: ApiSections = REACT.sunburstChart;
export const OGE_REACT_SANKEY_CHART_API: ApiSections = REACT.sankeyChart;
export const OGE_REACT_VECTOR_MAP_API: ApiSections = REACT.vectorMap;
