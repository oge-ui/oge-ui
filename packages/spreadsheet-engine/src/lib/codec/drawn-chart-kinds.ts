/** Chart kinds the viewer draws; the others are counted as not shown. */
export const OGE_DRAWN_CHART_KINDS: ReadonlySet<string> = new Set([
  'bar',
  'line',
  'area',
  'pie',
  'doughnut',
  'scatter',
  'bubble',
]);
