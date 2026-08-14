import type { TemplateRef } from '@angular/core';
import type { OgeStepDescriptorCore } from '@oge-ui/behavior';
import type { OgeStepTemplateContext } from './stepper-types';

/**
 * Normalized view of one step — declarative children and `steps` entries are
 * merged into this shape before rendering, so nothing downstream branches on
 * which source an entry came from. Module-internal (not barrel-exported).
 *
 * The framework-free half lives in `@oge-ui/behavior`; this adds the Angular
 * template slots on top of it.
 */
export interface OgeStepDescriptor extends OgeStepDescriptorCore {
  readonly headerTemplate?: TemplateRef<OgeStepTemplateContext>;
  readonly indicatorTemplate?: TemplateRef<OgeStepTemplateContext>;
  readonly contentTemplate?: TemplateRef<unknown>;
}
