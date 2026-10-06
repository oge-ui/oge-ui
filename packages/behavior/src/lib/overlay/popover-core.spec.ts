import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  OgePopoverCore,
  nextTabbableAfter,
  popoverPanelAria,
  popoverTriggerAria,
  resolvePopoverInitialFocus,
  supportsAriaExpanded,
  syncPopoverTriggerAria,
  type OgePopoverCloseReason,
  type OgePopoverCoreOptions,
  type OgePopoverOpenReason,
  type OgePopoverShowOn,
} from './popover-core';

interface Harness {
  core: OgePopoverCore;
  trigger: HTMLButtonElement;
  panel: HTMLElement;
  after: HTMLButtonElement;
  state: { open: boolean };
  log: string[];
}

/** A plain-closure host: no framework, no memoization. */
function harness(
  options: Partial<Omit<OgePopoverCoreOptions, 'showOn' | 'modal'>> & {
    showOn?: OgePopoverShowOn;
    modal?: boolean;
  } = {},
): Harness {
  document.body.innerHTML = `
    <button id="before">before</button>
    <button id="trigger">trigger</button>
    <button id="after">after</button>
    <div id="panel" tabindex="-1">
      <button id="first">first</button>
      <button id="last">last</button>
    </div>`;
  const trigger = document.getElementById('trigger') as HTMLButtonElement;
  const panel = document.getElementById('panel') as HTMLElement;
  const after = document.getElementById('after') as HTMLButtonElement;
  const state = { open: false };
  const log: string[] = [];
  const { showOn = 'click', modal = false, ...rest } = options;
  const core = new OgePopoverCore({
    showOn: () => showOn,
    modal: () => modal,
    showDelay: () => 100,
    hideDelay: () => 200,
    isOpen: () => state.open,
    commitOpen: (reason: OgePopoverOpenReason) => {
      state.open = true;
      log.push(`commitOpen:${reason}`);
    },
    commitClose: (reason: OgePopoverCloseReason) => {
      state.open = false;
      log.push(`commitClose:${reason}`);
    },
    trigger: () => trigger,
    panel: () => (state.open ? panel : null),
    onOpening: (e) => log.push(`opening:${e.reason}`),
    onOpened: (e) => log.push(`opened:${e.reason}`),
    onClosing: (e) => log.push(`closing:${e.reason}`),
    onClosed: (e) => log.push(`closed:${e.reason}`),
    ...rest,
  });
  return { core, trigger, panel, after, state, log };
}

const tab = (shiftKey = false) => ({
  key: 'Tab',
  shiftKey,
  preventDefault: vi.fn(),
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('open / close pipeline', () => {
  it('runs opening → commit → opened and closing → commit → closed', () => {
    const h = harness();
    expect(h.core.open()).toBe(true);
    expect(h.core.close('escape')).toBe(true);
    expect(h.log).toEqual([
      'opening:api',
      'commitOpen:api',
      'opened:api',
      'closing:escape',
      'commitClose:escape',
      'closed:escape',
    ]);
  });

  it('honours cancel on both pre-events', () => {
    const h = harness({
      onOpening: (e) => {
        e.cancel = true;
      },
    });
    expect(h.core.open()).toBe(false);
    expect(h.state.open).toBe(false);

    const g = harness({
      onClosing: (e) => {
        e.cancel = true;
      },
    });
    g.core.open();
    expect(g.core.close()).toBe(false);
    expect(g.state.open).toBe(true);
  });

  it('never opens while disabled and closes on sync() once disabled', () => {
    let disabled = true;
    const h = harness({ disabled: () => disabled });
    expect(h.core.open()).toBe(false);
    disabled = false;
    h.core.open();
    disabled = true;
    h.core.sync();
    expect(h.state.open).toBe(false);
  });

  it('syncs an externally written open state through the pipeline', () => {
    const h = harness({
      onClosing: (e) => {
        e.cancel = e.reason === 'api';
      },
    });
    expect(h.core.syncOpenState(true)).toBe(true);
    expect(h.core.syncOpenState(false)).toBe(true); // vetoed → still open
    expect(h.state.open).toBe(true);
  });

  it('routes the panel machine’s own closes through the pipeline', () => {
    const h = harness();
    h.core.open();
    expect(h.core.beforePanelClose('outside')).toBe(false);
    expect(h.log.at(-1)).toBe('closed:outside');
    h.core.open();
    h.core.beforePanelClose('escape');
    expect(h.log.at(-1)).toBe('closed:escape');
  });
});

describe('dismissal options', () => {
  it('closeOnEscape / closeOnOutsideClick: false keep it open', () => {
    const h = harness({
      closeOnEscape: () => false,
      closeOnOutsideClick: () => false,
    });
    h.core.open();
    h.core.beforePanelClose('escape');
    h.core.beforePanelClose('outside');
    expect(h.state.open).toBe(true);
  });
});

describe('click trigger', () => {
  it('toggles with reasons click / trigger', () => {
    const h = harness();
    h.core.triggerClick();
    expect(h.state.open).toBe(true);
    h.core.triggerClick();
    expect(h.state.open).toBe(false);
    expect(h.log).toContain('opened:click');
    expect(h.log).toContain('closed:trigger');
  });

  it('ignores hover and focus', () => {
    const h = harness();
    h.core.triggerPointerEnter();
    h.core.triggerFocusIn();
    vi.advanceTimersByTime(1000);
    expect(h.state.open).toBe(false);
  });
});

describe('hover trigger (hover intent)', () => {
  it('opens after the dwell and not before', () => {
    const h = harness({ showOn: 'hover' });
    h.core.triggerPointerEnter();
    vi.advanceTimersByTime(99);
    expect(h.state.open).toBe(false);
    vi.advanceTimersByTime(1);
    expect(h.log).toContain('opened:hover');
  });

  it('a pass-through never opens', () => {
    const h = harness({ showOn: 'hover' });
    h.core.triggerPointerEnter();
    h.core.triggerPointerLeave();
    vi.advanceTimersByTime(500);
    expect(h.state.open).toBe(false);
  });

  it('survives the trip from the trigger into the panel', () => {
    const h = harness({ showOn: 'hover' });
    h.core.open('hover');
    h.core.triggerPointerLeave();
    vi.advanceTimersByTime(150);
    h.core.panelPointerEnter();
    vi.advanceTimersByTime(1000);
    expect(h.state.open).toBe(true);
    h.core.panelPointerLeave();
    vi.advanceTimersByTime(200);
    expect(h.log.at(-1)).toBe('closed:pointerLeave');
  });

  it('stays open while focus is inside the panel', () => {
    const h = harness({ showOn: 'hover' });
    h.core.open('hover');
    (document.getElementById('first') as HTMLElement).focus();
    h.core.triggerPointerLeave();
    vi.advanceTimersByTime(1000);
    expect(h.state.open).toBe(true);
  });

  it('opens on keyboard focus too, so the content is never pointer-only', () => {
    const h = harness({ showOn: 'hover' });
    h.core.triggerFocusIn();
    expect(h.log).toContain('opened:focus');
  });
});

describe('focus trigger', () => {
  it('opens on focus and closes when focus leaves trigger and panel', () => {
    const h = harness({ showOn: 'focus' });
    h.core.triggerFocusIn();
    expect(h.state.open).toBe(true);
    h.core.triggerFocusOut({
      relatedTarget: document.getElementById('first'),
    });
    expect(h.state.open).toBe(true); // moved into the panel
    h.core.panelFocusOut({ relatedTarget: h.after });
    expect(h.log.at(-1)).toBe('closed:focusOut');
  });

  it('focus going nowhere is not a decision to leave', () => {
    const h = harness({ showOn: 'focus' });
    h.core.triggerFocusIn();
    h.core.triggerFocusOut({ relatedTarget: null });
    expect(h.state.open).toBe(true);
  });

  it('restoring focus to the trigger after Escape does not reopen', () => {
    const h = harness({ showOn: 'focus' });
    h.trigger.addEventListener('focusin', () => h.core.triggerFocusIn());
    h.core.open('click');
    (document.getElementById('first') as HTMLElement).focus();
    h.core.close('escape');
    expect(document.activeElement).toBe(h.trigger);
    expect(h.state.open).toBe(false);
  });
});

describe('manual', () => {
  it('only the API opens and closes it', () => {
    const h = harness({ showOn: 'manual' });
    h.core.triggerClick();
    h.core.triggerFocusIn();
    h.core.triggerPointerEnter();
    vi.advanceTimersByTime(1000);
    expect(h.state.open).toBe(false);
    h.core.open();
    h.core.triggerFocusOut({ relatedTarget: h.after });
    expect(h.state.open).toBe(true);
  });
});

describe('focus management', () => {
  it('non-modal click opens leave focus on the trigger (APG disclosure)', () => {
    const h = harness();
    h.trigger.focus();
    h.core.triggerClick();
    h.core.panelReady();
    expect(document.activeElement).toBe(h.trigger);
  });

  it('modal opens move focus to the first tabbable', () => {
    const h = harness({ modal: true });
    h.core.open('click');
    h.core.panelReady();
    expect(document.activeElement?.id).toBe('first');
  });

  it('hover and focus opens never move focus', () => {
    const h = harness({ modal: true, showOn: 'hover' });
    h.trigger.focus();
    h.core.open('hover');
    h.core.panelReady();
    expect(document.activeElement).toBe(h.trigger);
  });

  it('restores focus to the trigger when it would be lost', () => {
    const h = harness({ modal: true });
    h.core.open('click');
    h.core.panelReady();
    h.core.close('closeButton');
    expect(document.activeElement).toBe(h.trigger);
  });

  it('never steals focus after an outside click or a focus move', () => {
    const h = harness();
    h.core.open('click');
    (document.getElementById('first') as HTMLElement).focus();
    h.core.close('outside');
    expect(document.activeElement?.id).toBe('first');
  });

  it('restoreFocus: false keeps focus where it is', () => {
    const h = harness({ modal: true, restoreFocus: () => false });
    h.core.open('click');
    h.core.panelReady();
    h.core.close('escape');
    expect(document.activeElement?.id).toBe('first');
  });

  it('modal Tab wraps inside the panel', () => {
    const h = harness({ modal: true });
    h.core.open('click');
    h.core.panelReady();
    (document.getElementById('last') as HTMLElement).focus();
    const event = tab();
    h.core.panelKeyDown(event);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(document.activeElement?.id).toBe('first');
  });

  it('non-modal Tab reads the portaled panel as if it followed the trigger', () => {
    const h = harness();
    h.trigger.focus();
    h.core.open('click');
    const intoPanel = tab();
    h.core.triggerKeyDown(intoPanel);
    expect(intoPanel.preventDefault).toHaveBeenCalled();
    expect(document.activeElement?.id).toBe('first');

    const back = tab(true);
    h.core.panelKeyDown(back);
    expect(document.activeElement).toBe(h.trigger);

    (document.getElementById('last') as HTMLElement).focus();
    const out = tab();
    h.core.panelKeyDown(out);
    expect(out.preventDefault).toHaveBeenCalled();
    expect(document.activeElement).toBe(h.after);
  });

  it('Tab on a closed popover’s trigger is left to the browser', () => {
    const h = harness();
    const event = tab();
    h.core.triggerKeyDown(event);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});

describe('a11y decisions', () => {
  it('click / manual triggers announce a dialog popup', () => {
    expect(popoverTriggerAria('click', false, 'p1')).toEqual({
      'aria-haspopup': 'dialog',
      'aria-expanded': 'false',
      'aria-controls': null,
    });
    expect(popoverTriggerAria('manual', true, 'p1')).toEqual({
      'aria-haspopup': 'dialog',
      'aria-expanded': 'true',
      'aria-controls': 'p1',
    });
  });

  it('hover / focus triggers expose state without haspopup', () => {
    expect(popoverTriggerAria('hover', true, 'p1')['aria-haspopup']).toBe(null);
    expect(popoverTriggerAria('focus', true, 'p1')['aria-controls']).toBe('p1');
  });

  it('the panel is a dialog, modal only when asked', () => {
    expect(popoverPanelAria(true)).toEqual({
      role: 'dialog',
      'aria-modal': 'true',
    });
    expect(popoverPanelAria(false)['aria-modal']).toBe(null);
    const h = harness({ modal: true });
    expect(h.core.panelAria()['aria-modal']).toBe('true');
    expect(h.core.triggerAria('x')['aria-expanded']).toBe('false');
  });
});

describe('syncPopoverTriggerAria', () => {
  it('writes present attributes and removes null ones', () => {
    const el = document.createElement('button');
    syncPopoverTriggerAria(el, popoverTriggerAria('click', true, 'p9'));
    expect(el.getAttribute('aria-haspopup')).toBe('dialog');
    expect(el.getAttribute('aria-controls')).toBe('p9');
    syncPopoverTriggerAria(el, popoverTriggerAria('hover', false, 'p9'));
    expect(el.hasAttribute('aria-haspopup')).toBe(false);
    expect(el.hasAttribute('aria-controls')).toBe(false);
    expect(el.getAttribute('aria-expanded')).toBe('false');
  });

  it('leaves aria-expanded off text fields (textbox does not support it)', () => {
    const input = document.createElement('input');
    syncPopoverTriggerAria(input, popoverTriggerAria('focus', true, 'p9'));
    expect(input.hasAttribute('aria-expanded')).toBe(false);
    expect(input.getAttribute('aria-controls')).toBe('p9');
    expect(supportsAriaExpanded(document.createElement('textarea'))).toBe(
      false,
    );
    const combo = document.createElement('input');
    combo.setAttribute('role', 'combobox');
    expect(supportsAriaExpanded(combo)).toBe(true);
    const check = document.createElement('input');
    check.type = 'checkbox';
    expect(supportsAriaExpanded(check)).toBe(true);
    expect(supportsAriaExpanded(document.createElement('button'))).toBe(true);
  });
});

describe('resolvePopoverInitialFocus', () => {
  const panel = () => {
    const el = document.createElement('div');
    el.innerHTML = `<button id="a">a</button><input id="b" class="pick">`;
    document.body.append(el);
    return el;
  };

  it('resolves auto per modal flag', () => {
    const el = panel();
    expect(resolvePopoverInitialFocus(el, 'auto', true)?.id).toBe('a');
    expect(resolvePopoverInitialFocus(el, 'auto', false)).toBe(null);
  });

  it('resolves explicit modes and selectors, with [autofocus] winning', () => {
    const el = panel();
    expect(resolvePopoverInitialFocus(el, 'panel', false)).toBe(el);
    expect(resolvePopoverInitialFocus(el, 'none', true)).toBe(null);
    expect(resolvePopoverInitialFocus(el, '.pick', false)?.id).toBe('b');
    expect(resolvePopoverInitialFocus(el, '][', false)?.id).toBe('a');
    el.querySelector('#b')?.setAttribute('autofocus', '');
    expect(resolvePopoverInitialFocus(el, 'none', false)?.id).toBe('b');
  });
});

describe('nextTabbableAfter', () => {
  it('skips the excluded panel and returns null at the end', () => {
    const h = harness();
    expect(nextTabbableAfter(h.trigger, h.panel)).toBe(h.after);
    expect(nextTabbableAfter(h.after, h.panel)).toBe(null);
  });
});
