import { InjectionToken } from '@angular/core';
import { createXhrUploadAdapter } from './engine/xhr-adapter';
import type { OgeUploadAdapter } from './engine/transport-types';

/**
 * The transport every uploader resolves unless one is bound to `uploadAdapter`.
 *
 * A token rather than a hard-wired `new XMLHttpRequest()` for two reasons that
 * are not theoretical: jsdom's XHR performs real network I/O, so a spec that
 * reached it would hang rather than assert; and the docs site is a static
 * deploy where `POST /api/upload` is answered by the SPA rewrite with a 200,
 * so a demo on the real transport would appear to succeed while doing nothing.
 * Both want a substitute, and both get one here.
 */
export const OGE_UPLOAD_TRANSPORT = new InjectionToken<OgeUploadAdapter>(
  'OGE_UPLOAD_TRANSPORT',
  { factory: () => createXhrUploadAdapter() },
);
