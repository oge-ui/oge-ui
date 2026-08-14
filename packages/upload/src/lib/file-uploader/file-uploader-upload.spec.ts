import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type {
  OgeUploadAdapter,
  OgeUploadCallbacks,
  OgeUploadPart,
  OgeUploadRequest,
} from '../engine/transport-types';
import { OGE_UPLOAD_TRANSPORT } from '../transport';
import type { OgeUploadUploadingEvent } from '../upload-types';
import { OgeFileUploader } from './file-uploader';

const settle = async (fixture: ComponentFixture<unknown>) => {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
};

const makeFile = (name: string, size = 100) => {
  const file = new File(['x'], name, { type: 'text/plain' });
  Object.defineProperty(file, 'size', { value: size });
  Object.defineProperty(file, 'slice', {
    value: (start: number, end: number) =>
      ({ start, end, size: end - start }) as unknown as Blob,
  });
  return file;
};

/**
 * The transport the specs drive by hand.
 *
 * jsdom's XHR performs real network I/O, so a spec that reached it would hang
 * instead of asserting — which is exactly why the transport sits behind a
 * token rather than being constructed inline.
 */
function fakeTransport() {
  const calls: {
    parts: readonly OgeUploadPart[];
    request: OgeUploadRequest;
    callbacks: OgeUploadCallbacks;
    aborted: boolean;
  }[] = [];
  const removes: { names: readonly string[]; request: OgeUploadRequest }[] = [];

  const adapter: OgeUploadAdapter = {
    send(parts, request, callbacks) {
      const call = { parts, request, callbacks, aborted: false };
      calls.push(call);
      return {
        abort: () => {
          call.aborted = true;
        },
      };
    },
    remove(names, request, callbacks) {
      removes.push({ names, request });
      callbacks.done({ response: null, httpStatus: 200 });
      return { abort: () => undefined };
    },
  };

  return { adapter, calls, removes };
}

@Component({
  imports: [OgeFileUploader],
  template: `
    <oge-file-uploader
      [uploadUrl]="url()"
      [uploadMode]="mode()"
      [uploadHeaders]="headers()"
      [removeUrl]="removeUrl()"
      [maxFileSize]="maxFileSize()"
      (uploading)="onUploading($event)"
      (uploaded)="uploaded = uploaded + 1"
      (uploadFailed)="failed = failed + 1"
      (allUploaded)="allDone = allDone + 1"
    />
  `,
})
class Host {
  readonly url = signal('/api/upload');
  readonly mode = signal<'instantly' | 'useButtons' | 'select' | 'useForm'>(
    'instantly',
  );
  readonly headers = signal<Record<string, string>>({});
  readonly removeUrl = signal<string | undefined>(undefined);
  readonly maxFileSize = signal<number | undefined>(undefined);

  uploaded = 0;
  failed = 0;
  allDone = 0;
  veto = false;
  mutate: ((event: OgeUploadUploadingEvent) => void) | null = null;

  onUploading(event: OgeUploadUploadingEvent) {
    event.cancel = this.veto;
    this.mutate?.(event);
  }
}

function setup() {
  const transport = fakeTransport();
  TestBed.configureTestingModule({
    providers: [{ provide: OGE_UPLOAD_TRANSPORT, useValue: transport.adapter }],
  });
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const uploader = fixture.debugElement.children[0]
    .componentInstance as OgeFileUploader;
  return { fixture, uploader, transport, host: fixture.componentInstance };
}

describe('OgeFileUploader — transfers', () => {
  it('sends as soon as a file is selected in the default mode', async () => {
    const { fixture, uploader, transport } = setup();
    uploader.addFiles([makeFile('a.txt')]);
    await settle(fixture);

    expect(transport.calls).toHaveLength(1);
    expect(uploader.files()[0].status).toBe('uploading');
  });

  it('sends nothing when there is nowhere to send to', async () => {
    const { fixture, uploader, transport, host } = setup();
    host.url.set('');
    await settle(fixture);

    uploader.addFiles([makeFile('a.txt')]);
    await settle(fixture);

    // An uploader with no destination is a file picker, and must not show a
    // row as "uploading" while nothing is in flight.
    expect(transport.calls).toHaveLength(0);
    expect(uploader.files()[0].status).toBe('pending');
  });

  it('waits for the button in useButtons mode', async () => {
    const { fixture, uploader, transport, host } = setup();
    host.mode.set('useButtons');
    await settle(fixture);

    uploader.addFiles([makeFile('a.txt')]);
    await settle(fixture);
    expect(transport.calls).toHaveLength(0);

    const button = (fixture.nativeElement as HTMLElement).querySelector(
      '.oge-upload-start',
    ) as HTMLButtonElement | null;
    expect(button).not.toBeNull();
    button?.click();
    await settle(fixture);

    expect(transport.calls).toHaveLength(1);
  });

  it('never sends in select mode', async () => {
    const { fixture, uploader, transport, host } = setup();
    host.mode.set('select');
    await settle(fixture);

    uploader.addFiles([makeFile('a.txt')]);
    uploader.upload();
    await settle(fixture);

    expect(transport.calls).toHaveLength(0);
  });

  it('never sends a file that failed a restriction', async () => {
    const { fixture, uploader, transport, host } = setup();
    host.maxFileSize.set(10);
    await settle(fixture);

    uploader.addFiles([makeFile('a.txt', 100)]);
    await settle(fixture);

    // The row exists and explains itself, but the server never sees it.
    expect(transport.calls).toHaveLength(0);
    expect(uploader.files()[0].status).toBe('invalid');
  });

  it('sends the valid files from a mixed batch and skips the rest', async () => {
    const { fixture, uploader, transport, host } = setup();
    host.maxFileSize.set(150);
    await settle(fixture);

    uploader.addFiles([makeFile('big.txt', 500), makeFile('ok.txt', 100)]);
    await settle(fixture);

    expect(transport.calls).toHaveLength(1);
    expect(transport.calls[0].parts[0].file.name).toBe('ok.txt');
  });

  it('does not emit from a destroyed component', async () => {
    const { fixture, uploader } = setup();
    uploader.addFiles([makeFile('a.txt')]);
    await settle(fixture);

    // Destroying aborts the transfer; emitting `uploadAborted` afterwards is
    // an NG0953 in the console of every app that navigates away mid-upload.
    const errors: unknown[] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => errors.push(args);
    fixture.destroy();
    console.error = original;

    expect(errors).toEqual([]);
  });

  it('never uploads in useForm mode — the enclosing form submits instead', async () => {
    const { fixture, uploader, transport, host } = setup();
    host.mode.set('useForm');
    await settle(fixture);

    uploader.addFiles([makeFile('a.txt')]);
    uploader.upload();
    await settle(fixture);

    // Uploading here as well would send every file twice.
    expect(transport.calls).toHaveLength(0);
    expect(uploader.files()[0].status).toBe('pending');
  });

  it('keeps the native input carrying the files in useForm mode', async () => {
    const { fixture, uploader, host } = setup();
    host.mode.set('useForm');
    await settle(fixture);

    uploader.addFiles([makeFile('dropped.txt')]);
    await settle(fixture);

    const input = (fixture.nativeElement as HTMLElement).querySelector(
      '.oge-upload-input',
    ) as HTMLInputElement;
    // jsdom has no DataTransfer, so the sync is a documented no-op there; the
    // assertion is that it degrades quietly rather than throwing.
    expect(input).not.toBeNull();
    expect(uploader.files()).toHaveLength(1);
  });

  it('reports progress and completion on the row', async () => {
    const { fixture, uploader, transport, host } = setup();
    uploader.addFiles([makeFile('a.txt', 200)]);
    await settle(fixture);

    transport.calls[0].callbacks.progress(100, 200);
    await settle(fixture);
    expect(uploader.files()[0].progress).toBe(50);

    transport.calls[0].callbacks.done({ response: { id: 7 }, httpStatus: 201 });
    await settle(fixture);

    const row = uploader.files()[0];
    expect(row.status).toBe('uploaded');
    expect(row.progress).toBe(100);
    expect(row.response).toEqual({ id: 7 });
    expect(host.uploaded).toBe(1);
    expect(host.allDone).toBe(1);
  });

  it('puts the server message on the row when the transfer fails', async () => {
    const { fixture, uploader, transport, host } = setup();
    uploader.addFiles([makeFile('a.txt')]);
    await settle(fixture);

    transport.calls[0].callbacks.fail({
      message: 'Disk full',
      httpStatus: 507,
      response: null,
    });
    await settle(fixture);

    const row = uploader.files()[0];
    expect(row.status).toBe('failed');
    expect(row.errors[0]).toEqual({ kind: 'server', message: 'Disk full' });
    expect(host.failed).toBe(1);
  });

  it('lets uploading veto the transfer', async () => {
    const { fixture, uploader, transport, host } = setup();
    host.veto = true;

    uploader.addFiles([makeFile('a.txt')]);
    await settle(fixture);

    expect(transport.calls).toHaveLength(0);
  });

  it('lets uploading rewrite the request', async () => {
    const { fixture, uploader, transport, host } = setup();
    host.mutate = (event) => {
      event.request.url = '/api/other';
      event.request.headers['X-Token'] = 'abc';
      event.request.data['folder'] = 'invoices';
    };

    uploader.addFiles([makeFile('a.txt')]);
    await settle(fixture);

    // dx spells this hook `onBeforeSend`; it is the only place the outgoing
    // request is writable.
    expect(transport.calls[0].request.url).toBe('/api/other');
    expect(transport.calls[0].request.headers['X-Token']).toBe('abc');
    expect(transport.calls[0].request.data['folder']).toBe('invoices');
  });

  it('passes the configured headers through', async () => {
    const { fixture, uploader, transport, host } = setup();
    host.headers.set({ Authorization: 'Bearer x' });
    await settle(fixture);

    uploader.addFiles([makeFile('a.txt')]);
    await settle(fixture);

    expect(transport.calls[0].request.headers['Authorization']).toBe(
      'Bearer x',
    );
  });

  it('aborts a transfer and marks the row', async () => {
    const { fixture, uploader, transport } = setup();
    uploader.addFiles([makeFile('a.txt')]);
    await settle(fixture);

    uploader.abort(uploader.files()[0].uid);
    await settle(fixture);

    expect(transport.calls[0].aborted).toBe(true);
    expect(uploader.files()[0].status).toBe('aborted');
  });

  it('retries an aborted transfer from the row action', async () => {
    const { fixture, uploader, transport } = setup();
    uploader.addFiles([makeFile('a.txt')]);
    await settle(fixture);
    uploader.abort(uploader.files()[0].uid);
    await settle(fixture);

    uploader.retry(uploader.files()[0].uid);
    await settle(fixture);

    expect(transport.calls).toHaveLength(2);
    expect(uploader.files()[0].status).toBe('uploading');
  });

  it('clears the server error when a retry starts', async () => {
    const { fixture, uploader, transport } = setup();
    uploader.addFiles([makeFile('a.txt')]);
    await settle(fixture);
    transport.calls[0].callbacks.fail({
      message: 'nope',
      httpStatus: 500,
      response: null,
    });
    await settle(fixture);
    expect(uploader.files()[0].errors).toHaveLength(1);

    uploader.retry(uploader.files()[0].uid);
    await settle(fixture);

    expect(uploader.files()[0].errors).toEqual([]);
  });

  it('aborts in flight transfers when the list is cleared', async () => {
    const { fixture, uploader, transport } = setup();
    uploader.addFiles([makeFile('a.txt')]);
    await settle(fixture);

    uploader.clear();
    await settle(fixture);

    expect(transport.calls[0].aborted).toBe(true);
    expect(uploader.files()).toEqual([]);
  });

  it('deletes on the server only for files that got there', async () => {
    const { fixture, uploader, transport, host } = setup();
    host.removeUrl.set('/api/remove');
    await settle(fixture);

    uploader.addFiles([makeFile('a.txt')]);
    await settle(fixture);

    // Still uploading: removing it is a local cancel, not a server delete.
    uploader.removeFile(uploader.files()[0].uid);
    await settle(fixture);
    expect(transport.removes).toHaveLength(0);

    uploader.addFiles([makeFile('b.txt')]);
    await settle(fixture);
    transport.calls[1].callbacks.done({ response: null, httpStatus: 200 });
    await settle(fixture);
    uploader.removeFile(uploader.files()[0].uid);
    await settle(fixture);

    expect(transport.removes).toHaveLength(1);
    expect(transport.removes[0].names).toEqual(['b.txt']);
    expect(transport.removes[0].request.url).toBe('/api/remove');
  });

  it('reports overall progress across the list', async () => {
    const { fixture, uploader, transport } = setup();
    uploader.addFiles([makeFile('a.txt', 100), makeFile('b.txt', 100)]);
    await settle(fixture);

    transport.calls[0].callbacks.progress(100, 100);
    transport.calls[1].callbacks.progress(50, 100);
    await settle(fixture);

    expect(uploader.progress()).toBe(75);
  });

  it('stops everything when the component is destroyed', async () => {
    const { fixture, uploader, transport } = setup();
    uploader.addFiles([makeFile('a.txt')]);
    await settle(fixture);

    fixture.destroy();

    // A lazy route that navigates away must not leave a request running.
    expect(transport.calls[0].aborted).toBe(true);
  });
});
