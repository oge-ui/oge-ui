import type { TemplateRef } from '@angular/core';
import type {
  OgeStepData,
  OgeStepGuard,
  OgeStepTemplateContext,
} from './stepper-types';

/**
 * Normalized view of one step — declarative children and `steps` entries are
 * merged into this shape before rendering, so nothing downstream branches on
 * which source an entry came from. Module-internal (not barrel-exported).
 */
export interface OgeStepDescriptor {
  /** Stable id: `key` when present, else a per-source auto id. */
  readonly id: string;
  readonly key?: string;
  readonly label: string;
  readonly description?: string;
  readonly icon?: string;
  readonly iconClass?: string;
  readonly disabled: boolean;
  readonly completed: boolean;
  readonly optional: boolean;
  readonly editable: boolean;
  readonly invalid: boolean;
  readonly errorMessage?: string;
  readonly cssClass?: string;
  readonly stepGuard?: OgeStepGuard;
  /** The source `steps` entry — `undefined` for declarative children. */
  readonly item?: OgeStepData;
  readonly headerTemplate?: TemplateRef<OgeStepTemplateContext>;
  readonly indicatorTemplate?: TemplateRef<OgeStepTemplateContext>;
  readonly contentTemplate?: TemplateRef<unknown>;
}
