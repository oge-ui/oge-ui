import {
  OGE_EXIT_FADE,
  OGE_MOTION_DEFAULTS,
  createOgeLayoutAnimator,
  ogeExitGhost,
  ogeFlipDelta,
  ogeMotionEnabled,
  ogeMotionTiming,
  ogeSettleGhost,
  ogeSpringEasing,
  type OgeRect,
} from './motion';

const rect = (
  left: number,
  top: number,
  width = 100,
  height = 50,
): OgeRect => ({
  left,
  top,
  width,
  height,
});

function place(el: HTMLElement, box: OgeRect): void {
  el.getBoundingClientRect = () =>
    ({
      ...box,
      right: box.left + box.width,
      bottom: box.top + box.height,
      x: box.left,
      y: box.top,
    }) as DOMRect;
}

interface FakeAnimation {
  keyframes: Keyframe[];
  options: KeyframeAnimationOptions;
  cancelled: boolean;
  finish(): void;
}

/** Installs a Web Animations stub — jsdom has none, which is the "off" case. */
function stubAnimate(): { calls: FakeAnimation[]; restore(): void } {
  const calls: FakeAnimation[] = [];
  const proto = HTMLElement.prototype as unknown as {
    animate?: unknown;
  };
  const original = proto.animate;
  proto.animate = function (
    keyframes: Keyframe[],
    options: KeyframeAnimationOptions,
  ) {
    let resolve!: () => void;
    let reject!: () => void;
    const finished = new Promise<void>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    const call: FakeAnimation = {
      keyframes,
      options,
      cancelled: false,
      finish: () => resolve(),
    };
    calls.push(call);
    return {
      finished,
      cancel() {
        call.cancelled = true;
        reject();
      },
    };
  };
  return {
    calls,
    restore() {
      if (original === undefined) delete proto.animate;
      else proto.animate = original;
    },
  };
}

describe('ogeFlipDelta', () => {
  it('inverts the travel and ignores sub-pixel moves', () => {
    expect(ogeFlipDelta(rect(10, 20), rect(110, 70))).toEqual({
      dx: -100,
      dy: -50,
      sx: 1,
      sy: 1,
    });
    expect(ogeFlipDelta(rect(10, 20), rect(10.2, 20.3))).toBeNull();
  });

  it('computes scale only when asked', () => {
    expect(ogeFlipDelta(rect(0, 0, 100), rect(0, 0, 200))).toBeNull();
    expect(
      ogeFlipDelta(rect(0, 0, 100), rect(0, 0, 200), { scale: true }),
    ).toEqual({ dx: 0, dy: 0, sx: 0.5, sy: 1 });
  });
});

describe('ogeSpringEasing', () => {
  it('runs from 0 to exactly 1 with a small overshoot', () => {
    const curve = ogeSpringEasing();
    expect(curve.startsWith('linear(0, ')).toBe(true);
    const points = curve.slice('linear('.length, -1).split(', ').map(Number);
    expect(points).toHaveLength(33);
    expect(points.at(-1)).toBe(1);
    expect(Math.max(...points)).toBeGreaterThan(1);
    expect(Math.max(...points)).toBeLessThan(1.03);
  });

  it('never overshoots when critically damped', () => {
    const points = ogeSpringEasing({ stiffness: 100, damping: 20, samples: 10 })
      .slice('linear('.length, -1)
      .split(', ')
      .map(Number);
    expect(points).toHaveLength(11);
    expect(Math.max(...points)).toBe(1);
  });
});

describe('ogeMotionTiming', () => {
  it('reads the tokens an element sees, falling back to the defaults', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    expect(ogeMotionTiming(el, 'base', 'standard')).toEqual({
      duration: 200,
      easing: OGE_MOTION_DEFAULTS.easings.standard,
    });
    el.style.setProperty('--oge-motion-duration-base', '0.5s');
    el.style.setProperty('--oge-motion-easing-standard', 'linear');
    expect(ogeMotionTiming(el, 'base', 'standard')).toEqual({
      duration: 500,
      easing: 'linear',
    });
    expect(ogeMotionTiming(null).duration).toBe(
      OGE_MOTION_DEFAULTS.durations.layout,
    );
    el.remove();
  });
});

describe('motion gating', () => {
  it('is off without the Web Animations API (jsdom)', () => {
    expect(ogeMotionEnabled()).toBe(false);
    const el = document.createElement('div');
    document.body.appendChild(el);
    ogeExitGhost(el);
    expect(document.querySelector('.oge-exit-ghost')).toBeNull();
    el.remove();
  });

  it('is off under reduced motion', () => {
    const stub = stubAnimate();
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes('reduce'),
    })) as unknown as typeof window.matchMedia;
    try {
      expect(ogeMotionEnabled()).toBe(false);
    } finally {
      window.matchMedia = original;
      stub.restore();
    }
  });
});

describe('createOgeLayoutAnimator', () => {
  let stub: ReturnType<typeof stubAnimate>;
  beforeEach(() => {
    stub = stubAnimate();
  });
  afterEach(() => stub.restore());

  function setup(limit?: number) {
    const root = document.createElement('div');
    const a = document.createElement('div');
    const b = document.createElement('div');
    const c = document.createElement('div');
    root.append(a, b, c);
    document.body.appendChild(root);
    place(root, rect(0, 0, 400, 200));
    const items = new Map<string, HTMLElement>([
      ['a', a],
      ['b', b],
      ['c', c],
    ]);
    const animator = createOgeLayoutAnimator<string>({
      root,
      limit,
      query: () => items.entries(),
    });
    return { root, a, b, c, items, animator };
  }

  it('animates every moved element from its first box', async () => {
    const { root, a, b, c, animator } = setup();
    place(a, rect(0, 0));
    place(b, rect(110, 0));
    place(c, rect(220, 0));
    animator.capture();
    // a and b swapped; c stayed
    place(a, rect(110, 0));
    place(b, rect(0, 0));
    const done = animator.play();
    expect(stub.calls).toHaveLength(2);
    expect(stub.calls[0].keyframes[0]).toEqual({
      transform: 'translate(-110px, 0px)',
    });
    expect(stub.calls[1].keyframes[0]).toEqual({
      transform: 'translate(110px, 0px)',
    });
    expect(stub.calls[0].options.duration).toBe(
      OGE_MOTION_DEFAULTS.durations.layout,
    );
    expect(root.hasAttribute('data-oge-animating')).toBe(true);
    expect(animator.animating).toBe(true);
    stub.calls.forEach((call) => call.finish());
    await done;
    expect(root.hasAttribute('data-oge-animating')).toBe(false);
    expect(animator.animating).toBe(false);
    root.remove();
  });

  it('measures against the root, so scrolling is not a move', () => {
    const { root, a, b, c, animator } = setup();
    place(a, rect(0, 0));
    place(b, rect(110, 0));
    place(c, rect(220, 0));
    animator.capture();
    // the page scrolled by 300px: everything, root included, moved up
    place(root, rect(0, -300, 400, 200));
    place(a, rect(0, -300));
    place(b, rect(110, -300));
    place(c, rect(220, -300));
    void animator.play();
    expect(stub.calls).toHaveLength(0);
    root.remove();
  });

  it('records on a play without a capture, then animates the next change', () => {
    const { root, a, b, c, animator } = setup();
    place(a, rect(0, 0));
    place(b, rect(110, 0));
    place(c, rect(220, 0));
    void animator.play();
    expect(stub.calls).toHaveLength(0);
    place(c, rect(0, 60));
    void animator.play();
    expect(stub.calls).toHaveLength(1);
    expect(stub.calls[0].keyframes[0]).toEqual({
      transform: 'translate(220px, -60px)',
    });
    animator.reset();
    place(c, rect(0, 120));
    void animator.play();
    expect(stub.calls).toHaveLength(1);
    root.remove();
  });

  it('skips excluded keys, fades new ones in and ghosts the ones that left', () => {
    const { root, a, b, c, items, animator } = setup();
    place(a, rect(0, 0));
    place(b, rect(110, 0));
    place(c, rect(220, 0));
    animator.capture();
    // c left, d arrived; a and b moved down
    c.remove();
    items.delete('c');
    const d = document.createElement('div');
    root.append(d);
    items.set('d', d);
    place(a, rect(0, 60));
    place(b, rect(110, 60));
    place(d, rect(0, 0));
    void animator.play({ exclude: ['a'] });
    const moved = stub.calls.find((call) =>
      String(call.keyframes[0].transform).startsWith('translate'),
    );
    expect(moved?.keyframes[0]).toEqual({
      transform: 'translate(0px, -60px)',
    });
    const entered = stub.calls.find((call) => call.keyframes[0].opacity === 0);
    expect(entered).toBeDefined();
    const ghost = document.querySelector<HTMLElement>('.oge-exit-ghost');
    expect(ghost?.style.left).toBe('220px');
    expect(stub.calls).toHaveLength(3);
    animator.cancel();
    expect(moved?.cancelled).toBe(true);
    expect(root.hasAttribute('data-oge-animating')).toBe(false);
    ghost?.remove();
    root.remove();
  });

  it('gives up over its element limit', () => {
    const { root, a, animator } = setup(2);
    place(a, rect(0, 0));
    animator.capture();
    place(a, rect(50, 0));
    void animator.play();
    expect(stub.calls).toHaveLength(0);
    root.remove();
  });
});

describe('ghost helpers', () => {
  let stub: ReturnType<typeof stubAnimate>;
  beforeEach(() => {
    stub = stubAnimate();
  });
  afterEach(() => stub.restore());

  it('ogeExitGhost fades an inert clone out and removes it', async () => {
    const el = document.createElement('div');
    el.id = 'x';
    el.innerHTML = '<span id="y">bye</span>';
    document.body.appendChild(el);
    place(el, rect(10, 10));
    ogeExitGhost(el);
    // the ghost waits for the real node to go — the two never coexist
    expect(document.querySelector('.oge-exit-ghost')).toBeNull();
    el.remove();
    await Promise.resolve();
    const ghost = document.querySelector<HTMLElement>('.oge-exit-ghost');
    expect(ghost?.getAttribute('aria-hidden')).toBe('true');
    expect(ghost?.hasAttribute('inert')).toBe(true);
    expect(ghost?.querySelector('[id]')).toBeNull();
    expect(ghost?.style.left).toBe('10px');
    stub.calls[0].finish();
    await Promise.resolve();
    await Promise.resolve();
    expect(document.querySelector('.oge-exit-ghost')).toBeNull();
  });

  it('ogeExitGhost takes the last box of a detached element', () => {
    const el = document.createElement('div');
    ogeExitGhost(el, { rect: rect(40, 50) });
    const ghost = document.querySelector<HTMLElement>('.oge-exit-ghost');
    expect(ghost?.style.top).toBe('50px');
    ghost?.remove();
  });

  it('ogeExitGhost appends into the given parent and keeps its z-index', async () => {
    const parent = document.createElement('section');
    const el = document.createElement('div');
    el.style.zIndex = '1100';
    parent.appendChild(el);
    document.body.appendChild(parent);
    place(el, rect(0, 0));
    ogeExitGhost(el, { parent, keyframes: OGE_EXIT_FADE });
    el.remove();
    await Promise.resolve();
    const ghost = parent.querySelector<HTMLElement>('.oge-exit-ghost');
    expect(ghost?.style.zIndex).toBe('1100');
    expect(ghost?.style.transition).toBe('none');
    expect(stub.calls[0].keyframes).toEqual([{ opacity: 1 }, { opacity: 0 }]);
    parent.remove();
  });

  it('ogeExitGhost falls back to body for a detached parent', () => {
    const parent = document.createElement('section');
    const el = document.createElement('div');
    ogeExitGhost(el, { parent, rect: rect(0, 0) });
    const ghost = document.body.querySelector<HTMLElement>(
      ':scope > .oge-exit-ghost',
    );
    expect(ghost).not.toBeNull();
    expect(ghost?.style.zIndex).toBe('10000');
    ghost?.remove();
  });

  it('gives a node its owner keeps no ghost', async () => {
    vi.useFakeTimers();
    try {
      const el = document.createElement('div');
      document.body.appendChild(el);
      place(el, rect(0, 0));
      ogeExitGhost(el);
      vi.advanceTimersByTime(300);
      el.remove();
      await Promise.resolve();
      expect(document.querySelector('.oge-exit-ghost')).toBeNull();
      expect(stub.calls).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('ogeExitGhost finishes the CSS animations the clone would replay', () => {
    const el = document.createElement('div');
    place(el, rect(0, 0));
    const finish = vi.fn();
    const loop = vi.fn(() => {
      throw new DOMException('infinite', 'InvalidStateError');
    });
    const proto = HTMLElement.prototype as unknown as {
      getAnimations?: unknown;
    };
    const original = proto.getAnimations;
    proto.getAnimations = () => [{ finish }, { finish: loop }];
    try {
      expect(() => ogeExitGhost(el)).not.toThrow();
      expect(finish).toHaveBeenCalledTimes(1);
      expect(loop).toHaveBeenCalledTimes(1);
    } finally {
      if (original === undefined) delete proto.getAnimations;
      else proto.getAnimations = original;
      document.querySelector('.oge-exit-ghost')?.remove();
    }
  });

  it('ogeSettleGhost glides onto the destination', async () => {
    const ghost = document.createElement('div');
    document.body.appendChild(ghost);
    place(ghost, rect(100, 100, 100, 50));
    const done = ogeSettleGhost(ghost, rect(0, 0, 200, 50));
    expect(ghost.style.transformOrigin).toBe('0 0');
    expect(stub.calls[0].keyframes[1].transform).toBe(
      'translate(-100px, -100px) scale(2, 1)',
    );
    stub.calls[0].finish();
    await done;
    ghost.remove();
  });
});
