import { Component, signal, viewChild } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgePieChart, type OgeChartPieSliceEvent } from './pie-chart';

interface Slice {
  country: string;
  share: number;
}

@Component({
  imports: [OgePieChart],
  template: `
    <oge-pie-chart
      [dataSource]="data()"
      argumentField="country"
      valueField="share"
      [type]="type()"
      [smallValuesGrouping]="grouping()"
      title="Market"
      locale="en-US"
      style="height: 320px; width: 480px"
      (sliceClick)="clicks.push($event)"
    />
  `,
})
class Host {
  readonly pie = viewChild.required(OgePieChart<Slice>);
  readonly data = signal<Slice[]>([
    { country: 'DE', share: 40 },
    { country: 'FR', share: 30 },
    { country: 'TR', share: 20 },
    { country: 'NL', share: 6 },
    { country: 'BE', share: 4 },
  ]);
  readonly type = signal<'pie' | 'doughnut'>('pie');
  readonly grouping = signal<{
    mode: 'topN' | 'smallValueThreshold';
    topCount?: number;
    threshold?: number;
  } | null>(null);
  readonly clicks: OgeChartPieSliceEvent<Slice>[] = [];
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

describe('<oge-pie-chart>', () => {
  let fixture: ComponentFixture<Host>;
  let host: HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    await settle(fixture);
    host = fixture.nativeElement as HTMLElement;
  });

  function slices(): SVGPathElement[] {
    return Array.from(
      host.querySelectorAll<SVGPathElement>('.oge-chart-pie-slice'),
    );
  }

  it('renders one slice per item with labels, connectors and the sr table', () => {
    expect(slices().length).toBe(5);
    expect(host.querySelectorAll('.oge-chart-pie-connector').length).toBe(5);
    const rows = host.querySelectorAll('.oge-chart-sr-table tbody tr');
    expect(rows.length).toBe(5);
    expect(rows[0].textContent).toContain('DE');
    expect(rows[0].textContent).toContain('40');
    expect(rows[0].textContent).toContain('%');
  });

  it('doughnut carves the inner radius into the path', async () => {
    const pieD = slices()[0].getAttribute('d') as string;
    expect(pieD).toContain('L'); // wedge from the center
    fixture.componentInstance.type.set('doughnut');
    await settle(fixture);
    const donutD = slices()[0].getAttribute('d') as string;
    expect(donutD).not.toBe(pieD);
    // a donut slice has two arc radii (outer + inner)
    expect((donutD.match(/A /g) ?? []).length).toBe(2);
  });

  it('small-value grouping merges the tail into an "Others" slice', async () => {
    fixture.componentInstance.grouping.set({ mode: 'topN', topCount: 3 });
    await settle(fixture);
    expect(slices().length).toBe(4);
    const rows = host.querySelectorAll('.oge-chart-sr-table tbody tr');
    expect(rows[3].textContent).toContain('Others');
    expect(rows[3].textContent).toContain('10');
  });

  it('slice click emits the payload, selects and explodes the slice', async () => {
    const before = slices()[1].getAttribute('d');
    slices()[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle(fixture);
    const click = fixture.componentInstance.clicks[0];
    expect(click.argument).toBe('FR');
    expect(click.value).toBe(30);
    expect(fixture.componentInstance.pie().selectedSlices()).toEqual([1]);
    expect(slices()[1].getAttribute('d')).not.toBe(before);
  });

  it('legend buttons expose pressed state and toggle selection', async () => {
    const buttons = host.querySelectorAll<HTMLButtonElement>(
      '.oge-chart-legend-btn',
    );
    expect(buttons.length).toBe(5);
    buttons[2].click();
    await settle(fixture);
    expect(fixture.componentInstance.pie().selectedSlices()).toEqual([2]);
    expect(buttons[2].getAttribute('aria-pressed')).toBe('true');
  });
});
