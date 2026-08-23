/**
 * The default transport: `XMLHttpRequest`.
 *
 * XHR is not nostalgia. `xhr.upload.onprogress` is the only browser API that
 * reports *request-body* progress; `fetch` reports response progress only, and
 * streaming a request body needs `duplex: 'half'`, which is HTTP/2-only, absent
 * in Safari and Firefox, and still emits no progress events. Every reference
 * library reaches for XHR for exactly this reason, and abort comes free with
 * `xhr.abort()` — no `AbortController` needed.
 *
 * Framework-free by contract — see the `src/lib/engine` lint block.
 */
import type {
  OgeUploadAdapter,
  OgeUploadCallbacks,
  OgeUploadHandle,
  OgeUploadPart,
  OgeUploadRequest,
} from './transport-types';

/** Serializes one extra field into a `FormData` value. */
function appendData(form: FormData, key: string, value: unknown): void {
  if (value === undefined || value === null) {
    return;
  }
  if (value instanceof Blob) {
    form.append(key, value);
    return;
  }
  form.append(
    key,
    typeof value === 'object' ? JSON.stringify(value) : String(value),
  );
}

function parseResponse(xhr: XMLHttpRequest, expected: string): unknown {
  if (expected !== 'json') {
    return xhr.response as unknown;
  }
  // `responseType = 'json'` already parses, but a server that answers 200 with
  // an empty body leaves `response` null and that is not an error.
  if (xhr.response !== null && typeof xhr.response !== 'string') {
    return xhr.response as unknown;
  }
  const text = xhr.responseText;
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function open(
  request: OgeUploadRequest,
  body: FormData,
  callbacks: OgeUploadCallbacks,
): OgeUploadHandle {
  const xhr = new XMLHttpRequest();
  xhr.open(request.method.toUpperCase(), request.url, true);
  xhr.withCredentials = request.withCredentials;
  if (request.timeout !== undefined) {
    xhr.timeout = request.timeout;
  }
  // `blob` and `text` are handed to XHR directly; `json` is parsed by hand so
  // an empty 200 does not read as a failure.
  if (request.responseType === 'blob') {
    xhr.responseType = 'blob';
  }
  for (const [key, value] of Object.entries(request.headers)) {
    xhr.setRequestHeader(key, value);
  }

  let settled = false;
  const settle = (run: () => void) => {
    if (settled) {
      return;
    }
    settled = true;
    run();
  };

  xhr.upload.onprogress = (event) => {
    callbacks.progress(event.loaded, event.lengthComputable ? event.total : 0);
  };
  xhr.onload = () => {
    const response = parseResponse(xhr, request.responseType);
    settle(() => {
      if (xhr.status >= 200 && xhr.status < 300) {
        callbacks.done({ response, httpStatus: xhr.status });
      } else {
        callbacks.fail({
          message: xhr.statusText || `HTTP ${xhr.status}`,
          httpStatus: xhr.status,
          response,
        });
      }
    });
  };
  xhr.onerror = () =>
    settle(() =>
      callbacks.fail({
        message: 'Network error',
        httpStatus: null,
        response: null,
      }),
    );
  xhr.ontimeout = () =>
    settle(() =>
      callbacks.fail({
        message: 'Request timed out',
        httpStatus: null,
        response: null,
      }),
    );
  // An abort is the caller's own doing, so it settles the request without
  // reporting a failure the caller would have to filter back out.
  xhr.onabort = () => settle(() => undefined);

  xhr.send(body);

  return { abort: () => xhr.abort() };
}

function buildBody(
  parts: readonly OgeUploadPart[],
  request: OgeUploadRequest,
): FormData {
  const form = new FormData();
  for (const part of parts) {
    // `Blob.slice` is a zero-copy view, so a chunk costs nothing to build and
    // a 2 GB file is never read into memory.
    form.append(request.fieldName, part.blob, part.file.name);
    if (part.chunk) {
      form.append('metadata', JSON.stringify(part.chunk));
    }
  }
  for (const [key, value] of Object.entries(request.data)) {
    appendData(form, key, value);
  }
  return form;
}

/** The adapter used unless one is supplied. */
export function createXhrUploadAdapter(): OgeUploadAdapter {
  return {
    send(parts, request, callbacks) {
      return open(request, buildBody(parts, request), callbacks);
    },
    remove(names, request, callbacks) {
      const form = new FormData();
      for (const name of names) {
        form.append(request.fieldName, name);
      }
      for (const [key, value] of Object.entries(request.data)) {
        appendData(form, key, value);
      }
      return open(request, form, callbacks);
    },
  };
}
