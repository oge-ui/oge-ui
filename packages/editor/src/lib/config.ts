import { computed, InjectionToken, type Provider } from '@angular/core';
import {
  OGE_DEFAULT_EDITOR_CONFIG,
  ogeLiveConfig,
  resolveOgeEditorConfig,
  type OgeEditorConfig,
  type OgeEditorConfigInput,
} from '@oge-ui/behavior';

// The message catalog, the config shape and its defaults are single-sourced
// in `@oge-ui/behavior` so the React editor ships the exact same strings and
// defaults (ADR 0001); re-exported so `@oge-ui/editor` is the Angular import
// path.
export {
  OGE_DEFAULT_EDITOR_CONFIG,
  OGE_DEFAULT_EDITOR_MESSAGES,
  type OgeEditorAnnouncementMessages,
  type OgeEditorBlockMessages,
  type OgeEditorColorMessages,
  type OgeEditorConfig,
  type OgeEditorConfigInput,
  type OgeEditorCounterMessages,
  type OgeEditorDialogMessages,
  type OgeEditorKeyMessages,
  type OgeEditorMessages,
  type OgeEditorMessagesInput,
  type OgeEditorToolMessages,
  type OgeEditorValidationMessages,
} from '@oge-ui/behavior';

/** Injection token every editor reads its defaults from. */
export const OGE_EDITOR_CONFIG = new InjectionToken<OgeEditorConfig>(
  'OGE_EDITOR_CONFIG',
  { factory: () => OGE_DEFAULT_EDITOR_CONFIG },
);

/**
 * Overrides the editor defaults for an application or a route.
 *
 * ```ts
 * provideOgeEditorConfig({
 *   headingLevels: [2, 3],
 *   pasteMode: 'text',
 *   messages: { tools: { bold: 'Kalın' } },
 * })
 * ```
 */
export function provideOgeEditorConfig(
  config: OgeEditorConfigInput | (() => OgeEditorConfigInput),
): Provider {
  // a function makes the config live: editors re-render when a signal it
  // reads changes — e.g. switching the UI language without a reload
  return typeof config === 'function'
    ? {
        provide: OGE_EDITOR_CONFIG,
        useFactory: () =>
          ogeLiveConfig(() => resolveOgeEditorConfig(config()), computed),
      }
    : { provide: OGE_EDITOR_CONFIG, useValue: resolveOgeEditorConfig(config) };
}
