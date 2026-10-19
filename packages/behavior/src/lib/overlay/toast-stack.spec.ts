import {
  OGE_DEFAULT_TOAST_DEFAULTS,
  OGE_TOAST_EXIT_MS,
  OGE_TOAST_STACK_VISIBLE,
  OgeToastCore,
  beginOgeToastSwipe,
  ogeLayoutToastStack,
  ogeToastSwipeDismisses,
  type OgeToastDefaults,
} from './toast-core';

function makeCore(defaults: Partial<OgeToastDefaults> = {}) {
  return new OgeToastCore({
    defaults: () => ({ ...OGE_DEFAULT_TOAST_DEFAULTS, ...defaults }),
    onChange: () => undefined,
    announce: () => undefined,
  });
}

describe('toast stack mode — engine', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('regions report stacked / expanded', () => {
    const plain = makeCore();
    plain.show('a');
    expect(plain.regions()[0]).toMatchObject({
      stacked: false,
      expanded: false,
    });
    const core = makeCore({ stacked: true });
    core.show('a');
    expect(core.regions()[0]).toMatchObject({
      stacked: true,
      expanded: false,
    });
    core.setRegionExpanded('bottom-end', 'hover', true);
    expect(core.regions()[0].expanded).toBe(true);
    core.destroy();
    plain.destroy();
  });

  it('expanding pauses every toast of the region; the last cause leaving resumes them', () => {
    const core = makeCore({ stacked: true, displayTime: 1000 });
    const closed = vi.fn();
    void core.show('a').closed.then(closed);
    void core.show('b').closed.then(closed);
    core.setRegionExpanded('bottom-end', 'hover', true);
    core.setRegionExpanded('bottom-end', 'focus', true);
    vi.advanceTimersByTime(5000);
    expect(core.entries.every((e) => !e.closing)).toBe(true);
    core.setRegionExpanded('bottom-end', 'hover', false);
    vi.advanceTimersByTime(5000);
    expect(core.entries.every((e) => !e.closing)).toBe(true);
    core.setRegionExpanded('bottom-end', 'focus', false);
    vi.advanceTimersByTime(1000);
    expect(core.entries.every((e) => e.closing)).toBe(true);
    core.destroy();
  });

  it('a toast arriving in an expanded region waits too', () => {
    const core = makeCore({ stacked: true, displayTime: 1000 });
    core.setRegionExpanded('bottom-end', 'hover', true);
    core.show('late');
    vi.advanceTimersByTime(3000);
    expect(core.entries[0].closing).toBe(false);
    core.setRegionExpanded('bottom-end', 'hover', false);
    vi.advanceTimersByTime(1000);
    expect(core.entries[0].closing).toBe(true);
    core.destroy();
  });

  it('an emptied region forgets its expansion', () => {
    const core = makeCore({ stacked: true });
    const ref = core.show('a');
    core.setRegionExpanded('bottom-end', 'hover', true);
    ref.close();
    vi.advanceTimersByTime(OGE_TOAST_EXIT_MS);
    expect(core.isExpanded('bottom-end')).toBe(false);
    core.destroy();
  });

  it('dismisses with reason swipe', async () => {
    const core = makeCore({ stacked: true });
    const ref = core.show('a');
    core.dismiss(core.entries[0], 'swipe');
    vi.advanceTimersByTime(OGE_TOAST_EXIT_MS);
    await expect(ref.closed).resolves.toEqual({ reason: 'swipe' });
    core.destroy();
  });
});

function cell(height: number, closing = false): HTMLElement {
  const el = document.createElement('div');
  el.className = closing
    ? 'oge-toast-cell oge-toast-cell-closing'
    : 'oge-toast-cell';
  const toast = document.createElement('div');
  toast.className = 'oge-toast';
  Object.defineProperty(toast, 'offsetHeight', { value: height });
  Object.defineProperty(toast, 'scrollHeight', { value: height });
  Object.defineProperty(toast, 'clientHeight', { value: height });
  el.append(toast);
  return el;
}

describe('ogeLayoutToastStack', () => {
  it('numbers the live cells from the newest and sums the newer heights', () => {
    const region = document.createElement('div');
    region.style.rowGap = '8px';
    const cells = [cell(40), cell(60), cell(30, true), cell(50), cell(20)];
    region.append(...cells);
    document.body.append(region);
    ogeLayoutToastStack(region);
    const depth = (el: HTMLElement) =>
      el.style.getPropertyValue('--oge-toast-depth');
    const offset = (el: HTMLElement) =>
      el.style.getPropertyValue('--oge-toast-stack-offset');
    // newest last in the DOM: 20 (front), 50, 60, 40; the closing one is skipped
    expect(cells.map(depth)).toEqual(['3', '2', '', '1', '0']);
    expect(offset(cells[4])).toBe('0px');
    expect(offset(cells[3])).toBe('28px');
    expect(offset(cells[1])).toBe('86px');
    expect(offset(cells[0])).toBe('154px');
    expect(OGE_TOAST_STACK_VISIBLE).toBe(3);
    expect(cells[0].hasAttribute('data-oge-toast-buried')).toBe(true);
    expect(cells[1].hasAttribute('data-oge-toast-buried')).toBe(false);
    region.remove();
  });
});

function pointer(type: string, x: number, target?: EventTarget): PointerEvent {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: 0,
    button: 0,
  }) as PointerEvent;
  Object.defineProperty(event, 'pointerId', { value: 1 });
  if (target) Object.defineProperty(event, 'target', { value: target });
  return event;
}

describe('beginOgeToastSwipe', () => {
  it('dismisses past the distance and follows the pointer meanwhile', () => {
    const toast = document.createElement('div');
    document.body.append(toast);
    const onFinish = vi.fn();
    const handle = beginOgeToastSwipe(pointer('pointerdown', 0, toast), {
      toast,
      onFinish,
    });
    expect(handle).not.toBeNull();
    document.dispatchEvent(pointer('pointermove', 30));
    expect(toast.classList.contains('oge-toast-swiping')).toBe(true);
    document.dispatchEvent(pointer('pointermove', 80));
    document.dispatchEvent(pointer('pointerup', 80));
    expect(onFinish).toHaveBeenCalledWith(true);
    expect(toast.classList.contains('oge-toast-swiping')).toBe(false);
    toast.remove();
  });

  it('a short swipe glides back', () => {
    const toast = document.createElement('div');
    document.body.append(toast);
    const onFinish = vi.fn();
    beginOgeToastSwipe(pointer('pointerdown', 0, toast), { toast, onFinish });
    document.dispatchEvent(pointer('pointermove', -20));
    document.dispatchEvent(pointer('pointerup', -20));
    expect(onFinish).toHaveBeenCalledWith(false);
    expect(toast.style.translate).toBe('');
    toast.remove();
  });

  it('never starts on the toast controls', () => {
    const toast = document.createElement('div');
    const button = document.createElement('button');
    toast.append(button);
    expect(
      beginOgeToastSwipe(pointer('pointerdown', 0, button), {
        toast,
        onFinish: () => undefined,
      }),
    ).toBeNull();
  });

  it('decides by distance either way', () => {
    expect(ogeToastSwipeDismisses(48)).toBe(true);
    expect(ogeToastSwipeDismisses(-60)).toBe(true);
    expect(ogeToastSwipeDismisses(20)).toBe(false);
  });
});
