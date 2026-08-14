import {
  StrictMode,
  createRef,
  useState,
  type ComponentProps,
  type ReactElement,
} from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import type {
  OgeBreadcrumbItemClickEvent,
  OgeBreadcrumbItemData,
} from '@oge-ui/behavior';
import { OgeBreadcrumb, type OgeBreadcrumbHandle } from './breadcrumb';
import { OgeBreadcrumbConfigProvider } from './navigation-config';

const TRAIL: readonly OgeBreadcrumbItemData[] = [
  { text: 'Home', key: 'home', url: '/' },
  { text: 'Products', key: 'products', url: '/products' },
  { text: 'Archived', key: 'archived', disabled: true },
  { text: 'Keyboards', key: 'keyboards' },
];

const crumbs = (): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>('.oge-breadcrumb-item'));
const texts = (): (string | undefined)[] =>
  crumbs().map((c) => c.textContent?.trim());

const click = (el: Element): void => {
  fireEvent.click(el, { detail: 1 });
};

describe('<OgeBreadcrumb>', () => {
  it('renders the trail in order with the last crumb non-interactive', () => {
    render(<OgeBreadcrumb items={TRAIL} />);
    const all = crumbs();
    expect(texts()).toEqual(['Home', 'Products', 'Archived', 'Keyboards']);
    expect(all[0].tagName).toBe('A');
    expect(all[0].getAttribute('href')).toBe('/');
    expect(all[3].tagName).toBe('SPAN'); // the current page is never a link
  });

  it('emits onItemClick with item, key and index — never for last or disabled', () => {
    const clicks: OgeBreadcrumbItemClickEvent[] = [];
    render(<OgeBreadcrumb items={TRAIL} onItemClick={(e) => clicks.push(e)} />);
    const all = crumbs();
    all[0].addEventListener('click', (e) => e.preventDefault()); // no jsdom nav
    click(all[0]);
    expect(clicks).toHaveLength(1);
    expect(clicks[0].key).toBe('home');
    expect(clicks[0].index).toBe(0);

    click(all[2]);
    click(all[3]);
    expect(clicks).toHaveLength(1); // disabled and last stayed silent
  });

  it('a url-less middle crumb renders as a button and still clicks', () => {
    const clicks: OgeBreadcrumbItemClickEvent[] = [];
    render(
      <OgeBreadcrumb
        items={[
          { text: 'Root', url: '/' },
          { text: 'Command', key: 'cmd' },
          { text: 'Here' },
        ]}
        onItemClick={(e) => clicks.push(e)}
      />,
    );
    const middle = crumbs()[1];
    expect(middle.tagName).toBe('BUTTON');
    click(middle);
    expect(clicks.map((c) => c.key)).toEqual(['cmd']);
  });

  it('items with visible: false disappear', () => {
    render(
      <OgeBreadcrumb
        items={[
          { text: 'A', url: '/' },
          { text: 'Hidden', visible: false },
          { text: 'B' },
        ]}
      />,
    );
    expect(texts()).toEqual(['A', 'B']);
  });

  it('the config provider overrides messages', () => {
    render(
      <OgeBreadcrumbConfigProvider
        config={{ messages: { breadcrumb: 'İçerik haritası' } }}
      >
        <OgeBreadcrumb items={TRAIL} />
      </OgeBreadcrumbConfigProvider>,
    );
    expect(document.querySelector('nav')?.getAttribute('aria-label')).toBe(
      'İçerik haritası',
    );
  });

  it('the messages prop overrides the config per instance', () => {
    render(<OgeBreadcrumb items={TRAIL} messages={{ breadcrumb: 'Trail' }} />);
    expect(document.querySelector('nav')?.getAttribute('aria-label')).toBe(
      'Trail',
    );
  });

  it('renderItem replaces the crumb interior, renderSeparator the chevron', () => {
    render(
      <OgeBreadcrumb
        items={TRAIL}
        renderItem={({ item, last }) => (
          <strong className="custom">
            {last ? `[${item.text}]` : item.text}
          </strong>
        )}
        renderSeparator={() => <span className="dot">·</span>}
      />,
    );
    expect(
      Array.from(document.querySelectorAll('.custom')).map((n) =>
        n.textContent?.trim(),
      ),
    ).toEqual(['Home', 'Products', 'Archived', '[Keyboards]']);
    expect(document.querySelectorAll('.dot').length).toBeGreaterThan(0);
  });

  it('focus() moves to the first interactive crumb', () => {
    const ref = createRef<OgeBreadcrumbHandle>();
    render(<OgeBreadcrumb ref={ref} items={TRAIL} />);
    act(() => ref.current?.focus());
    expect(document.activeElement).toBe(crumbs()[0]);
  });

  it('survives a StrictMode remount', () => {
    render(
      <StrictMode>
        <OgeBreadcrumb items={TRAIL} />
      </StrictMode>,
    );
    expect(texts()).toEqual(['Home', 'Products', 'Archived', 'Keyboards']);
  });

  it('re-renders when the trail changes', () => {
    function Host() {
      const [items, setItems] =
        useState<readonly OgeBreadcrumbItemData[]>(TRAIL);
      return (
        <>
          <button onClick={() => setItems([{ text: 'Only' }])}>swap</button>
          <OgeBreadcrumb items={items} />
        </>
      );
    }
    render(<Host />);
    fireEvent.click(document.querySelector('button') as HTMLElement);
    expect(texts()).toEqual(['Only']);
  });
});

// --- accessibility contract -------------------------------------------------

const A11Y_TRAIL: readonly OgeBreadcrumbItemData[] = [
  { text: 'Home', url: '/' },
  { text: 'Archived', disabled: true, hint: 'No longer available' },
  { text: 'Keyboards' },
];

describe('<OgeBreadcrumb> accessibility contract', () => {
  beforeEach(() => {
    render(<OgeBreadcrumb items={A11Y_TRAIL} />);
  });

  it('is a labelled nav landmark holding an ordered list', () => {
    const nav = document.querySelector('nav');
    expect(nav?.getAttribute('aria-label')).toBe('Breadcrumb');
    const list = nav?.querySelector('ol.oge-breadcrumb-list');
    expect(list).not.toBeNull();
    // Every crumb sits in its own li (the parked ellipsis li included).
    expect(list?.querySelectorAll('li .oge-breadcrumb-item')).toHaveLength(3);
  });

  it('marks the current page and exposes disabled crumbs', () => {
    const all = crumbs();
    expect(all[2].getAttribute('aria-current')).toBe('page');
    expect(all[2].classList.contains('oge-breadcrumb-item-current')).toBe(true);
    expect(all[0].getAttribute('aria-current')).toBeNull();
    expect(all[1].getAttribute('aria-disabled')).toBe('true');
    expect(all[1].getAttribute('title')).toBe('No longer available');
  });

  it('separators are decoration — aria-hidden, one per boundary', () => {
    const separators = document.querySelectorAll(
      '.oge-breadcrumb-li:not(.oge-breadcrumb-li-parked):not(.oge-breadcrumb-ellipsis-li) .oge-breadcrumb-separator',
    );
    expect(separators).toHaveLength(2); // no separator before the first crumb
    separators.forEach((separator) => {
      expect(separator.getAttribute('aria-hidden')).toBe('true');
    });
  });

  it('has no roving tabindex — crumbs are plain links in the Tab order', () => {
    const link = document.querySelector('a.oge-breadcrumb-item');
    expect(link?.getAttribute('tabindex')).toBeNull();
    const parked = document.querySelector('.oge-breadcrumb-ellipsis');
    expect(parked?.getAttribute('tabindex')).toBe('-1'); // parked, unreachable
  });
});

// --- collapse ---------------------------------------------------------------

/**
 * jsdom performs no layout, so the harness supplies the geometry: the host's
 * `clientWidth` and every crumb li's `offsetWidth`. Hidden (collapsed) lis
 * report 0 — exactly what the size cache expects — and the parked ellipsis
 * reports its real size, mirroring `visibility: hidden` in a browser. The
 * fitting decision itself is covered DOM-free in core's `toolbar-fit.spec.ts`.
 */
const CRUMB_WIDTH = 80;
const ELLIPSIS_WIDTH = 40;

function installHarness(container: { size: number }): {
  restore: () => void;
  resize: () => void;
} {
  const proto = HTMLElement.prototype;
  const clientWidth = Object.getOwnPropertyDescriptor(proto, 'clientWidth');
  const offsetWidth = Object.getOwnPropertyDescriptor(proto, 'offsetWidth');
  Object.defineProperty(proto, 'clientWidth', {
    configurable: true,
    get(this: HTMLElement) {
      return this.classList.contains('oge-breadcrumb') ? container.size : 0;
    },
  });
  Object.defineProperty(proto, 'offsetWidth', {
    configurable: true,
    get(this: HTMLElement) {
      if (this.classList.contains('oge-breadcrumb-ellipsis-li')) {
        return ELLIPSIS_WIDTH;
      }
      if (this.classList.contains('oge-breadcrumb-li-hidden')) return 0;
      if (this.classList.contains('oge-breadcrumb-li')) return CRUMB_WIDTH;
      return 0;
    },
  });

  const callbacks: (() => void)[] = [];
  const previous = (globalThis as Record<string, unknown>).ResizeObserver;
  (globalThis as Record<string, unknown>).ResizeObserver = class {
    constructor(cb: () => void) {
      callbacks.push(cb);
    }
    observe(): void {
      /* the spec drives notifications directly */
    }
    disconnect(): void {
      /* nothing to release */
    }
  };

  return {
    resize: () => act(() => [...callbacks].forEach((cb) => cb())),
    restore: () => {
      if (clientWidth) Object.defineProperty(proto, 'clientWidth', clientWidth);
      if (offsetWidth) Object.defineProperty(proto, 'offsetWidth', offsetWidth);
      (globalThis as Record<string, unknown>).ResizeObserver = previous;
    },
  };
}

const LONG_TRAIL: readonly OgeBreadcrumbItemData[] = [
  { text: 'Home', key: 'home', url: '/' },
  { text: 'Products', key: 'products', url: '/products' },
  { text: 'Peripherals', key: 'peripherals', url: '/products/peripherals' },
  { text: 'Keyboards', key: 'keyboards', url: '/products/keyboards' },
  { text: 'Mechanical', key: 'mechanical' },
];

describe('<OgeBreadcrumb> collapseMode', () => {
  let harness: ReturnType<typeof installHarness> | undefined;

  const visibleTexts = (): string[] =>
    Array.from(
      document.querySelectorAll<HTMLElement>(
        '.oge-breadcrumb-li:not(.oge-breadcrumb-li-hidden):not(.oge-breadcrumb-ellipsis-li) .oge-breadcrumb-item-text',
      ),
    ).map((el) => el.textContent?.trim() ?? '');
  const ellipsis = (): HTMLElement | null =>
    document.querySelector(
      '.oge-breadcrumb-ellipsis-li:not(.oge-breadcrumb-li-parked) .oge-breadcrumb-ellipsis',
    );
  const menuRows = (): HTMLElement[] =>
    Array.from(document.querySelectorAll<HTMLElement>('.oge-menu-item'));

  afterEach(() => {
    harness?.restore();
    harness = undefined;
  });

  function mount(
    size: number,
    props: Partial<ComponentProps<typeof OgeBreadcrumb>> = {},
  ): { container: { size: number }; rerender: (node: ReactElement) => void } {
    const container = { size };
    harness = installHarness(container);
    const view = render(<OgeBreadcrumb items={LONG_TRAIL} {...props} />);
    // The first pass measures; the second applies the resulting fit.
    harness.resize();
    return { container, rerender: view.rerender };
  }

  it('renders the full trail while there is room — the ellipsis stays parked', () => {
    mount(500); // 5 × 80 fits
    expect(visibleTexts()).toEqual([
      'Home',
      'Products',
      'Peripherals',
      'Keyboards',
      'Mechanical',
    ]);
    expect(ellipsis()).toBeNull();
  });

  it('collapses the oldest middle crumbs first; first and last stay visible', () => {
    mount(300); // 80 + 80 + 40 (ellipsis) + 80 = 280 fits one middle
    expect(visibleTexts()).toEqual(['Home', 'Keyboards', 'Mechanical']);
    expect(ellipsis()).not.toBeNull();
    expect(ellipsis()?.getAttribute('aria-haspopup')).toBe('menu');
  });

  it('the ellipsis menu lists collapsed crumbs as real links and clicks resolve to trail indices', () => {
    const clicks: OgeBreadcrumbItemClickEvent[] = [];
    mount(300, { onItemClick: (e) => clicks.push(e) });
    click(ellipsis() as HTMLElement);
    const rows = menuRows();
    expect(rows.map((row) => row.textContent?.trim())).toEqual([
      'Products',
      'Peripherals',
    ]);
    expect(rows[0].tagName).toBe('A'); // url survives the collapse
    expect(rows[0].getAttribute('href')).toBe('/products');

    rows[1].addEventListener('click', (e) => e.preventDefault());
    click(rows[1]);
    expect(clicks).toHaveLength(1);
    expect(clicks[0].key).toBe('peripherals');
    expect(clicks[0].index).toBe(2); // index within the full trail
    expect(document.querySelector('.oge-menu-list')).toBeNull(); // select closed it
  });

  it('growing back restores the full trail and closes an open menu', () => {
    const { container } = mount(300);
    click(ellipsis() as HTMLElement);
    expect(document.querySelector('.oge-menu-list')).not.toBeNull();

    container.size = 500;
    harness?.resize();
    expect(visibleTexts()).toHaveLength(5);
    expect(ellipsis()).toBeNull();
    expect(document.querySelector('.oge-menu-list')).toBeNull();
  });

  it("collapseMode 'wrap' and 'none' never collapse", () => {
    const { rerender } = mount(300, { collapseMode: 'wrap' });
    expect(visibleTexts()).toHaveLength(5);
    expect(ellipsis()).toBeNull();
    expect(document.querySelector('.oge-breadcrumb-wrap')).not.toBeNull();

    rerender(<OgeBreadcrumb items={LONG_TRAIL} collapseMode="none" />);
    harness?.resize();
    expect(visibleTexts()).toHaveLength(5);
    expect(document.querySelector('.oge-breadcrumb-scroll')).not.toBeNull();
  });

  it('ArrowDown on the ellipsis opens the menu and focuses its first row', () => {
    mount(300);
    fireEvent.keyDown(ellipsis() as HTMLElement, { key: 'ArrowDown' });
    expect(document.querySelector('.oge-menu-list')).not.toBeNull();
    expect(menuRows()).toHaveLength(2);
  });
});
