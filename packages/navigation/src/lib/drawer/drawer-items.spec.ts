import {
  ChangeDetectionStrategy,
  Component,
  signal,
  viewChild,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeDrawer } from './drawer';
import { OgeDrawerItemTemplate } from './drawer-item-template';
import type {
  OgeDrawerClosingEvent,
  OgeDrawerItem,
  OgeDrawerItemClickEvent,
  OgeDrawerMode,
  OgeDrawerPosition,
  OgeDrawerSelectionChangedEvent,
} from './drawer-types';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

const ITEMS: OgeDrawerItem[] = [
  { key: 'inbox', text: 'Inbox', icon: 'M4 4h16v16H4z', badge: 3 },
  { key: 'sent', text: 'Sent', icon: 'M4 12h16' },
  { separator: true },
  { key: 'trash', text: 'Trash', disabled: true },
  { key: 'help', text: 'Help', url: '#help' },
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OgeDrawer, OgeDrawerItemTemplate],
  template: `
    <oge-drawer
      [(opened)]="opened"
      [mode]="mode()"
      [position]="position()"
      [minSize]="minSize()"
      [items]="items"
      [(selectedKey)]="selected"
      [swipeEnabled]="swipe()"
      [inertBackground]="false"
      (itemClick)="clicks.push($event)"
      (selectionChanged)="changes.push($event)"
      (closing)="closings.push($event)"
    >
      @if (custom()) {
        <ng-template ogeDrawerItemTemplate let-item let-rail="rail">
          <em class="custom">{{ item.text }}{{ rail ? '·' : '' }}</em>
        </ng-template>
      }
      <main>content</main>
    </oge-drawer>
  `,
})
class Host {
  readonly drawer = viewChild.required(OgeDrawer);
  readonly items = ITEMS;
  readonly opened = signal(true);
  readonly mode = signal<OgeDrawerMode>('side');
  readonly position = signal<OgeDrawerPosition>('start');
  readonly minSize = signal<number | undefined>(undefined);
  readonly selected = signal<string | undefined>('inbox');
  readonly swipe = signal(false);
  readonly custom = signal(false);
  readonly clicks: OgeDrawerItemClickEvent[] = [];
  readonly changes: OgeDrawerSelectionChangedEvent[] = [];
  readonly closings: OgeDrawerClosingEvent[] = [];
}

async function render(setup?: (host: Host) => void) {
  const fixture = TestBed.createComponent(Host);
  setup?.(fixture.componentInstance);
  document.body.appendChild(fixture.nativeElement);
  await settle(fixture);
  const el: HTMLElement = fixture.nativeElement;
  const entries = () =>
    Array.from(el.querySelectorAll<HTMLElement>('.oge-drawer-item'));
  return { fixture, host: fixture.componentInstance, el, entries };
}

function touch(
  target: Element,
  type: string,
  x: number,
  y: number,
  pointerType = 'touch',
): void {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
  });
  Object.defineProperty(event, 'pointerId', { value: 7 });
  Object.defineProperty(event, 'pointerType', { value: pointerType });
  target.dispatchEvent(event);
}

function stubHostRect(el: HTMLElement): void {
  const host = el.querySelector<HTMLElement>('oge-drawer') as HTMLElement;
  host.getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      right: 400,
      bottom: 300,
      width: 400,
      height: 300,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('OgeDrawer items', () => {
  it('renders links and buttons with the active entry as aria-current', async () => {
    const { el, entries } = await render();
    expect(entries().map((e) => e.tagName)).toEqual([
      'BUTTON',
      'BUTTON',
      'BUTTON',
      'A',
    ]);
    expect(entries()[0].getAttribute('aria-current')).toBe('page');
    expect(entries()[1].hasAttribute('aria-current')).toBe(false);
    expect((entries()[2] as HTMLButtonElement).disabled).toBe(true);
    expect(entries()[3].getAttribute('href')).toBe('#help');
    expect(el.querySelector('.oge-drawer-item-badge')?.textContent).toBe('3');
    expect(
      el.querySelector('.oge-drawer-separator')?.getAttribute('aria-hidden'),
    ).toBe('true');
    // the list renders inside the panel, before the projected content
    expect(
      el.querySelector('.oge-drawer-panel .oge-drawer-items'),
    ).not.toBeNull();
  });

  it('selects on click and reports itemClick then selectionChanged', async () => {
    const { fixture, host, entries } = await render();
    entries()[1].click();
    await settle(fixture);
    expect(host.clicks[0]).toMatchObject({ key: 'sent', index: 1 });
    expect(host.changes[0]).toMatchObject({
      key: 'sent',
      previousKey: 'inbox',
    });
    expect(host.selected()).toBe('sent');
    expect(entries()[1].getAttribute('aria-current')).toBe('page');
  });

  it('moves focus with the arrows, skipping separators and disabled entries', async () => {
    const { entries } = await render();
    entries()[1].focus();
    entries()[1].dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    );
    expect(document.activeElement).toBe(entries()[3]);
    entries()[3].dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Home', bubbles: true }),
    );
    expect(document.activeElement).toBe(entries()[0]);
  });

  it('collapses to an icon-only rail with the label kept as the name', async () => {
    const { fixture, host, el } = await render((h) => {
      h.minSize.set(56);
      h.opened.set(false);
    });
    const drawer = el.querySelector('oge-drawer') as HTMLElement;
    expect(drawer.classList.contains('oge-drawer-rail')).toBe(true);
    expect(el.querySelector('.oge-drawer-item-text')?.textContent).toBe(
      'Inbox',
    );
    host.opened.set(true);
    await settle(fixture);
    expect(drawer.classList.contains('oge-drawer-rail')).toBe(false);
  });

  it('renders the item template inside the built-in entry', async () => {
    const { entries } = await render((h) => h.custom.set(true));
    expect(entries()[0].querySelector('.custom')?.textContent).toBe('Inbox');
    expect(entries()[0].tagName).toBe('BUTTON');
  });
});

describe('OgeDrawer swipe', () => {
  it('opens on a touch edge swipe', async () => {
    const { fixture, host, el } = await render((h) => {
      h.swipe.set(true);
      h.opened.set(false);
      h.mode.set('overlay');
    });
    stubHostRect(el);
    const drawer = el.querySelector('oge-drawer') as HTMLElement;
    touch(drawer, 'pointerdown', 4, 100);
    touch(drawer, 'pointermove', 60, 102);
    touch(drawer, 'pointermove', 140, 104);
    touch(drawer, 'pointerup', 140, 104);
    await settle(fixture);
    expect(host.opened()).toBe(true);
    expect(el.querySelector('.oge-drawer-swipe-zone')).toBeNull();
  });

  it('closes on a swipe toward the edge through the closing pipeline', async () => {
    const { fixture, host, el } = await render((h) => {
      h.swipe.set(true);
      h.mode.set('overlay');
    });
    stubHostRect(el);
    const drawer = el.querySelector('oge-drawer') as HTMLElement;
    touch(drawer, 'pointerdown', 200, 100);
    touch(drawer, 'pointermove', 150, 100);
    touch(drawer, 'pointermove', 60, 100);
    touch(drawer, 'pointerup', 60, 100);
    await settle(fixture);
    expect(host.closings[0]).toMatchObject({ reason: 'swipe' });
    expect(host.opened()).toBe(false);
  });

  it('ignores mouse swipes and stays off by default', async () => {
    const { fixture, host, el } = await render((h) => {
      h.opened.set(false);
      h.mode.set('overlay');
    });
    stubHostRect(el);
    const drawer = el.querySelector('oge-drawer') as HTMLElement;
    touch(drawer, 'pointerdown', 4, 100);
    touch(drawer, 'pointermove', 140, 100);
    touch(drawer, 'pointerup', 140, 100);
    await settle(fixture);
    expect(host.opened()).toBe(false);

    host.swipe.set(true);
    await settle(fixture);
    touch(drawer, 'pointerdown', 4, 100, 'mouse');
    touch(drawer, 'pointermove', 140, 100, 'mouse');
    touch(drawer, 'pointerup', 140, 100, 'mouse');
    await settle(fixture);
    expect(host.opened()).toBe(false);
  });

  it('swipes from the right edge in RTL', async () => {
    const { fixture, host, el } = await render((h) => {
      h.swipe.set(true);
      h.opened.set(false);
      h.mode.set('overlay');
    });
    stubHostRect(el);
    const drawer = el.querySelector('oge-drawer') as HTMLElement;
    drawer.setAttribute('dir', 'rtl');
    drawer.style.direction = 'rtl';
    touch(drawer, 'pointerdown', 396, 100);
    touch(drawer, 'pointermove', 330, 100);
    touch(drawer, 'pointermove', 250, 100);
    touch(drawer, 'pointerup', 250, 100);
    await settle(fixture);
    expect(host.opened()).toBe(true);
  });
});
