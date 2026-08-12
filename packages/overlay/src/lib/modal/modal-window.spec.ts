import { Component, signal, viewChild } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeModal } from './modal';
import { resetScrollLockForTests } from '@oge-ui/behavior';
import type { OgeModalOpeningEvent, OgeModalResizeEvent } from './modal-types';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function pointer(
  type: string,
  init: { clientX?: number; clientY?: number; button?: number } = {},
): MouseEvent {
  return new MouseEvent(type, { bubbles: true, cancelable: true, ...init });
}

@Component({
  imports: [OgeModal],
  template: `
    <div id="outside-content"><button id="outside">outside</button></div>
    <oge-modal
      [(opened)]="opened"
      title="Window modal"
      [dragEnabled]="dragEnabled()"
      [dragOutsideBoundary]="true"
      [restorePosition]="restorePosition()"
      [resizeEnabled]="resizeEnabled()"
      [inertBackground]="inertBackground()"
      (opening)="onOpening($event)"
      (resizeStarted)="resizeEvents.push($event)"
      (resized)="resizeEvents.push($event)"
    >
      <input />
    </oge-modal>
  `,
})
class WindowHost {
  readonly opened = signal(false);
  readonly dragEnabled = signal(false);
  readonly restorePosition = signal(true);
  readonly resizeEnabled = signal(false);
  readonly inertBackground = signal(false);
  readonly modal = viewChild.required(OgeModal);
  readonly resizeEvents: OgeModalResizeEvent[] = [];
  cancelNextOpen = false;

  onOpening(event: OgeModalOpeningEvent): void {
    if (this.cancelNextOpen) {
      event.cancel = true;
      this.cancelNextOpen = false;
    }
  }
}

function el(selector: string): HTMLElement | null {
  return document.querySelector(selector);
}

describe('OgeModal window behaviors (opening, drag, resize, inert)', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      setTimeout(() => cb(0), 0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetScrollLockForTests();
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    document.body.innerHTML = '';
  });

  async function create(): Promise<ComponentFixture<WindowHost>> {
    const fixture = TestBed.createComponent(WindowHost);
    await settle(fixture);
    return fixture;
  }

  async function open(fixture: ComponentFixture<WindowHost>): Promise<void> {
    fixture.componentInstance.opened.set(true);
    await settle(fixture);
    await new Promise((resolve) => setTimeout(resolve, 0));
    await settle(fixture);
  }

  it('cancelable opening event keeps the modal closed', async () => {
    const fixture = await create();
    fixture.componentInstance.cancelNextOpen = true;
    fixture.componentInstance.opened.set(true);
    await settle(fixture);
    expect(el('.oge-modal-layer')).toBeNull();
    expect(fixture.componentInstance.opened()).toBe(false);

    fixture.componentInstance.opened.set(true);
    await settle(fixture);
    expect(el('.oge-modal-layer')).not.toBeNull();
  });

  it('dragging the header translates the panel; restorePosition resets on reopen', async () => {
    const fixture = await create();
    fixture.componentInstance.dragEnabled.set(true);
    await open(fixture);
    const header = el('.oge-modal-header');
    expect(header?.classList.contains('oge-modal-header-draggable')).toBe(true);

    header?.dispatchEvent(pointer('pointerdown', { clientX: 50, clientY: 50 }));
    document.dispatchEvent(
      pointer('pointermove', { clientX: 90, clientY: 75 }),
    );
    document.dispatchEvent(pointer('pointerup', { clientX: 90, clientY: 75 }));
    await settle(fixture);
    expect(el('.oge-modal')?.style.transform).toBe('translate(40px, 25px)');

    fixture.componentInstance.opened.set(false);
    await settle(fixture);
    await open(fixture);
    expect(el('.oge-modal')?.style.transform).toBe('');
  });

  it('drag ignores presses starting on header buttons', async () => {
    const fixture = await create();
    fixture.componentInstance.dragEnabled.set(true);
    await open(fixture);
    const close = el('.oge-modal-close');
    close?.dispatchEvent(pointer('pointerdown', { clientX: 10, clientY: 10 }));
    document.dispatchEvent(
      pointer('pointermove', { clientX: 60, clientY: 60 }),
    );
    document.dispatchEvent(pointer('pointerup', { clientX: 60, clientY: 60 }));
    await settle(fixture);
    expect(el('.oge-modal')?.style.transform).toBe('');
  });

  it('resize handle sets an explicit size and emits start/end events', async () => {
    const fixture = await create();
    fixture.componentInstance.resizeEnabled.set(true);
    await open(fixture);
    const handle = el('.oge-modal-resize-handle');
    expect(handle).not.toBeNull();

    handle?.dispatchEvent(pointer('pointerdown', { clientX: 0, clientY: 0 }));
    document.dispatchEvent(
      pointer('pointermove', { clientX: 240, clientY: 200 }),
    );
    document.dispatchEvent(
      pointer('pointerup', { clientX: 240, clientY: 200 }),
    );
    await settle(fixture);

    const panel = el('.oge-modal');
    // jsdom offsetWidth/Height are 0 — the 160×120 floor applies to the delta.
    expect(panel?.style.width).toBe('240px');
    expect(panel?.style.height).toBe('200px');
    expect(fixture.componentInstance.resizeEvents).toHaveLength(2);
    expect(fixture.componentInstance.resizeEvents[1].width).toBe(240);
    expect(fixture.componentInstance.resizeEvents[1].height).toBe(200);
  });

  it('inertBackground marks outside content inert and restores it on close', async () => {
    const fixture = await create();
    fixture.componentInstance.inertBackground.set(true);
    await open(fixture);
    const outside = el('#outside-content');
    expect(outside?.hasAttribute('inert')).toBe(true);
    expect(el('.oge-modal-layer')?.hasAttribute('inert')).toBe(false);

    fixture.componentInstance.modal().close();
    await settle(fixture);
    expect(outside?.hasAttribute('inert')).toBe(false);
  });
});
