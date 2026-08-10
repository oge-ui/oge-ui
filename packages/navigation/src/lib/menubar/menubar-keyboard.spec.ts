import { ApplicationRef, Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeMenubar } from './menubar';
import type {
  OgeMenubarItemClickEvent,
  OgeMenubarItemData,
  OgeMenubarOpenMode,
} from './menubar-types';

const MENU: readonly OgeMenubarItemData[] = [
  {
    text: 'File',
    key: 'file',
    items: [
      { text: 'New', key: 'new' },
      {
        text: 'Share',
        key: 'share',
        items: [{ text: 'Email', key: 'email' }],
      },
    ],
  },
  { text: 'Edit', key: 'edit', items: [{ text: 'Undo', key: 'undo' }] },
  { text: 'Help', key: 'help' },
];

@Component({
  imports: [OgeMenubar],
  template: `
    <oge-menubar
      [items]="items()"
      [openMode]="openMode()"
      (itemClick)="clicks.push($event)"
    />
  `,
})
class KeyboardHost {
  readonly items = signal<readonly OgeMenubarItemData[]>(MENU);
  readonly openMode = signal<OgeMenubarOpenMode>('click');
  readonly bar = viewChild.required(OgeMenubar);
  readonly clicks: OgeMenubarItemClickEvent[] = [];
}

function key(el: HTMLElement, k: string): void {
  el.dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: k }),
  );
}

describe('OgeMenubar — APG keyboard', () => {
  let fixture: ComponentFixture<KeyboardHost>;
  let host: KeyboardHost;

  const barItems = (): HTMLElement[] =>
    Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
        '.oge-menubar-item',
      ),
    );
  const lists = (): HTMLElement[] =>
    Array.from(document.querySelectorAll<HTMLElement>('.oge-menu-list'));

  function settle(): void {
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
      toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'Date'],
    });
    fixture = TestBed.createComponent(KeyboardHost);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
  });

  it('keeps a single roving tab stop on the bar', () => {
    const items = barItems();
    expect(items.map((el) => el.tabIndex)).toEqual([0, -1, -1]);
    key(items[0], 'ArrowRight');
    fixture.detectChanges();
    expect(items.map((el) => el.tabIndex)).toEqual([-1, 0, -1]);
    expect(document.activeElement).toBe(items[1]);
  });

  it('ArrowLeft wraps backwards; Home/End jump to the edges', () => {
    const items = barItems();
    key(items[0], 'ArrowLeft');
    fixture.detectChanges();
    expect(document.activeElement).toBe(items[2]);
    key(items[2], 'Home');
    fixture.detectChanges();
    expect(document.activeElement).toBe(items[0]);
    key(items[0], 'End');
    fixture.detectChanges();
    expect(document.activeElement).toBe(items[2]);
  });

  it('ArrowDown opens the submenu with the first item active', () => {
    key(barItems()[0], 'ArrowDown');
    settle();
    expect(lists()).toHaveLength(1);
    expect(barItems()[0].getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(lists()[0]);
    expect(lists()[0].getAttribute('aria-activedescendant')).toMatch(
      /-item-0$/,
    );
  });

  it('ArrowUp opens the submenu with the last item active', () => {
    key(barItems()[0], 'ArrowUp');
    settle();
    expect(lists()[0].getAttribute('aria-activedescendant')).toMatch(
      /-item-1$/,
    );
  });

  it('Escape closes the submenu and returns focus to the bar item', () => {
    key(barItems()[0], 'ArrowDown');
    settle();
    key(lists()[0], 'Escape');
    settle();
    expect(lists()).toHaveLength(0);
    expect(document.activeElement).toBe(barItems()[0]);
    expect(barItems()[0].getAttribute('aria-expanded')).toBe('false');
  });

  it('ArrowRight on a submenu leaf hops to the next bar item, menu open', () => {
    key(barItems()[0], 'ArrowDown'); // File menu, New active
    settle();
    key(lists()[0], 'ArrowRight'); // leaf → Edit opens focused
    settle();
    expect(barItems()[1].getAttribute('aria-expanded')).toBe('true');
    expect(barItems()[0].getAttribute('aria-expanded')).toBe('false');
    expect(lists()[0].getAttribute('aria-label')).toBe('Edit');
    expect(document.activeElement).toBe(lists()[0]);
  });

  it('ArrowLeft in a level-1 submenu hops to the previous bar item', () => {
    key(barItems()[1], 'ArrowDown'); // Edit menu
    settle();
    key(lists()[0], 'ArrowLeft');
    settle();
    expect(lists()[0].getAttribute('aria-label')).toBe('File');
    expect(barItems()[0].getAttribute('aria-expanded')).toBe('true');
  });

  it('ArrowRight on a nested parent opens the nested submenu instead of hopping', () => {
    key(barItems()[0], 'ArrowDown');
    settle();
    key(lists()[0], 'ArrowDown'); // → Share
    key(lists()[0], 'ArrowRight'); // opens nested Email menu
    settle();
    expect(lists()).toHaveLength(2);
    expect(lists()[1].getAttribute('aria-label')).toBe('Share');
    expect(document.activeElement).toBe(lists()[1]);
    // ArrowLeft returns to the parent list, not the bar.
    key(lists()[1], 'ArrowLeft');
    settle();
    expect(lists()).toHaveLength(1);
    expect(document.activeElement).toBe(lists()[0]);
    expect(barItems()[0].getAttribute('aria-expanded')).toBe('true');
  });

  it('ArrowRight on a nested leaf hops all the way to the next bar item', () => {
    key(barItems()[0], 'ArrowDown');
    settle();
    key(lists()[0], 'ArrowDown');
    key(lists()[0], 'ArrowRight'); // nested open, Email active
    settle();
    key(lists()[1], 'ArrowRight'); // nested leaf → Edit
    settle();
    expect(lists()).toHaveLength(1);
    expect(lists()[0].getAttribute('aria-label')).toBe('Edit');
    expect(barItems()[1].getAttribute('aria-expanded')).toBe('true');
  });

  it('Enter on a submenu leaf selects it and refocuses the bar item', () => {
    key(barItems()[0], 'ArrowDown');
    settle();
    key(lists()[0], 'Enter'); // New
    settle();
    expect(host.clicks).toHaveLength(1);
    expect(host.clicks[0].key).toBe('new');
    expect(lists()).toHaveLength(0);
    expect(document.activeElement).toBe(barItems()[0]);
  });

  it('type-ahead moves the bar focus by prefix', () => {
    const items = barItems();
    key(items[0], 'e');
    fixture.detectChanges();
    expect(document.activeElement).toBe(items[1]);
    // Within the idle window keystrokes accumulate ("e","h" → "eh" — no
    // match); a fresh press after it starts a new prefix search.
    vi.setSystemTime(Date.now() + 600);
    key(items[1], 'h');
    fixture.detectChanges();
    expect(document.activeElement).toBe(items[2]);
  });

  it('hover only opens a closed menu in hover mode, after the delay', () => {
    barItems()[0].dispatchEvent(new MouseEvent('pointerenter'));
    vi.advanceTimersByTime(500);
    settle();
    expect(lists()).toHaveLength(0); // click mode: hover never opens

    host.openMode.set('hover');
    fixture.detectChanges();
    barItems()[0].dispatchEvent(new MouseEvent('pointerenter'));
    settle();
    expect(lists()).toHaveLength(1);
  });

  it('with a menu open, hovering a sibling switches without a click', () => {
    key(barItems()[0], 'ArrowDown');
    settle();
    barItems()[1].dispatchEvent(new MouseEvent('pointerenter'));
    settle();
    expect(lists()[0].getAttribute('aria-label')).toBe('Edit');
    // Hovering a childless sibling closes the open menu.
    barItems()[2].dispatchEvent(new MouseEvent('pointerenter'));
    settle();
    expect(lists()).toHaveLength(0);
  });
});
