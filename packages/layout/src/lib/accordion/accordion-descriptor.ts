import type { TemplateRef } from '@angular/core';
import type { OgeAccordionDescriptorCore } from '@oge-ui/behavior';
import type { OgeAccordionItem } from './accordion-item';
import type {
  OgeAccordionContentTemplateContext,
  OgeAccordionHeaderActionsTemplateContext,
  OgeAccordionHeaderTemplateContext,
  OgeAccordionToggleIconTemplateContext,
} from './accordion-types';

/**
 * Normalized view of one panel — declarative children and `items` entries are
 * merged into this shape before rendering. The render-layer-agnostic half is
 * `OgeAccordionDescriptorCore` in `@oge-ui/behavior`; this adds the Angular
 * template slots. Module-internal (not exported from the package barrel).
 */
export interface OgeAccordionDescriptor extends OgeAccordionDescriptorCore {
  /** The declarative child — `undefined` for `items` panels. Two-way target. */
  readonly source?: OgeAccordionItem;
  readonly headerTemplate?: TemplateRef<OgeAccordionHeaderTemplateContext>;
  readonly contentTemplate?: TemplateRef<
    OgeAccordionContentTemplateContext | unknown
  >;
  readonly toggleIconTemplate?: TemplateRef<OgeAccordionToggleIconTemplateContext>;
  readonly headerActionsTemplate?: TemplateRef<OgeAccordionHeaderActionsTemplateContext>;
}
