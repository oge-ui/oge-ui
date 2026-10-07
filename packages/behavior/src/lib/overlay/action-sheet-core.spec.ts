import {
  OGE_ACTION_SHEET_FOCUS_ATTR,
  OgeActionSheetCore,
  beginOgeActionSheetSwipe,
  ogeActionSheetDividerIndex,
  ogeActionSheetKeyIntent,
  ogeActionSheetOrder,
  ogeActionSheetSwipeDismisses,
  ogeActionSheetTabStop,
  type OgeActionSheetItem,
} from './action-sheet-core';
import { pushOverlay, removeOverlay } from './overlay-stack';
import { resetScrollLockForTests } from './scroll-lock';

const ITEMS: OgeActionSheetItem[] = [
  { key: 'share', text: 'Share' },
  { key: 'copy', text: 'Copy link', disabled: true },
  { key: 'edit', text: 'Edit' },
  { key: 'delete', text: 'Delete', destructive: true },
];

describe('action sheet ordering', () => {
  it('puts bottom-group actions last and finds the divider', () => {
    const ordered = ogeActionSheetOrder([
      { text: 'A', group: 'bottom' },
      { text: 'B' },
      { text: 'C', group: 'top' },
    ]);
    expect(ordered.map((i) => i.text)).toEqual(['B', 'C', 'A']);
    expect(ogeActionSheetDividerIndex(ordered)).toBe(2);
    expect(ogeActionSheetDividerIndex(ITEMS)).toBe(-1);
    expect(
      ogeActionSheetDividerIndex([{ text: 'only', group: 'bottom' }]),
    ).toBe(-1);
  });
});

describe('action sheet keyboard', () => {
  it('moves with wrap past disabled actions', () => {
    expect(ogeActionSheetKeyIntent('ArrowDown', 0, ITEMS)).toEqual({
      kind: 'focus',
      index: 2,
    });
    expect(ogeActionSheetKeyIntent('ArrowDown', 3, ITEMS)).toEqual({
      kind: 'focus',
      index: 0,
    });
    expect(ogeActionSheetKeyIntent('ArrowUp', 2, ITEMS)).toEqual({
      kind: 'focus',
      index: 0,
    });
    expect(ogeActionSheetKeyIntent('ArrowUp', -1, ITEMS)).toEqual({
      kind: 'focus',
      index: 3,
    });
    expect(ogeActionSheetKeyIntent('End', 0, ITEMS)).toEqual({
      kind: 'focus',
      index: 3,
    });
    expect(ogeActionSheetKeyIntent('Home', 3, ITEMS)).toEqual({
      kind: 'focus',
      index: 0,
    });
  });

  it('activates enabled actions only', () => {
    expect(ogeActionSheetKeyIntent('Enter', 2, ITEMS)).toEqual({
      kind: 'activate',
      index: 2,
    });
    expect(ogeActionSheetKeyIntent(' ', 3, ITEMS)).toEqual({
      kind: 'activate',
      index: 3,
    });
    expect(ogeActionSheetKeyIntent('Enter', 1, ITEMS)).toBeNull();
    expect(ogeActionSheetKeyIntent('x', 0, ITEMS)).toBeNull();
    expect(ogeActionSheetKeyIntent('ArrowDown', 0, [])).toBeNull();
  });

  it('keeps one tab stop', () => {
    expect(ogeActionSheetTabStop(ITEMS, -1)).toBe(0);
    expect(ogeActionSheetTabStop(ITEMS, 2)).toBe(2);
    expect(
      ogeActionSheetTabStop([{ text: 'a', disabled: true }, { text: 'b' }], -1),
    ).toBe(1);
    expect(ogeActionSheetTabStop([], -1)).toBe(0);
  });
});

function pointer(
  type: string,
  target: EventTarget,
  init: { clientX?: number; clientY: number; pointerType?: string },
): MouseEvent {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: init.clientX ?? 0,
    clientY: init.clientY,
    button: 0,
  });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  Object.defineProperty(event, 'pointerType', {
    value: init.pointerType ?? 'mouse',
  });
  target.dispatchEvent(event);
  return event;
}

describe('OgeActionSheetCore', () => {
  let trigger: HTMLButtonElement;
  let layer: HTMLElement;
  let sheet: HTMLElement;
  let first: HTMLButtonElement;
  let cancel: HTMLButtonElement;
  const dismissed: string[] = [];

  beforeEach(() => {
    dismissed.length = 0;
    resetScrollLockForTests();
    document.body.innerHTML = `
      <main><button id="trigger">Open</button></main>
      <div class="layer">
        <div class="sheet" tabindex="-1">
          <div class="oge-action-sheet-header"><span class="oge-action-sheet-handle"></span><h2>Title</h2></div>
          <div role="menu">
            <button role="menuitem" tabindex="-1">Share</button>
            <button role="menuitem" tabindex="0" ${OGE_ACTION_SHEET_FOCUS_ATTR}>Edit</button>
          </div>
          <button class="cancel">Cancel</button>
        </div>
      </div>`;
    trigger = document.getElementById('trigger') as HTMLButtonElement;
    layer = document.querySelector('.layer') as HTMLElement;
    sheet = document.querySelector('.sheet') as HTMLElement;
    first = document.querySelector('[tabindex="0"]') as HTMLButtonElement;
    cancel = document.querySelector('.cancel') as HTMLButtonElement;
    trigger.focus();
  });

  const make = () =>
    new OgeActionSheetCore({
      layer: () => layer,
      sheet: () => sheet,
      onDismiss: (reason) => dismissed.push(reason),
    });

  it('locks scroll, inerts the background, focuses in and restores', () => {
    const core = make();
    core.activate();
    expect(core.isActive()).toBe(true);
    expect(document.activeElement).toBe(first);
    expect(document.querySelector('main')!.hasAttribute('inert')).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');
    core.activate(); // idempotent
    core.deactivate();
    expect(core.isActive()).toBe(false);
    expect(document.querySelector('main')!.hasAttribute('inert')).toBe(false);
    expect(document.body.style.overflow).toBe('');
    expect(document.activeElement).toBe(trigger);
    core.deactivate(); // idempotent
  });

  it('dismisses on Escape only while topmost, and traps Tab', () => {
    const core = make();
    core.activate();
    const other = {};
    pushOverlay(other);
    first.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    expect(dismissed).toEqual([]);
    removeOverlay(other);
    first.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    expect(dismissed).toEqual(['escape']);

    cancel.focus();
    const tab = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });
    cancel.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(first);
    core.destroy();
  });

  it('armed before it renders, an Escape anywhere dismisses it', () => {
    const core = make();
    core.arm();
    core.arm(); // idempotent
    expect(core.isArmed()).toBe(true);
    // focus is still on the trigger outside the (not yet active) layer
    const early = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    trigger.dispatchEvent(early);
    expect(early.defaultPrevented).toBe(true);
    expect(dismissed).toEqual(['escape']);
    // closed before it ever rendered: deactivate releases the stack slot
    core.deactivate();
    expect(core.isArmed()).toBe(false);
    const other = {};
    pushOverlay(other);
    trigger.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    expect(dismissed).toEqual(['escape']);
    removeOverlay(other);
  });

  it('activation takes Escape over from the armed listener', () => {
    const core = make();
    core.arm();
    core.activate();
    expect(core.isArmed()).toBe(false);
    first.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    // once, from the layer — the document listener is gone
    expect(dismissed).toEqual(['escape']);
    core.destroy();
  });

  it('dismisses on a backdrop press', () => {
    const core = make();
    core.activate();
    pointer('pointerdown', layer, { clientY: 10 });
    expect(dismissed).toEqual(['backdrop']);
    pointer('pointerdown', first, { clientY: 10 });
    expect(dismissed).toEqual(['backdrop']);
    core.destroy();
  });

  it('dismisses after a long swipe down from the handle, not a short one', () => {
    const core = make();
    core.activate();
    const handle = document.querySelector(
      '.oge-action-sheet-handle',
    ) as HTMLElement;
    pointer('pointerdown', handle, { clientY: 100 });
    pointer('pointermove', sheet, { clientY: 130 });
    expect(sheet.style.translate).toBe('0 30px');
    pointer('pointerup', sheet, { clientY: 130 });
    expect(dismissed).toEqual([]);
    expect(sheet.style.translate).toBe('');

    pointer('pointerdown', handle, { clientY: 100 });
    pointer('pointermove', sheet, { clientY: 200 });
    pointer('pointerup', sheet, { clientY: 200 });
    expect(dismissed).toEqual(['swipe']);
    core.destroy();
  });

  it('swipe helper ignores secondary buttons and the threshold rule holds', () => {
    expect(ogeActionSheetSwipeDismisses(71)).toBe(false);
    expect(ogeActionSheetSwipeDismisses(72)).toBe(true);
    const down = {
      ...(new MouseEvent('pointerdown') as unknown as PointerEvent),
      button: 2,
    } as PointerEvent;
    expect(
      beginOgeActionSheetSwipe(down, { sheet, onFinish: () => undefined }),
    ).toBeNull();
  });
});
