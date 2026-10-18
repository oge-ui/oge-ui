import {
  chartAnimationEasing,
  chartEasingFunction,
  chartValueBaselinePx,
  resolveChartAnimation,
} from './chart-animation';
import { createLinearScale } from './scale';

describe('easing presets → motion tokens', () => {
  it('maps each preset to its token with the raw curve as the fallback', () => {
    expect(resolveChartAnimation({ easing: 'easeOut' }, false)).toMatchObject({
      easing: 'var(--oge-motion-easing-decelerate, cubic-bezier(0, 0, 0.2, 1))',
      easingToken: '--oge-motion-easing-decelerate',
      easingFallback: 'cubic-bezier(0, 0, 0.2, 1)',
      tweens: true,
    });
    expect(resolveChartAnimation({ easing: 'easeIn' }, false).easingToken).toBe(
      '--oge-motion-easing-accelerate',
    );
    expect(
      resolveChartAnimation({ easing: 'easeInOut' }, false).easingToken,
    ).toBe('--oge-motion-easing-standard');
    expect(resolveChartAnimation({ easing: 'linear' }, false)).toMatchObject({
      easing: 'linear',
      easingToken: null,
    });
    expect(resolveChartAnimation(true, true).tweens).toBe(false);
    expect(resolveChartAnimation({ duration: 0 }, false).tweens).toBe(false);
  });

  it('reads the token as the element sees it, else the fallback', () => {
    const resolved = resolveChartAnimation(true, false);
    expect(chartAnimationEasing(resolved, null)).toBe(
      'cubic-bezier(0, 0, 0.2, 1)',
    );
    const host = document.createElement('div');
    document.body.appendChild(host);
    expect(chartAnimationEasing(resolved, host)).toBe(
      'cubic-bezier(0, 0, 0.2, 1)',
    );
    host.style.setProperty(
      '--oge-motion-easing-decelerate',
      'cubic-bezier(0, 0, 0, 1)',
    );
    expect(chartAnimationEasing(resolved, host)).toBe(
      'cubic-bezier(0, 0, 0, 1)',
    );
    host.remove();
  });
});

describe('chartEasingFunction', () => {
  it('evaluates cubic-bezier curves and the keywords', () => {
    const linearish = chartEasingFunction('cubic-bezier(0, 0, 1, 1)');
    expect(linearish(0.3)).toBeCloseTo(0.3, 4);
    const easeOut = chartEasingFunction('cubic-bezier(0, 0, 0.2, 1)');
    expect(easeOut(0)).toBe(0);
    expect(easeOut(1)).toBe(1);
    expect(easeOut(0.5)).toBeGreaterThan(0.7);
    expect(chartEasingFunction('ease-in')(0.5)).toBeLessThan(0.5);
    expect(chartEasingFunction('linear')(0.25)).toBe(0.25);
  });

  it('evaluates linear() springs, overshoot included', () => {
    const spring = chartEasingFunction('linear(0, 0.6, 1.05, 1)');
    expect(spring(0)).toBe(0);
    expect(spring(1 / 6)).toBeCloseTo(0.3, 5);
    expect(spring(2 / 3)).toBeCloseTo(1.05, 5);
    expect(spring(1)).toBe(1);
    const stops = chartEasingFunction('linear(0, 0.5 25%, 1)');
    expect(stops(0.25)).toBeCloseTo(0.5, 5);
    expect(stops(0.625)).toBeCloseTo(0.75, 5);
  });

  it('falls back to the default curve for anything else', () => {
    const fallback = chartEasingFunction('steps(4)');
    expect(fallback(0.5)).toBeCloseTo(
      chartEasingFunction('cubic-bezier(0, 0, 0.2, 1)')(0.5),
      6,
    );
    expect(chartEasingFunction('var(--x)')(1)).toBe(1);
  });

  it('places the baseline at 0 clamped into the axis', () => {
    const scale = createLinearScale({
      min: 10,
      max: 30,
      rangePx: 200,
      inverted: true,
    });
    expect(chartValueBaselinePx(scale)).toBe(scale.toPx(10));
  });
});
