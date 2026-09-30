import { computed, InjectionToken, type Provider } from '@angular/core';
import { ogeLiveConfig } from '@oge-ui/core';
import {
  OGE_DEFAULT_SCHEDULER_CONFIG,
  resolveOgeSchedulerConfig,
  type OgeSchedulerConfig,
  type OgeSchedulerConfigInput,
} from '@oge-ui/scheduler-engine';

// The message catalog, the config shape and its defaults are single-sourced
// in `@oge-ui/scheduler-engine`, shared with `@oge-ui/react-scheduler`
// (ADR 0003); re-exported so every import path of this package is unchanged.
export {
  OGE_DEFAULT_SCHEDULER_CONFIG,
  OGE_DEFAULT_SCHEDULER_MESSAGES,
  type OgeSchedulerAnnouncementMessages,
  type OgeSchedulerConfig,
  type OgeSchedulerConfigInput,
  type OgeSchedulerEditorMessages,
  type OgeSchedulerGridMessages,
  type OgeSchedulerMenuMessages,
  type OgeSchedulerMessages,
  type OgeSchedulerPopupMessages,
  type OgeSchedulerRecurrenceScopeMessages,
  type OgeSchedulerToolbarMessages,
} from '@oge-ui/scheduler-engine';

export const OGE_SCHEDULER_CONFIG = new InjectionToken<OgeSchedulerConfig>(
  'OGE_SCHEDULER_CONFIG',
  {
    factory: () => OGE_DEFAULT_SCHEDULER_CONFIG,
  },
);

/**
 * Configures every `<oge-scheduler>` below the provider. The merge is
 * shallow per top-level key: a partial `messages` replaces whole nested
 * blocks (`toolbar`, `editor`, …), not individual strings.
 *
 * ```ts
 * providers: [
 *   provideOgeSchedulerConfig({
 *     messages: { toolbar: { ...OGE_DEFAULT_SCHEDULER_MESSAGES.toolbar, today: 'Now' } },
 *   }),
 * ]
 * ```
 */
export function provideOgeSchedulerConfig(
  config: OgeSchedulerConfigInput | (() => OgeSchedulerConfigInput),
): Provider {
  // a function makes the config live: components re-render when a signal it
  // reads changes — e.g. switching the UI language without a reload
  return typeof config === 'function'
    ? {
        provide: OGE_SCHEDULER_CONFIG,
        useFactory: () =>
          ogeLiveConfig(() => resolveOgeSchedulerConfig(config()), computed),
      }
    : {
        provide: OGE_SCHEDULER_CONFIG,
        useValue: resolveOgeSchedulerConfig(config),
      };
}
