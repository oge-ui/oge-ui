import { StrictMode, createRef } from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { OgeVectorMap, type OgeVectorMapHandle } from './vector-map';
import type { OgeGeoJsonFeatureCollection } from '@oge-ui/charts-engine';

const square = (x: number, y: number, s: number): number[][][] => [
  [
    [x, y],
    [x + s, y],
    [x + s, y + s],
    [x, y + s],
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
      geometry: { type: 'Polygon', coordinates: square(0, 0, 10) },
    },
    {
      type: 'Feature',
      id: 'E',
      properties: { name: 'East' },
      geometry: { type: 'Polygon', coordinates: square(20, 0, 10) },
    },
  ],
};
const DATA = [
  { key: 'W', value: 3 },
  { key: 'E', value: 9 },
];

describe('<OgeVectorMap>', () => {
  it('regions, zoom buttons with labels, hint and sr table', () => {
    const { container } = render(
      <StrictMode>
        <OgeVectorMap geoJson={GEO} dataSource={DATA} locale="en-US" />
      </StrictMode>,
    );
    expect(container.querySelectorAll('.oge-map-region')).toHaveLength(2);
    const labels = Array.from(
      container.querySelectorAll('.oge-map-control'),
    ).map((b) => b.getAttribute('aria-label'));
    expect(labels).toEqual(['Zoom in', 'Zoom out', 'Reset zoom']);
    const wrap = container.querySelector('.oge-chart-plot-wrap') as HTMLElement;
    expect(
      document.getElementById(wrap.getAttribute('aria-describedby') ?? '')
        ?.textContent,
    ).toContain('Arrow keys move between regions');
    expect(
      container.querySelectorAll('.oge-chart-sr-table tbody tr'),
    ).toHaveLength(2);
  });

  it('keyboard moves spatially, zooms with + and resets with 0', () => {
    const { container } = render(
      <OgeVectorMap geoJson={GEO} dataSource={DATA} locale="en-US" />,
    );
    const wrap = container.querySelector('.oge-chart-plot-wrap') as HTMLElement;
    const live = container.querySelectorAll(
      '.oge-chart-live',
    )[1] as HTMLElement;
    const layer = (): string =>
      container.querySelector('.oge-map-svg > g')?.getAttribute('transform') ??
      '';
    fireEvent.keyDown(wrap, { key: 'ArrowRight' });
    expect(live.textContent).toBe('West: 3');
    fireEvent.keyDown(wrap, { key: 'ArrowRight' });
    expect(live.textContent).toBe('East: 9');
    fireEvent.keyDown(wrap, { key: '+' });
    expect(layer()).toContain('scale(1.5)');
    fireEvent.keyDown(wrap, { key: '0' });
    expect(layer()).toBe('translate(0 0) scale(1)');
    fireEvent.keyDown(wrap, { key: 'Enter' });
    expect(
      container.querySelectorAll('.oge-chart-point-selected'),
    ).toHaveLength(1);
  });

  it('the handle zooms; click selects a region', () => {
    const ref = createRef<OgeVectorMapHandle>();
    const onRegionClick = vi.fn();
    const { container } = render(
      <OgeVectorMap
        ref={ref}
        geoJson={GEO}
        dataSource={DATA}
        onRegionClick={onRegionClick}
        locale="en-US"
      />,
    );
    act(() => ref.current?.zoomIn());
    expect(
      container.querySelector('.oge-map-svg > g')?.getAttribute('transform'),
    ).toContain('scale(1.5)');
    fireEvent.click(container.querySelector('.oge-map-region') as Element);
    expect(onRegionClick).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'W' }),
    );
  });
});
