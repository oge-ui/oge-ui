import { ApplicationRef, Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeMenuList } from './menu-list';
import type {
  OgeMenuCloseRequestEvent,
  OgeMenuItem,
  OgeMenuListItemClickEvent,
} from './menu-types';

const NESTED_ITEMS: readonly OgeMenuItem[] = [
  { text: 'New' },
  {
    text: 'Share',
    items: [
      { text: 'Email' },
      { text: 'Link', items: [{ text: 'Copy link' }] },
    ],
  },
  { text: 'Exit' },
];

@Component({
  imports: [OgeMenuList],
  template: `
    <oge-menu-list
      [items]="items()"
      ariaLabel="Actions"
      (itemClick)="clicks.push($event)"
      (closeRequest)="closes.push($event)"
    />
  `,
})
class SubmenuHost {
  readonly items = signal<readonly OgeMenuItem[]>(NESTED_ITEMS);
  readonly menu = viewChild.required(OgeMenuList);
  readonly clicks: OgeMenuListItemClickEvent[] = [];
  readonly closes: OgeMenuCloseRequestEvent[] = [];
}

function key(el: HTMLElement, k: string): void {
  el.dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: k }),
  );
}

function hover(el: HTMLElement): void {
  el.dispatchEvent(new MouseEvent('pointerenter', { bubbles: false }));
}

describe('OgeMenuList — nested submenus', () => {
  let fixture: ComponentFixture<SubmenuHost>;
  let host: SubmenuHost;
  let rootEl: HTMLElement;

  const lists = (): HTMLElement[] =>
    Array.from(document.querySelectorAll<HTMLElement>('.oge-menu-list'));
  const rowsOf = (list: HTMLElement): HTMLButtonElement[] =>
    Array.from(
      list.querySelectorAll<HTMLButtonElement>(':scope > .oge-menu-item'),
    );

  /** Change detection only — for assertions inside a running grace period. */
  function render(): void {
    TestBed.inject(ApplicationRef).tick();
    fixture.detectChanges();
  }

  function settle(): void {
    // Panel measure retries across frames while the popup renders; interleave
    // ticks and (faked, async) rAF flushes until both settle.
    for (let i = 0; i < 3; i++) {
      TestBed.inject(ApplicationRef).tick();
      fixture.detectChanges();
      vi.advanceTimersByTime(500);
    }
    TestBed.inject(ApplicationRef).tick();
    fixture.detectChanges();
  }

  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame'],
    });
    fixture = TestBed.createComponent(SubmenuHost);
    host = fixture.componentInstance;
    fixture.detectChanges();
    rootEl = (fixture.nativeElement as HTMLElement).querySelector(
      '.oge-menu-list',
    ) as HTMLElement;
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
  });

  it('renders parent-row semantics and leaves leaf rows untouched', () => {
    const rows = rowsOf(rootEl);
    // Leaf rows: byte-identical to the pre-submenu rendering.
    expect(rows[0].getAttribute('aria-haspopup')).toBeNull();
    expect(rows[0].getAttribute('aria-expanded')).toBeNull();
    expect(rows[0].querySelector('.oge-menu-item-caret')).toBeNull();
    // Parent row: chevron + aria-haspopup, collapsed by default.
    expect(rows[1].getAttribute('aria-haspopup')).toBe('menu');
    expect(rows[1].getAttribute('aria-expanded')).toBe('false');
    expect(rows[1].querySelector('.oge-menu-item-caret')).not.toBeNull();
    expect(rows[1].getAttribute('role')).toBe('menuitem');
    expect(lists().length).toBe(1);
  });

  it('checked is ignored on a submenu parent — the row stays a menuitem', () => {
    host.items.set([
      { text: 'View', checked: true, items: [{ text: 'Zoom' }] },
    ]);
    fixture.detectChanges();
    const row = rowsOf(rootEl)[0];
    expect(row.getAttribute('role')).toBe('menuitem');
    expect(row.getAttribute('aria-checked')).toBeNull();
    expect(row.querySelector('.oge-menu-item-check')).toBeNull();
  });

  it('ArrowRight on a parent row opens the submenu and focuses it', () => {
    host.menu().focus();
    key(rootEl, 'ArrowDown'); // → Share
    key(rootEl, 'ArrowRight');
    settle();
    const all = lists();
    expect(all.length).toBe(2);
    expect(rowsOf(rootEl)[1].getAttribute('aria-expanded')).toBe('true');
    expect(all[1].getAttribute('aria-label')).toBe('Share');
    expect(document.activeElement).toBe(all[1]);
    // First child item active per APG.
    expect(all[1].getAttribute('aria-activedescendant')).toMatch(/-item-0$/);
  });

  it('ArrowRight on a leaf row does nothing and bubbles to the owner', () => {
    host.menu().focus(); // active: New (leaf)
    const bubbled: KeyboardEvent[] = [];
    const listener = (e: Event): void => {
      bubbled.push(e as KeyboardEvent);
    };
    document.addEventListener('keydown', listener);
    key(rootEl, 'ArrowRight');
    document.removeEventListener('keydown', listener);
    settle();
    expect(lists().length).toBe(1);
    expect(bubbled.length).toBe(1);
    expect(bubbled[0].defaultPrevented).toBe(false);
  });

  it('Enter opens the submenu instead of activating the parent', () => {
    host.menu().focus();
    key(rootEl, 'ArrowDown');
    key(rootEl, 'Enter');
    settle();
    expect(lists().length).toBe(2);
    expect(host.clicks.length).toBe(0);
    expect(host.closes.length).toBe(0);
  });

  it('Escape in the submenu closes only that level and refocuses the parent', () => {
    host.menu().focus();
    key(rootEl, 'ArrowDown');
    key(rootEl, 'ArrowRight');
    settle();
    key(lists()[1], 'Escape');
    settle();
    expect(lists().length).toBe(1);
    expect(document.activeElement).toBe(rootEl);
    expect(rowsOf(rootEl)[1].getAttribute('aria-expanded')).toBe('false');
    // Absorbed — the owner receives no closeRequest.
    expect(host.closes.length).toBe(0);
  });

  it('ArrowLeft in the submenu closes the level (back) without reaching the owner', () => {
    host.menu().focus();
    key(rootEl, 'ArrowDown');
    key(rootEl, 'ArrowRight');
    settle();
    key(lists()[1], 'ArrowLeft');
    settle();
    expect(lists().length).toBe(1);
    expect(document.activeElement).toBe(rootEl);
    expect(host.closes.length).toBe(0);
  });

  it('ArrowLeft in the root list bubbles instead of emitting back', () => {
    host.menu().focus();
    key(rootEl, 'ArrowLeft');
    settle();
    expect(host.closes.length).toBe(0);
    expect(lists().length).toBe(1);
  });

  it('selecting a nested leaf chains itemClick and a single select closeRequest', () => {
    host.menu().focus();
    key(rootEl, 'ArrowDown');
    key(rootEl, 'ArrowRight');
    settle();
    key(lists()[1], 'Enter'); // Email (first child, already active)
    settle();
    expect(host.clicks.length).toBe(1);
    expect(host.clicks[0].item.text).toBe('Email');
    expect(host.closes.map((c) => c.reason)).toEqual(['select']);
  });

  it('Tab in the submenu chains a single tab closeRequest to the owner', () => {
    host.menu().focus();
    key(rootEl, 'ArrowDown');
    key(rootEl, 'ArrowRight');
    settle();
    key(lists()[1], 'Tab');
    settle();
    expect(host.closes.map((c) => c.reason)).toEqual(['tab']);
  });

  it('opens a third level and Escape unwinds innermost-first', () => {
    host.menu().focus();
    key(rootEl, 'ArrowDown');
    key(rootEl, 'ArrowRight'); // open Share
    settle();
    key(lists()[1], 'ArrowDown'); // → Link
    key(lists()[1], 'ArrowRight'); // open Link
    settle();
    expect(lists().length).toBe(3);
    expect(lists()[2].getAttribute('aria-label')).toBe('Link');
    key(lists()[2], 'Escape');
    settle();
    expect(lists().length).toBe(2);
    expect(document.activeElement).toBe(lists()[1]);
    key(lists()[1], 'Escape');
    settle();
    expect(lists().length).toBe(1);
    expect(host.closes.length).toBe(0);
  });

  it('hover opens the submenu after the show delay without moving focus', () => {
    host.menu().focus(); // focus stays on the root container
    const shareRow = rowsOf(rootEl)[1];
    hover(shareRow);
    expect(lists().length).toBe(1); // not yet — dwell time first
    vi.advanceTimersByTime(60); // > menuShowDelayMs (50)
    settle();
    expect(lists().length).toBe(2);
    expect(document.activeElement).toBe(rootEl); // hover never steals focus
  });

  it('hovering a sibling closes the open submenu after the hide delay', () => {
    const shareRow = rowsOf(rootEl)[1];
    hover(shareRow);
    vi.advanceTimersByTime(60);
    settle();
    expect(lists().length).toBe(2);
    hover(rowsOf(rootEl)[2]); // Exit (leaf)
    vi.advanceTimersByTime(200);
    render();
    expect(lists().length).toBe(2); // still open inside the grace period
    vi.advanceTimersByTime(200); // total > menuHideDelayMs (300)
    render();
    expect(lists().length).toBe(1);
  });

  it('re-entering the open row inside the grace period keeps the submenu open', () => {
    const shareRow = rowsOf(rootEl)[1];
    hover(shareRow);
    vi.advanceTimersByTime(60);
    settle();
    hover(rowsOf(rootEl)[2]);
    vi.advanceTimersByTime(100);
    hover(shareRow); // back before the 300ms grace elapses
    vi.advanceTimersByTime(500);
    render();
    expect(lists().length).toBe(2);
  });

  it('a keyboard move off the open parent row closes its submenu', () => {
    host.menu().focus();
    key(rootEl, 'ArrowDown'); // Share
    key(rootEl, 'ArrowRight');
    settle();
    expect(lists().length).toBe(2);
    key(rootEl, 'ArrowDown'); // → Exit; the expanded row changed
    settle();
    expect(lists().length).toBe(1);
    expect(rowsOf(rootEl)[1].getAttribute('aria-expanded')).toBe('false');
  });

  it('clicking an open parent row toggles its submenu closed', () => {
    const shareRow = rowsOf(rootEl)[1];
    shareRow.dispatchEvent(
      new MouseEvent('click', { bubbles: true, detail: 1 }),
    );
    settle();
    expect(lists().length).toBe(2);
    shareRow.dispatchEvent(
      new MouseEvent('click', { bubbles: true, detail: 1 }),
    );
    settle();
    expect(lists().length).toBe(1);
    expect(host.clicks.length).toBe(0);
  });
});
