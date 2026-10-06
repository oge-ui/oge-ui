import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeSparkline } from './sparkline';
import type { OgeSparklineType } from '@oge-ui/charts-engine';

@Component({
  imports: [OgeSparkline],
  template: `
    <oge-sparkline
      [dataSource]="data()"
      [type]="type()"
      [markers]="true"
      [tooltipEnabled]="true"
      title="Sales"
      locale="en-US"
    />
  `,
})
class Host {
  readonly data = signal<(number | null)[]>([4, 7, 5, 9, -2, 10]);
  readonly type = signal<OgeSparklineType>('line');
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('<oge-sparkline>', () => {
  let fixture: ComponentFixture<Host>;
  let host: HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    await settle(fixture);
    host = fixture.nativeElement as HTMLElement;
  });

  it('is a labelled image summarizing the series', () => {
    const svg = host.querySelector('svg');
    expect(svg?.getAttribute('role')).toBe('img');
    expect(svg?.getAttribute('aria-label')).toBe(
      'Sales sparkline, 6 points: first 4, last 10, low -2, high 10',
    );
    expect(host.querySelector('.oge-sparkline-line')).not.toBeNull();
    expect(
      host.querySelectorAll('.oge-sparkline-marker').length,
    ).toBeGreaterThanOrEqual(3);
  });

  it('switches to bars and win-loss ticks', async () => {
    fixture.componentInstance.type.set('bar');
    await settle(fixture);
    expect(host.querySelectorAll('.oge-sparkline-bar')).toHaveLength(6);
    expect(host.querySelectorAll('.oge-sparkline-bar-negative')).toHaveLength(
      1,
    );
    fixture.componentInstance.type.set('winloss');
    await settle(fixture);
    expect(host.querySelector('.oge-sparkline-line')).toBeNull();
    expect(host.querySelectorAll('.oge-sparkline-bar')).toHaveLength(6);
  });

  it('shows the nearest point on hover', async () => {
    const wrap = host.querySelector('.oge-sparkline-wrap') as HTMLElement;
    const move = new MouseEvent('pointermove', { clientX: 118, bubbles: true });
    wrap.dispatchEvent(move);
    await settle(fixture);
    expect(
      host.querySelector('.oge-sparkline-tooltip')?.textContent?.trim(),
    ).toBe('6: 10');
    wrap.dispatchEvent(new MouseEvent('pointerleave'));
    await settle(fixture);
    expect(host.querySelector('.oge-sparkline-tooltip')).toBeNull();
  });

  it('its entry never imports the cartesian chart or the primary entry', () => {
    const source = readFileSync(join(__dirname, 'sparkline.ts'), 'utf8');
    const imports = [...source.matchAll(/from '([^']+)'/g)].map((m) => m[1]);
    expect(imports.sort()).toEqual([
      '@angular/common',
      '@angular/core',
      '@oge-ui/charts-engine',
      '@oge-ui/charts/config',
    ]);
  });
});
