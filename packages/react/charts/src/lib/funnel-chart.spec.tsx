import { StrictMode, useState } from 'react';
import { fireEvent, render } from '@testing-library/react';
import { OgeFunnelChart } from './funnel-chart';
import type { OgeChartFunnelItemEvent } from '@oge-ui/charts-engine';

interface Stage {
  stage: string;
  count: number;
}

const DATA: Stage[] = [
  { stage: 'Leads', count: 400 },
  { stage: 'Visits', count: 1000 },
  { stage: 'Orders', count: 100 },
];

function Host({
  onItemClick,
}: {
  onItemClick?: (e: OgeChartFunnelItemEvent<Stage>) => void;
}) {
  const [selected, setSelected] = useState<readonly number[]>([]);
  return (
    <>
      <OgeFunnelChart
        dataSource={DATA}
        argumentField="stage"
        valueField="count"
        selectedItems={selected}
        onSelectedItemsChange={setSelected}
        onItemClick={onItemClick}
        title="Pipeline"
        locale="en-US"
      />
      <output>{selected.join(',')}</output>
    </>
  );
}

describe('<OgeFunnelChart>', () => {
  it('renders sorted stages, legend, labels and the sr table', () => {
    const { container } = render(
      <StrictMode>
        <Host />
      </StrictMode>,
    );
    expect(container.querySelectorAll('.oge-funnel-item')).toHaveLength(3);
    expect(container.querySelectorAll('.oge-chart-legend-btn')).toHaveLength(3);
    expect(
      container
        .querySelector('.oge-chart-plot-wrap')
        ?.getAttribute('aria-label'),
    ).toBe('Pipeline funnel chart, 3 stages');
    const headers = Array.from(
      container.querySelectorAll('.oge-chart-sr-table thead th'),
    ).map((th) => th.textContent);
    expect(headers).toEqual(['Argument', 'Value', 'Share']);
    const rows = container.querySelectorAll('.oge-chart-sr-table tbody tr');
    expect(rows[0].textContent).toContain('Visits');
    expect(rows[2].textContent).toContain('10% of first stage');
  });

  it('keyboard walks the stages and Enter selects', () => {
    const onItemClick = vi.fn();
    const { container } = render(<Host onItemClick={onItemClick} />);
    const wrap = container.querySelector('.oge-chart-plot-wrap') as HTMLElement;
    const live = container.querySelector('.oge-chart-live') as HTMLElement;
    fireEvent.keyDown(wrap, { key: 'ArrowDown' });
    expect(live.textContent).toBe('Visits: 1,000');
    fireEvent.keyDown(wrap, { key: 'ArrowDown' });
    expect(live.textContent).toBe('Leads: 400, 40% of first stage');
    expect(container.querySelectorAll('.oge-chart-item-active')).toHaveLength(
      1,
    );
    fireEvent.keyDown(wrap, { key: 'Enter' });
    expect(onItemClick).toHaveBeenCalledTimes(1);
    expect(container.querySelector('output')?.textContent).toBe('1');
    expect(
      container.querySelectorAll('.oge-chart-point-selected'),
    ).toHaveLength(1);
  });

  it('a cancelled legend click keeps the selection', () => {
    const { container } = render(
      <OgeFunnelChart
        dataSource={DATA}
        argumentField="stage"
        valueField="count"
        onLegendClick={(event) => {
          event.cancel = true;
        }}
        locale="en-US"
      />,
    );
    fireEvent.click(
      container.querySelector('.oge-chart-legend-btn') as HTMLElement,
    );
    expect(
      container
        .querySelector('.oge-chart-legend-btn')
        ?.getAttribute('aria-pressed'),
    ).toBe('false');
  });
});
