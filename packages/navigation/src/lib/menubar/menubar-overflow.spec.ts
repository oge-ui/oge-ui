import { ApplicationRef, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeMenubar } from './menubar';
import type {
  OgeMenubarItemClickEvent,
  OgeMenubarItemData,
  OgeMenubarOverflowMode,
} from './menubar-types';

/**
 * jsdom performs no layout. The harness gives the bar a width and every bar
 * entry a fixed natural width (80px, separators 1px) plus a fan-out
 * `ResizeObserver` stand-in; the fit arithmetic itself is covered DOM-free in
 * behavior's `menubar-core.spec.ts`.
 */
function installHarness(container: { size: number }) {
  const proto = HTMLElement.prototype;
  const saved = {
    clientWidth: Object.getOwnPropertyDescriptor(proto, 'clientWidth'),
    offsetWidth: Object.getOwnPropertyDescriptor(proto, 'offsetWidth'),
  };
  const width = (el: HTMLElement): number => {
    if (el.tagName === 'OGE-MENUBAR') return container.size;
    if (el.classList.contains('oge-menubar-bar')) return container.size;
    if (el.classList.contains('oge-menubar-separator')) return 1;
    if (el.classList.contains('oge-menubar-item')) return 80;
    return 0;
  };
  Object.defineProperty(proto, 'clientWidth', {
    configurable: true,
    get(this: HTMLElement) {
      return width(this);
    },
  });
  Object.defineProperty(proto, 'offsetWidth', {
    configurable: true,
    get(this: HTMLElement) {
      return width(this);
    },
  });
  const callbacks: (() => void)[] = [];
  const previous = (globalThis as Record<string, unknown>).ResizeObserver;
  (globalThis as Record<string, unknown>).ResizeObserver = class {
    constructor(cb: () => void) {
      callbacks.push(cb);
    }
    observe(): void {
      /* driven by the spec */
    }
    disconnect(): void {
      /* nothing to release */
    }
  };
  return {
    resize: () => [...callbacks].forEach((cb) => cb()),
    restore: () => {
      for (const [name, descriptor] of Object.entries(saved)) {
        if (descriptor) Object.defineProperty(proto, name, descriptor);
      }
      (globalThis as Record<string, unknown>).ResizeObserver = previous;
    },
  };
}

const MENU: readonly OgeMenubarItemData[] = [
  { text: 'File', key: 'file', items: [{ text: 'New', key: 'new' }] },
  { text: 'Edit', key: 'edit' },
  { text: 'View', key: 'view' },
  {
    text: 'Tools',
    key: 'tools',
    items: [{ text: 'Options', key: 'options' }],
  },
  { text: 'Help', key: 'help', overflow: 'never' },
];

@Component({
  imports: [OgeMenubar],
  template: `
    <oge-menubar
      [items]="items"
      [overflowMode]="mode()"
      [activeKey]="activeKey()"
      (itemClick)="clicks.push($event)"
    />
  `,
})
class OverflowHost {
  readonly items = MENU;
  readonly mode = signal<OgeMenubarOverflowMode>('more');
  readonly activeKey = signal<string | undefined>(undefined);
  readonly clicks: OgeMenubarItemClickEvent[] = [];
}

describe('OgeMenubar — overflowMode "more"', () => {
  let harness: ReturnType<typeof installHarness> | undefined;
  let fixture: ComponentFixture<OverflowHost>;

  function settle(): void {
    for (let i = 0; i < 3; i++) {
      TestBed.inject(ApplicationRef).tick();
      fixture.detectChanges();
      vi.advanceTimersByTime(500);
    }
    TestBed.inject(ApplicationRef).tick();
    fixture.detectChanges();
  }

  function render(size: number) {
    const container = { size };
    harness = installHarness(container);
    fixture = TestBed.createComponent(OverflowHost);
    settle();
    const el = fixture.nativeElement as HTMLElement;
    const entries = () =>
      Array.from(
        el.querySelectorAll<HTMLElement>(
          '.oge-menubar-bar > .oge-menubar-item',
        ),
      );
    const entry = (text: string) =>
      entries().find((e) => e.textContent?.trim() === text)!;
    const visible = () =>
      entries()
        .filter((e) => !e.classList.contains('oge-menubar-item-overflowed'))
        .map((e) => e.textContent?.trim());
    const more = () => el.querySelector<HTMLElement>('.oge-menubar-more');
    return { host: fixture.componentInstance, container, entry, visible, more };
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

  it('keeps every item and hides the More item while everything fits', () => {
    const { visible, more } = render(1000);
    expect(visible()).toEqual(['File', 'Edit', 'View', 'Tools', 'Help']);
    expect(more()?.classList.contains('oge-menubar-item-overflowed')).toBe(
      true,
    );
    expect(more()?.getAttribute('tabindex')).toBe('-1');
  });

  it('moves the trailing auto items into More, keeping "never" items', () => {
    // 300px: File + Edit + Help (never) + More = 320 > 300 → only File stays
    // beside the pinned Help.
    const { visible, more, entry } = render(300);
    expect(visible()).toEqual(['File', 'Help', 'More']);
    expect(
      entry('Edit').classList.contains('oge-menubar-item-overflowed'),
    ).toBe(true);
    expect(more()?.getAttribute('aria-haspopup')).toBe('menu');
    expect(more()?.getAttribute('aria-expanded')).toBe('false');
  });

  it('the More item joins the roving tabindex', () => {
    const { entry, more } = render(300);
    entry('File').focus();
    entry('File').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    );
    settle();
    // Edit/View/Tools are hidden: the next stop is Help, then More.
    expect(document.activeElement).toBe(entry('Help'));
    entry('Help').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    );
    settle();
    expect(document.activeElement).toBe(more());
    expect(more()?.getAttribute('tabindex')).toBe('0');
  });

  it('opens the overflowed items as a submenu and reports real paths', () => {
    const { host, more } = render(300);
    more()!.dispatchEvent(
      new MouseEvent('click', { bubbles: true, detail: 1 }),
    );
    settle();
    expect(more()?.getAttribute('aria-expanded')).toBe('true');
    const list = document.querySelector('.oge-menu-list') as HTMLElement;
    expect(list.getAttribute('aria-label')).toBe('More');
    const rows = Array.from(
      list.querySelectorAll<HTMLElement>('.oge-menu-item'),
    );
    expect(rows.map((r) => r.textContent?.trim())).toEqual([
      'Edit',
      'View',
      'Tools',
    ]);
    expect(rows[2].getAttribute('aria-haspopup')).toBe('menu');
    rows[1].click();
    settle();
    expect(host.clicks.at(-1)).toMatchObject({ key: 'view', path: [2] });
  });

  it('marks More current when the active item moved into it', () => {
    const { host, more } = render(300);
    host.activeKey.set('view');
    settle();
    expect(more()?.getAttribute('aria-current')).toBe('page');
  });

  it('recovers when the container grows', () => {
    const { container, visible } = render(300);
    container.size = 1000;
    harness?.resize();
    settle();
    expect(visible()).toEqual(['File', 'Edit', 'View', 'Tools', 'Help']);
  });

  it('renders no More item in the default hamburger mode', () => {
    const { host, more, visible } = render(300);
    host.mode.set('hamburger');
    settle();
    expect(more()).toBeNull();
    expect(visible()).toEqual(['File', 'Edit', 'View', 'Tools', 'Help']);
  });
});
