import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeModal } from './modal';
import { OgeModalFooter, OgeModalTitle } from './modal-templates';
import { resetScrollLockForTests } from '@oge-ui/behavior';
import type { OgeModalClosedEvent, OgeModalClosingEvent } from './modal-types';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  imports: [OgeModal, OgeModalTitle, OgeModalFooter],
  template: `
    <button id="trigger" type="button">open</button>
    <oge-modal
      [(opened)]="opened"
      [title]="title()"
      [closeOnEscape]="closeOnEscape()"
      [closeOnBackdropClick]="closeOnBackdropClick()"
      [busy]="busy()"
      (closing)="onClosing($event)"
      (closed)="closeds.push($event)"
    >
      <input id="field" />
      <div *ogeModalFooter="let close">
        <button id="ok" type="button" (click)="close('saved')">OK</button>
      </div>
    </oge-modal>
  `,
})
class ModalHost {
  readonly opened = signal(false);
  readonly title = signal<string | undefined>('Test modal');
  readonly closeOnEscape = signal(true);
  readonly closeOnBackdropClick = signal(true);
  readonly busy = signal(false);
  readonly closings: OgeModalClosingEvent[] = [];
  readonly closeds: OgeModalClosedEvent[] = [];
  cancelNextClose = false;

  onClosing(event: OgeModalClosingEvent): void {
    this.closings.push(event);
    if (this.cancelNextClose) {
      event.cancel = true;
      this.cancelNextClose = false;
    }
  }
}

function query(
  fixture: ComponentFixture<unknown>,
  selector: string,
): HTMLElement | null {
  return document.querySelector(selector);
}

describe('OgeModal', () => {
  beforeEach(() => {
    // Overlay-flavored specs stub rAF asynchronously — a synchronous stub
    // re-enters Angular's render scheduler mid-tick (bogus NG0100).
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

  async function create(): Promise<ComponentFixture<ModalHost>> {
    const fixture = TestBed.createComponent(ModalHost);
    await settle(fixture);
    return fixture;
  }

  it('renders nothing while closed and mounts the dialog when opened', async () => {
    const fixture = await create();
    expect(query(fixture, '.oge-modal-layer')).toBeNull();

    fixture.componentInstance.opened.set(true);
    await settle(fixture);
    const panel = query(fixture, '.oge-modal');
    expect(panel).not.toBeNull();
    expect(panel?.getAttribute('role')).toBe('dialog');
    expect(panel?.getAttribute('aria-modal')).toBe('true');

    fixture.componentInstance.opened.set(false);
    await settle(fixture);
    expect(query(fixture, '.oge-modal-layer')).toBeNull();
  });

  it('labels the dialog from the rendered title', async () => {
    const fixture = await create();
    fixture.componentInstance.opened.set(true);
    await settle(fixture);
    const panel = query(fixture, '.oge-modal');
    const titleEl = query(fixture, '.oge-modal-title');
    expect(titleEl?.textContent).toContain('Test modal');
    expect(panel?.getAttribute('aria-labelledby')).toBe(titleEl?.id);
    expect(panel?.getAttribute('aria-label')).toBeNull();
  });

  it('close button closes with reason closeButton', async () => {
    const fixture = await create();
    fixture.componentInstance.opened.set(true);
    await settle(fixture);
    query(fixture, '.oge-modal-close')?.click();
    await settle(fixture);
    expect(fixture.componentInstance.opened()).toBe(false);
    expect(fixture.componentInstance.closeds).toEqual([
      { reason: 'closeButton', result: undefined },
    ]);
  });

  it('Escape closes with reason escape; closeOnEscape=false keeps it open', async () => {
    const fixture = await create();
    fixture.componentInstance.opened.set(true);
    await settle(fixture);
    fixture.componentInstance.closeOnEscape.set(false);
    await settle(fixture);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await settle(fixture);
    expect(fixture.componentInstance.opened()).toBe(true);

    fixture.componentInstance.closeOnEscape.set(true);
    await settle(fixture);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await settle(fixture);
    expect(fixture.componentInstance.opened()).toBe(false);
    expect(fixture.componentInstance.closeds.at(-1)?.reason).toBe('escape');
  });

  it('backdrop closes only when press and release both land on the layer', async () => {
    const fixture = await create();
    fixture.componentInstance.opened.set(true);
    await settle(fixture);
    const layer = query(fixture, '.oge-modal-layer');
    const panel = query(fixture, '.oge-modal');

    // Press on panel (text selection), release over backdrop → stays open.
    panel?.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    layer?.dispatchEvent(new MouseEvent('click'));
    await settle(fixture);
    expect(fixture.componentInstance.opened()).toBe(true);

    // Press and release on the backdrop → closes.
    layer?.dispatchEvent(new MouseEvent('pointerdown'));
    layer?.dispatchEvent(new MouseEvent('click'));
    await settle(fixture);
    expect(fixture.componentInstance.opened()).toBe(false);
    expect(fixture.componentInstance.closeds.at(-1)?.reason).toBe('backdrop');
  });

  it('closeOnBackdropClick=false ignores backdrop clicks', async () => {
    const fixture = await create();
    fixture.componentInstance.closeOnBackdropClick.set(false);
    fixture.componentInstance.opened.set(true);
    await settle(fixture);
    const layer = query(fixture, '.oge-modal-layer');
    layer?.dispatchEvent(new MouseEvent('pointerdown'));
    layer?.dispatchEvent(new MouseEvent('click'));
    await settle(fixture);
    expect(fixture.componentInstance.opened()).toBe(true);
  });

  it('cancelable closing event vetoes the close', async () => {
    const fixture = await create();
    const host = fixture.componentInstance;
    host.opened.set(true);
    await settle(fixture);
    host.cancelNextClose = true;
    query(fixture, '.oge-modal-close')?.click();
    await settle(fixture);
    expect(host.opened()).toBe(true);
    expect(host.closings).toHaveLength(1);
    expect(host.closeds).toEqual([]);
  });

  it('footer slot close function carries a typed result', async () => {
    const fixture = await create();
    fixture.componentInstance.opened.set(true);
    await settle(fixture);
    (query(fixture, '#ok') as HTMLButtonElement).click();
    await settle(fixture);
    expect(fixture.componentInstance.closeds).toEqual([
      { reason: 'api', result: 'saved' },
    ]);
  });

  it('busy blocks user closes but not programmatic close()', async () => {
    const fixture = await create();
    fixture.componentInstance.opened.set(true);
    fixture.componentInstance.busy.set(true);
    await settle(fixture);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    const layer = query(fixture, '.oge-modal-layer');
    layer?.dispatchEvent(new MouseEvent('pointerdown'));
    layer?.dispatchEvent(new MouseEvent('click'));
    await settle(fixture);
    expect(fixture.componentInstance.opened()).toBe(true);
    expect(query(fixture, '.oge-modal-busy-veil')).not.toBeNull();

    const modal = fixture.debugElement.children.find(
      (c) => c.componentInstance instanceof OgeModal,
    )?.componentInstance as OgeModal;
    modal.close();
    await settle(fixture);
    expect(fixture.componentInstance.opened()).toBe(false);
  });

  it('locks body scroll while open and releases on destroy', async () => {
    const fixture = await create();
    fixture.componentInstance.opened.set(true);
    await settle(fixture);
    expect(document.body.style.overflow).toBe('hidden');
    fixture.destroy();
    expect(document.body.style.overflow).toBe('');
  });
});
