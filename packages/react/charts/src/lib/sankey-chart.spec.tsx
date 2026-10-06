import { StrictMode } from 'react';
import { fireEvent, render } from '@testing-library/react';
import { OgeSankeyChart } from './sankey-chart';

const LINKS = [
  { source: 'A', target: 'X', value: 10 },
  { source: 'A', target: 'Y', value: 5 },
  { source: 'B', target: 'X', value: 5 },
  { source: 'X', target: 'Z', value: 15 },
  { source: 'Y', target: 'Z', value: 5 },
];

describe('<OgeSankeyChart>', () => {
  it('nodes, links, labels and the sr table of flows', () => {
    const { container } = render(
      <StrictMode>
        <OgeSankeyChart dataSource={LINKS} locale="en-US" />
      </StrictMode>,
    );
    expect(container.querySelectorAll('.oge-sankey-node')).toHaveLength(5);
    expect(container.querySelectorAll('.oge-sankey-link')).toHaveLength(5);
    expect(
      container.querySelector('.oge-chart-svg')?.getAttribute('aria-label'),
    ).toBe('Sankey diagram, 5 nodes, 5 links');
    const header = Array.from(
      container.querySelectorAll('.oge-chart-sr-table thead th'),
    ).map((th) => th.textContent);
    expect(header).toEqual(['Source', 'Target', 'Value']);
  });

  it('hovering a node dims the unrelated links', () => {
    const { container } = render(
      <OgeSankeyChart dataSource={LINKS} locale="en-US" />,
    );
    fireEvent.mouseEnter(
      container.querySelector('.oge-sankey-node') as Element,
    );
    expect(container.querySelectorAll('.oge-sankey-link-lit')).toHaveLength(2);
    expect(
      container.querySelectorAll('.oge-sankey-link.oge-sankey-dim'),
    ).toHaveLength(3);
  });

  it('keyboard walks columns and announces node totals; Enter fires onNodeClick', () => {
    const onNodeClick = vi.fn();
    const { container } = render(
      <OgeSankeyChart
        dataSource={LINKS}
        onNodeClick={onNodeClick}
        locale="en-US"
      />,
    );
    const wrap = container.querySelector('.oge-chart-plot-wrap') as HTMLElement;
    const live = container.querySelector('.oge-chart-live') as HTMLElement;
    fireEvent.keyDown(wrap, { key: 'ArrowDown' });
    expect(live.textContent).toMatch(/^[AB]: out \d+$/);
    fireEvent.keyDown(wrap, { key: 'ArrowRight' });
    expect(live.textContent).toMatch(/^[XY]: in \d+, out \d+$/);
    fireEvent.keyDown(wrap, { key: 'Enter' });
    expect(onNodeClick).toHaveBeenCalledTimes(1);
  });
});
