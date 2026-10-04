import { beginChartGesture, createChartPinchTracker } from './chart-gesture';
import { cartesianKeyCommand, type OgeChartKeyContext } from './chart-keyboard';
import {
  chartAnimationVars,
  chartPrefersReducedMotion,
  chartSeriesEnterOrigin,
  resolveChartAnimation,
} from './chart-animation';
import { createLinearScale } from './scale';
import {
  mergeOgeChartsMessages,
  OGE_DEFAULT_CHARTS_MESSAGES,
} from './charts-config';

/** jsdom has no PointerEvent: a MouseEvent carrying the pointer fields. */
function pointer(
  type: string,
  init: { id: number; x?: number; y?: number; kind?: string },
): PointerEvent {
  const event = new MouseEvent(type, {
    clientX: init.x ?? 0,
    clientY: init.y ?? 0,
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(event, 'pointerId', { value: init.id });
  Object.defineProperty(event, 'pointerType', { value: init.kind ?? 'touch' });
  return event as PointerEvent;
}

const ctx = (
  overrides: Partial<OgeChartKeyContext> = {},
): OgeChartKeyContext => ({
  argCount: 4,
  position: 1,
  seriesIndex: 0,
  seriesCount: 3,
  isSeriesVisible: () => true,
  ...overrides,
});

describe('keyboard orientation', () => {
  it('walks arguments with Up/Down and series with Left/Right when rotated', () => {
    const rotated = ctx({ rotated: true });
    expect(cartesianKeyCommand('ArrowDown', rotated)).toMatchObject({
      type: 'argument',
      position: 2,
    });
    expect(cartesianKeyCommand('ArrowUp', rotated)).toMatchObject({
      type: 'argument',
      position: 0,
    });
    expect(cartesianKeyCommand('ArrowRight', rotated)).toEqual({
      type: 'series',
      seriesIndex: 1,
    });
  });

  it('mirrors the horizontal arrows in RTL', () => {
    expect(cartesianKeyCommand('ArrowLeft', ctx({ rtl: true }))).toMatchObject({
      type: 'argument',
      position: 2,
    });
    expect(cartesianKeyCommand('ArrowRight', ctx({ rtl: true }))).toMatchObject(
      {
        position: 0,
      },
    );
    // rotated + RTL: Left is the next series
    expect(
      cartesianKeyCommand('ArrowLeft', ctx({ rtl: true, rotated: true })),
    ).toEqual({ type: 'series', seriesIndex: 1 });
  });
});

describe('gesture pointers', () => {
  it('ignores other pointers and can be cancelled', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    const moves: number[] = [];
    const finishes: [boolean, boolean][] = [];
    const down = pointer('pointerdown', { id: 1 });
    target.dispatchEvent(down);
    const handle = beginChartGesture(down, {
      onMove: (dx) => moves.push(dx),
      onFinish: (commit, cancelled) => finishes.push([commit, cancelled]),
    });
    document.dispatchEvent(pointer('pointermove', { id: 2, x: 50 }));
    expect(moves).toEqual([]);
    document.dispatchEvent(pointer('pointermove', { id: 1, x: 20 }));
    expect(moves).toEqual([20]);
    document.dispatchEvent(pointer('pointerup', { id: 2 }));
    expect(finishes).toEqual([]);
    handle.cancel();
    expect(finishes).toEqual([[false, true]]);
    target.remove();
  });

  it('turns a second finger into a pinch and ends it when one lifts', () => {
    const calls: string[] = [];
    let last: number[] = [];
    const tracker = createChartPinchTracker({
      onPinchStart: () => calls.push('start'),
      onPinch: (sa, sb, a, b) => {
        last = [sa.clientX, sb.clientX, a.clientX, b.clientX];
      },
      onPinchEnd: (cancelled) => calls.push(cancelled ? 'cancel' : 'end'),
    });
    expect(
      tracker.pointerDown(pointer('pointerdown', { id: 1, kind: 'mouse' })),
    ).toBe(false);
    expect(tracker.pointerDown(pointer('pointerdown', { id: 1, x: 10 }))).toBe(
      false,
    );
    expect(tracker.active).toBe(false);
    expect(tracker.pointerDown(pointer('pointerdown', { id: 2, x: 30 }))).toBe(
      true,
    );
    expect(tracker.active).toBe(true);
    document.dispatchEvent(pointer('pointermove', { id: 2, x: 60 }));
    expect(last).toEqual([10, 30, 10, 60]);
    document.dispatchEvent(pointer('pointerup', { id: 1 }));
    expect(calls).toEqual(['start', 'end']);
    expect(tracker.active).toBe(false);
    document.dispatchEvent(pointer('pointerup', { id: 2 }));
    tracker.dispose();
  });
});

describe('animation', () => {
  it('resolves the boolean shorthand and the options object', () => {
    expect(resolveChartAnimation(true, false)).toMatchObject({
      transitions: true,
      drawIn: true,
      duration: 600,
    });
    expect(resolveChartAnimation(false, false).drawIn).toBe(false);
    expect(
      resolveChartAnimation({ duration: 900, easing: 'linear' }, false),
    ).toMatchObject({ drawIn: true, duration: 900, easing: 'linear' });
    expect(resolveChartAnimation({ duration: 0 }, false).drawIn).toBe(false);
  });

  it('turns everything off under reduced motion', () => {
    expect(resolveChartAnimation(true, true)).toMatchObject({
      transitions: false,
      drawIn: false,
    });
  });

  it('reads matchMedia SSR-safely', () => {
    const original = globalThis.matchMedia;
    Object.defineProperty(globalThis, 'matchMedia', {
      configurable: true,
      value: (query: string) => ({ matches: query.includes('reduce') }),
    });
    expect(chartPrefersReducedMotion()).toBe(true);
    Object.defineProperty(globalThis, 'matchMedia', {
      configurable: true,
      value: undefined,
    });
    expect(chartPrefersReducedMotion()).toBe(false);
    Object.defineProperty(globalThis, 'matchMedia', {
      configurable: true,
      value: original,
    });
  });

  it('exposes the CSS variables and the baseline origin', () => {
    expect(chartAnimationVars(resolveChartAnimation(true, false))).toEqual({
      '--oge-chart-anim-duration': '600ms',
      '--oge-chart-anim-easing': 'cubic-bezier(0, 0, 0.2, 1)',
    });
    const scale = createLinearScale({
      min: -10,
      max: 30,
      rangePx: 400,
      inverted: true,
    });
    expect(chartSeriesEnterOrigin(scale)).toBe('0px 300px');
    expect(chartSeriesEnterOrigin(undefined)).toBe('0px 0px');
  });
});

describe('period messages', () => {
  it('merge key by key', () => {
    const merged = mergeOgeChartsMessages(OGE_DEFAULT_CHARTS_MESSAGES, {
      periods: { ...OGE_DEFAULT_CHARTS_MESSAGES.periods, all: 'Tümü' },
    });
    expect(merged.periods.all).toBe('Tümü');
    expect(merged.periods.month1).toBe('1M');
  });
});
