import { StrictMode, createRef } from 'react';
import { render, waitFor } from '@testing-library/react';
import { OgeCircularGauge, type OgeGaugeHandle } from './circular-gauge';
import { OgeLinearGauge } from './linear-gauge';
import { OgeBulletChart } from './bullet-chart';

describe('<OgeCircularGauge>', () => {
  it('is a labelled meter with valuetext, ticks and the sr table', () => {
    const { container } = render(
      <OgeCircularGauge
        value={85}
        title="Speed"
        locale="en-US"
        animation={false}
        ranges={[
          { start: 0, end: 60, label: 'Normal' },
          { start: 60, end: 90, label: 'Warning' },
        ]}
      />,
    );
    const meter = container.querySelector('[role="meter"]');
    expect(meter?.getAttribute('aria-label')).toBe('Speed gauge');
    expect(meter?.getAttribute('aria-valuenow')).toBe('85');
    expect(meter?.getAttribute('aria-valuemin')).toBe('0');
    expect(meter?.getAttribute('aria-valuemax')).toBe('100');
    expect(meter?.getAttribute('aria-valuetext')).toBe('85, Warning');
    expect(
      container.querySelector('.oge-chart-svg')?.getAttribute('aria-hidden'),
    ).toBe('true');
    expect(container.querySelectorAll('.oge-gauge-range')).toHaveLength(2);
    expect(container.querySelector('.oge-gauge-needle')).not.toBeNull();
    expect(container.querySelector('.oge-gauge-value')?.textContent).toBe('85');
    const rows = container.querySelectorAll('.oge-chart-sr-table tbody tr');
    expect(rows[0].textContent).toContain('85, Warning');
    expect(container.firstElementChild?.className).toBe(
      'oge-chart oge-gauge oge-circular-gauge oge-chart-static',
    );
  });

  it('sweeps from the minimum, then rotates to the value (StrictMode)', async () => {
    const { container } = render(
      <StrictMode>
        <OgeCircularGauge value={50} locale="en-US" />
      </StrictMode>,
    );
    const needle = (): string =>
      (container.querySelector('.oge-gauge-needle') as SVGElement | null)?.style
        .transform ?? '';
    await waitFor(() => expect(needle()).toBe('rotate(0deg)'));
    expect(
      container.querySelector('[role="meter"]')?.getAttribute('aria-valuenow'),
    ).toBe('50');
  });

  it('bar indicator draws a dash over a fixed pathLength; the handle exposes the svg', () => {
    const ref = createRef<OgeGaugeHandle>();
    const { container } = render(
      <OgeCircularGauge
        ref={ref}
        value={25}
        indicator="bar"
        animation={false}
        locale="en-US"
      />,
    );
    const bar = container.querySelector('.oge-gauge-bar') as SVGPathElement;
    expect(bar.getAttribute('pathLength')).toBe('1000');
    expect(bar.style.strokeDasharray).toBe('0 0 250 1000');
    expect(ref.current?.getSvgElement()).toBe(container.querySelector('svg'));
  });
});

describe('<OgeLinearGauge>', () => {
  it('meter semantics, explicit RTL sets dir, marker translates', () => {
    const { container } = render(
      <OgeLinearGauge
        value={40}
        indicator="marker"
        rtlEnabled
        animation={false}
        locale="en-US"
        title="Level"
      />,
    );
    expect(container.firstElementChild?.getAttribute('dir')).toBe('rtl');
    expect(
      container.querySelector('[role="meter"]')?.getAttribute('aria-valuetext'),
    ).toBe('40');
    const marker = container.querySelector(
      '.oge-gauge-marker',
    ) as SVGPathElement;
    expect(marker.style.transform).toMatch(/^translate\(/);
  });

  it('vertical gets its modifier class', () => {
    const { container } = render(
      <OgeLinearGauge value={10} orientation="vertical" locale="en-US" />,
    );
    expect(
      container.firstElementChild?.classList.contains(
        'oge-linear-gauge-vertical',
      ),
    ).toBe(true);
  });
});

describe('<OgeBulletChart>', () => {
  it('img label speaks value and target; bands, bar, target and the sr table', () => {
    const { container } = render(
      <OgeBulletChart
        value={270}
        target={250}
        ranges={[
          { start: 0, end: 150 },
          { start: 150, end: 300 },
        ]}
        title="Revenue"
        locale="en-US"
      />,
    );
    expect(
      container.querySelector('.oge-chart-svg')?.getAttribute('aria-label'),
    ).toBe('Revenue bullet chart: value 270, target 250');
    expect(container.querySelectorAll('.oge-bullet-range')).toHaveLength(2);
    expect(container.querySelector('.oge-bullet-bar')).not.toBeNull();
    expect(container.querySelector('.oge-bullet-target')).not.toBeNull();
    expect(
      container.querySelectorAll('.oge-chart-sr-table tbody tr'),
    ).toHaveLength(4);
  });
});
