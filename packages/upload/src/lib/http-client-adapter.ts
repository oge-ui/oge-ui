import type { HttpClient, HttpEvent } from '@angular/common/http';
import type {
  OgeUploadAdapter,
  OgeUploadCallbacks,
  OgeUploadHandle,
  OgeUploadPart,
  OgeUploadRequest,
} from './engine/transport-types';

/**
 * An adapter over Angular's `HttpClient`, for apps whose auth token is added
 * by an interceptor.
 *
 * The default transport is deliberately raw XHR: `HttpClient` progress means
 * `reportProgress: true` and an rxjs `Observable`, and the engine is required
 * to stay framework-free and non-reactive (ADR 0001). Losing interceptors is a
 * real cost though, so this file — the one place in the package allowed to
 * know about `HttpClient` — buys them back for one line of consumer code:
 *
 * ```ts
 * protected readonly adapter = createHttpClientUploadAdapter(inject(HttpClient));
 * ```
 * ```html
 * <oge-file-uploader [uploadAdapter]="adapter" uploadUrl="/api/upload" />
 * ```
 *
 * `HttpClient` is not a dependency of this package: the function takes the
 * client as an argument, so an app that never calls it never pulls
 * `@angular/common/http` in.
 */
export function createHttpClientUploadAdapter(
  http: HttpClient,
): OgeUploadAdapter {
  const send = (
    body: FormData,
    request: OgeUploadRequest,
    callbacks: OgeUploadCallbacks,
  ): OgeUploadHandle => {
    const subscription = http
      .request(request.method.toUpperCase(), request.url, {
        body,
        headers: request.headers,
        withCredentials: request.withCredentials,
        reportProgress: true,
        observe: 'events',
        // `HttpClient` parses JSON itself; blob and text are passed through.
        responseType: request.responseType === 'blob' ? 'blob' : 'json',
      })
      .subscribe({
        next: (event: HttpEvent<unknown>) => {
          // 1 = UploadProgress, 4 = Response. The numeric literals avoid
          // importing the `HttpEventType` enum as a runtime value, which would
          // make @angular/common/http a real dependency of this package.
          if (event.type === 1) {
            callbacks.progress(event.loaded, event.total ?? 0);
            return;
          }
          if (event.type === 4) {
            callbacks.done({
              response: event.body,
              httpStatus: event.status,
            });
          }
        },
        error: (error: {
          message?: string;
          status?: number;
          error?: unknown;
        }) =>
          callbacks.fail({
            message: error.message ?? 'Request failed',
            httpStatus: error.status ?? null,
            response: error.error ?? null,
          }),
      });

    return { abort: () => subscription.unsubscribe() };
  };

  const buildBody = (
    parts: readonly OgeUploadPart[],
    request: OgeUploadRequest,
  ) => {
    const form = new FormData();
    for (const part of parts) {
      form.append(request.fieldName, part.blob, part.file.name);
      if (part.chunk) {
        form.append('metadata', JSON.stringify(part.chunk));
      }
    }
    for (const [key, value] of Object.entries(request.data)) {
      if (value === undefined || value === null) continue;
      form.append(
        key,
        typeof value === 'object' ? JSON.stringify(value) : String(value),
      );
    }
    return form;
  };

  return {
    send: (parts, request, callbacks) =>
      send(buildBody(parts, request), request, callbacks),
    remove: (names, request, callbacks) => {
      const form = new FormData();
      for (const name of names) {
        form.append(request.fieldName, name);
      }
      return send(form, request, callbacks);
    },
  };
}
