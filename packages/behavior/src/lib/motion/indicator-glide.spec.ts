import {
  OGE_INDICATOR_GLIDE_ATTR,
  createOgeIndicatorGlide,
  ogeIndicatorEdge,
  ogeIndicatorRect,
} from './indicator-glide';
import type { OgeRect } from './motion';

const box = (left: number, top: number, width: number, height: number) => ({
  left,
  top,
  width,
  height,
});

function place(el: HTMLElement, rect: OgeRect): void {
  el.getBoundingClientRect = () =>
    ({
      ...rect,
      right: rect.left + rect.width,
      bottom: rect.top + rect.height,
      x: rect.left,
      y: rect.top,
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
  const proto = HTMLElement.prototype as unknown as { animate?: unknown };
  const original = proto.animate;
  proto.animate = function (
    keyframes: Keyframe[],
    options: KeyframeAnimationOptions,
  ) {
    let resolve!: () => void;
    let reject!: (e: unknown) => void;
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
        reject(new Error('aborted'));
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

const flush = () => new Promise((resolve) => setTimeout(resolve));

describe('ogeIndicatorRect', () => {
  const tab = box(100, 10, 80, 40);

  it('draws an underline along the bottom, optionally inset', () => {
    expect(ogeIndicatorRect(tab, { side: 'bottom', thickness: 2 })).toEqual(
      box(100, 48, 80, 2),
    );
    expect(
      ogeIndicatorRect(tab, { side: 'bottom', thickness: 2 }, [14, 14]),
    ).toEqual(box(114, 48, 52, 2));
    expect(ogeIndicatorRect(tab, { side: 'top', thickness: 3 })).toEqual(
      box(100, 10, 80, 3),
    );
  });

  it('draws a column on the left or right edge of a vertical item', () => {
    expect(ogeIndicatorRect(tab, { side: 'right', thickness: 2 })).toEqual(
      box(178, 10, 2, 40),
    );
    expect(
      ogeIndicatorRect(tab, { side: 'left', thickness: 2 }, [8, 8]),
    ).toEqual(box(100, 18, 2, 24));
  });
});

describe('ogeIndicatorEdge', () => {
  it('finds the single bordered side', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    el.style.borderBottom = '2px solid transparent';
    expect(ogeIndicatorEdge(el)).toEqual({ side: 'bottom', thickness: 2 });
    el.style.borderBottom = 'none';
    el.style.borderLeft = '2px solid transparent';
    expect(ogeIndicatorEdge(el)).toEqual({ side: 'left', thickness: 2 });
    el.remove();
  });

  it('has no edge without a border or with a full frame', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    expect(ogeIndicatorEdge(el)).toBeNull();
    el.style.border = '1px solid red';
    expect(ogeIndicatorEdge(el)).toBeNull();
    el.remove();
  });
});

describe('createOgeIndicatorGlide', () => {
  let stub: ReturnType<typeof stubAnimate>;

  function setup() {
    const root = document.createElement('div');
    const a = document.createElement('div');
    const b = document.createElement('div');
    for (const tab of [a, b]) {
      tab.style.borderBottom = '2px solid transparent';
      tab.style.padding = '0 10px';
    }
    root.append(a, b);
    document.body.appendChild(root);
    place(root, box(50, 0, 400, 40));
    place(a, box(50, 0, 100, 40));
    place(b, box(150, 0, 60, 40));
    return { root, a, b, glide: createOgeIndicatorGlide(root) };
  }

  afterEach(() => {
    stub?.restore();
    document.body.innerHTML = '';
  });

  it('does nothing without the Web Animations API (jsdom)', () => {
    const { root, a, b, glide } = setup();
    expect(glide.move(a, b)).toBe(false);
    expect(root.hasAttribute(OGE_INDICATOR_GLIDE_ATTR)).toBe(false);
    expect(root.querySelector('.oge-indicator-glide')).toBeNull();
  });

  it('does nothing under reduced motion', () => {
    stub = stubAnimate();
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes('reduce'),
    })) as unknown as typeof window.matchMedia;
    try {
      const { a, b, glide } = setup();
      expect(glide.move(a, b)).toBe(false);
      expect(stub.calls).toHaveLength(0);
    } finally {
      window.matchMedia = original;
    }
  });

  it('skips the first selection, the same item and items without an edge', () => {
    stub = stubAnimate();
    const { a, b, glide } = setup();
    expect(glide.move(null, b)).toBe(false);
    expect(glide.move(b, b)).toBe(false);
    b.style.borderBottom = 'none';
    expect(glide.move(a, b)).toBe(false);
    expect(stub.calls).toHaveLength(0);
  });

  it('FLIPs one bar from the old ink to the new and settles', async () => {
    stub = stubAnimate();
    const { root, a, b, glide } = setup();
    expect(glide.move(a, b)).toBe(true);
    expect(glide.gliding).toBe(true);
    expect(root.getAttribute(OGE_INDICATOR_GLIDE_ATTR)).toBe('run');
    const bar = root.querySelector<HTMLElement>('.oge-indicator-glide');
    expect(bar?.getAttribute('aria-hidden')).toBe('true');
    // the bar sits at the new ink, root-relative
    expect(bar?.style.left).toBe('100px');
    expect(bar?.style.top).toBe('38px');
    expect(bar?.style.width).toBe('60px');
    expect(bar?.style.height).toBe('2px');
    const [call] = stub.calls;
    // and starts at the old one: 100px to the left, 100/60 as wide
    expect(call.keyframes[0].transform).toBe(
      `translate(-100px, 0px) scale(${100 / 60}, 1)`,
    );
    expect(call.keyframes[1].transform).toBe('none');
    expect(call.options.duration).toBe(280);
    call.finish();
    await flush();
    expect(glide.gliding).toBe(false);
    expect(root.hasAttribute(OGE_INDICATOR_GLIDE_ATTR)).toBe(false);
    expect(root.querySelector('.oge-indicator-glide')).toBeNull();
  });

  it('insets the bar by the padding for a content-fitted ink', () => {
    stub = stubAnimate();
    const { root, a, b, glide } = setup();
    glide.move(a, b, { fit: 'content' });
    const bar = root.querySelector<HTMLElement>('.oge-indicator-glide');
    expect(bar?.style.left).toBe('110px');
    expect(bar?.style.width).toBe('40px');
    expect(stub.calls[0].keyframes[0].transform).toBe(
      `translate(-100px, 0px) scale(${80 / 40}, 1)`,
    );
  });

  it('continues an interrupted glide from the bar in flight', async () => {
    stub = stubAnimate();
    const { root, a, b, glide } = setup();
    const c = document.createElement('div');
    c.style.borderBottom = '2px solid transparent';
    root.appendChild(c);
    place(c, box(210, 0, 50, 40));
    glide.move(a, b);
    const bar = root.querySelector<HTMLElement>('.oge-indicator-glide')!;
    place(bar, box(120, 38, 80, 2));
    expect(glide.move(b, c)).toBe(true);
    expect(stub.calls[0].cancelled).toBe(true);
    expect(root.querySelectorAll('.oge-indicator-glide')).toHaveLength(1);
    // from the in-flight box (70px root-relative), not from b's ink
    expect(stub.calls[1].keyframes[0].transform).toBe(
      `translate(-90px, 0px) scale(${80 / 50}, 1)`,
    );
    // the cancelled glide does not settle the new one
    await flush();
    expect(root.getAttribute(OGE_INDICATOR_GLIDE_ATTR)).toBe('run');
    glide.cancel();
    expect(root.hasAttribute(OGE_INDICATOR_GLIDE_ATTR)).toBe(false);
    expect(root.querySelector('.oge-indicator-glide')).toBeNull();
  });
});
