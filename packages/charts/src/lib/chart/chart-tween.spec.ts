import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
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

@Component({
  imports: [OgeChart],
  template: `
    <oge-chart
      [dataSource]="data()"
      [series]="series"
      [animation]="animation()"
      [valueAxis]="{ min: 0, max: 100 }"
      locale="en-US"
      style="height: 400px; width: 600px"
    />
  `,
})
class CartesianHost {
  readonly data = signal<Row[]>(ROWS);
  readonly animation = signal<boolean | OgeChartAnimationOptions>({
    duration: 100,
    easing: 'linear',
  });
  readonly series: OgeChartSeriesInput<Row>[] = [
    { type: 'bar', argumentField: 'month', valueField: 'a', name: 'A' },
    { type: 'line', argumentField: 'month', valueField: 'b', name: 'B' },
  ];
}

interface Share {
  name: string;
  v: number;
}

@Component({
  imports: [OgePieChart],
  template: `
    <oge-pie-chart
      [dataSource]="data()"
      argumentField="name"
      valueField="v"
      [animation]="{ duration: 100, easing: 'linear' }"
      [showLabels]="false"
      style="height: 300px; width: 400px"
    />
  `,
})
class PieHost {
  readonly data = signal<Share[]>([
    { name: 'A', v: 50 },
    { name: 'B', v: 50 },
  ]);
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
      now += ms;
      const run = queue;
      queue = [];
      for (const entry of run) entry.cb(now);
    },
  };
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

/** Lets the first-render draw-in (duration + 50ms) run out. */
const afterDrawIn = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 200));

const barHeights = (host: HTMLElement): number[] =>
  Array.from(host.querySelectorAll('rect.oge-chart-bar')).map((el) =>
    Number(el.getAttribute('height')),
  );

describe('<oge-chart> data-change tweens', () => {
  let frames: ReturnType<typeof manualFrames>;
  let fixture: ComponentFixture<CartesianHost>;
  let host: HTMLElement;

  beforeEach(async () => {
    frames = manualFrames();
    fixture = TestBed.createComponent(CartesianHost);
    host = fixture.nativeElement as HTMLElement;
    await settle(fixture);
    await afterDrawIn();
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('glides bars from the old values instead of jumping', () => {
    const before = barHeights(host);
    fixture.componentInstance.data.set(ROWS.map((r) => ({ ...r, a: r.a * 2 })));
    fixture.detectChanges();
    // the first frame is the old geometry
    expect(barHeights(host)).toEqual(before);
    frames.advance(50);
    fixture.detectChanges();
    const mid = barHeights(host);
    mid.forEach((h, i) => expect(h).toBeCloseTo(before[i] * 1.5, 0));
    frames.advance(60);
    fixture.detectChanges();
    barHeights(host).forEach((h, i) => expect(h).toBeCloseTo(before[i] * 2, 0));
  });

  it('continues from the frame on screen when new data arrives mid-tween', () => {
    const before = barHeights(host);
    fixture.componentInstance.data.set(ROWS.map((r) => ({ ...r, a: r.a * 2 })));
    fixture.detectChanges();
    frames.advance(50);
    fixture.detectChanges();
    const onScreen = barHeights(host);
    fixture.componentInstance.data.set(ROWS.map((r) => ({ ...r, a: 0 })));
    fixture.detectChanges();
    // no jump: the retargeted tween starts where the bars are
    expect(barHeights(host)).toEqual(onScreen);
    expect(onScreen).not.toEqual(before);
    frames.advance(50);
    fixture.detectChanges();
    barHeights(host).forEach((h, i) =>
      // halfway to the (near-zero) target; zero bars keep a 1px minimum
      expect(Math.abs(h - onScreen[i] / 2)).toBeLessThan(1),
    );
  });

  it('fades a legend-hidden series out, then removes it', () => {
    const toggle = host.querySelectorAll<HTMLButtonElement>(
      '.oge-chart-legend-btn',
    )[1];
    toggle.click();
    fixture.detectChanges();
    frames.advance(50);
    fixture.detectChanges();
    const line = host.querySelector('.oge-chart-line');
    expect(line).not.toBeNull();
    const group = line?.closest('.oge-chart-series');
    expect(Number(group?.getAttribute('opacity'))).toBeCloseTo(0.5, 1);
    frames.advance(60);
    fixture.detectChanges();
    expect(host.querySelector('.oge-chart-line')).toBeNull();
    // and back: it fades in again
    toggle.click();
    fixture.detectChanges();
    const shown = host
      .querySelector('.oge-chart-line')
      ?.closest('.oge-chart-series');
    expect(Number(shown?.getAttribute('opacity'))).toBe(0);
  });

  it('jumps when animation is off', () => {
    fixture.componentInstance.animation.set(false);
    fixture.detectChanges();
    const before = barHeights(host);
    fixture.componentInstance.data.set(ROWS.map((r) => ({ ...r, a: r.a * 2 })));
    fixture.detectChanges();
    barHeights(host).forEach((h, i) => expect(h).toBeCloseTo(before[i] * 2, 0));
  });

  it('jumps under reduced motion', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('reduce'),
    }));
    const reduced = TestBed.createComponent(CartesianHost);
    const el = reduced.nativeElement as HTMLElement;
    await settle(reduced);
    const before = barHeights(el);
    reduced.componentInstance.data.set(ROWS.map((r) => ({ ...r, a: r.a * 2 })));
    reduced.detectChanges();
    barHeights(el).forEach((h, i) => expect(h).toBeCloseTo(before[i] * 2, 0));
  });
});

describe('<oge-pie-chart> arc tween', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('sweeps the slices to the new angles', async () => {
    const frames = manualFrames();
    const fixture = TestBed.createComponent(PieHost);
    const host = fixture.nativeElement as HTMLElement;
    await settle(fixture);
    const paths = (): string[] =>
      Array.from(host.querySelectorAll('.oge-chart-pie-slice')).map(
        (el) => el.getAttribute('d') ?? '',
      );
    const before = paths();
    fixture.componentInstance.data.set([
      { name: 'A', v: 75 },
      { name: 'B', v: 25 },
    ]);
    fixture.detectChanges();
    expect(paths()).toEqual(before);
    frames.advance(50);
    fixture.detectChanges();
    const mid = paths();
    expect(mid[0]).not.toBe(before[0]);
    frames.advance(60);
    fixture.detectChanges();
    const end = paths();
    expect(end[0]).not.toBe(mid[0]);
    expect(end).toHaveLength(2);
  });
});
