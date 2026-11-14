import type { HttpClient } from '@angular/common/http';
import type {
  OgeUploadCallbacks,
  OgeUploadPart,
  OgeUploadRequest,
} from '@oge-ui/behavior';
import { Subject } from 'rxjs';
import { createHttpClientUploadAdapter } from './http-client-adapter';

interface RecordedCall {
  method: string;
  url: string;
  options: {
    body: FormData;
    headers: unknown;
    withCredentials: unknown;
    reportProgress: boolean;
    observe: string;
    responseType: string;
  };
}

function setup(overrides: Partial<OgeUploadRequest> = {}) {
  const events = new Subject<unknown>();
  const calls: RecordedCall[] = [];
  const http = {
    request: (
      method: string,
      url: string,
      options: RecordedCall['options'],
    ) => {
      calls.push({ method, url, options });
      return events.asObservable();
    },
  } as unknown as HttpClient;
  const request = {
    method: 'post',
    url: '/api/upload',
    headers: { Authorization: 'Bearer token' },
    withCredentials: true,
    responseType: 'json',
    fieldName: 'files',
    data: {},
    ...overrides,
  } as unknown as OgeUploadRequest;
  const callbacks = {
    progress: vi.fn(),
    done: vi.fn(),
    fail: vi.fn(),
  };
  return {
    adapter: createHttpClientUploadAdapter(http),
    events,
    calls,
    request,
    callbacks,
    asCallbacks: callbacks as unknown as OgeUploadCallbacks,
  };
}

function part(name: string, chunk?: unknown): OgeUploadPart {
  const file = new File(['content'], name, { type: 'text/plain' });
  return { file, blob: file, chunk } as unknown as OgeUploadPart;
}

describe('createHttpClientUploadAdapter', () => {
  it('sends the parts as multipart form data through HttpClient', () => {
    const { adapter, calls, request, asCallbacks } = setup();

    adapter.send([part('a.txt'), part('b.txt')], request, asCallbacks);

    expect(calls).toHaveLength(1);
    const [call] = calls;
    expect(call.method).toBe('POST');
    expect(call.url).toBe('/api/upload');
    expect(call.options.headers).toEqual({ Authorization: 'Bearer token' });
    expect(call.options.withCredentials).toBe(true);
    expect(call.options.reportProgress).toBe(true);
    expect(call.options.observe).toBe('events');
    expect(call.options.responseType).toBe('json');
    const files = call.options.body.getAll('files') as File[];
    expect(files.map((file) => file.name)).toEqual(['a.txt', 'b.txt']);
    expect(call.options.body.has('metadata')).toBe(false);
  });

  it('adds the chunk metadata and the extra request data', () => {
    const chunk = { index: 1, totalCount: 3 };
    const { adapter, calls, request, asCallbacks } = setup({
      data: {
        folder: 'invoices',
        attempt: 2,
        tags: { year: 2026 },
        skipped: undefined,
        empty: null,
      },
    } as unknown as Partial<OgeUploadRequest>);

    adapter.send([part('big.bin', chunk)], request, asCallbacks);

    const body = calls[0].options.body;
    expect(body.get('metadata')).toBe(JSON.stringify(chunk));
    expect(body.get('folder')).toBe('invoices');
    expect(body.get('attempt')).toBe('2');
    expect(body.get('tags')).toBe('{"year":2026}');
    expect(body.has('skipped')).toBe(false);
    expect(body.has('empty')).toBe(false);
  });

  it('asks for a blob when the request does', () => {
    const { adapter, calls, request, asCallbacks } = setup({
      responseType: 'blob',
    } as unknown as Partial<OgeUploadRequest>);

    adapter.send([part('a.txt')], request, asCallbacks);

    expect(calls[0].options.responseType).toBe('blob');
  });

  it('reports upload progress, with 0 for an unknown total', () => {
    const { adapter, events, request, callbacks, asCallbacks } = setup();
    adapter.send([part('a.txt')], request, asCallbacks);

    events.next({ type: 1, loaded: 40, total: 100 });
    events.next({ type: 1, loaded: 60 });

    expect(callbacks.progress.mock.calls).toEqual([
      [40, 100],
      [60, 0],
    ]);
    expect(callbacks.done).not.toHaveBeenCalled();
  });

  it('completes on the response event and ignores the other event types', () => {
    const { adapter, events, request, callbacks, asCallbacks } = setup();
    adapter.send([part('a.txt')], request, asCallbacks);

    events.next({ type: 0 });
    events.next({ type: 2, status: 200 });
    expect(callbacks.done).not.toHaveBeenCalled();
    expect(callbacks.progress).not.toHaveBeenCalled();

    events.next({ type: 4, body: { id: 7 }, status: 201 });

    expect(callbacks.done).toHaveBeenCalledWith({
      response: { id: 7 },
      httpStatus: 201,
    });
  });

  it('fails with the status and the body of an HTTP error', () => {
    const { adapter, events, request, callbacks, asCallbacks } = setup();
    adapter.send([part('a.txt')], request, asCallbacks);

    events.error({
      message: 'Payload too large',
      status: 413,
      error: { reason: 'size' },
    });

    expect(callbacks.fail).toHaveBeenCalledWith({
      message: 'Payload too large',
      httpStatus: 413,
      response: { reason: 'size' },
    });
  });

  it('fills in the gaps of an error without details', () => {
    const { adapter, events, request, callbacks, asCallbacks } = setup();
    adapter.send([part('a.txt')], request, asCallbacks);

    events.error({});

    expect(callbacks.fail).toHaveBeenCalledWith({
      message: 'Request failed',
      httpStatus: null,
      response: null,
    });
  });

  it('abort unsubscribes, so later events reach nobody', () => {
    const { adapter, events, request, callbacks, asCallbacks } = setup();
    const handle = adapter.send([part('a.txt')], request, asCallbacks);

    handle.abort();
    events.next({ type: 1, loaded: 10, total: 20 });
    events.next({ type: 4, body: null, status: 200 });

    expect(events.observed).toBe(false);
    expect(callbacks.progress).not.toHaveBeenCalled();
    expect(callbacks.done).not.toHaveBeenCalled();
  });

  it('remove posts the file names under the field name', () => {
    const { adapter, calls, events, request, callbacks, asCallbacks } = setup({
      method: 'delete',
    } as unknown as Partial<OgeUploadRequest>);

    adapter.remove(['a.txt', 'b.txt'], request, asCallbacks);
    events.next({ type: 4, body: null, status: 204 });

    expect(calls[0].method).toBe('DELETE');
    expect(calls[0].options.body.getAll('files')).toEqual(['a.txt', 'b.txt']);
    expect(callbacks.done).toHaveBeenCalledWith({
      response: null,
      httpStatus: 204,
    });
  });
});
