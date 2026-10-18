import { StrictMode } from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import type {
  OgeChartAnimationOptions,
  OgeChartSeriesInput,
} from '@oge-ui/charts-engine';
import { OgeChart } from './chart';
import { OgePieChart } from './pie-chart';

interface Row {
  month: string;
  a: number;
  b: number;
}

const ROWS: Row[] = [
  { month: 'Jan', a: 10, b: 30 },
  { month: 'Feb', a: 20, b: 30 },
  { month: 'Mar', a: 30, b: 30 },
];
const DOUBLED = ROWS.map((r) => ({ ...r, a: r.a * 2 }));

const SERIES: OgeChartSeriesInput<Row>[] = [
  { type: 'bar', argumentField: 'month', valueField: 'a', name: 'A' },
  { type: 'line', argumentField: 'month', valueField: 'b', name: 'B' },
];
const AXIS = { min: 0, max: 100 };
const FAST: OgeChartAnimationOptions = { duration: 100, easing: 'linear' };

function Chart({
  rows,
  animation = FAST,
}: {
  rows: Row[];
  animation?: boolean | OgeChartAnimationOptions;
}) {
  return (
    <OgeChart
      dataSource={rows}
      series={SERIES}
      valueAxis={AXIS}
      animation={animation}
      locale="en-US"
    />
  );
}

/** A hand-driven requestAnimationFrame + clock. */
function manualFrames() {
  let now = 0;
  let queue: { id: number; cb: FrameRequestCallback }[] = [];
  let nextId = 1;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    const id = nextId++;
    queue.push({ id, cb });
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    queue = queue.filter((entry) => entry.id !== id);
  });
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  return {
    advance(ms: number): void {
      act(() => {
        now += ms;
        const run = queue;
        queue = [];
        for (const entry of run) entry.cb(now);
      });
    },
  };
}

const barHeights = (root: ParentNode): number[] =>
  Array.from(root.querySelectorAll('rect.oge-chart-bar')).map((el) =>
    Number(el.getAttribute('height')),
  );

/** Lets the first-render draw-in (duration + 50ms) run out. */
async function afterDrawIn(): Promise<void> {
  await act(() => new Promise((resolve) => setTimeout(resolve, 200)));
}

describe('<OgeChart> data-change tweens', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('glides bars from the old values instead of jumping', async () => {
    const frames = manualFrames();
    const { container, rerender } = render(
      <StrictMode>
        <Chart rows={ROWS} />
      </StrictMode>,
    );
    await afterDrawIn();
    const before = barHeights(container);
    rerender(
      <StrictMode>
        <Chart rows={DOUBLED} />
      </StrictMode>,
    );
    // the layout effect swaps in the first frame before paint
    expect(barHeights(container)).toEqual(before);
    frames.advance(50);
    barHeights(container).forEach((h, i) =>
      expect(h).toBeCloseTo(before[i] * 1.5, 0),
    );
    frames.advance(60);
    barHeights(container).forEach((h, i) =>
      expect(h).toBeCloseTo(before[i] * 2, 0),
    );
  });

  it('continues from the frame on screen when new data arrives mid-tween', async () => {
    const frames = manualFrames();
    const { container, rerender } = render(<Chart rows={ROWS} />);
    await afterDrawIn();
    rerender(<Chart rows={DOUBLED} />);
    frames.advance(50);
    const onScreen = barHeights(container);
    rerender(<Chart rows={ROWS.map((r) => ({ ...r, a: 0 }))} />);
    expect(barHeights(container)).toEqual(onScreen);
    frames.advance(50);
    barHeights(container).forEach((h, i) =>
      expect(Math.abs(h - onScreen[i] / 2)).toBeLessThan(1),
    );
  });

  it('fades a legend-hidden series out, then removes it', async () => {
    const frames = manualFrames();
    const { container } = render(<Chart rows={ROWS} />);
    await afterDrawIn();
    const toggle = container.querySelectorAll<HTMLButtonElement>(
      '.oge-chart-legend-btn',
    )[1];
    fireEvent.click(toggle);
    frames.advance(50);
    const group = container
      .querySelector('.oge-chart-line')
      ?.closest('.oge-chart-series');
    expect(Number(group?.getAttribute('opacity'))).toBeCloseTo(0.5, 1);
    frames.advance(60);
    expect(container.querySelector('.oge-chart-line')).toBeNull();
  });

  it('jumps when animation is off', async () => {
    manualFrames();
    const { container, rerender } = render(
      <Chart rows={ROWS} animation={false} />,
    );
    const before = barHeights(container);
    rerender(<Chart rows={DOUBLED} animation={false} />);
    barHeights(container).forEach((h, i) =>
      expect(h).toBeCloseTo(before[i] * 2, 0),
    );
  });
});

describe('<OgePieChart> arc tween', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('sweeps the slices to the new angles', () => {
    const frames = manualFrames();
    const pie = (a: number) => (
      <OgePieChart
        dataSource={[
          { name: 'A', v: a },
          { name: 'B', v: 100 - a },
        ]}
        argumentField="name"
        valueField="v"
        showLabels={false}
        animation={FAST}
      />
    );
    const { container, rerender } = render(pie(50));
    const paths = (): string[] =>
      Array.from(container.querySelectorAll('.oge-chart-pie-slice')).map(
        (el) => el.getAttribute('d') ?? '',
      );
    const before = paths();
    rerender(pie(75));
    expect(paths()).toEqual(before);
    frames.advance(50);
    const mid = paths();
    expect(mid[0]).not.toBe(before[0]);
    frames.advance(60);
    expect(paths()[0]).not.toBe(mid[0]);
  });
});
