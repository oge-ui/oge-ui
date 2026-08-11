import { Component, signal, viewChild } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeRangeSelector } from './range-selector';
import type { OgeChartRange, OgeChartSeriesInput } from '../charts-types';

@Component({
  imports: [OgeRangeSelector],
  template: `
    <oge-range-selector
      [dataSource]="data"
      [series]="series"
      [(value)]="range"
      locale="en-US"
      style="width: 600px"
    />
  `,
})
class Host {
  readonly selector = viewChild.required(OgeRangeSelector);
  readonly range = signal<OgeChartRange | null>(null);
  readonly data = Array.from({ length: 100 }, (_, i) => ({
    t: i * 10,
    v: Math.sin(i / 8) * 40 + 50,
  }));
  readonly series: OgeChartSeriesInput[] = [
    { type: 'area', argumentField: 't', valueField: 'v', name: 'Load' },
  ];
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

describe('<oge-range-selector>', () => {
  let fixture: ComponentFixture<Host>;
  let host: HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    await settle(fixture);
    host = fixture.nativeElement as HTMLElement;
  });

  function handles(): HTMLElement[] {
    return Array.from(host.querySelectorAll<HTMLElement>('.oge-range-handle'));
  }

  it('renders the background series, window and two slider handles', () => {
    expect(host.querySelectorAll('.oge-chart-area').length).toBe(1);
    expect(host.querySelectorAll('.oge-range-window').length).toBe(1);
    const sliders = handles();
    expect(sliders.length).toBe(2);
    expect(sliders[0].getAttribute('role')).toBe('slider');
    expect(sliders[0].getAttribute('aria-valuenow')).toBe('0');
    expect(sliders[1].getAttribute('aria-valuenow')).toBe('990');
  });

  it('arrow keys move a handle and update the two-way value', async () => {
    const [start] = handles();
    start.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    );
    await settle(fixture);
    const range = fixture.componentInstance.range();
    expect(range).not.toBeNull();
    expect(range?.min).toBeGreaterThan(0);
    expect(range?.max).toBe(990);
    // aria reflects the new window
    expect(Number(handles()[0].getAttribute('aria-valuenow'))).toBeCloseTo(
      range?.min ?? 0,
    );
  });

  it('Home/End jump to the bounds; reset() restores the full range', async () => {
    const component = fixture.componentInstance;
    const [start] = handles();
    start.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    );
    await settle(fixture);
    start.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Home', bubbles: true }),
    );
    await settle(fixture);
    expect(component.range()?.min).toBe(0);
    component.selector().reset();
    await settle(fixture);
    expect(component.range()).toBeNull();
  });

  it('writing the model from outside moves the window', async () => {
    fixture.componentInstance.range.set({ min: 200, max: 400 });
    await settle(fixture);
    const window = host.querySelector('.oge-range-window');
    const x = Number(window?.getAttribute('x'));
    const width = Number(window?.getAttribute('width'));
    // 200..400 of 0..990 across 600px
    expect(x).toBeCloseTo((200 / 990) * 600, 0);
    expect(width).toBeCloseTo((200 / 990) * 600, 0);
  });
});
