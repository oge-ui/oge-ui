import {
  OGE_TOP_LAYER_CLASS,
  hasFixedContainingBlockAncestor,
  ogePromoteToTopLayer,
} from './top-layer';

type Styles = Partial<Record<keyof CSSStyleDeclaration, string>>;

describe('top layer promotion', () => {
  const styles = new Map<Element, Styles>();
  let shown: Element[];
  let wrapper: HTMLElement;
  let panel: HTMLElement;

  const proto = HTMLElement.prototype as unknown as Record<string, unknown>;

  beforeEach(() => {
    styles.clear();
    shown = [];
    wrapper = document.createElement('div');
    panel = document.createElement('div');
    wrapper.appendChild(panel);
    document.body.appendChild(wrapper);
    vi.spyOn(window, 'getComputedStyle').mockImplementation(
      (element) => (styles.get(element) ?? {}) as CSSStyleDeclaration,
    );
    proto['showPopover'] = function (this: Element) {
      shown.push(this);
    };
    proto['hidePopover'] = function (this: Element) {
      shown.splice(shown.indexOf(this), 1);
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete proto['showPopover'];
    delete proto['hidePopover'];
    wrapper.remove();
  });

  it.each<[string, Styles]>([
    ['transform', { transform: 'matrix(0.95, 0, 0, 0.95, 0, 0)' }],
    ['the individual scale property', { scale: '0.95' }],
    ['filter', { filter: 'blur(2px)' }],
    ['backdrop-filter', { backdropFilter: 'blur(2px)' }],
    ['perspective', { perspective: '100px' }],
    ['paint containment', { contain: 'paint' }],
    ['will-change', { willChange: 'opacity, transform' }],
    ['a size container', { containerType: 'inline-size' }],
  ])('detects an ancestor with %s', (_name, style) => {
    styles.set(wrapper, style);
    expect(hasFixedContainingBlockAncestor(panel)).toBe(true);
  });

  it('ignores ancestors that do not capture fixed descendants', () => {
    styles.set(wrapper, {
      transform: 'none',
      filter: 'none',
      contain: 'none',
      willChange: 'auto',
      containerType: 'normal',
    });
    expect(hasFixedContainingBlockAncestor(panel)).toBe(false);
  });

  it('ignores the viewport-sized, non-scrolling shaded modal layer', () => {
    styles.set(wrapper, { backdropFilter: 'blur(1.5px)' });
    vi.spyOn(wrapper, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: window.innerWidth,
      height: window.innerHeight,
    } as DOMRect);
    expect(hasFixedContainingBlockAncestor(panel)).toBe(false);
  });

  it('leaves a surface alone when nothing captures it', () => {
    ogePromoteToTopLayer(panel)();
    expect(shown).toEqual([]);
    expect(panel.hasAttribute('popover')).toBe(false);
  });

  it('promotes under a capturing ancestor and releases on request', () => {
    styles.set(wrapper, { transform: 'scale(0.95)' });
    const release = ogePromoteToTopLayer(panel);
    expect(panel.getAttribute('popover')).toBe('manual');
    expect(panel.classList.contains(OGE_TOP_LAYER_CLASS)).toBe(true);
    expect(shown).toEqual([panel]);
    release();
    release(); // idempotent
    expect(panel.hasAttribute('popover')).toBe(false);
    // the class survives so the exit motion knows not to ghost it
    expect(panel.classList.contains(OGE_TOP_LAYER_CLASS)).toBe(true);
  });

  it('promotes every later surface while one is promoted', () => {
    styles.set(wrapper, { transform: 'scale(0.95)' });
    const release = ogePromoteToTopLayer(panel);
    const portaled = document.createElement('div');
    document.body.appendChild(portaled);
    const releasePortaled = ogePromoteToTopLayer(portaled);
    expect(shown).toEqual([panel, portaled]);
    releasePortaled();
    release();
    portaled.remove();
    // the count went back to zero: an ordinary surface stays ordinary again
    shown.length = 0;
    styles.clear();
    ogePromoteToTopLayer(panel)();
    expect(shown).toEqual([]);
  });

  it('is a no-op without the Popover API', () => {
    delete proto['showPopover'];
    styles.set(wrapper, { transform: 'scale(0.95)' });
    ogePromoteToTopLayer(panel)();
    expect(panel.hasAttribute('popover')).toBe(false);
  });
});
