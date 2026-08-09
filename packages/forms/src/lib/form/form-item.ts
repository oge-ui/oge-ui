import { Directive, contentChild, input } from '@angular/core';
import { OgeFormNode } from './form-node';
import {
  OgeFormEditorTemplate,
  OgeFormItemTemplate,
  OgeFormLabelTemplate,
} from './templates/form-templates';
import type {
  OgeFormDataType,
  OgeFormEditorOptions,
  OgeFormEditorType,
  OgeValidationRule,
} from './form-types';

/**
 * Declarative form item. Renderless — it only carries configuration, exactly
 * like `oge-column` and `oge-tab`.
 *
 * ```html
 * <oge-form [(formData)]="employee">
 *   <oge-form-item field="firstName" label="First name" [isRequired]="true" />
 *   <oge-form-item field="notes" editorType="textArea" [colSpan]="2" />
 * </oge-form>
 * ```
 */
@Directive({
  // eslint-disable-next-line @angular-eslint/directive-selector
  selector: 'oge-form-item',
  providers: [{ provide: OgeFormNode, useExisting: OgeFormItem }],
})
export class OgeFormItem extends OgeFormNode {
  readonly nodeKind = 'item' as const;

  /** Model property this item edits. Dot-notation reaches nested objects. */
  readonly field = input.required<string>();
  /** Stable identity; defaults to `field`. */
  readonly key = input<string | undefined>(undefined);
  /** Label text; defaults to a title-cased `field`. */
  readonly label = input<string | undefined>(undefined);
  /** Set `false` to render the editor with no label at all. */
  readonly labelVisible = input(true);
  /** Help text under the editor. */
  readonly hint = input<string | undefined>(undefined);
  readonly placeholder = input<string | undefined>(undefined);
  /** Value shape; inferred from the model value when omitted. */
  readonly dataType = input<OgeFormDataType | undefined>(undefined);
  /** Explicit editor; overrides whatever `dataType` would pick. */
  readonly editorType = input<OgeFormEditorType | undefined>(undefined);
  /** Curated editor inputs — anything richer belongs in a template slot. */
  readonly editorOptions = input<OgeFormEditorOptions | undefined>(undefined);
  /** Layout columns the item spans; clamped to the current column count. */
  readonly colSpan = input(1);
  readonly visible = input(true);
  /** Explicit ordering; items without one keep their declaration order. */
  readonly visibleIndex = input<number | undefined>(undefined);
  /** Adds a `required` rule and shows the required mark. */
  readonly isRequired = input(false);
  /** Declarative rules; compiled to a Signal Forms schema in `formData` mode. */
  readonly validationRules = input<readonly OgeValidationRule[] | undefined>(
    undefined,
  );
  /** `undefined` falls back to the enclosing group, then the form. */
  readonly readOnly = input<boolean | undefined>(undefined);
  /** `undefined` falls back to the enclosing group, then the form. */
  readonly disabled = input<boolean | undefined>(undefined);
  /** Extra class on the item wrapper. */
  readonly cssClass = input<string | undefined>(undefined);

  /** Per-item slots; each one wins over the form-level template. */
  readonly itemTemplate = contentChild(OgeFormItemTemplate);
  readonly editorTemplate = contentChild(OgeFormEditorTemplate);
  readonly labelTemplate = contentChild(OgeFormLabelTemplate);
}
