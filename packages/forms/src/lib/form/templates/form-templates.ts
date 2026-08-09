import { Directive, TemplateRef, inject } from '@angular/core';
import type { FormControl } from '@angular/forms';
import type { OgeFormFieldNode, OgeResolvedFormItem } from '../form-types';

/** What every field-level slot receives. */
export interface OgeFormItemTemplateContext {
  /** The resolved item — label, editor type, colSpan, required, state. */
  $implicit: OgeResolvedFormItem;
  /** Same object, named, for templates that also destructure other keys. */
  item: OgeResolvedFormItem;
  /** Signal Forms node for this field; bind it with `[formField]`. */
  field: OgeFormFieldNode | undefined;
  /** Reactive control for this field; bind it with `[formControl]`. */
  control: FormControl<unknown> | undefined;
  /** The error text the field would show, or `null` while it is valid. */
  error: string | null;
  /** Id the form's `<label for>` points at — put it on your control. */
  editorId: string;
}

/** What the label slot receives. */
export interface OgeFormLabelTemplateContext {
  /** The resolved label text. */
  $implicit: string;
  item: OgeResolvedFormItem;
  required: boolean;
  editorId: string;
}

/** What the group caption slot receives. */
export interface OgeFormGroupCaptionTemplateContext {
  /** The group caption. */
  $implicit: string;
}

/**
 * Replaces a field entirely — label, editor and error text.
 *
 * Legal at form level (applies to every item) or inside a single
 * `<oge-form-item>` (applies to that one). The per-item template wins.
 *
 * ```html
 * <oge-form-item field="color">
 *   <ng-template ogeFormItemTemplate let-item let-control="control">…</ng-template>
 * </oge-form-item>
 * ```
 */
@Directive({ selector: '[ogeFormItemTemplate]' })
export class OgeFormItemTemplate {
  readonly template =
    inject<TemplateRef<OgeFormItemTemplateContext>>(TemplateRef);

  static ngTemplateContextGuard(
    _directive: OgeFormItemTemplate,
    _context: unknown,
  ): _context is OgeFormItemTemplateContext {
    return true;
  }
}

/**
 * Replaces only the editor, keeping the form's label, required mark and error
 * chrome. The escape hatch for anything the curated `editorOptions` cannot say.
 */
@Directive({ selector: '[ogeFormEditorTemplate]' })
export class OgeFormEditorTemplate {
  readonly template =
    inject<TemplateRef<OgeFormItemTemplateContext>>(TemplateRef);

  static ngTemplateContextGuard(
    _directive: OgeFormEditorTemplate,
    _context: unknown,
  ): _context is OgeFormItemTemplateContext {
    return true;
  }
}

/**
 * Replaces the label content. The surrounding `<label for>` stays, so the
 * control association and the required mark's screen-reader text survive.
 */
@Directive({ selector: '[ogeFormLabelTemplate]' })
export class OgeFormLabelTemplate {
  readonly template =
    inject<TemplateRef<OgeFormLabelTemplateContext>>(TemplateRef);

  static ngTemplateContextGuard(
    _directive: OgeFormLabelTemplate,
    _context: unknown,
  ): _context is OgeFormLabelTemplateContext {
    return true;
  }
}

/**
 * Replaces the content of a group's `<legend>`. The `<fieldset>`/`<legend>`
 * pair itself stays, because that is what makes the section a labelled group.
 */
@Directive({ selector: '[ogeFormGroupCaptionTemplate]' })
export class OgeFormGroupCaptionTemplate {
  readonly template =
    inject<TemplateRef<OgeFormGroupCaptionTemplateContext>>(TemplateRef);

  static ngTemplateContextGuard(
    _directive: OgeFormGroupCaptionTemplate,
    _context: unknown,
  ): _context is OgeFormGroupCaptionTemplateContext {
    return true;
  }
}

/**
 * Marks the projected action bar of a form — submit, reset, whatever the app
 * needs. A marker directive rather than a bare attribute so the slot is typed
 * and discoverable.
 *
 * ```html
 * <oge-form>
 *   <div ogeFormActions>
 *     <oge-button text="Save" buttonType="submit" [useSubmitBehavior]="true" />
 *   </div>
 * </oge-form>
 * ```
 */
@Directive({
  selector: '[ogeFormActions]',
  host: { class: 'oge-form-actions-slot' },
})
export class OgeFormActions {}
