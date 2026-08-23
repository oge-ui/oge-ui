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
  | 'fileUploader';

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
  /** Explicit ordering; items without one keep their declaration order. */
  readonly visibleIndex?: number;
  /** Adds a `required` rule and shows the required mark. */
  readonly isRequired?: boolean;
  readonly validationRules?: readonly OgeValidationRule[];
  readonly readOnly?: boolean;
  readonly disabled?: boolean;
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
