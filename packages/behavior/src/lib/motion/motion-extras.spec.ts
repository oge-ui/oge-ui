import {
  createOgeLayoutAnimator,
  createOgeTrackAnimator,
  ogeExitGhost,
  type OgeRect,
} from './motion';
import { ogeActionSheetExitGhost } from '../overlay/action-sheet-core';
import { ogeWindowExitGhost } from '../overlay/window-core';

interface FakeAnimation {
  el: Element;
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
    this: Element,
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
      el: this,
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

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('createOgeTrackAnimator', () => {
  let stub: ReturnType<typeof stubAnimate>;
  beforeEach(() => (stub = stubAnimate()));
  afterEach(() => stub.restore());

  it('animates between the resolved pixel tracks of a toggle', async () => {
    const root = document.createElement('div');
    document.body.append(root);
    root.style.gridTemplateColumns = '200px 6px 300px';
    const tracks = createOgeTrackAnimator(root, {
      property: () => 'grid-template-columns',
    });
    tracks.capture();
    root.style.gridTemplateColumns = '0px 6px 506px';
    const done = tracks.play();
    expect(stub.calls).toHaveLength(1);
    expect(stub.calls[0].keyframes).toEqual([
      { gridTemplateColumns: '200px 6px 300px' },
      { gridTemplateColumns: '0px 6px 506px' },
    ]);
    expect(root.hasAttribute('data-oge-animating')).toBe(true);
    expect(tracks.animating).toBe(true);
    stub.calls[0].finish();
    await done;
    expect(root.hasAttribute('data-oge-animating')).toBe(false);
    root.remove();
  });

  it('does nothing without a capture, on a track-count change or the same layout', () => {
    const root = document.createElement('div');
    document.body.append(root);
    root.style.gridTemplateColumns = '200px 6px 300px';
    const tracks = createOgeTrackAnimator(root, {
      property: () => 'grid-template-columns',
    });
    void tracks.play();
    tracks.capture();
    void tracks.play();
    tracks.capture();
    root.style.gridTemplateColumns = '200px 300px';
    void tracks.play();
    expect(stub.calls).toHaveLength(0);
    root.remove();
  });

  it('cancel() stops a running animation (a drag starts)', () => {
    const root = document.createElement('div');
    document.body.append(root);
    root.style.gridTemplateRows = '100px 6px 100px';
    const tracks = createOgeTrackAnimator(root, {
      property: () => 'grid-template-rows',
    });
    tracks.capture();
    root.style.gridTemplateRows = '0px 6px 200px';
    void tracks.play();
    tracks.cancel();
    expect(stub.calls[0].cancelled).toBe(true);
    expect(root.hasAttribute('data-oge-animating')).toBe(false);
    root.remove();
  });

  it('is a no-op without the Web Animations API', () => {
    stub.restore();
    const root = document.createElement('div');
    root.style.gridTemplateColumns = '1px 2px';
    const tracks = createOgeTrackAnimator(root, {
      property: () => 'grid-template-columns',
    });
    tracks.capture();
    root.style.gridTemplateColumns = '2px 1px';
    expect(() => tracks.play()).not.toThrow();
    stub = stubAnimate();
  });
});

describe('layout animator exit options', () => {
  let stub: ReturnType<typeof stubAnimate>;
  beforeEach(() => (stub = stubAnimate()));
  afterEach(() => stub.restore());

  it('appends exit ghosts to exitParent with the given keyframes', async () => {
    const outer = document.createElement('section');
    const root = document.createElement('div');
    outer.append(root);
    document.body.append(outer);
    const a = document.createElement('div');
    const b = document.createElement('div');
    root.append(a, b);
    place(root, { left: 0, top: 0, width: 300, height: 50 });
    place(a, { left: 0, top: 0, width: 100, height: 50 });
    place(b, { left: 110, top: 0, width: 100, height: 50 });
    const items = new Map<string, HTMLElement>([
      ['a', a],
      ['b', b],
    ]);
    const animator = createOgeLayoutAnimator<string>({
      root,
      query: () => items.entries(),
      enter: false,
      exitParent: () => outer,
      exitKeyframes: [{ opacity: 0 }],
    });
    void animator.play();
    animator.capture();
    a.remove();
    items.delete('a');
    place(b, { left: 0, top: 0, width: 100, height: 50 });
    void animator.play();
    await flush();
    const ghost = outer.querySelector<HTMLElement>(':scope > .oge-exit-ghost');
    expect(ghost).not.toBeNull();
    expect(root.querySelector('.oge-exit-ghost')).toBeNull();
    const fade = stub.calls.find((call) => call.el === ghost);
    expect(fade?.keyframes).toEqual([{ opacity: 0 }]);
    // b glided into a's slot
    expect(
      stub.calls.some((call) => call.el === b && call.keyframes.length === 2),
    ).toBe(true);
    outer.remove();
  });

  it('ogeExitGhost animates the given parts of the clone alongside', async () => {
    const el = document.createElement('div');
    el.innerHTML = '<div class="part">x</div>';
    place(el, { left: 0, top: 0, width: 100, height: 100 });
    ogeExitGhost(el, {
      rect: { left: 0, top: 0, width: 100, height: 100 },
      keyframes: [{ opacity: 0 }],
      parts: [{ selector: '.part', keyframes: [{ translate: '0 100%' }] }],
    });
    const ghost = document.querySelector<HTMLElement>('.oge-exit-ghost');
    const part = ghost?.querySelector('.part');
    expect(stub.calls.map((call) => call.el)).toEqual([ghost, part]);
    expect(stub.calls[1].keyframes).toEqual([{ translate: '0 100%' }]);
    ghost?.remove();
  });
});

describe('overlay exit ghosts', () => {
  let stub: ReturnType<typeof stubAnimate>;
  beforeEach(() => (stub = stubAnimate()));
  afterEach(() => {
    stub.restore();
    document
      .querySelectorAll('.oge-exit-ghost')
      .forEach((ghost) => ghost.remove());
  });

  it('the action sheet ghost fades the backdrop and slides the sheet down', () => {
    const layer = document.createElement('div');
    layer.className = 'oge-action-sheet-layer oge-action-sheet-ready';
    layer.innerHTML = '<div class="oge-action-sheet"></div>';
    // already removed by the render: the viewport is its box
    ogeActionSheetExitGhost(layer);
    const ghost = document.body.querySelector<HTMLElement>(
      ':scope > .oge-exit-ghost',
    );
    expect(ghost).not.toBeNull();
    expect(ghost?.style.width).toBe(`${window.innerWidth}px`);
    expect(stub.calls[0].keyframes).toEqual([
      { backgroundColor: 'transparent' },
    ]);
    expect(stub.calls[1].el).toBe(ghost?.querySelector('.oge-action-sheet'));
    expect(stub.calls[1].keyframes).toEqual([{ translate: '0 100%' }]);
  });

  it('skips an action sheet whose entrance never ran', () => {
    const layer = document.createElement('div');
    layer.className = 'oge-action-sheet-layer';
    ogeActionSheetExitGhost(layer);
    expect(document.querySelector('.oge-exit-ghost')).toBeNull();
  });

  it('the window ghost fades a placed panel in its parent', async () => {
    const host = document.createElement('div');
    const panel = document.createElement('div');
    panel.className = 'oge-window oge-window-placed';
    host.append(panel);
    document.body.append(host);
    place(panel, { left: 10, top: 20, width: 300, height: 200 });
    ogeWindowExitGhost(panel, host);
    // deferred until the real panel leaves
    expect(host.querySelector('.oge-exit-ghost')).toBeNull();
    panel.remove();
    await flush();
    const ghost = host.querySelector<HTMLElement>('.oge-exit-ghost');
    expect(ghost?.style.left).toBe('10px');
    expect(stub.calls[0].keyframes).toEqual([{ opacity: 1 }, { opacity: 0 }]);
    host.remove();
  });

  it('a detached window panel needs its last box; an unplaced one is skipped', () => {
    const panel = document.createElement('div');
    panel.className = 'oge-window oge-window-placed';
    ogeWindowExitGhost(panel, null);
    expect(document.querySelector('.oge-exit-ghost')).toBeNull();
    ogeWindowExitGhost(panel, null, {
      left: 1,
      top: 2,
      width: 30,
      height: 40,
    });
    expect(document.querySelector('.oge-exit-ghost')).not.toBeNull();
    document.querySelector('.oge-exit-ghost')?.remove();
    const unplaced = document.createElement('div');
    unplaced.className = 'oge-window';
    ogeWindowExitGhost(unplaced, null, {
      left: 1,
      top: 2,
      width: 30,
      height: 40,
    });
    expect(document.querySelector('.oge-exit-ghost')).toBeNull();
  });
});
