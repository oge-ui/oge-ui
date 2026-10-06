import { ApplicationRef, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { OgeContextMenuOpeningEvent } from '@oge-ui/behavior';
import type { OgeMenuItem } from '../menu/menu-types';
import { OgeContextMenu } from './context-menu';

@Component({
  imports: [OgeContextMenu],
  template: `
    <ul
      [ogeContextMenu]="items()"
      contextMenuTarget="li"
      contextMenuAriaLabel="Row actions"
      (contextMenuOpening)="onOpening($event)"
      #menu="ogeContextMenu"
    >
      @for (row of rows; track row) {
        <li tabindex="0" [attr.data-id]="row">
          <span class="cell">Row {{ row }}</span>
        </li>
      }
      <p class="gap">not a row</p>
    </ul>
    <button type="button" class="opener" (click)="menu.open(40, 50)">
      Open
    </button>
  `,
})
class Host {
  readonly rows = [1, 2, 3];
  readonly items = signal<OgeMenuItem[]>([]);
  readonly openings: OgeContextMenuOpeningEvent[] = [];
  cancelNext = false;

  onOpening(event: OgeContextMenuOpeningEvent): void {
    this.openings.push(event);
    if (this.cancelNext) {
      event.cancel = true;
      return;
    }
    const id = event.target.getAttribute('data-id') ?? 'host';
    event.items = [{ text: `Open ${id}` }, { text: `Delete ${id}` }];
  }
}

describe('OgeContextMenu delegation and imperative open', () => {
  let fixture: ComponentFixture<Host>;
  const host = () => fixture.componentInstance;
  const menu = (): HTMLElement | null =>
    document.body.querySelector('.oge-menu-list');
  const el = (selector: string) =>
    (fixture.nativeElement as HTMLElement).querySelector(
      selector,
    ) as HTMLElement;

  function settle(): void {
    vi.advanceTimersByTime(200);
    TestBed.inject(ApplicationRef).tick();
    fixture.detectChanges();
  }

  function rightClick(target: Element): MouseEvent {
    const event = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: 30,
      clientY: 40,
      detail: 1,
    });
    target.dispatchEvent(event);
    settle();
    return event;
  }

  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame'],
    });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
  });

  it('opens for the closest match and builds the items per target', () => {
    const event = rightClick(el('li[data-id="2"] .cell'));
    expect(event.defaultPrevented).toBe(true);
    expect(host().openings[0].target.getAttribute('data-id')).toBe('2');
    expect(host().openings[0].event).toBe(event);
    expect(menu()?.textContent).toContain('Open 2');
    expect(menu()?.textContent).toContain('Delete 2');
  });

  it('a request outside every match keeps the browser menu', () => {
    const event = rightClick(el('.gap'));
    expect(event.defaultPrevented).toBe(false);
    expect(host().openings).toHaveLength(0);
    expect(menu()).toBeNull();
  });

  it('a cancelled opening shows nothing but still suppresses the browser menu', () => {
    host().cancelNext = true;
    const event = rightClick(el('li[data-id="1"]'));
    expect(event.defaultPrevented).toBe(true);
    expect(menu()).toBeNull();
  });

  it('Shift+F10 on a focused row targets that row and focus returns to it', () => {
    const row = el('li[data-id="3"]');
    row.focus();
    row.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'F10',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    settle();
    expect(menu()?.textContent).toContain('Open 3');
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    settle();
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(row);
  });

  it('open(x, y) with a selector targets the match under the point — none in jsdom, so it is ignored', () => {
    el('.opener').click();
    settle();
    // no row under the point in jsdom → the host is the target
    expect(host().openings).toHaveLength(0);
    expect(menu()).toBeNull();
  });
});

@Component({
  imports: [OgeContextMenu],
  template: `
    <div
      tabindex="0"
      [ogeContextMenu]="items"
      #menu="ogeContextMenu"
      (contextMenuOpening)="openings.push($event)"
    >
      Target
    </div>
    <button type="button" class="at-point" (click)="menu.open(40, 50)">
      At point
    </button>
    <button type="button" class="at-event" (click)="menu.open($event)">
      At event
    </button>
    <button type="button" class="closer" (click)="menu.close()">Close</button>
  `,
})
class ImperativeHost {
  readonly items: OgeMenuItem[] = [{ text: 'Rename' }];
  readonly openings: OgeContextMenuOpeningEvent[] = [];
}

describe('OgeContextMenu imperative API', () => {
  let fixture: ComponentFixture<ImperativeHost>;
  const menu = (): HTMLElement | null =>
    document.body.querySelector('.oge-menu-list');
  const el = (selector: string) =>
    (fixture.nativeElement as HTMLElement).querySelector(
      selector,
    ) as HTMLElement;

  function settle(): void {
    vi.advanceTimersByTime(200);
    TestBed.inject(ApplicationRef).tick();
    fixture.detectChanges();
  }

  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame'],
    });
    fixture = TestBed.createComponent(ImperativeHost);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
  });

  it('open(x, y) opens at the point with a null event; close() closes', () => {
    el('.at-point').click();
    settle();
    expect(menu()).not.toBeNull();
    const opening = fixture.componentInstance.openings[0];
    expect(opening.event).toBe(null);
    expect(opening.target).toBe(el('[tabindex="0"]'));
    const popup = document.body.querySelector('.oge-popup') as HTMLElement;
    expect(popup.style.left).toBe('40px');
    el('.closer').click();
    settle();
    expect(menu()).toBeNull();
  });

  it('open(event) carries the event', () => {
    el('.at-event').click();
    settle();
    expect(menu()).not.toBeNull();
    expect(fixture.componentInstance.openings[0].event).toBeInstanceOf(
      MouseEvent,
    );
  });
});
