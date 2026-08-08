import { Directive, TemplateRef, inject } from '@angular/core';
import type {
  OgeAccordionContentTemplateContext,
  OgeAccordionHeaderActionsTemplateContext,
  OgeAccordionHeaderTemplateContext,
  OgeAccordionToggleIconTemplateContext,
} from './accordion-types';

/**
 * Structural directive replacing the built-in title/description/badge layout
 * inside the header button. Declared inside an `<oge-accordion-item>` it
 * styles that panel only; declared directly inside `oge-accordion` it applies
 * to every data-driven `items` panel:
 *
 * ```html
 * <oge-accordion [items]="sections">
 *   <ng-template ogeAccordionHeaderTemplate let-item let-expanded="expanded">
 *     <strong>{{ item.title }}</strong>
 *   </ng-template>
 * </oge-accordion>
 * ```
 *
 * The template renders *inside* the header `<button>`, so it must not contain
 * focusable controls — use `[ogeAccordionHeaderActionsTemplate]` for those.
 */
@Directive({ selector: '[ogeAccordionHeaderTemplate]' })
export class OgeAccordionHeaderTemplate {
  readonly templateRef = inject(TemplateRef<OgeAccordionHeaderTemplateContext>);

  static ngTemplateContextGuard(
    _dir: OgeAccordionHeaderTemplate,
    _ctx: unknown,
  ): _ctx is OgeAccordionHeaderTemplateContext {
    return true;
  }
}

/**
 * Structural directive marking panel content as lazily instantiated: the
 * template is created on first expand (`deferRendering`) and destroyed again
 * when the panel collapses with `keepAlive` off. Inside an
 * `<oge-accordion-item>` it replaces the eagerly created projected content;
 * directly inside `oge-accordion` it renders every data-driven `items` panel:
 *
 * ```html
 * <oge-accordion-item title="Report">
 *   <ng-template ogeAccordionContentTemplate let-data="data">
 *     <app-heavy-report [data]="data" />
 *   </ng-template>
 * </oge-accordion-item>
 * ```
 *
 * `data` carries whatever the panel's `contentLoader` resolved with.
 */
@Directive({ selector: '[ogeAccordionContentTemplate]' })
export class OgeAccordionContentTemplate {
  readonly templateRef = inject(
    TemplateRef<OgeAccordionContentTemplateContext>,
  );

  static ngTemplateContextGuard(
    _dir: OgeAccordionContentTemplate,
    _ctx: unknown,
  ): _ctx is OgeAccordionContentTemplateContext {
    return true;
  }
}

/**
 * Structural directive replacing the built-in chevron. `$implicit` is the
 * panel's expanded state:
 *
 * ```html
 * <ng-template ogeAccordionToggleIconTemplate let-expanded>
 *   {{ expanded ? '−' : '+' }}
 * </ng-template>
 * ```
 */
@Directive({ selector: '[ogeAccordionToggleIconTemplate]' })
export class OgeAccordionToggleIconTemplate {
  readonly templateRef = inject(
    TemplateRef<OgeAccordionToggleIconTemplateContext>,
  );

  static ngTemplateContextGuard(
    _dir: OgeAccordionToggleIconTemplate,
    _ctx: unknown,
  ): _ctx is OgeAccordionToggleIconTemplateContext {
    return true;
  }
}

/**
 * Structural directive for per-panel actions (delete, menu, …) rendered in the
 * header row **beside** the toggle button rather than inside it:
 *
 * ```html
 * <ng-template ogeAccordionHeaderActionsTemplate let-item let-index="index">
 *   <button type="button" (click)="remove(index)">Remove</button>
 * </ng-template>
 * ```
 *
 * The WAI-ARIA APG puts the panel title in a `<button>`; nesting a second
 * focusable control inside it would be a `nested-interactive` violation. These
 * actions are siblings of that button, so they are real, natively
 * Tab-reachable controls and the accordion's arrow navigation skips them.
 */
/**
 * Marks a row of buttons at the end of a panel body as its action bar — a
 * divider above, actions aligned to the inline end. The counterpart of
 * Angular Material's `mat-action-row`:
 *
 * ```html
 * <oge-accordion-item title="Profile">
 *   <p>…fields…</p>
 *   <div ogeAccordionActionRow>
 *     <button type="button">Cancel</button>
 *     <button type="button">Save</button>
 *   </div>
 * </oge-accordion-item>
 * ```
 *
 * Unlike the header actions these live inside the panel, so they are only
 * reachable while it is expanded.
 */
@Directive({
  selector: '[ogeAccordionActionRow]',
  host: { class: 'oge-accordion-action-row' },
})
export class OgeAccordionActionRow {}

@Directive({ selector: '[ogeAccordionHeaderActionsTemplate]' })
export class OgeAccordionHeaderActionsTemplate {
  readonly templateRef = inject(
    TemplateRef<OgeAccordionHeaderActionsTemplateContext>,
  );

  static ngTemplateContextGuard(
    _dir: OgeAccordionHeaderActionsTemplate,
    _ctx: unknown,
  ): _ctx is OgeAccordionHeaderActionsTemplateContext {
    return true;
  }
}
