import type { TemplateRef } from '@angular/core';
import type { OgeToolbarDescriptorCore } from '@oge-ui/behavior';
import type { OgeToolbarItem } from './toolbar-item';
import type { OgeToolbarItemTemplateContext } from './toolbar-types';

/**
 * Normalized view of one toolbar entry — declarative children and `items`
 * entries are merged into this shape before rendering. The framework-free
 * half is `@oge-ui/behavior`'s `OgeToolbarDescriptorCore`; this adds the two
 * Angular-only slots. Module-internal (not exported from the package barrel).
 */
export interface OgeToolbarDescriptor extends OgeToolbarDescriptorCore {
  /** The declarative child — `undefined` for `items` entries. */
  readonly source?: OgeToolbarItem;
  /** Inline template of a declarative child, stamped by the toolbar. */
  readonly contentTemplate?: TemplateRef<OgeToolbarItemTemplateContext>;
}
