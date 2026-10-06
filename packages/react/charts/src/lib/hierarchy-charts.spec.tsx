import { StrictMode, createRef } from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { OgeTreemap, type OgeHierarchyChartHandle } from './treemap';
import { OgeSunburstChart } from './sunburst-chart';

const DATA = [
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

describe('<OgeTreemap>', () => {
  it('nested tiles, hint, sr table', () => {
    const { container } = render(
      <StrictMode>
        <OgeTreemap dataSource={DATA} locale="en-US" />
      </StrictMode>,
    );
    expect(container.querySelectorAll('.oge-treemap-tile')).toHaveLength(6);
    expect(container.querySelectorAll('.oge-treemap-group')).toHaveLength(2);
    const wrap = container.querySelector('.oge-chart-plot-wrap') as HTMLElement;
    const hint = document.getElementById(
      wrap.getAttribute('aria-describedby') ?? '',
    );
    expect(hint?.textContent).toContain('Enter opens a group');
    expect(
      container.querySelectorAll('.oge-chart-sr-table tbody tr'),
    ).toHaveLength(6);
  });

  it('keyboard drills down and Escape back up; the breadcrumb follows', () => {
    const onRootKeyChange = vi.fn();
    const { container } = render(
      <OgeTreemap
        dataSource={DATA}
        onRootKeyChange={onRootKeyChange}
        locale="en-US"
      />,
    );
    const wrap = container.querySelector('.oge-chart-plot-wrap') as HTMLElement;
    const live = (): string =>
      container.querySelectorAll('.oge-chart-live')[1]?.textContent ?? '';
    fireEvent.keyDown(wrap, { key: 'ArrowRight' });
    expect(live()).toBe('Europe: 70 (63.6%)');
    fireEvent.keyDown(wrap, { key: 'Enter' });
    expect(onRootKeyChange).toHaveBeenCalledWith('0');
    expect(live()).toBe('Europe opened');
    expect(
      container.querySelector('.oge-chart-breadcrumb-current')?.textContent,
    ).toBe('Europe');
    expect(container.querySelectorAll('.oge-treemap-tile')).toHaveLength(2);
    fireEvent.keyDown(wrap, { key: 'Escape' });
    expect(live()).toBe('Back to All');
    expect(container.querySelector('.oge-chart-breadcrumb')).toBeNull();
  });

  it('the handle drills; a breadcrumb button goes back', () => {
    const ref = createRef<OgeHierarchyChartHandle>();
    const onTileClick = vi.fn();
    const { container } = render(
      <OgeTreemap
        ref={ref}
        dataSource={DATA}
        onTileClick={onTileClick}
        locale="en-US"
      />,
    );
    act(() => ref.current?.drillTo('1'));
    expect(container.querySelectorAll('.oge-treemap-tile')).toHaveLength(1);
    fireEvent.click(container.querySelector('.oge-treemap-tile') as Element);
    expect(onTileClick).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Japan' }),
    );
    fireEvent.click(
      container.querySelector('.oge-chart-breadcrumb-btn') as Element,
    );
    expect(container.querySelectorAll('.oge-treemap-tile')).toHaveLength(6);
  });
});

describe('<OgeSunburstChart>', () => {
  it('segments per level, centre caption, drill via click and centre', () => {
    const onSegmentClick = vi.fn();
    const { container } = render(
      <StrictMode>
        <OgeSunburstChart
          dataSource={DATA}
          onSegmentClick={onSegmentClick}
          locale="en-US"
        />
      </StrictMode>,
    );
    expect(container.querySelectorAll('.oge-sunburst-segment')).toHaveLength(6);
    expect(
      container.querySelector('.oge-sunburst-center-name')?.textContent,
    ).toBe('All');
    fireEvent.click(
      container.querySelector('.oge-sunburst-segment') as Element,
    );
    expect(onSegmentClick).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Europe' }),
    );
    expect(container.querySelectorAll('.oge-sunburst-segment')).toHaveLength(2);
    fireEvent.click(
      container.querySelector('.oge-sunburst-center-up') as Element,
    );
    expect(container.querySelectorAll('.oge-sunburst-segment')).toHaveLength(6);
  });

  it('arrow keys walk siblings and children', () => {
    const { container } = render(
      <OgeSunburstChart dataSource={DATA} locale="en-US" />,
    );
    const wrap = container.querySelector('.oge-chart-plot-wrap') as HTMLElement;
    const live = (): string =>
      container.querySelectorAll('.oge-chart-live')[1]?.textContent ?? '';
    fireEvent.keyDown(wrap, { key: 'ArrowRight' });
    fireEvent.keyDown(wrap, { key: 'ArrowDown' });
    expect(live()).toBe('Germany: 40 (57.1%)');
  });
});
