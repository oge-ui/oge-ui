import { ApplicationRef, Component, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { isTopOverlay } from '@oge-ui/overlay';
import { OgeMenubar } from './menubar';
import type { OgeMenubarItemData } from './menubar-types';

const MENU: readonly OgeMenubarItemData[] = [
  {
    text: 'File',
    key: 'file',
    items: [
      { text: 'New', key: 'new' },
      { text: 'Share', key: 'share', items: [{ text: 'Email', key: 'email' }] },
    ],
  },
];

@Component({
  imports: [OgeMenubar],
  template: `<oge-menubar [items]="items" />`,
})
class StackHost {
  readonly items = MENU;
  readonly bar = viewChild.required(OgeMenubar);
}

/**
 * The menubar's panels must join the shared overlay stack — a second stack
 * would make Escape inside a nested submenu close the wrong surface (the
 * drawer precedent, see `drawer-overlay-stack.spec.ts`).
 */
describe('OgeMenubar — overlay stack', () => {
  let fixture: ComponentFixture<StackHost>;

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

  function key(el: HTMLElement, k: string): void {
    el.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: k }),
    );
  }

  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame'],
    });
    fixture = TestBed.createComponent(StackHost);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
  });

  it('a nested submenu stacks above the root panel', () => {
    const bar = fixture.componentInstance.bar();
    bar.open('file');
    settle();
    expect(isTopOverlay(bar.panel)).toBe(true);

    key(lists()[0], 'ArrowDown'); // API open leaves no active item → New
    key(lists()[0], 'ArrowDown'); // → Share
    key(lists()[0], 'ArrowRight'); // open nested
    settle();
    expect(lists()).toHaveLength(2);
    // The nested level's own panel is now on top — a document Escape must not
    // reach the menubar's root panel.
    expect(isTopOverlay(bar.panel)).toBe(false);

    key(lists()[1], 'Escape'); // unwinds the nested level only
    settle();
    expect(lists()).toHaveLength(1);
    expect(isTopOverlay(bar.panel)).toBe(true);
  });

  it('an outside pointerdown closes the whole chain at once', () => {
    const bar = fixture.componentInstance.bar();
    bar.open('file');
    settle();
    key(lists()[0], 'ArrowDown');
    key(lists()[0], 'ArrowDown');
    key(lists()[0], 'ArrowRight');
    settle();
    expect(lists()).toHaveLength(2);

    document.body.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true }),
    );
    settle();
    expect(lists()).toHaveLength(0);
    expect(bar.panel.isOpen()).toBe(false);
  });
});
