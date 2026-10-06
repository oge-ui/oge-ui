import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OgeTooltipCore, type OgeTooltipShowMode } from './tooltip-core';

function harness(
  options: {
    showMode?: OgeTooltipShowMode;
    text?: string;
    hasContent?: boolean;
  } = {},
) {
  const trigger = document.createElement('button');
  document.body.append(trigger);
  const state = { open: false };
  const core = new OgeTooltipCore({
    text: () => options.text ?? 'Hint',
    hasContent:
      options.hasContent === undefined ? undefined : () => !!options.hasContent,
    showMode: () => options.showMode ?? 'hover',
    showDelay: () => 100,
    hideDelay: () => 50,
    isOpen: () => state.open,
    open: () => (state.open = true),
    close: () => (state.open = false),
    describedByTarget: () => trigger,
    panelId: 'tip-1',
  });
  return { core, state, trigger };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('OgeTooltipCore show modes', () => {
  it("defaults to 'hover': pointer dwell plus focus", () => {
    const h = harness();
    expect(h.core.showMode()).toBe('hover');
    h.core.pointerEnter();
    vi.advanceTimersByTime(100);
    expect(h.state.open).toBe(true);
    h.core.pointerLeave();
    vi.advanceTimersByTime(50);
    expect(h.state.open).toBe(false);
    h.core.focusIn();
    expect(h.state.open).toBe(true);
    expect(h.trigger.getAttribute('aria-describedby')).toBe('tip-1');
  });

  it("'focus' ignores the pointer", () => {
    const h = harness({ showMode: 'focus' });
    h.core.pointerEnter();
    vi.advanceTimersByTime(500);
    expect(h.state.open).toBe(false);
    h.core.focusIn();
    expect(h.state.open).toBe(true);
    h.core.focusOut();
    expect(h.state.open).toBe(false);
  });

  it("'click' toggles on activation and hides on blur / Escape", () => {
    const h = harness({ showMode: 'click' });
    h.core.focusIn();
    h.core.pointerEnter();
    vi.advanceTimersByTime(500);
    expect(h.state.open).toBe(false);
    h.core.click();
    expect(h.state.open).toBe(true);
    h.core.click();
    expect(h.state.open).toBe(false);
    h.core.click();
    h.core.focusOut();
    expect(h.state.open).toBe(false);
    h.core.click();
    h.core.keyDown('Escape');
    expect(h.state.open).toBe(false);
  });

  it("'manual' only follows the imperative API", () => {
    const h = harness({ showMode: 'manual' });
    h.core.click();
    h.core.focusIn();
    h.core.pointerEnter();
    vi.advanceTimersByTime(500);
    expect(h.state.open).toBe(false);
    h.core.toggle();
    expect(h.state.open).toBe(true);
    h.core.focusOut(); // blur does not hide a manual tooltip
    expect(h.state.open).toBe(true);
    h.core.toggle();
    expect(h.state.open).toBe(false);
  });
});

describe('OgeTooltipCore content', () => {
  it('rich content shows even with blank text', () => {
    expect(harness({ text: '' }).core.canShow()).toBe(false);
    expect(harness({ text: '', hasContent: true }).core.canShow()).toBe(true);
    expect(harness({ text: '', hasContent: false }).core.canShow()).toBe(false);
  });
});
