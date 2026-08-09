import { Directive, contentChild, contentChildren, input } from '@angular/core';
import { OgeFormNode } from './form-node';
import { OgeFormGroupCaptionTemplate } from './templates/form-templates';
import type { OgeFormColCount } from './form-types';

/**
 * Declarative form section. Renders a real `<fieldset>` with the caption as
 * its `<legend>`, and may nest.
 *
 * ```html
 * <oge-form [(formData)]="employee">
 *   <oge-form-group caption="Contact" [colCount]="2">
 *     <oge-form-item field="email" />
 *     <oge-form-item field="phone" />
 *   </oge-form-group>
 * </oge-form>
 * ```
 */
@Directive({
  // eslint-disable-next-line @angular-eslint/directive-selector
  selector: 'oge-form-group',
  providers: [{ provide: OgeFormNode, useExisting: OgeFormGroup }],
})
export class OgeFormGroup extends OgeFormNode {
  readonly nodeKind = 'group' as const;

  /** Legend text. An empty caption renders a borderless, unlabelled section. */
  readonly caption = input('');
  /** Stable identity; defaults to the caption. */
  readonly key = input<string | undefined>(undefined);
  /** Columns inside this group; `undefined` inherits the form's count. */
  readonly colCount = input<OgeFormColCount | undefined>(undefined);
  /** Columns the group itself spans in its parent layout. */
  readonly colSpan = input(1);
  readonly visible = input(true);
  /** Explicit ordering among this group's siblings. */
  readonly visibleIndex = input<number | undefined>(undefined);
  /** Disables every item in the section. */
  readonly disabled = input<boolean | undefined>(undefined);
  /** Makes every item in the section read-only. */
  readonly readOnly = input<boolean | undefined>(undefined);
  /** Extra class on the fieldset. */
  readonly cssClass = input<string | undefined>(undefined);

  /**
   * Items and nested groups inside this group, in declaration order — direct
   * children only, so nesting resolves one level per hop. One query over the
   * shared token is what keeps the two kinds interleaved correctly.
   */
  readonly nodes = contentChildren(OgeFormNode, { descendants: false });

  /**
   * Caption slot for this group only — queried without descendants so a
   * nested group's template stays with the nested group.
   */
  readonly captionTemplate = contentChild(OgeFormGroupCaptionTemplate, {
    descendants: false,
  });
}
