import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { OGE_MODAL_DATA, OgeModalRef, OgeModalService } from './modal-service';
import { resetScrollLockForTests } from '@oge-ui/behavior';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="service-content">Hello {{ data }}</p>
    <button type="button" class="service-done" (click)="ref.close('done')">
      Done
    </button>
  `,
})
class ServiceContent {
  protected readonly data = inject(OGE_MODAL_DATA);
  protected readonly ref = inject(OgeModalRef);
}

describe('OgeModalService', () => {
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
    await TestBed.inject(OgeModalService); // keep TestBed initialized
  }

  it('opens a body-appended modal hosting the component with its data', async () => {
    const service = TestBed.inject(OgeModalService);
    service.open(ServiceContent, { title: 'From service', data: 'world' });
    await flush();

    const layer = document.querySelector('.oge-modal-layer');
    expect(
      layer?.parentElement?.closest('oge-modal-service-host'),
    ).not.toBeNull();
    expect(document.querySelector('.service-content')?.textContent).toContain(
      'Hello world',
    );
    expect(document.querySelector('.oge-modal-title')?.textContent).toContain(
      'From service',
    );
  });

  it('passes the part classes, body style and attributes to the modal', async () => {
    const service = TestBed.inject(OgeModalService);
    service.open(ServiceContent, {
      title: 'Styled',
      data: 'x',
      panelClass: ['brand-dialog'],
      backdropClass: 'brand-backdrop',
      bodyClass: 'brand-body',
      bodyStyle: { 'padding-block': '4px' },
      panelAttributes: { 'data-testid': 'service-dialog' },
    });
    await flush();
    const panel = document.querySelector('.oge-modal') as HTMLElement;
    expect(panel.classList).toContain('brand-dialog');
    expect(panel.getAttribute('data-testid')).toBe('service-dialog');
    expect(document.querySelector('.oge-modal-layer')?.classList).toContain(
      'brand-backdrop',
    );
    const body = document.querySelector('.oge-modal-body') as HTMLElement;
    expect(body.classList).toContain('brand-body');
    expect(body.style.paddingBlock).toBe('4px');
  });

  it('resolves closed with the result from OgeModalRef.close and removes the host', async () => {
    const service = TestBed.inject(OgeModalService);
    const ref = service.open<string>(ServiceContent, { data: 'x' });
    await flush();

    (document.querySelector('.service-done') as HTMLButtonElement).click();
    const event = await ref.closed;
    expect(event).toEqual({ reason: 'api', result: 'done' });

    await flush();
    expect(document.querySelector('oge-modal-service-host')).toBeNull();
    expect(document.querySelector('.oge-modal-layer')).toBeNull();
  });

  it('ref.close() from outside closes through the pipeline', async () => {
    const service = TestBed.inject(OgeModalService);
    const ref = service.open<number>(ServiceContent, {});
    await flush();
    ref.close(42);
    const event = await ref.closed;
    expect(event.result).toBe(42);
  });
});
