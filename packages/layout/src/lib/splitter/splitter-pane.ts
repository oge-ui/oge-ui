import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  ViewEncapsulation,
  input,
  model,
  viewChild,
} from '@angular/core';
import type { OgeSplitterSize } from './splitter-types';

let nextPaneId = 0;

/**
 * One declarative pane of `oge-splitter`. Projected content is the pane body:
 *
 * ```html
 * <oge-splitter>
 *   <oge-splitter-pane size="240px" minSize="160px" [collapsible]="true">
 *     Navigation…
 *   </oge-splitter-pane>
 *   <oge-splitter-pane [minSize]="20">Editor…</oge-splitter-pane>
 * </oge-splitter>
 * ```
 *
 * Renders nothing itself — the splitter stamps the captured content template
 * into its own grid, which is what keeps the pane element and the separator
 * that controls it siblings in the DOM.
 */
@Component({
  selector: 'oge-splitter-pane',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: ` <ng-template #contentTpl><ng-content /></ng-template> `,
})
export class OgeSplitterPane {
  /** Stable identity used when `key` is not set. */
  readonly autoId = `d${nextPaneId++}`;

  /** Stable identity used by DOM ids and the collapse API. */
  readonly key = input<string | undefined>(undefined);
  /** Initial size — a share number, `'40%'` or `'240px'`. */
  readonly size = input<OgeSplitterSize | undefined>(undefined);
  /** Smallest size a resize may leave this pane at. */
  readonly minSize = input<OgeSplitterSize | undefined>(undefined);
  /** Largest size a resize may grow this pane to. */
  readonly maxSize = input<OgeSplitterSize | undefined>(undefined);
  /** Allows the pane to be collapsed from its separator. */
  readonly collapsible = input(false);
  /** Size the pane keeps while collapsed. Defaults to `0`. */
  readonly collapsedSize = input<OgeSplitterSize | undefined>(undefined);
  /**
   * Collapsed state of this pane — two-way. Writes run the splitter's pipeline
   * (`paneCollapsing` → commit → `paneCollapsed`), so a veto reverts it.
   */
  readonly collapsed = model(false);
  /** `false` pins the pane — its separators cannot be dragged. */
  readonly resizable = input(true);
  /** `false` clips overflowing content instead of scrolling it. */
  readonly scrollable = input(true);
  /** Disabled panes cannot be collapsed and their separators are inert. */
  readonly disabled = input(false);
  /** `false` removes the pane entirely. */
  readonly visible = input(true);
  /** Plain-text body, rendered when the pane has no projected content. */
  readonly text = input<string | undefined>(undefined);
  /** Extra class on the pane element. */
  readonly cssClass = input<string | undefined>(undefined);
  /** Extra attributes on the pane element (`data-*`, `title`, …). */
  readonly htmlAttributes = input<Readonly<Record<string, string>> | undefined>(
    undefined,
  );

  /** Captured projected content, stamped by the enclosing splitter. */
  readonly contentTemplateRef = viewChild<TemplateRef<unknown>>('contentTpl');

  /** Collapses this pane, subject to the splitter's pipeline. */
  collapse(): void {
    this.collapsed.set(true);
  }

  /** Expands this pane, subject to the splitter's pipeline. */
  expand(): void {
    this.collapsed.set(false);
  }

  /** Collapses the pane if expanded, expands it otherwise. */
  toggle(): void {
    this.collapsed.set(!this.collapsed());
  }
}
