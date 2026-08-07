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

describe('OgeToastService promise toasts', () => {
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

  it('shows a sticky loading spinner, then morphs on resolve', async () => {
    const service = TestBed.inject(OgeToastService);
    let resolvePromise!: (v: string) => void;
    service.promise(
      new Promise<string>((resolve) => (resolvePromise = resolve)),
      { loading: 'Publishing…', success: 'Published', error: 'Failed' },
    );
    await flush();

    expect(document.querySelector('.oge-toast-spinner')).not.toBeNull();
    expect(document.querySelector('.oge-toast-message')?.textContent).toContain(
      'Publishing…',
    );
    expect(document.querySelector('.oge-toast-close')).toBeNull();

    resolvePromise('ok');
    await flush();
    expect(document.querySelector('.oge-toast-spinner')).toBeNull();
    expect(document.querySelector('.oge-toast-success')).not.toBeNull();
    expect(document.querySelector('.oge-toast-message')?.textContent).toContain(
      'Published',
    );
    expect(document.querySelector('.oge-toast-close')).not.toBeNull();
  });

  it('rejection morphs to error and announces assertively', async () => {
    const service = TestBed.inject(OgeToastService);
    let rejectPromise!: (e: unknown) => void;
    service.promise(
      new Promise((_resolve, reject) => (rejectPromise = reject)),
      {
        loading: 'Saving…',
        success: 'Saved',
        error: (e) => `Failed: ${String(e)}`,
      },
    );
    await flush();

    rejectPromise('disk full');
    await flush();
    await new Promise((resolve) => setTimeout(resolve, 150));
    tick();

    expect(document.querySelector('.oge-toast-error')).not.toBeNull();
    expect(document.querySelector('.oge-toast-message')?.textContent).toContain(
      'Failed: disk full',
    );
    expect(
      document.querySelector('[aria-live="assertive"]')?.textContent,
    ).toContain('Failed: disk full');
  });

  it('function form may return a full update patch', async () => {
    const service = TestBed.inject(OgeToastService);
    let resolvePromise!: (v: number) => void;
    service.promise(
      new Promise<number>((resolve) => (resolvePromise = resolve)),
      {
        loading: 'Counting…',
        success: (n) => ({ message: `${n} rows`, title: 'Import done' }),
        error: 'Failed',
      },
    );
    await flush();
    resolvePromise(42);
    await flush();

    expect(document.querySelector('.oge-toast-title')?.textContent).toContain(
      'Import done',
    );
    expect(document.querySelector('.oge-toast-message')?.textContent).toContain(
      '42 rows',
    );
  });

  it('ref.update patches message and severity in place', async () => {
    const service = TestBed.inject(OgeToastService);
    const ref = service.show({ message: 'v1', sticky: true });
    await flush();
    ref.update({ message: 'v2', severity: 'warning' });
    await flush();

    expect(document.querySelector('.oge-toast-warning')).not.toBeNull();
    expect(document.querySelector('.oge-toast-message')?.textContent).toContain(
      'v2',
    );
    expect(document.querySelectorAll('.oge-toast')).toHaveLength(1);
  });
});
