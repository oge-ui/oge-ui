/**
 * The transfer state machine.
 *
 * A plain class, deliberately **not** reactive: it holds ordinary fields and
 * reports through one `onEvent` callback, which the Angular layer turns into a
 * single `signal.set()`. Per ADR 0001 the shared layers own no reactivity, so
 * this is also what lets a React render layer drive the same machine later.
 *
 * Framework-free by contract — see the `src/lib/engine` lint block.
 */
import { chunkedLoaded, planChunks, type OgeUploadChunk } from './chunk-plan';
import type {
  OgeUploadAdapter,
  OgeUploadHandle,
  OgeUploadPart,
  OgeUploadRequest,
} from './transport-types';

/** Chunk settings, already resolved from the boolean-or-options input. */
export interface OgeResolvedChunkOptions {
  readonly size: number;
  readonly autoRetryAfter: number;
  readonly maxAutoRetries: number;
  readonly resumable: boolean;
}

/** Whole-file retry settings, already resolved. */
export interface OgeResolvedRetryOptions {
  readonly count: number;
  readonly delayMs: number;
}

/** The timer seam, so specs need no wall clock. */
export interface OgeUploadTimers {
  setTimeout(handler: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

/** What the queue reports. One shape per thing the UI has to react to. */
export type OgeUploadQueueEvent =
  | { readonly type: 'started'; readonly uids: readonly string[] }
  | {
      readonly type: 'progress';
      readonly uid: string;
      readonly loaded: number;
      readonly total: number;
    }
  | {
      readonly type: 'chunkStarted';
      readonly uid: string;
      readonly index: number;
      readonly total: number;
    }
  | {
      readonly type: 'chunkDone';
      readonly uid: string;
      readonly index: number;
      readonly total: number;
      readonly response: unknown;
    }
  | {
      readonly type: 'chunkFailed';
      readonly uid: string;
      readonly index: number;
      readonly message: string;
    }
  | {
      readonly type: 'done';
      readonly uid: string;
      readonly response: unknown;
      readonly httpStatus: number;
    }
  | {
      readonly type: 'failed';
      readonly uid: string;
      readonly message: string;
      readonly httpStatus: number | null;
      readonly response: unknown;
    }
  | { readonly type: 'aborted'; readonly uid: string }
  | { readonly type: 'paused'; readonly uid: string }
  | { readonly type: 'resumed'; readonly uid: string }
  | { readonly type: 'idle' };

/** One file handed to the queue. */
export interface OgeUploadTask {
  readonly uid: string;
  readonly file: File;
}

export interface OgeUploadQueueOptions {
  readonly adapter: OgeUploadAdapter;
  /**
   * Builds the request for a set of files, or returns `null` to veto — this is
   * where the cancelable `uploading` event and its mutable request live.
   */
  readonly buildRequest: (
    tasks: readonly OgeUploadTask[],
    chunk: OgeUploadChunk | null,
    chunkTotal: number,
  ) => OgeUploadRequest | null;
  /** `1` is sequential — Kendo's `concurrent: false`, Syncfusion's `sequentialUpload`. */
  readonly concurrency: number;
  /** All files in one request. */
  readonly batch: boolean;
  readonly chunk: OgeResolvedChunkOptions | null;
  readonly autoRetry: OgeResolvedRetryOptions | null;
  readonly timers: OgeUploadTimers;
  readonly onEvent: (event: OgeUploadQueueEvent) => void;
}

/**
 * `waiting` is a distinct state, not a flavour of `queued`: a run serving out
 * its retry backoff must be invisible to `pump`, or the delay is skipped and
 * the failed file restarts instantly — ahead of the files behind it.
 */
type RunState = 'queued' | 'waiting' | 'running' | 'paused' | 'settled';

interface Run {
  readonly tasks: readonly OgeUploadTask[];
  state: RunState;
  handle: OgeUploadHandle | null;
  attempts: number;
  /** Chunk cursor; whole-file transfers keep a single-entry plan. */
  plan: readonly OgeUploadChunk[];
  chunkIndex: number;
  chunkRetries: number;
  timer: unknown;
}

/**
 * Runs transfers: concurrency limiting, batching, chunk sequencing with
 * resume-from-index, abort, and both retry flavours.
 */
export class UploadQueue {
  private readonly runs = new Map<string, Run>();
  /** Insertion order, so `concurrency: 1` really is first-in-first-out. */
  private readonly order: string[] = [];
  private disposed = false;

  constructor(private readonly options: OgeUploadQueueOptions) {}

  /** Queues files and starts as many as the concurrency budget allows. */
  enqueue(tasks: readonly OgeUploadTask[]): void {
    if (this.disposed || tasks.length === 0) {
      return;
    }

    const groups = this.options.batch
      ? [tasks]
      : tasks.map((task) => [task] as const);

    for (const group of groups) {
      const key = group[0].uid;
      if (this.runs.has(key)) {
        continue;
      }
      this.runs.set(key, {
        tasks: [...group],
        state: 'queued',
        handle: null,
        attempts: 0,
        plan: this.planFor(group),
        chunkIndex: 0,
        chunkRetries: 0,
        timer: null,
      });
      this.order.push(key);
    }

    this.pump();
  }

  /** Stops a transfer, or every transfer when no key is given. */
  abort(key?: string): void {
    const keys = key === undefined ? [...this.order] : [key];
    for (const current of keys) {
      const run = this.runs.get(current);
      if (!run || run.state === 'settled') {
        continue;
      }
      this.clearTimer(run);
      run.handle?.abort();
      run.handle = null;
      run.state = 'settled';
      for (const task of run.tasks) {
        this.options.onEvent({ type: 'aborted', uid: task.uid });
      }
    }
    this.pump();
  }

  /**
   * Suspends a chunked transfer between slices.
   *
   * Only meaningful when chunking is on and `resumable` — a whole-file request
   * has nothing to suspend, and pretending otherwise would mean aborting and
   * calling it a pause.
   */
  pause(key: string): boolean {
    const run = this.runs.get(key);
    if (!run || !this.canPause() || run.state === 'settled') {
      return false;
    }
    this.clearTimer(run);
    run.handle?.abort();
    run.handle = null;
    run.state = 'paused';
    this.emitEach(run, (uid) => ({ type: 'paused', uid }));
    this.pump();
    return true;
  }

  /** Picks a paused transfer up at the chunk it stopped on. */
  resume(key: string): boolean {
    const run = this.runs.get(key);
    if (!run || run.state !== 'paused') {
      return false;
    }
    run.state = 'queued';
    this.emitEach(run, (uid) => ({ type: 'resumed', uid }));
    this.pump();
    return true;
  }

  /** Restarts a settled transfer from the beginning. */
  retry(key: string): boolean {
    const run = this.runs.get(key);
    if (!run) {
      return false;
    }
    this.clearTimer(run);
    run.state = 'queued';
    run.attempts = 0;
    run.chunkIndex = 0;
    run.chunkRetries = 0;
    this.pump();
    return true;
  }

  /** `true` while anything is queued, running or paused. */
  get busy(): boolean {
    return [...this.runs.values()].some((run) => run.state !== 'settled');
  }

  /** Aborts everything and refuses further work. */
  dispose(): void {
    this.disposed = true;
    this.abort();
    this.runs.clear();
    this.order.length = 0;
  }

  // --- internals -------------------------------------------------------------

  private canPause(): boolean {
    return this.options.chunk !== null && this.options.chunk.resumable;
  }

  private planFor(tasks: readonly OgeUploadTask[]): readonly OgeUploadChunk[] {
    const chunk = this.options.chunk;
    // Batches are never chunked: a single request carrying slices of several
    // different files has no meaning on the server side.
    if (!chunk || tasks.length !== 1) {
      return [{ index: 0, start: 0, end: tasks[0]?.file.size ?? 0 }];
    }
    return planChunks(tasks[0].file.size, chunk.size);
  }

  private pump(): void {
    if (this.disposed) {
      return;
    }
    const running = [...this.runs.values()].filter(
      (run) => run.state === 'running',
    ).length;
    let budget = Math.max(1, this.options.concurrency) - running;

    for (const key of this.order) {
      if (budget <= 0) {
        break;
      }
      const run = this.runs.get(key);
      if (!run || run.state !== 'queued') {
        continue;
      }
      this.start(key, run);
      budget -= 1;
    }

    if (!this.busy) {
      this.options.onEvent({ type: 'idle' });
    }
  }

  private start(key: string, run: Run): void {
    const chunked = this.options.chunk !== null && run.plan.length > 1;
    const slice = chunked ? run.plan[run.chunkIndex] : null;
    if (chunked && !slice) {
      // Every slice is in; the transfer is finished.
      this.settleDone(run, null, 200);
      return;
    }

    const request = this.options.buildRequest(
      run.tasks,
      slice ?? null,
      run.plan.length,
    );
    if (!request) {
      // The `uploading` event vetoed it. Not a failure — the app said no.
      run.state = 'settled';
      this.pump();
      return;
    }

    run.state = 'running';
    run.attempts += 1;

    // `started` belongs here, not in `enqueue`: a file waiting behind the
    // concurrency limit has not started, and a retry has started again. Chunk
    // continuations are excluded — the transfer is already under way, and
    // `resumed` covers the one case where it needs re-announcing.
    if (run.chunkIndex === 0) {
      this.options.onEvent({
        type: 'started',
        uids: run.tasks.map((task) => task.uid),
      });
    }

    const parts = run.tasks.map<OgeUploadPart>((task) => ({
      uid: task.uid,
      file: task.file,
      blob: slice ? task.file.slice(slice.start, slice.end) : task.file,
      chunk: slice
        ? {
            contentType: task.file.type,
            fileName: task.file.name,
            fileSize: task.file.size,
            fileUid: task.uid,
            chunkIndex: slice.index,
            totalChunks: run.plan.length,
          }
        : null,
    }));

    if (slice) {
      this.emitEach(run, (uid) => ({
        type: 'chunkStarted',
        uid,
        index: slice.index,
        total: run.plan.length,
      }));
    }

    run.handle = this.options.adapter.send(parts, request, {
      progress: (loaded, total) => {
        if (run.state !== 'running') {
          return;
        }
        if (slice) {
          const done = chunkedLoaded(run.plan, run.chunkIndex, loaded);
          this.emitEach(run, (uid) => ({
            type: 'progress',
            uid,
            loaded: done,
            total: run.tasks[0].file.size,
          }));
          return;
        }
        this.emitEach(run, (uid) => ({ type: 'progress', uid, loaded, total }));
      },
      done: ({ response, httpStatus }) => {
        if (run.state !== 'running') {
          return;
        }
        run.handle = null;
        if (slice) {
          this.emitEach(run, (uid) => ({
            type: 'chunkDone',
            uid,
            index: slice.index,
            total: run.plan.length,
            response,
          }));
          run.chunkIndex += 1;
          run.chunkRetries = 0;
          if (run.chunkIndex >= run.plan.length) {
            this.settleDone(run, response, httpStatus);
            return;
          }
          // Straight on to the next slice, without giving up the slot.
          run.state = 'queued';
          this.pump();
          return;
        }
        this.settleDone(run, response, httpStatus);
      },
      fail: (error) => {
        if (run.state !== 'running') {
          return;
        }
        run.handle = null;
        if (slice) {
          this.emitEach(run, (uid) => ({
            type: 'chunkFailed',
            uid,
            index: slice.index,
            message: error.message,
          }));
          const limit = this.options.chunk?.maxAutoRetries ?? 0;
          if (run.chunkRetries < limit) {
            run.chunkRetries += 1;
            this.later(run, this.options.chunk?.autoRetryAfter ?? 0);
            return;
          }
        } else if (
          this.options.autoRetry &&
          run.attempts <= this.options.autoRetry.count
        ) {
          this.later(run, this.options.autoRetry.delayMs);
          return;
        }

        run.state = 'settled';
        this.emitEach(run, (uid) => ({
          type: 'failed',
          uid,
          message: error.message,
          httpStatus: error.httpStatus,
          response: error.response,
        }));
        this.pump();
      },
    });
  }

  /** Re-queues a run after a delay, through the injectable timer seam. */
  private later(run: Run, delay: number): void {
    run.state = 'waiting';
    this.clearTimer(run);
    run.timer = this.options.timers.setTimeout(() => {
      run.timer = null;
      if (run.state === 'waiting') {
        run.state = 'queued';
      }
      this.pump();
    }, delay);
    // The slot is freed while waiting, so a retry never blocks other files.
    this.pump();
  }

  private settleDone(run: Run, response: unknown, httpStatus: number): void {
    run.state = 'settled';
    run.handle = null;
    this.emitEach(run, (uid) => ({ type: 'done', uid, response, httpStatus }));
    this.pump();
  }

  private emitEach(
    run: Run,
    build: (uid: string) => OgeUploadQueueEvent,
  ): void {
    for (const task of run.tasks) {
      this.options.onEvent(build(task.uid));
    }
  }

  private clearTimer(run: Run): void {
    if (run.timer !== null) {
      this.options.timers.clearTimeout(run.timer);
      run.timer = null;
    }
  }
}
