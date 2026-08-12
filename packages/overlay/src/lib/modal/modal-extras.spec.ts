import { Component, signal, viewChild } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeModal } from './modal';
import { OgeModalHeaderActions } from './modal-templates';
import { resetScrollLockForTests } from '@oge-ui/behavior';
import type { OgeModalPlacement } from './modal-types';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  imports: [OgeModal],
  template: `
    <oge-modal
      [(opened)]="opened"
      [(fullScreen)]="fullScreen"
      title="Extras"
      [width]="300"
      [minWidth]="200"
      [minHeight]="120"
      [maxWidth]="'90vw'"
      [placement]="placement()"
      [shading]="shading()"
      [showMaximizeButton]="showMaximizeButton()"
    >
      <input />
    </oge-modal>
  `,
})
class ExtrasHost {
  readonly opened = signal(false);
  readonly fullScreen = signal(false);
  readonly placement = signal<OgeModalPlacement>('center');
  readonly shading = signal(true);
  readonly showMaximizeButton = signal(false);
  readonly modal = viewChild.required(OgeModal);
}

function el(selector: string): HTMLElement | null {
  return document.querySelector(selector);
}

describe('OgeModal sizing, placement, shading, full screen', () => {
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

  async function create(): Promise<ComponentFixture<ExtrasHost>> {
    const fixture = TestBed.createComponent(ExtrasHost);
    await settle(fixture);
    fixture.componentInstance.opened.set(true);
    await settle(fixture);
    return fixture;
  }

  it('applies min/max size inputs alongside width', async () => {
    await create();
    const panel = el('.oge-modal');
    expect(panel?.style.width).toBe('300px');
    expect(panel?.style.minWidth).toBe('200px');
    expect(panel?.style.minHeight).toBe('120px');
    expect(panel?.style.maxWidth).toBe('90vw');
  });

  it('placement=top pins the layer to the top', async () => {
    const fixture = await create();
    expect(el('.oge-modal-layer-top')).toBeNull();
    fixture.componentInstance.placement.set('top');
    await settle(fixture);
    expect(el('.oge-modal-layer-top')).not.toBeNull();
  });

  it('shading=false renders a transparent backdrop that still closes on click', async () => {
    const fixture = await create();
    fixture.componentInstance.shading.set(false);
    await settle(fixture);
    const layer = el('.oge-modal-layer');
    expect(layer?.classList.contains('oge-modal-layer-unshaded')).toBe(true);
    layer?.dispatchEvent(new MouseEvent('pointerdown'));
    layer?.dispatchEvent(new MouseEvent('click'));
    await settle(fixture);
    expect(fixture.componentInstance.opened()).toBe(false);
  });

  it('maximize button toggles fullScreen and swaps its aria label', async () => {
    const fixture = await create();
    expect(el('.oge-modal-maximize')).toBeNull();
    fixture.componentInstance.showMaximizeButton.set(true);
    await settle(fixture);

    const button = el('.oge-modal-maximize');
    expect(button?.getAttribute('aria-label')).toBe('Maximize');
    button?.click();
    await settle(fixture);
    expect(fixture.componentInstance.fullScreen()).toBe(true);
    expect(el('.oge-modal')?.classList.contains('oge-modal-fullscreen')).toBe(
      true,
    );
    expect(el('.oge-modal-maximize')?.getAttribute('aria-label')).toBe(
      'Restore',
    );

    el('.oge-modal-maximize')?.click();
    await settle(fixture);
    expect(fixture.componentInstance.fullScreen()).toBe(false);
    expect(el('.oge-modal')?.classList.contains('oge-modal-fullscreen')).toBe(
      false,
    );
  });

  it('fullScreen suppresses the size inputs and top placement', async () => {
    const fixture = await create();
    fixture.componentInstance.placement.set('top');
    fixture.componentInstance.fullScreen.set(true);
    await settle(fixture);
    const panel = el('.oge-modal');
    expect(panel?.style.width).toBe('');
    expect(panel?.style.minWidth).toBe('');
    expect(panel?.style.maxWidth).toBe('');
    expect(el('.oge-modal-layer-top')).toBeNull();
    expect(
      el('.oge-modal-layer')?.classList.contains('oge-modal-layer-fullscreen'),
    ).toBe(true);
  });

  it('toggleFullScreen() flips the two-way model', async () => {
    const fixture = await create();
    fixture.componentInstance.modal().toggleFullScreen();
    await settle(fixture);
    expect(fixture.componentInstance.fullScreen()).toBe(true);
  });
});

@Component({
  imports: [OgeModal, OgeModalHeaderActions],
  template: `
    <oge-modal [(opened)]="opened" title="With actions">
      <ng-container *ogeModalHeaderActions="let close">
        <button type="button" id="pin">pin</button>
        <button type="button" id="dismiss" (click)="close('pinned')">x</button>
      </ng-container>
      <input />
    </oge-modal>
  `,
})
class HeaderActionsHost {
  readonly opened = signal(false);
}

describe('OgeModal header actions slot', () => {
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

  it('renders projected buttons in the title bar, before the ✕', async () => {
    const fixture = TestBed.createComponent(HeaderActionsHost);
    await settle(fixture);
    fixture.componentInstance.opened.set(true);
    await settle(fixture);

    const header = document.querySelector('.oge-modal-header');
    const children = Array.from(header?.children ?? []).map(
      (child) => child.className || child.id,
    );
    expect(document.querySelector('#pin')).not.toBeNull();
    // actions container sits between the title and the close button
    expect(children.indexOf('oge-modal-header-actions')).toBeGreaterThan(
      children.indexOf('oge-modal-title'),
    );
    expect(children.indexOf('oge-modal-header-actions')).toBeLessThan(
      children.indexOf('oge-modal-close'),
    );
  });

  it('the slot context close function closes with a result', async () => {
    const fixture = TestBed.createComponent(HeaderActionsHost);
    await settle(fixture);
    fixture.componentInstance.opened.set(true);
    await settle(fixture);
    (document.querySelector('#dismiss') as HTMLButtonElement).click();
    await settle(fixture);
    expect(fixture.componentInstance.opened()).toBe(false);
    expect(document.querySelector('.oge-modal-layer')).toBeNull();
  });
});
