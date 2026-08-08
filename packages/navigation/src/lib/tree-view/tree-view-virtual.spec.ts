import { render, settle, type Node } from './tree-view-test-host';

/** 200 flat roots — enough that only a window can be rendered. */
const MANY: Node[] = Array.from({ length: 200 }, (_, i) => ({
  id: i + 1,
  parentId: null,
  name: `Node ${i + 1}`,
}));

describe('OgeTreeView virtual scrolling', () => {
  let raf: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Stubbed asynchronously per the workspace convention — a synchronous
    // stub re-enters Angular's render scheduler and yields a bogus NG0100.
    raf = vi
      .spyOn(globalThis, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        setTimeout(() => cb(0), 0);
        return 0;
      });
  });

  afterEach(() => raf.mockRestore());

  it('renders every row when virtualization is off', async () => {
    const { rows } = await render((h) => h.items.set(MANY));
    expect(rows()).toHaveLength(200);
  });

  it('renders only a window when virtualization is on', async () => {
    const { rows, el } = await render((h) => {
      h.items.set(MANY);
      h.virtualScroll.set(true);
      h.height.set('300px');
    });
    const rendered = rows().length;
    expect(rendered).toBeGreaterThan(0);
    expect(rendered).toBeLessThan(200);
    // the spacer still reserves the full scroll height
    const list = el.querySelector<HTMLElement>('.oge-tree-view-list');
    expect(parseInt(list?.style.blockSize ?? '0', 10)).toBe(200 * 30);
  });

  it('moves the window and the offset on scroll', async () => {
    const { fixture, el, labels } = await render((h) => {
      h.items.set(MANY);
      h.virtualScroll.set(true);
      h.height.set('300px');
    });
    expect(labels()[0]).toBe('Node 1');

    const scroll = el.querySelector<HTMLElement>('.oge-tree-view-scroll');
    Object.defineProperty(scroll, 'scrollTop', { value: 1500, writable: true });
    scroll?.dispatchEvent(new Event('scroll'));
    await settle(fixture);

    expect(labels()[0]).not.toBe('Node 1');
    const viewport = el.querySelector<HTMLElement>('.oge-tree-view-viewport');
    expect(viewport?.style.transform).toMatch(/translateY\(\d+px\)/);
  });

  it('applies the configured row height', async () => {
    const { el } = await render((h) => {
      h.items.set(MANY);
      h.virtualScroll.set(true);
      h.height.set('300px');
    });
    const list = el.querySelector<HTMLElement>('.oge-tree-view-list');
    // the default 30px row height drives the spacer
    expect(list?.style.blockSize).toBe('6000px');
  });

  it('scrollToItem moves the window to an unrendered node', async () => {
    const { fixture, host, el, labels } = await render((h) => {
      h.items.set(MANY);
      h.virtualScroll.set(true);
      h.height.set('300px');
    });
    expect(labels()).not.toContain('Node 150');

    host.tree().scrollToItem(150);
    await settle(fixture);
    expect(labels()).toContain('Node 150');
    void el;
  });
});
