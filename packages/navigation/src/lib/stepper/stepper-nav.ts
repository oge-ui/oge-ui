import { Directive, computed, inject, input } from '@angular/core';
import { OgeStepper } from './stepper';

/**
 * Shared plumbing of the two navigation directives: use the stepper the button
 * sits inside, or an explicit one passed to the directive.
 *
 * Angular resolves an element's injector from where it was **declared**, so a
 * button written inside an `<oge-step>` body finds the enclosing stepper even
 * though the stepper re-stamps that content elsewhere. A button outside the
 * component has no such ancestor — hence the explicit form, which the
 * reference libraries do not offer at all.
 */
@Directive()
abstract class OgeStepperNavBase {
  private readonly ambient = inject(OgeStepper, { optional: true });

  /** The stepper to drive; defaults to the enclosing one. */
  abstract readonly ogeStepperTarget: ReturnType<
    typeof input<OgeStepper | undefined>
  >;

  protected readonly stepper = computed(() => {
    // The target is a *separate* input, not an alias of the selector: aliasing
    // it would make the bare form (`<button ogeStepperNext>`) assign the empty
    // string to a typed input, which fails under strictTemplates.
    const stepper = this.ogeStepperTarget() ?? this.ambient;
    if (!stepper && typeof ngDevMode !== 'undefined' && ngDevMode) {
      console.warn(
        '[oge-navigation] a stepper navigation button is neither inside an <oge-stepper> nor bound to one.',
      );
    }
    return stepper;
  });

  protected readonly blocked = computed(() => {
    const stepper = this.stepper();
    return !stepper || stepper.disabled() || stepper.changePending();
  });
}

/**
 * Turns any button into the stepper's "next" control:
 *
 * ```html
 * <oge-step label="Account">
 *   … <button type="button" ogeStepperNext>Continue</button>
 * </oge-step>
 *
 * <!-- or, from outside the component -->
 * <button type="button" ogeStepperNext [ogeStepperTarget]="wizard">Continue</button>
 * ```
 *
 * It routes through the same pipeline the headers use, so `stepChanging`,
 * `linear` and the step's `stepGuard` all apply — and on the last step it
 * confirms the finish instead of advancing.
 */
@Directive({
  selector: '[ogeStepperNext]',
  host: {
    class: 'oge-stepper-next',
    '[attr.disabled]': 'blocked() ? "" : null',
    '(click)': 'onClick($event)',
  },
})
export class OgeStepperNext extends OgeStepperNavBase {
  readonly ogeStepperTarget = input<OgeStepper | undefined>(undefined);

  protected onClick(event: Event): void {
    this.stepper()?.next(event);
  }
}

/** Turns any button into the stepper's "back" control. */
@Directive({
  selector: '[ogeStepperPrevious]',
  host: {
    class: 'oge-stepper-previous',
    '[attr.disabled]': 'blocked() || atStart() ? "" : null',
    '(click)': 'onClick($event)',
  },
})
export class OgeStepperPrevious extends OgeStepperNavBase {
  readonly ogeStepperTarget = input<OgeStepper | undefined>(undefined);

  protected atStart(): boolean {
    return (this.stepper()?.activeIndex() ?? 0) === 0;
  }

  protected onClick(event: Event): void {
    this.stepper()?.previous(event);
  }
}
