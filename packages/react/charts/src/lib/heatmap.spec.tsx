import { StrictMode } from 'react';
import { fireEvent, render } from '@testing-library/react';
import { OgeHeatmap } from './heatmap';

const DATA = [
  { day: 'Mon', hour: '9', load: 10 },
  { day: 'Mon', hour: '10', load: 30 },
  { day: 'Tue', hour: '9', load: 20 },
];

describe('<OgeHeatmap>', () => {
  it('renders the full grid, axis labels, the colour legend and a 2-D sr table', () => {
    const { container } = render(
      <StrictMode>
        <OgeHeatmap
          dataSource={DATA}
          xField="hour"
          yField="day"
          valueField="load"
          locale="en-US"
        />
      </StrictMode>,
    );
    expect(container.querySelectorAll('.oge-heatmap-cell')).toHaveLength(4);
    expect(container.querySelectorAll('.oge-heatmap-cell-empty')).toHaveLength(
      1,
    );
    expect(
      container.querySelector('.oge-chart-color-legend')?.getAttribute('role'),
    ).toBe('img');
    const header = Array.from(
      container.querySelectorAll('.oge-chart-sr-table thead th'),
    ).map((th) => th.textContent);
    expect(header).toEqual(['Argument', '9', '10']);
    expect(
      container.querySelector('.oge-chart-svg')?.getAttribute('aria-label'),
    ).toBe('heatmap, 2 rows by 2 columns');
  });

  it('arrow keys move the active cell; Enter toggles the selection', () => {
    const onCellClick = vi.fn();
    const { container } = render(
      <OgeHeatmap
        dataSource={DATA}
        xField="hour"
        yField="day"
        valueField="load"
        onCellClick={onCellClick}
        locale="en-US"
      />,
    );
    const wrap = container.querySelector('.oge-chart-plot-wrap') as HTMLElement;
    const live = container.querySelector('.oge-chart-live') as HTMLElement;
    fireEvent.keyDown(wrap, { key: 'ArrowRight' });
    expect(live.textContent).toBe('Mon, 9: 10');
    fireEvent.keyDown(wrap, { key: 'ArrowRight' });
    expect(live.textContent).toBe('Mon, 10: 30');
    fireEvent.keyDown(wrap, { key: 'ArrowDown' });
    expect(live.textContent).toBe('Tue, 10: no data');
    fireEvent.keyDown(wrap, { key: 'Enter' });
    expect(onCellClick).toHaveBeenCalledTimes(1);
    expect(
      container.querySelectorAll('.oge-chart-point-selected'),
    ).toHaveLength(1);
  });
});
