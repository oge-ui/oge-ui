import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  ViewEncapsulation,
  contentChild,
  input,
  model,
  viewChild,
} from '@angular/core';
import type {
  OgeAccordionContentLoader,
  OgeAccordionExpandGuard,
  OgeAccordionTogglePosition,
} from './accordion-types';
import {
  OgeAccordionContentTemplate,
  OgeAccordionHeaderActionsTemplate,
  OgeAccordionHeaderTemplate,
  OgeAccordionToggleIconTemplate,
} from './templates';

let nextItemId = 0;

/**
 * One declarative panel of `oge-accordion`. Projected content is the panel
 * body; the header comes from `title` / `description` or an inline
 * `[ogeAccordionHeaderTemplate]`:
 *
 * ```html
 * <oge-accordion>
 *   <oge-accordion-item title="Account" description="Name and e-mail">
 *     Account settings…
 *   </oge-accordion-item>
 *   <oge-accordion-item title="Billing" [invalid]="billing.invalid">
 *     <ng-template ogeAccordionContentTemplate>Lazy body…</ng-template>
 *   </oge-accordion-item>
 * </oge-accordion>
 * ```
 *
 * Renders nothing itself — the accordion stamps the captured content template
 * into its panel area, which is what makes `deferRendering` and `keepAlive`
 * work for projected content.
 */
@Component({
  selector: 'oge-accordion-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: ` <ng-template #contentTpl><ng-content /></ng-template> `,
})
export class OgeAccordionItem {
  /** Stable identity used when `key` is not set. */
  readonly autoId = `d${nextItemId++}`;

  /** Header title; alternative to an inline `[ogeAccordionHeaderTemplate]`. */
  readonly title = input('');
  /** Plain-text body, rendered when the panel has no projected content or template. */
  readonly text = input<string | undefined>(undefined);
  /** Secondary line rendered under the title. */
  readonly description = input<string | undefined>(undefined);
  /** Stable identity used by `expandedKeys` and DOM ids. */
  readonly key = input<string | undefined>(undefined);
  /** SVG path data (`d`) rendered as a 24×24 aria-hidden icon before the title. */
  readonly icon = input<string | undefined>(undefined);
  /** Badge rendered after the title. */
  readonly badge = input<string | number | undefined>(undefined);
  /** Tooltip — rendered as the native <code>title</code> attribute. */
  readonly hint = input<string | undefined>(undefined);
  /** Disabled panels cannot expand and are skipped by keyboard navigation. */
  readonly disabled = input(false);
  /** `false` removes the panel entirely. */
  readonly visible = input(true);
  /**
   * Expanded state of this panel — two-way. Set it to expand the panel on
   * first render, bind it to follow the state, or write to it to drive the
   * panel from the outside. Writes still run the accordion's pipeline
   * (`itemExpanding` → `expandGuard` → `itemExpanded`), so a veto reverts it.
   */
  readonly expanded = model(false);
  /** Flags the section as failing validation — see `OgeAccordion.expandInvalid()`. */
  readonly invalid = input(false);
  /** Overrides the accordion's `hideToggle` for this panel. */
  readonly hideToggle = input<boolean | undefined>(undefined);
  /** Overrides the accordion's `togglePosition` for this panel. */
  readonly togglePosition = input<OgeAccordionTogglePosition | undefined>(
    undefined,
  );
  /** Veto hook run before this panel expands or collapses; may be async (single-flight). */
  readonly expandGuard = input<OgeAccordionExpandGuard | undefined>(undefined);
  /** Loads this panel's content on first expand, with a skeleton while pending. */
  readonly contentLoader = input<OgeAccordionContentLoader | undefined>(
    undefined,
  );

  /** Inline header template — overrides `title`/`description` for this panel. */
  readonly headerTemplate = contentChild(OgeAccordionHeaderTemplate);
  /** Inline lazy content template — replaces the projected content. */
  readonly lazyContent = contentChild(OgeAccordionContentTemplate);
  /** Inline toggle-icon template — overrides the chevron for this panel. */
  readonly toggleIconTemplate = contentChild(OgeAccordionToggleIconTemplate);
  /** Inline header-actions template — buttons beside this panel's toggle. */
  readonly headerActionsTemplate = contentChild(
    OgeAccordionHeaderActionsTemplate,
  );

  /** Captured projected content, stamped by the enclosing accordion. */
  readonly contentTemplateRef = viewChild<TemplateRef<unknown>>('contentTpl');

  /**
   * Expands this panel. Like a user gesture it runs the accordion's pipeline,
   * so `itemExpanding` and `expandGuard` can still veto it.
   */
  open(): void {
    this.expanded.set(true);
  }

  /** Collapses this panel, subject to `collapsible` and the guards. */
  close(): void {
    this.expanded.set(false);
  }

  /** Expands the panel if collapsed, collapses it otherwise. */
  toggle(): void {
    this.expanded.set(!this.expanded());
  }
}
