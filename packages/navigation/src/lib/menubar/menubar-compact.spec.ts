import { ApplicationRef, Component, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeMenubar } from './menubar';
import type {
  OgeMenubarCompactChangedEvent,
  OgeMenubarItemData,
} from './menubar-types';

/**
 * jsdom performs no layout, so the menubar would always be handed a zero-width
 * container ("not measured yet") and never go compact. These specs install a
 * size getter and a stand-in `ResizeObserver`; the decision itself is covered
 * DOM-free in core's `menubar-compact.spec.ts`.
 */
function installHarness(container: { size: number }): {
  restore: () => void;
  resize: () => void;
} {
  const proto = HTMLElement.prototype;
  const clientWidth = Object.getOwnPropertyDescriptor(proto, 'clientWidth');
  Object.defineProperty(proto, 'clientWidth', {
    configurable: true,
    get(this: HTMLElement) {
      return this.tagName === 'OGE-MENUBAR' ? container.size : 0;
    },
  });

  // The anchored panel constructs its own ResizeObserver while open, so the
  // stub must fan notifications out to every registered callback — a single
  // last-one-wins slot would let the panel's observer shadow the menubar's.
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
      (globalThis as Record<string, unknown>).ResizeObserver = previous;
    },
  };
}

const MENU: readonly OgeMenubarItemData[] = [
  { text: 'File', key: 'file', items: [{ text: 'New', key: 'new' }] },
  { text: 'Help', key: 'help' },
];

@Component({
  imports: [OgeMenubar],
  template: `
    <oge-menubar
      [items]="items"
      [compactBelow]="480"
      (compactChanged)="changes.push($event)"
    />
  `,
})
class CompactHost {
  readonly items = MENU;
  readonly bar = viewChild.required(OgeMenubar);
  readonly changes: OgeMenubarCompactChangedEvent[] = [];
}

describe('OgeMenubar — compactBelow', () => {
  let harness: ReturnType<typeof installHarness> | undefined;
  let fixture: ComponentFixture<CompactHost>;

  function settle(): void {
    for (let i = 0; i < 3; i++) {
      TestBed.inject(ApplicationRef).tick();
      fixture.detectChanges();
      vi.advanceTimersByTime(500);
    }
    TestBed.inject(ApplicationRef).tick();
    fixture.detectChanges();
  }

  async function render(size: number) {
    const container = { size };
    harness = installHarness(container);
    fixture = TestBed.createComponent(CompactHost);
    settle();
    const el = fixture.nativeElement as HTMLElement;
    return {
      host: fixture.componentInstance,
      container,
      menubarEl: () => el.querySelector('oge-menubar') as HTMLElement,
      hamburger: () =>
        el.querySelector('.oge-menubar-hamburger') as HTMLElement | null,
      barEl: () => el.querySelector('.oge-menubar-bar') as HTMLElement | null,
    };
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

  it('keeps the bar while the container is wide enough', async () => {
    const { barEl, hamburger, menubarEl } = await render(900);
    expect(barEl()).not.toBeNull();
    expect(hamburger()).toBeNull();
    expect(menubarEl().classList.contains('oge-menubar-compact')).toBe(false);
  });

  it('collapses into a hamburger below the threshold and emits compactChanged', async () => {
    const { host, container, barEl, hamburger, menubarEl } = await render(900);
    container.size = 400;
    harness?.resize();
    settle();
    expect(barEl()).toBeNull();
    expect(hamburger()).not.toBeNull();
    expect(hamburger()?.getAttribute('aria-label')).toBe('Menu');
    expect(menubarEl().classList.contains('oge-menubar-compact')).toBe(true);
    expect(host.changes).toEqual([{ compact: true }]);

    container.size = 900;
    harness?.resize();
    settle();
    expect(barEl()).not.toBeNull();
    expect(host.changes).toEqual([{ compact: true }, { compact: false }]);
  });

  it('the hamburger opens the full tree as one nested menu', async () => {
    const { container, hamburger } = await render(400);
    expect(container.size).toBe(400);
    hamburger()?.dispatchEvent(
      new MouseEvent('click', { bubbles: true, detail: 1 }),
    );
    settle();
    const rows = Array.from(document.querySelectorAll('.oge-menu-item'));
    expect(rows.map((el) => el.textContent?.trim())).toEqual(['File', 'Help']);
    // The childful root renders as a submenu parent inside the tree.
    expect(rows[0].getAttribute('aria-haspopup')).toBe('menu');
    expect(hamburger()?.getAttribute('aria-expanded')).toBe('true');
  });

  it('collapsing while a menu is open closes it first', async () => {
    const { host, container } = await render(900);
    host.bar().open('file');
    settle();
    expect(document.querySelector('.oge-menu-list')).not.toBeNull();
    container.size = 400;
    harness?.resize();
    settle();
    expect(document.querySelector('.oge-menu-list')).toBeNull();
  });
});
