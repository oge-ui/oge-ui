import { FLAT, render, settle } from './tree-view-test-host';

const ROW = 30;

interface Call {
  el: HTMLElement;
  keyframes: Keyframe[];
  options: KeyframeAnimationOptions;
}

/**
 * Rows laid out by their position among the rendered items in a 300px scroll
 * box; `animate` records. Ghosts (no `data-key`) sit at the container's top.
 */
function stubLayout(): { calls: Call[]; restore(): void } {
  const calls: Call[] = [];
  const proto = HTMLElement.prototype as unknown as {
    animate?: unknown;
    getBoundingClientRect: () => DOMRect;
  };
  const originalAnimate = proto.animate;
  const originalRect = proto.getBoundingClientRect;
  proto.animate = function (
    this: HTMLElement,
    keyframes: Keyframe[],
    options: KeyframeAnimationOptions,
  ) {
    calls.push({ el: this, keyframes, options });
    return { finished: new Promise(() => undefined), cancel: () => undefined };
  };
  proto.getBoundingClientRect = function (this: HTMLElement) {
    let top = 0;
    let height = 100000;
    if (this.classList.contains('oge-tree-view-scroll')) height = 10 * ROW;
    else if (
      this.classList.contains('oge-tree-view-item') &&
      !this.classList.contains('oge-row-ghost')
    ) {
      const siblings = Array.from(
        this.parentElement?.querySelectorAll<HTMLElement>(
          ':scope > .oge-tree-view-item:not(.oge-row-ghost)',
        ) ?? [],
      );
      top = siblings.indexOf(this) * ROW;
      height = ROW;
    }
    return {
      left: 0,
      top,
      width: 300,
      height,
      right: 300,
      bottom: top + height,
      x: 0,
      y: top,
    } as DOMRect;
  };
  return {
    calls,
    restore() {
      if (originalAnimate === undefined) delete proto.animate;
      else proto.animate = originalAnimate;
      proto.getBoundingClientRect = originalRect;
    },
  };
}

describe('OgeTreeView expand/collapse motion', () => {
  let stub: ReturnType<typeof stubLayout>;
  beforeEach(() => (stub = stubLayout()));
  afterEach(() => stub.restore());

  it('glides the rows below an expanded node and slides its children in', async () => {
    const { fixture, rowFor, rows } = await render();
    expect(stub.calls).toHaveLength(0);
    rowFor('Documents')?.click();
    await settle(fixture);
    // Documents, Reports, Photos
    const [documents, reports, photos] = rows();
    const byEl = new Map(stub.calls.map((call) => [call.el, call]));
    expect(byEl.get(photos)?.keyframes[0].transform).toBe(
      `translate(0px, ${-ROW}px)`,
    );
    expect(byEl.get(reports)?.keyframes[0]).toEqual({
      opacity: 0,
      transform: 'translateY(-4px)',
    });
    expect(byEl.has(documents)).toBe(false);
  });

  it('staggers several revealed children', async () => {
    const { fixture, host } = await render();
    host.expandedKeys.set([1, 2]);
    await settle(fixture);
    const enters = stub.calls.filter((call) => call.keyframes[0].opacity === 0);
    expect(enters.map((call) => call.options.delay ?? 0)).toEqual([0, 30]);
  });

  it('glides the rows below up on collapse and ghosts the hidden children', async () => {
    const { fixture, rowFor, rows, el } = await render((h) =>
      h.expandedKeys.set([1]),
    );
    rowFor('Documents')?.click();
    await settle(fixture);
    expect(
      rows().filter((r) => !r.classList.contains('oge-row-ghost')),
    ).toHaveLength(2);
    const ghost = el.querySelector<HTMLElement>(
      '.oge-tree-view-viewport > .oge-row-ghost',
    );
    expect(ghost?.textContent).toContain('Reports');
    expect(ghost?.getAttribute('aria-hidden')).toBe('true');
    expect(ghost?.hasAttribute('data-key')).toBe(false);
    expect(ghost?.hasAttribute('role')).toBe(false);
    expect(ghost?.hasAttribute('id')).toBe(false);
    const photos = rowFor('Photos');
    const glide = stub.calls.find((call) => call.el === photos);
    expect(glide?.keyframes[0].transform).toBe(`translate(0px, ${ROW}px)`);
    // the tree's own row queries never see the ghost
    expect(el.querySelectorAll('[role="treeitem"][data-key]')).toHaveLength(2);
  });

  it('glides a moved node when the data reparents it', async () => {
    const { fixture, host, rowFor } = await render();
    // Photos moves in front of Documents
    host.items.set([FLAT[3], FLAT[4], FLAT[0], FLAT[1], FLAT[2]]);
    await settle(fixture);
    const documents = rowFor('Documents');
    const glide = stub.calls.find((call) => call.el === documents);
    expect(glide?.keyframes[0].transform).toBe(`translate(0px, ${-ROW}px)`);
  });

  it('never animates scrolling a virtualized tree', async () => {
    const many = Array.from({ length: 200 }, (_, i) => ({
      id: i + 1,
      parentId: null,
      name: `Node ${i + 1}`,
    }));
    const { fixture, el } = await render((h) => {
      h.items.set(many);
      h.virtualScroll.set(true);
      h.height.set('300px');
    });
    const scroller = el.querySelector<HTMLElement>('.oge-tree-view-scroll');
    if (!scroller) throw new Error('no scroll element');
    scroller.scrollTop = 40 * ROW;
    scroller.dispatchEvent(new Event('scroll'));
    await settle(fixture);
    expect(stub.calls).toHaveLength(0);
  });
});
