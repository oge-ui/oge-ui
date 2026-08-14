import { InjectionToken, type Provider } from '@angular/core';
import {
  OGE_DEFAULT_TREE_VIEW_CONFIG,
  resolveOgeTreeViewConfig,
  type OgeTreeViewConfig,
  type OgeTreeViewConfigInput,
} from '@oge-ui/behavior';

// The message catalog, the defaults and the merge rule live framework-free in
// `@oge-ui/behavior` (`tree-view-core`); this file is only the Angular DI
// wrapper around them.
export {
  OGE_DEFAULT_TREE_VIEW_MESSAGES,
  OGE_DEFAULT_TREE_VIEW_CONFIG,
  type OgeTreeViewMessages,
  type OgeTreeViewConfig,
  type OgeTreeViewConfigInput,
} from '@oge-ui/behavior';

export const OGE_TREE_VIEW_CONFIG = new InjectionToken<OgeTreeViewConfig>(
  'OGE_TREE_VIEW_CONFIG',
  {
    factory: () => OGE_DEFAULT_TREE_VIEW_CONFIG,
  },
);

/**
 * Application- or component-scoped tree view defaults:
 *
 * ```ts
 * providers: [
 *   provideOgeTreeViewConfig({
 *     messages: { searchPlaceholder: 'Ara…', selectAll: 'Tümünü seç' },
 *   }),
 * ]
 * ```
 */
export function provideOgeTreeViewConfig(
  config: OgeTreeViewConfigInput,
): Provider {
  return {
    provide: OGE_TREE_VIEW_CONFIG,
    useValue: resolveOgeTreeViewConfig(config),
  };
}
