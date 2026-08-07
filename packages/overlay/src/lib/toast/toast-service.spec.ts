import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { OgeToastService } from './toast-service';

function tick(): void {
  TestBed.inject(ApplicationRef).tick();
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  tick();
}

describe('OgeToastService basics', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      setTimeout(() => cb(0), 0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('mounts one body-appended host and renders the toast', async () => {
    const service = TestBed.inject(OgeToastService);
    service.show('Hello');
    service.show('World');
    await flush();

    expect(document.querySelectorAll('oge-toast-host')).toHaveLength(1);
    const toasts = document.querySelectorAll('.oge-toast');
    expect(toasts).toHaveLength(2);
    expect(toasts[0].textContent).toContain('Hello');
    expect(
      document.querySelector('.oge-toast-region')?.getAttribute('role'),
    ).toBe('region');
  });

  it('sugar methods set severity classes and title renders', async () => {
    const service = TestBed.inject(OgeToastService);
    service.success('Saved', { title: 'Done' });
    service.error('Boom');
    await flush();

    expect(document.querySelector('.oge-toast-success')).not.toBeNull();
    expect(document.querySelector('.oge-toast-error')).not.toBeNull();
    expect(document.querySelector('.oge-toast-title')?.textContent).toContain(
      'Done',
    );
  });

  it('close button closes with reason closeButton and uses the messages label', async () => {
    const service = TestBed.inject(OgeToastService);
    const ref = service.show('Closable');
    await flush();

    const close = document.querySelector<HTMLButtonElement>('.oge-toast-close');
    expect(close?.getAttribute('aria-label')).toBe('Close');
    close?.click();
    await new Promise((resolve) => setTimeout(resolve, 200));
    tick();
    expect(await ref.closed).toEqual({ reason: 'closeButton' });
    expect(document.querySelector('.oge-toast')).toBeNull();
  });

  it('action button runs the handler and closes with reason action', async () => {
    const service = TestBed.inject(OgeToastService);
    const handler = vi.fn();
    const ref = service.show({
      message: 'Row deleted',
      sticky: true,
      action: { text: 'Undo', handler },
      data: { id: 7 },
    });
    await flush();

    document.querySelector<HTMLButtonElement>('.oge-toast-action')?.click();
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ data: { id: 7 } }),
    );
    expect(await ref.closed).toEqual({ reason: 'action' });
  });

  it('closeOnClick dismisses with reason click, but not via buttons', async () => {
    const service = TestBed.inject(OgeToastService);
    const ref = service.show({ message: 'Tap me', closeOnClick: true });
    await flush();

    (document.querySelector('.oge-toast') as HTMLElement).click();
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(await ref.closed).toEqual({ reason: 'click' });
  });

  it('clear() closes everything with reason clear', async () => {
    const service = TestBed.inject(OgeToastService);
    const a = service.show({ message: 'a', sticky: true });
    const b = service.show({ message: 'b', sticky: true });
    await flush();
    service.clear();
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect((await a.closed).reason).toBe('clear');
    expect((await b.closed).reason).toBe('clear');
  });

  it('announces politely by default and assertively for errors', async () => {
    const service = TestBed.inject(OgeToastService);
    service.show({ message: 'Quiet news', title: 'FYI' });
    service.error('It broke');
    await new Promise((resolve) => setTimeout(resolve, 150));
    tick();

    const polite = document.querySelector('[aria-live="polite"]');
    const assertive = document.querySelector('[aria-live="assertive"]');
    expect(polite?.textContent).toBe('FYI. Quiet news');
    expect(assertive?.textContent).toBe('It broke');
  });
});
