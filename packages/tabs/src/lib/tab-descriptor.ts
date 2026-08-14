import type { TemplateRef } from '@angular/core';
import type { OgeTabDescriptorCore } from '@oge-ui/behavior';
import type {
  OgeTabContentTemplateContext,
  OgeTabHeaderTemplateContext,
} from './tabs-types';

// The descriptor shape and its display-order arithmetic live framework-free
// in `@oge-ui/behavior` (`tabs-core`); this file adds the Angular content
// slots on top and re-exports the helpers unchanged.
export { applyTabOrder, tabItemDescriptor } from '@oge-ui/behavior';

/**
 * Normalized view of one tab — declarative children and `items` entries are
 * merged into this shape before rendering. Module-internal (not exported from
 * the package barrel).
 */
export interface OgeTabDescriptor extends OgeTabDescriptorCore {
  readonly headerTemplate?: TemplateRef<OgeTabHeaderTemplateContext>;
  readonly contentTemplate?: TemplateRef<
    OgeTabContentTemplateContext | unknown
  >;
}
