/**
 * The framework-free half of the forms family's vocabulary (ADR 0001): the
 * value/editor/layout unions, the declarative validation rules, the editor
 * option bag and the resolved item shape both render layers walk.
 *
 * The per-item content slots are deliberately **not** here: Angular carries
 * `TemplateRef`s and React render props, which is the one part of an item that
 * cannot be shared. Each layer extends {@link OgeFormItemDataBase} with its
 * own slot fields and re-exports the result under the public name.
 */

/**
 * Value shape an item is bound to. Drives the default editor when no
 * `editorType` is given; inferred from the model value when omitted entirely.
 */
export type OgeFormDataType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'dateRange'
  | 'array'
  | 'object'
  | 'file';

/**
 * Which editor renders an item. House camelCase names — the reference
 * libraries' `dxTextBox`-style class names are deliberately not used.
 */
export type OgeFormEditorType =
  | 'textBox'
  | 'textArea'
  | 'numberBox'
  | 'slider'
  | 'selectBox'
  | 'tagBox'
  | 'autocomplete'
  | 'treeSelect'
  | 'dateBox'
  | 'dateRangeBox'
  | 'calendar'
  | 'checkBox'
  | 'switch'
  | 'radioGroup'
  | 'colorBox'
  | 'fileUploader'
  | 'rating'
  | 'otpInput'
  | 'signaturePad'
  | 'listBox'
  | 'transferList'
  | 'mention'
  | 'richText';

/** Where an item's label sits relative to its editor. */
export type OgeFormLabelLocation = 'top' | 'start' | 'end';

/** Container-query breakpoints the responsive column count is keyed to. */
export type OgeFormScreenSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/** How many layout columns the form uses; `'auto'` fits by `minColWidth`. */
export type OgeFormColCount = number | 'auto';

/** What a `custom` rule sees: the field's value and the whole model. */
export interface OgeValidationContext {
  readonly value: unknown;
  readonly data: Record<string, unknown>;
}

/** How a `compare` rule relates the field's value to its comparison target. */
export type OgeComparisonType =
  '===' | '!==' | '==' | '!=' | '<' | '<=' | '>' | '>=';

/**
 * A declarative dependency on the form data, used by `visibleWhen`,
 * `disabledWhen` and `requiredWhen`: a predicate over the whole model, or a
 * field test — `equals`, `notEquals` or `in` against the field's value, or,
 * with none of them, the field's truthiness (an empty string / array is
 * falsy).
 */
export type OgeFormCondition =
  | ((data: Record<string, unknown>) => boolean)
  | {
      /** Model property to test; dot-notation reaches nested objects. */
      readonly field: string;
      readonly equals?: unknown;
      readonly notEquals?: unknown;
      readonly in?: readonly unknown[];
    };

/** A declarative validation rule, evaluated identically by both layers. */
export type OgeValidationRule =
  | { readonly type: 'required'; readonly message?: string }
  | { readonly type: 'email'; readonly message?: string }
  | {
      readonly type: 'numeric';
      readonly min?: number;
      readonly max?: number;
      readonly message?: string;
    }
  | {
      readonly type: 'stringLength';
      readonly min?: number;
      readonly max?: number;
      readonly message?: string;
    }
  | {
      readonly type: 'pattern';
      readonly pattern: RegExp;
      readonly message?: string;
    }
  | {
      readonly type: 'range';
      readonly min?: Date;
      readonly max?: Date;
      readonly message?: string;
    }
  | {
      /**
       * Compares the value with another field (`'password'`) or a function of
       * the model: confirm-password, "end after start", and the like.
       */
      readonly type: 'compare';
      readonly comparisonTarget:
        string | ((data: Record<string, unknown>) => unknown);
      /** Default `'==='`. */
      readonly comparisonType?: OgeComparisonType;
      /** Skip the check while the field is empty (default `false`, as in DevExtreme). */
      readonly ignoreEmptyValue?: boolean;
      readonly message?: string;
    }
  | {
      readonly type: 'custom';
      readonly validate: (context: OgeValidationContext) => string | null;
    }
  | {
      readonly type: 'async';
      readonly validate: (value: unknown) => Promise<string | null>;
      readonly message?: string;
    };

/**
 * Editor inputs an item may set. A curated, typed subset — anything beyond it
 * belongs in an editor slot, not in a reflective options bag.
 */
export interface OgeFormEditorOptions {
  /** Options for `selectBox` / `tagBox` / `autocomplete` / `radioGroup` / `treeSelect`. */
  readonly items?: readonly unknown[];
  readonly displayExpr?: string;
  readonly valueExpr?: string;
  readonly searchEnabled?: boolean;
  readonly showClearButton?: boolean;
  readonly acceptCustomValue?: boolean;
  /** `numberBox` / `dateBox` bounds. */
  readonly min?: number | Date;
  readonly max?: number | Date;
  readonly step?: number;
  readonly showSpinButtons?: boolean;
  readonly format?: Intl.NumberFormatOptions;
  /** `dateBox` display format — `Intl` options or a formatter function. */
  readonly displayFormat?:
    Intl.DateTimeFormatOptions | ((date: Date) => string);
  /** `textBox` mode (`'password'`, `'email'`, …) and `numberBox` inputmode. */
  readonly mode?: string;
  readonly maxLength?: number;
  readonly minLength?: number;
  readonly showCounter?: boolean;
  /** `textArea` rows. */
  readonly rows?: number;
  readonly autoResize?: boolean;
  /** `checkBox` / `switch` inline text. */
  readonly text?: string;
  /** `radioGroup` orientation. */
  readonly layout?: 'vertical' | 'horizontal';
  /** `fileUploader` restrictions and destination. */
  readonly accept?: string;
  readonly multiple?: boolean;
  readonly maxFileSize?: number;
  readonly uploadUrl?: string;
  /** `dateBox` kind. */
  readonly type?: 'date' | 'time' | 'datetime';
  readonly locale?: string;
  /** `treeSelect` data shape. */
  readonly keyExpr?: string;
  readonly parentIdExpr?: string;
  readonly itemsExpr?: string;
  readonly hasItemsExpr?: string;
  readonly dataStructure?: 'plain' | 'tree';
  /**
   * `treeSelect` check boxes; `listBox` / `transferList` draw their check
   * glyphs for any value but `'none'`.
   */
  readonly showCheckBoxes?: 'none' | 'normal' | 'selectAll';
  /** `calendar` / `dateBox` week rendering. */
  readonly firstDayOfWeek?: number;
  readonly showTodayButton?: boolean;
  readonly showWeekNumbers?: boolean;
  /** `colorBox` output shape and popup surfaces. */
  readonly colorFormat?: 'hex' | 'rgb' | 'rgba' | 'hsl';
  readonly editAlphaChannel?: boolean;
  readonly view?: 'gradient' | 'palette' | 'both';
  readonly palette?: readonly string[];
  /** `rating` value step (`1` whole items, `0.5` halves); `max` sets the item count. */
  readonly precision?: number;
  /** `otpInput` cell count. */
  readonly length?: number;
  /** `otpInput` hides the characters (PINs). */
  readonly masked?: boolean;
  /** `signaturePad` export format of the value. */
  readonly signatureFormat?: 'png' | 'svg';
  /** `listBox` selection: `'single'` (default) or `'multiple'` (the value is an array). */
  readonly selectionMode?: 'single' | 'multiple';
  /**
   * `listBox` / `transferList` maximum list height, `signaturePad` surface
   * height (px) and `richText` editor height — px number or CSS length.
   */
  readonly height?: number | string;
  /** `transferList` pane titles; `undefined` = the messages catalog. */
  readonly sourceTitle?: string;
  readonly targetTitle?: string;
  /** `mention` trigger character (default `'@'`). */
  readonly trigger?: string;
}

/** One data-driven form item, minus the render layer's own content slots. */
export interface OgeFormItemDataBase {
  /** Model property this item edits. Dot-notation reaches nested objects. */
  readonly field: string;
  /** Stable identity; defaults to `field`. */
  readonly key?: string;
  /** Label text; defaults to a title-cased `field`. */
  readonly label?: string;
  /** Set `false` to render the editor with no label at all. */
  readonly labelVisible?: boolean;
  /** Help text under the editor. */
  readonly hint?: string;
  readonly placeholder?: string;
  readonly dataType?: OgeFormDataType;
  readonly editorType?: OgeFormEditorType;
  readonly editorOptions?: OgeFormEditorOptions;
  /** Layout columns the item spans; clamped to the current column count. */
  readonly colSpan?: number;
  readonly visible?: boolean;
  /**
   * Shows the item only while the condition holds (re-evaluated on every
   * model change). A hidden item is not validated and drops out of the
   * validation summary.
   */
  readonly visibleWhen?: OgeFormCondition;
  /** Explicit ordering; items without one keep their declaration order. */
  readonly visibleIndex?: number;
  /** Adds a `required` rule and shows the required mark. */
  readonly isRequired?: boolean;
  /** Makes the item required only while the condition holds. */
  readonly requiredWhen?: OgeFormCondition;
  readonly validationRules?: readonly OgeValidationRule[];
  readonly readOnly?: boolean;
  readonly disabled?: boolean;
  /** Disables the editor while the condition holds; a disabled item is not validated. */
  readonly disabledWhen?: OgeFormCondition;
  /** Extra class on the item wrapper. */
  readonly cssClass?: string;
  /** Group caption this item belongs to, for data-driven grouping. */
  readonly group?: string;
}

/** One data-driven group. Groups render as `<fieldset>` with a `<legend>`. */
export interface OgeFormGroupData {
  readonly caption: string;
  readonly key?: string;
  readonly colCount?: OgeFormColCount;
  readonly colSpan?: number;
  readonly visible?: boolean;
  /** Explicit ordering among this group's siblings. */
  readonly visibleIndex?: number;
  readonly cssClass?: string;
}

/** A resolved item as a form actually renders it — what `itemOption()` returns. */
export interface OgeResolvedFormItem {
  readonly id: string;
  readonly field: string;
  readonly label: string;
  readonly labelVisible: boolean;
  readonly hint: string | undefined;
  readonly placeholder: string;
  readonly dataType: OgeFormDataType;
  readonly editorType: OgeFormEditorType;
  readonly editorOptions: OgeFormEditorOptions;
  readonly colSpan: number;
  readonly required: boolean;
  readonly readOnly: boolean;
  readonly disabled: boolean;
  readonly cssClass: string | undefined;
  readonly group: string | undefined;
  readonly validationRules: readonly OgeValidationRule[];
}

/** One row of the validation summary. */
export interface OgeFormErrorEntry {
  readonly field: string;
  readonly label: string;
  readonly message: string;
}

/** Emitted whenever one field's value changed. */
export interface OgeFormFieldChangedEvent {
  readonly field: string;
  readonly value: unknown;
  readonly previousValue: unknown;
}

/** Emitted after a validation pass. */
export interface OgeFormValidatedEvent {
  readonly valid: boolean;
  /** One entry per invalid field, in layout order. */
  readonly errors: readonly OgeFormErrorEntry[];
}
