import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  ViewEncapsulation,
  contentChild,
  input,
  viewChild,
} from '@angular/core';
import {
  OgeStepContentTemplate,
  OgeStepHeaderTemplate,
  OgeStepIndicatorTemplate,
} from './templates';
import type { OgeStepGuard } from './stepper-types';

let nextStepId = 0;

/**
 * One declarative step of `<oge-stepper>`. Projected content is the step's
 * body; the header comes from `label` / `description` or an inline
 * `[ogeStepHeaderTemplate]`:
 *
 * ```html
 * <oge-stepper [linear]="true">
 *   <oge-step label="Account" [completed]="accountValid()">…</oge-step>
 *   <oge-step label="Shipping" [optional]="true">…</oge-step>
 *   <oge-step label="Review">…</oge-step>
 * </oge-stepper>
 * ```
 *
 * Renders nothing itself — the stepper stamps the captured content template,
 * which is what makes `deferRendering` and `keepAlive` work for projected
 * content.
 */
@Component({
  selector: 'oge-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: ` <ng-template #contentTpl><ng-content /></ng-template> `,
})
export class OgeStep {
  /** Stable identity used when `key` is not set. */
  readonly autoId = `s${nextStepId++}`;

  /** Stable identity used by `activeKey` and DOM ids. */
  readonly key = input<string | undefined>(undefined);
  /** Header label. */
  readonly label = input('');
  /** Secondary line under the label. */
  readonly description = input<string | undefined>(undefined);
  /** SVG path data (`d`) for an indicator icon, replacing the number. */
  readonly icon = input<string | undefined>(undefined);
  /** Class(es) for an indicator icon element — the icon-font hook. */
  readonly iconClass = input<string | undefined>(undefined);
  /** Disabled steps cannot be activated and are skipped by the arrow keys. */
  readonly disabled = input(false);
  /** `false` removes the step entirely. */
  readonly visible = input(true);
  /** Marks the step finished; a linear stepper may then move past it. */
  readonly completed = input(false);
  /** A linear stepper may be advanced past an optional step regardless. */
  readonly optional = input(false);
  /** `false` blocks going *back* into this step once it has been left. */
  readonly editable = input(true);
  /** Renders the error indicator and blocks a linear advance. */
  readonly invalid = input(false);
  /** Shown under the label while `invalid`, in place of `description`. */
  readonly errorMessage = input<string | undefined>(undefined);
  /** Extra class on the step header. */
  readonly cssClass = input<string | undefined>(undefined);
  /** Veto hook run before leaving this step; may be async (single-flight). */
  readonly stepGuard = input<OgeStepGuard | undefined>(undefined);

  /** Inline header template — overrides `label`/`description` for this step. */
  readonly headerTemplate = contentChild(OgeStepHeaderTemplate);
  /** Inline indicator template — overrides the number/tick for this step. */
  readonly indicatorTemplate = contentChild(OgeStepIndicatorTemplate);
  /** Inline lazy content template — replaces the projected content. */
  readonly lazyContent = contentChild(OgeStepContentTemplate);

  /** Captured projected content, stamped by the stepper. */
  readonly contentTemplateRef = viewChild<TemplateRef<unknown>>('contentTpl');
}
