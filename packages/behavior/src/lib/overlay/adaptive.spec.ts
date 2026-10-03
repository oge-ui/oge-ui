import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  OGE_SHEET_SWIPE_DISMISS,
  OgeAdaptiveSheetCore,
  adaptiveMediaQuery,
  matchesAdaptiveViewport,
  resolveAdaptivePresentation,
  watchAdaptiveViewport,
} from './adaptive';
import { popupAvailableHeight } from './position';
import { resetScrollLockForTests } from './scroll-lock';

function stubMatchMedia(matches: boolean) {
  const listeners = new Set<(event: { matches: boolean }) => void>();
  const query = {
    matches,
    addEventListener: (_: string, fn: (e: { matches: boolean }) => void) =>
      listeners.add(fn),
    removeEventListener: (_: string, fn: (e: { matches: boolean }) => void) =>
      listeners.delete(fn),
  };
  const spy = vi.fn(() => query);
  vi.stubGlobal('matchMedia', spy);
  return { spy, listeners, query };
}

function sheetDom(): { field: HTMLInputElement; layer: HTMLElement } {
  const host = document.createElement('div');
  const field = document.createElement('input');
  const layer = document.createElement('div');
  layer.innerHTML = `
    <div class="oge-popup-sheet">
      <div class="oge-popup-sheet-header">
        <div class="oge-popup-sheet-handle"></div>
        <button class="close">x</button>
      </div>
      <div class="oge-popup-sheet-body">
        <button class="first">a</button>
        <div class="list" tabindex="0" data-oge-sheet-focus></div>
      </div>
    </div>`;
  host.append(field, layer);
  document.body.append(host);
  return { field, layer };
}

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
  document.body.removeAttribute('style');
  resetScrollLockForTests();
});

describe('adaptive vocabulary', () => {
  it('resolves the presentation only for auto + narrow', () => {
    expect(resolveAdaptivePresentation('none', true)).toBe('popup');
    expect(resolveAdaptivePresentation('auto', false)).toBe('popup');
    expect(resolveAdaptivePresentation('auto', true)).toBe('sheet');
    expect(resolveAdaptivePresentation('auto', true, 'fullscreen')).toBe(
      'fullscreen',
    );
  });

  it('queries strictly below the breakpoint', () => {
    expect(adaptiveMediaQuery(600)).toBe('(max-width: 599.98px)');
  });

  it('answers false without matchMedia and follows crossings with it', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(matchesAdaptiveViewport(600)).toBe(false);
    expect(() => watchAdaptiveViewport(600, () => undefined)()).not.toThrow();

    const { listeners, spy } = stubMatchMedia(true);
    expect(matchesAdaptiveViewport(480)).toBe(true);
    expect(spy).toHaveBeenCalledWith('(max-width: 479.98px)');
    const seen: boolean[] = [];
    const stop = watchAdaptiveViewport(480, (narrow) => seen.push(narrow));
    for (const fn of listeners) fn({ matches: false });
    expect(seen).toEqual([false]);
    stop();
    expect(listeners.size).toBe(0);
  });
});

describe('popupAvailableHeight', () => {
  const anchor = { top: 300, left: 0, width: 100, height: 40 };
  const viewport = { width: 400, height: 800 };
  it('measures below, above, and the padded viewport for side placements', () => {
    expect(
      popupAvailableHeight({ anchor, viewport, placement: 'bottom-start' }),
    ).toBe(800 - 340 - 4 - 8);
    expect(popupAvailableHeight({ anchor, viewport, placement: 'top' })).toBe(
      300 - 4 - 8,
    );
    expect(
      popupAvailableHeight({ anchor, viewport, placement: 'right-start' }),
    ).toBe(800 - 16);
    expect(
      popupAvailableHeight({
        anchor: { ...anchor, top: 790 },
        viewport,
        placement: 'bottom',
      }),
    ).toBe(0);
  });
});

describe('OgeAdaptiveSheetCore', () => {
  it('moves focus in, locks scroll, inerts the background — and undoes it all', () => {
    const { field, layer } = sheetDom();
    field.focus();
    const sheet = new OgeAdaptiveSheetCore({
      element: () => layer,
      onDismiss: () => undefined,
    });
    sheet.activate();
    expect(sheet.isActive()).toBe(true);
    expect(document.activeElement).toBe(layer.querySelector('.list'));
    expect(document.body.style.overflow).toBe('hidden');
    expect(field.hasAttribute('inert')).toBe(true);

    sheet.activate(); // idempotent
    sheet.deactivate();
    expect(sheet.isActive()).toBe(false);
    expect(field.hasAttribute('inert')).toBe(false);
    expect(document.body.style.overflow).toBe('');
    // focus was inside the sheet → back to the element focused before
    expect(document.activeElement).toBe(field);
  });

  it('falls back to the first tabbable of the body, then a custom restore', () => {
    const { layer } = sheetDom();
    layer.querySelector('.list')!.removeAttribute('data-oge-sheet-focus');
    const restore = vi.fn();
    const sheet = new OgeAdaptiveSheetCore({
      element: () => layer,
      onDismiss: () => undefined,
      restoreFocus: restore,
    });
    sheet.activate();
    expect(document.activeElement).toBe(layer.querySelector('.first'));
    sheet.deactivate();
    expect(restore).toHaveBeenCalledTimes(1);
  });

  it('wraps Tab inside the sheet surface', () => {
    const { layer } = sheetDom();
    const sheet = new OgeAdaptiveSheetCore({
      element: () => layer,
      onDismiss: () => undefined,
    });
    sheet.activate();
    const last = layer.querySelector<HTMLElement>('.list')!;
    last.focus();
    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });
    last.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(layer.querySelector('.close'));
    sheet.deactivate();
  });

  it('dismisses on a backdrop pointerdown but not inside the surface', () => {
    const { layer } = sheetDom();
    const onDismiss = vi.fn();
    const sheet = new OgeAdaptiveSheetCore({ element: () => layer, onDismiss });
    sheet.activate();
    layer
      .querySelector('.first')!
      .dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(onDismiss).not.toHaveBeenCalled();
    layer.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    sheet.deactivate();
  });

  it('dismisses on a long enough swipe down the handle', () => {
    const { layer } = sheetDom();
    const onDismiss = vi.fn();
    const sheet = new OgeAdaptiveSheetCore({ element: () => layer, onDismiss });
    sheet.activate();
    const handle = layer.querySelector('.oge-popup-sheet-handle')!;
    const pointer = (type: string, y: number, target: EventTarget) => {
      const event = new Event(type, { bubbles: true }) as Event & {
        pointerId: number;
        clientY: number;
        isPrimary: boolean;
      };
      Object.assign(event, { pointerId: 1, clientY: y, isPrimary: true });
      target.dispatchEvent(event);
    };
    // a short drag springs back
    pointer('pointerdown', 100, handle);
    pointer('pointermove', 120, document);
    pointer('pointerup', 120, document);
    expect(onDismiss).not.toHaveBeenCalled();
    // a long one dismisses
    pointer('pointerdown', 100, handle);
    pointer('pointermove', 100 + OGE_SHEET_SWIPE_DISMISS + 5, document);
    pointer('pointerup', 100 + OGE_SHEET_SWIPE_DISMISS + 5, document);
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(
      layer.querySelector<HTMLElement>('.oge-popup-sheet')!.style.translate,
    ).toBe('');
    sheet.deactivate();
  });

  it('tracks the visual viewport (the on-screen keyboard)', () => {
    const { layer } = sheetDom();
    const visual = Object.assign(new EventTarget(), {
      width: 390,
      height: 500,
      offsetTop: 40,
      offsetLeft: 0,
    });
    vi.stubGlobal('visualViewport', visual);
    const sheet = new OgeAdaptiveSheetCore({
      element: () => layer,
      onDismiss: () => undefined,
    });
    sheet.activate();
    expect(layer.style.getPropertyValue('--oge-sheet-viewport-height')).toBe(
      '500px',
    );
    expect(layer.style.getPropertyValue('--oge-sheet-viewport-top')).toBe(
      '40px',
    );
    visual.height = 320;
    visual.dispatchEvent(new Event('resize'));
    expect(layer.style.getPropertyValue('--oge-sheet-viewport-height')).toBe(
      '320px',
    );
    sheet.deactivate();
  });

  it('is inert without a document element to act on', () => {
    const sheet = new OgeAdaptiveSheetCore({
      element: () => null,
      onDismiss: () => undefined,
    });
    expect(() => {
      sheet.activate();
      sheet.deactivate();
      sheet.destroy();
    }).not.toThrow();
    expect(sheet.isActive()).toBe(false);
  });
});
