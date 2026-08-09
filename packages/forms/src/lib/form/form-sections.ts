import { Directive, contentChildren, input, model } from '@angular/core';
import { OgeFormNode } from './form-node';

/**
 * Renders its `<oge-form-group>` children as tabs, one tab per group, the
 * caption becoming the tab text. Wraps `@oge-ui/tabs` — the tab strip, its
 * keyboard handling and its overflow behaviour are not re-implemented here.
 *
 * ```html
 * <oge-form [(formData)]="employee">
 *   <oge-form-tabs>
 *     <oge-form-group caption="Personal"> … </oge-form-group>
 *     <oge-form-group caption="Employment"> … </oge-form-group>
 *   </oge-form-tabs>
 * </oge-form>
 * ```
 */
@Directive({
  // eslint-disable-next-line @angular-eslint/directive-selector
  selector: 'oge-form-tabs',
  providers: [{ provide: OgeFormNode, useExisting: OgeFormTabs }],
})
export class OgeFormTabs extends OgeFormNode {
  readonly nodeKind = 'tabs' as const;

  /** Stable identity for the section. */
  readonly key = input<string | undefined>(undefined);
  readonly visible = input(true);
  /** Explicit ordering among this section's siblings. */
  readonly visibleIndex = input<number | undefined>(undefined);
  /** Columns the section spans in its parent layout. */
  readonly colSpan = input(1);
  readonly cssClass = input<string | undefined>(undefined);
  /** Which tab is open — two-way. */
  readonly selectedIndex = model(0);
  /**
   * Defaults to `false`, unlike the tab panel itself: a form usually wants
   * every field in the DOM (native submit, autofill, browser search), and
   * validation runs on the model either way. Opt in for very large forms.
   */
  readonly deferRendering = input(false);
  readonly keepAlive = input(true);
  /** Shows the number of invalid fields as a badge on each tab. */
  readonly showErrorBadges = input(true);

  /** The groups that become tabs — direct children only. */
  readonly nodes = contentChildren(OgeFormNode, { descendants: false });
}

/**
 * Renders its `<oge-form-group>` children as the steps of a wizard, one step
 * per group. Wraps `@oge-ui/navigation` — the stepper's ARIA model, its linear
 * gate and its keyboard handling are not re-implemented here.
 *
 * ```html
 * <oge-form [(formData)]="order">
 *   <oge-form-steps [linear]="true">
 *     <oge-form-group caption="Account"> … </oge-form-group>
 *     <oge-form-group caption="Payment"> … </oge-form-group>
 *   </oge-form-steps>
 * </oge-form>
 * ```
 *
 * With `linear`, a step is complete when it has no invalid fields — the form
 * already rolls its error counts up per panel, so this works identically in
 * all three binding modes (`fieldTree`, `formGroup`, `formData`).
 */
@Directive({
  // eslint-disable-next-line @angular-eslint/directive-selector
  selector: 'oge-form-steps',
  providers: [{ provide: OgeFormNode, useExisting: OgeFormSteps }],
})
export class OgeFormSteps extends OgeFormNode {
  readonly nodeKind = 'steps' as const;

  readonly key = input<string | undefined>(undefined);
  readonly visible = input(true);
  readonly visibleIndex = input<number | undefined>(undefined);
  readonly colSpan = input(1);
  readonly cssClass = input<string | undefined>(undefined);
  /** Which step is active — two-way. */
  readonly activeIndex = model(0);
  /** Blocks moving past a step that still has invalid fields. */
  readonly linear = input(false);
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');
  /** Renders the stepper's built-in Back / Next bar. */
  readonly showNavigation = input(true);
  /** See `OgeFormTabs.deferRendering` — same reasoning, same default. */
  readonly deferRendering = input(false);
  readonly keepAlive = input(true);
  /** Flags a step that holds an invalid field. */
  readonly showInvalidSections = input(true);
  /**
   * Touches only the leaving step's fields on each advance, so the steps
   * ahead stay quiet until the user actually reaches them.
   */
  readonly touchOnLeave = input(true);

  /** The groups that become steps — direct children only. */
  readonly nodes = contentChildren(OgeFormNode, { descendants: false });
}

/**
 * Renders its `<oge-form-group>` children as accordion panels, one panel per
 * group. Wraps `@oge-ui/layout` — including its invalid-section indicator,
 * which the form drives from the panel's own field errors.
 */
@Directive({
  // eslint-disable-next-line @angular-eslint/directive-selector
  selector: 'oge-form-accordion',
  providers: [{ provide: OgeFormNode, useExisting: OgeFormAccordion }],
})
export class OgeFormAccordion extends OgeFormNode {
  readonly nodeKind = 'accordion' as const;

  readonly key = input<string | undefined>(undefined);
  readonly visible = input(true);
  readonly visibleIndex = input<number | undefined>(undefined);
  readonly colSpan = input(1);
  readonly cssClass = input<string | undefined>(undefined);
  /** Keys of the expanded panels — two-way. */
  readonly expandedKeys = model<readonly string[]>([]);
  /** Whether more than one panel may be open at a time. */
  readonly multiple = input(true);
  readonly collapsible = input(true);
  /** See `OgeFormTabs.deferRendering` — same reasoning, same default. */
  readonly deferRendering = input(false);
  readonly keepAlive = input(true);
  /** Flags a panel that holds an invalid field. */
  readonly showInvalidSections = input(true);

  /** The groups that become panels — direct children only. */
  readonly nodes = contentChildren(OgeFormNode, { descendants: false });
}
