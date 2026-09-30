import { computed, InjectionToken, type Provider } from '@angular/core';
import { ogeLiveConfig } from '@oge-ui/core';
import {
  OGE_DEFAULT_GANTT_CONFIG,
  resolveGanttConfig,
  type OgeGanttConfig,
  type OgeGanttConfigInput,
} from '@oge-ui/gantt-engine';

// The message catalog, the config shape and its defaults are single-sourced
// in `@oge-ui/gantt-engine`, so the Angular and React Gantt cannot drift
// (ADR 0003); re-exported so this package's public API is unchanged.
export {
  OGE_DEFAULT_GANTT_CONFIG,
  OGE_DEFAULT_GANTT_MESSAGES,
  type OgeGanttAnnouncementMessages,
  type OgeGanttColumnMessages,
  type OgeGanttConfig,
  type OgeGanttConfigInput,
  type OgeGanttDialogMessages,
  type OgeGanttGridMessages,
  type OgeGanttMenuMessages,
  type OgeGanttMessages,
  type OgeGanttToolbarMessages,
} from '@oge-ui/gantt-engine';

export const OGE_GANTT_CONFIG = new InjectionToken<OgeGanttConfig>(
  'OGE_GANTT_CONFIG',
  { factory: () => OGE_DEFAULT_GANTT_CONFIG },
);

/**
 * Configures every `<oge-gantt>` below the provider; shallow merge per
 * top-level key (a partial `messages` replaces whole nested blocks).
 */
export function provideOgeGanttConfig(
  config: OgeGanttConfigInput | (() => OgeGanttConfigInput),
): Provider {
  // a function makes the config live: components re-render when a signal it
  // reads changes — e.g. switching the UI language without a reload
  return typeof config === 'function'
    ? {
        provide: OGE_GANTT_CONFIG,
        useFactory: () =>
          ogeLiveConfig(() => resolveGanttConfig(config()), computed),
      }
    : { provide: OGE_GANTT_CONFIG, useValue: resolveGanttConfig(config) };
}
