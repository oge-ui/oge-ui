import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  beginPointerDragDrop,
  createDragGhost,
  ogeElementAtPoint,
} from './pointer-drag-drop';

function pointer(
  type: string,
  x: number,
  y: number,
  pointerType?: string,
): PointerEvent {
  const event = new MouseEvent(type, {
    clientX: x,
    clientY: y,
    bubbles: true,
    cancelable: true,
  }) as unknown as PointerEvent;
  Object.defineProperty(event, 'pointerId', { value: 1 });
  if (pointerType)
    Object.defineProperty(event, 'pointerType', { value: pointerType });
  return event;
}

function fixture() {
  document.body.innerHTML = `
    <ul>
      <li data-key="a" id="item-a">A</li>
      <li data-key="b">B</li>
      <li data-key="c">C</li>
    </ul>`;
  const items = Array.from(document.querySelectorAll<HTMLElement>('li'));
  return { items };
}

function begin(
  source: HTMLElement,
  extra: Partial<Parameters<typeof beginPointerDragDrop<string>>[1]> = {},
  pointerType?: string,
) {
  const down = pointer('pointerdown', 10, 10, pointerType);
  Object.defineProperty(down, 'target', { value: source });
  const over: (string | null)[] = [];
  const drops: string[] = [];
  const ends: { dropped: boolean; cancelled: boolean }[] = [];
  const handle = beginPointerDragDrop<string>(down, {
    resolve: (hit) =>
      (hit?.closest('[data-key]') as HTMLElement | null)?.dataset['key'] ??
      null,
    onOver: (target) => over.push(target),
    onDrop: (target) => drops.push(target),
    onEnd: (result) => ends.push(result),
    ...extra,
  });
  return { over, drops, ends, handle, down };
}

const moveOn = (el: Element, x: number, y: number, pointerType?: string) =>
  el.dispatchEvent(pointer('pointermove', x, y, pointerType));

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('beginPointerDragDrop', () => {
  it('hit-tests the element under the pointer and drops on the last target', () => {
    const { items } = fixture();
    const { over, drops, ends, down } = begin(items[0]);
    expect(down.defaultPrevented).toBe(false);
    moveOn(items[1], 10, 40);
    moveOn(items[2], 10, 70);
    document.dispatchEvent(pointer('pointerup', 10, 70));
    expect(over).toEqual(['b', 'c']);
    expect(drops).toEqual(['c']);
    expect(ends).toEqual([{ dropped: true, cancelled: false }]);
  });

  it('prefers document.elementFromPoint when the environment has it', () => {
    const { items } = fixture();
    const spy = vi.fn(() => items[2]);
    Object.defineProperty(document, 'elementFromPoint', {
      value: spy,
      configurable: true,
    });
    try {
      const { drops } = begin(items[0]);
      moveOn(items[0], 10, 70); // captured: the move targets the source
      document.dispatchEvent(pointer('pointerup', 10, 70));
      expect(spy).toHaveBeenCalledWith(10, 70);
      expect(drops).toEqual(['c']);
    } finally {
      delete (document as { elementFromPoint?: unknown }).elementFromPoint;
    }
  });

  it('a click without movement neither drops nor shows a ghost', () => {
    const { items } = fixture();
    const { drops, ends } = begin(items[0]);
    document.dispatchEvent(pointer('pointerup', 10, 10));
    expect(drops).toEqual([]);
    expect(ends).toEqual([{ dropped: false, cancelled: false }]);
    expect(document.querySelector('.oge-drag-ghost')).toBeNull();
  });

  it('Escape cancels: no drop, ghost removed, onEnd reports cancelled', () => {
    const { items } = fixture();
    const { drops, ends } = begin(items[0]);
    moveOn(items[1], 10, 40);
    expect(document.querySelector('.oge-drag-ghost')).not.toBeNull();
    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(drops).toEqual([]);
    expect(ends).toEqual([{ dropped: false, cancelled: true }]);
    expect(document.querySelector('.oge-drag-ghost')).toBeNull();
  });

  it('blur cancels mid-drag', () => {
    const { items } = fixture();
    const { drops, ends } = begin(items[0]);
    moveOn(items[1], 10, 40);
    window.dispatchEvent(new Event('blur'));
    expect(drops).toEqual([]);
    expect(ends).toEqual([{ dropped: false, cancelled: true }]);
  });

  it('a drop outside every target is not a drop', () => {
    const { items } = fixture();
    const { drops, ends } = begin(items[0]);
    moveOn(document.body, 300, 300);
    document.dispatchEvent(pointer('pointerup', 300, 300));
    expect(drops).toEqual([]);
    expect(ends).toEqual([{ dropped: false, cancelled: false }]);
  });

  it('touch needs the default long press before it drags', () => {
    vi.useFakeTimers();
    const { items } = fixture();
    const early = begin(items[0], {}, 'touch');
    moveOn(items[2], 10, 70, 'touch');
    expect(early.over).toEqual([]);
    expect(early.ends).toEqual([{ dropped: false, cancelled: false }]);

    const held = begin(items[0], {}, 'touch');
    vi.advanceTimersByTime(300);
    moveOn(items[2], 10, 70, 'touch');
    document.dispatchEvent(pointer('pointerup', 10, 70, 'touch'));
    expect(held.drops).toEqual(['c']);
  });

  it('longPress: 0 lets a touch handle drag at once', () => {
    const { items } = fixture();
    const { drops } = begin(items[0], { longPress: 0 }, 'touch');
    moveOn(items[1], 10, 40, 'touch');
    document.dispatchEvent(pointer('pointerup', 10, 40, 'touch'));
    expect(drops).toEqual(['b']);
  });

  it('re-hit-tests after an auto-scroll frame', () => {
    const raf: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
      raf.push(cb),
    );
    vi.stubGlobal('cancelAnimationFrame', () => raf.splice(0));
    const { items } = fixture();
    const scroller = document.createElement('div');
    scroller.getBoundingClientRect = () =>
      ({ left: 0, top: 0, right: 400, bottom: 300 }) as DOMRect;
    let top = 0;
    Object.defineProperty(scroller, 'scrollTop', {
      get: () => top,
      set: (v: number) => (top = v),
    });
    const { over } = begin(items[0], { autoScroll: scroller, ghost: false });
    moveOn(items[1], 10, 299);
    expect(over).toEqual(['b']);
    raf.shift()?.(0);
    expect(top).toBeGreaterThan(0);
    expect(over.length).toBe(2);
    document.dispatchEvent(pointer('pointerup', 10, 299));
    expect(raf).toHaveLength(0);
    vi.unstubAllGlobals();
  });

  it('ghost: an element clones that element instead of the source', () => {
    const { items } = fixture();
    begin(items[1], { ghost: items[0] });
    moveOn(items[2], 10, 70);
    const ghost = document.querySelector<HTMLElement>('.oge-drag-ghost');
    expect(ghost?.textContent).toBe('A');
  });
});

describe('beginPointerDragDrop settle', () => {
  /** A Web Animations stub (jsdom has none — the motion-off case). */
  function stubMotion() {
    const calls: { keyframes: Keyframe[]; finish(): void }[] = [];
    const proto = HTMLElement.prototype as unknown as { animate?: unknown };
    const original = proto.animate;
    proto.animate = function (keyframes: Keyframe[]) {
      let finish!: () => void;
      const finished = new Promise<void>((resolve) => (finish = resolve));
      calls.push({ keyframes, finish });
      return { finished, cancel: () => undefined };
    };
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
    return {
      calls,
      /** The settle glides: the ones that land on the resting card shadow. */
      settles: () =>
        calls.filter(
          (call) =>
            (call.keyframes.at(-1) as { boxShadow?: string }).boxShadow ===
            'var(--oge-shadow-card)',
        ),
      restore() {
        if (original === undefined) delete proto.animate;
        else proto.animate = original;
        vi.unstubAllGlobals();
      },
    };
  }

  function place(el: HTMLElement, top: number): void {
    el.getBoundingClientRect = () =>
      ({
        left: 0,
        top,
        width: 100,
        height: 20,
        right: 100,
        bottom: top + 20,
      }) as DOMRect;
  }

  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

  it('settles the ghost onto settleTo(target) once the drop rendered', async () => {
    const motion = stubMotion();
    try {
      const { items } = fixture();
      items.forEach((item, index) => place(item, index * 100));
      const settleTo = vi.fn((target: string) =>
        document.querySelector(`[data-key="${target}"]`),
      );
      begin(items[0], { settleTo });
      moveOn(items[2], 10, 70);
      document.dispatchEvent(pointer('pointerup', 10, 70));
      await flush();
      expect(settleTo).toHaveBeenCalledWith('c');
      const [settle] = motion.settles();
      expect(String(settle.keyframes.at(-1)?.transform)).toContain(
        'translate(0px, 200px)',
      );
      expect(document.querySelector('.oge-drag-ghost')).not.toBeNull();
      settle.finish();
      await flush();
      expect(document.querySelector('.oge-drag-ghost')).toBeNull();
    } finally {
      motion.restore();
    }
  });

  it('a cancelled drag glides back to the origin without asking settleTo', async () => {
    const motion = stubMotion();
    try {
      const { items } = fixture();
      items.forEach((item, index) => place(item, 50 + index * 100));
      const settleTo = vi.fn(() => items[2]);
      begin(items[0], { settleTo });
      moveOn(items[2], 10, 70);
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
      await flush();
      expect(settleTo).not.toHaveBeenCalled();
      const [settle] = motion.settles();
      expect(String(settle.keyframes.at(-1)?.transform)).toContain(
        'translate(0px, 50px)',
      );
    } finally {
      motion.restore();
    }
  });

  it('a settleTo answering null just removes the ghost', async () => {
    const motion = stubMotion();
    try {
      const { items } = fixture();
      begin(items[0], { settleTo: () => null });
      moveOn(items[1], 10, 40);
      document.dispatchEvent(pointer('pointerup', 10, 40));
      await flush();
      expect(motion.settles()).toHaveLength(0);
      expect(document.querySelector('.oge-drag-ghost')).toBeNull();
    } finally {
      motion.restore();
    }
  });
});

describe('createDragGhost', () => {
  it('is an aria-hidden, inert, pointer-transparent clone without ids', () => {
    const { items } = fixture();
    const ghost = createDragGhost(items[0], 10, 10);
    const clone = document.querySelector<HTMLElement>('.oge-drag-ghost');
    expect(clone).not.toBeNull();
    expect(clone?.getAttribute('aria-hidden')).toBe('true');
    expect(clone?.hasAttribute('inert')).toBe(true);
    expect(clone?.id).toBe('');
    expect(clone?.style.pointerEvents).toBe('none');
    expect(clone?.style.position).toBe('fixed');
    ghost.move(30, 25);
    expect(clone?.style.transform).toBe('translate(20px, 15px)');
    ghost.destroy();
    expect(document.querySelector('.oge-drag-ghost')).toBeNull();
  });
});

describe('ogeElementAtPoint', () => {
  it('falls back to the given target without a hit-test API', () => {
    const el = document.createElement('div');
    expect(ogeElementAtPoint(1, 1, el)).toBe(el);
    expect(ogeElementAtPoint(1, 1, null)).toBeNull();
  });
});
