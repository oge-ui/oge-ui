import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  ViewEncapsulation,
  contentChild,
  input,
  viewChild,
} from '@angular/core';
import type { OgeTabCloseGuard } from './tabs-types';
import { OgeTabContentTemplate, OgeTabHeaderTemplate } from './templates';

let nextTabId = 0;

/**
 * One declarative tab of `oge-tabs` / `oge-tab-panel`. Projected content is
 * the panel body; the header comes from `text` or an inline
 * `[ogeTabHeaderTemplate]`:
 *
 * ```html
 * <oge-tab-panel>
 *   <oge-tab text="General">General settings…</oge-tab>
 *   <oge-tab text="Advanced" [closable]="true">
 *     <ng-template ogeTabContentTemplate>Lazy body…</ng-template>
 *   </oge-tab>
 * </oge-tab-panel>
 * ```
 *
 * Renders nothing itself — the enclosing component stamps the captured
 * content template into its panel area, which is what makes `deferRendering`,
 * `keepAlive` and drag reorder work for projected content.
 */
@Component({
  selector: 'oge-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: ` <ng-template #contentTpl><ng-content /></ng-template> `,
})
export class OgeTab {
  /** Stable identity for reorder tracking when `key` is not set. */
  readonly autoId = `t${nextTabId++}`;

  /** Tab label text; alternative to an inline `[ogeTabHeaderTemplate]`. */
  readonly text = input('');
  /** Stable identity used by `selectedKey`, reorder tracking and DOM ids. */
  readonly key = input<string | undefined>(undefined);
  /** Disabled tabs are skipped by keyboard navigation and selection. */
  readonly disabled = input(false);
  /** `false` removes the tab (and its panel) entirely. */
  readonly visible = input(true);
  /** Shows a close button; `undefined` falls back to the component-level `closable`. */
  readonly closable = input<boolean | undefined>(undefined);
  /** Badge rendered after the label. */
  readonly badge = input<string | number | undefined>(undefined);
  /** Renders the unsaved-changes dot and announces it to screen readers. */
  readonly dirty = input(false);
  /** Tooltip — rendered as the native <code>title</code> attribute. */
  readonly hint = input<string | undefined>(undefined);
  /** Veto hook run before this tab closes; may be async (single-flight). */
  readonly closeGuard = input<OgeTabCloseGuard | undefined>(undefined);

  /** Inline header template — overrides `text` for this tab only. */
  readonly headerTemplate = contentChild(OgeTabHeaderTemplate);
  /** Inline lazy content template — replaces the projected content. */
  readonly lazyContent = contentChild(OgeTabContentTemplate);

  /** Captured projected content, stamped by the enclosing component. */
  readonly contentTemplateRef = viewChild<TemplateRef<unknown>>('contentTpl');
}
