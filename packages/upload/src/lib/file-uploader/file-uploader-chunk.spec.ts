import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type {
  OgeUploadAdapter,
  OgeUploadCallbacks,
  OgeUploadPart,
  OgeUploadRequest,
} from '../engine/transport-types';
import { OGE_UPLOAD_TRANSPORT } from '../transport';
import type { OgeUploadChunkOptions } from '../upload-types';
import { OgeFileUploader } from './file-uploader';

const settle = async (fixture: ComponentFixture<unknown>) => {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
};

const makeFile = (name: string, size: number) => {
  const file = new File(['x'], name, { type: 'text/plain' });
  Object.defineProperty(file, 'size', { value: size });
  Object.defineProperty(file, 'slice', {
    value: (start: number, end: number) =>
      ({ start, end, size: end - start }) as unknown as Blob,
  });
  return file;
};

function fakeTransport() {
  const calls: {
    parts: readonly OgeUploadPart[];
    request: OgeUploadRequest;
    callbacks: OgeUploadCallbacks;
    aborted: boolean;
  }[] = [];
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
  };
  return { adapter, calls };
}

@Component({
  imports: [OgeFileUploader],
  template: `
    <oge-file-uploader
      uploadUrl="/api/upload"
      [chunk]="chunk()"
      (chunkUploaded)="chunksDone = chunksDone + 1"
      (uploadPaused)="paused = paused + 1"
      (uploadResumed)="resumed = resumed + 1"
    />
  `,
})
class Host {
  readonly chunk = signal<boolean | OgeUploadChunkOptions>({ size: 100 });
  chunksDone = 0;
  paused = 0;
  resumed = 0;
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

const rowText = (fixture: ComponentFixture<Host>) =>
  (fixture.nativeElement as HTMLElement).querySelector('.oge-upload-file-meta')
    ?.textContent ?? '';

describe('OgeFileUploader — chunked transfers', () => {
  it('slices the file and shows the chunk cursor on the row', async () => {
    const { fixture, uploader, transport } = setup();
    uploader.addFiles([makeFile('big.bin', 250)]);
    await settle(fixture);

    expect(transport.calls[0].parts[0].chunk?.totalChunks).toBe(3);
    expect(rowText(fixture)).toContain('Part 1 of 3');

    transport.calls[0].callbacks.done({ response: null, httpStatus: 200 });
    await settle(fixture);
    expect(rowText(fixture)).toContain('Part 2 of 3');
  });

  it('completes only after the final slice', async () => {
    const { fixture, uploader, transport, host } = setup();
    uploader.addFiles([makeFile('big.bin', 250)]);
    await settle(fixture);

    for (let i = 0; i < 2; i++) {
      transport.calls[i].callbacks.done({ response: null, httpStatus: 200 });
      await settle(fixture);
      expect(uploader.files()[0].status).toBe('uploading');
    }

    transport.calls[2].callbacks.done({ response: null, httpStatus: 200 });
    await settle(fixture);

    expect(uploader.files()[0].status).toBe('uploaded');
    expect(host.chunksDone).toBe(3);
  });

  it('offers pause only while chunking, and resumes at the same slice', async () => {
    const { fixture, uploader, transport, host } = setup();
    uploader.addFiles([makeFile('big.bin', 250)]);
    await settle(fixture);
    transport.calls[0].callbacks.done({ response: null, httpStatus: 200 });
    await settle(fixture);

    const element = fixture.nativeElement as HTMLElement;
    const pauseButton = Array.from(
      element.querySelectorAll<HTMLButtonElement>('.oge-upload-file-action'),
    ).find((button) => button.textContent?.trim() === 'Pause');
    expect(pauseButton).toBeDefined();

    pauseButton?.click();
    await settle(fixture);
    expect(uploader.files()[0].status).toBe('paused');
    expect(host.paused).toBe(1);

    uploader.resume(uploader.files()[0].uid);
    await settle(fixture);

    expect(transport.calls.at(-1)?.parts[0].chunk?.chunkIndex).toBe(1);
    expect(host.resumed).toBe(1);
  });

  it('offers no pause when chunking is off', async () => {
    const { fixture, uploader, host } = setup();
    host.chunk.set(false);
    await settle(fixture);

    uploader.addFiles([makeFile('big.bin', 250)]);
    await settle(fixture);

    const labels = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll(
        '.oge-upload-file-action',
      ),
    ).map((button) => button.textContent?.trim());
    // A whole-file request has nothing to suspend; a Pause button that only
    // aborts would be a lie the UI then has to explain.
    expect(labels).not.toContain('Pause');
    expect(uploader.pause(uploader.files()[0].uid)).toBe(false);
  });

  it('reports a rate and an estimate once there is enough to measure', async () => {
    const { fixture, uploader, transport } = setup();
    uploader.addFiles([makeFile('big.bin', 1000)]);
    await settle(fixture);

    // Backdate the start so the elapsed time is a real measurement rather
    // than the sub-tick noise the component deliberately ignores.
    const uid = uploader.files()[0].uid;
    const started = Date.now() - 2000;
    (
      uploader as unknown as {
        patchRow(uid: string, patch: Record<string, unknown>): void;
      }
    ).patchRow(uid, { startedAt: started });

    transport.calls[0].callbacks.progress(500, 1000);
    await settle(fixture);

    const row = uploader.files()[0];
    expect(row.bytesPerSecond).toBeGreaterThan(0);
    expect(row.secondsRemaining).toBeGreaterThan(0);
    expect(rowText(fixture)).toMatch(/\/s/);
  });

  it('reports no rate before there is enough elapsed time', async () => {
    const { fixture, uploader, transport } = setup();
    uploader.addFiles([makeFile('big.bin', 1000)]);
    await settle(fixture);

    transport.calls[0].callbacks.progress(500, 1000);
    await settle(fixture);

    expect(uploader.files()[0].bytesPerSecond).toBeUndefined();
  });
});
