import { Injectable, signal } from '@angular/core';
import type {
  OgeUploadAdapter,
  OgeUploadCallbacks,
  OgeUploadHandle,
  OgeUploadPart,
  OgeUploadRequest,
} from '@oge-ui/upload';

/**
 * In-browser stand-in for an upload endpoint, modelled on
 * {@link FakeEmployeeServer}.
 *
 * Two reasons the demos need it. This site is a static deploy, so a real
 * `POST /api/upload` is answered by the SPA rewrite with a **200** — a demo on
 * the real transport would appear to succeed while doing nothing, which is
 * worse than not demonstrating uploads at all. And a scripted server can be
 * told to drop the third chunk, which is the only way to show retry and
 * resume without asking the reader to unplug their network.
 *
 * Every request is logged into a signal the page renders, so what would go
 * over the wire is visible — and is what the e2e spec asserts on.
 */
@Injectable({ providedIn: 'root' })
export class FakeUploadServer {
  /** Rendered by the demo page; the e2e assertion surface. */
  readonly requestLog = signal<readonly string[]>([]);

  /** Fails the chunk (or, unchunked, the file) at this 0-based index once. */
  readonly failAt = signal<number | null>(null);

  /** Milliseconds per simulated progress tick. */
  readonly tickMs = signal(120);

  private readonly alreadyFailed = new Set<string>();

  clearLog(): void {
    this.requestLog.set([]);
    this.alreadyFailed.clear();
  }

  /** The adapter to bind to `[uploadAdapter]`. */
  adapter(): OgeUploadAdapter {
    return {
      send: (parts, request, callbacks) =>
        this.transfer(parts, request, callbacks),
      remove: (names, request, callbacks) => {
        this.log(
          `${request.method.toUpperCase()} ${request.url} → ${names.join(', ')}`,
        );
        callbacks.done({ response: { removed: names }, httpStatus: 200 });
        return { abort: () => undefined };
      },
    };
  }

  private transfer(
    parts: readonly OgeUploadPart[],
    request: OgeUploadRequest,
    callbacks: OgeUploadCallbacks,
  ): OgeUploadHandle {
    const first = parts[0];
    const chunk = first?.chunk ?? null;
    const total = parts.reduce((sum, part) => sum + part.blob.size, 0);
    const label = parts.map((part) => part.file.name).join(', ');

    this.log(
      chunk
        ? `${request.method.toUpperCase()} ${request.url} — ${label} chunk ${chunk.chunkIndex + 1}/${chunk.totalChunks}`
        : `${request.method.toUpperCase()} ${request.url} — ${label} (${total} bytes)`,
    );

    const failIndex = this.failAt();
    const key = `${first?.uid ?? ''}#${chunk?.chunkIndex ?? 0}`;
    const shouldFail =
      failIndex !== null &&
      (chunk?.chunkIndex ?? 0) === failIndex &&
      !this.alreadyFailed.has(key);

    let sent = 0;
    let cancelled = false;
    const step = Math.max(1, Math.round(total / 4));

    const tick = () => {
      if (cancelled) {
        return;
      }
      sent = Math.min(total, sent + step);
      callbacks.progress(sent, total);

      if (sent < total) {
        setTimeout(tick, this.tickMs());
        return;
      }
      if (shouldFail) {
        // Once only, so a retry succeeds and the demo tells a whole story.
        this.alreadyFailed.add(key);
        this.log(`  ↳ 503 (scripted failure)`);
        callbacks.fail({
          message: 'Service unavailable',
          httpStatus: 503,
          response: null,
        });
        return;
      }
      callbacks.done({ response: { ok: true, name: label }, httpStatus: 201 });
    };

    setTimeout(tick, this.tickMs());

    return {
      abort: () => {
        cancelled = true;
        this.log(`  ↳ aborted`);
      },
    };
  }

  private log(entry: string): void {
    this.requestLog.update((entries) => [...entries, entry]);
  }
}
