import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  beginPointerGesture,
  prepareTouchDrag,
  type OgePointerGestureOptions,
} from './pointer-gesture';

/** jsdom has no PointerEvent: a MouseEvent carrying the pointer fields. */
function pointer(
  type: string,
  x: number,
  y: number,
  init: { pointerType?: string; pointerId?: number } = {},
): PointerEvent {
  const event = new MouseEvent(type, {
    clientX: x,
    clientY: y,
    bubbles: true,
    cancelable: true,
  }) as unknown as PointerEvent;
  Object.defineProperty(event, 'pointerId', { value: init.pointerId ?? 1 });
  if (init.pointerType)
    Object.defineProperty(event, 'pointerType', { value: init.pointerType });
  return event;
}

function start(
  options: Partial<OgePointerGestureOptions> = {},
  pointerType?: string,
) {
  const target = document.createElement('div');
  document.body.appendChild(target);
  const down = pointer('pointerdown', 10, 10, { pointerType });
  Object.defineProperty(down, 'target', { value: target });
  const moves: number[][] = [];
  const finishes: boolean[][] = [];
  const handle = beginPointerGesture(down, {
    onMove: (dx, dy) => moves.push([dx, dy]),
    onFinish: (commit, cancelled) => finishes.push([commit, cancelled]),
    ...options,
  });
  return { moves, finishes, down, target, handle };
}

const move = (x: number, y: number, pointerType?: string, pointerId = 1) =>
  document.dispatchEvent(pointer('pointermove', x, y, { pointerType, pointerId }));
const up = (x: number, y: number, pointerType?: string) =>
  document.dispatchEvent(pointer('pointerup', x, y, { pointerType }));

/**
 * jsdom's CSSStyleDeclaration drops `touch-action`, so these sources carry a
 * plain style object — the machine only reads and writes `touchAction`.
 */
function styledSource(touchAction = '') {
  return {
    style: { touchAction },
    setPointerCapture: vi.fn(),
  } as unknown as Element & {
    style: { touchAction: string };
    setPointerCapture: ReturnType<typeof vi.fn>;
  };
}

afterEach(() => {
  // finish whatever a test left running, so no touch lock leaks
  window.dispatchEvent(new Event('blur'));
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('beginPointerGesture', () => {
  it('ignores sub-threshold movement and never commits a plain click', () => {
    const { moves, finishes, down } = start();
    expect(down.defaultPrevented).toBe(true);
    move(12, 11);
    up(12, 11);
    expect(moves).toEqual([]);
    expect(finishes).toEqual([[false, false]]);
  });

  it('commits a real drag exactly once and reports moved', () => {
    const { moves, finishes, handle } = start();
    move(30, 10);
    expect(handle.moved).toBe(true);
    up(30, 10);
    up(30, 10);
    expect(moves).toEqual([[20, 0]]);
    expect(finishes).toEqual([[true, false]]);
  });

  it('honours a custom threshold and preventDefault: false', () => {
    const { moves, down } = start({ threshold: 20, preventDefault: false });
    expect(down.defaultPrevented).toBe(false);
    move(25, 10);
    expect(moves).toEqual([]);
    move(40, 10);
    expect(moves).toEqual([[30, 0]]);
  });

  it('cancels on a capture-phase Escape and removes its listeners', () => {
    const { moves, finishes, target } = start();
    const bubbling = vi.fn();
    target.addEventListener('keydown', bubbling);
    move(30, 10);
    const escape = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    target.dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(true);
    expect(bubbling).not.toHaveBeenCalled();
    move(60, 10);
    expect(moves).toHaveLength(1);
    expect(finishes).toEqual([[false, true]]);
  });

  it('cancels on pointercancel, window blur and handle.cancel()', () => {
    const first = start();
    document.dispatchEvent(pointer('pointercancel', 0, 0));
    expect(first.finishes).toEqual([[false, true]]);
    const second = start();
    move(30, 10);
    window.dispatchEvent(new Event('blur'));
    expect(second.finishes).toEqual([[false, true]]);
    const third = start();
    third.handle.cancel();
    third.handle.cancel();
    expect(third.finishes).toEqual([[false, true]]);
  });

  it('sets touch-action: none while armed and restores the inline value', () => {
    const source = styledSource('pan-y');
    const { finishes } = start({ source });
    expect(source.style.touchAction).toBe('none');
    up(10, 10);
    expect(finishes).toEqual([[false, false]]);
    expect(source.style.touchAction).toBe('pan-y');
  });

  it('restores touch-action after a cancel too, and leaves it alone when opted out', () => {
    const source = styledSource();
    start({ source });
    expect(source.style.touchAction).toBe('none');
    window.dispatchEvent(new Event('blur'));
    expect(source.style.touchAction).toBe('');
    const optedOut = styledSource('auto');
    start({ source: optedOut, touchAction: false });
    expect(optedOut.style.touchAction).toBe('auto');
  });

  it('captures the pointer on the given source', () => {
    const source = styledSource();
    start({ source });
    expect(source.setPointerCapture).toHaveBeenCalledWith(1);
  });

  describe('touch long press', () => {
    it('drags only after the hold elapses', () => {
      vi.useFakeTimers();
      const onLongPress = vi.fn();
      const { moves, finishes } = start({ longPress: 300, onLongPress }, 'touch');
      vi.advanceTimersByTime(299);
      expect(onLongPress).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(onLongPress).toHaveBeenCalledTimes(1);
      move(40, 10, 'touch');
      up(40, 10, 'touch');
      expect(moves).toEqual([[30, 0]]);
      expect(finishes).toEqual([[true, false]]);
    });

    it('abandons the gesture when the finger moves before the hold (a scroll)', () => {
      vi.useFakeTimers();
      const onLongPress = vi.fn();
      const source = styledSource();
      const { moves, finishes } = start(
        { longPress: 300, onLongPress, source },
        'touch',
      );
      expect(source.style.touchAction).toBe('none');
      move(10, 40, 'touch');
      expect(finishes).toEqual([[false, false]]);
      expect(source.style.touchAction).toBe('');
      vi.advanceTimersByTime(500);
      expect(onLongPress).not.toHaveBeenCalled();
      move(10, 80, 'touch');
      expect(moves).toEqual([]);
    });

    it('a quick tap finishes as a click, not a drag', () => {
      vi.useFakeTimers();
      const { finishes } = start({ longPress: 300 }, 'touch');
      up(10, 10, 'touch');
      expect(finishes).toEqual([[false, false]]);
    });

    it('tolerates sub-threshold jitter during the hold', () => {
      vi.useFakeTimers();
      const { moves, finishes } = start({ longPress: 300 }, 'touch');
      move(12, 11, 'touch');
      vi.advanceTimersByTime(300);
      move(30, 10, 'touch');
      expect(finishes).toEqual([]);
      expect(moves).toEqual([[20, 0]]);
    });

    it('ignores a second finger', () => {
      const { moves } = start({}, 'touch');
      move(80, 10, 'touch', 2);
      expect(moves).toEqual([]);
      move(30, 10, 'touch', 1);
      expect(moves).toEqual([[20, 0]]);
    });

    it('mouse pointers never wait for the hold', () => {
      const { moves } = start({ longPress: 300 }, 'mouse');
      move(30, 10, 'mouse');
      expect(moves).toEqual([[20, 0]]);
    });

    it('blocks panning only while a touch gesture is armed', () => {
      vi.useFakeTimers();
      prepareTouchDrag();
      const touchMove = () => {
        const event = new Event('touchmove', { bubbles: true, cancelable: true });
        document.body.dispatchEvent(event);
        return event.defaultPrevented;
      };
      expect(touchMove()).toBe(false);
      start({ longPress: 300 }, 'touch');
      expect(touchMove()).toBe(false);
      vi.advanceTimersByTime(300);
      expect(touchMove()).toBe(true);
      up(10, 10, 'touch');
      expect(touchMove()).toBe(false);
    });

    it('prevents the platform context menu of a touch hold', () => {
      start({ longPress: 300 }, 'touch');
      const menu = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
      document.body.dispatchEvent(menu);
      expect(menu.defaultPrevented).toBe(true);
    });
  });

  describe('suppressClick', () => {
    it('swallows the click after a committed drag only', () => {
      vi.useFakeTimers();
      const onClick = vi.fn();
      document.addEventListener('click', onClick);
      const dragged = start({ suppressClick: true });
      move(30, 10);
      up(30, 10);
      dragged.target.click();
      expect(onClick).not.toHaveBeenCalled();
      vi.runAllTimers();
      dragged.target.click();
      expect(onClick).toHaveBeenCalledTimes(1);

      const clicked = start({ suppressClick: true });
      up(10, 10);
      clicked.target.click();
      expect(onClick).toHaveBeenCalledTimes(2);
      document.removeEventListener('click', onClick);
    });
  });
});
