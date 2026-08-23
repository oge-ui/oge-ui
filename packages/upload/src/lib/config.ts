import { InjectionToken, type Provider } from '@angular/core';
import {
  OGE_DEFAULT_UPLOAD_CONFIG,
  resolveUploadConfig,
  type OgeUploadConfig,
  type OgeUploadConfigInput,
} from '@oge-ui/behavior';

// The message catalog, the config shape and its defaults are single-sourced
// in `@oge-ui/behavior` so the React uploader ships the exact same strings and
// defaults (ADR 0001); re-exported so `@oge-ui/upload` remains the Angular
// import path.
export {
  OGE_DEFAULT_UPLOAD_CONFIG,
  OGE_DEFAULT_UPLOAD_MESSAGES,
  type OgeUploadAnnouncementMessages,
  type OgeUploadButtonMessages,
  type OgeUploadConfig,
  type OgeUploadConfigInput,
  type OgeUploadDropZoneMessages,
  type OgeUploadMessages,
  type OgeUploadMessagesInput,
  type OgeUploadStatusMessages,
  type OgeUploadValidationMessages,
} from '@oge-ui/behavior';

/** Injection token every uploader reads its defaults from. */
export const OGE_UPLOAD_CONFIG = new InjectionToken<OgeUploadConfig>(
  'OGE_UPLOAD_CONFIG',
  { factory: () => OGE_DEFAULT_UPLOAD_CONFIG },
);

/**
 * Overrides the uploader defaults for an application or a route.
 *
 * ```ts
 * provideOgeUploadConfig({
 *   concurrency: 1,
 *   messages: { buttons: { select: 'Dosya seç' } },
 * })
 * ```
 */
export function provideOgeUploadConfig(config: OgeUploadConfigInput): Provider {
  return {
    provide: OGE_UPLOAD_CONFIG,
    useValue: resolveUploadConfig(config),
  };
}
