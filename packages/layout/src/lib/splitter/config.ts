import { InjectionToken, type Provider } from '@angular/core';
import {
  OGE_DEFAULT_SPLITTER_CONFIG,
  resolveOgeSplitterConfig,
  type OgeSplitterConfig,
  type OgeSplitterConfigInput,
} from '@oge-ui/behavior';

// The message catalog, the defaults and the merge rule live framework-free in
// `@oge-ui/behavior` (`splitter-core`), shared with the React render layer;
// this file is only the Angular DI wrapper around them.
export {
  OGE_DEFAULT_SPLITTER_MESSAGES,
  OGE_DEFAULT_SPLITTER_CONFIG,
  type OgeSplitterMessages,
  type OgeSplitterConfig,
  type OgeSplitterConfigInput,
} from '@oge-ui/behavior';

export const OGE_SPLITTER_CONFIG = new InjectionToken<OgeSplitterConfig>(
  'OGE_SPLITTER_CONFIG',
  {
    factory: () => OGE_DEFAULT_SPLITTER_CONFIG,
  },
);

/**
 * Application- or component-scoped splitter defaults:
 *
 * ```ts
 * providers: [
 *   provideOgeSplitterConfig({
 *     separatorSize: 8,
 *     messages: { collapsePane: 'Paneli daralt', expandPane: 'Paneli aç' },
 *   }),
 * ]
 * ```
 */
export function provideOgeSplitterConfig(
  config: OgeSplitterConfigInput,
): Provider {
  return {
    provide: OGE_SPLITTER_CONFIG,
    useValue: resolveOgeSplitterConfig(config),
  };
}
