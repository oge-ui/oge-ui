import { StrictMode, createRef, useState } from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import {
  OgeRangeSelector,
  type OgeRangeSelectorHandle,
} from './range-selector';
import type { OgeChartRange, OgeChartSeriesInput } from '@oge-ui/charts-engine';

const DATA = Array.from({ length: 100 }, (_, i) => ({
  t: i * 10,
  v: Math.sin(i / 8) * 40 + 50,
}));
const SERIES: OgeChartSeriesInput<(typeof DATA)[number]>[] = [
  { type: 'area', argumentField: 't', valueField: 'v', name: 'Load' },
];

const ref = createRef<OgeRangeSelectorHandle>();
let latest: OgeChartRange | null = null;

function Host({ initial = null }: { initial?: OgeChartRange | null }) {
  const [range, setRange] = useState<OgeChartRange | null>(initial);
  latest = range;
  return (
    <OgeRangeSelector
      ref={ref}
      dataSource={DATA}
      series={SERIES}
      value={range}
      onValueChange={setRange}
      locale="en-US"
    />
  );
}

function handles(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('.oge-range-handle'));
}

describe('<OgeRangeSelector>', () => {
  beforeEach(() => {
    latest = null;
  });

  it('renders the background series, window and two slider handles', () => {
    const { container } = render(<Host />);
    expect(container.querySelectorAll('.oge-chart-area')).toHaveLength(1);
    expect(container.querySelectorAll('.oge-range-window')).toHaveLength(1);
    const [start, end] = handles(container);
    expect(start.getAttribute('role')).toBe('slider');
    expect(start.getAttribute('aria-valuenow')).toBe('0');
    expect(end.getAttribute('aria-valuenow')).toBe('990');
    expect(start.getAttribute('aria-label')).toBe('Range start');
    expect(container.firstElementChild?.className).toBe(
      'oge-chart oge-range-selector',
    );
  });

  it('arrow keys move a handle, update the controlled value and announce', () => {
    const { container } = render(<Host />);
    fireEvent.keyDown(handles(container)[0], { key: 'ArrowRight' });
    expect(latest).not.toBeNull();
    expect(latest?.min).toBeGreaterThan(0);
    expect(latest?.max).toBe(990);
    expect(
      Number(handles(container)[0].getAttribute('aria-valuenow')),
    ).toBeCloseTo(latest?.min ?? 0);
    expect(container.querySelector('.oge-chart-live')?.textContent).toMatch(
      /^Selected range: 19\.8 – 990$/,
    );
  });

  it('Home/End jump to the bounds; reset() restores the full range', () => {
    const { container } = render(<Host />);
    const [start] = handles(container);
    fireEvent.keyDown(start, { key: 'ArrowRight' });
    fireEvent.keyDown(start, { key: 'Home' });
    expect(latest?.min).toBe(0);
    act(() => ref.current?.reset());
    expect(latest).toBeNull();
  });

  it('writing the value from outside moves the window', () => {
    const { container } = render(<Host initial={{ min: 200, max: 400 }} />);
    const window = container.querySelector('.oge-range-window');
    const x = Number(window?.getAttribute('x'));
    const width = Number(window?.getAttribute('width'));
    expect(x).toBeCloseTo((200 / 990) * 600, 0);
    expect(width).toBeCloseTo((200 / 990) * 600, 0);
  });

  it('a track click centers the window; uncontrolled use works', () => {
    const onChange = vi.fn();
    const { container } = render(
      <OgeRangeSelector
        dataSource={DATA}
        series={SERIES}
        defaultValue={{ min: 0, max: 100 }}
        onValueChange={onChange}
      />,
    );
    const svg = container.querySelector<SVGSVGElement>('svg');
    if (svg === null) throw new Error('no svg');
    svg.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 600, height: 90 }) as DOMRect;
    fireEvent(
      svg,
      new MouseEvent('pointerdown', { bubbles: true, clientX: 300, button: 0 }),
    );
    const range = onChange.mock.calls[0][0] as OgeChartRange;
    expect((range.min + range.max) / 2).toBeCloseTo(495, 0);
    expect(
      Number(container.querySelector('.oge-range-window')?.getAttribute('x')),
    ).toBeGreaterThan(0);
  });

  it('a window drag moves both edges; Escape mid-drag restores', () => {
    const { container } = render(<Host initial={{ min: 100, max: 300 }} />);
    const windowRect = container.querySelector('.oge-range-window');
    if (windowRect === null) throw new Error('no window');
    fireEvent(
      windowRect,
      new MouseEvent('pointerdown', { bubbles: true, clientX: 100, button: 0 }),
    );
    fireEvent(
      document,
      new MouseEvent('pointermove', { bubbles: true, clientX: 160 }),
    );
    expect(latest?.min).toBeCloseTo(100 + (60 / 600) * 990, 0);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(latest).toEqual({ min: 100, max: 300 });
  });

  it('keeps working after a StrictMode remount', () => {
    const { container } = render(
      <StrictMode>
        <Host />
      </StrictMode>,
    );
    fireEvent.keyDown(handles(container)[1], { key: 'ArrowLeft' });
    expect(latest?.max).toBeLessThan(990);
  });
});
