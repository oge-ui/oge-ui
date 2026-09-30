import { computed, InjectionToken, type Provider } from '@angular/core';
import { ogeLiveConfig } from '@oge-ui/core';
import {
  OGE_DEFAULT_KANBAN_CONFIG,
  resolveOgeKanbanConfig,
  type OgeKanbanConfig,
  type OgeKanbanConfigInput,
} from '@oge-ui/kanban-engine';

// The message catalog, the config shape and its defaults are single-sourced
// in `@oge-ui/kanban-engine`, so the two render layers cannot drift
// (ADR 0003); re-exported so Angular consumers import one package.
export {
  OGE_DEFAULT_KANBAN_CONFIG,
  OGE_DEFAULT_KANBAN_MESSAGES,
  type OgeKanbanAnnouncementMessages,
  type OgeKanbanBoardMessages,
  type OgeKanbanConfig,
  type OgeKanbanConfigInput,
  type OgeKanbanDialogMessages,
  type OgeKanbanMenuMessages,
  type OgeKanbanMessages,
  type OgeKanbanToolbarMessages,
} from '@oge-ui/kanban-engine';

export const OGE_KANBAN_CONFIG = new InjectionToken<OgeKanbanConfig>(
  'OGE_KANBAN_CONFIG',
  { factory: () => OGE_DEFAULT_KANBAN_CONFIG },
);

/**
 * Configures every `<oge-kanban>` below the provider; shallow merge per
 * top-level key (a partial `messages` replaces whole nested blocks).
 */
export function provideOgeKanbanConfig(
  config: OgeKanbanConfigInput | (() => OgeKanbanConfigInput),
): Provider {
  // a function makes the config live: components re-render when a signal it
  // reads changes — e.g. switching the UI language without a reload
  return typeof config === 'function'
    ? {
        provide: OGE_KANBAN_CONFIG,
        useFactory: () =>
          ogeLiveConfig(() => resolveOgeKanbanConfig(config()), computed),
      }
    : { provide: OGE_KANBAN_CONFIG, useValue: resolveOgeKanbanConfig(config) };
}
