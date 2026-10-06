import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type {
  OgeFabPosition,
  OgeSpeedDialItem,
  OgeSpeedDialItemClickEvent,
  OgeSpeedDialLabelMode,
  OgeSpeedDialOpenMode,
} from '@oge-ui/behavior';
import { provideOgeFabConfig } from './config';
import { OgeSpeedDial } from './speed-dial';

const ITEMS: OgeSpeedDialItem[] = [
  { key: 'doc', label: 'Document', icon: 'M4 4h16v16H4z' },
  { key: 'sheet', label: 'Spreadsheet', disabled: true },
  { key: 'slides', label: 'Slides' },
];

@Component({
  imports: [OgeSpeedDial],
  template: `
    <button id="before">Before</button>
    <oge-speed-dial
      [items]="items()"
      [label]="label()"
      [position]="position()"
      [openMode]="openMode()"
      [labelMode]="labelMode()"
      [(opened)]="opened"
      (itemClick)="clicks.push($event)"
    />
    <button id="after">After</button>
  `,
})
class DialHost {
  readonly items = signal<OgeSpeedDialItem[]>(ITEMS);
  readonly label = signal<string | undefined>('Create');
  readonly position = signal<OgeFabPosition | undefined>(undefined);
  readonly openMode = signal<OgeSpeedDialOpenMode>('click');
  readonly labelMode = signal<OgeSpeedDialLabelMode>('hover');
  readonly opened = signal(false);
  readonly dial = viewChild.required(OgeSpeedDial);
  readonly clicks: OgeSpeedDialItemClickEvent[] = [];
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

function key(target: Element, k: string, shiftKey = false): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key: k,
    bubbles: true,
    cancelable: true,
    shiftKey,
  });
  target.dispatchEvent(event);
  return event;
}

describe('OgeSpeedDial', () => {
  let fixture: ComponentFixture<DialHost>;
  let host: DialHost;
  let el: HTMLElement;
  const toggle = () =>
    el.querySelector('.oge-speed-dial-toggle') as HTMLButtonElement;
  const menu = () => el.querySelector('[role="menu"]') as HTMLElement | null;
  const actions = () =>
    Array.from(el.querySelectorAll<HTMLElement>('[role="menuitem"]'));

  beforeEach(async () => {
    fixture = TestBed.createComponent(DialHost);
    host = fixture.componentInstance;
    document.body.appendChild(fixture.nativeElement);
    await settle(fixture);
    el = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    fixture.destroy();
    (fixture.nativeElement as HTMLElement).remove();
  });

  it('renders an APG menu button, closed', () => {
    expect(toggle().getAttribute('aria-haspopup')).toBe('menu');
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
    expect(toggle().hasAttribute('aria-controls')).toBe(false);
    expect(toggle().getAttribute('aria-label')).toBe('Create');
    expect(menu()).toBeNull();
  });

  it('falls back to the catalog name', async () => {
    host.label.set(undefined);
    await settle(fixture);
    expect(toggle().getAttribute('aria-label')).toBe('Actions');
  });

  it('click opens, wires aria-controls and focuses the first action', async () => {
    toggle().click();
    await settle(fixture);
    expect(host.opened()).toBe(true);
    expect(toggle().getAttribute('aria-expanded')).toBe('true');
    expect(toggle().getAttribute('aria-controls')).toBe(menu()?.id);
    expect(menu()?.getAttribute('aria-orientation')).toBe('vertical');
    expect(actions().map((a) => a.textContent?.trim())).toEqual([
      'Document',
      'Spreadsheet',
      'Slides',
    ]);
    expect(actions().every((a) => a.getAttribute('tabindex') === '-1')).toBe(
      true,
    );
    expect(document.activeElement).toBe(actions()[0]);
    toggle().click();
    await settle(fixture);
    expect(host.opened()).toBe(false);
  });

  it('arrow keys on the FAB open on the first / last enabled action', async () => {
    key(toggle(), 'ArrowUp'); // bottom dial unfolds up
    await settle(fixture);
    expect(document.activeElement).toBe(actions()[0]);
    key(actions()[0], 'Escape');
    await settle(fixture);
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(toggle());
    key(toggle(), 'ArrowDown');
    await settle(fixture);
    expect(document.activeElement).toBe(actions()[2]);
  });

  it('moves along the axis, skips disabled actions and wraps', async () => {
    toggle().click();
    await settle(fixture);
    key(actions()[0], 'ArrowUp');
    expect(document.activeElement).toBe(actions()[2]);
    key(actions()[2], 'ArrowUp');
    expect(document.activeElement).toBe(actions()[0]);
    key(actions()[0], 'ArrowDown');
    expect(document.activeElement).toBe(actions()[2]);
    key(actions()[2], 'Home');
    expect(document.activeElement).toBe(actions()[0]);
    key(actions()[0], 'End');
    expect(document.activeElement).toBe(actions()[2]);
    expect(actions()[1].getAttribute('aria-disabled')).toBe('true');
  });

  it('activating an action emits itemClick, closes and returns focus', async () => {
    toggle().click();
    await settle(fixture);
    actions()[1].click(); // disabled — ignored
    expect(host.clicks.length).toBe(0);
    actions()[2].click();
    await settle(fixture);
    expect(host.clicks.map((c) => [c.item.key, c.index])).toEqual([
      ['slides', 2],
    ]);
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(toggle());
  });

  it('Tab closes without trapping focus; Escape on the FAB closes', async () => {
    toggle().click();
    await settle(fixture);
    const tab = key(actions()[0], 'Tab');
    expect(tab.defaultPrevented).toBe(false);
    await settle(fixture);
    expect(menu()).toBeNull();
    host.dial().open();
    await settle(fixture);
    expect(menu()).not.toBeNull();
    key(toggle(), 'Escape');
    await settle(fixture);
    expect(host.opened()).toBe(false);
  });

  it('a press outside closes it', async () => {
    host.dial().toggle();
    await settle(fixture);
    expect(menu()).not.toBeNull();
    (el.querySelector('#after') as HTMLElement).dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true }),
    );
    await settle(fixture);
    expect(host.opened()).toBe(false);
  });

  it('a top dial unfolds down and labels below / above by edge', async () => {
    const dialHost = () => el.querySelector('oge-speed-dial') as HTMLElement;
    expect(dialHost().classList).toContain('oge-speed-dial-up');
    expect(dialHost().classList).toContain('oge-speed-dial-labels-before');
    host.position.set('top-start');
    await settle(fixture);
    expect(dialHost().classList).toContain('oge-speed-dial-down');
    expect(dialHost().classList).toContain('oge-speed-dial-labels-after');
    key(toggle(), 'ArrowDown');
    await settle(fixture);
    expect(document.activeElement).toBe(actions()[0]);
  });

  it('hover mode opens on mouse hover without moving focus', async () => {
    host.openMode.set('hover');
    await settle(fixture);
    const dial = el.querySelector('oge-speed-dial') as HTMLElement;
    const enter = new MouseEvent('pointerenter');
    Object.defineProperty(enter, 'pointerType', { value: 'mouse' });
    dial.dispatchEvent(enter);
    await settle(fixture);
    expect(host.opened()).toBe(true);
    expect(document.activeElement).not.toBe(actions()[0]);
    const leave = new MouseEvent('pointerleave');
    Object.defineProperty(leave, 'pointerType', { value: 'mouse' });
    dial.dispatchEvent(leave);
    await settle(fixture);
    expect(host.opened()).toBe(false);
  });

  it('labels are the accessible names in every label mode', async () => {
    host.labelMode.set('none');
    toggle().click();
    await settle(fixture);
    const dial = el.querySelector('oge-speed-dial') as HTMLElement;
    expect(dial.classList).toContain('oge-speed-dial-labels-none');
    expect(
      actions()[0].querySelector('.oge-speed-dial-label')?.textContent,
    ).toBe('Document');
    expect(actions()[0].style.getPropertyValue('--oge-speed-dial-index')).toBe(
      '0',
    );
  });
});

@Component({
  imports: [OgeSpeedDial],
  template: `<oge-speed-dial [items]="[]" />`,
  providers: [provideOgeFabConfig({ messages: { speedDial: 'Eylemler' } })],
})
class LocalizedHost {}

describe('OgeSpeedDial config', () => {
  it('names the FAB from the localized catalog', async () => {
    const fixture = TestBed.createComponent(LocalizedHost);
    await settle(fixture);
    expect(
      (fixture.nativeElement as HTMLElement)
        .querySelector('.oge-speed-dial-toggle')
        ?.getAttribute('aria-label'),
    ).toBe('Eylemler');
  });
});
