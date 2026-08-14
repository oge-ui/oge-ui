import type {
  OgeUploadAdapter,
  OgeUploadCallbacks,
  OgeUploadPart,
  OgeUploadRequest,
} from './transport-types';
import {
  UploadQueue,
  type OgeUploadQueueEvent,
  type OgeUploadTimers,
} from './upload-queue';

const REQUEST: OgeUploadRequest = {
  url: '/api/upload',
  method: 'post',
  headers: {},
  data: {},
  fieldName: 'files[]',
  withCredentials: false,
  responseType: 'json',
};

const makeFile = (name: string, size: number) => {
  const file = new File(['x'], name, { type: 'text/plain' });
  Object.defineProperty(file, 'size', { value: size });
  // jsdom's `slice` is fine, but the queue only needs the byte range back.
  Object.defineProperty(file, 'slice', {
    value: (start: number, end: number) =>
      ({ start, end, size: end - start }) as unknown as Blob,
  });
  return file;
};

/** A transport under the spec's control: nothing resolves until it is told. */
function fakeAdapter() {
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

/** Timers the spec advances by hand, so nothing depends on a wall clock. */
function fakeTimers() {
  const pending: { run: () => void; delay: number }[] = [];
  const timers: OgeUploadTimers = {
    setTimeout: (handler, ms) => {
      const entry = { run: handler, delay: ms };
      pending.push(entry);
      return entry;
    },
    clearTimeout: (handle) => {
      const index = pending.indexOf(handle as (typeof pending)[number]);
      if (index >= 0) pending.splice(index, 1);
    },
  };
  return {
    timers,
    get count() {
      return pending.length;
    },
    flush() {
      const due = pending.splice(0, pending.length);
      for (const entry of due) entry.run();
    },
  };
}

function setup(
  overrides: Partial<Parameters<typeof UploadQueue.prototype.constructor>[0]> &
    Record<string, unknown> = {},
) {
  const transport = fakeAdapter();
  const clock = fakeTimers();
  const events: OgeUploadQueueEvent[] = [];

  const queue = new UploadQueue({
    adapter: transport.adapter,
    buildRequest: () => REQUEST,
    concurrency: 3,
    batch: false,
    chunk: null,
    autoRetry: null,
    timers: clock.timers,
    onEvent: (event) => events.push(event),
    ...overrides,
  });

  return { queue, transport, clock, events };
}

const typesOf = (events: readonly OgeUploadQueueEvent[]) =>
  events.map((event) => event.type);

describe('UploadQueue — whole-file transfers', () => {
  it('sends one request per file', () => {
    const { queue, transport } = setup();
    queue.enqueue([
      { uid: 'a', file: makeFile('a.txt', 10) },
      { uid: 'b', file: makeFile('b.txt', 10) },
    ]);

    expect(transport.calls).toHaveLength(2);
    expect(transport.calls[0].parts[0].chunk).toBeNull();
  });

  it('sends one request for the whole batch when batching', () => {
    const { queue, transport } = setup({ batch: true });
    queue.enqueue([
      { uid: 'a', file: makeFile('a.txt', 10) },
      { uid: 'b', file: makeFile('b.txt', 10) },
    ]);

    expect(transport.calls).toHaveLength(1);
    expect(transport.calls[0].parts.map((p) => p.uid)).toEqual(['a', 'b']);
  });

  it('honours the concurrency budget and starts the next as one finishes', () => {
    const { queue, transport } = setup({ concurrency: 1 });
    queue.enqueue([
      { uid: 'a', file: makeFile('a.txt', 10) },
      { uid: 'b', file: makeFile('b.txt', 10) },
    ]);

    expect(transport.calls).toHaveLength(1);
    transport.calls[0].callbacks.done({ response: null, httpStatus: 200 });
    expect(transport.calls).toHaveLength(2);
  });

  it('announces a start only when a request actually goes out', () => {
    const { queue, transport, events } = setup({ concurrency: 1 });
    queue.enqueue([
      { uid: 'a', file: makeFile('a.txt', 10) },
      { uid: 'b', file: makeFile('b.txt', 10) },
    ]);

    // b is behind the concurrency limit, so it has not started — reporting it
    // as started would show two rows uploading while one request is in flight.
    expect(events.filter((e) => e.type === 'started')).toHaveLength(1);

    transport.calls[0].callbacks.done({ response: null, httpStatus: 200 });
    expect(events.filter((e) => e.type === 'started')).toHaveLength(2);
  });

  it('announces a start again on a retry', () => {
    const { queue, transport, events } = setup();
    queue.enqueue([{ uid: 'a', file: makeFile('a.txt', 10) }]);
    transport.calls[0].callbacks.fail({
      message: 'nope',
      httpStatus: 500,
      response: null,
    });

    queue.retry('a');

    expect(events.filter((e) => e.type === 'started')).toHaveLength(2);
  });

  it('reports progress, completion and then idle', () => {
    const { queue, transport, events } = setup();
    queue.enqueue([{ uid: 'a', file: makeFile('a.txt', 100) }]);

    transport.calls[0].callbacks.progress(50, 100);
    transport.calls[0].callbacks.done({ response: { ok: 1 }, httpStatus: 201 });

    expect(typesOf(events)).toEqual(['started', 'progress', 'done', 'idle']);
    const done = events.find((e) => e.type === 'done');
    expect(done).toMatchObject({ uid: 'a', httpStatus: 201 });
  });

  it('reports a failure with its status', () => {
    const { queue, transport, events } = setup();
    queue.enqueue([{ uid: 'a', file: makeFile('a.txt', 10) }]);

    transport.calls[0].callbacks.fail({
      message: 'Boom',
      httpStatus: 500,
      response: null,
    });

    expect(events.find((e) => e.type === 'failed')).toMatchObject({
      uid: 'a',
      message: 'Boom',
      httpStatus: 500,
    });
  });

  it('vetoes the transfer when buildRequest returns null', () => {
    const { queue, transport, events } = setup({ buildRequest: () => null });
    queue.enqueue([{ uid: 'a', file: makeFile('a.txt', 10) }]);

    expect(transport.calls).toHaveLength(0);
    // A veto is the app saying no, not a failure it would have to filter out.
    expect(typesOf(events)).not.toContain('failed');
  });

  it('aborts the request and says so', () => {
    const { queue, transport, events } = setup();
    queue.enqueue([{ uid: 'a', file: makeFile('a.txt', 10) }]);

    queue.abort('a');

    expect(transport.calls[0].aborted).toBe(true);
    expect(typesOf(events)).toContain('aborted');
  });

  it('ignores a late callback from an aborted request', () => {
    const { queue, transport, events } = setup();
    queue.enqueue([{ uid: 'a', file: makeFile('a.txt', 10) }]);
    queue.abort('a');

    transport.calls[0].callbacks.done({ response: null, httpStatus: 200 });

    expect(typesOf(events)).not.toContain('done');
  });

  it('is no longer busy once everything settles', () => {
    const { queue, transport } = setup();
    queue.enqueue([{ uid: 'a', file: makeFile('a.txt', 10) }]);
    expect(queue.busy).toBe(true);

    transport.calls[0].callbacks.done({ response: null, httpStatus: 200 });
    expect(queue.busy).toBe(false);
  });
});

describe('UploadQueue — retry', () => {
  it('retries a failure up to the configured count, then gives up', () => {
    const { queue, transport, clock, events } = setup({
      autoRetry: { count: 2, delayMs: 500 },
    });
    queue.enqueue([{ uid: 'a', file: makeFile('a.txt', 10) }]);

    const failCurrent = () =>
      transport.calls.at(-1)?.callbacks.fail({
        message: 'nope',
        httpStatus: 500,
        response: null,
      });

    failCurrent();
    clock.flush();
    failCurrent();
    clock.flush();
    expect(transport.calls).toHaveLength(3); // first try plus two retries

    failCurrent();
    expect(clock.count).toBe(0);
    expect(typesOf(events)).toContain('failed');
  });

  it('frees the slot while a retry waits', () => {
    const { queue, transport } = setup({
      concurrency: 1,
      autoRetry: { count: 1, delayMs: 500 },
    });
    queue.enqueue([
      { uid: 'a', file: makeFile('a.txt', 10) },
      { uid: 'b', file: makeFile('b.txt', 10) },
    ]);

    transport.calls[0].callbacks.fail({
      message: 'nope',
      httpStatus: 500,
      response: null,
    });

    // b starts immediately rather than waiting out a's backoff — and a does
    // not jump the queue by restarting before its delay has elapsed.
    expect(transport.calls).toHaveLength(2);
    expect(transport.calls[1].parts[0].uid).toBe('b');
  });

  it('waits out the backoff instead of restarting at once', () => {
    const { queue, transport, clock } = setup({
      autoRetry: { count: 1, delayMs: 500 },
    });
    queue.enqueue([{ uid: 'a', file: makeFile('a.txt', 10) }]);
    transport.calls[0].callbacks.fail({
      message: 'nope',
      httpStatus: 500,
      response: null,
    });

    expect(transport.calls).toHaveLength(1);
    clock.flush();
    expect(transport.calls).toHaveLength(2);
  });

  it('restarts a settled transfer on demand', () => {
    const { queue, transport } = setup();
    queue.enqueue([{ uid: 'a', file: makeFile('a.txt', 10) }]);
    transport.calls[0].callbacks.fail({
      message: 'nope',
      httpStatus: 500,
      response: null,
    });

    expect(queue.retry('a')).toBe(true);
    expect(transport.calls).toHaveLength(2);
  });
});

describe('UploadQueue — chunked transfers', () => {
  const chunk = {
    size: 100,
    autoRetryAfter: 10,
    maxAutoRetries: 1,
    resumable: true,
  };

  it('sends one request per slice, in order, with Kendo-shaped metadata', () => {
    const { queue, transport } = setup({ chunk });
    queue.enqueue([{ uid: 'a', file: makeFile('a.txt', 250) }]);

    expect(transport.calls).toHaveLength(1);
    expect(transport.calls[0].parts[0].chunk).toMatchObject({
      fileName: 'a.txt',
      fileSize: 250,
      fileUid: 'a',
      chunkIndex: 0,
      totalChunks: 3,
    });

    transport.calls[0].callbacks.done({ response: null, httpStatus: 200 });
    expect(transport.calls[1].parts[0].chunk?.chunkIndex).toBe(1);
  });

  it('reports progress against the whole file, not the slice', () => {
    const { queue, transport, events } = setup({ chunk });
    queue.enqueue([{ uid: 'a', file: makeFile('a.txt', 250) }]);

    transport.calls[0].callbacks.done({ response: null, httpStatus: 200 });
    transport.calls[1].callbacks.progress(40, 100);

    const progress = events.filter((e) => e.type === 'progress').at(-1);
    expect(progress).toMatchObject({ loaded: 140, total: 250 });
  });

  it('finishes only after the last slice', () => {
    const { queue, transport, events } = setup({ chunk });
    queue.enqueue([{ uid: 'a', file: makeFile('a.txt', 250) }]);

    for (let i = 0; i < 3; i++) {
      expect(typesOf(events)).not.toContain('done');
      transport.calls[i].callbacks.done({ response: null, httpStatus: 200 });
    }

    expect(typesOf(events)).toContain('done');
  });

  it('retries only the failed slice', () => {
    const { queue, transport, clock } = setup({ chunk });
    queue.enqueue([{ uid: 'a', file: makeFile('a.txt', 250) }]);

    transport.calls[0].callbacks.done({ response: null, httpStatus: 200 });
    transport.calls[1].callbacks.fail({
      message: 'flaky',
      httpStatus: 500,
      response: null,
    });
    clock.flush();

    expect(transport.calls).toHaveLength(3);
    expect(transport.calls[2].parts[0].chunk?.chunkIndex).toBe(1);
  });

  it('resumes at the slice it paused on', () => {
    const { queue, transport, events } = setup({ chunk });
    queue.enqueue([{ uid: 'a', file: makeFile('a.txt', 250) }]);
    transport.calls[0].callbacks.done({ response: null, httpStatus: 200 });

    expect(queue.pause('a')).toBe(true);
    expect(transport.calls[1].aborted).toBe(true);

    queue.resume('a');

    // Slice 1 again — not slice 0, and not slice 2.
    expect(transport.calls.at(-1)?.parts[0].chunk?.chunkIndex).toBe(1);
    expect(typesOf(events)).toContain('paused');
    expect(typesOf(events)).toContain('resumed');
  });

  it('refuses to pause when resumable is off', () => {
    const { queue } = setup({ chunk: { ...chunk, resumable: false } });
    queue.enqueue([{ uid: 'a', file: makeFile('a.txt', 250) }]);

    // A whole-file request has nothing to suspend; calling an abort a "pause"
    // would be a lie the UI would then have to explain.
    expect(queue.pause('a')).toBe(false);
  });

  it('never chunks a batch', () => {
    const { queue, transport } = setup({ chunk, batch: true });
    queue.enqueue([
      { uid: 'a', file: makeFile('a.txt', 250) },
      { uid: 'b', file: makeFile('b.txt', 250) },
    ]);

    // Slices of two different files in one request have no server-side meaning.
    expect(transport.calls[0].parts[0].chunk).toBeNull();
  });
});

describe('UploadQueue — disposal', () => {
  it('aborts everything in flight', () => {
    const { queue, transport } = setup();
    queue.enqueue([{ uid: 'a', file: makeFile('a.txt', 10) }]);

    queue.dispose();

    expect(transport.calls[0].aborted).toBe(true);
    expect(queue.busy).toBe(false);
  });

  it('accepts no further work', () => {
    const { queue, transport } = setup();
    queue.dispose();
    queue.enqueue([{ uid: 'a', file: makeFile('a.txt', 10) }]);

    expect(transport.calls).toHaveLength(0);
  });
});
