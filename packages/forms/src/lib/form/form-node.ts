import { Directive, type Signal } from '@angular/core';

/**
 * Shared query token for `<oge-form-item>` and `<oge-form-group>`.
 *
 * The form needs both kinds back in the order the author wrote them, and two
 * separate `contentChildren` queries cannot express that: the config elements
 * are never projected, so they are detached from the DOM and their document
 * position says nothing. One query over a common token is ordered correctly.
 */
@Directive()
export abstract class OgeFormNode {
  /** Discriminator — narrowing on `instanceof` would import a cycle. */
  abstract readonly nodeKind: 'item' | 'group' | 'tabs' | 'accordion' | 'steps';

  /** Every node kind can be hidden; the form filters on this before laying out. */
  abstract readonly visible: Signal<boolean>;
}
