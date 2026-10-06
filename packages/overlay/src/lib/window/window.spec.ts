import { Component, signal, viewChild } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type {
  OgeWindowClosingEvent,
  OgeWindowMovedEvent,
  OgeWindowResizedEvent,
  OgeWindowState,
  OgeWindowStateChangingEvent,
} from '@oge-ui/behavior';
import { OgeWindow } from './window';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

function pointer(
  type: string,
  x: number,
  y: number,
  target: EventTarget = document,
): MouseEvent {
  const event = new MouseEvent(type, {
    clientX: x,
    clientY: y,
    bubbles: true,
    cancelable: true,
    button: 0,
  });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  Object.defineProperty(event, 'pointerType', { value: 'mouse' });
  target.dispatchEvent(event);
  return event;
}

function key(target: Element, init: KeyboardEventInit): void {
  target.dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }),
  );
}

@Component({
  imports: [OgeWindow],
  template: `
    <button id="opener" type="button">open</button>
    <oge-window
      #a
      title="Alpha"
      [(opened)]="openA"
      [(state)]="stateA"
      [position]="position()"
      [width]="240"
      (moved)="moves.push($event)"
      (resized)="resizes.push($event)"
      (closing)="onClosing($event)"
      (stateChanging)="onStateChanging($event)"
    >
      <input id="alpha-input" />
    </oge-window>
    <oge-window #b title="Beta" [(opened)]="openB" placement="bottom-end">
      <p>beta</p>
    </oge-window>
  `,
})
class Host {
  readonly openA = signal(false);
  readonly openB = signal(false);
  readonly stateA = signal<OgeWindowState>('normal');
  readonly position = signal<{ x: number; y: number } | null>({
    x: 100,
    y: 80,
  });
  readonly a = viewChild.required<OgeWindow>('a');
  readonly b = viewChild.required<OgeWindow>('b');
  readonly moves: OgeWindowMovedEvent[] = [];
  readonly resizes: OgeWindowResizedEvent[] = [];
  vetoClose = false;
  vetoState = false;

  onClosing(event: OgeWindowClosingEvent): void {
    if (this.vetoClose) event.cancel = true;
  }

  onStateChanging(event: OgeWindowStateChangingEvent): void {
    if (this.vetoState) event.cancel = true;
  }
}

describe('OgeWindow', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;

  beforeEach(async () => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      setTimeout(() => cb(0), 0);
      return 1;
    });
    Object.defineProperty(document.documentElement, 'clientWidth', {
      value: 1000,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, 'clientHeight', {
      value: 800,
      configurable: true,
    });
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    document.body.append(fixture.nativeElement);
    await settle(fixture);
  });

  afterEach(() => {
    fixture.destroy();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  const panels = () =>
    Array.from(document.querySelectorAll<HTMLElement>('.oge-window'));
  const $ = (selector: string) => document.querySelector<HTMLElement>(selector);

  it('is a non-modal dialog: no backdrop, no aria-modal, labelled by its title', async () => {
    host.openA.set(true);
    await settle(fixture);
    const panel = panels()[0];
    expect(panel.getAttribute('role')).toBe('dialog');
    expect(panel.hasAttribute('aria-modal')).toBe(false);
    expect(panel.getAttribute('tabindex')).toBe('0');
    expect(
      document.getElementById(panel.getAttribute('aria-labelledby')!)
        ?.textContent,
    ).toBe('Alpha');
    expect(panel.getAttribute('aria-keyshortcuts')).toContain('Alt+ArrowUp');
    expect($('.oge-modal-layer')).toBeNull();
    expect(document.body.style.overflow).toBe('');
    expect(panel.classList).toContain('oge-window-placed');
    expect(panel.style.left).toBe('100px');
    expect(panel.style.top).toBe('80px');
    expect(panel.style.width).toBe('240px');
    // initial focus moves into the window
    expect(document.activeElement?.id).toBe('alpha-input');
    // eight resize handles
    expect(panel.querySelectorAll('.oge-window-resize')).toHaveLength(8);
  });

  it('stacks several windows and brings one to front on press / focus', async () => {
    host.openA.set(true);
    host.openB.set(true);
    await settle(fixture);
    const [a, b] = panels();
    expect(a.style.zIndex).toBe('calc(var(--oge-z-window) + 0)');
    expect(b.style.zIndex).toBe('calc(var(--oge-z-window) + 1)');
    expect(b.classList).toContain('oge-window-active');
    expect(a.classList).not.toContain('oge-window-active');
    pointer('pointerdown', 10, 10, a.querySelector('.oge-window-body')!);
    await settle(fixture);
    expect(a.style.zIndex).toBe('calc(var(--oge-z-window) + 1)');
    expect(a.classList).toContain('oge-window-active');
    b.querySelector<HTMLElement>('.oge-window-close')!.focus();
    await settle(fixture);
    expect(b.classList).toContain('oge-window-active');
  });

  it('drags by the title bar and reports moved', async () => {
    host.openA.set(true);
    await settle(fixture);
    const header = $('.oge-window-header')!;
    pointer('pointerdown', 150, 90, header);
    pointer('pointermove', 200, 130);
    pointer('pointerup', 200, 130);
    await settle(fixture);
    expect(panels()[0].style.left).toBe('150px');
    expect(panels()[0].style.top).toBe('120px');
    expect(host.moves.at(-1)).toMatchObject({
      x: 150,
      y: 120,
      source: 'pointer',
    });
  });

  it('keyboard twin: arrows move, Ctrl+arrows resize, Alt+arrows change state', async () => {
    host.openA.set(true);
    await settle(fixture);
    const panel = panels()[0];
    panel.focus();
    key(panel, { key: 'ArrowRight' });
    await settle(fixture);
    expect(panel.style.left).toBe('110px');
    expect(host.moves.at(-1)).toMatchObject({ source: 'keyboard' });
    key(panel, { key: 'ArrowRight', ctrlKey: true });
    await settle(fixture);
    expect(host.resizes.at(-1)).toMatchObject({ source: 'keyboard' });
    key(panel, { key: 'ArrowUp', altKey: true });
    await settle(fixture);
    expect(host.stateA()).toBe('maximized');
    expect(panel.classList).toContain('oge-window-maximized');
    expect(panel.style.left).toBe('');
    key(panel, { key: 'ArrowDown', altKey: true });
    key(panel, { key: 'ArrowDown', altKey: true });
    await settle(fixture);
    expect(host.stateA()).toBe('minimized');
    expect($('.oge-window-body')?.hidden).toBe(true);
    expect(panel.querySelectorAll('.oge-window-resize')).toHaveLength(0);
  });

  it('title-bar buttons minimize / maximize / restore with localized labels', async () => {
    host.openA.set(true);
    await settle(fixture);
    const min = $('.oge-window-minimize')!;
    const max = $('.oge-window-maximize')!;
    expect(min.getAttribute('aria-label')).toBe('Minimize');
    expect(max.getAttribute('aria-label')).toBe('Maximize');
    max.click();
    await settle(fixture);
    expect(host.stateA()).toBe('maximized');
    expect($('.oge-window-maximize')!.getAttribute('aria-label')).toBe(
      'Restore',
    );
    $('.oge-window-maximize')!.click();
    await settle(fixture);
    expect(host.stateA()).toBe('normal');
    host.vetoState = true;
    $('.oge-window-minimize')!.click();
    await settle(fixture);
    expect(host.stateA()).toBe('normal');
    host.vetoState = false;
    // the two-way model drives the state too
    host.stateA.set('minimized');
    await settle(fixture);
    expect(panels()[0].classList).toContain('oge-window-minimized');
    expect($('.oge-window-minimize')!.getAttribute('aria-label')).toBe(
      'Restore',
    );
  });

  it('Escape closes only from inside; closing is cancelable; focus returns', async () => {
    const opener = document.getElementById('opener')!;
    opener.focus();
    host.openA.set(true);
    await settle(fixture);
    key(document.body, { key: 'Escape' });
    await settle(fixture);
    expect(host.openA()).toBe(true);
    host.vetoClose = true;
    key(document.getElementById('alpha-input')!, { key: 'Escape' });
    await settle(fixture);
    expect(host.openA()).toBe(true);
    host.vetoClose = false;
    key(document.getElementById('alpha-input')!, { key: 'Escape' });
    await settle(fixture);
    expect(host.openA()).toBe(false);
    expect(panels()).toHaveLength(0);
    expect(document.activeElement).toBe(opener);
  });

  it('a placement resolves when no position is given, and position changes move it', async () => {
    host.position.set(null);
    host.openA.set(true);
    await settle(fixture);
    // jsdom measures 0×0: centred in the 1000×800 viewport
    expect(panels()[0].style.left).toBe('500px');
    host.position.set({ x: 20, y: 30 });
    await settle(fixture);
    expect(panels()[0].style.left).toBe('20px');
    expect(host.moves.at(-1)).toMatchObject({ x: 20, y: 30, source: 'api' });
    host.a().center();
    await settle(fixture);
    expect(panels()[0].style.left).toBe('500px');
  });

  it('imperative open / close / toggle', async () => {
    host.a().open();
    await settle(fixture);
    expect(panels()).toHaveLength(1);
    host.a().toggle();
    await settle(fixture);
    expect(panels()).toHaveLength(0);
    host.b().open();
    await settle(fixture);
    host.b().close();
    await settle(fixture);
    expect(host.openB()).toBe(false);
  });
});
