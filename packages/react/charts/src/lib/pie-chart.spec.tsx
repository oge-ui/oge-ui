import { StrictMode, createRef, useState } from 'react';
import { fireEvent, render } from '@testing-library/react';
import { OgePieChart, type OgePieChartHandle } from './pie-chart';
import type {
  OgeChartPieSliceEvent,
  OgeChartSmallValuesGrouping,
} from '@oge-ui/charts-engine';

interface Slice {
  country: string;
  share: number;
}

const DATA: Slice[] = [
  { country: 'DE', share: 40 },
  { country: 'FR', share: 30 },
  { country: 'TR', share: 20 },
  { country: 'NL', share: 6 },
  { country: 'BE', share: 4 },
];

function slices(root: ParentNode): SVGPathElement[] {
  return Array.from(
    root.querySelectorAll<SVGPathElement>('.oge-chart-pie-slice'),
  );
}

function Host({
  type = 'pie',
  grouping = null,
  onSliceClick,
}: {
  type?: 'pie' | 'doughnut';
  grouping?: OgeChartSmallValuesGrouping | null;
  onSliceClick?: (event: OgeChartPieSliceEvent<Slice>) => void;
}) {
  const [selected, setSelected] = useState<readonly number[]>([]);
  return (
    <>
      <OgePieChart
        dataSource={DATA}
        argumentField="country"
        valueField="share"
        type={type}
        smallValuesGrouping={grouping}
        selectedSlices={selected}
        onSelectedSlicesChange={setSelected}
        onSliceClick={onSliceClick}
        locale="en-US"
        title="Share"
      />
      <output>{selected.join(',')}</output>
    </>
  );
}

describe('<OgePieChart>', () => {
  it('renders one slice per item with labels, connectors and the sr table', () => {
    const { container } = render(<Host />);
    expect(slices(container)).toHaveLength(5);
    expect(container.querySelectorAll('.oge-chart-pie-connector')).toHaveLength(
      5,
    );
    const rows = container.querySelectorAll('.oge-chart-sr-table tbody tr');
    expect(rows).toHaveLength(5);
    expect(rows[0].textContent).toContain('DE');
    expect(rows[0].textContent).toContain('40');
    expect(rows[0].textContent).toContain('%');
    expect(
      container.querySelector('.oge-chart-svg')?.getAttribute('aria-label'),
    ).toBe('Share pie chart with 5 slices');
    expect(container.firstElementChild?.className).toBe(
      'oge-chart oge-pie-chart',
    );
  });

  it('doughnut carves the inner radius into the path', () => {
    const { container, rerender } = render(<Host />);
    const pieD = slices(container)[0].getAttribute('d') ?? '';
    rerender(<Host type="doughnut" />);
    const donutD = slices(container)[0].getAttribute('d') ?? '';
    expect(donutD).not.toBe(pieD);
    expect((donutD.match(/A /g) ?? []).length).toBe(2);
  });

  it('small-value grouping merges the tail into an "Others" slice', () => {
    const { container } = render(
      <Host grouping={{ mode: 'topN', topCount: 3 }} />,
    );
    expect(slices(container)).toHaveLength(4);
    const rows = container.querySelectorAll('.oge-chart-sr-table tbody tr');
    expect(rows[3].textContent).toContain('Others');
    expect(rows[3].textContent).toContain('10');
  });

  it('slice click emits the payload, selects, explodes and announces', () => {
    const clicks: OgeChartPieSliceEvent<Slice>[] = [];
    const { container } = render(<Host onSliceClick={(e) => clicks.push(e)} />);
    const before = slices(container)[1].getAttribute('d');
    fireEvent.click(slices(container)[1]);
    expect(clicks[0].argument).toBe('FR');
    expect(clicks[0].value).toBe(30);
    expect(container.querySelector('output')?.textContent).toBe('1');
    expect(slices(container)[1].getAttribute('d')).not.toBe(before);
    expect(slices(container)[1].classList).toContain(
      'oge-chart-point-selected',
    );
    expect(container.querySelector('.oge-chart-live')?.textContent).toBe(
      'FR, 30 (30%) selected',
    );
  });

  it('legend buttons expose pressed state, toggle selection and honor a veto', () => {
    const vetoed = vi.fn((event: { cancel: boolean }) => {
      event.cancel = true;
    });
    const { container, rerender } = render(<Host />);
    const buttons = container.querySelectorAll<HTMLButtonElement>(
      '.oge-chart-legend-btn',
    );
    expect(buttons).toHaveLength(5);
    fireEvent.click(buttons[2]);
    expect(container.querySelector('output')?.textContent).toBe('2');
    expect(buttons[2].getAttribute('aria-pressed')).toBe('true');
    rerender(
      <OgePieChart
        dataSource={DATA}
        argumentField="country"
        valueField="share"
        defaultSelectedSlices={[]}
        onLegendClick={vetoed}
      />,
    );
    const again = container.querySelectorAll<HTMLButtonElement>(
      '.oge-chart-legend-btn',
    );
    fireEvent.click(again[0]);
    expect(vetoed).toHaveBeenCalled();
    expect(again[0].getAttribute('aria-pressed')).toBe('false');
  });

  it('hovering a slice shows the tooltip; tooltipEnabled=false suppresses it', () => {
    const { container, rerender } = render(<Host />);
    fireEvent.mouseEnter(slices(container)[0]);
    expect(container.querySelector('.oge-chart-tooltip-arg')?.textContent).toBe(
      'DE',
    );
    expect(container.querySelector('.oge-chart-tooltip-row')?.textContent).toBe(
      '40 (40%)',
    );
    fireEvent.mouseLeave(slices(container)[0]);
    expect(container.querySelector('.oge-chart-tooltip')).toBeNull();
    rerender(
      <OgePieChart
        dataSource={DATA}
        argumentField="country"
        valueField="share"
        tooltipEnabled={false}
      />,
    );
    fireEvent.mouseEnter(slices(container)[0]);
    expect(container.querySelector('.oge-chart-tooltip')).toBeNull();
  });

  it('renderLegendItem, the no-data text and the handle', () => {
    const ref = createRef<OgePieChartHandle>();
    const { container, rerender } = render(
      <OgePieChart
        ref={ref}
        dataSource={DATA}
        argumentField="country"
        valueField="share"
        renderLegendItem={(item) => <i className="custom">{item.name}</i>}
      />,
    );
    expect(container.querySelectorAll('.custom')).toHaveLength(5);
    expect(ref.current?.getSvgElement().tagName.toLowerCase()).toBe('svg');
    rerender(<OgePieChart ref={ref} dataSource={[]} />);
    expect(container.querySelector('.oge-chart-no-data')?.textContent).toBe(
      'No data',
    );
  });

  it('keeps working after a StrictMode remount', () => {
    const { container } = render(
      <StrictMode>
        <Host />
      </StrictMode>,
    );
    fireEvent.click(slices(container)[0]);
    expect(container.querySelector('output')?.textContent).toBe('0');
  });
});
