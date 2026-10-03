import { describe, expect, it } from 'vitest';
import {
  OgeSchedulerAdaptiveViewController,
  resolveSchedulerAdaptiveView,
  type OgeSchedulerAdaptiveView,
} from './adaptive-view';
import type { OgeSchedulerView } from './scheduler-types';

function harness(adaptive: OgeSchedulerAdaptiveView, start: OgeSchedulerView) {
  let view = start;
  const writes: OgeSchedulerView[] = [];
  const controller = new OgeSchedulerAdaptiveViewController({
    adaptiveView: () => adaptive,
    currentView: () => view,
    setCurrentView: (next) => {
      view = next;
      writes.push(next);
    },
  });
  return {
    controller,
    writes,
    view: () => view,
    pick: (next: OgeSchedulerView) => (view = next),
  };
}

describe('resolveSchedulerAdaptiveView', () => {
  it('is off by default and fills defaults for true', () => {
    expect(resolveSchedulerAdaptiveView(undefined)).toBeNull();
    expect(resolveSchedulerAdaptiveView(false)).toBeNull();
    expect(resolveSchedulerAdaptiveView(true)).toEqual({
      breakpoint: 600,
      view: 'agenda',
    });
    expect(
      resolveSchedulerAdaptiveView({ breakpoint: 480, view: 'day' }),
    ).toEqual({ breakpoint: 480, view: 'day' });
  });
});

describe('OgeSchedulerAdaptiveViewController', () => {
  it('switches to agenda below the breakpoint and restores on the way back', () => {
    const h = harness(true, 'week');
    h.controller.update(900);
    expect(h.writes).toEqual([]);
    h.controller.update(500);
    expect(h.view()).toBe('agenda');
    expect(h.controller.isNarrow()).toBe(true);
    h.controller.update(450); // no crossing → no write
    expect(h.writes).toEqual(['agenda']);
    h.controller.update(800);
    expect(h.view()).toBe('week');
    expect(h.writes).toEqual(['agenda', 'week']);
  });

  it('keeps a view the user picked while narrow', () => {
    const h = harness(true, 'month');
    h.controller.update(400);
    h.pick('day');
    h.controller.update(1000);
    expect(h.view()).toBe('day');
    expect(h.writes).toEqual(['agenda']);
  });

  it('ignores unmeasured widths and does nothing when off', () => {
    const off = harness(false, 'week');
    off.controller.update(300);
    expect(off.writes).toEqual([]);
    const h = harness({ breakpoint: 700 }, 'week');
    h.controller.update(0);
    expect(h.writes).toEqual([]);
    h.controller.update(650);
    expect(h.view()).toBe('agenda');
  });

  it('does not write when the compact view is already active', () => {
    const h = harness(true, 'agenda');
    h.controller.update(300);
    h.controller.update(900);
    expect(h.writes).toEqual([]);
  });
});
