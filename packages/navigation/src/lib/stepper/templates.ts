import { Directive, TemplateRef, inject } from '@angular/core';
import type { OgeStepTemplateContext } from './stepper-types';

/**
 * Replaces a step header's default label + description block.
 *
 * ```html
 * <ng-template ogeStepHeaderTemplate let-step let-state="state">…</ng-template>
 * ```
 */
@Directive({ selector: '[ogeStepHeaderTemplate]' })
export class OgeStepHeaderTemplate {
  readonly templateRef =
    inject<TemplateRef<OgeStepTemplateContext>>(TemplateRef);

  static ngTemplateContextGuard(
    _dir: OgeStepHeaderTemplate,
    _ctx: unknown,
  ): _ctx is OgeStepTemplateContext {
    return true;
  }
}

/** Replaces the round indicator (the number, tick or error glyph). */
@Directive({ selector: '[ogeStepIndicatorTemplate]' })
export class OgeStepIndicatorTemplate {
  readonly templateRef =
    inject<TemplateRef<OgeStepTemplateContext>>(TemplateRef);

  static ngTemplateContextGuard(
    _dir: OgeStepIndicatorTemplate,
    _ctx: unknown,
  ): _ctx is OgeStepTemplateContext {
    return true;
  }
}

/** Lazy body of a declarative `<oge-step>`, stamped by the stepper. */
@Directive({ selector: '[ogeStepContentTemplate]' })
export class OgeStepContentTemplate {
  readonly templateRef = inject<TemplateRef<unknown>>(TemplateRef);
}
