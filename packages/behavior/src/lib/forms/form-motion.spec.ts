import { createOgeFormItemMotion } from './form-motion';

/** Rows stacked by index among their grid's items; `animate` recorded. */
function stubMotion() {
  const calls: { el: Element; keyframes: Keyframe[] }[] = [];
  const proto = HTMLElement.prototype as unknown as { animate?: unknown };
  const animate = proto.animate;
  const rect = Element.prototype.getBoundingClientRect;
  proto.animate = function (this: Element, keyframes: Keyframe[]) {
    calls.push({ el: this, keyframes });
    return {
      finished: new Promise<void>(() => undefined),
      cancel: () => undefined,
      finish: () => undefined,
    };
  };
  Element.prototype.getBoundingClientRect = function (this: Element) {
    const grid = this.parentElement;
    const top =
      grid && this.hasAttribute('data-oge-form-item')
        ? Array.from(grid.children).indexOf(this) * 40
        : 0;
    return {
      left: 0,
      top,
      width: 300,
      height: 36,
      right: 300,
      bottom: top + 36,
      x: 0,
      y: top,
      toJSON: () => ({}),
    } as DOMRect;
  };
  return {
    calls,
    restore() {
      if (animate === undefined) delete proto.animate;
      else proto.animate = animate;
      Element.prototype.getBoundingClientRect = rect;
    },
  };
}

function form(ids: string[]): { root: HTMLElement; grid: HTMLElement } {
  const root = document.createElement('div');
  const grid = document.createElement('div');
  grid.className = 'oge-form-fields';
  for (const id of ids) {
    const item = document.createElement('div');
    item.setAttribute('data-oge-form-item', id);
    item.textContent = id;
    grid.appendChild(item);
  }
  root.appendChild(grid);
  document.body.appendChild(root);
  return { root, grid };
}

function show(grid: HTMLElement, id: string, before: string): void {
  const item = document.createElement('div');
  item.setAttribute('data-oge-form-item', id);
  item.textContent = id;
  grid.insertBefore(
    item,
    grid.querySelector(`[data-oge-form-item="${before}"]`),
  );
}

describe('createOgeFormItemMotion', () => {
  let stub: ReturnType<typeof stubMotion> | undefined;
  afterEach(() => {
    stub?.restore();
    stub = undefined;
    document.body.innerHTML = '';
  });

  it('does nothing without the Web Animations API (jsdom)', () => {
    const { root, grid } = form(['a', 'c']);
    const motion = createOgeFormItemMotion(root);
    motion.update(false);
    show(grid, 'b', 'c');
    motion.update(true);
    expect(grid.hasAttribute('data-oge-animating')).toBe(false);
  });

  it('fades an appearing item in and glides the items below', () => {
    stub = stubMotion();
    const { root, grid } = form(['a', 'c']);
    const motion = createOgeFormItemMotion(root);
    // the first update only records
    motion.update(false);
    expect(stub.calls).toHaveLength(0);
    show(grid, 'b', 'c');
    motion.update(true);
    const calls = stub.calls.map((call) => ({
      id: call.el.getAttribute('data-oge-form-item'),
      first: call.keyframes[0],
    }));
    expect(calls).toEqual([
      { id: 'b', first: { opacity: 0, transform: 'scale(0.96)' } },
      { id: 'c', first: { transform: 'translate(0px, -40px)' } },
    ]);
    motion.destroy();
  });

  it('records instead of animating when the visible items did not change', () => {
    stub = stubMotion();
    const { root, grid } = form(['a', 'c']);
    const motion = createOgeFormItemMotion(root);
    motion.update(false);
    show(grid, 'b', 'c');
    motion.update(false);
    expect(stub.calls).toHaveLength(0);
  });
});
