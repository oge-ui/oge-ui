import {
  OGE_ROW_MOTION_LIMIT,
  OgeRowMotionCore,
  ogeRowMotionDecision,
} from './row-motion';

const win = (keys: string[], start = 0) => ({ keys, start });

describe('ogeRowMotionDecision', () => {
  it('records a first render and a switched-off window', () => {
    expect(ogeRowMotionDecision(null, win(['a']))).toBe('record');
    expect(ogeRowMotionDecision(win(['a']), null)).toBe('record');
  });

  it('never animates a scroll-driven re-creation or a virtual jump', () => {
    expect(
      ogeRowMotionDecision(win(['a', 'b', 'c']), win(['b', 'c', 'd'], 1)),
    ).toBe('record');
    expect(ogeRowMotionDecision(win(['a', 'b'], 0), win(['b', 'a'], 500))).toBe(
      'record',
    );
  });

  it('ignores an unchanged window', () => {
    expect(ogeRowMotionDecision(win(['a', 'b']), win(['a', 'b']))).toBe('none');
  });

  it('animates a re-order and a partial replacement of the same window', () => {
    expect(
      ogeRowMotionDecision(win(['a', 'b', 'c']), win(['c', 'a', 'b'])),
    ).toBe('animate');
    // a filter: some rows left, the rest close up
    expect(ogeRowMotionDecision(win(['a', 'b', 'c']), win(['a', 'c']))).toBe(
      'animate',
    );
    // a group expand: rows appear below the header
    expect(
      ogeRowMotionDecision(win(['g', 'h']), win(['g', 'x', 'y', 'h'])),
    ).toBe('animate');
  });

  it('skips an entirely new row set (a page change, new data)', () => {
    expect(ogeRowMotionDecision(win(['a', 'b']), win(['c', 'd']))).toBe(
      'record',
    );
    expect(ogeRowMotionDecision(win([]), win(['a']))).toBe('record');
    expect(ogeRowMotionDecision(win(['a']), win([]))).toBe('record');
  });
});

interface FakeAnimation {
  el: HTMLElement;
  keyframes: Keyframe[];
  cancelled: boolean;
}

function stubAnimate(): { calls: FakeAnimation[]; restore(): void } {
  const calls: FakeAnimation[] = [];
  const proto = HTMLElement.prototype as unknown as { animate?: unknown };
  const original = proto.animate;
  proto.animate = function (this: HTMLElement, keyframes: Keyframe[]) {
    const call: FakeAnimation = { el: this, keyframes, cancelled: false };
    calls.push(call);
    let reject!: () => void;
    const finished = new Promise<void>((_, rej) => (reject = rej));
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

const ROW = 30;

function place(el: HTMLElement, top: number, height = ROW): void {
  el.getBoundingClientRect = () =>
    ({
      left: 0,
      top,
      width: 400,
      height,
      right: 400,
      bottom: top + height,
      x: 0,
      y: top,
    }) as DOMRect;
}

/** A minimal grid body: rows laid out by their order, `start` rows down. */
function harness(viewportHeight = 300) {
  const viewport = document.createElement('div');
  const body = document.createElement('div');
  viewport.appendChild(body);
  document.body.appendChild(viewport);
  place(viewport, 0, viewportHeight);
  place(body, 0, 100000);
  const motion = new OgeRowMotionCore<string, string>({
    keyOf: (node) => node,
    viewport: () => viewport,
    root: () => body,
    rows: (root) => root.querySelectorAll<HTMLElement>('[data-rowindex]'),
  });
  const els = new Map<string, HTMLElement>();
  /** Renders `nodes` like a keyed `@for`: same key, same element. */
  const render = (nodes: string[], start = 0) => {
    body.replaceChildren();
    nodes.forEach((key, i) => {
      let el = els.get(key);
      if (!el) {
        el = document.createElement('div');
        els.set(key, el);
      }
      el.setAttribute('data-rowindex', String(start + i));
      place(el, (start + i) * ROW);
      body.appendChild(el);
    });
  };
  /** One host update: prepare on the old DOM, render, commit. */
  const update = (nodes: string[], start = 0) => {
    const decision = motion.prepare({ nodes, start });
    render(nodes, start);
    void motion.commit();
    return decision;
  };
  return {
    motion,
    els,
    update,
    destroy: () => viewport.remove(),
  };
}

const keys = (n: number, prefix = 'r') =>
  Array.from({ length: n }, (_, i) => `${prefix}${i}`);

describe('OgeRowMotionCore', () => {
  let stub: ReturnType<typeof stubAnimate>;
  beforeEach(() => (stub = stubAnimate()));
  afterEach(() => stub.restore());

  it('glides the rows a sort moved, keyed by row key', () => {
    const h = harness();
    expect(h.update(['a', 'b', 'c'])).toBe('record');
    expect(stub.calls).toHaveLength(0);
    expect(h.update(['c', 'b', 'a'])).toBe('animate');
    const moved = stub.calls.map((call) => call.el);
    expect(moved).toEqual([h.els.get('c'), h.els.get('a')]);
    // c came from row 2 to row 0: it starts 60px further down
    expect(stub.calls[0].keyframes[0].transform).toBe('translate(0px, 60px)');
    h.destroy();
  });

  it('fades in rows that join the window, and never ghosts leaving ones', () => {
    const h = harness();
    h.update(['a', 'b', 'c']);
    const ghostsBefore = document.querySelectorAll('.oge-exit-ghost').length;
    h.update(['a', 'x', 'c']);
    const entered = stub.calls.find((call) => call.el === h.els.get('x'));
    expect(entered?.keyframes[0].opacity).toBe(0);
    expect(document.querySelectorAll('.oge-exit-ghost').length).toBe(
      ghostsBefore,
    );
    h.destroy();
  });

  it('does not animate scrolling or an unchanged re-render', () => {
    const h = harness();
    h.update(keys(20));
    expect(h.update(keys(20).slice(5), 5)).toBe('record');
    expect(h.update(keys(20).slice(5), 5)).toBe('none');
    expect(stub.calls).toHaveLength(0);
    h.destroy();
  });

  it('only animates rows on screen', () => {
    const h = harness(90); // three rows visible
    const rows = keys(10);
    h.update(rows);
    h.update([...rows].reverse());
    // r9..r7 are visible now; none of them was on screen before → fade-ins only
    const animated = stub.calls.map((call) => call.el);
    expect(animated).toEqual([
      h.els.get('r9'),
      h.els.get('r8'),
      h.els.get('r7'),
    ]);
    expect(stub.calls.every((call) => call.keyframes[0].opacity === 0)).toBe(
      true,
    );
    h.destroy();
  });

  it(`caps a change at ${OGE_ROW_MOTION_LIMIT} on-screen rows`, () => {
    const big = harness(ROW * (OGE_ROW_MOTION_LIMIT + 1));
    const rows = keys(OGE_ROW_MOTION_LIMIT + 1);
    big.update(rows);
    big.update([...rows].reverse());
    expect(stub.calls).toHaveLength(0);
    big.destroy();

    const fits = harness(ROW * OGE_ROW_MOTION_LIMIT);
    const some = keys(OGE_ROW_MOTION_LIMIT);
    fits.update(some);
    fits.update([...some].reverse());
    expect(stub.calls.length).toBeGreaterThan(0);
    fits.destroy();
  });

  it('skips an entirely new row set', () => {
    const h = harness();
    h.update(['a', 'b']);
    expect(h.update(['c', 'd'])).toBe('record');
    expect(stub.calls).toHaveLength(0);
    h.destroy();
  });

  it('forgets the window when switched off, so turning it on does not animate', () => {
    const h = harness();
    h.update(['a', 'b']);
    h.motion.prepare(null);
    void h.motion.commit();
    expect(h.update(['b', 'a'])).toBe('record');
    expect(stub.calls).toHaveLength(0);
    h.destroy();
  });

  it('is idempotent across repeated prepares (React renders twice)', () => {
    const h = harness();
    h.update(['a', 'b', 'c']);
    const nodes = ['c', 'b', 'a'];
    h.motion.prepare({ nodes, start: 0 });
    expect(h.update(nodes)).toBe('animate');
    expect(stub.calls).toHaveLength(2);
    h.destroy();
  });

  it('cancels running glides when scrolling re-creates the rows', () => {
    const h = harness();
    h.update(keys(10));
    h.update([...keys(10)].reverse());
    expect(stub.calls.some((call) => !call.cancelled)).toBe(true);
    h.update(keys(10).slice(2), 2);
    expect(stub.calls.every((call) => call.cancelled)).toBe(true);
    h.destroy();
  });
});
