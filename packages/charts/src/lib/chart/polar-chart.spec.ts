import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgePolarChart } from './polar-chart';
import type { OgeChartSeriesInput } from '../charts-types';

interface Row {
  skill: string;
  ada: number;
  grace: number | null;
}

const DATA: Row[] = [
  { skill: 'TS', ada: 9, grace: 7 },
  { skill: 'CSS', ada: 6, grace: 8 },
  { skill: 'SQL', ada: 7, grace: null },
  { skill: 'Rust', ada: 4, grace: 6 },
  { skill: 'Go', ada: 5, grace: 9 },
];

@Component({
  imports: [OgePolarChart],
  template: `
    <oge-polar-chart
      [dataSource]="data()"
      [series]="series()"
      [commonSeries]="{ argumentField: 'skill' }"
      [spider]="spider()"
      locale="en-US"
      style="height: 360px; width: 480px"
    />
  `,
})
class Host {
  readonly data = signal<Row[]>(DATA);
  readonly series = signal<OgeChartSeriesInput[]>([
    { type: 'area', valueField: 'ada', name: 'Ada' },
    { type: 'line', valueField: 'grace', name: 'Grace' },
  ]);
  readonly spider = signal(false);
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

describe('<oge-polar-chart>', () => {
  let fixture: ComponentFixture<Host>;
  let host: HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    await settle(fixture);
    host = fixture.nativeElement as HTMLElement;
  });

  it('renders spokes with category labels, rings and radar loops', () => {
    const labels = Array.from(
      host.querySelectorAll('.oge-chart-axis-label'),
    ).map((el) => el.textContent?.trim());
    for (const skill of ['TS', 'CSS', 'SQL', 'Rust', 'Go']) {
      expect(labels).toContain(skill);
    }
    // two series: one filled area + two stroke loops
    expect(host.querySelectorAll('.oge-chart-area').length).toBe(1);
    expect(host.querySelectorAll('.oge-chart-line').length).toBe(2);
    // area loop closes; the gapped series does not
    const [adaPath, gracePath] = Array.from(
      host.querySelectorAll('.oge-chart-line'),
    ).map((el) => el.getAttribute('d') as string);
    expect(adaPath.endsWith('Z')).toBe(true);
    expect(gracePath.includes('Z')).toBe(false); // null value = gap
  });

  it('spider mode swaps circular rings for polygons', async () => {
    const circular = host
      .querySelector('.oge-chart-grid')
      ?.getAttribute('d') as string;
    expect(circular).toContain('A ');
    fixture.componentInstance.spider.set(true);
    await settle(fixture);
    const spider = host
      .querySelector('.oge-chart-grid')
      ?.getAttribute('d') as string;
    expect(spider).not.toContain('A ');
  });

  it('legend toggle hides a series and the sr table carries values', async () => {
    const buttons = host.querySelectorAll<HTMLButtonElement>(
      '.oge-chart-legend-btn',
    );
    expect(buttons.length).toBe(2);
    buttons[0].click();
    await settle(fixture);
    expect(host.querySelectorAll('.oge-chart-area').length).toBe(0);
    const rows = host.querySelectorAll('.oge-chart-sr-table tbody tr');
    expect(rows.length).toBe(5);
    expect(rows[0].textContent).toContain('TS');
    expect(rows[0].textContent).toContain('9');
  });

  it('keyboard arrows walk categories and announce', async () => {
    const wrap = host.querySelector<HTMLElement>('.oge-chart-plot-wrap');
    if (wrap === null) throw new Error('no wrap');
    wrap.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    );
    await settle(fixture);
    const live = host.querySelector('.oge-chart-live');
    expect(live?.textContent).toContain('Ada');
    expect(live?.textContent).toContain('TS');
  });

  it('bar series render as sectors', async () => {
    fixture.componentInstance.series.set([
      { type: 'bar', valueField: 'ada', name: 'Ada' },
    ]);
    await settle(fixture);
    expect(host.querySelectorAll('.oge-chart-bar').length).toBe(5);
  });
});
