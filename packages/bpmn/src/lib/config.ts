import { computed, InjectionToken, type Provider } from '@angular/core';
import {
  OGE_DEFAULT_BPMN_CONFIG,
  resolveOgeBpmnConfig,
  type OgeBpmnConfig,
  type OgeBpmnConfigInput,
} from '@oge-ui/bpmn-engine';

// The message catalog, the config shape and its defaults are single-sourced
// in `@oge-ui/bpmn-engine`, shared with the React editor (ADR 0003); this
// file only adds the Angular DI face of them.
export {
  OGE_DEFAULT_BPMN_COLOR_PRESETS,
  OGE_DEFAULT_BPMN_CONFIG,
  OGE_DEFAULT_BPMN_MESSAGES,
  type BpmnElementNameKey,
  type BpmnPaletteItemType,
  type OgeBpmnAlignMessages,
  type OgeBpmnAnnouncementMessages,
  type OgeBpmnConfig,
  type OgeBpmnConfigInput,
  type OgeBpmnContextPadMessages,
  type OgeBpmnHeaderMessages,
  type OgeBpmnMessages,
  type OgeBpmnPropertiesMessages,
  type OgeBpmnSearchMessages,
  type OgeBpmnToolsMessages,
} from '@oge-ui/bpmn-engine';

export const OGE_BPMN_CONFIG = new InjectionToken<OgeBpmnConfig>(
  'OGE_BPMN_CONFIG',
  {
    factory: () => OGE_DEFAULT_BPMN_CONFIG,
  },
);

/**
 * Application- or component-scoped BPMN editor defaults:
 *
 * ```ts
 * providers: [
 *   provideOgeBpmnConfig({
 *     gridSize: 20,
 *     messages: { emptyText: 'Boş diyagram — paletten bir öğe seçin' },
 *   }),
 * ]
 * ```
 */
export function provideOgeBpmnConfig(
  config: OgeBpmnConfigInput | (() => OgeBpmnConfigInput),
): Provider {
  // a function makes the config live: components re-render when a signal it
  // reads changes — e.g. switching the UI language without a reload
  return typeof config === 'function'
    ? {
        provide: OGE_BPMN_CONFIG,
        useFactory: () =>
          ogeLiveConfig(() => resolveOgeBpmnConfig(config()), computed),
      }
    : { provide: OGE_BPMN_CONFIG, useValue: resolveOgeBpmnConfig(config) };
}

/** Local copy of `@oge-ui/core`'s `ogeLiveConfig` — this package has no other dependencies. */
function ogeLiveConfig<T extends object>(
  read: () => T,
  derive: <V>(compute: () => V) => () => V,
): T {
  const current = derive(read);
  const live = {} as T;
  for (const key of Object.keys(current()) as (keyof T)[]) {
    Object.defineProperty(live, key, {
      enumerable: true,
      get: () => current()[key],
    });
  }
  return live;
}
