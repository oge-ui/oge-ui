import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { resetScrollLockForTests } from '@oge-ui/behavior';
import { OgeModal } from './modal';

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
      title="Styled"
      [placement]="placement()"
      [panelClass]="panelClass()"
      [backdropClass]="backdropClass()"
      [bodyClass]="['brand-body', 'scroll-y']"
      [bodyStyle]="bodyStyle()"
      [padding]="padding()"
      [panelAttributes]="attrs()"
    >
      <p>Body</p>
    </oge-modal>
  `,
})
class StyledModalHost {
  readonly opened = signal(false);
  readonly placement = signal<'center' | 'top'>('center');
  readonly padding = signal(true);
  readonly panelClass = signal<string | string[]>('brand-dialog');
  readonly backdropClass = signal('brand-backdrop');
  readonly bodyStyle = signal<Record<string, string> | undefined>({
    'max-height': '50vh',
  });
  readonly attrs = signal<Record<string, string>>({
    'data-testid': 'edit-dialog',
    role: 'alertdialog',
    onclick: 'alert(1)',
  });
}

describe('OgeModal part styling', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      setTimeout(() => cb(0), 0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    resetScrollLockForTests();
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    document.body.innerHTML = '';
  });

  async function open(): Promise<ComponentFixture<StyledModalHost>> {
    const fixture = TestBed.createComponent(StyledModalHost);
    document.body.appendChild(fixture.nativeElement);
    fixture.componentInstance.opened.set(true);
    await settle(fixture);
    return fixture;
  }

  const q = (selector: string) =>
    document.querySelector(selector) as HTMLElement;

  it('puts the part classes next to the modal’s own', async () => {
    await open();
    const layer = q('.oge-modal-layer');
    expect(layer.classList).toContain('brand-backdrop');
    expect(layer.className).toMatch(/oge-modal-placement-center|oge-modal/);
    const panel = q('.oge-modal');
    expect(panel.classList).toContain('brand-dialog');
    const body = q('.oge-modal-body');
    expect(body.classList).toContain('brand-body');
    expect(body.classList).toContain('scroll-y');
    expect(body.style.maxHeight).toBe('50vh');
  });

  it('keeps placement and flush classes working beside the custom ones', async () => {
    const fixture = await open();
    const before = q('.oge-modal-layer').className;
    fixture.componentInstance.placement.set('top');
    fixture.componentInstance.padding.set(false);
    await settle(fixture);
    const layer = q('.oge-modal-layer');
    expect(layer.className).not.toBe(before);
    expect(layer.classList).toContain('brand-backdrop');
    const body = q('.oge-modal-body');
    expect(body.classList).toContain('oge-modal-body-flush');
    expect(body.classList).toContain('brand-body');
  });

  it('applies the safe panel attributes and keeps its own role', async () => {
    const fixture = await open();
    const panel = q('.oge-modal');
    expect(panel.getAttribute('data-testid')).toBe('edit-dialog');
    expect(panel.getAttribute('role')).toBe('dialog');
    expect(panel.hasAttribute('onclick')).toBe(false);
    fixture.componentInstance.attrs.set({});
    fixture.componentInstance.bodyStyle.set(undefined);
    await settle(fixture);
    expect(panel.hasAttribute('data-testid')).toBe(false);
    expect(q('.oge-modal-body').style.maxHeight).toBe('');
  });

  it('re-applies the attributes when the modal opens again', async () => {
    const fixture = await open();
    fixture.componentInstance.opened.set(false);
    await settle(fixture);
    fixture.componentInstance.opened.set(true);
    await settle(fixture);
    expect(q('.oge-modal').getAttribute('data-testid')).toBe('edit-dialog');
  });
});
