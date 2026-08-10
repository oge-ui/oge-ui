import { ApplicationRef, Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeBreadcrumb } from './breadcrumb';
import type {
  OgeBreadcrumbItemClickEvent,
  OgeBreadcrumbItemData,
} from './breadcrumb-types';

/**
 * jsdom performs no layout, so the harness supplies the geometry: the host's
 * `clientWidth` and every crumb li's `offsetWidth`. Hidden (collapsed) lis
 * report 0 — exactly what the component's size cache expects — and the parked
 * ellipsis reports its real size, mirroring `visibility: hidden` in a
 * browser. The fitting decision itself is covered DOM-free in core's
 * `toolbar-fit.spec.ts`.
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
      return this.tagName === 'OGE-BREADCRUMB' ? container.size : 0;
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
    resize: () => [...callbacks].forEach((cb) => cb()),
    restore: () => {
      if (clientWidth) Object.defineProperty(proto, 'clientWidth', clientWidth);
      if (offsetWidth) Object.defineProperty(proto, 'offsetWidth', offsetWidth);
      (globalThis as Record<string, unknown>).ResizeObserver = previous;
    },
  };
}

const TRAIL: readonly OgeBreadcrumbItemData[] = [
  { text: 'Home', key: 'home', url: '/' },
  { text: 'Products', key: 'products', url: '/products' },
  { text: 'Peripherals', key: 'peripherals', url: '/products/peripherals' },
  { text: 'Keyboards', key: 'keyboards', url: '/products/keyboards' },
  { text: 'Mechanical', key: 'mechanical' },
];

@Component({
  imports: [OgeBreadcrumb],
  template: `
    <oge-breadcrumb
      [items]="items()"
      [collapseMode]="mode()"
      (itemClick)="clicks.push($event)"
    />
  `,
})
class CollapseHost {
  readonly items = signal<readonly OgeBreadcrumbItemData[]>(TRAIL);
  readonly mode = signal<'auto' | 'wrap' | 'none'>('auto');
  readonly crumb = viewChild.required(OgeBreadcrumb);
  readonly clicks: OgeBreadcrumbItemClickEvent[] = [];
}

describe('OgeBreadcrumb — collapseMode', () => {
  let harness: ReturnType<typeof installHarness> | undefined;
  let fixture: ComponentFixture<CollapseHost>;

  const visibleTexts = (): string[] =>
    Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
        '.oge-breadcrumb-li:not(.oge-breadcrumb-li-hidden):not(.oge-breadcrumb-ellipsis-li) .oge-breadcrumb-item-text',
      ),
    ).map((el) => el.textContent?.trim() ?? '');
  const ellipsis = (): HTMLElement | null =>
    (fixture.nativeElement as HTMLElement).querySelector(
      '.oge-breadcrumb-ellipsis-li:not(.oge-breadcrumb-li-parked) .oge-breadcrumb-ellipsis',
    );

  function settle(): void {
    for (let i = 0; i < 3; i++) {
      TestBed.inject(ApplicationRef).tick();
      fixture.detectChanges();
      vi.advanceTimersByTime(500);
    }
    TestBed.inject(ApplicationRef).tick();
    fixture.detectChanges();
  }

  function render(size: number): { size: number } {
    const container = { size };
    harness = installHarness(container);
    fixture = TestBed.createComponent(CollapseHost);
    settle();
    return container;
  }

  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame'],
    });
  });

  afterEach(() => {
    fixture?.destroy();
    harness?.restore();
    harness = undefined;
    vi.useRealTimers();
  });

  it('renders the full trail while there is room — the ellipsis stays parked', () => {
    render(500); // 5 × 80 fits
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
    render(300); // 80 + 80 + 40 (ellipsis) + 80 = 280 fits one middle
    expect(visibleTexts()).toEqual(['Home', 'Keyboards', 'Mechanical']);
    expect(ellipsis()).not.toBeNull();
    expect(ellipsis()?.getAttribute('aria-haspopup')).toBe('menu');
  });

  it('the ellipsis menu lists collapsed crumbs as real links and clicks resolve to trail indices', () => {
    render(300);
    ellipsis()?.dispatchEvent(
      new MouseEvent('click', { bubbles: true, detail: 1 }),
    );
    settle();
    const rows = Array.from(
      document.querySelectorAll<HTMLElement>('.oge-menu-item'),
    );
    expect(rows.map((row) => row.textContent?.trim())).toEqual([
      'Products',
      'Peripherals',
    ]);
    expect(rows[0].tagName).toBe('A'); // url survives the collapse
    expect(rows[0].getAttribute('href')).toBe('/products');

    rows[1].addEventListener('click', (e) => e.preventDefault());
    rows[1].dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }),
    );
    settle();
    const clicks = fixture.componentInstance.clicks;
    expect(clicks).toHaveLength(1);
    expect(clicks[0].key).toBe('peripherals');
    expect(clicks[0].index).toBe(2); // index within the full trail
    expect(document.querySelector('.oge-menu-list')).toBeNull(); // select closed it
  });

  it('growing back restores the full trail and closes an open menu', () => {
    const container = render(300);
    ellipsis()?.dispatchEvent(
      new MouseEvent('click', { bubbles: true, detail: 1 }),
    );
    settle();
    expect(document.querySelector('.oge-menu-list')).not.toBeNull();

    container.size = 500;
    harness?.resize();
    settle();
    expect(visibleTexts()).toHaveLength(5);
    expect(ellipsis()).toBeNull();
    expect(document.querySelector('.oge-menu-list')).toBeNull();
  });

  it("collapseMode 'wrap' and 'none' never collapse", () => {
    render(300);
    fixture.componentInstance.mode.set('wrap');
    settle();
    expect(visibleTexts()).toHaveLength(5);
    expect(ellipsis()).toBeNull();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.oge-breadcrumb-wrap')).not.toBeNull();

    fixture.componentInstance.mode.set('none');
    settle();
    expect(visibleTexts()).toHaveLength(5);
    expect(el.querySelector('.oge-breadcrumb-scroll')).not.toBeNull();
  });
});
