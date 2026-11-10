import { Directive, ElementRef, effect, inject, input } from '@angular/core';
import { ogeApplyAttributes, ogeSafeAttributes } from '@oge-ui/behavior';

/**
 * Applies a free-form attribute bag to the host element — the counterpart of
 * the reference `elementAttr` / `htmlAttributes` options. Attributes are
 * written imperatively because the set is not known at compile time; the
 * previous keys are removed first, so clearing the bag clears the DOM.
 *
 * The bag goes through `ogeSafeAttributes` first: event handlers (`on*`),
 * `srcdoc`, `style`, `class` and script URLs are never written.
 *
 * Module-internal (not exported from the package barrel): consumers reach it
 * through the `htmlAttributes` field of a toolbar item or splitter pane, and
 * the matching input on `<oge-toolbar-item>` / `<oge-splitter-pane>`.
 */
@Directive({ selector: '[ogeAttrs]' })
export class OgeElementAttrs {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly ogeAttrs = input<Readonly<Record<string, string>> | undefined>(
    undefined,
  );

  private applied: readonly string[] = [];

  constructor() {
    effect(() => {
      this.applied = ogeApplyAttributes(
        this.host.nativeElement,
        ogeSafeAttributes(this.ogeAttrs()),
        this.applied,
      );
    });
  }
}
