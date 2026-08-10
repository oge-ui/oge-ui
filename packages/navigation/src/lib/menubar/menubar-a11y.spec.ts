import { ApplicationRef, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeMenubar } from './menubar';
import type {
  OgeMenubarItemData,
  OgeMenubarOrientation,
} from './menubar-types';

const MENU: readonly OgeMenubarItemData[] = [
  { text: 'File', key: 'file', items: [{ text: 'New', key: 'new' }] },
  { separator: true, text: '' },
  { text: 'Docs', key: 'docs', url: '/docs' },
  { text: 'Off', key: 'off', disabled: true },
];

@Component({
  imports: [OgeMenubar],
  template: `
    <oge-menubar
      [items]="items()"
      [orientation]="orientation()"
      [activeKey]="activeKey()"
    />
  `,
})
class A11yHost {
  readonly items = signal<readonly OgeMenubarItemData[]>(MENU);
  readonly orientation = signal<OgeMenubarOrientation>('horizontal');
  readonly activeKey = signal<string | undefined>(undefined);
}

describe('OgeMenubar — accessibility contract', () => {
  let fixture: ComponentFixture<A11yHost>;
  let host: A11yHost;
  let el: HTMLElement;

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
      toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame'],
    });
    fixture = TestBed.createComponent(A11yHost);
    host = fixture.componentInstance;
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
  });

  it('renders the APG role and attribute contract', () => {
    const bar = el.querySelector('[role="menubar"]') as HTMLElement;
    expect(bar).not.toBeNull();
    expect(bar.getAttribute('aria-label')).toBe('Menu bar');
    expect(bar.getAttribute('aria-orientation')).toBeNull(); // horizontal is the default

    const items = Array.from(bar.querySelectorAll('[role="menuitem"]'));
    expect(items).toHaveLength(3);
    // Parent item announces its popup, collapsed.
    expect(items[0].getAttribute('aria-haspopup')).toBe('menu');
    expect(items[0].getAttribute('aria-expanded')).toBe('false');
    // Leaf link is a real anchor.
    expect(items[1].tagName).toBe('A');
    expect(items[1].getAttribute('href')).toBe('/docs');
    expect(items[1].getAttribute('aria-haspopup')).toBeNull();
    // Disabled item is exposed but inert.
    expect(items[2].getAttribute('aria-disabled')).toBe('true');

    const separator = bar.querySelector('[role="separator"]');
    expect(separator?.getAttribute('aria-orientation')).toBe('vertical');
  });

  it('wires aria-controls to the open panel', () => {
    const parent = el.querySelector('[role="menuitem"]') as HTMLElement;
    expect(parent.getAttribute('aria-controls')).toBeNull();
    parent.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    settle();
    const menu = document.querySelector('.oge-menu-list') as HTMLElement;
    expect(parent.getAttribute('aria-expanded')).toBe('true');
    expect(parent.getAttribute('aria-controls')).toBe(
      menu.closest('.oge-popup')?.id,
    );
    expect(menu.getAttribute('aria-label')).toBe('File');
  });

  it('activeKey marks the current item with aria-current="page"', () => {
    host.activeKey.set('docs');
    fixture.detectChanges();
    const link = el.querySelector('a.oge-menubar-item') as HTMLElement;
    expect(link.getAttribute('aria-current')).toBe('page');
    expect(link.classList.contains('oge-menubar-item-active')).toBe(true);

    host.activeKey.set(undefined);
    fixture.detectChanges();
    expect(link.getAttribute('aria-current')).toBeNull();
  });

  it('a vertical bar sets aria-orientation and swaps the arrow axes', () => {
    host.orientation.set('vertical');
    fixture.detectChanges();
    const bar = el.querySelector('[role="menubar"]') as HTMLElement;
    expect(bar.getAttribute('aria-orientation')).toBe('vertical');
    expect(
      bar.querySelector('[role="separator"]')?.getAttribute('aria-orientation'),
    ).toBe('horizontal');

    const items = Array.from(
      bar.querySelectorAll<HTMLElement>('[role="menuitem"]'),
    );
    items[0].dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: 'ArrowDown',
      }),
    );
    fixture.detectChanges();
    // Vertical: ArrowDown traverses instead of opening.
    expect(document.activeElement).toBe(items[1]);
    expect(document.querySelector('.oge-menu-list')).toBeNull();

    items[0].dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: 'ArrowRight',
      }),
    );
    settle();
    // Vertical: ArrowRight opens the submenu.
    expect(document.querySelector('.oge-menu-list')).not.toBeNull();
  });
});
