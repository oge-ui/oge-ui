import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  OGE_LOAD_PANEL_TARGET_CLASS,
  OgeLoadPanelCore,
  ogeAcquireLoadPanelTarget,
  ogeLoadPanelBusyTarget,
  ogeLoadPanelNeedsPositioning,
  ogeResolveLoadPanelTarget,
} from './load-panel-core';

function machine() {
  const log: string[] = [];
  const core = new OgeLoadPanelCore({
    show: () => log.push('show'),
    hide: () => log.push('hide'),
  });
  return { core, log };
}

describe('OgeLoadPanelCore', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows and hides at once without timings', () => {
    const { core, log } = machine();
    core.update(true);
    expect(core.shown).toBe(true);
    core.update(false);
    expect(core.shown).toBe(false);
    expect(log).toEqual(['show', 'hide']);
  });

  it('waits for showDelay and never flashes a load that ends inside it', () => {
    const { core, log } = machine();
    core.update(true, { showDelay: 200 });
    vi.advanceTimersByTime(150);
    expect(log).toEqual([]);
    core.update(false, { showDelay: 200 });
    vi.advanceTimersByTime(500);
    expect(log).toEqual([]);

    core.update(true, { showDelay: 200 });
    vi.advanceTimersByTime(200);
    expect(log).toEqual(['show']);
  });

  it('a repeated visible=true does not restart the delay', () => {
    const { core, log } = machine();
    core.update(true, { showDelay: 200 });
    vi.advanceTimersByTime(150);
    core.update(true, { showDelay: 200 });
    vi.advanceTimersByTime(50);
    expect(log).toEqual(['show']);
  });

  it('keeps a shown panel up for minDisplayTime', () => {
    const { core, log } = machine();
    const timings = { minDisplayTime: 500 };
    core.update(true, timings);
    vi.advanceTimersByTime(100);
    core.update(false, timings);
    expect(core.shown).toBe(true);
    vi.advanceTimersByTime(399);
    expect(log).toEqual(['show']);
    vi.advanceTimersByTime(1);
    expect(log).toEqual(['show', 'hide']);
  });

  it('hides at once when minDisplayTime already passed', () => {
    const { core, log } = machine();
    core.update(true, { minDisplayTime: 300 });
    vi.advanceTimersByTime(1000);
    core.update(false, { minDisplayTime: 300 });
    expect(log).toEqual(['show', 'hide']);
  });

  it('turning visible again during the minimum keeps the panel up', () => {
    const { core, log } = machine();
    const timings = { minDisplayTime: 500 };
    core.update(true, timings);
    core.update(false, timings);
    vi.advanceTimersByTime(200);
    core.update(true, timings);
    vi.advanceTimersByTime(1000);
    expect(log).toEqual(['show']);
    expect(core.shown).toBe(true);
  });

  it('destroy drops pending timers; revive re-arms the machine', () => {
    const { core, log } = machine();
    core.update(true, { showDelay: 100 });
    core.destroy();
    vi.advanceTimersByTime(500);
    expect(log).toEqual([]);
    core.update(true);
    expect(log).toEqual([]);

    core.revive();
    core.update(true);
    expect(log).toEqual(['show']);
  });

  it('a revived machine keeps a painted panel and re-arms its hide', () => {
    const { core, log } = machine();
    const timings = { minDisplayTime: 300 };
    core.update(true, timings);
    core.update(false, timings);
    core.destroy();
    core.revive();
    expect(core.shown).toBe(true);
    // StrictMode replays the current request: no second show
    core.update(false, timings);
    vi.advanceTimersByTime(300);
    expect(log).toEqual(['show', 'hide']);
  });

  it('negative timings behave like zero', () => {
    const { core, log } = machine();
    core.update(true, { showDelay: -50, minDisplayTime: -5 });
    core.update(false, { showDelay: -50, minDisplayTime: -5 });
    expect(log).toEqual(['show', 'hide']);
  });
});

describe('ogeResolveLoadPanelTarget', () => {
  it('defaults to the parent, takes an element or a selector', () => {
    const parent = document.createElement('section');
    parent.id = 'lp-target';
    const host = document.createElement('div');
    parent.appendChild(host);
    document.body.appendChild(parent);
    const other = document.createElement('div');

    expect(ogeResolveLoadPanelTarget(undefined, host)).toBe(parent);
    expect(ogeResolveLoadPanelTarget(other, host)).toBe(other);
    expect(ogeResolveLoadPanelTarget('#lp-target', host)).toBe(parent);
    expect(ogeResolveLoadPanelTarget('#nothing', host)).toBeNull();
    expect(ogeResolveLoadPanelTarget('##invalid', host)).toBeNull();
    expect(ogeResolveLoadPanelTarget(undefined, null)).toBeNull();
    parent.remove();
  });
});

describe('ogeLoadPanelBusyTarget', () => {
  const el = document.createElement('div');

  it('marks the covered container', () => {
    expect(
      ogeLoadPanelBusyTarget({
        fullScreen: false,
        explicitTarget: false,
        resolved: el,
      }),
    ).toBe(el);
  });

  it('a full-screen panel marks only an explicit target', () => {
    expect(
      ogeLoadPanelBusyTarget({
        fullScreen: true,
        explicitTarget: false,
        resolved: el,
      }),
    ).toBeNull();
    expect(
      ogeLoadPanelBusyTarget({
        fullScreen: true,
        explicitTarget: true,
        resolved: el,
      }),
    ).toBe(el);
  });
});

describe('ogeAcquireLoadPanelTarget', () => {
  it('sets aria-busy and restores the previous value', () => {
    const el = document.createElement('div');
    el.setAttribute('aria-busy', 'false');
    const release = ogeAcquireLoadPanelTarget(el);
    expect(el.getAttribute('aria-busy')).toBe('true');
    release();
    expect(el.getAttribute('aria-busy')).toBe('false');
  });

  it('removes an attribute that was not there', () => {
    const el = document.createElement('div');
    const release = ogeAcquireLoadPanelTarget(el);
    release();
    expect(el.hasAttribute('aria-busy')).toBe(false);
  });

  it('is ref-counted across panels and idempotent per release', () => {
    const el = document.createElement('div');
    const first = ogeAcquireLoadPanelTarget(el);
    const second = ogeAcquireLoadPanelTarget(el);
    first();
    first();
    expect(el.getAttribute('aria-busy')).toBe('true');
    second();
    expect(el.hasAttribute('aria-busy')).toBe(false);
  });

  it('adds and removes the positioning class on request', () => {
    const el = document.createElement('div');
    const release = ogeAcquireLoadPanelTarget(el, { positioned: true });
    expect(el.classList.contains(OGE_LOAD_PANEL_TARGET_CLASS)).toBe(true);
    release();
    expect(el.classList.contains(OGE_LOAD_PANEL_TARGET_CLASS)).toBe(false);
  });
});

describe('ogeLoadPanelNeedsPositioning', () => {
  it('only a static container needs the class', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    expect(ogeLoadPanelNeedsPositioning(el)).toBe(true);
    el.style.position = 'absolute';
    expect(ogeLoadPanelNeedsPositioning(el)).toBe(false);
    el.remove();
  });
});
