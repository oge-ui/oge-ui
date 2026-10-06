import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { resetScrollLockForTests } from '@oge-ui/behavior';
import { provideOgeOverlayConfig } from '../config';
import { OgeModalService } from './modal-service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p id="x-desc">described</p>`,
})
class TemplateHolder {}

describe('OgeModalService dialog helpers', () => {
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

  async function flush(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  const $ = <T extends HTMLElement = HTMLElement>(selector: string) =>
    document.querySelector<T>(selector);

  function key(target: Element, keyName: string): void {
    target.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: keyName,
        bubbles: true,
        cancelable: true,
      }),
    );
  }

  it('confirm: an alertdialog described by its message, OK resolves true', async () => {
    const service = TestBed.inject(OgeModalService);
    const result = service.confirm({
      title: 'Archive?',
      message: 'Archive 3 rows.',
    });
    await flush();
    const panel = $('.oge-modal')!;
    expect(panel.getAttribute('role')).toBe('alertdialog');
    const describedBy = panel.getAttribute('aria-describedby')!;
    expect(document.getElementById(describedBy)?.textContent).toContain(
      'Archive 3 rows.',
    );
    expect($('.oge-modal-title')?.textContent).toContain('Archive?');
    expect($('.oge-modal-close')).toBeNull();
    // the primary button has the initial focus and the localized label
    expect(document.activeElement).toBe($('.oge-dialog-ok'));
    expect($('.oge-dialog-ok')?.textContent?.trim()).toBe('OK');
    expect($('.oge-dialog-cancel')?.textContent?.trim()).toBe('Cancel');
    $('.oge-dialog-ok')!.click();
    await expect(result).resolves.toBe(true);
  });

  it('confirm: Cancel and Escape resolve false; danger focuses Cancel', async () => {
    const service = TestBed.inject(OgeModalService);
    const cancelled = service.confirm('Delete?');
    await flush();
    $('.oge-dialog-cancel')!.click();
    await expect(cancelled).resolves.toBe(false);
    await flush();

    const escaped = service.confirm({
      message: 'Delete?',
      danger: true,
      okText: 'Delete',
    });
    await flush();
    expect(document.activeElement).toBe($('.oge-dialog-cancel'));
    expect($('.oge-dialog-ok')?.classList).toContain(
      'oge-dialog-button-danger',
    );
    expect($('.oge-dialog-ok')?.textContent?.trim()).toBe('Delete');
    key(document.activeElement!, 'Escape');
    await expect(escaped).resolves.toBe(false);
  });

  it('alert: one OK button; Escape acknowledges; severity draws the icon', async () => {
    const service = TestBed.inject(OgeModalService);
    const done = service.alert({ message: 'Saved.', severity: 'success' });
    await flush();
    expect($('.oge-dialog-cancel')).toBeNull();
    expect($('.oge-dialog-icon')?.classList).toContain(
      'oge-dialog-icon-success',
    );
    expect($('.oge-dialog-icon')?.getAttribute('aria-hidden')).toBe('true');
    expect($('.oge-modal-title')?.textContent).toContain('Notice');
    key($('.oge-dialog-ok')!, 'Escape');
    await expect(done).resolves.toBeUndefined();
  });

  it('icon: false hides the built-in icon', async () => {
    const service = TestBed.inject(OgeModalService);
    void service.alert({ message: 'x', severity: 'warning', icon: false });
    await flush();
    expect($('.oge-dialog-icon')).toBeNull();
  });

  it('prompt: focuses the field, Enter submits the value, Cancel resolves null', async () => {
    const service = TestBed.inject(OgeModalService);
    const value = service.prompt({ label: 'Name', defaultValue: 'draft' });
    await flush();
    const input = $<HTMLInputElement>('.oge-dialog-input')!;
    expect($('.oge-modal')?.getAttribute('role')).toBe('dialog');
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe('draft');
    expect($(`label[for="${input.id}"]`)?.textContent).toContain('Name');
    input.value = 'final';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    key(input, 'Enter');
    await expect(value).resolves.toBe('final');
    await flush();

    const none = service.prompt('Your name?');
    await flush();
    $('.oge-dialog-cancel')!.click();
    await expect(none).resolves.toBeNull();
  });

  it('prompt validation: the error blocks Enter and is wired to the field', async () => {
    const service = TestBed.inject(OgeModalService);
    const value = service.prompt({
      required: true,
      validate: (v) => (v.length < 3 ? 'At least 3 characters.' : null),
    });
    await flush();
    const input = $<HTMLInputElement>('.oge-dialog-input')!;
    key(input, 'Enter');
    await flush();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const errorId = input.getAttribute('aria-describedby')!;
    expect(document.getElementById(errorId)?.textContent).toContain(
      'This field is required.',
    );
    input.value = 'ab';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await flush();
    expect(document.getElementById(errorId)?.textContent).toContain(
      'At least 3 characters.',
    );
    input.value = 'abc';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await flush();
    expect(input.getAttribute('aria-invalid')).toBeNull();
    expect(document.getElementById(errorId)).toBeNull();
    $('.oge-dialog-ok')!.click();
    await expect(value).resolves.toBe('abc');
  });

  it('async validation disables OK while pending', async () => {
    const service = TestBed.inject(OgeModalService);
    let release!: (error: string | null) => void;
    const value = service.prompt({
      defaultValue: 'x',
      validate: () => new Promise((resolve) => (release = resolve)),
    });
    await flush();
    $('.oge-dialog-ok')!.click();
    await flush();
    expect($('.oge-dialog-ok')?.getAttribute('aria-disabled')).toBe('true');
    release(null);
    await expect(value).resolves.toBe('x');
  });

  it('default labels come from the overlay messages', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideOgeOverlayConfig({
          messages: {
            dialogOk: 'Tamam',
            dialogCancel: 'Vazgeç',
            dialogConfirmTitle: 'Onay',
          },
        }),
      ],
    });
    const service = TestBed.inject(OgeModalService);
    void service.confirm('Sil?');
    await flush();
    expect($('.oge-dialog-ok')?.textContent?.trim()).toBe('Tamam');
    expect($('.oge-dialog-cancel')?.textContent?.trim()).toBe('Vazgeç');
    expect($('.oge-modal-title')?.textContent).toContain('Onay');
  });

  it('placements and dialogRole reach the modal layer and panel', async () => {
    const service = TestBed.inject(OgeModalService);
    service.open(TemplateHolder, {
      placement: 'bottom-end',
      dialogRole: 'alertdialog',
      ariaDescribedBy: 'x-desc',
    });
    await flush();
    expect($('.oge-modal-layer')?.classList).toContain(
      'oge-modal-layer-bottom-end',
    );
    expect($('.oge-modal')?.getAttribute('role')).toBe('alertdialog');
    expect($('.oge-modal')?.getAttribute('aria-describedby')).toBe('x-desc');
  });
});
