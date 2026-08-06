import { ApplicationRef, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type {
  OgeMenuItem,
  OgeMenuListItemClickEvent,
} from '../menu/menu-types';
import { OgeContextMenu } from './context-menu';

@Component({
  imports: [OgeContextMenu],
  template: `
    <div
      tabindex="0"
      [ogeContextMenu]="items()"
      contextMenuAriaLabel="Row actions"
      (contextMenuItemClick)="clicks.push($event)"
      (contextMenuOpened)="openedCount = openedCount + 1"
      (contextMenuClosed)="closedCount = closedCount + 1"
    >
      Target
    </div>
  `,
})
class ContextMenuHost {
  readonly items = signal<OgeMenuItem[]>([
    { text: 'Duplicate', value: 'dup' },
    { separator: true, text: '' },
    { text: 'Delete', severity: 'danger' },
  ]);
  readonly clicks: OgeMenuListItemClickEvent[] = [];
  openedCount = 0;
  closedCount = 0;
}

describe('OgeContextMenu', () => {
  let fixture: ComponentFixture<ContextMenuHost>;
  let target: HTMLElement;

  const menu = (): HTMLElement | null =>
    document.body.querySelector('.oge-menu-list');

  function rightClick(x = 120, y = 60): void {
    target.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        detail: 1,
      }),
    );
    settle();
  }

  function settle(): void {
    vi.advanceTimersByTime(200); // flush position frames
    TestBed.inject(ApplicationRef).tick(); // render the detached panel
    fixture.detectChanges();
  }

  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame'],
    });
    fixture = TestBed.createComponent(ContextMenuHost);
    fixture.detectChanges();
    target = (fixture.nativeElement as HTMLElement).querySelector(
      'div',
    ) as HTMLElement;
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
  });

  it('opens at the pointer, suppresses the native menu and emits opened', () => {
    const event = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: 120,
      clientY: 60,
      detail: 1,
    });
    target.dispatchEvent(event);
    settle();
    expect(event.defaultPrevented).toBe(true);
    expect(menu()).not.toBeNull();
    expect(menu()?.getAttribute('aria-label')).toBe('Row actions');
    expect(fixture.componentInstance.openedCount).toBe(1);
  });

  it('activating an item emits contextMenuItemClick and closes', () => {
    rightClick();
    const item = document.body.querySelector(
      '.oge-menu-item',
    ) as HTMLButtonElement;
    item.click();
    settle();
    expect(fixture.componentInstance.clicks).toHaveLength(1);
    expect(fixture.componentInstance.clicks[0].item.text).toBe('Duplicate');
    expect(menu()).toBeNull();
    expect(fixture.componentInstance.closedCount).toBe(1);
  });

  it('Escape closes the menu', () => {
    rightClick();
    expect(menu()).not.toBeNull();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    settle();
    expect(menu()).toBeNull();
  });

  it('Shift+F10 opens anchored to the element', () => {
    target.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'F10',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    settle();
    expect(menu()).not.toBeNull();
  });

  it('does nothing with an empty item list — the native menu stays available', () => {
    fixture.componentInstance.items.set([]);
    fixture.detectChanges();
    const event = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      detail: 1,
    });
    target.dispatchEvent(event);
    settle();
    expect(event.defaultPrevented).toBe(false);
    expect(menu()).toBeNull();
  });

  it('removes the detached panel from the DOM when the host is destroyed', () => {
    rightClick();
    expect(
      document.body.querySelector('oge-context-menu-panel'),
    ).not.toBeNull();
    fixture.destroy();
    expect(document.body.querySelector('oge-context-menu-panel')).toBeNull();
  });
});
